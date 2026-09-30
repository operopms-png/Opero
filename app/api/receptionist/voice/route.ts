import { NextRequest } from 'next/server'
import { getSettings } from '@/lib/receptionist'
import { readForm, startSession, twiml } from '@/lib/voice-receptionist'

// Twilio: an inbound call handed to the AI receptionist (see /api/voice/twiml).
export async function POST(req: NextRequest) {
  const p = await readForm(req)
  const s = await getSettings(req.nextUrl.searchParams.get('biz') ?? '')
  if (!s || s.phone_mode === 'off') return twiml('<Say>Sorry, no one is available to take your call. Please try again later.</Say><Hangup/>')
  return startSession(req, s, p, 'direct')
}
