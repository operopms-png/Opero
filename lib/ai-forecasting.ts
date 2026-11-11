// Two forward-looking agents. Both only draft into the approvals queue; nothing is sent
// until a person approves it.
//   maint_predict   : spots properties with repeat or growing repair problems and drafts a
//                     preventive-work note to the landlord.
//   market_forecast : monthly rent outlook for the business's lettings, comparing today's rent
//                     with live market rates, emailed to the business owner.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { runEstimate } from './earnings-estimate'
import { styleInstructions } from './ai-style'
import { svc, aiTask, aiTaskBy, freshCounts, enabledBusinesses, companyName, dayStr, firstName } from './ai-proposal-utils'

// ---------- predictive maintenance ----------
const CATEGORIES: [string, RegExp][] = [
  ['heating or boiler', /boiler|heating|radiator|hot water|thermostat/i],
  ['leaks, plumbing or damp', /leak|plumb|drip|damp|mould|mold|pipe|drain|blocked|toilet|tap|flood/i],
  ['electrics', /electric|fuse|socket|wiring|power|light|trip|breaker/i],
  ['roof or structure', /roof|gutter|ceiling|crack|window|door|structur/i],
  ['appliances', /oven|cooker|fridge|freezer|washing|dishwasher|dryer|appliance|extractor/i],
  ['air conditioning', /\ba\/?c\b|air.?con|aircon|cooling/i],
]
const categorise = (text: string) => CATEGORIES.find(([, re]) => re.test(text))?.[0] ?? null

export async function proposeMaintenancePredictions() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('maint_predict')
  result.businesses = businesses.length
  const since = new Date(Date.now() - 365 * 86400000).toISOString()

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: jobs } = await db.from('pm_maintenance').select('id, property_id, title, description, created_at').eq('user_id', businessId).gte('created_at', since).not('property_id', 'is', null)
    const byKey = new Map<string, { property_id: string; category: string; rows: any[] }>()
    for (const j of jobs ?? []) {
      const cat = categorise(`${j.title ?? ''} ${j.description ?? ''}`)
      if (!cat) continue
      const k = `${j.property_id}|${cat}`
      if (!byKey.has(k)) byKey.set(k, { property_id: j.property_id, category: cat, rows: [] })
      byKey.get(k)!.rows.push(j)
    }
    // A repeat is two or more jobs of the same kind at one property within the year.
    const repeats = [...byKey.values()].filter(g => g.rows.length >= 2).sort((a, b) => b.rows.length - a.rows.length).slice(0, 8)

    for (const g of repeats) {
      const { data: prop } = await db.from('pm_properties').select('name, address, owner_id').eq('id', g.property_id).eq('user_id', businessId).maybeSingle()
      if (!prop) continue
      const where = prop.name || prop.address || 'the property'
      const { data: landlord } = prop.owner_id
        ? await db.from('pm_landlords').select('name, email').eq('id', prop.owner_id).eq('user_id', businessId).maybeSingle()
        : { data: null }
      if (!landlord?.email) { result.noRecipient++; await aiTaskBy('maint_predict', businessId, `Look at repeat ${g.category} problems at ${where}`, `${g.rows.length} ${g.category} jobs in the last 12 months and no landlord email to send a note to. Consider a preventive inspection.`, 3); continue }

      const history = g.rows.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(r => `- ${r.created_at.slice(0, 10)}: ${r.title ?? 'job'}${r.description ? ` (${String(r.description).slice(0, 120)})` : ''}`).join('\n')
      const system = `You are a property manager writing to a landlord. The records below show repeat repair jobs of the same kind at their property. Write a short, plain email body (no subject line, no emojis) that: states the facts from the records, explains in one or two sentences why repeat jobs like this often point to an underlying cause, and recommends a preventive inspection or servicing, offering to arrange it. Do not state costs, causes or guarantees you do not know. Address the landlord as ${firstName(landlord.name) || 'there'} and sign off as ${sign}.${await styleInstructions(businessId, 'maint_predict')}`
      const { text, error } = await callClaude(system, `Property: ${where}\nProblem area: ${g.category}\nJobs in the last 12 months (${g.rows.length}):\n${history}`, 500)
      if (error || !text) { result.errors.push(`maint_predict ${g.property_id}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'maint_predict', actionType: 'email_out',
        title: `Repeat ${g.category} at ${where}`, propertyName: where, draftBody: text.trim(),
        payload: { to: landlord.email, subject: `Preventive check recommended - ${where}`, predict_key: `${g.property_id}|${g.category}` },
        context: { summary: `${g.rows.length} ${g.category} jobs in 12 months · will be emailed to ${landlord.name}` },
        dedupe: { key: 'predict_key', value: `${g.property_id}|${g.category}`, sinceIso: dayStr(-90) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- market forecast ----------
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$', EUR: '€', AED: 'AED ', CAD: 'C$' }

export async function proposeMarketForecast() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('market_forecast')
  result.businesses = businesses.length
  const month = dayStr().slice(0, 7)

  for (const businessId of businesses) {
    const { data: u } = await db.auth.admin.getUserById(businessId)
    const to = u?.user?.email
    if (!to) { result.errors.push(`market_forecast ${businessId}: no owner email`); continue }
    const sign = await companyName(businessId)
    const { data: props } = await db.from('estate_properties').select('id, name, address, type, bedrooms, bathrooms, rent, currency, country').eq('user_id', businessId).is('ended_at', null).gt('rent', 0).limit(6)
    const cache = new Map<string, any>()
    const lines: string[] = []
    for (const p of props ?? []) {
      const cur = (['GBP', 'JMD', 'USD'].includes(String(p.currency)) ? p.currency : 'GBP') as 'GBP' | 'JMD' | 'USD'
      const area = String(p.address ?? '').split(',').slice(-2).join(',').trim() || String(p.address ?? '')
      if (!area) continue
      const key = `${area}|${p.bedrooms ?? ''}|${cur}`
      if (!cache.has(key)) cache.set(key, await runEstimate({ location: area, country: p.country, propertyType: p.type, bedrooms: Number(p.bedrooms) || null, bathrooms: Number(p.bathrooms) || null, currency: cur }).catch(() => null))
      const est = cache.get(key)
      const m = est?.long_let
      if (!m?.monthly_typical) { lines.push(`${p.name}: current rent ${SYM[cur]}${Math.round(p.rent)} a month. No reliable market data found this month.`); continue }
      const gap = Math.round(((m.monthly_typical - Number(p.rent)) / Number(p.rent)) * 100)
      lines.push(`${p.name}: current rent ${SYM[cur]}${Math.round(p.rent)} a month. Market for similar homes: ${SYM[cur]}${Math.round(m.monthly_low ?? m.monthly_typical)} to ${SYM[cur]}${Math.round(m.monthly_high ?? m.monthly_typical)}, typical ${SYM[cur]}${Math.round(m.monthly_typical)} (${gap >= 0 ? '+' : ''}${gap}% against current rent, confidence ${m.confidence}). Basis: ${m.basis}`)
    }
    if (!lines.length) { result.skipped++; continue }
    const system = `You are a lettings analyst writing a short monthly rent outlook for the owner of a lettings business. Use ONLY the figures below; do not invent any number. For each property say in one sentence whether the rent looks below, in line with, or above the market and what you suggest (hold, review at next renewal, or raise), being cautious where confidence is low. Then one closing sentence on the overall picture. Plain professional English, no emojis, no headings, no markdown. Sign off as ${sign}.${await styleInstructions(businessId, 'market_forecast')}`
    const { text, error } = await callClaude(system, `Month: ${month}\n${lines.join('\n')}`, 900)
    if (error || !text) { result.errors.push(`market_forecast ${businessId}: ${error ?? 'no text'}`); continue }
    const q = await queueAiAction({
      userId: businessId, agentKey: 'market_forecast', actionType: 'email_out',
      title: `Rent outlook, ${month}`, draftBody: `${text.trim()}\n\nThe figures:\n${lines.map(l => '- ' + l).join('\n')}`,
      payload: { to, subject: `Rent outlook, ${month}`, forecast_month: month },
      context: { summary: `Live market rates vs your rents · will be emailed to ${to}` },
      dedupe: { key: 'forecast_month', value: month },
    })
    if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
  }
  return result
}
