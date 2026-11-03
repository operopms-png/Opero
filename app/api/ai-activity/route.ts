import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// One timeline of AI activity: what agents logged, and what people decided on their drafts.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [log, decided] = await Promise.all([
    db.from('ai_activity_log').select('agent_key, action, property_name, notes, created_at, reason, authorised_by').eq('user_id', c.businessId).order('created_at', { ascending: false }).limit(100),
    db.from('ai_pending_actions').select('agent_key, title, status, decided_by_name, decided_at, property_name, reason, authorised_by').eq('user_id', c.businessId).neq('title', 'Document matches the record').not('decided_at', 'is', null).order('decided_at', { ascending: false }).limit(100),
  ])
  const items = [
    ...(log.data ?? []).map((r: any) => ({ at: r.created_at, agent: r.agent_key, text: [r.action, r.property_name].filter(Boolean).join(' · '), note: r.notes ?? '', reason: r.reason ?? '', by: r.authorised_by ?? '' })),
    ...(decided.data ?? []).map((r: any) => ({ at: r.decided_at, agent: r.agent_key, text: `${r.title}`, note: r.decided_by_name ? `${r.status === 'rejected' ? 'Rejected' : r.status === 'failed' ? 'Failed' : 'Approved'} by ${r.decided_by_name}` : r.status === 'rejected' ? 'Expired, not approved in time' : r.status, reason: r.reason ?? '', by: r.authorised_by ?? '' })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 150)
  return NextResponse.json({ items })
}
