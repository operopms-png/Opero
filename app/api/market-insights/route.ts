import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { callClaude } from '@/lib/claude'

// Dashboard → Quick Insights (AI). The page sends the counts it worked out from the company's own saved deals
// and watchlist; Claude turns them into a few plain sentences. It is told to use only those figures, so nothing
// about the wider market is invented. POST { facts } -> { insights: [{ tone, text }] }

export const maxDuration = 30
const TONES = ['up', 'info', 'flat', 'warn']

function parse(text: string): any[] {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const t = fence ? fence[1] : text
  const a = t.indexOf('['), b = t.lastIndexOf(']')
  if (a === -1 || b <= a) return []
  try { const v = JSON.parse(t.slice(a, b + 1)); return Array.isArray(v) ? v : [] } catch { return [] }
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const facts = body?.facts
  if (!facts || typeof facts !== 'object') return NextResponse.json({ error: 'No figures sent' }, { status: 400 })
  const json = JSON.stringify(facts).slice(0, 3000)

  const { text, error } = await callClaude(
    'You write short dashboard insights for a property company from figures about THEIR OWN saved deals and watchlist. ' +
    'Use only the figures given. Never state market trends, rent growth, prices, forecasts or any number that is not in the figures. ' +
    'Write 3 to 5 insights, one plain sentence each, under 110 characters, corporate tone, no emojis. ' +
    'Reply with JSON only: [{"tone":"up|info|flat|warn","text":"..."}]. up = a strength, info = a neutral fact, flat = a steady or incomplete position, warn = something to act on.',
    json, 450)
  if (error || !text) return NextResponse.json({ error: 'The AI is unavailable right now' }, { status: 502 })

  const insights = parse(text).slice(0, 5).flatMap((x: any) => typeof x?.text === 'string' && x.text.trim()
    ? [{ tone: TONES.includes(x.tone) ? x.tone : 'info', text: x.text.trim().slice(0, 160) }] : [])
  if (!insights.length) return NextResponse.json({ error: 'The AI answer was not usable' }, { status: 502 })
  return NextResponse.json({ insights })
}
