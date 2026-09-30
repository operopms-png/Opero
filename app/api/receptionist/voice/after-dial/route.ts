import { NextRequest } from 'next/server'
import { getSettings } from '@/lib/receptionist'
import { readForm, startSession, twiml, finalizeCall } from '@/lib/voice-receptionist'

// Twilio <Dial action>: staff didn't pick up (or a transfer from the AI
// failed) — hand the caller to the AI receptionist.
export async function POST(req: NextRequest) {
  const p = await readForm(req)
  const answered = ['completed', 'answered'].includes(String(p.DialCallStatus ?? '').toLowerCase())
  const fromAi = req.nextUrl.searchParams.get('from_ai') === '1'
  if (answered) { if (fromAi && p.CallSid) await finalizeCall(p.CallSid); return twiml('<Hangup/>') }
  const s = await getSettings(req.nextUrl.searchParams.get('biz') ?? '')
  if (!s || s.phone_mode === 'off') return twiml('<Say>Sorry, no one is available right now. Please try again later.</Say><Hangup/>')
  return startSession(req, s, p, 'no_answer')
}
