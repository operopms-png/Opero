export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { alertTeam } from '@/lib/crm-lead'
import { ratesPerGBP } from '@/lib/currency'

// The signed-in agent's own portal data. Only their own agent record and referrals, never another agent's.
// GET → { agent, referrals }    POST { referral_type, channel, person_name, person_email, person_phone, property_label, start_date, end_date, value, notes }
const clean = (v: any, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
async function me(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', ''); if (!token) return null
  const { data: { user } } = await db.auth.getUser(token); if (!user) return null
  const { data } = await db.from('partner_agents').select('*').eq('portal_user_id', user.id).maybeSingle()
  return data
}
function commission(a: any, r: any) {
  if (r.commission_amount != null) return Number(r.commission_amount)
  const st = r.referral_type === 'short_term'
  const type = st ? a.st_rate_type : a.lt_rate_type, rate = Number(st ? a.st_rate : a.lt_rate) || 0
  return type === 'flat' ? rate : ((Number(r.value) || 0) * rate) / 100
}
export async function GET(req: NextRequest) {
  const a = await me(req); if (!a) return NextResponse.json({ error: 'No agent account found for this login.' }, { status: 404 })
  const { data: refs } = await db.from('agent_referrals').select('id,referral_type,channel,person_name,property_label,start_date,end_date,value,status,commission_amount,commission_status,created_at').eq('agent_id', a.id).order('created_at', { ascending: false })
  const referrals = (refs ?? []).map(r => ({ ...r, commission: commission(a, r) }))
  const { data: u } = await db.auth.admin.getUserById(a.user_id)
  return NextResponse.json({ agent: { name: a.name, code: a.code, status: a.status, st_rate_type: a.st_rate_type, st_rate: a.st_rate, lt_rate_type: a.lt_rate_type, lt_rate: a.lt_rate }, referrals, company: (u?.user?.user_metadata as any)?.company_name || '', rates: await ratesPerGBP() })
}
export async function POST(req: NextRequest) {
  const a = await me(req); if (!a) return NextResponse.json({ error: 'No agent account found for this login.' }, { status: 404 })
  if (a.status !== 'active') return NextResponse.json({ error: 'Your account is waiting for approval. You can log guests and tenants once it is approved.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const type = b.referral_type === 'long_term' ? 'long_term' : 'short_term'
  const name = clean(b.person_name, 120); if (!name) return NextResponse.json({ error: 'Please add the guest or tenant name.' }, { status: 400 })
  const val = b.value === '' || b.value == null ? null : Number(b.value)
  const { error } = await db.from('agent_referrals').insert({
    user_id: a.user_id, agent_id: a.id, referral_type: type, channel: type === 'short_term' ? (clean(b.channel, 20) || 'direct') : null,
    person_name: name, person_email: clean(b.person_email, 200) || null, person_phone: clean(b.person_phone, 40) || null,
    property_label: clean(b.property_label, 160) || null, start_date: clean(b.start_date, 10) || null, end_date: type === 'short_term' ? (clean(b.end_date, 10) || null) : null,
    value: val != null && isFinite(val) ? val : null, notes: clean(b.notes, 1000) || null,
  })
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  alertTeam(a.user_id, `Agent referral: ${name}`, `${a.name} (${a.code}) logged a ${type === 'short_term' ? 'guest' : 'tenant'}: ${name}.`, '/partners').catch(() => {})
  return NextResponse.json({ ok: true })
}
