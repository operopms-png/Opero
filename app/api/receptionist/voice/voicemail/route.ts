import { NextRequest } from 'next/server'
import { getSettings } from '@/lib/receptionist'
import { readForm, twiml, xml, saveVoicemail, saveVoicemailTranscript } from '@/lib/voice-receptionist'

// Twilio <Record>: the caller finished leaving a voicemail (action), or the transcript is ready (&t=1).
export async function POST(req: NextRequest) {
  const p = await readForm(req)
  const s = await getSettings(req.nextUrl.searchParams.get('biz') ?? '')
  if (!s || !p.CallSid?.startsWith('CA')) return twiml('<Hangup/>')
  if (req.nextUrl.searchParams.get('t')) { await saveVoicemailTranscript(s, p).catch(() => {}); return new Response('ok') }
  await saveVoicemail(s, p).catch(() => {})
  return twiml(`<Say voice="${xml(s.phone_voice)}" language="en-GB">Thank you. Goodbye.</Say><Hangup/>`)
}
