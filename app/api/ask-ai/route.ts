import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { portalContext, systemPrompt, askClaude, type ChatMsg } from '@/lib/ask-ai'

// Ask AI — chats are saved per person.
//   GET  ?kind=general|deal&ref=   -> my chats (titles)
//   GET  ?id=                      -> one of my chats with messages
//   POST {action:'send', id?, kind, ref?, message, use_portal, use_web, deal?}
//   POST {action:'delete', id}

export const maxDuration = 60
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const sp = req.nextUrl.searchParams
  const id = sp.get('id')
  if (id) {
    const { data } = await serviceClient.from('ai_chats').select('*').eq('id', id).eq('business_id', c.businessId).eq('user_email', c.email).maybeSingle()
    if (!data) return bad('Chat not found', 404)
    return NextResponse.json({ chat: data })
  }
  let q = serviceClient.from('ai_chats').select('id,title,kind,ref,updated_at').eq('business_id', c.businessId).eq('user_email', c.email).eq('kind', sp.get('kind') || 'general')
  if (sp.get('ref')) q = q.eq('ref', sp.get('ref')!)
  const { data } = await q.order('updated_at', { ascending: false }).limit(60)
  return NextResponse.json({ chats: data ?? [], isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'delete') {
    await serviceClient.from('ai_chats').delete().eq('id', b.id).eq('business_id', c.businessId).eq('user_email', c.email)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'send') {
    // Web searches can take 30s+. Send a space every few seconds so the
    // connection isn't dropped for inactivity; the JSON follows at the end
    // (leading whitespace is fine for JSON parsing).
    const enc = new TextEncoder()
    const stream = new ReadableStream({
      async start(ctl) {
        const tick = setInterval(() => { try { ctl.enqueue(enc.encode(' ')) } catch {} }, 4000)
        let out: any
        try { out = await send(c, b) } catch (e: any) { out = { error: e?.message || 'Something went wrong' } }
        clearInterval(tick)
        ctl.enqueue(enc.encode(JSON.stringify(out)))
        ctl.close()
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
  }

  return bad('Unknown action')
}

async function send(c: NonNullable<Awaited<ReturnType<typeof getCaller>>>, b: any): Promise<any> {
    const message = String(b.message || '').trim().slice(0, 8000)
    if (!message) return { error: 'Type a question first' }
    const kind = b.kind === 'deal' ? 'deal' : 'general'
    let chat: any = null
    if (b.id) {
      const { data } = await serviceClient.from('ai_chats').select('*').eq('id', b.id).eq('business_id', c.businessId).eq('user_email', c.email).maybeSingle()
      chat = data
    }
    const history: ChatMsg[] = Array.isArray(chat?.messages) ? chat.messages : []
    const web = !!b.use_web
    const messages: ChatMsg[] = [...history, { role: 'user', content: message, at: new Date().toISOString() }]
    const portal = b.use_portal === false ? null : await portalContext(c).catch(() => null)
    const r = await askClaude(systemPrompt({ c, portal, web, deal: kind === 'deal' ? b.deal : undefined }), messages, web, c.businessId)
    if (!r.text) return { error: r.error || 'The AI couldn’t answer' }
    r.text = await queueMarketingFromReply(c, r.text)
    r.text = await queuePartnerFromReply(c, r.text)
    r.text = await queueNoticeFromReply(c, r.text)
    r.text = await queuePackFromReply(c, r.text)
    messages.push({ role: 'assistant', content: r.text, at: new Date().toISOString(), web })
    const title = chat?.title && chat.title !== 'New chat' ? chat.title : message.replace(/\s+/g, ' ').slice(0, 70)
    if (chat) {
      await serviceClient.from('ai_chats').update({ messages, title, updated_at: new Date().toISOString() }).eq('id', chat.id)
    } else {
      const { data, error } = await serviceClient.from('ai_chats').insert({ business_id: c.businessId, user_email: c.email, kind, ref: b.ref ? String(b.ref).slice(0, 80) : null, title, messages }).select('*').single()
      if (error) return { error: error.message }
      chat = data
    }
    return { chat: { ...chat, messages, title } }
}

// If the AI added the [[SEND_MARKETING …]] line, put the NOVOURQ marketing email in AI Approvals. A person approves it there;
// nothing is sent from the chat. The line is removed from what the user sees.
async function queueMarketingFromReply(c: NonNullable<Awaited<ReturnType<typeof getCaller>>>, text: string): Promise<string> {
  const m = text.match(/\[\[SEND_MARKETING([^\]]*)\]\]/)
  if (!m) return text
  const clean = text.replace(/\s*\[\[SEND_MARKETING[^\]]*\]\]\s*/g, '\n').trim()
  const arg = (k: string) => (m[1].match(new RegExp(k + '=([^\\s\\]]+)')) || [])[1] || ''
  const aud = ['landlord', 'investor'].includes(arg('audience')) ? arg('audience') : 'all'
  const mode = ['picture', 'link'].includes(arg('mode')) ? arg('mode') : 'both'
  const words = arg('docs').split(',').map(w => w.trim().toLowerCase()).filter(w => w && w !== 'none')
  try {
    const { audience } = await import('@/lib/marketing-send')
    const { generateMessage } = await import('@/lib/marketing-message')
    const { queueAiAction } = await import('@/lib/ai-approvals')
    const people = await audience(c.businessId, aud)
    const { data: docs } = await serviceClient.from('service_docs').select('id,title').eq('business_id', c.businessId).eq('active', true)
    const picked = (docs ?? []).filter(d => words.some(w => String(d.title).toLowerCase().includes(w)))
    const g = generateMessage(aud)
    const q = await queueAiAction({
      userId: c.businessId, agentKey: 'marketing', actionType: 'marketing_list',
      title: `Marketing email to ${people.length} opted-in ${people.length === 1 ? 'person' : 'people'}${aud !== 'all' ? ` (${aud})` : ''}`,
      draftBody: g.text, payload: { subject: g.subject, audience: aud, doc_ids: picked.map(d => d.id), mode },
      context: { summary: `Will email ${people.length} opted-in ${aud === 'all' ? 'contacts' : aud + ' contacts'}${picked.length ? ' with ' + picked.map(d => d.title).join(', ') : ''}, each with an unsubscribe link. Requested by ${c.name} in Ask AI.` },
    })
    if ('error' in q && q.error) return clean + `\n\n(I could not queue it: ${q.error})`
    return clean + `\n\nIt is waiting in Staff Centre → AI Command Centre → AI Approvals. Open it, check the wording and the ${people.length} people, then press Approve to send.`
  } catch (e: any) { return clean + `\n\n(I could not queue it: ${e?.message || 'something went wrong'})` }
}

// If the AI added the [[UPDATE_PARTNER …]] line, save the new amount invested (admins only, old amount logged).
async function queuePartnerFromReply(c: NonNullable<Awaited<ReturnType<typeof getCaller>>>, text: string): Promise<string> {
  const m = text.match(/\[\[UPDATE_PARTNER([^\]]*)\]\]/)
  if (!m) return text
  const clean = text.replace(/\s*\[\[UPDATE_PARTNER[^\]]*\]\]\s*/g, '\n').trim()
  const arg = (k: string) => (m[1].match(new RegExp(k + '=(?:"([^"]*)"|([^\\s\\]]+))')) || []).slice(1).find(Boolean) || ''
  try {
    const { proposePartnerInvestment } = await import('@/lib/ai-partner-investment')
    const r = await proposePartnerInvestment(c, { partner: arg('partner'), amount: arg('amount'), currency: arg('currency'), agentKey: 'ask_ai', via: 'in Ask AI' })
    if (!r.ok) return clean + `\n\n(I could not update it: ${r.error})`
    return clean + `\n\nSaved: ${r.summary}. Check it on the partner's card in Staff Centre → Partners & Investors → Partners.`
  } catch (e: any) { return clean + `\n\n(I could not queue it: ${e?.message || 'something went wrong'})` }
}

// If the AI added the [[CREATE_PACK …]] line, queue the investor pack link for approval (nothing goes live until a person approves it, and it is never sent to the investor).
async function queuePackFromReply(c: NonNullable<Awaited<ReturnType<typeof getCaller>>>, text: string): Promise<string> {
  const m = text.match(/\[\[CREATE_PACK([^\]]*)\]\]/)
  if (!m) return text
  const clean = text.replace(/\s*\[\[CREATE_PACK[^\]]*\]\]\s*/g, '\n').trim()
  const arg = (k: string) => (m[1].match(new RegExp('(?:^|\\s)' + k + '=(?:"([^"]*)"|([^\\s\\]]+))')) || []).slice(1).find(Boolean) || ''
  try {
    const { proposeInvestorPack } = await import('@/lib/ai-investor-pack')
    const r = await proposeInvestorPack(c, { investor: arg('investor'), investors: arg('investors'), agentKey: 'ask_ai', via: 'in Ask AI' })
    if (!r.ok) return clean + `\n\n(I could not queue the pack: ${r.error})`
    if (r.already) return clean + `\n\n${r.summary}: Staff Centre → Human Intelligence Hub → Clients and sales → Marketing → Pack Builder.`
    return clean + `\n\nQueued: ${r.summary}. It is waiting in Staff Centre → AI Approvals. When you approve it the link goes live in Pack Builder (Staff Centre → Human Intelligence Hub → Clients and sales → Marketing → Pack Builder), where you copy the link or the WhatsApp message and send it yourself.`
  } catch (e: any) { return clean + `\n\n(I could not queue it: ${e?.message || 'something went wrong'})` }
}

// If the AI added the [[POST_NOTICE …]] line, queue the building notice for approval (nothing is posted or emailed until a person approves it).
async function queueNoticeFromReply(c: NonNullable<Awaited<ReturnType<typeof getCaller>>>, text: string): Promise<string> {
  const m = text.match(/\[\[POST_NOTICE((?:"[^"]*"|[^\]"])*)\]\]/)
  if (!m) return text
  const clean = text.replace(/\s*\[\[POST_NOTICE(?:"[^"]*"|[^\]"])*\]\]\s*/g, '\n').trim()
  const arg = (k: string) => (m[1].match(new RegExp('(?:^|\\s)' + k + '=(?:"([^"]*)"|([^\\s\\]]+))')) || []).slice(1).find(Boolean) || ''
  try {
    const { proposeBuildingNotice } = await import('@/lib/ai-building-notice')
    const r = await proposeBuildingNotice(c, { title: arg('title'), body: arg('body'), homes: arg('homes'), building: arg('building'), who: arg('who'), email: arg('email') || 'yes', agentKey: 'ask_ai', via: 'in Ask AI' })
    if (!r.ok) return clean + `\n\n(I could not queue the notice: ${r.error})`
    return clean + `\n\nQueued: ${r.summary}. It is waiting in Staff Centre → AI Approvals and goes out when you approve it.`
  } catch (e: any) { return clean + `\n\n(I could not queue it: ${e?.message || 'something went wrong'})` }
}
