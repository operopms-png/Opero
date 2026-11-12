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
// Agents never see the commission rates. They only see an amount once staff have set it on that referral.
const commission = (r: any) => (r.commission_amount != null ? Number(r.commission_amount) : null)
export async function GET(req: NextRequest) {
  const a = await me(req); if (!a) return NextResponse.json({ error: 'No agent account found for this login.' }, { status: 404 })
  const { data: refs } = await db.from('agent_referrals').select('id,referral_type,channel,person_name,property_label,start_date,end_date,status,commission_amount,commission_status,created_at').eq('agent_id', a.id).order('created_at', { ascending: false })
  const referrals = (refs ?? []).map(r => ({ ...r, commission: commission(r) }))
  const { data: u } = await db.auth.admin.getUserById(a.user_id)
  // Leaderboard: every active agent of this company ranked by confirmed commission. Others show as first name and initial,
  // and only a relative bar is shared, never anyone's amounts.
  const { data: peers } = await db.from('partner_agents').select('id,name').eq('user_id', a.user_id).eq('status', 'active')
  const { data: peerRefs } = await db.from('agent_referrals').select('agent_id,commission_amount,commission_status').eq('user_id', a.user_id).in('commission_status', ['paid', 'payable', 'pending'])
  const tot: Record<string, number> = {}
  for (const r of peerRefs ?? []) tot[r.agent_id] = (tot[r.agent_id] || 0) + (Number(r.commission_amount) || 0)
  const nice = (n: string) => { const p = n.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); return p.length > 1 ? `${p[0]} ${p[p.length - 1].charAt(0)}.` : p[0] }
  const ranked = (peers ?? []).map(x => ({ id: x.id, name: nice(x.name), t: tot[x.id] || 0 })).sort((x, y) => y.t - x.t)
  const top = ranked[0]?.t || 0
  const leaderboard = ranked.slice(0, 10).map((x, i) => ({ rank: i + 1, name: x.name, me: x.id === a.id, pct: top ? Math.round((x.t / top) * 100) : 0 }))
  const myRank = ranked.findIndex(x => x.id === a.id) + 1
  return NextResponse.json({ leaderboard, myRank, agentCount: ranked.length, agent: { name: a.name, code: a.code, status: a.status }, referrals, company: (u?.user?.user_metadata as any)?.company_name || '', rates: await ratesPerGBP() })
}
export async function POST(req: NextRequest) {
  const a = await me(req); if (!a) return NextResponse.json({ error: 'No agent account found for this login.' }, { status: 404 })
  if (a.status !== 'active') return NextResponse.json({ error: 'Your account is waiting for approval. You can log guests and tenants once it is approved.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const type = ['long_term', 'property'].includes(b.referral_type) ? b.referral_type : 'short_term'
  const name = clean(b.person_name, 120); if (!name) return NextResponse.json({ error: 'Please add the guest or tenant name.' }, { status: 400 })
  const val = b.value === '' || b.value == null ? null : Number(b.value)
  const { error } = await db.from('agent_referrals').insert({
    user_id: a.user_id, agent_id: a.id, referral_type: type, channel: type === 'short_term' ? (clean(b.channel, 20) || 'direct') : null,
    person_name: name, person_email: clean(b.person_email, 200) || null, person_phone: clean(b.person_phone, 40) || null,
    property_label: clean(b.property_label, 160) || null, start_date: clean(b.start_date, 10) || null, end_date: type === 'short_term' ? (clean(b.end_date, 10) || null) : null,
    value: val != null && isFinite(val) ? val : null, notes: clean(b.notes, 1000) || null,
  })
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  alertTeam(a.user_id, `Agent referral: ${name}`, `${a.name} (${a.code}) logged a ${type === 'short_term' ? 'guest' : type === 'property' ? 'property to lease' : 'renter'}: ${name}.`, '/partners').catch(() => {})
  return NextResponse.json({ ok: true })
}
