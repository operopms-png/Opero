// Lets Novourq Cloud AI (Ask AI) see the Road to 100 numbers, change the goal and mark a Client Properties row Signed.
// Same result as Staff Centre → Dashboard → Road to 100 → Edit goal, and Staff Centre → Client Properties → open the property → Signed.
import { serviceClient as db } from '@/lib/admin-auth'
import { buildRoad, DEFAULT_DEADLINE } from '@/lib/road-to-100'
import { managedHomes, signedProps } from '@/lib/road-data'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean; role?: string }
const can = (c: Who) => c.isAdmin || /co founder/i.test(c.role || '')

export async function roadSummary(biz: string): Promise<string> {
  const [{ data: g }, { data: leads }, sp, managed] = await Promise.all([
    db.from('growth_goal').select('*').eq('business_id', biz).maybeSingle(),
    db.from('landlord_estimates').select('status,created_at,updated_at').eq('business_id', biz).limit(5000),
    signedProps(biz), managedHomes(biz),
  ])
  const r = buildRoad({ title: g?.title || 'Road to 100 properties', target: g?.target ?? 100, deadline: g?.deadline ?? DEFAULT_DEADLINE, baseline: g?.baseline ?? 0 }, leads || [], { ...sp, managed })
  return `## Road to 100 (Staff Centre → Dashboard → Road to 100)\nGoal ${r.goal.target} properties by ${r.goal.deadline}. Now ${r.current} (${r.managed} managed in Property Management/Estate Agency + ${r.goal.baseline} extra + ${r.signed} signed). Still to sign ${r.remaining}; needed per month ${r.neededPerMonth ?? 'n/a'}; signed last 30 days ${r.signedLast30}; new owner leads last 30 days ${r.leadsLast30}; ${r.pipeline} open in Client Properties. Pace: ${r.state}.`
}

export async function updateRoadGoal(c: Who, i: { target?: unknown; deadline?: unknown; extra?: unknown }): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!can(c)) return { ok: false, error: 'Only admins and co-founders can change the Road to 100 goal.' }
  const patch: any = { updated_at: new Date().toISOString() }
  if (i.target) { const n = Math.round(Number(i.target)); if (!(n > 0 && n <= 100000)) return { ok: false, error: 'The target must be a number above 0.' }; patch.target = n }
  if (i.deadline) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(i.deadline))) return { ok: false, error: 'The date must look like 2027-06-01.' }; patch.deadline = String(i.deadline) }
  if (i.extra !== undefined && i.extra !== '') { const n = Math.round(Number(i.extra)); if (!(n >= 0 && n <= 100000)) return { ok: false, error: 'Extra homes must be 0 or more.' }; patch.baseline = n }
  if (Object.keys(patch).length === 1) return { ok: false, error: 'Tell me the new target, date or extra homes.' }
  const { data: ex } = await db.from('growth_goal').select('business_id').eq('business_id', c.businessId).maybeSingle()
  const { error } = ex ? await db.from('growth_goal').update(patch).eq('business_id', c.businessId) : await db.from('growth_goal').insert({ business_id: c.businessId, deadline: DEFAULT_DEADLINE, ...patch })
  if (error) return { ok: false, error: error.message }
  return { ok: true, summary: [patch.target && `target ${patch.target}`, patch.deadline && `date ${patch.deadline}`, patch.baseline !== undefined && `extra homes ${patch.baseline}`].filter(Boolean).join(', ') }
}

export async function markPropertySigned(c: Who, property: unknown): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!can(c)) return { ok: false, error: 'Only admins and co-founders can mark a property signed.' }
  const q = String(property || '').trim().replace(/[%_,()]/g, ' ').slice(0, 100).trim()
  if (!q) return { ok: false, error: 'Tell me which property (its address in Client Properties).' }
  const { data } = await db.from('client_properties').select('id,address,stage,owner_name').eq('business_id', c.businessId).ilike('address', `%${q}%`).limit(5)
  const rows = data || []
  if (!rows.length) return { ok: false, error: `I could not find "${q}" in Client Properties.` }
  if (rows.length > 1) return { ok: false, error: `More than one property matches "${q}" (${rows.map(r => r.address).join('; ')}). Which one?` }
  const p = rows[0]
  if (p.stage === 'signed') return { ok: true, summary: `${p.address} was already Signed` }
  const { error } = await db.from('client_properties').update({ stage: 'signed', signed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', p.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, summary: `${p.address} is now Signed (it was ${p.stage})` }
}
