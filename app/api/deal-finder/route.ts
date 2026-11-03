import { NextRequest } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { parseBrief, searchBrief, relearn, getLearning, type Criteria } from '@/lib/deal-finder'

export const maxDuration = 60

// GET -> { briefs, matches, learning }
// POST { action: 'brief', text } | { action: 'search', briefId } | { action: 'toggle', briefId, active } | { action: 'delete', briefId }
//      { action: 'feedback', matchId, verdict: 'like'|'pass', note? } | { action: 'save', matchId }
const j = (o: any, status = 200) => Response.json(o, { status })

export async function GET(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  const [b, m, learning] = await Promise.all([
    db.from('deal_briefs').select('id, text, criteria, active, last_run, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    db.from('deal_matches').select('id, brief_id, url, title, address, price, currency, beds, summary, fit_score, reason, status, deal_id, created_at').eq('user_id', uid).neq('status', 'passed').order('created_at', { ascending: false }).limit(60),
    getLearning(uid),
  ])
  return j({ briefs: b.data ?? [], matches: m.data ?? [], learning })
}

export async function POST(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'search') {
    // Streamed: spaces keep the connection open while the web search runs
    const enc = new TextEncoder()
    return new Response(new ReadableStream({
      async start(ctl) {
        const tick = setInterval(() => { try { ctl.enqueue(enc.encode(' ')) } catch {} }, 4000)
        let out: any
        try {
          const { data: brief } = await db.from('deal_briefs').select('id, text, criteria').eq('id', b.briefId).eq('user_id', uid).maybeSingle()
          out = brief ? await searchBrief(uid, { id: brief.id, text: brief.text, criteria: (brief.criteria ?? {}) as Criteria }) : { error: 'Brief not found' }
        } catch (e: any) { out = { error: e?.message || 'Something went wrong' } }
        clearInterval(tick); ctl.enqueue(enc.encode(JSON.stringify(out))); ctl.close()
      },
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
  }

  if (b.action === 'brief') {
    const text = String(b.text || '').trim().slice(0, 1500)
    if (text.length < 8) return j({ error: 'Say what you are looking for and where.' }, 400)
    const criteria = await parseBrief(text)
    const { data, error } = await db.from('deal_briefs').insert({ user_id: uid, text, criteria }).select('id').single()
    if (error) return j({ error: error.message }, 500)
    return j({ success: true, id: data.id, criteria })
  }
  if (b.action === 'toggle') { await db.from('deal_briefs').update({ active: !!b.active }).eq('id', b.briefId).eq('user_id', uid); return j({ success: true }) }
  if (b.action === 'delete') { await db.from('deal_briefs').delete().eq('id', b.briefId).eq('user_id', uid); return j({ success: true }) }

  if (b.action === 'feedback') {
    const status = b.verdict === 'like' ? 'liked' : b.verdict === 'pass' ? 'passed' : ''
    if (!status) return j({ error: 'Choose like or pass' }, 400)
    await db.from('deal_matches').update({ status, feedback_note: String(b.note || '').slice(0, 300) || null }).eq('id', b.matchId).eq('user_id', uid)
    const learning = await relearn(uid)
    return j({ success: true, learning })
  }

  if (b.action === 'save') {
    const { data: m } = await db.from('deal_matches').select('*').eq('id', b.matchId).eq('user_id', uid).maybeSingle()
    if (!m) return j({ error: 'Match not found' }, 404)
    if (m.deal_id) return j({ success: true, dealId: m.deal_id })
    const { data: br } = await db.from('deal_briefs').select('criteria').eq('id', m.brief_id).maybeSingle()
    const c = (br?.criteria ?? {}) as Criteria
    const strategy = ['btl', 'brrr', 'hmo', 'r2r', 'flip', 'land'].includes(String(c.strategy)) ? String(c.strategy) : 'btl'
    const form = { address: m.address || m.title, price: String(m.price ?? ''), currency: m.currency || 'GBP', bedrooms: m.beds ?? '', listingUrl: m.url }
    const { data: deal, error } = await db.from('investment_deals').insert({ user_id: uid, strategy, address: m.address || m.title, data: { form, source: 'deal_finder', listingUrl: m.url }, stage: 'Found' }).select('id').single()
    if (error) return j({ error: error.message }, 500)
    await db.from('deal_matches').update({ status: 'saved', deal_id: deal.id }).eq('id', m.id)
    await relearn(uid)
    return j({ success: true, dealId: deal.id })
  }
  return j({ error: 'Unknown action' }, 400)
}
