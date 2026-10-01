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
    const message = String(b.message || '').trim().slice(0, 8000)
    if (!message) return bad('Type a question first')
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
    const r = await askClaude(systemPrompt({ c, portal, web, deal: kind === 'deal' ? b.deal : undefined }), messages, web)
    if (!r.text) return bad(r.error || 'The AI couldn’t answer', 502)
    messages.push({ role: 'assistant', content: r.text, at: new Date().toISOString(), web })
    const title = chat?.title && chat.title !== 'New chat' ? chat.title : message.replace(/\s+/g, ' ').slice(0, 70)
    if (chat) {
      await serviceClient.from('ai_chats').update({ messages, title, updated_at: new Date().toISOString() }).eq('id', chat.id)
    } else {
      const { data, error } = await serviceClient.from('ai_chats').insert({ business_id: c.businessId, user_email: c.email, kind, ref: b.ref ? String(b.ref).slice(0, 80) : null, title, messages }).select('*').single()
      if (error) return bad(error.message, 500)
      chat = data
    }
    return NextResponse.json({ chat: { ...chat, messages, title } })
  }

  return bad('Unknown action')
}
