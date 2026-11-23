// Investment Packs: the shape of a pack, its stages, the sums, and a cleaner for anything saved.
// Used by Pack Builder (Staff Centre → Marketing), the public pack page (/p/…) and the Dashboard box,
// so every place shows the same figures.

export type PackData = {
  prepared_for: string
  investors: number
  rate: number // Jamaican dollars to one pound
  car: { title: string; price_jmd: number; deposit_pct: number; weekly_jmd: number; note: string; credit: string; photos: string[] }
  home: { title: string; details: string; rent_gbp: number; rent_months: number; deposit_months: number; sublet_gbp: number[]; photos: string[] }
  cover: { rent_jmd: number; finance_jmd: number; weekly_jmd: number[] }
  footer: string
}

export const STAGES = [
  { k: 'draft', l: 'Draft', hint: 'You are building it. The link is not live yet.' },
  { k: 'sent', l: 'Sent', hint: 'The link is created and shared.' },
  { k: 'opened', l: 'Opened', hint: 'The investor has viewed it. Moves by itself.' },
  { k: 'interested', l: 'Interested', hint: 'They replied or asked questions.' },
  { k: 'committed', l: 'Committed', hint: 'They have agreed to put money in.' },
  { k: 'funded', l: 'Funded', hint: 'Their share is paid.' },
  { k: 'closed', l: 'Declined or closed', hint: 'They said no, or it is finished.' },
] as const
export type StageKey = typeof STAGES[number]['k']
export const stageLabel = (k: string) => STAGES.find(s => s.k === k)?.l || 'Draft'
export const STAGE_COLOR: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#F2F4F7', fg: '#475467' }, sent: { bg: '#E8F0FB', fg: '#1F5BB0' }, opened: { bg: '#FFF4DE', fg: '#93560B' },
  interested: { bg: '#EFE8FB', fg: '#5B3BA8' }, committed: { bg: '#E3F5EC', fg: '#067647' }, funded: { bg: '#D1F0E1', fg: '#054F31' }, closed: { bg: '#FDECEC', fg: '#B42318' },
}

export const DEFAULT_PACK: PackData = {
  prepared_for: '',
  investors: 2,
  rate: 207,
  car: { title: '2017 Toyota Voxy ZS', price_jmd: 2799000, deposit_pct: 20, weekly_jmd: 60000, note: 'Listed at J$2,799,000, or trade.', credit: 'Photos: Griffiths Motor Sales', photos: [] },
  home: { title: '74 Edmund Ridge, Montego Bay', details: 'Townhouse, St. James, Montego Bay. 2 bedrooms, 1 bathroom, 1,020 sq ft. We rent it on a master lease and sublet it furnished.', rent_gbp: 528, rent_months: 1, deposit_months: 2, sublet_gbp: [600, 700, 800], photos: [] },
  cover: { rent_jmd: 100000, finance_jmd: 50000, weekly_jmd: [20000, 30000, 40000, 50000, 60000] },
  footer: 'Car earnings are a target, not guaranteed. Car finance is an estimate pending bank approval. Insurance, servicing and licensing are not included. Property figures are before utilities, furnishing and fees. Rates are indicative.',
}

const num = (v: any, d: number, min = 0, max = 1e12) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d }
const str = (v: any, d: string, len: number) => typeof v === 'string' ? v.slice(0, len) : d
const nums = (v: any, d: number[], max: number) => Array.isArray(v) ? v.map(x => Number(x)).filter(x => Number.isFinite(x) && x >= 0 && x < 1e12).slice(0, max) : d
const urls = (v: any) => Array.isArray(v) ? v.map(String).filter(u => /^https:\/\//.test(u)).slice(0, 24) : []

/** Turns anything (saved or typed) into a complete, safe pack. */
export function cleanPack(raw: any, base: PackData = DEFAULT_PACK): PackData {
  const r = raw && typeof raw === 'object' ? raw : {}
  const c = r.car || {}, h = r.home || {}, v = r.cover || {}
  return {
    prepared_for: str(r.prepared_for, base.prepared_for, 80).trim(),
    investors: Math.round(num(r.investors, base.investors, 1, 20)),
    rate: num(r.rate, base.rate, 1, 100000),
    car: { title: str(c.title, base.car.title, 120), price_jmd: num(c.price_jmd, base.car.price_jmd), deposit_pct: num(c.deposit_pct, base.car.deposit_pct, 0, 100), weekly_jmd: num(c.weekly_jmd, base.car.weekly_jmd), note: str(c.note, base.car.note, 200), credit: str(c.credit, base.car.credit, 120), photos: urls(c.photos) },
    home: { title: str(h.title, base.home.title, 120), details: str(h.details, base.home.details, 600), rent_gbp: num(h.rent_gbp, base.home.rent_gbp), rent_months: Math.round(num(h.rent_months, base.home.rent_months, 0, 24)), deposit_months: Math.round(num(h.deposit_months, base.home.deposit_months, 0, 24)), sublet_gbp: nums(h.sublet_gbp, base.home.sublet_gbp, 6), photos: urls(h.photos) },
    cover: { rent_jmd: num(v.rent_jmd, base.cover.rent_jmd), finance_jmd: num(v.finance_jmd, base.cover.finance_jmd), weekly_jmd: nums(v.weekly_jmd, base.cover.weekly_jmd, 8) },
    footer: str(r.footer, base.footer, 800),
  }
}

export const WEEKS_PER_MONTH = 52 / 12

export function calcPack(d: PackData) {
  const inv = Math.max(1, d.investors), rate = Math.max(1, d.rate)
  const toGbp = (j: number) => j / rate
  const deposit = d.car.price_jmd * d.car.deposit_pct / 100
  const depositEach = deposit / inv
  const homeUpfront = d.home.rent_gbp * (d.home.rent_months + d.home.deposit_months)
  const homeEach = homeUpfront / inv
  const eachGbp = toGbp(depositEach) + homeEach
  const sublet = d.home.sublet_gbp.map(s => ({ rent: s, left: s - d.home.rent_gbp, each: (s - d.home.rent_gbp) / inv }))
  const cover = d.cover.weekly_jmd.map(w => {
    const monthly = w * WEEKS_PER_MONTH
    const left = monthly - d.cover.finance_jmd - d.cover.rent_jmd
    return { weekly: w, monthly, left, covered: left >= 0 }
  })
  const breakEvenWeekly = (d.cover.rent_jmd + d.cover.finance_jmd) / WEEKS_PER_MONTH
  return {
    inv, rate, toGbp, deposit, depositEach, homeUpfront, homeEach, eachGbp, totalGbp: eachGbp * inv,
    weeklyEach: d.car.weekly_jmd / inv, depositWeeks: d.car.weekly_jmd > 0 ? deposit / d.car.weekly_jmd : 0,
    homeJmd: d.home.rent_gbp * rate, sublet, cover, breakEvenWeekly,
  }
}

const group = (n: number) => Math.round(Math.abs(n)).toLocaleString('en-GB')
export const jmd = (n: number) => (n < 0 && Math.round(n) !== 0 ? '−' : '') + 'J$' + group(n)
export const gbp = (n: number) => (n < 0 && Math.round(n) !== 0 ? '−' : '') + '£' + group(n)
