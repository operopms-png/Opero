export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'
import { SITE_URL } from '@/lib/brand'

// Public. The website popup ("Find out more") posts here: {email, name?, consent, source?, website(honeypot)}.
// Saves the person in the Novourq CRM (contact + deal at Enquiry) with their marketing consent noted, alerts the team,
// and emails them a thank-you with the brochure link. Only people who ticked the consent box are accepted.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const clean = (v: any, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: CORS })

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ ok: true }, { headers: CORS })
  const email = clean(b.email, 200).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please add a valid email address.')
  if (b.consent !== true) return err('Please tick the box so we can email you.')
  const name = clean(b.name, 120) || email.split('@')[0]
  const source = clean(b.source, 60) || 'Website popup'

  // Flood protection: 5 sign-ups a day per email.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('user_id', LISTINGS_BUSINESS_ID).ilike('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return NextResponse.json({ ok: true }, { headers: CORS })

  const notes = `Signed up on the website popup (Find out more).\nMarketing emails: Yes, ticked the consent box on ${new Date().toISOString().slice(0, 10)}.`
  await addCrmLead({ businessId: LISTINGS_BUSINESS_ID, name, email, phone: null, source, module: 'pm', type: 'landlord', notes, dealName: `${name} — Website popup` })
  alertTeam(LISTINGS_BUSINESS_ID, `New website sign-up: ${name}`, notes, '/staff-centre/crm', email).catch(() => {})
  sendEmail(email, 'Thank you from NOVOURQ', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A2C5E"><p>Hello ${esc(name)},</p><p>Thank you for your interest in NOVOURQ. A member of the team will be in touch soon.</p><p>In the meantime, you can read our brochure here: <a href="${SITE_URL}/services/NOVOURQ_Brochure.pdf">NOVOURQ brochure</a>.</p><p>You asked to hear from us by email. If you would rather not, just reply to this email and we will stop.</p><p>NOVOURQ</p></div>`).catch(() => {})
  return NextResponse.json({ ok: true }, { headers: CORS })
}
