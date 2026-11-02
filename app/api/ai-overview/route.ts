import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { WORKFLOWS, AGENT_COUNT } from '@/lib/ai-workflows'

// AI Command Centre overview. ?counts=1 returns just the two menu badges.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const MINUTES_PER_APPROVED = 3

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const biz = c.businessId
  const [waiting, unread] = await Promise.all([
    db.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', biz).in('status', ['pending', 'failed']),
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', biz).in('type', ['ai_alert', 'ai_receptionist']).eq('read', false),
  ])
  const counts = { approvals: waiting.count ?? 0, alerts: unread.count ?? 0 }
  if (req.nextUrl.searchParams.get('counts')) return NextResponse.json(counts)

  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [agents, sent, alerts] = await Promise.all([
    db.from('ai_agents').select('agent_key').eq('user_id', biz).eq('enabled', true),
    db.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', biz).eq('status', 'executed').gte('created_at', since),
    db.from('notifications').select('id, title, message, link, created_at, read').eq('user_id', biz).in('type', ['ai_alert', 'ai_receptionist']).order('created_at', { ascending: false }).limit(4),
  ])
  const on = new Set((agents.data ?? []).map((a: any) => a.agent_key))
  return NextResponse.json({
    ...counts,
    agentsOn: WORKFLOWS.filter(w => on.has(w.agent)).length, agentsTotal: AGENT_COUNT,
    sent30: sent.count ?? 0, hoursSaved: Math.round(((sent.count ?? 0) * MINUTES_PER_APPROVED) / 6) / 10,
    agents: WORKFLOWS.filter(w => on.has(w.agent)).map(w => ({ label: w.label, schedule: w.schedule })),
    alerts: alerts.data ?? [],
  })
}
