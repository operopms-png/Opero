import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { ADJUSTABLE, LOCKED_LIST, businessRules } from '@/lib/ai-authority'

// Settings -> AI Authority.
//   GET                          -> adjustable rules with their current mode, plus the locked list
//   POST { key, mode }           -> admin sets one rule to auto | approval | never
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rules = await businessRules(c.businessId)
  return NextResponse.json({ rules: ADJUSTABLE.map(r => ({ key: r.key, label: r.label, help: r.help, mode: rules[r.key] ?? r.default, isDefault: !rules[r.key] })), locked: LOCKED_LIST, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can change what the AI may do.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const rule = ADJUSTABLE.find(r => r.key === b.key)
  if (!rule || !['auto', 'approval', 'never'].includes(b.mode)) return NextResponse.json({ error: 'Not a valid rule.' }, { status: 400 })
  const { error } = await db.from('ai_action_rules').upsert({ business_id: c.businessId, rule_key: rule.key, mode: b.mode, set_by: `${c.name || 'Admin'} (${c.email})`, set_at: new Date().toISOString() }, { onConflict: 'business_id,rule_key' })
  if (error) return NextResponse.json({ error: 'Could not save that. Please try again.' }, { status: 500 })
  await db.from('ai_activity_log').insert({ user_id: c.businessId, agent_key: 'chief', action: `Authority changed: ${rule.label} set to ${b.mode === 'auto' ? 'automatic' : b.mode === 'approval' ? 'wait for a person' : 'off'}`, reason: 'Account admin changed an AI authority rule', authorised_by: `${c.name || 'Admin'} (${c.email})` })
  return NextResponse.json({ ok: true })
}
