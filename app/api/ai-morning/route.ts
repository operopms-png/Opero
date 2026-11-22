import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// Morning brief: what came in, what went out and what needs a yes, for the caller's business, in one reply.
// Approving or rejecting uses the normal /api/ai-approvals route, so every rule there still applies.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const biz = c.businessId
  const since = new Date(Date.now() - 86400000).toISOString()
  const rows = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => (r.data ?? []) as any[]).catch(() => [] as any[])
  const [pending, sent, failed, deals, leads, contacts, bookings] = await Promise.all([
    rows(db.from('ai_pending_actions').select('id, agent_key, action_type, title, draft_body, reason, property_name, created_at').eq('user_id', biz).eq('status', 'pending').neq('title', 'Document matches the record').order('created_at', { ascending: false }).limit(50)),
    rows(db.from('ai_pending_actions').select('id, agent_key, title, executed_at, decided_by_name, decision_note').eq('user_id', biz).eq('status', 'executed').gte('executed_at', since).order('executed_at', { ascending: false }).limit(50)),
    rows(db.from('ai_pending_actions').select('id, title, error').eq('user_id', biz).eq('status', 'failed').limit(20)),
    rows(db.from('crm_deals').select('id, name, module, stage, created_at').eq('user_id', biz).gte('created_at', since).limit(30)),
    rows(db.from('sales_leads').select('id, name, module, created_at').eq('user_id', biz).gte('created_at', since).limit(30)),
    rows(db.from('crm_contacts').select('id, name, type, created_at').eq('user_id', biz).gte('created_at', since).limit(30)),
    rows(db.from('bookings').select('id, check_in, status, created_at').gte('created_at', since).limit(30)),
  ])
  void bookings
  return NextResponse.json({ pending, sent, failed, came_in: { deals, leads, contacts } })
}
