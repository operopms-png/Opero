// Goal planner. A client states a target in plain words ("50 units in Manchester by June"). The numbers on progress,
// pipeline and pace are worked out here in code; the AI only words the weekly report and never does the arithmetic.
import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type Target = { metric: 'properties' | 'units' | 'monthly_income'; amount: number; location: string; deadline: string | null; currency: string; strategy: string; maxPrice: number | null }
export type Goal = { id: string; user_id: string; text: string; target: Target; status: string; brief_id: string | null; last_report: string | null; last_review: string | null; created_at: string }

// Share of deals at each stage that are expected to complete (an assumption, shown to the client)
export const STAGE_ODDS: Record<string, number> = { Found: 0.05, Screened: 0.12, Offer: 0.4, 'Due diligence': 0.7 }
const FIND_TO_COMPLETE = 0.05

function extractJSON(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  for (const t of fence ? [fence[1], text] : [text]) {
    const end = t.lastIndexOf('}')
    for (let i = t.indexOf('{'); i !== -1 && i < end; i = t.indexOf('{', i + 1)) { try { const o = JSON.parse(t.slice(i, end + 1)); if (o && typeof o === 'object') return o } catch {} }
  }
  return null
}
const n = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : null }

export async function parseGoal(text: string): Promise<Target | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { text: out } = await callClaude(
    `Turn an investor's goal into JSON only: {"metric":"properties|units|monthly_income","amount":number,"location":"","deadline":"YYYY-MM-DD or null","currency":"GBP|JMD|USD","strategy":"btl|brrr|hmo|r2r|flip|land|other","maxPrice":number|null}. Today is ${today}. Resolve phrases like "by June" to the next such date. "units" means lettable homes or rooms; use "properties" for buildings. Use "monthly_income" when the target is rent per month. No other text.`,
    text.slice(0, 600), 250)
  const o = extractJSON(out || '')
  if (!o || !n(o.amount) || !['properties', 'units', 'monthly_income'].includes(o.metric)) return null
  const d = typeof o.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.deadline) && o.deadline > today ? o.deadline : null
  return { metric: o.metric, amount: n(o.amount)!, location: String(o.location || '').slice(0, 100), deadline: d, currency: ['GBP', 'JMD', 'USD'].includes(o.currency) ? o.currency : 'GBP', strategy: String(o.strategy || 'btl').slice(0, 10), maxPrice: n(o.maxPrice) }
}

export type Progress = {
  current: number; target: number; remaining: number; pct: number; weeksLeft: number | null
  pipeline: Record<string, number>; expected: number; recentPerWeek: number; neededPerWeek: number | null
  state: 'done' | 'on_track' | 'behind' | 'open'; unit: string
}

export async function progress(userId: string, g: { target: Target }): Promise<Progress> {
  const d = db(); const t = g.target
  const loc = t.location.split(',')[0].trim().replace(/[%,()]/g, '')
  let pq = d.from('pm_properties').select('id, monthly_income').eq('user_id', userId).is('ended_at', null)
  if (loc) pq = pq.or(`address.ilike.%${loc}%,city.ilike.%${loc}%,name.ilike.%${loc}%`)
  const { data: props } = await pq
  const ids = (props ?? []).map((p: any) => p.id)
  let units = 0, unitRent = 0
  if (t.metric !== 'properties' && ids.length) {
    const { data: u } = await d.from('pm_units').select('monthly_rent').eq('user_id', userId).in('property_id', ids)
    units = u?.length ?? 0; unitRent = (u ?? []).reduce((a: number, x: any) => a + (Number(x.monthly_rent) || 0), 0)
  }
  const propIncome = (props ?? []).reduce((a: number, p: any) => a + (Number(p.monthly_income) || 0), 0)
  const current = t.metric === 'properties' ? ids.length : t.metric === 'units' ? Math.max(units, ids.length) : Math.max(unitRent, propIncome)

  const since = new Date(Date.now() - 28 * 86400000).toISOString()
  const { data: deals } = await d.from('investment_deals').select('stage, created_at, address, data').eq('user_id', userId)
  const inLoc = (x: any) => !loc || String(x.address || '').toLowerCase().includes(loc.toLowerCase())
  const pipeline: Record<string, number> = { Found: 0, Screened: 0, Offer: 0, 'Due diligence': 0 }
  let recent = 0, rentSum = 0, rentN = 0
  for (const x of deals ?? []) {
    if (!inLoc(x)) continue
    if (x.stage in pipeline) pipeline[x.stage]++
    if (x.created_at >= since) recent++
    const r = Number(x.data?.form?.rent); if (r > 0) { rentSum += r; rentN++ }
  }
  const unitValue = t.metric === 'monthly_income' ? (ids.length && propIncome ? propIncome / ids.length : rentN ? rentSum / rentN : 0) : 1
  const expectedDeals = Object.entries(pipeline).reduce((a, [s, c]) => a + c * (STAGE_ODDS[s] ?? 0), 0)
  const expected = expectedDeals * (unitValue || 0)
  const remaining = Math.max(0, t.amount - current)
  const weeksLeft = t.deadline ? Math.max(0, Math.ceil((new Date(t.deadline).getTime() - Date.now()) / (7 * 86400000))) : null
  const uncovered = Math.max(0, remaining - expected)
  const neededPerWeek = weeksLeft && unitValue ? Math.ceil(uncovered / unitValue / FIND_TO_COMPLETE / weeksLeft) : null
  const recentPerWeek = Math.round((recent / 4) * 10) / 10
  const state: Progress['state'] = remaining === 0 ? 'done' : !t.deadline ? 'open' : (uncovered === 0 || (neededPerWeek !== null && recentPerWeek >= neededPerWeek)) ? 'on_track' : 'behind'
  return { current, target: t.amount, remaining, pct: Math.min(100, Math.round((current / t.amount) * 100)), weeksLeft, pipeline, expected: Math.round(expected * 10) / 10, recentPerWeek, neededPerWeek, state, unit: t.metric === 'monthly_income' ? (t.currency + ' a month') : t.metric }
}

// Keeps a deal-finder search pointed at the goal, then writes the weekly report. Returns the report text.
export async function reviewGoal(g: Goal) {
  const d = db(); const t = g.target
  let briefId = g.brief_id
  if (briefId) { const { data } = await d.from('deal_briefs').select('id').eq('id', briefId).maybeSingle(); if (!data) briefId = null }
  if (!briefId && t.location) {
    const text = `${t.strategy && t.strategy !== 'other' ? t.strategy.toUpperCase() + ' ' : ''}properties in ${t.location}${t.maxPrice ? ' under ' + t.currency + ' ' + t.maxPrice.toLocaleString('en-GB') : ''}, to reach the goal: ${g.text}`.slice(0, 1400)
    const { data: br } = await d.from('deal_briefs').insert({ user_id: g.user_id, text, criteria: { location: t.location, strategy: t.strategy, maxPrice: t.maxPrice, currency: t.currency } }).select('id').single()
    briefId = br?.id ?? null
  }
  const p = await progress(g.user_id, g)
  const facts = `Goal: ${g.text}\nNow: ${p.current} of ${p.target} ${p.unit} (${p.pct}%)\nRemaining: ${p.remaining}\nWeeks left: ${p.weeksLeft ?? 'no deadline'}\nPipeline: ${Object.entries(p.pipeline).map(([s, c]) => s + ' ' + c).join(', ')}\nExpected to complete from the pipeline: ${p.expected}\nDeals found per week lately: ${p.recentPerWeek}\nDeals per week needed: ${p.neededPerWeek ?? 'not worked out'}\nStatus: ${p.state.replace('_', ' ')}`
  const { text } = await callClaude('You write a short weekly progress note on a property investor\'s goal. Use only the figures given, do no arithmetic, and invent nothing. Plain text, 3 or 4 sentences: where they stand, whether they are on pace, and the one thing to do this week (for example approve screened deals, widen the search area or budget, or move offers forward).', facts, 300)
  const report = (text || '').trim() || `${p.current} of ${p.target} ${p.unit} (${p.pct}%). ${p.state === 'behind' ? 'Behind pace.' : p.state === 'on_track' ? 'On pace.' : ''}`
  await d.from('portfolio_goals').update({ brief_id: briefId, last_report: report, last_review: new Date().toISOString() }).eq('id', g.id)
  return { report, progress: p }
}
