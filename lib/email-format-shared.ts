// House email format: every email sent from the portal (staff, AI replies,
// Marketing) gets the same opening, sign-off and branded footer. Admins edit
// it in Email → Mailbox settings → Email format.
// Pure helpers (safe in the browser too, for the compose preview).

export type EmailFormat = {
  greeting: string; closing: string; sign_name: boolean; footer_enabled: boolean
  company: string; tagline: string; phone: string; website: string
  address_uk: string; address_jm: string; company_number: string; rating: string; disclaimer: string
}

export const DEFAULT_FORMAT: EmailFormat = {
  greeting: 'Dear {name},',
  closing: 'Kind regards,',
  sign_name: true,
  footer_enabled: true,
  company: 'Sangsters Group',
  tagline: 'Global real estate leaders · #FeelAtHomeAnywhere',
  phone: '020 7164 0329',
  website: 'www.sangstersgroup.com',
  address_uk: 'Tallis House, 2 Tallis St, Blackfriars, London EC4Y 0AB, United Kingdom',
  address_jm: 'Shop 7, 45 Main Street, Porus, Manchester, Jamaica, JMDMR21',
  company_number: '16171490',
  rating: 'We are rated 4.0 out of 5',
  disclaimer: 'This email and any attachments are confidential and intended only for the named recipient. If you received it in error, please let us know and delete it.',
}
export const FORMAT_FIELDS = Object.keys(DEFAULT_FORMAT) as (keyof EmailFormat)[]

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const LOGO = 'https://app.sangstersgroup.com/logo-192.png'

// Email-safe (table + inline styles) footer. `email` is the address it's sent from.
export function footerHtml(f: EmailFormat, email: string) {
  if (!f.footer_enabled) return ''
  const site = f.website ? `https://${f.website.replace(/^https?:\/\//, '')}` : ''
  const line = (label: string, val: string, href?: string) => val ? `<tr><td style="padding:1px 10px 1px 0;color:#A8862E;font-weight:bold;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:1px 0;color:#323338">${href ? `<a href="${href}" style="color:#323338;text-decoration:none">${esc(val)}</a>` : esc(val)}</td></tr>` : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:3px solid #D0AE4C;font-family:Arial,sans-serif;font-size:12px;line-height:1.45;max-width:600px;width:100%">
<tr><td style="padding:14px 14px 0 0;vertical-align:top;width:84px"><img src="${LOGO}" width="72" height="72" alt="${esc(f.company)}" style="display:block;border-radius:8px;border:0"></td>
<td style="padding:14px 0 0;vertical-align:top">
<div style="font-size:16px;font-weight:bold;color:#624920">${esc(f.company)}</div>
${f.tagline ? `<div style="color:#8A7248;margin:2px 0 8px">${esc(f.tagline)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:12px">
${line('Email', email, `mailto:${email}`)}${line('Website', f.website, site)}${line('Office', f.phone, f.phone ? `tel:${f.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}` : '')}${line('London', f.address_uk)}${line('Jamaica', f.address_jm)}
</table>
${f.rating ? `<div style="margin-top:8px;color:#A8862E;font-weight:bold">★ ${esc(f.rating)}</div>` : ''}
</td></tr>
<tr><td colspan="2" style="padding-top:12px;color:#9699A6;font-size:10.5px;line-height:1.4">${f.company_number ? `${esc(f.company)} · Company number ${esc(f.company_number)}. ` : ''}${esc(f.disclaimer || '')}</td></tr>
</table>`
}

export function footerText(f: EmailFormat, email: string) {
  if (!f.footer_enabled) return ''
  return ['', '--', f.company, f.tagline, `Email: ${email}`, f.website && `Website: ${f.website}`, f.phone && `Office: ${f.phone}`, f.address_uk && `London: ${f.address_uk}`, f.address_jm && `Jamaica: ${f.address_jm}`, f.rating, f.company_number && `Company number ${f.company_number}`].filter(x => typeof x === 'string').join('\n')
}

const bodyDiv = (html: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#323338">${html}</div>`
export const textToHtml = (t: string) => esc(t).replace(/\n/g, '<br>')

// Wraps a plain-text body in the house format: body + footer (+ quoted thread).
export function formatEmail(f: EmailFormat, fromEmail: string, bodyText: string, quotedText?: string) {
  const quoted = quotedText ? `<br><div style="color:#676879;border-left:2px solid #D0D4E4;padding-left:10px;margin-top:10px;font-family:Arial,sans-serif;font-size:13px">${textToHtml(quotedText)}</div>` : ''
  return {
    html: bodyDiv(textToHtml(bodyText)) + footerHtml(f, fromEmail) + quoted,
    text: bodyText + footerText(f, fromEmail) + (quotedText ? '\n\n' + quotedText : ''),
  }
}
