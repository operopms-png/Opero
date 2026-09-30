import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller, canAccess, sendFromMailbox, friendlyError } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'
import { EMAIL_DOMAIN } from '@/lib/brand'

// Sends a marketing_emails row for real via Resend, using the same
// plus-alias Reply-To pattern CRM's send route uses -- so a reply lands
// back on this exact email (see app/api/email-inbound's marketing+
// handling) without needing to guess which tenant/email it belongs to.
// If the email has a "Send from" mailbox, it goes out through that
// company mailbox instead (Email → Mailbox settings), so it's genuinely
// from that address, lands in its Sent folder, and replies arrive in it.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = caller.businessId

  const { email_id } = await req.json()
  if (!email_id) return NextResponse.json({ error: 'email_id is required' }, { status: 400 })

  const { data: email } = await serviceClient.from('marketing_emails').select('*').eq('id', email_id).eq('user_id', userId).single()
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  if (!email.to_recipient) return NextResponse.json({ error: 'No recipient set on this email' }, { status: 400 })
  if (!email.body) return NextResponse.json({ error: 'This email has no body to send' }, { status: 400 })
  if (email.status === 'Sent') return NextResponse.json({ error: 'This email has already been sent' }, { status: 400 })

  if (email.from_mailbox_id) {
    const { data: mb } = await serviceClient.from('mailboxes').select('*').eq('id', email.from_mailbox_id).maybeSingle()
    if (!mb || !canAccess(mb, caller)) return NextResponse.json({ error: 'You don’t have access to that sending mailbox' }, { status: 403 })
    if (mb.status !== 'connected' || !mb.password_enc) return NextResponse.json({ error: `${mb.email} isn’t connected. Connect it in Email → Mailbox settings, or clear “Send from”.` }, { status: 400 })
    try {
      await sendFromMailbox(mb, { sentBy: caller.name + ' (Marketing)', to: email.to_recipient, subject: email.subject, html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${email.body.replace(/\n/g, '<br/>')}</div>`, text: email.body })
    } catch (e: any) { return NextResponse.json({ error: friendlyError(e) }, { status: 502 }) }
    await serviceClient.from('marketing_emails').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', email.id)
    return NextResponse.json({ success: true, via: mb.email })
  }

  const { data: settings } = await serviceClient.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id', userId).single()
  const from = settings?.marketing_from_email
    ? `${settings.marketing_from_name || 'Sangsters Group'} <${settings.marketing_from_email}>`
    : undefined // falls back to sendEmail's default (notifications@EMAIL_DOMAIN) if nothing's configured

  const replyTo = `marketing+${email.reply_token}@${EMAIL_DOMAIN}`
  const result = await sendEmail(email.to_recipient, email.subject, `<p>${email.body.replace(/\n/g, '<br/>')}</p>`, replyTo, from)

  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  if (result.skipped) return NextResponse.json({ skipped: true, message: 'Email sending is not configured yet — nothing was actually sent.' })

  await serviceClient.from('marketing_emails').update({ status: 'Sent', sent_at: new Date().toISOString(), resend_email_id: result.id || null }).eq('id', email.id)

  return NextResponse.json({ success: true })
}
