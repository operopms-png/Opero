// The deterministic part of the Deal Decision Engine, shared by the Deal Analyser route and the AI deal-screening skill.
import { createClient } from '@supabase/supabase-js'
import { calcBTL, calcHMO, calcR2R, calcFlip, calcLand } from '@/lib/dealCalculators'
import { runDecisionEngine, DecisionRules } from '@/lib/dealDecisionEngine'
import { curOf, ratesPerGBP } from '@/lib/currency'

const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const DEFAULT_RULES: Record<string, DecisionRules> = {
  btl:       { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  brrr:      { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  hmo:       { minBaseSurplus: 500, minStressedSurplus: 200, maxUpfrontCash: 40000, minROI: 8,  maxBreakEvenOccupancyPct: 80 },
  social:    { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  supported: { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  r2r:       { minBaseSurplus: 500, minStressedSurplus: 200, maxUpfrontCash: 10000, maxBreakEvenOccupancyPct: 80 },
  r2hmo:     { minBaseSurplus: 800, minStressedSurplus: 300, maxUpfrontCash: 15000, maxBreakEvenOccupancyPct: 80 },
}

export function runCalc(strategy: string, form: any) {
  if (strategy === 'btl' || strategy === 'brrr') return calcBTL(form)
  if (strategy === 'social' || strategy === 'supported') return calcBTL({ ...form, expenses: form.expenses || '10' })
  if (strategy === 'hmo') return calcHMO(form)
  if (strategy === 'r2r' || strategy === 'r2hmo') return calcR2R(form)
  if (strategy === 'flip') return calcFlip(form)
  if (strategy === 'land') return calcLand(form)
  return {}
}

export async function screenDeal(user_id: string, strategy: string, form: any) {
  // Rules: per-user configurable thresholds (deal_analysis_rules), falling
  // back to defaults above when the user hasn't set any yet -- so the
  // engine is usable immediately without forcing setup first, per spec
  // section 3 ("Create an admin/settings area where I can change the
  // thresholds without changing the code").
  const { data: rulesRow } = await serviceClient
    .from('deal_analysis_rules')
    .select('rules')
    .eq('user_id', user_id)
    .maybeSingle()

  const userRules = rulesRow?.rules?.[strategy]
  const baseRules: DecisionRules = userRules || DEFAULT_RULES[strategy] || {}
  // Thresholds are set in £; scale the money ones when the deal is in J$ or $
  const cur = curOf(form)
  const fx = cur === 'GBP' ? 1 : (await ratesPerGBP())[cur]
  const scale = (v?: number) => v === undefined ? undefined : Math.round(v * fx)
  const rules: DecisionRules = cur === 'GBP' ? baseRules : { ...baseRules, minBaseSurplus: scale(baseRules.minBaseSurplus), minStressedSurplus: scale(baseRules.minStressedSurplus), maxUpfrontCash: scale(baseRules.maxUpfrontCash) }

  const baseResult = runCalc(strategy, form)
  const engineOutput = runDecisionEngine(strategy, form, baseResult, rules)
  return { rules, baseResult, engineOutput }
}
