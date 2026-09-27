export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { CORS_HEADERS, settingsByKey, saveLead } from '@/lib/website-chat'

// The quick contact form inside the website chat box.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const reply = (body: any, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS })
  try {
    const { key, chat_id, name, email, phone, reason } = await req.json()
    const s = await settingsByKey(key)
    if (!s || !s.enabled) return reply({ error: 'This chat is not available.' }, 404)
    if (!chat_id) return reply({ error: 'Missing chat' }, 400)
    const e = String(email ?? '').trim()
    const p = String(phone ?? '').trim()
    if (!e && !p) return reply({ error: 'Please add an email or phone number.' }, 400)
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return reply({ error: 'Please check your email address.' }, 400)

    const { data: chat } = await serviceClient.from('website_chats').select('id, summary').eq('id', chat_id).eq('business_id', s.business_id).maybeSingle()
    if (!chat) return reply({ error: 'Chat not found' }, 404)

    await saveLead(s, chat.id, { name, email: e, phone: p, summary: chat.summary ?? (reason ? String(reason) : undefined) })
    const first = String(name ?? '').trim().split(' ')[0]
    const msg = `Thanks${first ? ` ${first}` : ''}, the team has your details and will be in touch soon. Anything else I can help with?`
    await serviceClient.from('website_chat_messages').insert({ chat_id: chat.id, role: 'assistant', content: msg })
    await serviceClient.from('website_chats').update({ last_message_at: new Date().toISOString(), staff_read: false }).eq('id', chat.id)
    return reply({ ok: true, reply: msg })
  } catch (err) {
    console.error('[website-chat/lead]', err)
    return reply({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
