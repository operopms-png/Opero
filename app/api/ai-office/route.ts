import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { AGENT_COUNT } from '@/lib/ai-workflows'

// AI Office: the recent activity log plus what is waiting for a yes, per agent. Everything is scoped to the caller's own company.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const biz = c.businessId
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [log, waiting, done, agents] = await Promise.all([
    db.from('ai_activity_log').select('agent_key, action, property_name, created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(150),
    db.from('ai_pending_actions').select('agent_key, title, created_at').eq('user_id', biz).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(200),
    db.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', biz).eq('status', 'executed').gte('created_at', since),
    db.from('ai_agents').select('agent_key').eq('user_id', biz).eq('enabled', true),
  ])
  return NextResponse.json({
    items: (log.data ?? []).map((r: any) => ({ at: r.created_at, agent: r.agent_key ?? '', text: [r.action, r.property_name].filter(Boolean).join(' · ') })),
    waiting: (waiting.data ?? []).map((r: any) => ({ at: r.created_at, agent: r.agent_key ?? '', text: r.title })),
    done30: done.count ?? 0,
    agentsOn: (agents.data ?? []).length, agentsTotal: AGENT_COUNT,
  })
}
