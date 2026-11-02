import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { executeAiAction } from '@/lib/ai-approvals'
import { aiTask } from '@/lib/ai-proposal-utils'
import { sendPush } from '@/lib/push'

// Staff Centre → AI Approvals. GET lists the queue for the caller's business;
// POST approves (optionally with an edited body) or rejects one action.
// Nothing an AI agent drafts reaches a guest/tenant/owner until it passes through here.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db
    .from('ai_pending_actions')
    .select('*')
    .eq('user_id', c.businessId)
    .neq('title', 'Document matches the record')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ actions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const { id, action, note } = b
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'id and action (approve|reject) are required' }, { status: 400 })

  const now = new Date().toISOString()
  const decided = { decided_by: c.uid, decided_by_name: c.name, decided_at: now, decision_note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null }

  if (action === 'reject') {
    const { data, error } = await db.from('ai_pending_actions')
      .update({ status: 'rejected', ...decided })
      .eq('id', id).eq('user_id', c.businessId).in('status', ['pending', 'failed'])
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'This item has already been decided.' }, { status: 409 })
    return NextResponse.json({ success: true })
  }

  const finalBody = typeof b.body === 'string' ? b.body.trim() : ''
  // Claim first so a double-click can't send twice.
  const { data: claimed, error: claimErr } = await db.from('ai_pending_actions')
    .update({ status: 'approved', final_body: finalBody || null, ...decided })
    .eq('id', id).eq('user_id', c.businessId).in('status', ['pending', 'failed'])
    .select('*')
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })
  const row = claimed?.[0]
  if (!row) return NextResponse.json({ error: 'This item has already been decided.' }, { status: 409 })

  const bodyToSend = finalBody || row.draft_body
  if (!bodyToSend) {
    await db.from('ai_pending_actions').update({ status: 'failed', error: 'Empty message' }).eq('id', id)
    return NextResponse.json({ error: 'Message is empty' }, { status: 400 })
  }

  const result = await executeAiAction(row, bodyToSend)
  if ('error' in result && result.error) {
    await db.from('ai_pending_actions').update({ status: 'failed', error: String(result.error).slice(0, 500) }).eq('id', id)
    await sendPush(c.businessId, { title: 'An approved AI action failed', body: String(row.title ?? '').slice(0, 100), url: '/staff-centre/ai-command-centre/approvals' }).catch(() => {})
    await aiTask(c.businessId, `Fix failed AI action: ${String(row.title ?? '').slice(0, 80)}`, String(result.error), 0)
    await db.from('notifications').insert({ user_id: c.businessId, title: `An approved AI action failed: ${String(row.title ?? '').slice(0, 80)}`, message: String(result.error).slice(0, 300), type: 'ai_alert', module: 'staffcentre', link: '/staff-centre/ai-command-centre/approvals', read: false })
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  await db.from('ai_pending_actions').update({ status: 'executed', executed_at: new Date().toISOString(), error: null }).eq('id', id)
  await db.from('ai_activity_log').insert({ user_id: c.businessId, agent_key: row.agent_key, action: `${c.name || 'Staff'} approved: ${row.title}`, property_name: row.property_name })
  return NextResponse.json({ success: true })
}
