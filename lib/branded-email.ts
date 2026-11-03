// Wraps an AI-written email in the sending business's own look: their logo and name at the top,
// their contact details at the bottom, replies going to their reply-to address.
// Settings come from Invoice settings (company name, logo, contact lines, reply-to). A business with none set
// still gets a clean, neutral layout under a plain company name.
import { createClient } from '@supabase/supabase-js'
import { EMAIL_DOMAIN, SITE_URL } from './brand'
import { companyName } from './ai-proposal-utils'

const SITE = SITE_URL
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export async function brandedEmail(businessId: string, body: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: s } = await db.from('invoice_settings').select('company_name, logo_url, contact_lines, reply_to').eq('business_id', businessId).maybeSingle()
  const company = (s?.company_name as string | undefined)?.trim() || await companyName(businessId)
  const logo = s?.logo_url ? (String(s.logo_url).startsWith('http') ? String(s.logo_url) : SITE + (String(s.logo_url).startsWith('/') ? '' : '/') + s.logo_url) : ''
  const contact = String(s?.contact_lines ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const paras = esc(body.trim()).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('')
  const html = `<div style="background:#f4f6f8;padding:24px 12px"><div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;border-radius:6px;overflow:hidden;color:#323338">
  <div style="padding:18px 24px;border-bottom:3px solid #89CFF0;background:#ffffff">${logo ? `<img src="${esc(logo)}" alt="${esc(company)}" height="36" style="height:36px;max-width:200px;vertical-align:middle;margin-right:10px;border:0">` : ''}<span style="font-size:17px;font-weight:700;vertical-align:middle;color:#1b2f4b">${esc(company)}</span></div>
  <div style="padding:24px;font-size:14px;line-height:1.6">${paras}</div>
  ${contact.length ? `<div style="padding:14px 24px;font-size:12px;line-height:1.6;color:#667085;background:#f7f9fb;border-top:1px solid #e4e7ec">${contact.map(esc).join('<br>')}</div>` : ''}
  </div></div>`
  return { html, replyTo: (s?.reply_to as string | null) || undefined, from: `${company.replace(/[<>"]/g, '')} <notifications@${EMAIL_DOMAIN}>` }
}
