import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { normalizePhone, nameForPhone } from '@/lib/sms'
import { sendText, sendTemplate, windowOpen, setAiPaused } from '@/lib/whatsapp-meta'

// POST { connection_id, to, body, contact_name? }                        -> free text, only while the 24-hour window is open
// POST { connection_id, to, template, language?, params?: string[] }     -> an approved template (works any time)
// A staff reply switches Novourq Cloud AI off for that chat until someone presses Hand back to AI.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const to = normalizePhone(b.to)
  if (!to) return NextResponse.json({ error: 'Check the number — start with + and the country code, e.g. +1 876… or +44 7…' }, { status: 400 })
  const { data: conn } = await db.from('whatsapp_connections').select('*').eq('id', String(b.connection_id || '')).eq('user_id', c.businessId).eq('provider', 'meta').maybeSingle()
  if (!conn) return NextResponse.json({ error: 'That WhatsApp number is not connected. Connect it in Settings → WhatsApp.' }, { status: 404 })

  const template = String(b.template || '').trim()
  const body = String(b.body || '').trim()
  let wamid: string | undefined, shown = body, tpl: string | null = null
  if (template) {
    const params = Array.isArray(b.params) ? b.params.map((p: any) => String(p).slice(0, 500)) : []
    const r = await sendTemplate(conn, to, template, String(b.language || 'en_GB'), params)
    if (r.error) return NextResponse.json({ error: `WhatsApp couldn’t send it: ${r.error}` }, { status: 502 })
    wamid = r.wamid; tpl = template; shown = body || `Template: ${template}${params.length ? ' (' + params.join(', ') + ')' : ''}`
  } else {
    if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 })
    if (body.length > 4000) return NextResponse.json({ error: 'That message is too long for WhatsApp (4,000 characters max).' }, { status: 400 })
    if (!(await windowOpen(conn.id, to))) return NextResponse.json({ error: 'It has been more than 24 hours since they last wrote, so WhatsApp only allows an approved template message now.', window_closed: true }, { status: 409 })
    const r = await sendText(conn, to, body)
    if (r.error) return NextResponse.json({ error: `WhatsApp couldn’t send it: ${r.error}` }, { status: 502 })
    wamid = r.wamid
  }

  const known = b.contact_name ? { name: String(b.contact_name).slice(0, 120), contactId: null } : await nameForPhone(c.businessId, to)
  const { data: message } = await db.from('whatsapp_messages').insert({
    connection_id: conn.id, business_id: c.businessId, contact_phone: to, contact_name: known.name, contact_id: known.contactId,
    sender: c.name || c.email, body: shown, wamid: wamid || null, status: 'sent', template_name: tpl,
  }).select('*').single()
  // A person has stepped in, so the AI stays quiet in this chat from now on.
  if (conn.ai_receptionist_enabled) await setAiPaused(conn, to, true, c.name || c.email, 'A team member replied')
  return NextResponse.json({ message, contact_phone: to })
}
