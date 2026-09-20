import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'
import { callClaude } from '@/lib/claude'
import { calcBTL, calcHMO, calcR2R, calcFlip, calcLand } from '@/lib/dealCalculators'
import { runDecisionEngine, DecisionRules } from '@/lib/dealDecisionEngine'

const DEFAULT_RULES: Record<string, DecisionRules> = {
  btl:       { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  brrr:      { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  hmo:       { minBaseSurplus: 500, minStressedSurplus: 200, maxUpfrontCash: 40000, minROI: 8,  maxBreakEvenOccupancyPct: 80 },
  social:    { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  supported: { minBaseSurplus: 200, minStressedSurplus: 0,   maxUpfrontCash: 30000, minROI: 5 },
  r2r:       { minBaseSurplus: 500, minStressedSurplus: 200, maxUpfrontCash: 10000, maxBreakEvenOccupancyPct: 80 },
}

function runCalc(strategy: string, form: any) {
  if (strategy === 'btl' || strategy === 'brrr') return calcBTL(form)
  if (strategy === 'social' || strategy === 'supported') return calcBTL({ ...form, expenses: form.expenses || '10' })
  if (strategy === 'hmo') return calcHMO(form)
  if (strategy === 'r2r') return calcR2R(form)
  if (strategy === 'flip') return calcFlip(form)
  if (strategy === 'land') return calcLand(form)
  return {}
}

// Runs the AI Deal Decision Engine on top of an EXISTING deal saved by the
// Deal Analyser (app/invest/page.tsx -> investment_deals table). This route
// does not recompute the deal from scratch as a second, independent
// calculator -- it reads the deal's saved strategy + form data, re-derives
// the same base result via lib/dealCalculators.ts (the exact functions
// page.tsx uses), then hands everything to the deterministic rule engine
// in lib/dealDecisionEngine.ts. Claude is only used afterwards, to turn the
// already-decided, already-computed output into plain-English narrative --
// it is explicitly instructed never to do arithmetic or change the status.
export async function POST(req: NextRequest) {
  const user_id = await requireUser(req)
  if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await req.json()
  if (!dealId) return NextResponse.json({ error: 'dealId is required' }, { status: 400 })

  const { data: deal, error: dealErr } = await serviceClient
    .from('investment_deals')
    .select('*')
    .eq('id', dealId)
    .eq('user_id', user_id)
    .maybeSingle()

  if (dealErr) return NextResponse.json({ error: dealErr.message }, { status: 500 })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const strategy = deal.strategy
  const form = deal.data?.form ?? deal.data ?? {}

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
  const rules: DecisionRules = userRules || DEFAULT_RULES[strategy] || {}

  const baseResult = runCalc(strategy, form)
  const engineOutput = runDecisionEngine(strategy, form, baseResult, rules)

  // AI explanation step -- summarisation only. The prompt hands Claude the
  // already-computed, already-decided output and forbids it from doing
  // math or changing PASS/REVIEW/REJECT.
  const summaryPrompt = `You are writing a factual deal verdict summary for a property investor. You are given an ALREADY-COMPUTED analysis below. Do not perform any arithmetic. Do not change the STATUS. Do not invent any figures, sources, or information not present below. Where information is MISSING, say "not verified" or "unknown" -- never guess a value. Avoid vague language like "this looks like a great deal".

Respond in exactly this format:
SUMMARY: (one or two factual sentences on the deal's numbers and status)
WHY:
1. ...
2. ...
(one line per meaningful rule result or risk -- use the data below, don't add new claims)
NEXT ACTIONS:
1. ...
2. ...
(concrete next steps derived only from MISSING/REVIEW/FAIL items below)

DEAL DATA:
Strategy: ${strategy}
Address: ${form.address || 'not provided'}
STATUS: ${engineOutput.status}

RULE RESULTS:
${engineOutput.ruleResults.map(r => `- ${r.rule}: ${r.result} (value: ${r.value}, threshold: ${r.threshold})`).join('\n')}

STRESS TEST RESULTS:
${engineOutput.stressResults.map(s => `- ${s.label}: monthly cashflow £${s.monthlyCashflow.toFixed(0)}`).join('\n')}

BREAK-EVEN OCCUPANCY: ${engineOutput.breakEvenOccupancy !== null ? engineOutput.breakEvenOccupancy + '%' : 'N/A for this strategy'}

MISSING FIELDS: ${engineOutput.missingFields.join(', ') || 'none'}

RISK FLAGS:
${engineOutput.riskFlags.map(r => `- ${r}`).join('\n') || '- none identified'}`

  const ai = await callClaude(summaryPrompt, 'Write the deal verdict summary now, following the exact format specified.', 900)

  const analysisRecord = {
    user_id,
    deal_id: dealId,
    strategy,
    rules_snapshot: rules,
    stress_assumptions: engineOutput.stressResults,
    inputs_confidence: engineOutput.fieldConfidence,
    rule_results: engineOutput.ruleResults,
    stress_results: engineOutput.stressResults,
    break_even: engineOutput.breakEvenOccupancy,
    missing_fields: engineOutput.missingFields,
    risk_flags: engineOutput.riskFlags,
    checklist: engineOutput.checklist,
    status: engineOutput.status,
    ai_summary: ai.text || null,
    ai_reasons: null,
    ai_next_actions: null,
  }

  const { data: saved, error: saveErr } = await serviceClient
    .from('deal_analyses')
    .insert(analysisRecord)
    .select()
    .single()

  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 })

  return NextResponse.json({
    ...saved,
    ai_error: ai.error || null, // surfaced but non-fatal -- the deterministic result is still valid and saved even if the AI narration failed
  })
}
