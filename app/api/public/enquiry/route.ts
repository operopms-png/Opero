export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { ENQUIRY_SERVICES } from '@/lib/enquiry-form'

// Public. GET ?t=<token> → { ok } (is the link live). POST → saves the lead in that company's CRM
// (contact + deal in the Enquiry stage), alerts the team, and emails the enquirer a confirmation.
const clean = (v: any, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })

async function biz(token: string) {
  if (!/^[a-z0-9]{8,40}$/i.test(token)) return null
  const { data } = await db.from('enquiry_links').select('business_id,active').eq('token', token).maybeSingle()
  return data?.active ? (data.business_id as string) : null
}

export async function GET(req: NextRequest) {
  const ok = !!(await biz(req.nextUrl.searchParams.get('t') || ''))
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ ok: true })
  const business = await biz(clean(b.token, 40)); if (!business) return err('This link is no longer active.', 404)
  const svc = ENQUIRY_SERVICES.find(s => s.key === b.service); if (!svc) return err('Please choose a service.')
  const first = clean(b.first_name, 80), last = clean(b.last_name, 80), name = `${first} ${last}`.trim()
  const email = clean(b.email, 200).toLowerCase(), phone = `${clean(b.country_code, 8)} ${clean(b.phone, 30)}`.trim()
  if (!first || !last) return err('Please add your first and last name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please add a valid email address.')
  if (clean(b.phone, 30).replace(/\D/g, '').length < 6) return err('Please add your phone number.')
  const role = clean(b.role, 20), owns = clean(b.owns, 20)
  if (!role || !owns) return err('Please answer all the questions marked with a star.')
  const message = clean(b.message, 2000); if (!message) return err('Please tell us how we can help.')

  // Same person can't flood the form: 5 enquiries a day.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('user_id', business).ilike('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return err('We already have your enquiry and will be in touch soon.', 429)

  const props = (Array.isArray(b.properties) ? b.properties : []).slice(0, 20).map((p: any, i: number) =>
    `  ${i + 1}. ${clean(p?.location, 160) || '(no location)'} | ${clean(p?.bedrooms, 10)} bed | ${clean(p?.bathrooms, 10)} bath | ${clean(p?.furniture, 30)}`)
  const lines = [
    `Service: ${svc.label}`, `I am: ${role}`, `Owns or subleases a property now: ${owns}`,
    ...(owns === 'Yes' ? [`Listed on Airbnb or Booking.com: ${clean(b.listed, 10) || 'not answered'}`, ...(props.length ? ['Properties:', ...props] : [])]
      : [`Planning to buy or sublease: ${clean(b.planning, 10) || 'not answered'}`, ...(clean(b.planning, 10) === 'Yes' ? [`When: ${clean(b.when, 40)}`, `Budget: ${clean(b.budget, 60)}`] : [])]),
    `How we can help: ${message}`, `Marketing opt-in: ${b.marketing ? 'Yes' : 'No'}`,
  ]
  const notes = lines.join('\n')
  await addCrmLead({ businessId: business, name, email, phone, source: 'Enquiry form', module: svc.module, type: 'landlord', notes, dealName: `${name} — ${svc.label}` })
  alertTeam(business, `New enquiry: ${name} (${svc.label})`, notes, '/staff-centre/crm', email).catch(() => {})
  sendEmail(email, `We have your enquiry — ${svc.label}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#16233F"><p>Dear ${esc(first)},</p><p>Thank you for your interest in <b>${esc(svc.label)}</b>. We have your details and a member of our team will contact you shortly to arrange a call.</p><p>If anything changes in the meantime, just reply to this email.</p></div>`).catch(() => {})
  return NextResponse.json({ ok: true })
}
