import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

// Sends a marketing_emails row for real via Resend, using the same
// plus-alias Reply-To pattern CRM's send route uses -- so a reply lands
// back on this exact email (see app/api/email-inbound's marketing+
// handling) without needing to guess which tenant/email it belongs to.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email_id } = await req.json()
  if (!email_id) return NextResponse.json({ error: 'email_id is required' }, { status: 400 })

  const { data: email } = await serviceClient.from('marketing_emails').select('*').eq('id', email_id).eq('user_id', userId).single()
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  if (!email.to_recipient) return NextResponse.json({ error: 'No recipient set on this email' }, { status: 400 })
  if (!email.body) return NextResponse.json({ error: 'This email has no body to send' }, { status: 400 })
  if (email.status === 'Sent') return NextResponse.json({ error: 'This email has already been sent' }, { status: 400 })

  const replyTo = `marketing+${email.reply_token}@helloopero.com`
  const result = await sendEmail(email.to_recipient, email.subject, `<p>${email.body.replace(/\n/g, '<br/>')}</p>`, replyTo)

  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  if (result.skipped) return NextResponse.json({ skipped: true, message: 'Email sending is not configured yet — nothing was actually sent.' })

  await serviceClient.from('marketing_emails').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', email.id)

  return NextResponse.json({ success: true })
}
