import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { sendSmoobuGuestMessage } from '@/lib/sync-smoobu'

// Real guest messaging. If this booking came from Smoobu (external_id
// starts with 'smoobu-'), sends through Smoobu's own send-message-to-
// guest endpoint instead of plain email -- Smoobu relays it into the
// guest's actual Airbnb/Booking.com/etc chat, not just their inbox.
// Falls back to email for bookings with no Smoobu link, since guests
// don't have a portal login the way landlords/tenants do.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, subject, body } = await req.json()
  if (!booking_id || !body?.trim()) {
    return NextResponse.json({ error: 'booking_id and body are required' }, { status: 400 })
  }

  const { data: booking } = await serviceClient
    .from('bookings')
    .select('id, guest_name, guest_email, reply_token, external_id, property_id, properties(user_id)')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  const ownerId = (booking as any).properties?.user_id
  if (ownerId && ownerId !== userId) return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 })

  const smoobuMatch = booking.external_id?.match(/^smoobu-(\d+)$/)

  if (smoobuMatch) {
    const { data: integ } = await serviceClient.from('integrations').select('smoobu_api_key').eq('user_id', userId).single()
    if (!integ?.smoobu_api_key) return NextResponse.json({ error: 'Smoobu is not connected for this account.' }, { status: 400 })

    try {
      await sendSmoobuGuestMessage(integ.smoobu_api_key, smoobuMatch[1], subject, body)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
    }

    await serviceClient.from('str_guest_messages').insert({
      user_id: userId,
      booking_id,
      sender: 'staff',
      subject: subject || null,
      message: body,
    })
    return NextResponse.json({ success: true, via: 'smoobu' })
  }

  if (!booking.guest_email) return NextResponse.json({ error: 'This booking has no guest email on file.' }, { status: 400 })

  const replyTo = booking.reply_token ? `guest+${booking.reply_token}@helloopero.com` : undefined
  const result = await sendEmail(
    booking.guest_email,
    subject || 'Message from your host',
    `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    replyTo
  )

  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })

  await serviceClient.from('str_guest_messages').insert({
    user_id: userId,
    booking_id,
    sender: 'staff',
    subject: subject || null,
    message: body,
  })

  if (result.skipped) return NextResponse.json({ skipped: true, message: 'Email sending is not configured yet — logged to the thread only.' })
  return NextResponse.json({ success: true, via: 'email' })
}
