export const dynamic = 'force-dynamic'
export const maxDuration = 30
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { CORS_HEADERS, CURRENCY_SYMBOL, settingsByKey, liveListings, systemPrompt, callClaudeChat, saveLead } from '@/lib/website-chat'

// Public endpoint used by the website chat box (public/chat-widget.js).
// GET  ?key=  -> assistant name for the widget header
// POST        -> { key, chat_id?, visitor_id, message, page_url } -> assistant reply,
//                plus optional property cards and a contact form prompt

const MAX_MESSAGES_PER_CHAT = 60
const MAX_MESSAGE_LENGTH = 1000

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest) {
  const s = await settingsByKey(req.nextUrl.searchParams.get('key') ?? '')
  if (!s || !s.enabled) return NextResponse.json({ enabled: false }, { headers: CORS_HEADERS })
  return NextResponse.json({ enabled: true, name: s.assistant_name, company: s.company_name }, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const reply = (body: any, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS })
  try {
    const { key, chat_id, visitor_id, message, page_url } = await req.json()
    const s = await settingsByKey(key)
    if (!s || !s.enabled) return reply({ error: 'This chat is not available.' }, 404)
    const text = String(message ?? '').trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!text) return reply({ error: 'Empty message' }, 400)

    // Find or start the chat
    let chat: any = null
    if (chat_id) {
      const { data } = await serviceClient.from('website_chats').select('*').eq('id', chat_id).eq('business_id', s.business_id).maybeSingle()
      chat = data
    }
    if (!chat) {
      const { data, error } = await serviceClient.from('website_chats').insert({
        business_id: s.business_id,
        visitor_id: String(visitor_id ?? '').slice(0, 64) || null,
        page_url: String(page_url ?? '').slice(0, 500) || null,
      }).select('*').single()
      if (error || !data) return reply({ error: 'Could not start chat' }, 500)
      chat = data
    }
    if (chat.message_count >= MAX_MESSAGES_PER_CHAT) {
      return reply({ chat_id: chat.id, reply: 'Thanks for all your questions! To go further, please leave your details and the team will be in touch.', show_contact_form: true })
    }

    await serviceClient.from('website_chat_messages').insert({ chat_id: chat.id, role: 'visitor', content: text })

    // Conversation so far (latest 30 messages)
    const { data: history } = await serviceClient.from('website_chat_messages')
      .select('role, content').eq('chat_id', chat.id).order('created_at', { ascending: false }).limit(30)
    const messages: any[] = []
    for (const m of (history ?? []).reverse()) {
      const role = m.role === 'visitor' ? 'user' : 'assistant'
      const content = m.role === 'staff' ? `[A team member replied by email]: ${m.content}` : m.content
      const last = messages[messages.length - 1]
      if (last && last.role === role) last.content += `\n\n${content}`
      else messages.push({ role, content })
    }
    if (messages[0]?.role !== 'user') messages.shift()

    const listings = await liveListings(s.business_id)
    const system = systemPrompt(s, listings)
    const cur = s.currency ? (CURRENCY_SYMBOL[s.currency] ?? `${s.currency} `) : null

    let finalText = ''
    let cards: any[] = []
    let showForm: string | null = null
    for (let round = 0; round < 3; round++) {
      const res = await callClaudeChat(system, messages)
      const textParts = (res.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text)
      if (textParts.length) finalText += (finalText ? '\n\n' : '') + textParts.join('\n').trim()
      const toolUses = (res.content ?? []).filter((c: any) => c.type === 'tool_use')
      if (!toolUses.length || res.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content: res.content })
      const results: any[] = []
      for (const t of toolUses) {
        if (t.name === 'show_properties') {
          const ids: string[] = Array.isArray(t.input?.ids) ? t.input.ids : []
          const found = listings.filter(l => ids.includes(l.id))
          cards = found.map(l => ({
            id: l.id, name: l.name, area: l.area, bedrooms: l.bedrooms, image: l.image,
            type: l.kind === 'furnished' ? 'Furnished apartment' : 'To let',
            price: cur && l.price != null ? `${cur}${l.price.toLocaleString('en-GB')} / ${l.price_unit}` : null,
          }))
          results.push({ type: 'tool_result', tool_use_id: t.id, content: `Shown ${cards.length} card(s).` })
        } else if (t.name === 'request_contact') {
          showForm = String(t.input?.reason ?? 'Follow up').slice(0, 120)
          results.push({ type: 'tool_result', tool_use_id: t.id, content: 'Form shown to the visitor.' })
        } else if (t.name === 'save_contact') {
          await saveLead(s, chat.id, t.input ?? {})
          results.push({ type: 'tool_result', tool_use_id: t.id, content: 'Saved. The team has been notified.' })
        } else {
          results.push({ type: 'tool_result', tool_use_id: t.id, content: 'Unknown tool', is_error: true })
        }
      }
      messages.push({ role: 'user', content: results })
    }

    if (!finalText) finalText = cards.length ? 'Here’s what we have available:' : 'Thanks! How else can I help?'
    // Don't ask for details again if we already have them
    const { data: fresh } = await serviceClient.from('website_chats').select('email, phone').eq('id', chat.id).single()
    if (fresh?.email || fresh?.phone) showForm = null

    await serviceClient.from('website_chat_messages').insert({
      chat_id: chat.id, role: 'assistant', content: finalText,
      meta: cards.length || showForm ? { cards: cards.map(c => c.id), form: showForm } : null,
    })
    await serviceClient.from('website_chats').update({
      message_count: (chat.message_count ?? 0) + 2,
      last_message_at: new Date().toISOString(),
      staff_read: false,
    }).eq('id', chat.id)

    return reply({ chat_id: chat.id, reply: finalText, cards, show_contact_form: !!showForm, form_reason: showForm })
  } catch (err: any) {
    console.error('[website-chat]', err)
    return reply({ reply: 'Sorry, I’m having trouble right now. Please try again in a moment, or leave your details and the team will get back to you.', show_contact_form: true, error: true })
  }
}
