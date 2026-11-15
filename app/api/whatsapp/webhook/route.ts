import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { nameForPhone } from '@/lib/sms'
import { signatureOk, markRead } from '@/lib/whatsapp-meta'
import { maybeAiReply } from '@/lib/whatsapp-ai'

// Meta webhook for WhatsApp Business. In the Meta app (WhatsApp → Configuration) set:
//   Callback URL  https://app.thenovourq.com/api/whatsapp/webhook
//   Verify token  the same value as WHATSAPP_VERIFY_TOKEN in Netlify
// and subscribe to the "messages" field.
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (p.get('hub.mode') === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge') || '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

const PLACEHOLDER: Record<string, string> = { image: 'a picture', video: 'a video', audio: 'a voice note', document: 'a document', sticker: 'a sticker', location: 'a location', contacts: 'a contact card' }

export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (!signatureOk(raw, req.headers.get('x-hub-signature-256'))) return new NextResponse('Forbidden', { status: 403 })
  let payload: any
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }

  const aiJobs: Promise<unknown>[] = []
  for (const entry of payload?.entry ?? []) for (const ch of entry?.changes ?? []) {
    const v = ch?.value
    if (!v?.metadata?.phone_number_id) continue
    const { data: conn } = await db.from('whatsapp_connections').select('*').eq('phone_number_id', v.metadata.phone_number_id).eq('provider', 'meta').maybeSingle()
    if (!conn) continue

    // Delivery ticks for messages we sent
    for (const s of v.statuses ?? []) {
      if (!s?.id) continue
      const status = ['sent', 'delivered', 'read', 'failed'].includes(s.status) ? s.status : null
      if (status) await db.from('whatsapp_messages').update({ status }).eq('wamid', s.id)
    }

    // Incoming messages
    for (const m of v.messages ?? []) {
      if (!m?.id || !m?.from) continue
      const from = '+' + String(m.from).replace(/[^\d]/g, '')
      const profile = (v.contacts ?? []).find((x: any) => x.wa_id === m.from)?.profile?.name as string | undefined
      let text: string = m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || ''
      const media = m.image?.caption || m.video?.caption || m.document?.caption || ''
      if (!text) text = PLACEHOLDER[m.type] ? `[${PLACEHOLDER[m.type]}${media ? ': ' + media : ''} — open WhatsApp on the phone to view it]` : '[a message this portal cannot show yet]'
      text = text.slice(0, 5000)

      const { data: dup } = await db.from('whatsapp_messages').select('id').eq('wamid', m.id).maybeSingle()
      if (dup) continue
      const known = await nameForPhone(conn.user_id, from)
      const name = known.name || profile || null
      await db.from('whatsapp_messages').insert({
        connection_id: conn.id, business_id: conn.user_id, contact_phone: from, contact_name: name, contact_id: known.contactId,
        sender: 'contact', body: text, wamid: m.id, status: 'received',
      })
      await db.from('notifications').insert({
        user_id: conn.user_id, title: `WhatsApp from ${name || from}`.slice(0, 300), message: text.slice(0, 500),
        type: 'message', module: 'staffcentre', link: '/staff-centre/inbox', read: false,
      })
      aiJobs.push(markRead(conn, m.id).catch(() => {}))
      if (m.type === 'text' || m.type === 'button' || m.type === 'interactive') aiJobs.push(maybeAiReply(conn, from, name, text, m.id).catch(e => console.error('whatsapp ai', e)))
    }
  }
  await Promise.all(aiJobs)
  // Always answer 200 quickly once the signature is good, so Meta does not retry.
  return NextResponse.json({ ok: true })
}
