// "What could your property earn?" — the AI estimate behind the landlord
// earnings checker on sangstersgroup.com (public/sg-earnings.js) and the
// Landlord Leads page in the portal.
//
// Two web searches run at the same time (holiday let and long let) so the
// whole thing stays inside the 60-second server limit. Listing links are only
// kept if they actually came back from the search, so the AI can't invent one.

export type EstimateInput = {
  location: string; country?: string | null; propertyType?: string | null
  bedrooms?: number | null; bathrooms?: number | null; furnished?: string | null; currency: 'USD' | 'JMD' | 'GBP'
}

export type Comp = { title: string; location: string; price_text: string; url: string | null; source: string }
export type ShortLet = { nightly_low: number | null; nightly_typical: number | null; nightly_high: number | null; occupancy_pct: number | null; monthly_low: number | null; monthly_typical: number | null; monthly_high: number | null; basis: string; comparables: Comp[]; confidence: string }
export type LongLet = { monthly_low: number | null; monthly_typical: number | null; monthly_high: number | null; basis: string; comparables: Comp[]; confidence: string }
export type Estimate = { currency: string; short_let: ShortLet | null; long_let: LongLet | null; summary: string; checkedAt: string }

const CUR: Record<string, string> = { USD: 'US dollars ($)', JMD: 'Jamaican dollars (J$)', GBP: 'British pounds (£)' }
export const SYM: Record<string, string> = { USD: '$', JMD: 'J$', GBP: '£' }

const BASE = (cur: string) => `You are a property market analyst for a property management company in Jamaica, the UK and the UAE.
Use web search to find REAL, CURRENT listings near the location given (Airbnb, Booking.com, VRBO, Realtor.com, Terra Caribbean, Jamaica property and classified sites, Rightmove, Zoopla, SpareRoom, Property Finder, etc.). At most 2 searches.
Reply with ONLY a JSON object, no prose before or after.
All money in ${CUR[cur] || cur}. Convert from the listing's currency at the current rate when needed and keep the original in price_text.
Only use listings you actually saw in search results, with their real URL. Never invent a listing, price or URL. If data is thin, give your best range and set confidence to Low.`

const SHORT = `JSON shape (holiday / short-term let, furnished):
{"nightly_low":number,"nightly_typical":number,"nightly_high":number,"occupancy_pct":number,"monthly_low":number,"monthly_typical":number,"monthly_high":number,
 "basis":"what this is based on, e.g. '8 two-bed Airbnb listings in Rose Hall'",
 "comparables":[{"title":"short description","location":"area","price_text":"as shown, e.g. $120/night","url":"exact URL","source":"site"}],
 "confidence":"High"|"Medium"|"Low"}
Monthly figures = nightly rate × occupancy × 30 (show realistic occupancy for the area, not peak). 3-5 comparables.`

const LONG = `JSON shape (long-term let, monthly rent):
{"monthly_low":number,"monthly_typical":number,"monthly_high":number,
 "basis":"what this is based on, e.g. '6 two-bed houses to rent in Mandeville'",
 "comparables":[{"title":"short description","location":"area","price_text":"as shown, e.g. J$120,000/month","url":"exact URL","source":"site"}],
 "confidence":"High"|"Medium"|"Low"}
3-5 comparables.`

function describe(i: EstimateInput) {
  return [`Location: ${i.location}${i.country ? `, ${i.country}` : ''}`, `Property type: ${i.propertyType || 'not given'}`, `Bedrooms: ${i.bedrooms ?? 'not given'}`, `Bathrooms: ${i.bathrooms ?? 'not given'}`, `Furnished: ${i.furnished || 'not given'}`].join('\n')
}

function clean(u: string) { try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/$/, '').toLowerCase() } catch { return u } }
function extractJSON(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  for (const t of fence ? [fence[1], text] : [text]) {
    const end = t.lastIndexOf('}')
    for (let i = t.indexOf('{'); i !== -1 && i < end; i = t.indexOf('{', i + 1)) {
      try { const o = JSON.parse(t.slice(i, end + 1)); if (o && typeof o === 'object') return o } catch {}
    }
  }
  return null
}
const num = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.round(x) : null }

async function ask(system: string, user: string): Promise<{ out: any; found: Map<string, string> } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  const ctrl = new AbortController(); const stop = setTimeout(() => ctrl.abort(), 48000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, system, messages: [{ role: 'user', content: user }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const found = new Map<string, string>()
    for (const blk of data.content ?? []) if (blk.type === 'web_search_tool_result' && Array.isArray(blk.content)) for (const r of blk.content) if (r?.url) found.set(clean(r.url), r.url)
    const text = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n')
    const out = extractJSON(text)
    return out ? { out, found } : null
  } catch { return null } finally { clearTimeout(stop) }
}

function comps(list: any, found: Map<string, string>): Comp[] {
  return (Array.isArray(list) ? list : []).slice(0, 5).map((x: any) => {
    const u = typeof x?.url === 'string' ? clean(x.url) : ''
    const ok = u && (found.has(u) || [...found.keys()].some(f => f.includes('/') && (f.startsWith(u + '/') || u.startsWith(f + '/'))))
    return { title: String(x?.title || '').slice(0, 120), location: String(x?.location || '').slice(0, 80), price_text: String(x?.price_text || '').slice(0, 60), url: ok ? x.url : null, source: String(x?.source || '').slice(0, 40) }
  }).filter(c => c.title)
}
const conf = (c: any) => ['High', 'Medium', 'Low'].includes(c) ? c : 'Low'

export async function runEstimate(i: EstimateInput): Promise<Estimate> {
  const prop = describe(i)
  const [s, l] = await Promise.all([
    ask(BASE(i.currency) + '\n\n' + SHORT, `${prop}\n\nWhat could this property earn as a furnished holiday let (Airbnb-style)? Return the JSON.`),
    ask(BASE(i.currency) + '\n\n' + LONG, `${prop}\n\nWhat monthly rent could this property get on a normal long-term let? Return the JSON.`),
  ])
  const short_let: ShortLet | null = s ? {
    nightly_low: num(s.out.nightly_low), nightly_typical: num(s.out.nightly_typical), nightly_high: num(s.out.nightly_high),
    occupancy_pct: num(s.out.occupancy_pct), monthly_low: num(s.out.monthly_low), monthly_typical: num(s.out.monthly_typical), monthly_high: num(s.out.monthly_high),
    basis: String(s.out.basis || '').slice(0, 240), comparables: comps(s.out.comparables, s.found), confidence: conf(s.out.confidence),
  } : null
  const long_let: LongLet | null = l ? {
    monthly_low: num(l.out.monthly_low), monthly_typical: num(l.out.monthly_typical), monthly_high: num(l.out.monthly_high),
    basis: String(l.out.basis || '').slice(0, 240), comparables: comps(l.out.comparables, l.found), confidence: conf(l.out.confidence),
  } : null
  const S = SYM[i.currency] || ''
  const f = (n: number | null) => n == null ? '—' : S + n.toLocaleString('en-GB')
  const parts = [
    short_let?.monthly_typical ? `As a holiday let, about ${f(short_let.monthly_typical)} a month (${f(short_let.monthly_low)}–${f(short_let.monthly_high)})` : '',
    long_let?.monthly_typical ? `as a long let, about ${f(long_let.monthly_typical)} a month (${f(long_let.monthly_low)}–${f(long_let.monthly_high)})` : '',
  ].filter(Boolean)
  return { currency: i.currency, short_let, long_let, summary: parts.join('; ') + (parts.length ? '.' : ''), checkedAt: new Date().toISOString() }
}

export function money(n: number | null | undefined, cur: string) { return n == null ? '—' : (SYM[cur] || '') + Math.round(n).toLocaleString('en-GB') }
