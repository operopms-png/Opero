import { NextRequest } from 'next/server'
import { getSettings } from '@/lib/receptionist'
import { readForm, takeTurn, twiml } from '@/lib/voice-receptionist'

// Twilio: the caller has said something (Gather speech result).
export const maxDuration = 20

export async function POST(req: NextRequest) {
  const p = await readForm(req)
  const s = await getSettings(req.nextUrl.searchParams.get('biz') ?? '')
  if (!s) return twiml('<Hangup/>')
  return takeTurn(req, s, p)
}
