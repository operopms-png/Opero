// Dashboard → Market intelligence panels (Quick Insights, My Watchlist, Top Locations by Rental Yield,
// Featured Property Analysis). Pure functions: they turn the company's own saved deals and watchlist into
// what the panels show. Nothing here is invented; with no usable figures a panel stays empty.
// The EXAMPLE data at the bottom is only shown when someone presses "Preview example" on the Dashboard.

export type Tone = 'up' | 'info' | 'flat' | 'warn'
export type Insight = { tone: Tone; text: string }
export type WatchRow = { id: string; name: string; sub: string; yield: number | null; photo?: string | null }
export type LocRow = { name: string; yield: number; change: number | null; n: number }
export type LocGroup = { tab: string; rows: LocRow[] }
export type Featured = { name: string; beds: number | null; baths: number | null; sqft: number | null; price: number; rent: number; yield: number; cur: string; photo?: string | null }
export type Intel = { watch: WatchRow[]; watchTotal: number; groups: LocGroup[]; featured: Featured | null; facts: Facts }
export type Facts = {
  savedDeals: number; dealsWithYield: number; newThisMonth: number; watchlist: number
  byStrategy: Record<string, number>
  areas: { area: string; deals: number; medianMonthlyRent: number | null; avgYield: number | null }[]
  best: { name: string; yield: number } | null
}

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: 'US$' }
export const fmtMoney = (v: number | null | undefined, cur = 'GBP') => v == null || !Number.isFinite(v) ? '—' : (SYM[cur] ?? '') + Math.round(v).toLocaleString('en-GB')
const num = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0 }
const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const avg = (a: number[]) => a.length ? a.reduce((t, x) => t + x, 0) / a.length : null

// Gross yield of a saved Deal Analyser result: the stored figure, or yearly rent over price. Rent-to-rent deals have no purchase price, so no yield.
export function dealYield(d: any): number | null {
  const x = d?.data || {}
  const stored = Number(x.grossYield)
  if (Number.isFinite(stored) && stored > 0 && stored < 40) return stored
  const price = num(x.price), rent = num(x.rent) || num(x.totalRent)
  if (price && rent) { const y = rent * 12 / price * 100; return y < 40 ? y : null }
  return null
}
const place = (address: string) => {
  const seg = String(address || '').split(',').map(s => s.trim()).filter(Boolean)
  return { locality: seg.length >= 3 ? seg[seg.length - 2] : (seg[0] || 'Unknown'), area: seg.length >= 2 ? seg[seg.length - 1] : 'Other' }
}
const monthKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')

export function buildIntel(deals: any[], watch: any[], now = new Date()): Intel {
  const thisM = monthKey(now), prevM = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const rows = deals.map(d => {
    const x = d.data || {}, p = place(d.address || x.address || '')
    return { d, x, y: dealYield(d), area: String(x.listing?.area || p.area), locality: String(x.listing?.subarea || p.locality), month: String(d.created_at || '').slice(0, 7), rent: num(x.rent) || num(x.totalRent), cur: String(x.currency || 'GBP') }
  })
  const withY = rows.filter(r => r.y != null)

  // Top locations: tabs are the areas with the most yielded deals; rows are localities inside them
  const areas = new Map<string, typeof rows>()
  for (const r of withY) areas.set(r.area, [...(areas.get(r.area) ?? []), r])
  const groups: LocGroup[] = [...areas.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([tab, rs]) => {
    const loc = new Map<string, typeof rows>()
    for (const r of rs) loc.set(r.locality, [...(loc.get(r.locality) ?? []), r])
    return {
      tab,
      rows: [...loc.entries()].map(([name, l]) => {
        const now_ = avg(l.filter(r => r.month === thisM).map(r => r.y as number)), was = avg(l.filter(r => r.month === prevM).map(r => r.y as number))
        return { name, yield: avg(l.map(r => r.y as number)) as number, change: now_ != null && was != null ? now_ - was : null, n: l.length }
      }).sort((a, b) => b.yield - a.yield).slice(0, 5),
    }
  })

  // Featured: the saved deal with the best yield
  const top = [...withY].sort((a, b) => (b.y as number) - (a.y as number))[0]
  let featured: Featured | null = null
  if (top) {
    const price = num(top.x.price), rent = top.rent || (price ? (top.y as number) * price / 1200 : 0)
    if (price && rent) featured = { name: String(top.d.address || 'Saved deal'), beds: num(top.x.bedrooms) || null, baths: num(top.x.bathrooms) || null, sqft: num(top.x.listing?.sqft) || null, price, rent, yield: top.y as number, cur: top.cur, photo: top.x.listing?.photos?.[0] || null }
  }

  // Watchlist, enriched from a saved deal at the same address when there is one
  const byAddr = new Map(rows.map(r => [String(r.d.address || '').trim().toLowerCase(), r]))
  const watchRows: WatchRow[] = watch.slice(0, 4).map(w => {
    const m = byAddr.get(String(w.address || '').trim().toLowerCase())
    const bits = [m?.x.bedrooms ? `${+m.x.bedrooms} Bed` : '', m?.x.bathrooms ? `${+m.x.bathrooms} Bath` : '', num(w.price) ? fmtMoney(num(w.price), m?.cur || 'GBP') : '', w.status].filter(Boolean)
    return { id: w.id, name: String(w.address), sub: bits.join(' | '), yield: m?.y ?? null, photo: m?.x.listing?.photos?.[0] || null }
  })

  const byStrategy: Record<string, number> = {}
  for (const r of rows) byStrategy[r.d.strategy] = (byStrategy[r.d.strategy] ?? 0) + 1
  const areaFacts = new Map<string, typeof rows>()
  for (const r of rows) areaFacts.set(r.area, [...(areaFacts.get(r.area) ?? []), r])
  const facts: Facts = {
    savedDeals: rows.length, dealsWithYield: withY.length, newThisMonth: rows.filter(r => r.month === thisM).length, watchlist: watch.length, byStrategy,
    areas: [...areaFacts.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4).map(([area, l]) => ({ area, deals: l.length, medianMonthlyRent: median(l.map(r => r.rent).filter(Boolean)), avgYield: avg(l.filter(r => r.y != null).map(r => r.y as number)) })),
    best: top ? { name: String(top.d.address), yield: top.y as number } : null,
  }
  return { watch: watchRows, watchTotal: watch.length, groups, featured, facts }
}

// Used when the AI is unavailable: plain sentences straight from the same facts.
export function ruleInsights(f: Facts): Insight[] {
  const out: Insight[] = []
  if (f.savedDeals) out.push({ tone: 'info', text: `${f.savedDeals} saved deal${f.savedDeals === 1 ? '' : 's'}, ${f.newThisMonth} added this month.` })
  const a = f.areas[0]; if (a && a.deals > 1) out.push({ tone: 'up', text: `${a.area} has the most saved deals (${a.deals}).` })
  if (f.best) out.push({ tone: 'up', text: `Best yield so far: ${f.best.yield.toFixed(1)}% at ${f.best.name}.` })
  if (f.savedDeals && f.dealsWithYield < f.savedDeals) out.push({ tone: 'flat', text: `${f.savedDeals - f.dealsWithYield} saved deal${f.savedDeals - f.dealsWithYield === 1 ? ' has' : 's have'} no purchase price, so no yield yet.` })
  if (!f.watchlist) out.push({ tone: 'warn', text: 'Nothing on the watchlist yet. Add properties you are tracking.' })
  return out.slice(0, 5)
}

// ── Preview example (shown only on request, always labelled as example figures) ──
export const EXAMPLE: Intel & { insights: Insight[] } = {
  insights: [
    { tone: 'up', text: 'Kingston apartment rents are up 12% year-on-year, with strongest demand in New Kingston.' },
    { tone: 'up', text: 'Montego Bay is seeing increased activity in the US$200k to US$400k segment.' },
    { tone: 'info', text: 'New developments in Portmore are attracting more interest from overseas buyers.' },
    { tone: 'flat', text: 'Rental yields remain stable despite rising property prices.' },
    { tone: 'warn', text: 'Watch for potential oversupply in parts of Kingston next year.' },
  ],
  watch: [
    { id: 'e1', name: 'The Residences, Kingston', sub: '2 Bed | 2 Bath | J$26,500,000', yield: 7.1 },
    { id: 'e2', name: 'Blue Waters, Montego Bay', sub: '1 Bed | 1 Bath | US$320,000', yield: 6.8 },
    { id: 'e3', name: 'Port Royal, Kingston', sub: '3 Bed | 2 Bath | J$42,000,000', yield: 6.5 },
    { id: 'e4', name: 'The Cove, Montego Bay', sub: '2 Bed | 2 Bath | US$450,000', yield: 7.8 },
  ],
  watchTotal: 4,
  groups: [
    { tab: 'Kingston', rows: [{ name: 'New Kingston', yield: 7.2, change: 0.4, n: 3 }, { name: 'Kingston', yield: 6.8, change: 0.3, n: 3 }, { name: 'Portmore', yield: 6.3, change: 0.2, n: 2 }, { name: 'Half Way Tree', yield: 6.1, change: 0.1, n: 2 }, { name: 'Liguanea', yield: 5.8, change: 0.1, n: 1 }] },
    { tab: 'Montego Bay', rows: [{ name: 'Ironshore', yield: 7.6, change: 0.3, n: 2 }, { name: 'Rose Hall', yield: 7.1, change: 0.2, n: 2 }, { name: 'Montego Bay', yield: 6.7, change: 0.1, n: 3 }, { name: 'Bogue', yield: 6.2, change: 0.2, n: 1 }, { name: 'Catherine Hall', yield: 5.9, change: 0.1, n: 1 }] },
    { tab: 'Ocho Rios', rows: [{ name: 'Ocho Rios', yield: 7.0, change: 0.2, n: 2 }, { name: 'Runaway Bay', yield: 6.6, change: 0.1, n: 1 }, { name: 'Priory', yield: 6.2, change: 0.1, n: 1 }, { name: 'Salt Spring', yield: 5.9, change: 0.0, n: 1 }, { name: 'Mammee Bay', yield: 5.7, change: 0.1, n: 1 }] },
  ],
  // J$175,000 a month on J$28,000,000 is 7.5% gross, so the figures agree with each other
  featured: { name: 'The Shallows, Kingston', beds: 2, baths: 2, sqft: 1200, price: 28000000, rent: 175000, yield: 7.5, cur: 'JMD' },
  facts: { savedDeals: 0, dealsWithYield: 0, newThisMonth: 0, watchlist: 4, byStrategy: {}, areas: [], best: null },
}
