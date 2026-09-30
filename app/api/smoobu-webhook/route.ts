import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { syncSmoobuReservation, runSmoobuSync } from '@/lib/sync-smoobu'

// Smoobu webhook -- Smoobu calls this the moment a booking is made,
// changed or cancelled, or a guest message arrives, so the portal updates
// instantly instead of waiting for the 10-minute sync.
// URL: /api/smoobu-webhook?token=<integrations.smoobu_webhook_token>
// Payloads (docs.smoobu.com#webhooks):
//   newReservation / updateReservation / cancelReservation / deleteReservation -> data = the reservation (data.id)
//   newMessage -> data = { id, sender, booking: { id } }
//   onlineCheckInUpdate -> data = { bookingId }
export const dynamic = 'force-dynamic'
export const maxDuration = 26

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  const { data: integ } = await serviceClient.from('integrations').select('user_id').eq('smoobu_webhook_token', token).maybeSingle()
  if (!integ) return NextResponse.json({ error: 'Unknown token' }, { status: 401 })
  const userId = integ.user_id as string

  const payload = await req.json().catch(() => ({}))
  const action = String(payload?.action ?? '')
  const data = payload?.data ?? {}
  await serviceClient.from('integrations').update({ smoobu_webhook_last_at: new Date().toISOString(), smoobu_webhook_last_action: action || 'unknown' }).eq('user_id', userId)

  try {
    if (action === 'deleteReservation') {
      if (data.id) await serviceClient.from('bookings').update({ status: 'cancelled' }).eq('external_id', `smoobu-${data.id}`)
      return NextResponse.json({ ok: true, action })
    }
    if (['newReservation', 'updateReservation', 'cancelReservation'].includes(action) && data.id) {
      const r = await syncSmoobuReservation(userId, data.id, { messages: false })
      return NextResponse.json({ ok: true, action, result: r })
    }
    if (action === 'newMessage' && data.booking?.id) {
      const r = await syncSmoobuReservation(userId, data.booking.id)
      return NextResponse.json({ ok: true, action, result: r })
    }
    if (action === 'onlineCheckInUpdate' && data.bookingId) {
      const r = await syncSmoobuReservation(userId, data.bookingId, { messages: false })
      return NextResponse.json({ ok: true, action, result: r })
    }
    // Rates / price elements etc. -- nothing the portal shows yet.
    return NextResponse.json({ ok: true, action, ignored: true })
  } catch (e) {
    // Fall back to a full sync for this account so nothing is missed.
    console.error('[smoobu-webhook]', action, e)
    try { await runSmoobuSync(userId) } catch {}
    return NextResponse.json({ ok: true, action, fallback: true })
  }
}

// Lets Smoobu (or a browser) check the URL is live.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'smoobu-webhook' })
}
