export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'

// Public. The Request a demo form on thenovourq.com (it links to /request-demo). Saves the lead in NOVOURQ's own CRM
// (contact + deal in the Enquiry stage), alerts the team, and emails the person a confirmation.
const clean = (v: any, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ ok: true }) // hidden field only bots fill in
  const first = clean(b.first_name, 80), last = clean(b.last_name, 80), name = `${first} ${last}`.trim()
  const company = clean(b.company, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40)
  const manages = clean(b.manages, 80), message = clean(b.message, 2000)
  if (!first || !last) return err('Please add your first and last name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please add a valid email address.')

  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('user_id', LISTINGS_BUSINESS_ID).ilike('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return err('We already have your request and will be in touch soon.', 429)

  const notes = [`Asked for a demo of Novourq Cloud AI`, company && `Company: ${company}`, manages && `Manages: ${manages}`, message && `Needs: ${message}`].filter(Boolean).join('\n')
  await addCrmLead({ businessId: LISTINGS_BUSINESS_ID, name, email, phone, source: 'Request a demo', module: 'pm', type: 'website_lead', notes, dealName: `${company || name} — Demo request` })
  alertTeam(LISTINGS_BUSINESS_ID, `New demo request: ${name}${company ? ` (${company})` : ''}`, notes, '/staff-centre/crm', email).catch(() => {})
  sendEmail(email, 'We have your demo request', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#0B1B45"><p>Dear ${esc(first)},</p><p>Thank you for asking about <b>Novourq Cloud AI</b>. We have your details and a member of our team will contact you shortly to arrange your demo.</p></div>`).catch(() => {})
  return NextResponse.json({ ok: true })
}
