// Deterministic Deal Decision Engine.
//
// This file does NOT recompute the deal's financials from scratch -- it
// imports the existing calc functions from lib/dealCalculators.ts (the
// same ones app/invest/page.tsx uses) and runs them again only to stress
// test and break-even solve. All pass/fail/review logic here is plain
// arithmetic and comparisons against configurable rules -- no AI, by
// design (see app/api/deal-decision-engine/route.ts for where AI is used:
// summarising this output, never producing it).

import { calcBTL, calcHMO, calcR2R, getStressScenarios, applyStress } from './dealCalculators'

export type ConfidenceLevel = 'VERIFIED' | 'USER_PROVIDED' | 'ESTIMATED' | 'MISSING'
export type RuleResultStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'MISSING'
export type DealStatus = 'PASS' | 'REVIEW' | 'REJECT'

export interface RuleResult {
  rule: string
  result: RuleResultStatus
  value: string
  threshold: string
}

export interface FieldConfidence {
  field: string
  value: string
  confidence: ConfidenceLevel
  note?: string
}

// Opero's current deal form does not track which fields were typed by the
// user vs estimated -- so anything present is USER_PROVIDED, and known
// fields the current Deal Analyser form doesn't collect at all (licensing,
// comparable rent evidence) are MISSING rather than guessed. If a caller
// wants to mark a field ESTIMATED/VERIFIED, they can set
// form._fieldConfidence = { fieldName: 'ESTIMATED' | 'VERIFIED' }.
export function classifyConfidence(form: any, strategy: string): FieldConfidence[] {
  const overrides: Record<string, ConfidenceLevel> = form._fieldConfidence || {}
  const out: FieldConfidence[] = []

  const track = (field: string, label: string, formatted?: (v: any) => string) => {
    const raw = form[field]
    const has = raw !== undefined && raw !== null && raw !== ''
    out.push({
      field: label,
      value: has ? (formatted ? formatted(raw) : String(raw)) : 'MISSING',
      confidence: has ? (overrides[field] || 'USER_PROVIDED') : 'MISSING',
    })
  }

  track('address', 'Property address')
  track('price', 'Price / asking rent', v => `£${v}`)
  track('rent', 'Landlord rent (r2r) / rent (other)', v => `£${v}`)
  if (strategy === 'hmo') track('rentPerRoom', 'Rent per room', v => `£${v}`)
  if (strategy === 'r2r') track('subletRent', 'Resident/sublet rent', v => `£${v}`)
  track('deposit', 'Deposit %', v => `${v}%`)
  track('expenses', 'Operating expenses %', v => `${v}%`)
  track('refurb', 'Refurb/setup cost', v => `£${v}`)
  track('mortgageRate', 'Mortgage/finance rate', v => `${v}%`)

  // Known-important fields the current form doesn't collect -- always
  // MISSING rather than silently absent from the confidence table.
  out.push({ field: 'Licensing status', value: 'MISSING', confidence: 'MISSING', note: 'Not captured by current deal form' })
  out.push({ field: 'Comparable rental evidence', value: 'MISSING', confidence: 'MISSING', note: 'Not captured by current deal form' })
  out.push({ field: 'Permitted use / planning', value: 'MISSING', confidence: 'MISSING', note: 'Not captured by current deal form' })
  out.push({ field: 'EPC rating', value: 'MISSING', confidence: 'MISSING', note: 'Not captured by current deal form' })

  return out
}

// Binary search for the occupancy level at which monthly cashflow hits
// zero. Only meaningful for strategies with a per-room/per-unit income
// model (hmo, r2r) where "occupancy" has a clear meaning; for single-let
// strategies (btl/brrr/social/supported) occupancy is effectively binary
// (let or not), so break-even there is reported as N/A.
export function findBreakEvenOccupancy(strategy: string, form: any): number | null {
  if (strategy !== 'hmo' && strategy !== 'r2r') return null

  const fullResult = strategy === 'hmo' ? calcHMO(form) : calcR2R(form)
  if (fullResult.monthlyCashflow <= 0) return null // doesn't break even even at 100% occupancy

  let lo = 0, hi = 100
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const scaled = { ...form }
    if (strategy === 'hmo') {
      scaled.rentPerRoom = String((parseFloat(form.rentPerRoom) || 0) * (mid / 100))
    } else {
      scaled.subletRent = String((parseFloat(form.subletRent) || 0) * (mid / 100))
    }
    const r = strategy === 'hmo' ? calcHMO(scaled) : calcR2R(scaled)
    if (r.monthlyCashflow > 0) hi = mid; else lo = mid
  }
  return Math.round(hi * 10) / 10
}

export interface DecisionRules {
  minBaseSurplus?: number
  minStressedSurplus?: number
  maxUpfrontCash?: number
  minROI?: number
  maxBreakEvenOccupancyPct?: number
}

export function runRuleChecks(
  strategy: string,
  baseResult: any,
  stressedWorstResult: any,
  breakEven: number | null,
  rules: DecisionRules
): RuleResult[] {
  const results: RuleResult[] = []

  const baseSurplus = baseResult.monthlyCashflow ?? 0
  if (rules.minBaseSurplus !== undefined) {
    results.push({
      rule: 'Base monthly surplus',
      result: baseSurplus >= rules.minBaseSurplus ? 'PASS' : 'FAIL',
      value: `£${baseSurplus.toFixed(0)}`,
      threshold: `£${rules.minBaseSurplus} minimum`,
    })
  }

  if (stressedWorstResult && rules.minStressedSurplus !== undefined) {
    const stressedSurplus = stressedWorstResult.monthlyCashflow ?? 0
    results.push({
      rule: 'Stressed monthly surplus (worst case)',
      result: stressedSurplus >= rules.minStressedSurplus ? 'PASS' : 'FAIL',
      value: `£${stressedSurplus.toFixed(0)}`,
      threshold: `£${rules.minStressedSurplus} minimum`,
    })
  }

  const upfront = (baseResult.depositAmt ?? 0) + (baseResult.furnitureCost ?? 0)
  if (rules.maxUpfrontCash !== undefined && upfront > 0) {
    results.push({
      rule: 'Upfront cash required',
      result: upfront <= rules.maxUpfrontCash ? 'PASS' : 'FAIL',
      value: `£${upfront.toFixed(0)}`,
      threshold: `£${rules.maxUpfrontCash} maximum`,
    })
  }

  if (rules.minROI !== undefined && baseResult.roi !== undefined) {
    results.push({
      rule: 'Return on investment',
      result: baseResult.roi >= rules.minROI ? 'PASS' : 'FAIL',
      value: `${baseResult.roi.toFixed(1)}%`,
      threshold: `${rules.minROI}% minimum`,
    })
  }

  if (breakEven !== null && rules.maxBreakEvenOccupancyPct !== undefined) {
    let status: RuleResultStatus = breakEven <= rules.maxBreakEvenOccupancyPct ? 'PASS' : 'FAIL'
    // Within 5 points of the threshold but still technically passing --
    // flag for human review rather than a clean pass, per spec section 4.
    if (status === 'PASS' && breakEven >= rules.maxBreakEvenOccupancyPct - 5) status = 'REVIEW'
    results.push({
      rule: 'Break-even occupancy',
      result: status,
      value: `${breakEven}%`,
      threshold: `${rules.maxBreakEvenOccupancyPct}% maximum`,
    })
  } else if ((strategy === 'hmo' || strategy === 'r2r') && rules.maxBreakEvenOccupancyPct !== undefined) {
    results.push({ rule: 'Break-even occupancy', result: 'MISSING', value: 'Could not be calculated', threshold: `${rules.maxBreakEvenOccupancyPct}% maximum` })
  }

  // Due-diligence items the current form never collects -- always
  // surfaced as MISSING/REVIEW so they can't silently pass by omission.
  results.push({ rule: 'Licensing', result: 'MISSING', value: 'Unconfirmed', threshold: 'Required' })
  results.push({ rule: 'Comparable rental evidence', result: 'MISSING', value: 'Incomplete', threshold: 'Required' })

  return results
}

export function buildChecklist(strategy: string): Record<string, { item: string; checked: boolean }[]> {
  const isSublease = strategy === 'r2r'
  const checklist: Record<string, { item: string; checked: boolean }[]> = {
    LICENSING: [
      { item: 'Licence requirement confirmed', checked: false },
      { item: 'Licence obtained/verified', checked: false },
      { item: 'Maximum occupancy confirmed', checked: false },
    ],
    PLANNING: [
      { item: 'Permitted use confirmed', checked: false },
      { item: 'Planning restrictions checked', checked: false },
    ],
    PROPERTY: [
      { item: 'EPC checked', checked: false },
      { item: 'Property condition reviewed', checked: false },
      { item: 'Inventory/furnishing requirements checked', checked: false },
    ],
    FINANCIAL: [
      { item: isSublease ? 'Landlord rent verified' : 'Asking rent verified', checked: false },
      { item: 'Comparable rental evidence obtained', checked: false },
      { item: 'Utility costs verified', checked: false },
      { item: 'Council tax verified', checked: false },
      { item: 'Insurance requirements checked', checked: false },
    ],
  }
  if (isSublease) {
    checklist.CONTRACT = [
      { item: 'Landlord consent to sublease confirmed', checked: false },
      { item: 'Lease term confirmed', checked: false },
      { item: 'Break clause checked', checked: false },
      { item: 'Repair obligations checked', checked: false },
      { item: 'Rent review clause checked', checked: false },
    ]
  }
  return checklist
}

// Pure function: status is derived ONLY from rule results. No AI input,
// no subjective override -- matches spec section 3/4 exactly.
export function decideStatus(ruleResults: RuleResult[]): DealStatus {
  if (ruleResults.some(r => r.result === 'FAIL')) return 'REJECT'
  if (ruleResults.some(r => r.result === 'REVIEW' || r.result === 'MISSING')) return 'REVIEW'
  return 'PASS'
}

export interface DecisionEngineOutput {
  status: DealStatus
  ruleResults: RuleResult[]
  stressResults: { key: string; label: string; monthlyCashflow: number; annualCashflow: number }[]
  breakEvenOccupancy: number | null
  fieldConfidence: FieldConfidence[]
  checklist: Record<string, { item: string; checked: boolean }[]>
  missingFields: string[]
  riskFlags: string[]
}

export function runDecisionEngine(strategy: string, form: any, baseResult: any, rules: DecisionRules): DecisionEngineOutput {
  const scenarios = getStressScenarios(strategy) || []
  const stressResults = scenarios.map(s => {
    const r: any = applyStress(strategy, form, s)
    return { key: s.key, label: s.label, monthlyCashflow: r.monthlyCashflow ?? 0, annualCashflow: r.annualCashflow ?? 0 }
  })
  const worst = stressResults.find(s => s.key === 'worst') || null

  const breakEven = findBreakEvenOccupancy(strategy, form)
  const ruleResults = runRuleChecks(strategy, baseResult, worst, breakEven, rules)
  const status = decideStatus(ruleResults)
  const fieldConfidence = classifyConfidence(form, strategy)
  const checklist = buildChecklist(strategy)

  const missingFields = fieldConfidence.filter(f => f.confidence === 'MISSING').map(f => f.field)
  const riskFlags: string[] = []
  if (worst && worst.monthlyCashflow < 0) riskFlags.push('Stressed worst-case scenario shows negative monthly cashflow')
  if (breakEven !== null && rules.maxBreakEvenOccupancyPct !== undefined && breakEven >= rules.maxBreakEvenOccupancyPct - 5) {
    riskFlags.push('Break-even occupancy is close to the configured maximum')
  }
  if (missingFields.length > 0) riskFlags.push(`${missingFields.length} field(s) unverified or missing`)

  return { status, ruleResults, stressResults, breakEvenOccupancy: breakEven, fieldConfidence, checklist, missingFields, riskFlags }
}
