import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { WORKFLOWS } from '@/lib/ai-workflows'
import { runAiProposals } from '@/lib/ai-proposals'

// Workflows screen: what each agent does, when it runs, whether it is on and what the last run did.
// POST {action:'run'} runs every agent now for the caller's business only. It only adds drafts to Approvals.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const biz = c.businessId
  const [agents, runs] = await Promise.all([
    db.from('ai_agents').select('agent_key').eq('user_id', biz).eq('enabled', true),
    db.from('ai_run_log').select('user_id, ok, result, ran_at').eq('workflow', 'proposals').or(`user_id.eq.${biz},user_id.is.null`).order('ran_at', { ascending: false }).limit(1),
  ])
  const on = new Set((agents.data ?? []).map((a: any) => a.agent_key))
  const last = runs.data?.[0] ?? null
  return NextResponse.json({
    lastRun: last ? { at: last.ran_at, ok: last.ok, manual: !!last.user_id } : null,
    workflows: WORKFLOWS.map(w => ({
      agent: w.agent, label: w.label, module: w.module, schedule: w.schedule, live: !!w.live, on: on.has(w.agent),
      lastQueued: !w.live && w.resultKey && last?.result ? (last.result as any)[w.resultKey]?.queued ?? (last.result as any)[w.resultKey]?.created ?? null : null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'run') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const r: any = await runAiProposals(true, c.businessId)
  if (!r.ok) return NextResponse.json({ error: r.error || 'The run failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
