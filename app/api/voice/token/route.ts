import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { voiceIdentityFor } from '@/lib/voice-identity'

export async function GET(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
    return NextResponse.json({ error: 'Voice calling is not configured yet -- missing TWILIO_ACCOUNT_SID/TWILIO_API_KEY/TWILIO_API_SECRET/TWILIO_TWIML_APP_SID env vars.' }, { status: 503 })
  }

  const identity = voiceIdentityFor(auth.staffId)
  const AccessToken = twilio.jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity, ttl: 3600 })
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: TWILIO_TWIML_APP_SID, incomingAllow: true }))

  return NextResponse.json({ token: token.toJwt(), identity })
}
