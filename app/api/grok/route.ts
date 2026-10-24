import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/admin-auth'

// Staff assistant for the Staff Centre dashboard. Read only: it answers questions
// from the figures the page sends and cannot change any records or send messages.
// Requires XAI_API_KEY and XAI_MODEL in the Netlify environment variables.

export const maxDuration = 60

const SYSTEM = `You are the operations assistant for Sangsters Group's staff portal.
Answer using only the figures and records given in the conversation. If the answer is not in them, say so.
You cannot change any records, send messages or make payments. If asked to do so, tell the member of staff to make the change in the portal.
You do not give legal advice. For deposits, notice, eviction or Right to Rent questions, say that a member of staff must handle it.
Keep answers short and plain.`

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Sign in to use the assistant.' }, { status: 401 })

  const apiKey = process.env.XAI_API_KEY
  const model = process.env.XAI_MODEL
  if (!apiKey || !model) return NextResponse.json({ error: 'The assistant is not set up yet. Add XAI_API_KEY and XAI_MODEL in the site settings.' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const message = String(body?.message ?? '').trim().slice(0, 4000)
  if (!message) return NextResponse.json({ error: 'Type a question first.' }, { status: 400 })

  const ctrl = new AbortController()
  const stop = setTimeout(() => ctrl.abort(), 50000)
  let res: Response
  try {
    res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: message },
        ],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'The assistant did not answer in time. Try again.' }, { status: 504 })
  } finally {
    clearTimeout(stop)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json({ error: data?.error?.message ?? 'The assistant could not answer.' }, { status: 502 })
  return NextResponse.json({ reply: data?.choices?.[0]?.message?.content ?? '' })
}
