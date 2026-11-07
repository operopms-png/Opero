// Investment & Portfolio Intelligence: what the managed portfolio earns, costs and is worth.
// Rent, costs and loans come from your own records. Values are estimates from a web search of
// comparable sales and asking prices, labelled as estimates wherever they are shown.
import { callClaude, callClaudeWithSearch } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses, dayStr, niceDate } from './ai-proposal-utils'
import { styleInstructions } from './ai-style'

export type Value = { low: number | null; typical: number | null; high: number | null; confidence: string | null; basis: string | null; sources: string[]; checked_at: string }
export type PortfolioRow = {
  id: string; name: string; address: string | null; city: string | null; currency: string
  units: number; occupied: number; rentIn: number; headRent: number; utilities: number; mortgage: number; loan: number
  cashFlow: number; value: Value | null; grossYield: number | null; netYield: number | null; headLeaseExpiry: string | null; loanEnd: string | null
}
const LET = /occup|let|rent|tenant|active/i
const VACANT = /vacan|void|empty|available/i
const num = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const cur = (p: any) => p.currency || (/jamaica|st\.? james/i.test(p.country || '') ? 'JMD' : 'GBP')

export async function loadPortfolio(biz: string) {
  const db = svc()
  const q = <T,>(p: PromiseLike<{ data: T[] | null }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [] as T[])
  const [props, units, heads, mort, utils, vals, pays, devs] = await Promise.all([
    q<any>(db.from('pm_properties').select('id, name, address, city, country, currency, status, monthly_income').eq('user_id', biz).is('ended_at', null)),
    q<any>(db.from('pm_units').select('property_id, monthly_rent, status').eq('user_id', biz)),
    q<any>(db.from('pm_head_leases').select('property_id, rent_payable, expiry_date').eq('user_id', biz)),
    q<any>(db.from('pm_mortgages').select('property_id, amount, monthly_payment, end_date').eq('user_id', biz)),
    q<any>(db.from('pm_utilities').select('property_id, monthly_amount').eq('user_id', biz)),
    q<any>(db.from('ai_property_values').select('property_id, low, typical, high, confidence, basis, sources, checked_at').eq('user_id', biz).eq('module', 'pm')),
    q<any>(db.from('pm_rent_payments').select('property_id, amount, paid_date, status').eq('user_id', biz).gte('paid_date', dayStr(-365))),
    q<any>(db.from('dev_projects').select('id, name, status, total_budget, spent, end_date').eq('user_id', biz)),
  ])
  const rows: PortfolioRow[] = props.filter((p: any) => !/sold|archiv/i.test(String(p.status ?? ''))).map((p: any) => {
    const us = units.filter((u: any) => u.property_id === p.id)
    const occ = us.filter((u: any) => LET.test(String(u.status ?? '')) && !VACANT.test(String(u.status ?? '')))
    const unitRent = occ.reduce((s: number, u: any) => s + num(u.monthly_rent), 0)
    const rentIn = us.length ? unitRent : num(p.monthly_income)
    const hl = heads.filter((h: any) => h.property_id === p.id)
    const headRent = hl.reduce((s: number, h: any) => s + num(h.rent_payable), 0)
    const utilities = utils.filter((u: any) => u.property_id === p.id).reduce((s: number, u: any) => s + num(u.monthly_amount), 0)
    const ml = mort.filter((m: any) => m.property_id === p.id)
    const mortgage = ml.reduce((s: number, m: any) => s + num(m.monthly_payment), 0)
    const v = vals.find((x: any) => x.property_id === p.id)
    const value: Value | null = v && num(v.typical) > 0 ? { low: num(v.low) || null, typical: num(v.typical), high: num(v.high) || null, confidence: v.confidence, basis: v.basis, sources: Array.isArray(v.sources) ? v.sources : [], checked_at: v.checked_at } : null
    const annualRent = rentIn * 12, annualCosts = (headRent + utilities) * 12
    return {
      id: p.id, name: p.name || p.address || 'Property', address: p.address, city: p.city, currency: cur(p),
      units: us.length, occupied: occ.length, rentIn, headRent, utilities, mortgage, loan: ml.reduce((s: number, m: any) => s + num(m.amount), 0),
      cashFlow: rentIn - headRent - utilities - mortgage, value,
      grossYield: value && annualRent > 0 ? (annualRent / value.typical!) * 100 : null,
      netYield: value && annualRent > 0 ? ((annualRent - annualCosts) / value.typical!) * 100 : null,
      headLeaseExpiry: hl.map((h: any) => h.expiry_date).filter(Boolean).sort()[0] ?? null,
      loanEnd: ml.map((m: any) => m.end_date).filter(Boolean).sort()[0] ?? null,
    }
  })
  // Rent actually received each month, by currency of the property it was for.
  const curOf = new Map(rows.map(r => [r.id, r.currency]))
  const trend: Record<string, Record<string, number>> = {}
  for (const pay of pays) {
    if (String(pay.status).toLowerCase() !== 'paid' || !pay.paid_date) continue
    const c = curOf.get(pay.property_id); if (!c) continue
    const m = String(pay.paid_date).slice(0, 7)
    ;(trend[c] ??= {})[m] = (trend[c][m] ?? 0) + num(pay.amount)
  }
  const developments = devs.map((d: any) => ({ id: d.id, name: d.name, status: d.status, budget: num(d.total_budget), spent: num(d.spent), endDate: d.end_date }))
  return { rows, trend, developments, hasValues: vals.length > 0 }
}

function parseJson(text?: string) {
  const m = text?.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

// Web search for what similar homes sell for nearby. Estimates only: never a formal valuation.
export async function refreshValuations(biz: string, max = 5) {
  const db = svc()
  const out = { checked: 0, saved: 0, errors: [] as string[] }
  const { data: props } = await db.from('pm_properties').select('id, name, address, city, country, currency, bedrooms, bathrooms').eq('user_id', biz).is('ended_at', null)
  const { data: have } = await db.from('ai_property_values').select('property_id, checked_at').eq('user_id', biz).eq('module', 'pm')
  const fresh = new Set((have ?? []).filter((h: any) => h.checked_at > dayStr(-90)).map((h: any) => h.property_id))
  const todo = (props ?? []).filter((p: any) => !fresh.has(p.id) && (p.address || p.city)).slice(0, max)
  for (const p of todo as any[]) {
    out.checked++
    const c = cur(p)
    const system = `You estimate the current market sale value of a residential property from a web search of recent comparable sales and asking prices nearby.
Reply with ONLY a JSON object: {"low":number,"typical":number,"high":number,"basis":"what it is based on, one sentence","confidence":"High"|"Medium"|"Low","sources":["site names only"]}
All money in ${c}. Use only what you found in search results. Never invent figures. If you cannot find enough, set "typical" to null and confidence to "Low".`
    const desc = [p.address, p.city, p.country].filter(Boolean).join(', ')
    const { text, error } = await callClaudeWithSearch(system, `Property: ${desc}\nBedrooms: ${p.bedrooms ?? 'not given'}\nBathrooms: ${p.bathrooms ?? 'not given'}`, 1200)
    const j = parseJson(text)
    const typical = Number(j?.typical), low = Number(j?.low), high = Number(j?.high)
    if (error || !j || !(typical > 0) || !(low > 0) || !(high > 0) || low > typical || typical > high) { out.errors.push(`${p.name}: ${error ?? 'no usable estimate'}`); continue }
    const { error: e2 } = await db.from('ai_property_values').upsert({
      user_id: biz, module: 'pm', property_id: p.id, low, typical, high, currency: c, basis: String(j.basis ?? '').slice(0, 300),
      confidence: ['High', 'Medium', 'Low'].includes(j.confidence) ? j.confidence : 'Low', sources: (Array.isArray(j.sources) ? j.sources : []).slice(0, 6).map((s: any) => String(s).slice(0, 60)), checked_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module,property_id' })
    if (e2) out.errors.push(`${p.name}: ${e2.message}`); else out.saved++
  }
  return out
}

const fmt = (n: number, c: string) => ({ GBP: '£', JMD: 'J$', USD: '$' } as Record<string, string>)[c] + Math.round(n).toLocaleString('en-GB')

// Monthly review drafted for the owner to approve. Figures come from the records; the AI only
// writes the short summary and flags nothing the figures do not show.
export async function proposePortfolioReview() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('portfolio')
  result.businesses = businesses.length
  const month = dayStr().slice(0, 7)

  for (const biz of businesses) {
    await refreshValuations(biz, 5).catch(e => result.errors.push(String(e)))
    const { data: u } = await db.auth.admin.getUserById(biz)
    const to = u?.user?.email
    if (!to) { result.errors.push(`portfolio ${biz}: no owner email`); continue }
    const { rows } = await loadPortfolio(biz)
    if (!rows.length) continue
    const lines: string[] = [], flags: string[] = []
    for (const c of Array.from(new Set(rows.map(r => r.currency)))) {
      const rs = rows.filter(r => r.currency === c)
      const rent = rs.reduce((s, r) => s + r.rentIn, 0), cost = rs.reduce((s, r) => s + r.headRent + r.utilities, 0), mort = rs.reduce((s, r) => s + r.mortgage, 0)
      const valued = rs.filter(r => r.value), val = valued.reduce((s, r) => s + r.value!.typical!, 0)
      lines.push(`${c}: ${rs.length} properties, rent in ${fmt(rent, c)} a month, running costs ${fmt(cost, c)}, mortgage payments ${fmt(mort, c)}, cash flow ${fmt(rent - cost - mort, c)} a month`)
      if (valued.length) lines.push(`${c}: estimated value of ${valued.length} of ${rs.length} properties ${fmt(val, c)} (estimate from public listings, not a valuation)`)
    }
    for (const r of rows) {
      if (r.rentIn > 0 && r.cashFlow < 0) flags.push(`${r.name}: negative cash flow of ${fmt(-r.cashFlow, r.currency)} a month`)
      if (r.units > 0 && r.occupied < r.units) flags.push(`${r.name}: ${r.units - r.occupied} of ${r.units} units not let`)
      if (r.netYield != null && r.netYield < 4) flags.push(`${r.name}: net yield ${r.netYield.toFixed(1)}% on the estimated value`)
      if (r.headLeaseExpiry && r.headLeaseExpiry <= dayStr(180)) flags.push(`${r.name}: head lease ends ${niceDate(r.headLeaseExpiry)}`)
      if (r.loanEnd && r.loanEnd <= dayStr(365) && r.loanEnd >= dayStr()) flags.push(`${r.name}: mortgage ends ${niceDate(r.loanEnd)}`)
    }
    const system = `You write the opening paragraph of a monthly portfolio review for a property company's owner. Use only the figures and flags below. Three or four sentences, plain professional English. Say what looks sound and which properties deserve a closer look. No emojis. Do not recommend buying or selling, and do not invent numbers.\n\nFigures:\n${lines.join('\n')}\n\nFlags:\n${flags.length ? flags.join('\n') : 'None'}${await styleInstructions(biz, 'portfolio')}`
    const { text, error } = await callClaude(system, 'Write the opening paragraph.', 350)
    if (error || !text) { result.errors.push(`portfolio ${biz}: ${error ?? 'no text'}`); continue }
    const q = await queueAiAction({
      userId: biz, agentKey: 'portfolio', actionType: 'email_out',
      title: `Portfolio review, ${month}`, draftBody: `${text.trim()}\n\nFigures:\n${lines.map(l => '- ' + l).join('\n')}\n\nFor a closer look:\n${flags.length ? flags.map(f => '- ' + f).join('\n') : '- Nothing flagged'}`,
      payload: { to, subject: `Portfolio review, ${month}`, month },
      context: { summary: `Rent and costs from your records, values estimated from public listings · will be emailed to ${to}` },
      dedupe: { key: 'month', value: month },
    })
    if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
  }
  return result
}
