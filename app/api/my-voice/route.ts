import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { portalIdentity } from '@/lib/my-data'
import { runMyAgent } from '@/lib/my-agent'
import { underLimit, logCall } from '@/lib/voice'

// Novourq Voice for tenants and landlords: a personal assistant limited to the signed-in person's own records.
// POST multipart { text, history (json), call_id } -> { mode: 'command', text, reply, tasks, actions: [] }
export const maxDuration = 60
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: NextRequest) {
  const me = await portalIdentity(req)
  if (!me) return bad('Not signed in', 401)
  if (!(await underLimit(me.email))) return bad('You have used a lot of voice in the last hour. Please try again a little later.', 429)
  const f = await req.formData().catch(() => null)
  const text = String(f?.get('text') || '').replace(/\s+/g, ' ').trim().slice(0, 1500)
  if (!text) return bad('I could not hear anything. Try again, a little closer to the mic.')
  let history: { role: 'user' | 'assistant'; content: string }[] = []
  try {
    const h = JSON.parse(String(f?.get('history') || '[]'))
    if (Array.isArray(h)) history = h.slice(-8).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 1200) }))
  } catch { /* none */ }
  const r = await runMyAgent(me.uid, me.email, text, history)
  const callId = String(f?.get('call_id') || '')
  if (/^[0-9a-f-]{36}$/i.test(callId)) await logCall({ businessId: me.uid, email: me.email }, callId, text, r.reply, r.jobs)
  await db.from('voice_usage').insert({ business_id: me.uid, user_email: me.email, kind: 'command', words: text.split(/\s+/).length }).then(() => {}, () => {})
  return NextResponse.json({ mode: 'command', text, reply: r.reply, tasks: r.jobs, actions: [] })
}
