// Property map data (server only): every property and found deal with a status and a position.
// Positions are looked up once from the address (OpenStreetMap Nominatim) and saved on the record.
import { serviceClient as db } from '@/lib/admin-auth'

export type MapStatus = 'let' | 'vac' | 'arr' | 'cert' | 'deal'
export type MapItem = {
  id: string; source: 'pm' | 'estate' | 'str' | 'deal'; name: string; address: string; country: string
  lat: number | null; lng: number | null; status: MapStatus; facts: { label: string; value: string }[]; href: string; url?: string
}

const TABLE = { pm: 'pm_properties', estate: 'estate_properties', str: 'properties', deal: 'deal_matches' } as const
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
  const [pm, ea, st, leases, tenants, rent, comp, tenancies, deals] = await Promise.all([
    db.from('pm_properties').select('id,name,address,city,country,status,monthly_income,currency,lat,lng,geocoded_at').eq('user_id', businessId).limit(500),
    db.from('estate_properties').select('id,name,address,country,status,rent,currency,lat,lng,geocoded_at,pm_property_id').eq('user_id', businessId).limit(500),
    db.from('properties').select('id,name,address,city,country,status,lat,lng,geocoded_at').eq('user_id', businessId).limit(500),
    db.from('pm_leases').select('property_id,status,monthly_rent,end_date').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('pm_tenants').select('property_id,name,status').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('pm_rent_payments').select('property_id,amount,due_date,status').eq('user_id', businessId).ilike('status', 'overdue').limit(2000),
    db.from('pm_compliance').select('property_id,type,expiry_date').eq('user_id', businessId).lte('expiry_date', soon).limit(2000),
    db.from('estate_tenancies').select('property_id,status,end_date,rent').eq('user_id', businessId).ilike('status', 'active').limit(2000),
    db.from('deal_matches').select('id,title,address,price,currency,fit_score,url,status,lat,lng,geocoded_at').eq('user_id', businessId).neq('status', 'passed').limit(100),
  ])
  const by = <T extends { property_id: any }>(rows: T[] | null) => { const m = new Map<string, T[]>(); (rows ?? []).forEach(r => { const k = String(r.property_id); m.set(k, [...(m.get(k) ?? []), r]) }); return m }
  const lease = by(leases.data), ten = by(tenants.data), late = by(rent.data), cert = by(comp.data), etn = by(tenancies.data)
  const pmIds = new Set((pm.data ?? []).map(p => String(p.id)))
  const items: (MapItem & { _geo: boolean; _q: string })[] = []

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
    items.push({ id, source: 'pm', name: p.name || p.address || 'Property', address: [p.address, p.city].filter(Boolean).join(', '), country: p.country || '', lat: p.lat, lng: p.lng, status: s, facts: out.length ? out : [{ label: 'Status', value: s === 'vac' ? 'No active tenancy' : 'Let' }], href: '/pm?tab=Properties', _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.city, p.country].filter(Boolean).join(', ') })
  }
  for (const p of ea.data ?? []) {
    if (p.pm_property_id && pmIds.has(String(p.pm_property_id))) continue
    const id = String(p.id), occ = !!etn.get(id)?.length
    const { s, facts } = status(id, /rented|let|sold/i.test(p.status || ''), occ)
    const out: MapItem['facts'] = [...(p.rent ? [{ label: 'Rent', value: money(p.rent, p.currency) }] : []), ...facts]
    items.push({ id, source: 'estate', name: p.name || p.address || 'Property', address: p.address || '', country: p.country || '', lat: p.lat, lng: p.lng, status: s, facts: out.length ? out : [{ label: 'Status', value: p.status || '' }], href: '/estate?section=Properties', _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.country].filter(Boolean).join(', ') })
  }
  for (const p of st.data ?? []) {
    items.push({ id: String(p.id), source: 'str', name: p.name || p.address || 'Property', address: [p.address, p.city].filter(Boolean).join(', '), country: p.country || '', lat: p.lat, lng: p.lng, status: /rented|let|booked|occupied/i.test(p.status || '') ? 'let' : 'vac', facts: [{ label: 'Short stay', value: p.status || 'Available' }], href: '/str?tab=Properties', _geo: p.lat == null && !p.geocoded_at, _q: [p.address, p.city, p.country].filter(Boolean).join(', ') })
  }
  for (const d of deals.data ?? []) {
    items.push({ id: String(d.id), source: 'deal', name: d.title || d.address || 'Deal', address: d.address || '', country: '', lat: d.lat, lng: d.lng, status: 'deal', facts: [...(d.price ? [{ label: 'Asking price', value: money(d.price, d.currency) }] : []), ...(d.fit_score != null ? [{ label: 'Fit to your brief', value: `${d.fit_score}%` }] : []), { label: 'Source', value: 'Found by Novourq Cloud AI' }], href: '/staff-centre/ai-command-centre/deal-analyser', url: d.url || undefined, _geo: d.lat == null && !d.geocoded_at && !!d.address, _q: d.address || '' })
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
