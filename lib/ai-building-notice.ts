// Lets Novourq Cloud AI (Ask AI and Novourq Voice) draft a Building notice for tenants, landlords and partners.
// Notices go out to residents and owners (and are emailed), so this never posts by itself: it waits in Staff Centre → AI Approvals
// and is posted, and emailed if asked, only when a person approves it. Same result as Staff Centre → Maintenance Board → Building notices.
import { serviceClient as db } from '@/lib/admin-auth'
import { queueAiAction } from '@/lib/ai-approvals'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean; role?: string }

export async function proposeBuildingNotice(c: Who, input: { title: unknown; body: unknown; homes: unknown; building?: unknown; who?: unknown; email?: unknown; agentKey: string; via: string }): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!(c.isAdmin || /co founder|property management|vacation rental|development|upkeep/i.test(c.role || ''))) return { ok: false, error: 'Only staff can post building notices.' }
  const title = String(input.title || '').trim().slice(0, 140), body = String(input.body || '').trim().slice(0, 4000)
  if (!title || !body) return { ok: false, error: 'I need a heading and the notice text.' }
  const { data: props } = await db.from('pm_properties').select('id, name').eq('user_id', c.businessId).is('ended_at', null)
  const all = props ?? []
  const asked = String(input.homes || '').trim()
  let chosen: { id: string; name: string }[] = []
  if (/^all\b/i.test(asked)) chosen = all
  else {
    const parts = asked.split(/[;,\n]| and /i).map(s => s.trim().toLowerCase()).filter(Boolean)
    chosen = all.filter(p => parts.some(x => p.name.toLowerCase().includes(x) || x.includes(p.name.toLowerCase())))
  }
  if (!chosen.length) return { ok: false, error: `I could not match those homes (${asked || 'none given'}). Say the property names as they appear in Property Management, or "all".` }
  const w = String(input.who || 'all').toLowerCase()
  const for_tenants = w === 'all' || /tenant/.test(w), for_landlords = w === 'all' || /landlord|owner/.test(w), for_partners = w === 'all' || /partner/.test(w)
  const send_email = input.email !== false && String(input.email).toLowerCase() !== 'no'
  const audience = [for_tenants && 'tenants', for_landlords && 'landlords', for_partners && 'partners'].filter(Boolean).join(', ')
  const building = String(input.building || '').trim().slice(0, 120)
  const draft = `Heading: ${title}\n${building ? `Building: ${building}\n` : ''}Homes: ${chosen.map(p => p.name).join(', ')}\nVisible to: ${audience}\n${send_email ? 'They will also be emailed.' : 'No email.'}\n\n${body}`
  const q: any = await queueAiAction({
    userId: c.businessId, agentKey: input.agentKey, actionType: 'building_notice', title: `Building notice: ${title}`.slice(0, 140), draftBody: draft,
    payload: { title, body, building_name: building || null, property_ids: chosen.map(p => p.id), for_tenants, for_landlords, for_partners, send_email, created_by_name: c.name || c.email },
    reason: `${c.name || c.email} asked for this ${input.via}`,
  })
  if (q?.error) return { ok: false, error: q.error }
  if (q?.skipped) return { ok: false, error: String(q.skipped) }
  return { ok: true, summary: `"${title}" for ${chosen.length} home${chosen.length === 1 ? '' : 's'} (${audience})` }
}
