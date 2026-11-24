// Lets any AI agent (Novourq Cloud AI, Ava and the others) act on an AI Call
// Line call. A task or a note is internal bookkeeping, so it is written
// straight to call_followups (a task also gets a normal staff task). A
// message is outward -- a text back to the caller -- so it always goes
// through the approvals queue (lib/ai-approvals.ts) like every other
// outbound message the AI drafts; it only ever sends once a person approves it.
import { createClient } from '@supabase/supabase-js'
import { aiTaskBy } from './ai-proposal-utils'
import { queueAiAction } from './ai-approvals'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type CallFollowupKind = 'task' | 'note' | 'message'

export async function addCallFollowup(businessId: string, agentKey: string, callId: string, kind: CallFollowupKind, body: string) {
  const supabase = db()
  const { data: call } = await supabase.from('phone_calls').select('caller_name, callback_number, from_number').eq('call_id', callId).eq('business_id', businessId).maybeSingle()
  if (!call) return { error: 'Call not found for this account.' }
  const who = call.caller_name || call.callback_number || call.from_number || 'the caller'

  if (kind === 'note') {
    const { error } = await supabase.from('call_followups').insert({ call_id: callId, business_id: businessId, kind: 'note', body, status: 'open', created_by: agentKey })
    return error ? { error: error.message } : { success: true }
  }

  if (kind === 'task') {
    await aiTaskBy(agentKey, businessId, `Follow up on call: ${who}`.slice(0, 140), body, 1)
    const { error } = await supabase.from('call_followups').insert({ call_id: callId, business_id: businessId, kind: 'task', body, status: 'open', created_by: agentKey })
    return error ? { error: error.message } : { success: true }
  }

  // message: a text back, so it waits in AI Approvals.
  const to = call.callback_number || call.from_number
  if (!to) return { error: 'No number to text back on this call.' }
  const { data: followup, error: fErr } = await supabase.from('call_followups')
    .insert({ call_id: callId, business_id: businessId, kind: 'message', body, status: 'pending_approval', created_by: agentKey })
    .select('id').single()
  if (fErr) return { error: fErr.message }
  const q = await queueAiAction({
    userId: businessId,
    agentKey,
    actionType: 'call_followup',
    title: `Text back ${who}`.slice(0, 140),
    draftBody: body,
    payload: { call_id: callId, to, followup_id: followup.id },
    reason: `Follow-up drafted from a phone call (${callId}).`,
  })
  if ('error' in q && q.error) {
    await supabase.from('call_followups').update({ status: 'failed' }).eq('id', followup.id)
    return { error: q.error }
  }
  if ('id' in q && q.id) await supabase.from('call_followups').update({ pending_action_id: q.id }).eq('id', followup.id)
  return q
}
