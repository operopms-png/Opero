// Sends a marketing message to a company's opted-in contacts, each with an unsubscribe link, and records it in
// Marketing → Emails as Sent. Used by Marketing → Emails → Mailing list and by an approved Novourq Cloud AI request.
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { EMAIL_DOMAIN, MARKETING_FROM } from '@/lib/brand'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'
import { unsubFooterHtml, unsubHeaders } from '@/lib/marketing-optin'
import { pagePictures, absUrl } from '@/lib/service-images'
import { alertEmail } from '@/lib/crm-lead'

const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export async function audience(businessId: string, type?: string) {
  let q = serviceClient.from('crm_contacts').select('id,name,email,type,unsub_token,source,marketing_opt_in_at').eq('user_id', businessId).eq('marketing_opt_in', true).not('email', 'is', null).neq('email', '')
  if (type && type !== 'all') q = q.eq('type', type)
  const { data } = await q.limit(5000)
  const seen = new Set<string>()
  return (data ?? []).filter(c => { const e = String(c.email).toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true })
}

export async function sendToList(o: { businessId: string; audience?: string; mode?: string; subject: string; body: string; docIds?: string[]; savedId?: string | null; replyToken?: string }): Promise<{ sent: number; failed: number; error?: string }> {
  const aud = o.audience || 'all'
  const mode: 'link' | 'picture' | 'both' = o.mode === 'picture' || o.mode === 'both' ? o.mode : 'link'
  if (!o.subject.trim()) return { sent: 0, failed: 0, error: 'Add a subject' }
  if (!o.body.trim()) return { sent: 0, failed: 0, error: 'Write the message first' }
  const people = await audience(o.businessId, aud)
  if (!people.length) return { sent: 0, failed: 0, error: 'Nobody in that audience has opted in' }

  const want = (o.docIds ?? []).map(String).slice(0, 10)
  const { data: docs } = want.length ? await serviceClient.from('service_docs').select('id,title,url').eq('business_id', o.businessId).eq('active', true).in('id', want) : { data: [] as any[] }
  const docHtml = (docs ?? []).map(d => {
    const link = absUrl(d.url), pics = pagePictures(d.url)
    const showPics = (mode === 'picture' || mode === 'both') && pics.length
    const showLink = mode === 'link' || mode === 'both' || !pics.length
    return `<div style="margin:24px 0 0"><p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1A2C5E">${esc(d.title)}</p>`
      + (showPics ? pics.map(u => `<a href="${link}"><img src="${u}" alt="${esc(d.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #e4e9f4;margin:0 0 8px"></a>`).join('') : '')
      + (showLink ? `<p style="margin:8px 0 0"><a href="${link}" style="display:inline-block;background:#1A2C5E;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px">${pics.length ? 'Open the PDF' : 'View ' + esc(d.title)}</a></p>` : '')
      + `</div>`
  }).join('')

  const { data: settings } = await serviceClient.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id', o.businessId).single()
  const own = o.businessId === LISTINGS_BUSINESS_ID   // NOVOURQ itself: always from noreply@thenovourq.com with no reply address
  const from = own ? MARKETING_FROM : settings?.marketing_from_email ? `${settings.marketing_from_name || 'Property Management Team'} <${settings.marketing_from_email}>` : undefined
  // Replies: to the tracked address for a saved draft, otherwise to the company's own sending address (or its alert address), never to a no-reply one.
  const replyTo = own ? undefined : o.replyToken ? `marketing+${o.replyToken}@${EMAIL_DOMAIN}` : (settings?.marketing_from_email || await alertEmail(o.businessId) || undefined)

  let sent = 0, failed = 0
  for (const c of people) {
    const first = String(c.name || '').trim().split(/\s+/)[0] || 'there'
    const text = o.body.replace(/\{\{\s*first_name\s*\}\}/gi, first)
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1d2433;max-width:600px">${esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1A2C5E">$1</a>').replace(/\n/g, '<br/>')}${docHtml}</div>` + unsubFooterHtml(c.unsub_token as string)
    const r = await sendEmail(c.email as string, o.subject, html, replyTo, from, undefined, unsubHeaders(c.unsub_token as string)).catch(() => ({ error: 'x' } as any))
    if (r?.skipped) return { sent: 0, failed: 0, error: 'Email sending is not configured yet — nothing was sent.' }
    if (r?.error) failed++; else sent++
  }
  if (sent > 0) {
    const row = { status: 'Sent', sent_at: new Date().toISOString(), to_recipient: `Mailing list (${aud !== 'all' ? aud : 'all opted-in'}) · ${sent} people` }
    if (o.savedId) await serviceClient.from('marketing_emails').update(row).eq('id', o.savedId)
    else await serviceClient.from('marketing_emails').insert({ user_id: o.businessId, module: 'pm', subject: o.subject, body: o.body, ...row })
  }
  return { sent, failed }
}
