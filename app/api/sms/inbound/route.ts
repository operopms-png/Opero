import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { normalizePhone, nameForPhone, twilioSignatureOk } from '@/lib/sms'

// Twilio "A message comes in" webhook for the texting number:
//   https://app.sangstersgroup.com/api/sms/inbound   (HTTP POST)
// Saves the text to the Inbox (Texts channel) and rings the bell.
const twiml = () => new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } })

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = String(v) })
  const url = `${SITE_URL}/api/sms/inbound`
  if (!twilioSignatureOk(url, params, req.headers.get('x-twilio-signature'))) return new NextResponse('Forbidden', { status: 403 })

  const to = normalizePhone(params.To || ''), from = normalizePhone(params.From || '') || params.From
  const { data: conn } = await db.from('sms_connections').select('*').eq('phone', to || '').maybeSingle()
  if (!conn || !from) return twiml()
  const body = (params.Body || '').slice(0, 5000) + (Number(params.NumMedia || 0) > 0 ? `\n[${params.NumMedia} picture${params.NumMedia === '1' ? '' : 's'} attached — open Twilio to view]` : '')

  const { data: dup } = await db.from('sms_messages').select('id').eq('twilio_sid', params.MessageSid || '-').maybeSingle()
  if (dup) return twiml()
  const known = await nameForPhone(conn.business_id, from)
  await db.from('sms_messages').insert({
    connection_id: conn.id, business_id: conn.business_id, contact_phone: from, contact_name: known.name, contact_id: known.contactId,
    sender: 'contact', body, twilio_sid: params.MessageSid || null, status: 'received',
  })
  await db.from('notifications').insert({
    user_id: conn.business_id, title: `Text from ${known.name || from}`.slice(0, 300), message: body.slice(0, 500),
    type: 'message', module: 'staffcentre', link: '/staff-centre/inbox', read: false,
  })
  return twiml()
}
