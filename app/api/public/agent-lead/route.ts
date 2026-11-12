export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { CORS_HEADERS } from '@/lib/website-chat'
import { SITE_URL } from '@/lib/brand'

// Agent recruitment form on the company website (WordPress page). POST { token, name, email, phone, country_code, role, country, instagram, marketing, website }
// token = the company's link code (the end of its enquiry or careers link). The lead lands in that company's CRM
// (contact type agent plus a deal at Enquiry) and the team is alerted. The applicant is sent to the agent sign-up page to create a login.
const clean = (v: any, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const reply = (b: any, s = 200) => NextResponse.json(b, { status: s, headers: CORS_HEADERS })
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS_HEADERS }) }
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return reply({ ok: true })
  const token = clean(b.token, 40)
  if (!/^[a-z0-9]{8,40}$/i.test(token)) return reply({ error: 'This form is not available.' }, 404)
  const { data: l } = await db.from('enquiry_links').select('business_id,active').eq('token', token).maybeSingle()
  if (!l?.active) return reply({ error: 'This form is not available.' }, 404)
  const business = l.business_id as string
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = `${clean(b.country_code, 8)} ${clean(b.phone, 30)}`.trim()
  if (!name) return reply({ error: 'Please enter your name.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Please check your email address.' }, 400)
  if (clean(b.phone, 30).replace(/\D/g, '').length < 6) return reply({ error: 'Please enter your phone number.' }, 400)
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('user_id', business).ilike('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return reply({ ok: true })
  const notes = [`Applied to become an agent on the website`, `I am a: ${clean(b.role, 60) || 'not answered'}`, `Based in: ${clean(b.country, 60) || 'not answered'}`, `Instagram: ${clean(b.instagram, 80) || 'none'}`, `Marketing opt-in: ${b.marketing ? 'Yes' : 'No'}`].join('\n')
  await addCrmLead({ businessId: business, name, email, phone, source: 'Agent page', module: 'str', type: 'agent', notes, dealName: `${name} — Agent` })
  alertTeam(business, `New agent application: ${name}`, notes, '/staff-centre/crm', email).catch(() => {})
  const signup = `${SITE_URL}/agent-signup/${token}`
  sendEmail(email, 'Your NOVOURQ agent application', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#16233F"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for applying to become a NOVOURQ agent. We will be in touch shortly.</p><p>To get your own agent portal, create your login here:</p><p><a href="${signup}">Create my agent account</a></p></div>`).catch(() => {})
  return reply({ ok: true, signup })
}
