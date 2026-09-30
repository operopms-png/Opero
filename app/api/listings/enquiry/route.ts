import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { getListing, LISTINGS_BUSINESS_ID, money, bedLabel, titleCase } from '@/lib/listings'

// Public form handler for the lettings listings (/homes):
//   {kind:'viewing', property_id, name, email, phone, preferred_time, message}
//     -> Estate Agency → Viewings (status "Requested") + CRM contact + Pipeline deal
//   {kind:'wanted', name, email, phone, area, bedrooms, budget, move_date, message}
//     -> CRM contact + deal ("Looking for…"), so the team can match them later
// Unauthenticated on purpose; a hidden "website" field catches bots.
export const dynamic = 'force-dynamic'
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const clean = (v: any, n = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ success: true })
  const biz = LISTINGS_BUSINESS_ID
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40), message = clean(b.message, 3000)
  if (!name) return bad('Please add your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Please add a valid email address.')

  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await serviceClient.from('estate_viewings').select('id', { count: 'exact', head: true }).eq('user_id', biz).ilike('prospect_email', email).gte('created_at', since)
  if ((count ?? 0) >= 6) return bad('We’ve already received your requests — we’ll be in touch soon.', 429)

  if (b.kind === 'viewing') {
    const home = await getListing(clean(b.property_id, 80))
    if (!home) return bad('Sorry, that property is no longer available.', 404)
    const when = clean(b.preferred_time, 200)
    const label = titleCase(home.name)
    const details = [`Viewing request: ${label}${home.address ? ` (${titleCase(home.address)})` : ''}`, home.rent ? `Rent: ${money(home.rent, home.currency)} / month` : '', `Phone: ${phone || '—'}`, when && `Preferred time: ${when}`, message && `Message: ${message}`].filter(Boolean).join('\n')
    const contactId = await addCrmLead({ businessId: biz, name, email, phone, source: 'Listings link', module: 'estate', type: 'Tenant', notes: details, dealName: `${name} — ${label}` })
    await serviceClient.from('estate_viewings').insert({ user_id: biz, property_id: home.id, prospect_name: name, prospect_email: email, prospect_phone: phone || null, status: 'Requested', source: 'Listings link', crm_contact_id: contactId, notes: [when && `Prefers: ${when}`, message].filter(Boolean).join(' · ') || null })
    const alertTo = await alertTeam(biz, `Viewing request: ${label} — ${name}`, `${name} <${email}>${phone ? ` · ${phone}` : ''}\n${details}`, '/estate?section=Viewings', email)
    await sendEmail(email, `Your viewing request — ${label}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for your interest in <b>${esc(label)}</b>. A member of our lettings team will be in touch shortly to arrange your viewing${when ? ` — we’ve noted you prefer <b>${esc(when)}</b>` : ''}.</p><p>If anything changes, just reply to this email or call us on 020 7164 0329.</p><p>Kind regards,<br>Sangsters Group</p></div>`, alertTo).catch(() => {})
    return NextResponse.json({ success: true })
  }

  if (b.kind === 'wanted') {
    const area = clean(b.area, 120), beds = clean(b.bedrooms, 20), budget = clean(b.budget, 60), move = clean(b.move_date, 60)
    const want = [area && `Area: ${area}`, beds && `Bedrooms: ${bedLabel(beds) || beds}`, budget && `Budget: ${budget} / month`, move && `Moving: ${move}`, `Phone: ${phone || '—'}`, message && `Message: ${message}`].filter(Boolean).join('\n')
    const summary = [bedLabel(beds), area].filter(Boolean).join(' in ') || 'a home to rent'
    await addCrmLead({ businessId: biz, name, email, phone, source: 'Listings link', module: 'estate', type: 'Tenant', notes: `Looking for: ${summary}\n${want}`, dealName: `${name} — looking for ${summary}` })
    const alertTo = await alertTeam(biz, `New tenant looking for ${summary} — ${name}`, `${name} <${email}>\n${want}`, '/staff-centre/crm', email)
    await sendEmail(email, 'We’ll let you know when something comes up', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you — we’ve noted that you’re looking for <b>${esc(summary)}</b>. Our lettings team will get in touch as soon as a suitable home comes up.</p><p>Kind regards,<br>Sangsters Group</p></div>`, alertTo).catch(() => {})
    return NextResponse.json({ success: true })
  }

  return bad('Unknown request')
}
