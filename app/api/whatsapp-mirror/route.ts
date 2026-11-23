import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { bridgeCall, canUseWhatsApp, getBridge, sendWhatsApp } from '@/lib/whatsapp'

// Staff Centre → Human Intelligence Hub → Clients and sales → WhatsApp. Admins and co-founders only (these are private chats).
//   GET ?view=status          -> { configured, bridge_url, secret, status: 'qr'|'connected'|'closed'|'starting'|'unreachable'|'no_url', qr, phone }
//   GET ?view=chats           -> { chats: [{ jid, phone, name, last_body, last_at, last_from_me }] }
//   GET ?view=thread&jid=     -> { messages: [...] }
//   POST {action:'setup', bridge_url?}   creates this company's bridge secret and saves the bridge address
//   POST {action:'send', to, text}       sends now (a person pressing Send); Ava's sends go through AI Approvals instead
//   POST {action:'logout'}               unlinks the number
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!canUseWhatsApp(c)) return bad('Only admins and co-founders can use WhatsApp here.', 403)
  const view = req.nextUrl.searchParams.get('view') || 'status'

  if (view === 'status') {
    const b = await getBridge(c.businessId)
    if (!b) return NextResponse.json({ configured: false })
    if (!b.bridge_url) return NextResponse.json({ configured: true, bridge_url: '', secret: b.secret, status: 'no_url' })
    const r = await bridgeCall(b, '/status', undefined, 6000)
    return NextResponse.json({ configured: true, bridge_url: b.bridge_url, secret: b.secret, status: r.ok ? r.data.status : 'unreachable', qr: r.ok ? r.data.qr || '' : '', phone: r.ok ? r.data.phone || '' : '' })
  }

  if (view === 'chats') {
    const { data } = await db.from('wa_messages').select('jid,phone,name,body,from_me,at').eq('business_id', c.businessId).order('at', { ascending: false }).limit(1500)
    const seen = new Map<string, any>()
    for (const m of data ?? []) {
      const cur = seen.get(m.jid)
      if (!cur) seen.set(m.jid, { jid: m.jid, phone: m.phone, name: m.name, last_body: m.body, last_at: m.at, last_from_me: m.from_me })
      else { if (!cur.name && m.name) cur.name = m.name; if (!cur.phone && m.phone) cur.phone = m.phone }
    }
    return NextResponse.json({ chats: Array.from(seen.values()).slice(0, 100) })
  }

  if (view === 'thread') {
    const jid = req.nextUrl.searchParams.get('jid') || ''
    const { data } = await db.from('wa_messages').select('id,body,from_me,sent_by,at').eq('business_id', c.businessId).eq('jid', jid).order('at', { ascending: false }).limit(200)
    return NextResponse.json({ messages: (data ?? []).reverse() })
  }
  return bad('Unknown view')
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!canUseWhatsApp(c)) return bad('Only admins and co-founders can use WhatsApp here.', 403)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'setup') {
    const existing = await getBridge(c.businessId)
    let url: string | undefined
    if (typeof b.bridge_url === 'string') {
      url = b.bridge_url.trim().replace(/\/+$/, '')
      if (url && !/^https:\/\/[^\s/]+(:\d+)?(\/[^\s]*)?$/i.test(url)) return bad('The bridge address must start with https://')
    }
    if (!existing) {
      const { error } = await db.from('wa_bridges').insert({ business_id: c.businessId, bridge_url: url || '' })
      if (error) return bad(error.message, 500)
    } else if (url !== undefined) {
      const { error } = await db.from('wa_bridges').update({ bridge_url: url, updated_at: new Date().toISOString() }).eq('business_id', c.businessId)
      if (error) return bad(error.message, 500)
    }
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'send') {
    const r = await sendWhatsApp(c.businessId, { to: String(b.to || ''), text: String(b.text || ''), by: c.name || c.email })
    if (!r.ok) return bad(r.error)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'logout') {
    const br = await getBridge(c.businessId)
    if (br) await bridgeCall(br, '/logout', {}, 10000)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
