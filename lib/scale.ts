// Staff Centre → Scale: how far this company's master lease and co-host business has grown, from its own records.
// Master leases = Property Management head leases (pm_head_leases). Co-hosting = the co-hosts list (cohosts) and the
// bookings on the properties they host. Everything is for one company only. EXAMPLE is labelled sample data for the preview.
import { money } from './partner-schedule'

export type Money = Record<string, number>
export type LeaseRow = { id: string; property: string; landlord: string; rent: number | null; currency: string; expiry: string | null; breakDate: string | null; consent: string; state: 'ok' | 'soon' | 'expired' | 'none'; daysLeft: number | null }
export type CohostRow = { id: string; name: string; properties: number; model: string; currency: string; end: string | null; state: 'ok' | 'soon' | 'expired' | 'none'; daysLeft: number | null; revenue90: number }
export type Scale = {
  doors: number
  masters: { count: number; rent: Money; income: Money; margin: Money; marginLeases: number; expiring90: number; expired: number; noConsent: number; rows: LeaseRow[] }
  cohosts: { count: number; properties: number; endingSoon: number; expired: number; revenue90: Money; rows: CohostRow[] }
  series: { label: string; masters: number; cohost: number }[]
  attention: { tone: 'warn' | 'info'; text: string }[]
}

export const MODEL_LABEL: Record<string, string> = { commission: 'Percentage', fee: 'Fee', contract: 'Per contract' }
const DAY = 864e5
const num = (v: any) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v))
const add = (m: Money, cur: string, n: number) => { m[cur] = (m[cur] ?? 0) + n }
const stateOf = (iso: string | null, now: number): { state: 'ok' | 'soon' | 'expired' | 'none'; daysLeft: number | null } => {
  if (!iso) return { state: 'none', daysLeft: null }
  const d = Math.ceil((new Date(iso).getTime() - now) / DAY)
  return { state: d < 0 ? 'expired' : d <= 90 ? 'soon' : 'ok', daysLeft: d }
}
export const moneyLine = (m: Money) => { const k = Object.keys(m).filter(c => m[c] !== 0); return k.length ? k.map(c => money(m[c], c)).join(' · ') : 'None entered' }

export function buildScale(i: { leases: any[]; pmProps: any[]; cohosts: any[]; bookings: any[] }, nowMs = Date.now()): Scale {
  const pm = new Map<string, any>(i.pmProps.map(p => [p.id, p]))

  // Master leases
  const rent: Money = {}, income: Money = {}, margin: Money = {}
  let marginLeases = 0, noConsent = 0
  const leaseRows: LeaseRow[] = i.leases.map(l => {
    const p = pm.get(l.property_id), cur = p?.currency || 'JMD', r = num(l.rent_payable), inc = num(p?.monthly_income)
    if (r != null) add(rent, cur, r)
    if (inc != null && inc > 0) add(income, cur, inc)
    if (r != null && inc != null && inc > 0) { add(margin, cur, inc - r); marginLeases++ }
    const consent = l.sublet_consent || 'Pending'
    if (!/^yes/i.test(consent)) noConsent++
    const s = stateOf(l.expiry_date ?? null, nowMs)
    return { id: l.id, property: p?.name || 'Property not linked', landlord: l.landlord_name || '', rent: r, currency: cur, expiry: l.expiry_date ?? null, breakDate: l.break_date ?? null, consent, ...s }
  }).sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999))

  // Co-hosting
  const propOwner = new Map<string, string>()
  for (const c of i.cohosts) for (const id of c.property_ids ?? []) propOwner.set(id, c.currency || 'JMD')
  const since = nowMs - 90 * DAY
  const rev: Record<string, number> = {}
  for (const b of i.bookings) {
    if (!b.property_id || !propOwner.has(b.property_id) || /cancel/i.test(b.status ?? '')) continue
    if (!b.check_in || new Date(b.check_in).getTime() < since) continue
    const t = num(b.total_amount); if (t == null) continue
    rev[b.property_id] = (rev[b.property_id] ?? 0) + t
  }
  const revenue90: Money = {}
  const chRows: CohostRow[] = i.cohosts.map(c => {
    const ids: string[] = c.property_ids ?? []
    const r90 = ids.reduce((s, id) => s + (rev[id] ?? 0), 0)
    if (r90) add(revenue90, c.currency || 'JMD', r90)
    const s = stateOf(c.agreement_end ?? null, nowMs)
    return { id: c.id, name: c.name, properties: ids.length, model: MODEL_LABEL[c.payment_model] ?? 'Per contract', currency: c.currency || 'JMD', end: c.agreement_end ?? null, revenue90: r90, ...s }
  }).sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999))
  const cohostProps = new Set<string>(); for (const c of i.cohosts) for (const id of c.property_ids ?? []) cohostProps.add(id)

  // Growth: doors under management at the end of each of the last 12 months
  const series: Scale['series'] = []
  const now = new Date(nowMs)
  for (let k = 11; k >= 0; k--) {
    const end = new Date(now.getFullYear(), now.getMonth() - k + 1, 0, 23, 59, 59).getTime()
    const label = new Date(now.getFullYear(), now.getMonth() - k, 1).toLocaleDateString('en-GB', { month: 'short' })
    const m = i.leases.filter(l => new Date(l.start_date ?? l.created_at).getTime() <= end).length
    const ch = i.cohosts.filter(c => new Date(c.agreement_start ?? c.created_at).getTime() <= end).reduce((s, c) => s + (c.property_ids?.length ?? 0), 0)
    series.push({ label, masters: m, cohost: ch })
  }

  const expiring90 = leaseRows.filter(r => r.state === 'soon').length, expired = leaseRows.filter(r => r.state === 'expired').length
  const endingSoon = chRows.filter(r => r.state === 'soon').length, chExpired = chRows.filter(r => r.state === 'expired').length
  const attention: Scale['attention'] = []
  if (expired) attention.push({ tone: 'warn', text: `${expired} head lease${expired === 1 ? ' has' : 's have'} passed its expiry date. Renew or end ${expired === 1 ? 'it' : 'them'} in Property Management, Head Leases.` })
  if (expiring90) attention.push({ tone: 'warn', text: `${expiring90} head lease${expiring90 === 1 ? ' expires' : 's expire'} within 90 days.` })
  if (noConsent) attention.push({ tone: 'warn', text: `${noConsent} head lease${noConsent === 1 ? ' has' : 's have'} no sublet consent on file (Pending, verbal only or No).` })
  if (chExpired) attention.push({ tone: 'warn', text: `${chExpired} co-host agreement${chExpired === 1 ? ' has' : 's have'} ended. Renew or archive ${chExpired === 1 ? 'it' : 'them'} in Co-hosts.` })
  if (endingSoon) attention.push({ tone: 'warn', text: `${endingSoon} co-host agreement${endingSoon === 1 ? ' ends' : 's end'} within 90 days.` })
  const noRent = leaseRows.filter(r => r.rent == null).length
  if (noRent) attention.push({ tone: 'info', text: `${noRent} head lease${noRent === 1 ? ' has' : 's have'} no rent payable entered, so ${noRent === 1 ? 'it is' : 'they are'} left out of the totals.` })
  if (leaseRows.length && !marginLeases) attention.push({ tone: 'info', text: 'Margin needs both the rent payable on the head lease and a monthly income on the property in Property Management.' })

  return {
    doors: leaseRows.length + cohostProps.size,
    masters: { count: leaseRows.length, rent, income, margin, marginLeases, expiring90, expired, noConsent, rows: leaseRows },
    cohosts: { count: chRows.length, properties: cohostProps.size, endingSoon, expired: chExpired, revenue90, rows: chRows },
    series, attention,
  }
}

// Sample data for the Preview example button. Clearly not this company's records.
export const EXAMPLE: Scale = {
  doors: 14,
  masters: {
    count: 8, rent: { JMD: 1_240_000 }, income: { JMD: 1_760_000 }, margin: { JMD: 520_000 }, marginLeases: 8, expiring90: 2, expired: 0, noConsent: 1,
    rows: [
      { id: 'e1', property: 'Example: Harbour View 2 bed, Montego Bay', landlord: 'Example Landlord A', rent: 150000, currency: 'JMD', expiry: '2027-01-31', breakDate: null, consent: 'Yes, letter on file', state: 'soon', daysLeft: 76 },
      { id: 'e2', property: 'Example: Hope Road townhouse, Kingston', landlord: 'Example Landlord B', rent: 210000, currency: 'JMD', expiry: '2027-02-14', breakDate: '2026-12-01', consent: 'Yes, letter on file', state: 'soon', daysLeft: 90, },
      { id: 'e3', property: 'Example: Ocho Rios villa', landlord: 'Example Landlord C', rent: 260000, currency: 'JMD', expiry: '2027-09-30', breakDate: null, consent: 'Pending', state: 'ok', daysLeft: 318 },
      { id: 'e4', property: 'Example: Mandeville 3 bed', landlord: 'Example Landlord D', rent: 120000, currency: 'JMD', expiry: '2028-03-01', breakDate: null, consent: 'Yes, letter on file', state: 'ok', daysLeft: 477 },
    ],
  },
  cohosts: {
    count: 4, properties: 6, endingSoon: 1, expired: 0, revenue90: { JMD: 2_150_000 },
    rows: [
      { id: 'c1', name: 'Example Co-host One', properties: 2, model: 'Percentage', currency: 'JMD', end: '2027-01-20', state: 'soon', daysLeft: 65, revenue90: 780000 },
      { id: 'c2', name: 'Example Co-host Two', properties: 1, model: 'Fee', currency: 'JMD', end: '2027-08-31', state: 'ok', daysLeft: 289, revenue90: 310000 },
      { id: 'c3', name: 'Example Co-host Three', properties: 3, model: 'Per contract', currency: 'JMD', end: null, state: 'none', daysLeft: null, revenue90: 1_060_000 },
    ],
  },
  series: [['Dec', 2, 0], ['Jan', 2, 1], ['Feb', 3, 1], ['Mar', 3, 2], ['Apr', 4, 2], ['May', 4, 3], ['Jun', 5, 3], ['Jul', 6, 4], ['Aug', 6, 5], ['Sep', 7, 5], ['Oct', 8, 6], ['Nov', 8, 6]].map(([label, masters, cohost]) => ({ label: label as string, masters: masters as number, cohost: cohost as number })),
  attention: [
    { tone: 'warn', text: '2 head leases expire within 90 days.' },
    { tone: 'warn', text: '1 head lease has no sublet consent on file (Pending, verbal only or No).' },
    { tone: 'warn', text: '1 co-host agreement ends within 90 days.' },
  ],
}
