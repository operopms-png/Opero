import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'
import { EMAIL_DOMAIN } from '@/lib/brand'
import { unsubFooterHtml, unsubHeaders } from '@/lib/marketing-optin'
import { pagePictures, absUrl } from '@/lib/service-images'

const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// Marketing → Emails → Mailing list. Opted-in contacts of the caller's own company only.
// GET  -> { total, types: { landlord: 3, ... } }
// POST { email_id, audience: 'all' | <contact type> } -> sends the saved email to each opted-in contact with an unsubscribe link.
export const maxDuration = 300

async function audience(businessId: string, type?: string) {
  let q = serviceClient.from('crm_contacts').select('id,name,email,type,unsub_token,source,marketing_opt_in_at').eq('user_id', businessId).eq('marketing_opt_in', true).not('email', 'is', null).neq('email', '')
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
  const people = all.map(c => ({ name: c.name, email: c.email, type: c.type || 'other', source: c.source, at: c.marketing_opt_in_at })).sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
  const { data: docs } = await serviceClient.from('service_docs').select('id,title,url').eq('business_id', caller.businessId).eq('active', true).order('sort')
  const marketing = (docs ?? []).map(d => ({ id: d.id, title: d.title, pictures: pagePictures(d.url).length }))
  return NextResponse.json({ total: all.length, types, people, docs: marketing })
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const aud = String(b.audience || 'all')
  const mode: 'link' | 'picture' | 'both' = b.mode === 'picture' || b.mode === 'both' ? b.mode : 'link'
  let subject = '', body = '', savedId: string | null = null, replyToken = ''
  if (b.email_id) {
    const { data: email } = await serviceClient.from('marketing_emails').select('*').eq('id', b.email_id).eq('user_id', caller.businessId).single()
    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    if (email.status === 'Sent') return NextResponse.json({ error: 'That email has already been sent' }, { status: 400 })
    subject = email.subject; body = email.body ?? ''; savedId = email.id; replyToken = email.reply_token
  } else {
    subject = String(b.subject || '').trim().slice(0, 200); body = String(b.body || '').trim().slice(0, 20000)
  }
  if (!subject) return NextResponse.json({ error: 'Add a subject' }, { status: 400 })
  if (!body.trim()) return NextResponse.json({ error: 'Write the message first' }, { status: 400 })
  const people = await audience(caller.businessId, aud)
  if (!people.length) return NextResponse.json({ error: 'Nobody in that audience has opted in' }, { status: 400 })

  // Attached documents: only this company's own Services Pack documents.
  const want: string[] = Array.isArray(b.doc_ids) ? b.doc_ids.map(String).slice(0, 10) : []
  const { data: docs } = want.length ? await serviceClient.from('service_docs').select('id,title,url').eq('business_id', caller.businessId).eq('active', true).in('id', want) : { data: [] as any[] }
  const docHtml = (docs ?? []).map(d => {
    const link = absUrl(d.url), pics = pagePictures(d.url)
    const showPics = (mode === 'picture' || mode === 'both') && pics.length
    const showLink = mode === 'link' || mode === 'both' || !pics.length
    return `<div style="margin:24px 0 0"><p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1A2C5E">${esc(d.title)}</p>`
      + (showPics ? pics.map(u => `<a href="${link}"><img src="${u}" alt="${esc(d.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #e4e9f4;margin:0 0 8px"></a>`).join('') : '')
      + (showLink ? `<p style="margin:8px 0 0"><a href="${link}" style="display:inline-block;background:#1A2C5E;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px">${pics.length ? 'Open the PDF' : 'View ' + esc(d.title)}</a></p>` : '')
      + `</div>`
  }).join('')

  const { data: settings } = await serviceClient.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id', caller.businessId).single()
  const from = settings?.marketing_from_email ? `${settings.marketing_from_name || 'Property Management Team'} <${settings.marketing_from_email}>` : undefined
  const replyTo = replyToken ? `marketing+${replyToken}@${EMAIL_DOMAIN}` : undefined

  let sent = 0, failed = 0
  for (const c of people) {
    const first = String(c.name || '').trim().split(/\s+/)[0] || 'there'
    const text = body.replace(/\{\{\s*first_name\s*\}\}/gi, first)
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1d2433;max-width:600px">${esc(text).replace(/\n/g, '<br/>')}${docHtml}</div>` + unsubFooterHtml(c.unsub_token as string)
    const r = await sendEmail(c.email as string, subject, html, replyTo, from, undefined, unsubHeaders(c.unsub_token as string)).catch(() => ({ error: 'x' } as any))
    if (r?.skipped) return NextResponse.json({ error: 'Email sending is not configured yet — nothing was sent.' }, { status: 400 })
    if (r?.error) failed++; else sent++
  }
  if (sent > 0) {
    const row = { status: 'Sent', sent_at: new Date().toISOString(), to_recipient: `Mailing list (${aud !== 'all' ? aud : 'all opted-in'}) · ${sent} people` }
    if (savedId) await serviceClient.from('marketing_emails').update(row).eq('id', savedId)
    else await serviceClient.from('marketing_emails').insert({ user_id: caller.businessId, module: 'pm', subject, body, ...row })
  }
  return NextResponse.json({ success: true, sent, failed })
}
