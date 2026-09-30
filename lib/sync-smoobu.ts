// Real Smoobu integration -- pulls bookings and guest messages for
// every property that's been manually mapped to a Smoobu apartment
// ID (properties.smoobu_apartment_id). Used by both
// netlify/functions/sync-smoobu.mts (the real automatic run, every
// 30 minutes -- messages matter more time-sensitively than iCal
// dates) and app/api/sync-smoobu/route.ts (manual trigger/testing).
//
// Legacy Api-Key auth (Smoobu's simpler scheme) is used here rather
// than HMAC -- legacy auth is deprecated but not sunset until
// 2026-09-25, and HMAC's per-request signing is meaningfully more
// complex to get right. Worth migrating before that date.
import { createClient } from '@supabase/supabase-js'
import { smoobuFetch, sendSmoobuGuestMessage } from './smoobu-client'
import { maybeAutoReplyToGuest } from './ai-guest-receptionist'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

function bookingUpsertPayload(b: any, propertyId: string) {
  return {
    property_id: propertyId,
    check_in: b.arrival,
    check_out: b.departure,
    guest_name: b['guest-name'],
    guest_email: b.email || null,
    guest_phone: b.phone || null,
    // Booking price as Smoobu reports it (what the guest pays for the stay)
    total_amount: b.price != null && b.price !== '' ? Number(b.price) : null,
    platform: b.channel?.name || 'Smoobu',
    source: 'smoobu',
    external_id: `smoobu-${b.id}`,
    status: b.type === 'cancellation' ? 'cancelled' : 'confirmed',
  }
}

export async function runSmoobuSync() {
  const supabase = getServiceClient()
  const results: any[] = []

  // Every account with a Smoobu key configured.
  const { data: accounts } = await supabase
    .from('integrations')
    .select('user_id, smoobu_api_key, smoobu_api_secret')
    .not('smoobu_api_key', 'is', null)

  if (!accounts?.length) return { synced: [] }

  for (const account of accounts) {
    const apiKey = { apiKey: account.smoobu_api_key as string, secret: (account as any).smoobu_api_secret as string | null }
    const userId = account.user_id as string

    try {
      const { data: mappedProps } = await supabase
        .from('properties')
        .select('id, smoobu_apartment_id')
        .eq('user_id', userId)
        .not('smoobu_apartment_id', 'is', null)

      if (!mappedProps?.length) continue
      const apartmentToProperty = new Map(mappedProps.map((p: any) => [String(p.smoobu_apartment_id), p.id]))
      const mappedApartmentIds = mappedProps.map((p: any) => String(p.smoobu_apartment_id))

      const arrivalFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const bookingsRes = await smoobuFetch(apiKey, `/reservations?arrivalFrom=${arrivalFrom}&pageSize=100&showCancellation=true`)
      const bookings = bookingsRes.bookings ?? []
      let bookingsSynced = 0
      // Diagnostic: every distinct apartment ID Smoobu actually
      // returned, vs the ones we're mapped to -- if these two lists
      // don't overlap, the ID entered in the property's Smoobu field
      // doesn't match what Smoobu itself is sending, which is a much
      // more useful thing to see than a silent '0 bookings'.
      const seenApartmentIds = new Set<string>()
      const threadErrorsEarly: string[] = []

      for (const b of bookings) {
        const apartmentId = String(b.apartment?.id)
        seenApartmentIds.add(apartmentId)
        const propertyId = apartmentToProperty.get(apartmentId)
        if (!propertyId) continue

        const { error: bErr } = await supabase.from('bookings').upsert(bookingUpsertPayload(b, propertyId), { onConflict: 'external_id' })
        if (bErr) { if (threadErrorsEarly.length < 5) threadErrorsEarly.push(`booking ${b.id}: ${bErr.message}`); continue }
        bookingsSynced++
      }

      // Message threads -- only fetch full message history for
      // threads Smoobu shows as having messages, rather than pulling
      // full history for every booking every run.
      const threadsRes = await smoobuFetch(apiKey, `/threads?page_size=50`)
      const threads = threadsRes.threads ?? []
      let messagesSynced = 0

      let threadsSkippedNoBooking = 0
      const threadErrors: string[] = []
      for (const thread of threads) {
        const propertyId = apartmentToProperty.get(String(thread.apartment?.id))
        if (!propertyId) continue

        let { data: booking }: { data: { id: any; total_amount?: any } | null } = await supabase
          .from('bookings')
          .select('id, total_amount')
          .eq('external_id', `smoobu-${thread.booking?.id}`)
          .maybeSingle()

        // Message threads aren't bound by the arrivalFrom window
        // above -- a thread can reference a booking that's outside
        // it (e.g. a past stay, or a booking made before that window
        // and never re-modified). Rather than silently dropping the
        // thread's messages, fetch that one booking directly from
        // Smoobu and upsert it, same as the main loop does.
        // Also refetch older bookings saved before prices were synced.
        if ((!booking || booking.total_amount == null) && thread.booking?.id) {
          try {
            const fullBooking = await smoobuFetch(apiKey, `/reservations/${thread.booking.id}`)
            const externalId = `smoobu-${thread.booking.id}`
            const { error: upsertError } = await supabase
              .from('bookings')
              .upsert(bookingUpsertPayload(fullBooking, propertyId), { onConflict: 'external_id' })
            if (upsertError) throw upsertError
            // Re-fetch by external_id rather than trusting the upsert's
            // own return value -- .select().single() chained onto an
            // upsert is fragile (throws if PostgREST doesn't hand back
            // exactly one row, which isn't guaranteed here), and a
            // plain re-select afterward is a strictly safer way to get
            // the row's real id.
            const { data: refetched, error: refetchError } = await supabase
              .from('bookings')
              .select('id')
              .eq('external_id', externalId)
              .maybeSingle()
            if (refetchError) throw refetchError
            booking = refetched
          } catch (e) {
            if (threadErrors.length < 5) threadErrors.push(`booking ${thread.booking.id}: ${e instanceof Error ? e.message : JSON.stringify(e)}`)
          }
        }

        if (!booking) { threadsSkippedNoBooking++; continue }

        let msgsRes: any
        try {
          msgsRes = await smoobuFetch(apiKey, `/reservations/${thread.booking.id}/messages`)
        } catch (e) {
          if (threadErrors.length < 5) threadErrors.push(`messages ${thread.booking.id}: ${e instanceof Error ? e.message : String(e)}`)
          continue
        }
        // Only ever auto-reply to the newest guest message in a thread, and
        // only if the thread's latest activity is recent -- so the first
        // import (or any catch-up) never answers old conversations.
        const msgList: any[] = msgsRes.messages ?? []
        const latestAt = Date.parse(thread.latest_message?.created_at ?? '') || 0
        const lastGuestMsgId = [...msgList].filter(x => x.type === 1).map(x => x.id).pop()
        for (const m of msgList) {
          const smoobuMsgId = `smoobu-${thread.booking.id}-${m.id}`
          const isGuestMessage = m.type === 1 // 1 = inbox (from guest), 2 = outbox (from host)

          // Only trigger the AI auto-reply for a message that's
          // genuinely new this run -- otherwise every 30-minute
          // re-sync would re-process the same already-answered
          // message and could reply to it again.
          const { data: existing } = await supabase.from('str_guest_messages').select('id').eq('smoobu_message_id', smoobuMsgId).maybeSingle()

          await supabase.from('str_guest_messages').upsert({
            user_id: userId,
            booking_id: booking.id,
            sender: isGuestMessage ? 'guest' : 'staff',
            subject: m.subject || null,
            message: m.message || m.messageHtml || '',
            smoobu_message_id: smoobuMsgId,
            ...((m.createdAt || m.created_at) ? { created_at: new Date(m.createdAt || m.created_at).toISOString() } : {}),
          }, { onConflict: 'smoobu_message_id' })
          messagesSynced++

          const msgAt = Date.parse(m.createdAt ?? m.created_at ?? '') || 0
          const recent = (msgAt || latestAt) > Date.now() - 2 * 3600e3
          if (!existing && isGuestMessage && recent && m.id === lastGuestMsgId) {
            try {
              await maybeAutoReplyToGuest(userId, booking.id, m.message || m.messageHtml || '')
            } catch (e) {
              console.error('[sync-smoobu] auto-reply failed:', e)
            }
          }
        }
      }

      results.push({
        user_id: userId,
        v: 2,
        bookings: bookingsSynced,
        messages: messagesSynced,
        // Diagnostics -- remove once this is confirmed working.
        debug: {
          mappedApartmentIds,
          totalBookingsFromSmoobu: bookings.length,
          totalItemsAccordingToSmoobu: bookingsRes.total_items,
          apartmentIdsSeenInResponse: Array.from(seenApartmentIds),
          totalThreadsFromSmoobu: threads.length,
          threadsSkippedNoBooking,
          threadErrors: [...threadErrorsEarly, ...threadErrors],
        },
      })
    } catch (e) {
      results.push({ user_id: userId, error: String(e) })
    }
  }

  return { synced: results }
}
