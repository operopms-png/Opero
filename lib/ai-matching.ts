// Property matching. Reads what an enquirer wants, scores the business's listed properties against it,
// and drafts a reply that names the best matches. The draft waits in AI Approvals; nothing is sent by this file.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, companyName, firstName } from './ai-proposal-utils'
import { styleInstructions } from './ai-style'

export type Criteria = { bedrooms_min?: number | null; bedrooms_max?: number | null; max_rent?: number | null; area?: string | null; country?: string | null; type?: string | null; keywords?: string[] }
export type Match = { id: string; name: string; address: string | null; bedrooms: number | null; rent: number | null; currency: string | null; score: number; reasons: string[] }

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null)

export async function readCriteria(enquiry: string): Promise<Criteria | { error: string }> {
  const system = 'You read a property enquiry and pull out what the person wants. Return only JSON: {"bedrooms_min": number|null, "bedrooms_max": number|null, "max_rent": number|null, "area": "town, area or street"|null, "country": string|null, "type": "flat|house|room|studio|villa|apartment"|null, "keywords": ["must-have features such as garden, parking, pets, furnished"]}. Use null when the enquiry does not say. Never guess.'
  const r = await callClaude(system, enquiry.slice(0, 3000), 300)
  if (r.error) return { error: r.error }
  try {
    const t = r.text ?? ''
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
    return {
      bedrooms_min: num(j.bedrooms_min), bedrooms_max: num(j.bedrooms_max), max_rent: num(j.max_rent),
      area: typeof j.area === 'string' ? j.area : null, country: typeof j.country === 'string' ? j.country : null,
      type: typeof j.type === 'string' ? j.type : null, keywords: Array.isArray(j.keywords) ? j.keywords.map(String).slice(0, 8) : [],
    }
  } catch { return { error: 'Could not read what the enquirer wants.' } }
}

const unavailable = /let|rented|sold|occupied|off.?market|withdrawn/i

export async function findMatches(businessId: string, c: Criteria): Promise<Match[]> {
  const { data } = await svc().from('estate_properties')
    .select('id,name,address,type,bedrooms,rent,status,currency,description,features,web_area,country,listed,show_on_website')
    .eq('user_id', businessId).limit(500)
  const out: Match[] = []
  for (const p of (data ?? []) as any[]) {
    if (!(p.listed || p.show_on_website)) continue
    if (p.status && unavailable.test(String(p.status))) continue
    let score = 0; const reasons: string[] = []
    const beds = num(p.bedrooms)
    if (beds != null && (c.bedrooms_min != null || c.bedrooms_max != null)) {
      const lo = c.bedrooms_min ?? c.bedrooms_max!, hi = c.bedrooms_max ?? c.bedrooms_min!
      if (beds >= lo && beds <= hi) { score += 3; reasons.push(`${beds} bedroom${beds === 1 ? '' : 's'}`) }
      else if (Math.abs(beds - (beds < lo ? lo : hi)) === 1) { score += 1; reasons.push(`${beds} bedrooms, one off what was asked`) }
      else score -= 2
    }
    const rent = num(p.rent)
    if (rent != null && c.max_rent != null) {
      if (rent <= c.max_rent) { score += 3; reasons.push('within budget') }
      else if (rent <= c.max_rent * 1.1) { score += 1; reasons.push('slightly over budget') }
      else score -= 3
    }
    const where = `${p.address ?? ''} ${p.web_area ?? ''} ${p.name ?? ''}`.toLowerCase()
    if (c.area && where.includes(c.area.toLowerCase())) { score += 3; reasons.push(`in ${c.area}`) }
    if (c.country && p.country && String(p.country).toLowerCase().includes(c.country.toLowerCase())) { score += 1 }
    if (c.type && p.type && String(p.type).toLowerCase().includes(c.type.toLowerCase())) { score += 1; reasons.push(String(p.type).toLowerCase()) }
    const text = `${p.description ?? ''} ${JSON.stringify(p.features ?? '')}`.toLowerCase()
    for (const k of c.keywords ?? []) if (k && text.includes(k.toLowerCase())) { score += 1; reasons.push(k) }
    if (score > 0) out.push({ id: p.id, name: p.name, address: p.address, bedrooms: beds, rent, currency: p.currency ?? null, score, reasons })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3)
}

const money = (m: Match) => m.rent == null ? 'rent on request' : `${m.currency === 'GBP' || !m.currency ? '£' : m.currency + ' '}${m.rent.toLocaleString('en-GB')} per month`

// Draft the reply. Uses only the facts of the matched properties.
export async function draftReply(businessId: string, name: string | null, enquiry: string, matches: Match[]) {
  const sign = await companyName(businessId)
  const facts = matches.map((m, i) => `${i + 1}. ${m.name}${m.address ? `, ${m.address}` : ''}. ${m.bedrooms ?? '?'} bedrooms. ${money(m)}. Why it fits: ${m.reasons.join(', ') || 'general fit'}.`).join('\n')
  const system = `You write a short, warm email from an estate agency replying to a property enquiry. Recommend only the properties listed below and use only the facts given: do not invent features, views, distances or condition. Say why each one suits what the person asked for, then offer to arrange a viewing. Plain professional English, no emojis, under 160 words. Start with "${name ? `Dear ${firstName(name)},` : 'Hello,'}" and finish with "Kind regards," then "${sign}".\n\nWhat they asked for:\n${enquiry.slice(0, 1500)}\n\nProperties:\n${facts}${await styleInstructions(businessId, 'ea_matching')}`
  const r = await callClaude(system, 'Write the email.', 500)
  return r.text?.trim() || null
}

export async function queueMatchReply(businessId: string, input: { name: string | null; email: string; enquiry: string; matches: Match[]; body: string }) {
  return queueAiAction({
    userId: businessId, agentKey: 'ea_matching', actionType: 'email_out',
    title: `Property matches for ${input.name || input.email}`, propertyName: input.matches[0]?.name ?? null, draftBody: input.body,
    payload: { to: input.email, subject: 'Properties that suit what you are looking for', match_ref: `${input.email}:${Date.now()}` },
    context: { summary: `${input.matches.length} matching propert${input.matches.length === 1 ? 'y' : 'ies'} · will be emailed to ${input.name || input.email}` },
  })
}
