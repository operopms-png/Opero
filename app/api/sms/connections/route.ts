import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { smsConnection } from '@/lib/sms'
import { smsConfigured } from '@/lib/send-sms'

// GET -> { configured, connections: [{ id, label, phone }] }
// configured=false until Twilio is set up in Netlify (TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM).
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const conn = await smsConnection(c.businessId)
  return NextResponse.json({ configured: smsConfigured() && !!conn, connections: conn ? [{ id: conn.id, label: conn.label, phone: conn.phone }] : [] })
}
