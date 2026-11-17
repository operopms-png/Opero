// Jamaican buying and selling costs, from the standard real estate charges table.
// Percentages are of the sale price. Flat fees are in Jamaican dollars. All figures are approximate.
// A company can change any rate: company defaults override the standard, and a deal can override both.
import { CURRENCIES, FALLBACK_PER_GBP, curOf, type Cur } from './currency'

export type Rates = Record<string, number>
type Def = { key: string; label: string; kind: 'pct' | 'flat'; std: number; mortgageOnly?: boolean }

// kind 'pct' = percent of the price; 'flat' = fixed amount in J$
export const BUYER_DEFS: Def[] = [
  { key: 'b_stamp', label: 'Stamp duty (half)', kind: 'flat', std: 2500 },
  { key: 'b_agreement', label: 'Cost of agreement for sale', kind: 'pct', std: 0.20 },
  { key: 'b_agreement_gct', label: 'GCT on agreement for sale', kind: 'pct', std: 0.033 },
  { key: 'b_registration', label: 'Registration fee', kind: 'pct', std: 0.25 },
  { key: 'b_attorney', label: "Attorney's fee", kind: 'pct', std: 3.00 },
  { key: 'b_attorney_gct', label: "GCT on attorney's fee", kind: 'pct', std: 0.49 },
  { key: 'b_possession', label: 'Letter of possession', kind: 'flat', std: 7500 },
  { key: 'b_mortgage', label: 'If purchaser requires a mortgage', kind: 'pct', std: 6.00, mortgageOnly: true },
]
export const VENDOR_DEFS: Def[] = [
  { key: 'v_transfer', label: 'Transfer tax (full)', kind: 'pct', std: 2.00 },
  { key: 'v_stamp', label: 'Stamp duty (half)', kind: 'flat', std: 2500 },
  { key: 'v_registration', label: 'Registration (half)', kind: 'pct', std: 0.25 },
  { key: 'v_agreement', label: 'Cost of agreement for sale (half)', kind: 'pct', std: 0.20 },
  { key: 'v_agreement_gct', label: 'GCT on agreement for sale', kind: 'pct', std: 0.033 },
  { key: 'v_commission', label: 'Commission', kind: 'pct', std: 5.00 },
  { key: 'v_commission_gct', label: 'GCT on commission', kind: 'pct', std: 0.83 },
  { key: 'v_attorney', label: "Attorney's fee", kind: 'pct', std: 3.00 },
  { key: 'v_attorney_gct', label: "GCT on attorney's fee", kind: 'pct', std: 0.49 },
  { key: 'v_possession', label: 'Letter of possession', kind: 'flat', std: 7500 },
]
export const RATE_KEYS = [...BUYER_DEFS, ...VENDOR_DEFS].map(d => d.key)

export type CostLine = { key: string; label: string; kind: 'pct' | 'flat'; rate: number; changed: boolean; amount: number; note?: string }
export type JamaicaCosts = { lines: CostLine[]; total: number; totalPct: number }

const fromJMD = (cur: Cur) => FALLBACK_PER_GBP[cur] / FALLBACK_PER_GBP.JMD

// company = the company's saved defaults, deal = this deal's own changes
function build(price: number, cur: Cur, defs: Def[], company: Rates, deal: Rates, extra: CostLine[] = [], skipMortgage = false): JamaicaCosts {
  const k = fromJMD(cur)
  const lines: CostLine[] = defs.filter(d => !(d.mortgageOnly && skipMortgage)).map(d => {
    const rate = deal[d.key] ?? company[d.key] ?? d.std
    const amount = d.kind === 'pct' ? price * rate / 100 : rate * k
    return { key: d.key, label: d.label, kind: d.kind, rate, changed: rate !== d.std, amount }
  })
  const all = [...lines.slice(0, 4 < lines.length && extra.length ? 4 : lines.length), ...extra, ...lines.slice(extra.length ? 4 : lines.length)]
  const total = all.reduce((a, l) => a + l.amount, 0)
  return { lines: all, total, totalPct: price > 0 ? total / price * 100 : 0 }
}

// What the buyer pays on top of the price. The surveyor's fee is the buyer's own quote, in the deal currency.
export function purchaserCosts(price: number, cur: Cur, opts: { mortgage: boolean; surveyor?: number; company?: Rates; deal?: Rates }): JamaicaCosts {
  const surveyor: CostLine[] = [{ key: 'surveyor', label: "Surveyor's fee", kind: 'flat', rate: opts.surveyor || 0, changed: false, amount: opts.surveyor || 0, note: 'your quote' }]
  return build(price, cur, BUYER_DEFS, opts.company || {}, opts.deal || {}, surveyor, !opts.mortgage)
}

// What the seller pays out of the price.
export function vendorCosts(price: number, cur: Cur, opts: { company?: Rates; deal?: Rates } = {}): JamaicaCosts {
  return build(price, cur, VENDOR_DEFS, opts.company || {}, opts.deal || {})
}

export const isJamaicaDeal = (form: any) =>
  curOf(form) === 'JMD' || /jamaica/i.test(String(form?.address || '')) || /jamaica/i.test(String(form?.listing?.address || ''))

export const jmSym = (cur: Cur) => CURRENCIES[cur].sym
