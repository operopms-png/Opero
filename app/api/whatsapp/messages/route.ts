import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { windowOpenFrom, threadState } from '@/lib/whatsapp-meta'

// GET ?connection_id=…                    -> { conversations: [{contact_phone, contact_name, last_message, last_at, unread, ai_paused, window_open}] }
// GET ?connection_id=…&contact_phone=+…   -> { messages: [...], window_open, ai_paused, paused_reason, ai_draft } oldest first, marks incoming ones read
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const connId = req.nextUrl.searchParams.get('connection_id') || ''
  const phone = req.nextUrl.searchParams.get('contact_phone')
  const { data: conn } = await db.from('whatsapp_connections').select('id').eq('id', connId).eq('user_id', c.businessId).maybeSingle()
  if (!conn) return NextResponse.json({ conversations: [], messages: [] })

  if (phone) {
    const { data } = await db.from('whatsapp_messages').select('id,sender,body,status,created_at,read_at,template_name').eq('connection_id', conn.id).eq('contact_phone', phone).order('created_at', { ascending: true }).limit(500)
    const rows = data || []
    const unread = rows.filter((m: any) => m.sender === 'contact' && !m.read_at).map((m: any) => m.id)
    if (unread.length) await db.from('whatsapp_messages').update({ read_at: new Date().toISOString() }).in('id', unread)
    const lastIn = [...rows].reverse().find((m: any) => m.sender === 'contact')?.created_at ?? null
    const t = await threadState(conn.id, phone)
    return NextResponse.json({ messages: rows, window_open: windowOpenFrom(lastIn), window_ends: lastIn ? new Date(new Date(lastIn).getTime() + 24 * 3600e3).toISOString() : null, ai_paused: !!t?.ai_paused, paused_reason: t?.paused_reason ?? null, ai_draft: t?.ai_draft ?? null })
  }

  const [{ data }, { data: threads }] = await Promise.all([
    db.from('whatsapp_messages').select('contact_phone,contact_name,sender,body,created_at,read_at').eq('connection_id', conn.id).order('created_at', { ascending: false }).limit(2000),
    db.from('whatsapp_threads').select('contact_phone,ai_paused').eq('connection_id', conn.id),
  ])
  const paused = new Set((threads || []).filter((t: any) => t.ai_paused).map((t: any) => t.contact_phone))
  const byPhone = new Map<string, any>()
  for (const m of data || []) {
    let cv = byPhone.get(m.contact_phone)
    if (!cv) { cv = { contact_phone: m.contact_phone, contact_name: m.contact_name, last_message: m.body, last_at: m.created_at, unread: false, ai_paused: paused.has(m.contact_phone), window_open: false, _in: false }; byPhone.set(m.contact_phone, cv) }
    if (!cv.contact_name && m.contact_name) cv.contact_name = m.contact_name
    if (m.sender === 'contact') { if (!cv._in) { cv._in = true; cv.window_open = windowOpenFrom(m.created_at) } if (!m.read_at) cv.unread = true }
  }
  return NextResponse.json({ conversations: [...byPhone.values()].map(({ _in, ...r }) => r) })
}
