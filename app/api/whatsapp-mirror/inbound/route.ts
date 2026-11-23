import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'

// The company's WhatsApp mirror bridge posts every private message (in and out) here. Not signed-in traffic: the bridge proves who it
// is with its own secret, which belongs to exactly one company, so a message can only ever land in that company.
// (Separate from /api/whatsapp/inbound, which is the Twilio Phone Assistant webhook.)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bridge-secret') || ''
  if (secret.length < 16) return NextResponse.json({ error: 'Not allowed' }, { status: 401 })
  const { data: br } = await db.from('wa_bridges').select('business_id').eq('secret', secret).maybeSingle()
  if (!br) return NextResponse.json({ error: 'Not allowed' }, { status: 401 })
  const m = await req.json().catch(() => null)
  const jid = String(m?.jid || '').slice(0, 120), body = String(m?.body || '').slice(0, 4000)
  if (!jid || !body || jid.endsWith('@g.us')) return NextResponse.json({ ok: true })
  const at = new Date(m?.at)
  const { error } = await db.from('wa_messages').upsert({
    business_id: br.business_id, wa_id: m?.wa_id ? String(m.wa_id).slice(0, 120) : null, jid,
    phone: String(m?.phone || '').replace(/\D/g, '').slice(0, 20) || null, name: m?.from_me ? null : (String(m?.name || '').slice(0, 120) || null),
    from_me: !!m?.from_me, body, at: isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
  }, { onConflict: 'business_id,wa_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
