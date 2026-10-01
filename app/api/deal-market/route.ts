import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/admin-auth'

// Local market check for the Deal Analyser.
// Claude searches the web for real comparable listings near the deal and
// returns market low / typical / high for each of the deal's key figures,
// plus the comparables themselves with links. Links are only kept if they
// came back from the web search, so the AI can't invent a listing URL.
//
// POST { mode:'metric'|'overview', strategy, strategyLabel, location, bedrooms, propertyType, letting, metrics:[{key,label,value,unit,compare}] }
// The browser calls this once per figure plus once for the overview, all at
// the same time, so each search stays inside the 60s server limit.
// The response is streamed: spaces every few seconds to keep the connection
// open during the searches, then the JSON.

export const maxDuration = 60

type Metric = { key: string; label: string; value: number; unit: string; compare: string }

const BASE = `You are a property market analyst for an investor working in the UK and Jamaica.
Use web search to find REAL, CURRENT listings near the given location (Rightmove, Zoopla, OnTheMarket, SpareRoom, Airbnb, Booking.com, Realtor.com, Terra Caribbean, Jamaica property portals, etc.). Be quick: at most 2 searches.
Reply with ONLY a JSON object, no prose before or after.
All money in GBP. If listings are in JMD or USD, convert to GBP at the current rate and keep the original in price_text.
Only use listings you actually saw in search results, with their real URL. Never invent a listing, price or URL.`

const METRIC_SHAPE = `JSON shape:
{
 "benchmark": { "low": number, "typical": number, "high": number, "basis": "what this is based on, e.g. '7 two-bed flats to rent within 1 mile'", "count": number },
 "comparables": [ { "type": "For sale" | "Sold" | "To rent" | "Room" | "Short let" | "Land", "title": "short description", "location": "street/area", "beds": number|null, "price": number, "unit": "<same unit as the metric>", "price_text": "as shown on the listing", "url": "exact URL you found", "source": "site name" } ],
 "confidence": "High" | "Medium" | "Low"
}
Give 3-6 comparables, closest match first. The benchmark must be in the same unit as the metric. Match bedrooms and property type as closely as you can; if you had to widen the search, say so in basis. If data is thin, give your best range, a low count and Low confidence.`

const OVERVIEW_SHAPE = `JSON shape:
{
 "area": "two sentences max describing this local property market",
 "demand": "2-3 sentences on demand for this strategy here: who rents or buys, how fast things let or sell, seasonality",
 "watch_outs": [ "up to 5 points, each under 25 words, relevant to this strategy here: licensing / Article 4, oversupply, flood risk, crime, service charges, planning — only what you found or is standard for the area" ],
 "confidence": "High" | "Medium" | "Low",
 "confidence_reason": "one sentence on how solid the local data is"
}`

async function run(b: any) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'The AI isn’t configured on the server' }
  const location = String(b.location || '').trim().slice(0, 200)
  if (!location) return { error: 'Add the property’s location first' }
  const metrics: Metric[] = (Array.isArray(b.metrics) ? b.metrics : []).filter((m: any) => m && m.key && Number(m.value) > 0).slice(0, 6)

  const overview = b.mode === 'overview'
  const m = metrics[0]
  if (!overview && !m) return { error: 'No figure to compare' }
  const user = `Deal strategy: ${b.strategyLabel || b.strategy}
Location: ${location}
Property type: ${b.propertyType || 'not given'}
Bedrooms: ${b.bedrooms || 'not given'}
${b.letting ? `Letting type: ${b.letting}\n` : ''}
` + (overview
    ? 'Describe the local market for this strategy and return the JSON.'
    : `The investor's figure: ${m.label} = ${m.value} ${m.unit}.\nFind what the local market says by searching for: ${m.compare}.\nReturn the JSON.`)

  // Stop well before the 60s server limit so we can still answer
  const ctrl = new AbortController(); const stop = setTimeout(() => ctrl.abort(), 52000)
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: overview ? 1800 : 2400, system: BASE + '\n\n' + (overview ? OVERVIEW_SHAPE : METRIC_SHAPE),
        messages: [{ role: 'user', content: user }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      }),
    })
  } catch { clearTimeout(stop); return { error: 'That search took too long' } }
  clearTimeout(stop)
  if (!res.ok) return { error: `The market search is unavailable right now (${res.status})` }
  const data = await res.json()

  // URLs that genuinely came back from the searches
  const found = new Map<string, { url: string; title: string }>()
  for (const blk of data.content ?? []) {
    if (blk.type === 'web_search_tool_result' && Array.isArray(blk.content)) for (const r of blk.content) if (r?.url) found.set(clean(r.url), { url: r.url, title: r.title || '' })
    if (blk.type === 'text' && Array.isArray(blk.citations)) for (const ci of blk.citations) if (ci?.url && !found.has(clean(ci.url))) found.set(clean(ci.url), { url: ci.url, title: ci.title || '' })
  }
  const text = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n')
  const out = extractJSON(text)
  if (!out) { console.error('deal-market parse', data.stop_reason, text.slice(-400)); return { error: 'The market search didn’t come back in the right shape — try again.' } }

  const num = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : null }
  const conf = ['High', 'Medium', 'Low'].includes(out.confidence) ? out.confidence : 'Low'
  const sources = [...found.values()].slice(0, 6).map(v => ({ url: v.url, title: v.title || host(v.url) }))
  if (overview) return {
    part: { area: String(out.area || '').slice(0, 400), demand: String(out.demand || '').slice(0, 800),
      watch_outs: (Array.isArray(out.watch_outs) ? out.watch_outs : []).slice(0, 8).map((x: any) => String(x).slice(0, 220)),
      confidence: conf, confidence_reason: String(out.confidence_reason || '').slice(0, 240), sources },
  }
  const bm = out.benchmark || {}
  const comparables = (Array.isArray(out.comparables) ? out.comparables : []).slice(0, 8).map((x: any) => {
    const u = typeof x.url === 'string' ? clean(x.url) : ''
    const ok = u && (found.has(u) || [...found.keys()].some(f => f.includes('/') && (f.startsWith(u + '/') || u.startsWith(f + '/'))))
    return { type: String(x.type || '').slice(0, 20), title: String(x.title || '').slice(0, 140), location: String(x.location || '').slice(0, 100), beds: Number(x.beds) || null, price: num(x.price), unit: m.unit, price_text: String(x.price_text || '').slice(0, 60), url: ok ? x.url : null, source: String(x.source || '').slice(0, 40), metric: m.key }
  }).filter((x: any) => x.title && x.price)
  return {
    part: {
      benchmark: { key: m.key, low: num(bm.low), typical: num(bm.typical), high: num(bm.high), basis: String(bm.basis || '').slice(0, 240), count: Number(bm.count) || 0 },
      comparables, confidence: conf, sources,
    },
  }
}

// The model sometimes writes a sentence (with braces or citations) around the
// JSON. Try a fenced block first, then every '{' that parses to the last '}'.
function extractJSON(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const tries = fence ? [fence[1], text] : [text]
  for (const t of tries) {
    const end = t.lastIndexOf('}')
    for (let i = t.indexOf('{'); i !== -1 && i < end; i = t.indexOf('{', i + 1)) {
      try { const o = JSON.parse(t.slice(i, end + 1)); if (o && typeof o === 'object') return o } catch {}
    }
  }
  return null
}

function host(u: string) { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
function clean(u: string) { try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/$/, '').toLowerCase() } catch { return u } }

export async function POST(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctl) {
      const tick = setInterval(() => { try { ctl.enqueue(enc.encode(' ')) } catch {} }, 4000)
      let out: any
      try { out = await run(b) } catch (e: any) { out = { error: e?.message || 'Something went wrong' } }
      clearInterval(tick)
      ctl.enqueue(enc.encode(JSON.stringify(out)))
      ctl.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
}
