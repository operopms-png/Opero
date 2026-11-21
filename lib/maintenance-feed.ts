// One maintenance record for everyone. A repair reported by a tenant (Property Management or Estate Agency) shows in the
// tenant's, the landlord's and every linked partner's Maintenance tab with its stages, the fix notes and (partners only) invoices.
// A linked property is the same home in both modules (pm_properties.estate_property_id / estate_properties.pm_property_id),
// so every view reads both lists and nothing has to be copied between them.
// Server only.
import { serviceClient as db } from '@/lib/admin-auth'

export type Role = 'tenant' | 'landlord' | 'partner'
export type Issue = {
  key: string; source: 'pm' | 'estate'; id: string; property_id: string; property_name: string
  title: string; description: string | null; priority: string | null; status: 'open' | 'in_progress' | 'resolved'
  created_at: string; in_progress_at: string | null; resolved_at: string | null
  resolution_notes: string | null; cost: number | null; currency: string | null
  photos: string[]; before_media: string | null; after_media: string | null
  invoices: { id: string; file_url: string; file_name: string | null; amount: number | null; currency: string | null; note: string | null; created_at: string }[]
}
type Pair = { pm: string | null; estate: string | null; since: string | null; name: string; currency: string | null }

const stage = (s: any): Issue['status'] => {
  const v = String(s ?? '').toLowerCase().replace(/\s+/g, '_')
  return v === 'resolved' || v === 'closed' ? 'resolved' : v === 'in_progress' ? 'in_progress' : 'open'
}

// Turns property ids from either module into pairs (the same home in both modules counts once).
async function pairsFor(businessId: string, pmIds: string[], estateIds: string[], since: Record<string, string> = {}): Promise<Pair[]> {
  const out = new Map<string, Pair>()
  if (pmIds.length) {
    const { data } = await db.from('pm_properties').select('id, name, currency, estate_property_id').in('id', pmIds).eq('user_id', businessId)
    for (const p of data ?? []) out.set(p.id, { pm: p.id, estate: p.estate_property_id ?? null, since: since[p.id] ?? null, name: p.name, currency: p.currency ?? null })
  }
  if (estateIds.length) {
    const { data } = await db.from('estate_properties').select('id, name, currency, pm_property_id').in('id', estateIds).eq('user_id', businessId)
    for (const e of data ?? []) {
      const known = [...out.values()].find(p => p.estate === e.id || (e.pm_property_id && p.pm === e.pm_property_id))
      if (known) { known.estate = known.estate ?? e.id; continue }
      out.set(e.id, { pm: e.pm_property_id ?? null, estate: e.id, since: null, name: e.name, currency: e.currency ?? null })
    }
  }
  return [...out.values()]
}

export type Viewer = { role: Role; businessId: string; pairs: Pair[]; name: string }

// Works out whose Maintenance tab this is and which homes it covers. `target` is set when staff preview a person's portal.
export async function viewerFor(role: Role, who: { uid?: string; target?: string; businessId?: string }): Promise<Viewer | null> {
  const byId = !!who.target
  const scope = (q: any, col: string) => byId ? q.eq('id', who.target).eq('user_id', who.businessId!) : q.eq(col, who.uid!)
  if (role === 'tenant') {
    const [pm, es] = await Promise.all([
      (byId ? db.from('pm_tenants').select('id, name, user_id, property_id').eq('id', who.target!).eq('user_id', who.businessId!) : db.from('pm_tenants').select('id, name, user_id, property_id').eq('portal_user_id', who.uid!)).maybeSingle(),
      (byId ? db.from('estate_tenants').select('id, name, user_id, property_id').eq('id', who.target!).eq('user_id', who.businessId!) : db.from('estate_tenants').select('id, name, user_id, property_id').eq('portal_user_id', who.uid!)).maybeSingle(),
    ])
    const t: any = pm.data ?? es.data; if (!t) return null
    const pairs = await pairsFor(t.user_id, pm.data?.property_id ? [pm.data.property_id] : [], es.data?.property_id ? [es.data.property_id] : [])
    return { role, businessId: t.user_id, pairs, name: t.name }
  }
  if (role === 'landlord') {
    const [pm, es] = await Promise.all([
      scope(db.from('pm_landlords').select('id, name, user_id'), 'portal_user_id').maybeSingle(),
      scope(db.from('estate_landlords').select('id, name, user_id'), 'portal_user_id').maybeSingle(),
    ])
    const l: any = pm.data ?? es.data; if (!l) return null
    const [pp, ep] = await Promise.all([
      pm.data ? db.from('pm_properties').select('id').eq('owner_id', pm.data.id).eq('user_id', l.user_id).is('ended_at', null) : Promise.resolve({ data: [] as any[] }),
      es.data ? db.from('estate_properties').select('id').eq('owner_id', es.data.id).eq('user_id', l.user_id).is('ended_at', null) : Promise.resolve({ data: [] as any[] }),
    ])
    const pairs = await pairsFor(l.user_id, (pp.data ?? []).map((x: any) => x.id), (ep.data ?? []).map((x: any) => x.id))
    return { role, businessId: l.user_id, pairs, name: l.name }
  }
  const { data: o } = await (byId ? db.from('owner_profiles').select('id, name, business_id, pm_property_ids, pm_property_since').eq('id', who.target!).eq('business_id', who.businessId!) : db.from('owner_profiles').select('id, name, business_id, pm_property_ids, pm_property_since').eq('user_id', who.uid!)).maybeSingle()
  if (!o) return null
  const pairs = await pairsFor(o.business_id, o.pm_property_ids ?? [], [], (o.pm_property_since ?? {}) as Record<string, string>)
  return { role: 'partner', businessId: o.business_id, pairs, name: o.name }
}

// Everything this person may see. Partners only get issues reported on or after the date they were linked to that home.
export async function issuesFor(v: Viewer): Promise<Issue[]> {
  const pmIds = v.pairs.map(p => p.pm).filter(Boolean) as string[], esIds = v.pairs.map(p => p.estate).filter(Boolean) as string[]
  if (!pmIds.length && !esIds.length) return []
  const [pm, es] = await Promise.all([
    pmIds.length ? db.from('pm_maintenance').select('*').in('property_id', pmIds).order('created_at', { ascending: false }).limit(200) : Promise.resolve({ data: [] as any[] }),
    esIds.length ? db.from('estate_maintenance').select('*').in('property_id', esIds).order('created_at', { ascending: false }).limit(200) : Promise.resolve({ data: [] as any[] }),
  ])
  const pairOf = (src: 'pm' | 'estate', pid: string) => v.pairs.find(p => p[src] === pid)
  const rows: Issue[] = []
  const add = (src: 'pm' | 'estate', list: any[]) => {
    for (const m of list) {
      const pr = pairOf(src, m.property_id); if (!pr) continue
      if (v.role === 'partner' && pr.since && String(m.created_at).slice(0, 10) < pr.since) continue
      const showMoney = v.role !== 'tenant'
      rows.push({
        key: `${src}:${m.id}`, source: src, id: m.id, property_id: m.property_id, property_name: pr.name,
        title: m.title, description: m.description ?? null, priority: m.priority ?? null, status: stage(m.status),
        created_at: m.created_at, in_progress_at: m.in_progress_at ?? null, resolved_at: m.resolved_at ?? null,
        resolution_notes: m.resolution_notes ?? null, cost: showMoney && m.cost != null ? Number(m.cost) : null, currency: pr.currency,
        photos: Array.isArray(m.photos) ? m.photos : [], before_media: m.before_media ?? null, after_media: m.after_media ?? null, invoices: [],
      })
    }
  }
  add('pm', pm.data ?? []); add('estate', es.data ?? [])
  if (v.role === 'partner' && rows.length) {
    const { data: inv } = await db.from('maintenance_invoices').select('id, source, maintenance_id, file_url, file_name, amount, currency, note, created_at').eq('business_id', v.businessId).eq('show_partner', true).in('maintenance_id', rows.map(r => r.id)).order('created_at')
    for (const i of inv ?? []) rows.find(r => r.id === i.maintenance_id && r.source === i.source)?.invoices.push(i as any)
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
