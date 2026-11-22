import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { twilioSignatureOk, smsCreds } from '@/lib/sms'

// Twilio delivery updates for texts we send (queued → sent → delivered / failed).
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = String(v) })
  const { data: msg } = await db.from('sms_messages').select('connection_id').eq('twilio_sid', params.MessageSid || '-').maybeSingle()
  const { data: conn } = msg?.connection_id ? await db.from('sms_connections').select('twilio_account_sid,twilio_auth_token_enc').eq('id', msg.connection_id).maybeSingle() : { data: null }
  if (!twilioSignatureOk(`${SITE_URL}/api/sms/status`, params, req.headers.get('x-twilio-signature'), smsCreds(conn)?.token)) return new NextResponse('Forbidden', { status: 403 })
  if (params.MessageSid && params.MessageStatus) await db.from('sms_messages').update({ status: params.MessageStatus }).eq('twilio_sid', params.MessageSid)
  return new NextResponse(null, { status: 204 })
}
