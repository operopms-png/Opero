import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'

// "Send enquiry" from the property cards on sangstersgroup.com (sg-properties.js).
//   POST {property_id, name, email, phone, check_in, check_out, guests, move_in, message}
//   -> CRM contact + Enquiry deal, bell + email alert to the team, thank-you email.
// Public and cross-origin on purpose; a hidden "website" field catches bots.

export const dynamic = 'force-dynamic'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: CORS })
const clean = (v: any, n = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const day = (d: string) => { const x = new Date(d + 'T00:00:00'); return isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ success: true }, { headers: CORS })
  const biz = LISTINGS_BUSINESS_ID
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40), message = clean(b.message, 3000)
  if (!name) return bad('Please add your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Please add a valid email address.')

  const { data: p } = await serviceClient.from('estate_properties').select('id,name,web_title,web_area,country,status,airbnb_url').eq('user_id', biz).eq('id', clean(b.property_id, 80)).eq('show_on_website', true).maybeSingle()
  if (!p) return bad('Sorry, that property is no longer available.', 404)

  // light flood protection: same email, many enquiries in a day
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await serviceClient.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', biz).eq('type', 'lead').ilike('message', `%${email}%`).gte('created_at', since)
  if ((count ?? 0) >= 6) return bad('We’ve already received your enquiries — we’ll be in touch soon.', 429)

  const title = p.web_title || p.name
  const where = [p.web_area, p.country].filter(Boolean).join(', ')
  const stay = !!p.airbnb_url
  const checkIn = clean(b.check_in, 20), checkOut = clean(b.check_out, 20), guests = clean(b.guests, 10), moveIn = clean(b.move_in, 20)
  const details = [
    `Enquiry: ${title}${where ? ` (${where})` : ''}`,
    stay && checkIn ? `Dates: ${day(checkIn)}${checkOut ? ` → ${day(checkOut)}` : ''}` : '',
    stay && guests ? `Guests: ${guests}` : '',
    !stay && moveIn ? `Move-in: ${day(moveIn)}` : '',
    `Phone: ${phone || '—'}`,
    message && `Message: ${message}`,
  ].filter(Boolean).join('\n')

  await addCrmLead({ businessId: biz, name, email, phone, source: 'Website enquiry', module: stay ? 'str' : 'estate', type: stay ? 'Guest' : 'Tenant', notes: details, dealName: `${name} — ${title}` })
  const alertTo = await alertTeam(biz, `Website enquiry: ${title} — ${name}`, `${name} <${email}>${phone ? ` · ${phone}` : ''}\n${details}`, '/staff-centre/crm', email)
  await sendEmail(email, `Your enquiry — ${title}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for your enquiry about <b>${esc(title)}</b>${where ? ` in ${esc(where)}` : ''}. A member of our team will be in touch shortly${stay && checkIn ? ` about your dates (<b>${esc(day(checkIn))}${checkOut ? ` – ${esc(day(checkOut))}` : ''}</b>)` : ''}.</p><p>If anything changes, just reply to this email.</p><p>Kind regards,<br>Sangsters Group</p></div>`, alertTo).catch(() => {})
  return NextResponse.json({ success: true }, { headers: CORS })
}
