export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { alertTeam } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

// Public agent sign-up. GET ?t=<token> → { ok }. POST creates the agent's login and an agent record
// that waits (status paused) until staff press Activate in Partners → Agent Programme.
const clean = (v: any, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
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
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40), country = clean(b.country, 60)
  const password = String(b.password ?? '')
  if (!name) return err('Please enter your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please check your email address.')
  if (password.length < 8) return err('Choose a password of at least 8 characters.')
  const { data: u, error: ue } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: 'agent' } })
  if (ue || !u?.user) return err(/already|registered|exists/i.test(ue?.message || '') ? 'An account with this email already exists. Please sign in instead.' : 'Could not create your account. Please try again.', /already|registered|exists/i.test(ue?.message || '') ? 409 : 500)
  let code = (name.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'AGNT').toUpperCase() + Math.floor(100 + Math.random() * 900)
  const row = { user_id: business, name, email, phone: phone || null, country: country || null, status: 'paused', portal_user_id: u.user.id, payout_method: clean(b.payout_method, 20) || 'bank', payout_details: clean(b.payout_details, 300) || null, notes: 'Signed up on the agent sign-up link. Press Activate to approve and check the commission rates.' }
  let ins = await db.from('partner_agents').insert({ ...row, code })
  if (ins.error) { code = code.slice(0, 4) + Math.floor(1000 + Math.random() * 9000); ins = await db.from('partner_agents').insert({ ...row, code }) }
  if (ins.error) { await db.auth.admin.deleteUser(u.user.id).catch(() => {}); return err('Something went wrong. Please try again.', 500) }
  alertTeam(business, `New agent sign-up: ${name}`, `${name} (${email}) signed up as an agent. Approve them in Partners, Agent Programme: press Activate.`, '/partners', email).catch(() => {})
  sendEmail(email, 'Your agent account', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#16233F"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for signing up. Your agent code is <b>${esc(code)}</b>. Our team will approve your account shortly, then you can sign in and log your guests and tenants.</p><p><a href="${SITE_URL}/agent-portal">Open the agent portal</a></p></div>`).catch(() => {})
  return NextResponse.json({ ok: true })
}
