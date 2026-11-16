// Dynamic Dossier: suggested nightly prices and results for short-stay properties, worked out from the company's own
// bookings and the rules it sets per property. Nothing here talks to Airbnb or any channel: prices are suggestions only.
export type Settings = { base_price: number | null; floor_price: number | null; ceiling_price: number | null; weekend_pct: number; last_minute_pct: number; gap_pct: number; demand_pct: number; enabled: boolean }
export type Booking = { property_id: string; check_in: string; check_out: string; status?: string | null; total_amount?: number | null }
export type Night = { date: string; booked: boolean; price: number | null; reason: string }
export const DEFAULTS: Settings = { base_price: null, floor_price: null, ceiling_price: null, weekend_pct: 15, last_minute_pct: 10, gap_pct: 10, demand_pct: 10, enabled: false }

const DAY = 864e5
export const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const at = (s: string) => new Date(s + 'T00:00:00').getTime()
const live = (b: Booking) => !/cancel/i.test(b.status ?? '')

/** The set of nights (YYYY-MM-DD) taken by this property's bookings. A stay occupies check-in up to, not including, check-out. */
export function bookedNights(bookings: Booking[], propertyId: string) {
  const s = new Set<string>()
  for (const b of bookings) {
    if (b.property_id !== propertyId || !live(b) || !b.check_in || !b.check_out) continue
    for (let t = at(b.check_in); t < at(b.check_out); t += DAY) s.add(iso(new Date(t)))
  }
  return s
}

/** Suggested price for each of the next `days` nights. Always kept between the floor and the ceiling. */
export function suggest(st: Settings, booked: Set<string>, today = new Date(), days = 14): Night[] {
  const out: Night[] = []
  const base = st.base_price
  const start = at(iso(today))
  // How full the next 30 nights are, for the demand rule
  let taken = 0; for (let i = 0; i < 30; i++) if (booked.has(iso(new Date(start + i * DAY)))) taken++
  const busy = taken / 30 >= 0.7
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * DAY), key = iso(d)
    if (booked.has(key)) { out.push({ date: key, booked: true, price: null, reason: 'Booked' }); continue }
    if (base == null) { out.push({ date: key, booked: false, price: null, reason: 'Enter a base price' }); continue }
    let p = base; const why: string[] = []
    const dow = d.getDay()
    if ((dow === 5 || dow === 6) && st.weekend_pct) { p *= 1 + st.weekend_pct / 100; why.push(`weekend +${st.weekend_pct}%`) }
    if (busy && i > 7 && st.demand_pct) { p *= 1 + st.demand_pct / 100; why.push(`busy month +${st.demand_pct}%`) }
    const before = booked.has(iso(new Date(d.getTime() - DAY))), after = booked.has(iso(new Date(d.getTime() + DAY)))
    if (before && after && st.gap_pct) { p *= 1 - st.gap_pct / 100; why.push(`single-night gap -${st.gap_pct}%`) }
    else if (i <= 3 && st.last_minute_pct) { p *= 1 - st.last_minute_pct / 100; why.push(`empty, ${i === 0 ? 'tonight' : i + ' days out'} -${st.last_minute_pct}%`) }
    else if (i <= 7 && st.last_minute_pct) { p *= 1 - st.last_minute_pct / 200; why.push(`empty within a week -${st.last_minute_pct / 2}%`) }
    const lo = st.floor_price ?? 0, hi = st.ceiling_price ?? Infinity
    const clamped = Math.min(hi, Math.max(lo, p))
    if (clamped !== p) why.push(clamped === lo ? 'held at your floor' : 'held at your ceiling')
    out.push({ date: key, booked: false, price: Math.round(clamped), reason: why.length ? why.join(', ') : 'base price' })
  }
  return out
}

export type Perf = {
  occupancy: number; occupancyPrev: number; adr: number | null; income: number; incomePrev: number; bookedAhead: number
  rows: { id: string; name: string; occupancy: number; adr: number | null; income: number }[]
}
const nightsIn = (b: Booking, from: number, to: number) => Math.max(0, (Math.min(at(b.check_out), to) - Math.max(at(b.check_in), from)) / DAY)

/** Results from the company's own bookings. Income is each stay's total spread evenly over its nights. */
export function performance(props: { id: string; name: string }[], bookings: Booking[], today = new Date()): Perf {
  const t0 = at(iso(today)), d30 = t0 - 30 * DAY, d60 = t0 - 60 * DAY, a60 = t0 + 60 * DAY
  const per = (propId: string | null, from: number, to: number) => {
    let nights = 0, income = 0
    for (const b of bookings) {
      if (!live(b) || !b.check_in || !b.check_out || (propId && b.property_id !== propId)) continue
      if (!propId && !props.some(p => p.id === b.property_id)) continue
      const n = nightsIn(b, from, to), len = Math.max(1, (at(b.check_out) - at(b.check_in)) / DAY)
      nights += n; income += (Number(b.total_amount) || 0) * (n / len)
    }
    return { nights, income }
  }
  const N = Math.max(1, props.length)
  const cur30 = per(null, d30, t0), prev30 = per(null, d60, d30), ahead = per(null, t0, a60)
  return {
    occupancy: cur30.nights / (30 * N), occupancyPrev: prev30.nights / (30 * N), adr: cur30.nights ? cur30.income / cur30.nights : null,
    income: cur30.income, incomePrev: prev30.income, bookedAhead: ahead.nights / (60 * N),
    rows: props.map(p => { const r = per(p.id, d30, t0); return { id: p.id, name: p.name, occupancy: r.nights / 30, adr: r.nights ? r.income / r.nights : null, income: r.income } }),
  }
}
