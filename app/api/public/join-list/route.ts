export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'
import { SITE_URL, MARKETING_FROM } from '@/lib/brand'
import { unsubFooterHtml } from '@/lib/marketing-optin'

// Public. The website popup ("Find out more") posts here: {email, name?, consent, source?, website(honeypot)}.
// Saves the person in the Novourq CRM (contact + deal at Enquiry) with their marketing consent noted, alerts the team,
// and emails them a thank-you (with an unsubscribe link). Sets the contact's marketing opt-in. Only people who ticked the consent box are accepted.
// Optional `business`: a company's own id, for the embeddable form on that company's website (saves into that company's CRM).
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
  // Each company's own website form sends its business id; the NOVOURQ popup sends none.
  let businessId = LISTINGS_BUSINESS_ID
  const bid = clean(b.business, 60)
  if (/^[0-9a-f-]{36}$/i.test(bid) && bid !== LISTINGS_BUSINESS_ID) {
    const { data: u } = await db.auth.admin.getUserById(bid).catch(() => ({ data: null as any }))
    if (u?.user) businessId = bid
  }
  const own = businessId === LISTINGS_BUSINESS_ID
  const name = clean(b.name, 120) || email.split('@')[0]
  const source = clean(b.source, 60) || 'Website popup'

  // Flood protection: 5 sign-ups a day per email.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('user_id', businessId).ilike('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return NextResponse.json({ ok: true }, { headers: CORS })

  const notes = `Signed up on the website popup (Find out more).\nMarketing emails: Yes, ticked the consent box on ${new Date().toISOString().slice(0, 10)}.`
  const contactId = await addCrmLead({ businessId, name, email, phone: null, source, module: 'pm', type: 'landlord', notes, dealName: `${name} — ${source}` })
  let token = ''
  if (contactId) {
    await db.from('crm_contacts').update({ marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString(), marketing_unsub_at: null }).eq('id', contactId)
    const { data: c } = await db.from('crm_contacts').select('unsub_token').eq('id', contactId).single()
    token = (c?.unsub_token as string) || ''
  }
  alertTeam(businessId, `New website sign-up: ${name}`, notes, '/staff-centre/crm', email).catch(() => {})
  const foot = token ? unsubFooterHtml(token) : ''
  const brochure = own ? `<p>In the meantime, you can read our brochure here: <a href="${SITE_URL}/services/NOVOURQ_Brochure.pdf">NOVOURQ brochure</a>.</p>` : ''
  sendEmail(email, own ? 'Thank you from NOVOURQ' : 'Thank you for signing up', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A2C5E"><p>Hello ${esc(name)},</p><p>Thank you for your interest${own ? ' in NOVOURQ' : ''}. A member of the team will be in touch soon.</p>${brochure}${own ? '<p>NOVOURQ</p>' : ''}${foot}</div>`, undefined, own ? MARKETING_FROM : undefined).catch(() => {})
  return NextResponse.json({ ok: true }, { headers: CORS })
}
