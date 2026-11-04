import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Realistic spoken replies. ElevenLabs if ELEVENLABS_API_KEY is set, otherwise OpenAI (OPENAI_API_KEY).
// POST { text, gender: 'female' | 'male' } -> audio/mpeg. The browser falls back to the device voice on any error.
// A monthly character cap per person (VOICE_TTS_MONTHLY_CHARS, default 250000) stops a runaway bill.

export const maxDuration = 30
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const CAP = Number(process.env.VOICE_TTS_MONTHLY_CHARS) || 250000

// Premade ElevenLabs voices. Replace in Netlify with any voice id from your ElevenLabs library, e.g. a British voice.
const EL_FEMALE = process.env.ELEVENLABS_VOICE_FEMALE || '21m00Tcm4TlvDq8ikWAM'
const EL_MALE = process.env.ELEVENLABS_VOICE_MALE || 'pNInz6obpgDQGcFmaJgB'

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 700)
  if (!text) return bad('No text')
  const male = b.gender === 'male'
  const el = process.env.ELEVENLABS_API_KEY
  const oa = process.env.OPENAI_API_KEY
  if (!el && !oa) return bad('No voice service set up', 501)

  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: used } = await db.from('voice_usage').select('words').eq('user_email', c.email).eq('kind', 'tts').gte('created_at', since).limit(5000)
  if ((used ?? []).reduce((n, r) => n + (r.words || 0), 0) >= CAP) return bad('Monthly voice limit reached', 429)

  let res: Response
  if (el) {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${male ? EL_MALE : EL_FEMALE}?output_format=mp3_44100_64`, {
      method: 'POST', headers: { 'xi-api-key': el, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
    })
  } else {
    res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${oa}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: male ? 'ash' : 'coral', input: text, response_format: 'mp3', instructions: 'Speak as a warm, relaxed British English property professional on a phone call. Natural, conversational pace, with small pauses. Never sound like you are reading.' }),
    })
  }
  if (!res.ok) return bad('Voice service error', 502)
  await db.from('voice_usage').insert({ business_id: c.businessId, user_email: c.email, kind: 'tts', words: text.length }).then(() => {}, () => {})
  return new Response(await res.arrayBuffer(), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
}
