import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { sendSms } from '@/lib/send-sms'
import { normalizePhone, smsConnection, nameForPhone } from '@/lib/sms'

// POST { to, body, contact_name? } -> { message, contact_phone }
// Sends a text from the business's Twilio number and saves it to the thread.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const body = String(b.body || '').trim()
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 })
  if (body.length > 1500) return NextResponse.json({ error: 'That message is too long for a text (1,500 characters max).' }, { status: 400 })
  const to = normalizePhone(b.to)
  if (!to) return NextResponse.json({ error: 'Check the number — start with + and the country code, e.g. +1 876… or +44 7…' }, { status: 400 })

  const conn = await smsConnection(c.businessId)
  if (!conn) return NextResponse.json({ error: 'Texts aren’t switched on yet. Add the Twilio details in Netlify (see Inbox → Texts).' }, { status: 503 })

  const r = await sendSms(to, body, conn.phone)
  if (r.skipped) return NextResponse.json({ error: 'Texts aren’t switched on yet. Add the Twilio details in Netlify.' }, { status: 503 })
  if (r.error) return NextResponse.json({ error: `Twilio couldn’t send it: ${r.error}` }, { status: 502 })

  const known = b.contact_name ? { name: String(b.contact_name).slice(0, 120), contactId: null } : await nameForPhone(c.businessId, to)
  const { data: message } = await db.from('sms_messages').insert({
    connection_id: conn.id, business_id: c.businessId, contact_phone: to, contact_name: known.name, contact_id: known.contactId,
    sender: 'staff', sent_by: c.name || c.email, body, twilio_sid: r.sid || null, status: r.status || 'queued',
  }).select('*').single()
  return NextResponse.json({ message, contact_phone: to })
}
