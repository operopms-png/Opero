import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller, encrypt } from '@/lib/mailbox'
import { smsConnection, normalizePhone } from '@/lib/sms'
import { SITE_URL } from '@/lib/brand'

// Settings -> Texts and the Inbox Texts channel.
// GET  -> { configured, isAdmin, webhookUrl, connections: [{ id, label, phone, own, connected_by_name }] }   (tokens never leave the server)
// POST { action:'connect', account_sid, auth_token, phone, label? }   (admins) - checks the number belongs to that Twilio account,
//      then points the number's incoming texts at the portal for them.
//      { action:'remove', id }                                         (admins)
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const WEBHOOK = `${SITE_URL}/api/sms/inbound`
const basic = (sid: string, token: string) => 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const conn = await smsConnection(c.businessId)
  return NextResponse.json({
    configured: !!conn, isAdmin: c.isAdmin, webhookUrl: WEBHOOK,
    connections: conn ? [{ id: conn.id, label: conn.label, phone: conn.phone, own: !!conn.twilio_account_sid, connected_by_name: conn.connected_by_name ?? null }] : [],
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Only an account admin can change Texts settings.', 403)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'connect') {
    const sid = String(b.account_sid || '').trim(), token = String(b.auth_token || '').trim(), phone = normalizePhone(b.phone)
    if (!/^AC[0-9a-fA-F]{32}$/.test(sid)) return bad('The Account SID starts with AC and is 34 characters. Copy it from the Twilio console home page.')
    if (token.length < 20) return bad('Paste the Auth Token from the Twilio console home page.')
    if (!phone) return bad('Enter the Twilio number starting with + and the country code, e.g. +44 7… or +1 876…')

    const existing = await smsConnection(c.businessId)
    if (existing && !existing.twilio_account_sid) return bad('This company is using the platform’s texting number. Ask your platform admin to change it.', 409)
    const { data: clash } = await db.from('sms_connections').select('id,business_id').eq('phone', phone).maybeSingle()
    if (clash && clash.business_id !== c.businessId) return bad('That number is already connected to another company.', 409)

    // Does this Twilio account own that number?
    const lookup = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phone)}`, { headers: { Authorization: basic(sid, token) } })
    if (lookup.status === 401) return bad('Twilio did not accept that Account SID and Auth Token. Check both and try again.', 400)
    if (!lookup.ok) return bad('Could not reach Twilio. Try again in a minute.', 502)
    const found = (await lookup.json().catch(() => ({})))?.incoming_phone_numbers?.[0]
    if (!found?.sid) return bad(`That Twilio account does not have ${phone}. Buy or add the number in Twilio first (it must be able to send texts).`)

    // Point incoming texts at the portal so nobody has to paste the address into Twilio.
    const hook = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${found.sid}.json`, {
      method: 'POST', headers: { Authorization: basic(sid, token), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ SmsUrl: WEBHOOK, SmsMethod: 'POST' }),
    })
    const hookSet = hook.ok

    const row = { business_id: c.businessId, label: String(b.label || 'Texts').slice(0, 60), phone, twilio_account_sid: sid, twilio_auth_token_enc: encrypt(token), connected_by_name: c.name }
    const q = existing ? db.from('sms_connections').update(row).eq('id', existing.id) : db.from('sms_connections').insert(row)
    const { data, error } = await q.select('id,label,phone,connected_by_name').single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ connection: { ...data, own: true }, webhookSet: hookSet, webhookUrl: WEBHOOK })
  }

  if (b.action === 'remove') {
    const id = String(b.id || '')
    const { data: conn } = await db.from('sms_connections').select('id,twilio_account_sid').eq('id', id).eq('business_id', c.businessId).maybeSingle()
    if (!conn) return bad('Connection not found', 404)
    if (!conn.twilio_account_sid) return bad('This is the platform’s texting number and can’t be removed here.', 409)
    await db.from('sms_connections').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
