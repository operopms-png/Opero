import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

// Real guest messaging via email -- guests don't have a portal login
// the way landlords/tenants do, so this uses the same reply_token +
// plus-alias pattern as CRM (see app/api/crm-send and
// app/api/email-inbound) so replies route back into this booking's
// own thread automatically.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, subject, body } = await req.json()
  if (!booking_id || !body?.trim()) {
    return NextResponse.json({ error: 'booking_id and body are required' }, { status: 400 })
  }

  const { data: booking } = await serviceClient
    .from('bookings')
    .select('id, guest_name, guest_email, reply_token, user_id')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.user_id && booking.user_id !== userId) return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 })
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
  return NextResponse.json({ success: true })
}
