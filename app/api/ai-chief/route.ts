import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { latestPlan, planDay, followInstruction } from '@/lib/ai-chief'
import { svc, aiTask, aiTaskBy } from '@/lib/ai-proposal-utils'

// GET: the latest daily plan. POST {action:'plan'}: make today's plan now. POST {instruction}: turn an instruction into work.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ plan: await latestPlan(c.businessId) })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (typeof b.instruction === 'string' && b.instruction.trim().length > 3) {
    const r = await followInstruction(c.businessId, b.instruction.trim())
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 502 })
    return NextResponse.json(r)
  }
  if (b.action === 'plan') {
    const p = await planDay(c.businessId)
    if ('error' in p) return NextResponse.json({ error: p.error }, { status: 502 })
    for (const s of p.steps) await aiTaskBy('chief', c.businessId, s.title, `${s.why} ${s.notes}`, s.due_in_days)
    await svc().from('ai_run_log').insert({ user_id: c.businessId, workflow: 'chief', ok: true, result: p })
    return NextResponse.json({ plan: { result: p, created_at: new Date().toISOString() } })
  }
  return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
}
