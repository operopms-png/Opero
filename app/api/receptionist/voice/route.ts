import { NextRequest } from 'next/server'
import { getSettings } from '@/lib/receptionist'
import { readForm, startSession, twiml, xml, base } from '@/lib/voice-receptionist'

// Twilio: an inbound call handed to the AI receptionist (see /api/voice/twiml).
// With "Ring my phone first" on: play the welcome message, ring the owner's phone, and only if it is not answered
// hand the caller to the AI (after-dial), which falls back to voicemail. Otherwise the AI answers straight away.
export async function POST(req: NextRequest) {
  const p = await readForm(req)
  const s = await getSettings(req.nextUrl.searchParams.get('biz') ?? '')
  if (!s || s.phone_mode === 'off') return twiml('<Say>Sorry, no one is available to take your call. Please try again later.</Say><Hangup/>')
  if (s.phone_ring_first && s.phone_transfer_number && p.CallSid?.startsWith('CA')) {
    const welcome = s.phone_greeting || `Thank you for calling ${s.company_name || 'us'}. Please hold while we connect your call.`
    const after = `${base(req)}/api/receptionist/voice/after-dial?biz=${s.business_id}`
    return twiml(`<Say voice="${xml(s.phone_voice)}" language="en-GB">${xml(welcome)}</Say><Dial timeout="${Math.min(60, Math.max(8, s.phone_ring_seconds || 20))}" callerId="${xml(p.To || '')}" action="${xml(after)}">${xml(s.phone_transfer_number)}</Dial>`)
  }
  return startSession(req, s, p, 'direct')
}
