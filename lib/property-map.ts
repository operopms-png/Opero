// Property map data (server only): every property and found deal with a status and a position.
// Positions are looked up once from the address (OpenStreetMap Nominatim) and saved on the record.
import { serviceClient as db } from '@/lib/admin-auth'

export type MapStatus = 'let' | 'vac' | 'arr' | 'cert' | 'deal' | 'plan'
export type MapItem = {
  id: string; source: 'pm' | 'estate' | 'str' | 'deal' | 'dev'; name: string; address: string; country: string
  lat: number | null; lng: number | null; status: MapStatus; facts: { label: string; value: string }[]; href: string; url?: string; building?: { source: 'pm' | 'estate' | 'dev'; id: string; name: string }
}

const TABLE = { pm: 'pm_properties', estate: 'estate_properties', str: 'properties', deal: 'deal_matches', dev: 'dev_projects' } as const
const money = (n: any, cur?: string | null) => (n == null || n === '' ? '' : `${cur === 'USD' ? '$' : cur === 'JMD' ? 'J$' : cur === 'AED' ? 'AED ' : '£'}${Number(n).toLocaleString('en-GB')}`)
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Novourq-PropertyMap/1.0' }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const d = await r.json()
    return d?.[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null
  } catch { return null }
}

export async function loadPropertyMap(businessId: string): Promise<{ items: MapItem[]; unplaced: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const [pm, ea, st, leases, tenants, rent, comp, tenancies, deals, pmU, eaU, pmB, eaB, devP, devU] = await Promise.all([
    db.from('pm_properties').select('id,name,address,city,country,status,monthly_income,currency,lat,lng,geocoded_at').eq('user_id', businessId).is('ended_at', null).limit(500),
    db.from('estate_properties').select('id,name,address,country,status,rent,currency,lat,lng,geocoded_at,pm_property_id').eq('user_id', businessId).is('ended_at', null).limit(500),
    db.from('properties').select('id,name,address,city,country,status,lat,lng,geocoded_at').eq('user_id', businessId).is('ended_at', null).limit(500),
    db.from('pm_leases').select('property_id,status,monthly_rent,end_date').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('pm_tenants').select('property_id,name,status').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('pm_rent_payments').select('property_id,amount,due_date,status').eq('user_id', businessId).ilike('status', 'overdue').limit(2000),
    db.from('pm_compliance').select('property_id,type,expiry_date').eq('user_id', businessId).lte('expiry_date', soon).limit(2000),
    db.from('estate_tenancies').select('property_id,status,end_date,rent').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('deal_matches').select('id,title,address,price,currency,fit_score,url,status,lat,lng,geocoded_at').eq('user_id', businessId).neq('status', 'passed').limit(100),
    db.from('pm_units').select('property_id,building_id').eq('user_id', businessId).not('building_id', 'is', null).limit(3000),
    db.from('estate_units').select('property_id,building_id').eq('user_id', businessId).not('building_id', 'is', null).limit(3000),
    db.from('pm_buildings').select('id,name').eq('user_id', businessId).limit(500),
    db.from('estate_buildings').select('id,name').eq('user_id', businessId).limit(500),
    db.from('dev_projects').select('id,name,location,status,total_budget,lat,lng,geocoded_at').eq('user_id', businessId).limit(200),
    db.from('dev_units').select('project_id,status').eq('user_id', businessId).limit(5000),
  ])
  const by = <T extends { property_id: any }>(rows: T[] | null) => { const m = new Map<string, T[]>(); (rows ?? []).forEach(r => { const k = String(r.property_id); m.set(k, [...(m.get(k) ?? []), r]) }); return m }
  const lease = by(leases.data), ten = by(tenants.data), late = by(rent.data), cert = by(comp.data), etn = by(tenancies.data)
  const pmIds = new Set((pm.data ?? []).map(p => String(p.id)))
  const items: (MapItem & { _geo: boolean; _q: string })[] = []
  // Which building (if any) a property's units sit in, so the map can open its floor view
  const link = (units: any[] | null, blds: any[] | null, source: 'pm' | 'estate') => {
    const nm = new Map((blds ?? []).map(b => [String(b.id), String(b.name || 'Building')]))
    const m = new Map<string, MapItem['building']>()
    for (const u of units ?? []) if (u.property_id && u.building_id && !m.has(String(u.property_id))) m.set(String(u.property_id), { source, id: String(u.building_id), name: nm.get(String(u.building_id)) || 'Building' })
    return m
  }
  const pmBld = link(pmU.data, pmB.data, 'pm'), eaBld = link(eaU.data, eaB.data, 'estate')

  const status = (id: string, saysLet: boolean, occupied: boolean): { s: MapStatus; facts: MapItem['facts'] } => {
    const facts: MapItem['facts'] = []
    const l = late.get(id), c = cert.get(id)
    if (l?.length) facts.push({ label: 'Rent overdue', value: `${l.length} payment${l.length === 1 ? '' : 's'}, ${money(l.reduce((n, x: any) => n + Number(x.amount || 0), 0))}` })
    if (c?.length) {
      const x: any = c.sort((a: any, b: any) => String(a.expiry_date).localeCompare(String(b.expiry_date)))[0]
      facts.push({ label: 'Certificate', value: `${x.type || 'Certificate'} ${x.expiry_date < today ? 'expired' : 'due'} ${day(x.expiry_date)}` })
    }
    return { s: l?.length ? 'arr' : c?.length ? 'cert' : (saysLet || occupied) ? 'let' : 'vac', facts }
  }

  for (const p of pm.data ?? []) {
    const id = String(p.id), occ = !!lease.get(id)?.length || !!ten.get(id)?.length
    const { s, facts } = status(id, /rented|let|occupied/i.test(p.status || ''), occ)
    const t = ten.get(id)?.[0] as any
    const out: MapItem['facts'] = [...(t?.name ? [{ label: 'Tenant', value: t.name }] : []), ...(p.monthly_income ? [{ label: 'Rent', value: money(p.monthly_income, p.currency) }] : []), ...facts]
    items.push({ id, source: 'pm', name: p.name || p.address || 'Property', address: [p.address, p.city].filter(Boolean).join(', '), country: p.country || '', lat: p.lat, lng: p.lng, status: s, facts: out.length ? out : [{ label: 'Status', value: s === 'vac' ? 'No active tenancy' : 'Let' }], href: '/pm?tab=Properties', building: pmBld.get(id), _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.city, p.country].filter(Boolean).join(', ') })
  }
  for (const p of ea.data ?? []) {
    if (p.pm_property_id && pmIds.has(String(p.pm_property_id))) continue
    const id = String(p.id), occ = !!etn.get(id)?.length
    const { s, facts } = status(id, /rented|let|sold/i.test(p.status || ''), occ)
    const out: MapItem['facts'] = [...(p.rent ? [{ label: 'Rent', value: money(p.rent, p.currency) }] : []), ...facts]
    items.push({ id, source: 'estate', name: p.name || p.address || 'Property', address: p.address || '', country: p.country || '', lat: p.lat, lng: p.lng, status: s, facts: out.length ? out : [{ label: 'Status', value: p.status || '' }], href: '/estate?section=Properties', building: eaBld.get(id), _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.country].filter(Boolean).join(', ') })
  }
  for (const p of st.data ?? []) {
    items.push({ id: String(p.id), source: 'str', name: p.name || p.address || 'Property', address: [p.address, p.city].filter(Boolean).join(', '), country: p.country || '', lat: p.lat, lng: p.lng, status: /rented|let|booked|occupied/i.test(p.status || '') ? 'let' : 'vac', facts: [{ label: 'Short stay', value: p.status || 'Available' }], href: '/str?tab=Properties', _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.city, p.country].filter(Boolean).join(', ') })
  }
  for (const d of deals.data ?? []) {
    items.push({ id: String(d.id), source: 'deal', name: d.title || d.address || 'Deal', address: d.address || '', country: '', lat: d.lat, lng: d.lng, status: 'deal', facts: [...(d.price ? [{ label: 'Asking price', value: money(d.price, d.currency) }] : []), ...(d.fit_score != null ? [{ label: 'Fit to your brief', value: `${d.fit_score}%` }] : []), { label: 'Source', value: 'Found by Novourq Cloud AI' }], href: '/staff-centre/ai-command-centre/deal-analyser', url: d.url || undefined, _geo: d.lat == null && !d.geocoded_at && !!d.address, _q: d.address || '' })
  }

  // Development projects: planned and in-build schemes, so they can be shown off before they exist
  const countryOf = (lat: number | null, lng: number | null, text: string) => {
    if (lat != null && lng != null) { if (lat > 17 && lat < 19 && lng > -79 && lng < -76) return 'Jamaica'; if (lat > 49 && lat < 61 && lng > -9 && lng < 2.5) return 'United Kingdom' }
    return /jamaica|kingston|porus|manchester, jam|st\.? (ann|james|catherine|elizabeth|mary|andrew|thomas)|montego|mandeville|ocho rios|negril/i.test(text) ? 'Jamaica' : /united kingdom|\buk\b|england|london|leeds|birmingham|manchester|liverpool|scotland|wales/i.test(text) ? 'United Kingdom' : ''
  }
  const devCount = new Map<string, { n: number; avail: number }>()
  for (const u of devU.data ?? []) { const k = String(u.project_id); const c = devCount.get(k) ?? { n: 0, avail: 0 }; c.n++; if (/available/i.test(u.status || '')) c.avail++; devCount.set(k, c) }
  for (const p of devP.data ?? []) {
    const id = String(p.id), c = devCount.get(id)
    const stage = ({ planning: 'Planning', active: 'Under construction', on_hold: 'On hold' } as Record<string, string>)[String(p.status)] || String(p.status || 'Planned')
    items.push({ id, source: 'dev', name: p.name || 'Development', address: p.location || '', country: countryOf(p.lat, p.lng, p.location || ''), lat: p.lat, lng: p.lng, status: 'plan', facts: [{ label: 'Stage', value: stage }, ...(c ? [{ label: 'Units', value: `${c.avail} available of ${c.n}` }] : []), ...(p.total_budget ? [{ label: 'Budget', value: money(p.total_budget) }] : [])], href: '/dev', building: { source: 'dev', id, name: p.name || 'Development' }, _geo: p.lat == null && !p.geocoded_at && !!p.location, _q: p.location || '' })
  }

  // Look up a few missing positions per visit (OpenStreetMap allows about one a second); the rest fill in on later visits.
  let n = 0
  for (const it of items) {
    if (!it._geo || !it._q || n >= 6) continue
    if (n++) await new Promise(r => setTimeout(r, 1100))
    const g = await geocode(it._q)
    await db.from(TABLE[it.source]).update(g ? { lat: g.lat, lng: g.lng, geocoded_at: new Date().toISOString() } : { geocoded_at: new Date().toISOString() }).eq('id', it.id)
    if (g) { it.lat = g.lat; it.lng = g.lng }
  }
  const out = items.map(({ _geo, _q, ...rest }) => rest)
  return { items: out, unplaced: out.filter(i => i.lat == null || i.lng == null).length }
}

// ---------- floor-by-floor view of one building ----------
export type FloorUnit = { id: string; unit: string; status: 'let' | 'vac' | 'arr' | 'avail' | 'res' | 'sold'; rent: string; tenant: string; detail: string; planUrl?: string | null; layout?: any }
export type FloorData = { name: string; address: string; floors: { floor: number | null; units: FloorUnit[] }[]; totals: Record<string, number>; certs: string[] }

// Floor from the saved floor, else from the unit number: "3B" is floor 3, "204" is floor 2.
export function floorOf(unit: string, saved?: any): number | null {
  if (saved != null && saved !== '' && !isNaN(Number(saved))) return Number(saved)
  const m = String(unit).trim().match(/^(?:flat|unit|apt|apartment)?\s*(\d+)\s*([a-z])?$/i)
  if (!m) return null
  const n = Number(m[1])
  if (m[2]) return n
  return n >= 100 ? Math.floor(n / 100) : null
}

export async function loadBuildingFloors(businessId: string, source: 'pm' | 'estate' | 'dev', buildingId: string): Promise<FloorData | null> {
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  let b: any = null
  if (source === 'dev') {
    const { data } = await db.from('dev_projects').select('id,name,location').eq('id', buildingId).eq('user_id', businessId).maybeSingle()
    b = data && { id: data.id, name: data.name, address: data.location }
  } else {
    const { data } = await db.from(source === 'pm' ? 'pm_buildings' : 'estate_buildings').select('id,name,address').eq('id', buildingId).eq('user_id', businessId).maybeSingle()
    b = data
  }
  if (!b) return null
  const units: FloorUnit[] & any[] = []
  let propIds: string[] = []
  if (source === 'dev') {
    const { data: us } = await db.from('dev_units').select('id,unit_number,unit_type,size_sqft,status,price,buyer_name,floor,plan_url,layout').eq('project_id', buildingId).eq('user_id', businessId).limit(1000)
    for (const u of us ?? []) {
      const st: FloorUnit['status'] = /complet|sold/i.test(u.status || '') ? 'sold' : /reserv|exchang/i.test(u.status || '') ? 'res' : 'avail'
      units.push({ id: u.id, unit: u.unit_number || '?', _f: floorOf(u.unit_number, u.floor), status: st, rent: u.price ? Number(u.price).toLocaleString('en-GB') : '', tenant: u.buyer_name || '', planUrl: u.plan_url, layout: u.layout, detail: [u.unit_type, u.size_sqft ? `${Number(u.size_sqft).toLocaleString('en-GB')} sq ft` : '', u.status].filter(Boolean).join(', ') })
    }
    var certs: string[] = []
  } else if (source === 'pm') {
    const { data: us } = await db.from('pm_units').select('id,property_id,unit_number,tenant_id,monthly_rent,status,floor,plan_url,layout').eq('building_id', buildingId).eq('user_id', businessId).limit(1000)
    propIds = [...new Set((us ?? []).map(u => String(u.property_id)))]
    const ids = (us ?? []).map(u => u.id)
    const [t, l, r, c] = await Promise.all([
      db.from('pm_tenants').select('id,name').eq('user_id', businessId).limit(3000),
      ids.length ? db.from('pm_leases').select('unit_id,end_date').in('unit_id', ids).ilike('status', 'active') : Promise.resolve({ data: [] as any[] }),
      ids.length ? db.from('pm_rent_payments').select('unit_id,amount').in('unit_id', ids).ilike('status', 'overdue') : Promise.resolve({ data: [] as any[] }),
      propIds.length ? db.from('pm_compliance').select('type,expiry_date').in('property_id', propIds).lte('expiry_date', soon) : Promise.resolve({ data: [] as any[] }),
    ])
    const name = new Map((t.data ?? []).map((x: any) => [x.id, x.name]))
    const lease = new Map((l.data ?? []).map((x: any) => [x.unit_id, x]))
    const late = new Map<string, number>(); (r.data ?? []).forEach((x: any) => late.set(x.unit_id, (late.get(x.unit_id) ?? 0) + Number(x.amount || 0)))
    for (const u of us ?? []) {
      const lateAmt = late.get(u.id)
      const occ = !!u.tenant_id || lease.has(u.id) || /rented|occupied|let/i.test(u.status || '')
      const ld: any = lease.get(u.id)
      units.push({ id: u.id, unit: u.unit_number || '?', _f: floorOf(u.unit_number, u.floor), status: lateAmt ? 'arr' : occ ? 'let' : 'vac', rent: u.monthly_rent ? `£${Number(u.monthly_rent).toLocaleString('en-GB')}` : '', tenant: (u.tenant_id && name.get(u.tenant_id)) || '', planUrl: u.plan_url, layout: u.layout, detail: lateAmt ? `Rent overdue, £${lateAmt.toLocaleString('en-GB')}` : occ ? (ld?.end_date ? `Lease to ${new Date(ld.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Let') : 'No active tenancy' })
    }
    var certs = (c.data ?? []).map((x: any) => `${x.type || 'Certificate'} ${x.expiry_date < today ? 'expired' : 'due'} ${new Date(x.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)
  } else {
    const { data: us } = await db.from('estate_units').select('id,property_id,unit_number,floor,status,plan_url,layout').eq('building_id', buildingId).eq('user_id', businessId).limit(1000)
    propIds = [...new Set((us ?? []).map(u => String(u.property_id)).filter(Boolean))]
    const [tn, c] = await Promise.all([
      propIds.length ? db.from('estate_tenancies').select('property_id').in('property_id', propIds).ilike('status', 'active') : Promise.resolve({ data: [] as any[] }),
      propIds.length ? db.from('pm_compliance').select('type,expiry_date').in('property_id', propIds).lte('expiry_date', soon) : Promise.resolve({ data: [] as any[] }),
    ])
    const let_ = new Set((tn.data ?? []).map((x: any) => String(x.property_id)))
    for (const u of us ?? []) {
      const occ = /rented|occupied|let/i.test(u.status || '') || let_.has(String(u.property_id))
      units.push({ id: u.id, unit: u.unit_number || '?', _f: floorOf(u.unit_number, u.floor), status: occ ? 'let' : 'vac', rent: '', tenant: '', detail: occ ? 'Let' : (u.status || 'Available'), planUrl: u.plan_url, layout: u.layout })
    }
    var certs = (c.data ?? []).map((x: any) => `${x.type || 'Certificate'} ${x.expiry_date < today ? 'expired' : 'due'} ${new Date(x.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)
  }
  const byFloor = new Map<number | null, FloorUnit[]>()
  const totals: Record<string, number> = { let: 0, vac: 0, arr: 0, avail: 0, res: 0, sold: 0 }
  for (const u of units) {
    const { _f, ...rest } = u as any
    totals[rest.status]++
    byFloor.set(_f, [...(byFloor.get(_f) ?? []), rest])
  }
  const floors = [...byFloor.entries()].map(([floor, us]) => ({ floor, units: us.sort((a, z) => a.unit.localeCompare(z.unit, undefined, { numeric: true })) }))
    .sort((a, z) => (z.floor ?? -99) - (a.floor ?? -99))
  return { name: b.name || 'Building', address: b.address || '', floors, totals, certs: [...new Set(certs)] }
}
