import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/admin-auth'

// Local market check for the Deal Analyser.
// Claude searches the web for real comparable listings near the deal and
// returns market low / typical / high for each of the deal's key figures,
// plus the comparables themselves with links. Links are only kept if they
// came back from the web search, so the AI can't invent a listing URL.
//
// POST { strategy, strategyLabel, location, bedrooms, propertyType, letting, metrics:[{key,label,value,unit,compare}] }
// The response is streamed: spaces every few seconds to keep the connection
// open during the searches, then the JSON.

export const maxDuration = 120

type Metric = { key: string; label: string; value: number; unit: string; compare: string }

const SYSTEM = `You are a property market analyst for an investor working in the UK and Jamaica.
Use web search to find REAL, CURRENT comparable listings near the given location (Rightmove, Zoopla, OnTheMarket, SpareRoom, Airbnb, Booking.com, Realtor.com Jamaica, Terra Caribbean, Jamaica property portals, Facebook Marketplace listings that are indexed, etc.).
Run several focused searches — one for each kind of comparable the metrics need (sale prices, whole-property rents, room rents, nightly rates).

Then reply with ONLY a JSON object, no prose before or after, in this shape:
{
 "area": "one sentence describing the local market",
 "benchmarks": [ { "key": "<metric key>", "low": number, "typical": number, "high": number, "basis": "what this is based on, e.g. '7 two-bed flats to rent within 1 mile'", "count": number } ],
 "comparables": [ { "type": "For sale" | "Sold" | "To rent" | "Room" | "Short let" | "Land", "title": "short description", "location": "street/area", "beds": number|null, "price": number, "unit": "£" | "£/month" | "£/room/month" | "£/night", "price_text": "as shown on the listing, original currency", "url": "the exact listing or page URL you found", "source": "site name" } ],
 "demand": "2-3 sentences on demand, who rents/buys here, seasonality",
 "watch_outs": [ "short points: licensing, Article 4, oversupply, flood risk, crime, service charges — only what you actually found or is standard for this area" ],
 "confidence": "High" | "Medium" | "Low",
 "confidence_reason": "one sentence"
}
Rules:
- Every benchmark must use the same unit as the metric. All numbers in GBP. If listings are in JMD or USD, convert to GBP at the current rate and keep the original in price_text.
- Give 6-12 comparables, most relevant first. Only include listings you actually saw in search results, with their real URL. Never invent a listing, price or URL.
- If you cannot find enough data for a metric, give your best range from what you found, lower the count, and say so in basis. Use Low confidence if the data is thin.
- Match bedrooms and property type as closely as possible; widen the area only if needed and say so in basis.`

async function run(b: any) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'The AI isn’t configured on the server' }
  const location = String(b.location || '').trim().slice(0, 200)
  if (!location) return { error: 'Add the property’s location first' }
  const metrics: Metric[] = (Array.isArray(b.metrics) ? b.metrics : []).filter((m: any) => m && m.key && Number(m.value) > 0).slice(0, 6)

  const user = `Deal strategy: ${b.strategyLabel || b.strategy}
Location: ${location}
Property type: ${b.propertyType || 'not given'}
Bedrooms: ${b.bedrooms || 'not given'}
${b.letting ? `Letting type: ${b.letting}\n` : ''}
Metrics to benchmark (the investor's own figures — find what the local market says for each):
${metrics.map(m => `- key "${m.key}": ${m.label} = ${m.value} ${m.unit}. Compare against: ${m.compare}`).join('\n') || '- none given; just describe sale prices and rents for this property type'}

Find comparables and return the JSON.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 3500, system: SYSTEM,
      messages: [{ role: 'user', content: user }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    }),
  })
  if (!res.ok) return { error: `The market search is unavailable right now (${res.status})` }
  const data = await res.json()

  // URLs that genuinely came back from the searches
  const found = new Map<string, { url: string; title: string }>()
  for (const blk of data.content ?? []) {
    if (blk.type === 'web_search_tool_result' && Array.isArray(blk.content)) for (const r of blk.content) if (r?.url) found.set(clean(r.url), { url: r.url, title: r.title || '' })
    if (blk.type === 'text' && Array.isArray(blk.citations)) for (const ci of blk.citations) if (ci?.url && !found.has(clean(ci.url))) found.set(clean(ci.url), { url: ci.url, title: ci.title || '' })
  }
  const text = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n')
  const s = text.indexOf('{'), e = text.lastIndexOf('}')
  let out: any
  try { out = JSON.parse(text.slice(s, e + 1)) } catch { return { error: 'The market search didn’t come back in the right shape — try again.' } }

  const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null }
  const benchmarks = (Array.isArray(out.benchmarks) ? out.benchmarks : [])
    .filter((x: any) => metrics.some(m => m.key === x?.key))
    .map((x: any) => ({ key: String(x.key), low: num(x.low), typical: num(x.typical), high: num(x.high), basis: String(x.basis || '').slice(0, 240), count: Number(x.count) || 0 }))
  const comparables = (Array.isArray(out.comparables) ? out.comparables : []).slice(0, 14).map((x: any) => {
    const u = typeof x.url === 'string' ? clean(x.url) : ''
    const ok = u && (found.has(u) || [...found.keys()].some(f => f.includes('/') && (f.startsWith(u + '/') || u.startsWith(f + '/'))))
    return { type: String(x.type || '').slice(0, 20), title: String(x.title || '').slice(0, 140), location: String(x.location || '').slice(0, 100), beds: Number(x.beds) || null, price: num(x.price), unit: String(x.unit || '£').slice(0, 16), price_text: String(x.price_text || '').slice(0, 60), url: ok ? x.url : null, source: String(x.source || '').slice(0, 40) }
  }).filter((x: any) => x.title && x.price)
  const used = new Set(comparables.map((x: any) => x.url && clean(x.url)).filter(Boolean))
  const sources = [...found.entries()].filter(([k]) => !used.has(k)).slice(0, 8).map(([, v]) => ({ url: v.url, title: v.title || host(v.url) }))

  return {
    market: {
      checkedAt: new Date().toISOString(), location, bedrooms: b.bedrooms || null, propertyType: b.propertyType || null,
      metrics, benchmarks, comparables, sources,
      area: String(out.area || '').slice(0, 400), demand: String(out.demand || '').slice(0, 800),
      watch_outs: (Array.isArray(out.watch_outs) ? out.watch_outs : []).slice(0, 8).map((x: any) => String(x).slice(0, 220)),
      confidence: ['High', 'Medium', 'Low'].includes(out.confidence) ? out.confidence : 'Low',
      confidence_reason: String(out.confidence_reason || '').slice(0, 240),
    },
  }
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
