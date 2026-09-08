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

const SMOOBU_BASE = 'https://login.smoobu.com/api'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

async function smoobuFetch(apiKey: string, path: string) {
  const res = await fetch(`${SMOOBU_BASE}${path}`, {
    headers: { 'Api-Key': apiKey, 'Cache-Control': 'no-cache' },
  })
  if (!res.ok) throw new Error(`Smoobu ${path} returned ${res.status}`)
  return res.json()
}

export async function runSmoobuSync() {
  const supabase = getServiceClient()
  const results: any[] = []

  // Every account with a Smoobu key configured.
  const { data: accounts } = await supabase
    .from('integrations')
    .select('user_id, smoobu_api_key')
    .not('smoobu_api_key', 'is', null)

  if (!accounts?.length) return { synced: [] }

  for (const account of accounts) {
    const apiKey = account.smoobu_api_key as string
    const userId = account.user_id as string

    try {
      const { data: mappedProps } = await supabase
        .from('properties')
        .select('id, smoobu_apartment_id')
        .eq('user_id', userId)
        .not('smoobu_apartment_id', 'is', null)

      if (!mappedProps?.length) continue
      const apartmentToProperty = new Map(mappedProps.map((p: any) => [String(p.smoobu_apartment_id), p.id]))

      // arrivalFrom, not modifiedFrom -- a booking made months ago and
      // never touched since (the normal case) has an old modified-at
      // date and would be silently missed by a "recently modified"
      // filter. arrivalFrom instead pulls anything currently staying
      // or arriving soon, which is what actually matters here,
      // regardless of when it was originally booked. Starts 7 days
      // back to still catch a guest who's mid-stay right now.
      const arrivalFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const bookingsRes = await smoobuFetch(apiKey, `/reservations?arrivalFrom=${arrivalFrom}&pageSize=100&showCancellation=true`)
      const bookings = bookingsRes.bookings ?? []
      let bookingsSynced = 0

      for (const b of bookings) {
        const propertyId = apartmentToProperty.get(String(b.apartment?.id))
        if (!propertyId) continue

        await supabase.from('bookings').upsert({
          property_id: propertyId,
          check_in: b.arrival,
          check_out: b.departure,
          guest_name: b['guest-name'],
          guest_email: b.email || null,
          guest_phone: b.phone || null,
          platform: b.channel?.name || 'Smoobu',
          source: 'smoobu',
          external_id: `smoobu-${b.id}`,
          status: b.type === 'cancellation' ? 'cancelled' : 'confirmed',
        }, { onConflict: 'external_id' })
        bookingsSynced++
      }

      // Message threads -- only fetch full message history for
      // threads Smoobu shows as having messages, rather than pulling
      // full history for every booking every run.
      const threadsRes = await smoobuFetch(apiKey, `/threads?page_size=50`)
      const threads = threadsRes.threads ?? []
      let messagesSynced = 0

      for (const thread of threads) {
        const propertyId = apartmentToProperty.get(String(thread.apartment?.id))
        if (!propertyId) continue

        const { data: booking } = await supabase
          .from('bookings')
          .select('id')
          .eq('external_id', `smoobu-${thread.booking?.id}`)
          .maybeSingle()
        if (!booking) continue

        const msgsRes = await smoobuFetch(apiKey, `/reservations/${thread.booking.id}/messages`)
        for (const m of msgsRes.messages ?? []) {
          const smoobuMsgId = `smoobu-${thread.booking.id}-${m.id}`
          await supabase.from('str_guest_messages').upsert({
            user_id: userId,
            booking_id: booking.id,
            sender: m.type === 1 ? 'guest' : 'staff', // 1 = inbox (from guest), 2 = outbox (from host)
            subject: m.subject || null,
            message: m.message || m.messageHtml || '',
            smoobu_message_id: smoobuMsgId,
          }, { onConflict: 'smoobu_message_id' })
          messagesSynced++
        }
      }

      results.push({ user_id: userId, bookings: bookingsSynced, messages: messagesSynced })
    } catch (e) {
      results.push({ user_id: userId, error: String(e) })
    }
  }

  return { synced: results }
}

export async function sendSmoobuGuestMessage(apiKey: string, smoobuReservationId: string, subject: string | undefined, body: string) {
  const res = await fetch(`${SMOOBU_BASE}/reservations/${smoobuReservationId}/messages/send-message-to-guest`, {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: subject || undefined, messageBody: body }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `Smoobu send failed with ${res.status}`)
  }
  return true
}
