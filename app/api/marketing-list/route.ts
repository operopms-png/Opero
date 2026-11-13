import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'
import { EMAIL_DOMAIN } from '@/lib/brand'
import { unsubFooterHtml, unsubHeaders } from '@/lib/marketing-optin'

// Marketing → Emails → Mailing list. Opted-in contacts of the caller's own company only.
// GET  -> { total, types: { landlord: 3, ... } }
// POST { email_id, audience: 'all' | <contact type> } -> sends the saved email to each opted-in contact with an unsubscribe link.
export const maxDuration = 300

async function audience(businessId: string, type?: string) {
  let q = serviceClient.from('crm_contacts').select('id,name,email,type,unsub_token').eq('user_id', businessId).eq('marketing_opt_in', true).not('email', 'is', null).neq('email', '')
  if (type && type !== 'all') q = q.eq('type', type)
  const { data } = await q.limit(5000)
  const seen = new Set<string>()
  return (data ?? []).filter(c => { const e = String(c.email).toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const all = await audience(caller.businessId)
  const types: Record<string, number> = {}
  for (const c of all) { const k = c.type || 'other'; types[k] = (types[k] ?? 0) + 1 }
  return NextResponse.json({ total: all.length, types })
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { email_id, audience: aud } = await req.json().catch(() => ({}))
  if (!email_id) return NextResponse.json({ error: 'Choose an email first' }, { status: 400 })
  const { data: email } = await serviceClient.from('marketing_emails').select('*').eq('id', email_id).eq('user_id', caller.businessId).single()
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  if (!email.body?.trim()) return NextResponse.json({ error: 'That email has no body to send' }, { status: 400 })
  if (email.status === 'Sent') return NextResponse.json({ error: 'That email has already been sent' }, { status: 400 })
  const people = await audience(caller.businessId, aud)
  if (!people.length) return NextResponse.json({ error: 'Nobody in that audience has opted in' }, { status: 400 })

  const { data: settings } = await serviceClient.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id', caller.businessId).single()
  const from = settings?.marketing_from_email ? `${settings.marketing_from_name || 'Property Management Team'} <${settings.marketing_from_email}>` : undefined
  const replyTo = `marketing+${email.reply_token}@${EMAIL_DOMAIN}`
  const bodyHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${String(email.body).replace(/\n/g, '<br/>')}</div>`

  let sent = 0, failed = 0
  for (const c of people) {
    const r = await sendEmail(c.email as string, email.subject, bodyHtml + unsubFooterHtml(c.unsub_token as string), replyTo, from, undefined, unsubHeaders(c.unsub_token as string)).catch(() => ({ error: 'x' } as any))
    if (r?.skipped) return NextResponse.json({ error: 'Email sending is not configured yet — nothing was sent.' }, { status: 400 })
    if (r?.error) failed++; else sent++
  }
  if (sent > 0) await serviceClient.from('marketing_emails').update({ status: 'Sent', sent_at: new Date().toISOString(), to_recipient: `Mailing list (${aud && aud !== 'all' ? aud : 'all opted-in'}) · ${sent} people` }).eq('id', email.id)
  return NextResponse.json({ success: true, sent, failed })
}
