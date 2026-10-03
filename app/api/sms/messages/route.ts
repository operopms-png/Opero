import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// GET ?connection_id=…                    -> { conversations: [{contact_phone, contact_name, last_message, last_at, unread}] }
// GET ?connection_id=…&contact_phone=+…   -> { messages: [...] } oldest first, and marks incoming ones read
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const connId = req.nextUrl.searchParams.get('connection_id') || ''
  const phone = req.nextUrl.searchParams.get('contact_phone')
  const { data: conn } = await db.from('sms_connections').select('id').eq('id', connId).eq('business_id', c.businessId).maybeSingle()
  if (!conn) return NextResponse.json({ conversations: [], messages: [] })

  if (phone) {
    const { data } = await db.from('sms_messages').select('id,sender,sent_by,body,status,created_at,read_at').eq('connection_id', conn.id).eq('contact_phone', phone).order('created_at', { ascending: true }).limit(500)
    const unread = (data || []).filter((m: any) => m.sender === 'contact' && !m.read_at).map((m: any) => m.id)
    if (unread.length) await db.from('sms_messages').update({ read_at: new Date().toISOString() }).in('id', unread)
    return NextResponse.json({ messages: (data || []).map((m: any) => ({ ...m, sender: m.sender === 'contact' ? 'contact' : (m.sent_by || 'staff') })) })
  }

  const { data } = await db.from('sms_messages').select('contact_phone,contact_name,sender,body,created_at,read_at').eq('connection_id', conn.id).order('created_at', { ascending: false }).limit(2000)
  const byPhone = new Map<string, any>()
  for (const m of data || []) {
    let cv = byPhone.get(m.contact_phone)
    if (!cv) { cv = { contact_phone: m.contact_phone, contact_name: m.contact_name, last_message: m.body, last_at: m.created_at, unread: false }; byPhone.set(m.contact_phone, cv) }
    if (!cv.contact_name && m.contact_name) cv.contact_name = m.contact_name
    if (m.sender === 'contact' && !m.read_at) cv.unread = true
  }
  return NextResponse.json({ conversations: [...byPhone.values()] })
}
