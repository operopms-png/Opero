import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { normalizePhone } from '@/lib/sms'

// Settings -> Phone Assistant. Admin links their own mobile to message Novourq Cloud AI on WhatsApp.
//   GET                    -> linked/pending phones + the WhatsApp number to message + whether voice notes are on
//   POST { phone }         -> starts linking; returns a 6-digit code to send as "LINK <code>"
//   POST { remove: id }    -> removes a phone
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await db.from('assistant_phones').select('id,phone,verified,code,created_at').eq('business_id', c.businessId).order('created_at', { ascending: false })
  const from = (process.env.TWILIO_WHATSAPP_FROM || '').replace(/^whatsapp:/, '')
  return NextResponse.json({ phones: data ?? [], number: from || null, voice: !!process.env.OPENAI_API_KEY, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can link a phone.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (b.remove) {
    await db.from('assistant_phones').delete().eq('id', b.remove).eq('business_id', c.businessId)
    return NextResponse.json({ ok: true })
  }
  const phone = normalizePhone(String(b.phone || ''))
  if (!phone) return NextResponse.json({ error: 'Enter the number with its country code, for example +44 7700 900123.' }, { status: 400 })
  const { count } = await db.from('assistant_phones').select('id', { count: 'exact', head: true }).eq('business_id', c.businessId)
  if ((count ?? 0) >= 5) return NextResponse.json({ error: 'You can link up to 5 phones. Remove one first.' }, { status: 400 })
  const { data: taken } = await db.from('assistant_phones').select('id').eq('phone', phone).eq('verified', true).maybeSingle()
  if (taken) return NextResponse.json({ error: 'That number is already linked to an account.' }, { status: 409 })
  await db.from('assistant_phones').delete().eq('business_id', c.businessId).eq('phone', phone).eq('verified', false)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const { error } = await db.from('assistant_phones').insert({ business_id: c.businessId, user_email: c.email, name: c.name, phone, code, verified: false })
  if (error) return NextResponse.json({ error: 'Could not start linking. Please try again.' }, { status: 500 })
  return NextResponse.json({ ok: true, code })
}
