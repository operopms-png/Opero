import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { sendSms } from '@/lib/send-sms'
import { sendWhatsapp } from '@/lib/send-whatsapp'

// Sends a message to a CRM contact over email, SMS, or WhatsApp, and logs
// it to crm_activities so it shows up in that contact's activity feed
// regardless of which channel was used.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channel, contact_id, to, subject, body, module } = await req.json()
  if (!channel || !to || !body) {
    return NextResponse.json({ error: 'channel, to, and body are required' }, { status: 400 })
  }
  if (!['email', 'sms', 'whatsapp'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be email, sms, or whatsapp' }, { status: 400 })
  }

  let result: { success?: boolean; skipped?: boolean; error?: string }
  if (channel === 'email') {
    result = await sendEmail(to, subject || 'Message from your property manager', `<p>${body.replace(/\n/g, '<br/>')}</p>`)
  } else if (channel === 'sms') {
    result = await sendSms(to, body)
  } else {
    result = await sendWhatsapp(to, body)
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  await serviceClient.from('crm_activities').insert({
    user_id: userId,
    module: module || 'crm',
    contact_id: contact_id || null,
    type: channel,
    subject: subject || `${channel.toUpperCase()} sent`,
    body,
  })

  if (result.skipped) {
    return NextResponse.json({ skipped: true, message: `${channel} not configured yet — logged to activity feed only` })
  }
  return NextResponse.json({ success: true })
}
