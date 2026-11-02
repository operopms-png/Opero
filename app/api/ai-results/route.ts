import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// Results of the AI agents over the last 30 days, per agent: what was drafted, what a person
// approved, edited or rejected, and how long decisions took. Counted from ai_pending_actions.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const MINUTES_SAVED_PER_APPROVED = 3 // an estimate, shown as one on the page

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data, error } = await db.from('ai_pending_actions')
    .select('agent_key, status, draft_body, final_body, created_at, decided_at, decided_by')
    .eq('user_id', c.businessId).neq('title', 'Document matches the record').gte('created_at', since).limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const by: Record<string, any> = {}
  for (const r of data ?? []) {
    const a = (by[r.agent_key] ??= { agent: r.agent_key, drafted: 0, sent: 0, edited: 0, rejected: 0, expired: 0, failed: 0, waiting: 0, mins: [] as number[] })
    a.drafted++
    if (r.status === 'executed') {
      a.sent++
      if (r.final_body && r.final_body !== r.draft_body) a.edited++
    } else if (r.status === 'rejected') { if (r.decided_by) a.rejected++; else a.expired++ }
    else if (r.status === 'failed') a.failed++
    else if (r.status === 'pending') a.waiting++
    if (r.decided_at && r.decided_by) a.mins.push((new Date(r.decided_at).getTime() - new Date(r.created_at).getTime()) / 60000)
  }
  const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.floor(s.length / 2)]) }
  const agents = Object.values(by).map((a: any) => ({ ...a, medianMinutes: median(a.mins), mins: undefined })).sort((a: any, b: any) => b.drafted - a.drafted)
  const total = agents.reduce((s: any, a: any) => ({ drafted: s.drafted + a.drafted, sent: s.sent + a.sent, edited: s.edited + a.edited, rejected: s.rejected + a.rejected }), { drafted: 0, sent: 0, edited: 0, rejected: 0 })
  return NextResponse.json({ days: 30, minutesSavedPerApproved: MINUTES_SAVED_PER_APPROVED, hoursSaved: Math.round((total.sent * MINUTES_SAVED_PER_APPROVED) / 6) / 10, total, agents })
}
