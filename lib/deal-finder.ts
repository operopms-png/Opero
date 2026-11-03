// Deal finder. A client describes what they want in plain words; the AI turns it into a brief, searches the web for
// REAL current listings (links are kept only if they came back from the search), and learns from likes and passes.
import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
const clean = (u: string) => { try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/$/, '').toLowerCase() } catch { return u } }
const num = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : null }

export type Criteria = { location?: string; strategy?: string; maxPrice?: number | null; minBeds?: number | null; propertyType?: string; minYield?: number | null; currency?: string; notes?: string }

// Plain words -> structured brief
export async function parseBrief(text: string): Promise<Criteria> {
  const { text: out } = await callClaude(
    'Turn an investor\'s request into JSON only: {"location":"","strategy":"btl|brrr|hmo|r2r|flip|land|other","maxPrice":number|null,"minBeds":number|null,"propertyType":"","minYield":number|null,"currency":"GBP|JMD|USD","notes":"anything else that matters"}. Use null when not stated. No other text.',
    text.slice(0, 1500), 300)
  const o = extractJSON(out || '') || {}
  return { location: String(o.location || '').slice(0, 120), strategy: String(o.strategy || 'other').slice(0, 10), maxPrice: num(o.maxPrice), minBeds: num(o.minBeds), propertyType: String(o.propertyType || '').slice(0, 60), minYield: num(o.minYield), currency: ['GBP', 'JMD', 'USD'].includes(o.currency) ? o.currency : 'GBP', notes: String(o.notes || '').slice(0, 300) }
}

export async function getLearning(userId: string) {
  const { data } = await db().from('deal_learning').select('summary').eq('user_id', userId).maybeSingle()
  return (data?.summary as string | undefined) ?? ''
}

// Rewrites the "what this investor likes" notes from their latest likes and passes
export async function relearn(userId: string) {
  const { data } = await db().from('deal_matches').select('title, address, price, currency, beds, status, feedback_note').eq('user_id', userId).in('status', ['liked', 'passed', 'saved']).order('created_at', { ascending: false }).limit(40)
  if (!data?.length) return ''
  const rows = data.map((m: any) => `${m.status === 'passed' ? 'PASSED' : 'LIKED'}: ${m.title}${m.address ? ', ' + m.address : ''}${m.price ? ', ' + m.currency + ' ' + m.price : ''}${m.beds ? ', ' + m.beds + ' bed' : ''}${m.feedback_note ? ' (reason: ' + m.feedback_note + ')' : ''}`).join('\n')
  const { text } = await callClaude('You keep short notes on what a property investor likes and dislikes, from the listings they liked or passed on. Write at most 6 bullet lines, plain text, specific (areas, price, size, condition, type). Only state patterns the examples support. No headings.', rows, 350)
  const summary = (text || '').trim().slice(0, 1200)
  if (summary) await db().from('deal_learning').upsert({ user_id: userId, summary, updated_at: new Date().toISOString() })
  return summary
}

const SYSTEM = `You find real property listings for an investor. Use web search to find REAL, CURRENT listings for sale that fit the brief. Look at the usual portals for the place (UK: Rightmove, Zoopla, OnTheMarket, auction sites; Jamaica: Terra Caribbean, RE/MAX Jamaica, Century 21 Jamaica, Coldwell Banker Jamaica, other Jamaican agents and the Gleaner and Observer classifieds, with prices in JMD or USD as listed). Only return listings you actually found, each with its exact page URL. Never invent a listing, price or URL.
Reply with JSON only: {"matches":[{"title":"short description","address":"street/area","price":number,"currency":"GBP|JMD|USD","beds":number|null,"url":"exact URL","summary":"one sentence on the property","fit_score":0-100,"reason":"one sentence on why it fits the brief, or what is a stretch"}]}
Give up to 6, best fit first. If you find nothing good, return {"matches":[]}.`

export async function searchBrief(userId: string, brief: { id: string; text: string; criteria: Criteria }) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY is not configured on the server', added: 0 }
  const d = db()
  const [{ data: seen }, learning] = await Promise.all([
    d.from('deal_matches').select('url').eq('user_id', userId).limit(300),
    getLearning(userId),
  ])
  const user = `Brief: ${brief.text}\nStructured: ${JSON.stringify(brief.criteria)}\n${learning ? 'What this investor likes and dislikes (learned from earlier choices):\n' + learning + '\n' : ''}${seen?.length ? 'Already shown, do not repeat: ' + seen.slice(0, 40).map((s: any) => s.url).join(' ') : ''}`
  const ctrl = new AbortController(); const stop = setTimeout(() => ctrl.abort(), 50000)
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2400, system: SYSTEM, messages: [{ role: 'user', content: user }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] }),
    })
  } catch { clearTimeout(stop); return { error: 'The search took too long. Try again.', added: 0 } }
  clearTimeout(stop)
  if (!res.ok) return { error: `The search is unavailable right now (${res.status})`, added: 0 }
  const data = await res.json()
  const found = new Set<string>()
  for (const blk of data.content ?? []) {
    if (blk.type === 'web_search_tool_result' && Array.isArray(blk.content)) for (const r of blk.content) if (r?.url) found.add(clean(r.url))
    if (blk.type === 'text' && Array.isArray(blk.citations)) for (const c of blk.citations) if (c?.url) found.add(clean(c.url))
  }
  const text = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n')
  const out = extractJSON(text)
  await d.from('deal_briefs').update({ last_run: new Date().toISOString() }).eq('id', brief.id)
  if (!out) return { error: 'The search did not come back in the right shape. Try again.', added: 0 }
  const rows = (Array.isArray(out.matches) ? out.matches : []).slice(0, 8).flatMap((m: any) => {
    const u = typeof m.url === 'string' ? clean(m.url) : ''
    const real = u && (found.has(u) || [...found].some(f => f.includes('/') && (f.startsWith(u + '/') || u.startsWith(f + '/'))))
    if (!real || !m.title) return []
    return [{ user_id: userId, brief_id: brief.id, url: String(m.url).slice(0, 600), title: String(m.title).slice(0, 160), address: String(m.address || '').slice(0, 160) || null, price: num(m.price), currency: ['GBP', 'JMD', 'USD'].includes(m.currency) ? m.currency : (brief.criteria.currency || 'GBP'), beds: Math.round(Number(m.beds)) || null, summary: String(m.summary || '').slice(0, 300) || null, fit_score: Math.max(0, Math.min(100, Math.round(Number(m.fit_score) || 0))), reason: String(m.reason || '').slice(0, 300) || null }]
  })
  if (!rows.length) return { added: 0 }
  const { data: ins, error } = await d.from('deal_matches').upsert(rows, { onConflict: 'user_id,url', ignoreDuplicates: true }).select('id')
  if (error) return { error: error.message, added: 0 }
  return { added: ins?.length ?? 0 }
}
