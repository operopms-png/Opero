// Shared approvals queue for AI agents. Agents never act directly: they call
// queueAiAction() to propose something, a human approves it in Staff Centre →
// AI Approvals, and only then does executeAiAction() carry it out. Every row
// keeps who proposed, who decided, when, and exactly what went out.
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type AiActionType = 'guest_reply' | 'owner_report' | 'cleaning_instruction' | 'maintenance_instruction' | 'rate_change' | 'portal_reply' | 'email_out' | 'listing_description' | 'mark_rent_paid' | 'lease_update' | 'import_records'

// Portal chat tables an approved portal reply may be written to.
const PORTAL_TABLES: Record<string, string> = {
  pm_tenant_messages: 'tenant_id', pm_landlord_messages: 'landlord_id',
  estate_tenant_messages: 'tenant_id', estate_landlord_messages: 'landlord_id',
}

export async function queueAiAction(input: {
  userId: string
  agentKey: string
  actionType: AiActionType
  title: string
  propertyName?: string | null
  draftBody: string
  payload: Record<string, any>
  context?: Record<string, any>
  // Skip if an action of this type already exists with payload[key] = value (any status),
  // optionally only looking back to `sinceIso`. Stops the same job being proposed twice.
  dedupe?: { key: string; value: string; sinceIso?: string }
}) {
  const supabase = getServiceClient()

  // Don't stack duplicates: one pending draft per booking per guest message.
  if (input.actionType === 'guest_reply' && input.payload.booking_id) {
    const { data: existing } = await supabase
      .from('ai_pending_actions')
      .select('id')
      .eq('user_id', input.userId)
      .eq('action_type', 'guest_reply')
      .eq('status', 'pending')
      .eq('payload->>booking_id', input.payload.booking_id)
      .limit(1)
    if (existing?.length) return { skipped: 'a draft is already waiting for this booking' }
  }

  if (input.dedupe) {
    let q = supabase.from('ai_pending_actions').select('id')
      .eq('user_id', input.userId).eq('action_type', input.actionType).eq(`payload->>${input.dedupe.key}`, input.dedupe.value)
    if (input.dedupe.sinceIso) q = q.gte('created_at', input.dedupe.sinceIso)
    const { data: existing } = await q.limit(1)
    if (existing?.length) return { skipped: 'already proposed' }
  }

  const { data, error } = await supabase.from('ai_pending_actions').insert({
    user_id: input.userId,
    agent_key: input.agentKey,
    action_type: input.actionType,
    title: input.title,
    property_name: input.propertyName ?? null,
    draft_body: input.draftBody,
    payload: input.payload,
    context: input.context ?? {},
  }).select('id').single()
  if (error) return { error: error.message }
  return { queued: true, id: data.id as string }
}

const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

async function emailOut(to: string | undefined, subject: string, body: string) {
  if (!to) return { error: 'Missing recipient email' }
  const { sendEmail } = await import('./send-email')
  const result: any = await sendEmail(to, subject, `<p>${esc(body).replace(/\n/g, '<br/>')}</p>`)
  if (result?.skipped) return { error: 'Email is not configured (RESEND_API_KEY missing), so nothing was sent.' }
  if (result?.error) return { error: String(result.error) }
  return { success: true }
}

// Carries out an approved action. Only called from the approve route.
export async function executeAiAction(action: { user_id: string; action_type: string; payload: any }, body: string) {
  const p = action.payload ?? {}

  if (action.action_type === 'guest_reply') {
    if (!p.booking_id) return { error: 'Missing booking_id' }
    // Imported lazily: ai-guest-receptionist imports this file too.
    const { sendGuestMessage } = await import('./ai-guest-receptionist')
    return sendGuestMessage(action.user_id, p.booking_id, p.subject, body, 'ai')
  }

  // Generic email to a named recipient (compliance, renewals, arrears and other agents).
  if (action.action_type === 'email_out') {
    const r: any = await emailOut(p.to, p.subject || 'Message from your property manager', body)
    // A chat-booked viewing becomes Scheduled once its confirmation email has gone out.
    if (r?.success && p.confirm_viewing_id) {
      await getServiceClient().from('estate_viewings').update({ status: 'Scheduled' }).eq('id', p.confirm_viewing_id).eq('user_id', action.user_id).ilike('status', 'requested')
    }
    return r
  }
  if (action.action_type === 'owner_report') return emailOut(p.to, p.subject || 'Your monthly property report', body)
  if (action.action_type === 'cleaning_instruction') return emailOut(p.to, p.subject || 'Cleaning instructions', body)
  if (action.action_type === 'maintenance_instruction') return emailOut(p.to, p.subject || 'Maintenance request', body)

  if (action.action_type === 'rate_change') {
    // The approved text is the new nightly rate. Staff can change the number before approving.
    const rate = Number(String(body).replace(/[^0-9.]/g, ''))
    const current = Number(p.current_rate)
    if (!p.property_id || !Number.isFinite(rate) || rate <= 0) return { error: 'Enter the new nightly rate as a number.' }
    if (Number.isFinite(current) && current > 0 && (rate < current * 0.5 || rate > current * 2)) return { error: `A change of more than 50% (from ${current} to ${rate}) needs to be made by hand.` }
    const db = getServiceClient()
    const { data, error } = await db.from('properties').update({ nightly_rate: rate }).eq('id', p.property_id).eq('user_id', action.user_id).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Property not found for this account.' }
    return { success: true }
  }

  if (action.action_type === 'import_records') {
    const { runImport } = await import('./ai-import')
    return runImport(action.user_id, p)
  }

  if (action.action_type === 'lease_update') {
    // Applies only the four fields the document reader can propose, re-validated here.
    const { LEASE_TABLES } = await import('./ai-proposals-docs')
    const cfg = LEASE_TABLES[p.table]
    if (!cfg || !p.id || !p.fields) return { error: 'Invalid record to update.' }
    const f = p.fields as Record<string, any>, upd: Record<string, any> = {}
    const pos = (n: any) => { const x = Number(n); return Number.isFinite(x) && x > 0 ? x : null }
    const dt = (s: any) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime()) ? s : null)
    if (f.rent != null) { const v = pos(f.rent); if (v == null) return { error: 'Invalid rent.' }; upd[cfg.rent] = v }
    if (f.deposit != null) { const v = pos(f.deposit); if (v == null) return { error: 'Invalid deposit.' }; upd.deposit = v }
    if (f.start_date != null) { const v = dt(f.start_date); if (!v) return { error: 'Invalid start date.' }; upd.start_date = v }
    if (f.end_date != null) { const v = dt(f.end_date); if (!v) return { error: 'Invalid end date.' }; upd.end_date = v }
    if (!Object.keys(upd).length) return { error: 'Nothing to update.' }
    const { data, error } = await getServiceClient().from(p.table).update(upd).eq('id', p.id).eq('user_id', action.user_id).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Record not found for this account.' }
    return { success: true }
  }

  if (action.action_type === 'mark_rent_paid') {
    // Re-checked at approval time: the rent must still be unpaid and the bank line must still match.
    const db = getServiceClient()
    const [{ data: pay }, { data: txn }] = await Promise.all([
      db.from('pm_rent_payments').select('id, amount, status').eq('id', p.payment_id).eq('user_id', action.user_id).maybeSingle(),
      db.from('pm_transactions').select('id, amount, date').eq('id', p.transaction_id).eq('user_id', action.user_id).maybeSingle(),
    ])
    if (!pay || !txn) return { error: 'The rent record or bank line no longer exists.' }
    if (String(pay.status).toLowerCase() === 'paid') return { error: 'This rent is already marked as paid.' }
    if (Math.abs(Number(pay.amount) - Number(txn.amount)) >= 0.01) return { error: 'The amounts no longer match. Mark it by hand.' }
    const { error } = await db.from('pm_rent_payments').update({ status: 'paid', paid_date: txn.date }).eq('id', pay.id).eq('user_id', action.user_id)
    if (error) return { error: error.message }
    return { success: true }
  }

  if (action.action_type === 'listing_description') {
    if (!p.property_id) return { error: 'Missing property_id' }
    const { data, error } = await getServiceClient().from('estate_properties').update({ description: body }).eq('id', p.property_id).eq('user_id', action.user_id).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Property not found for this account.' }
    return { success: true }
  }

  if (action.action_type === 'portal_reply') {
    const fk = PORTAL_TABLES[p.table]
    if (!fk || fk !== p.fk || !p.person_id) return { error: 'Invalid portal reply target.' }
    const db = getServiceClient()
    const { error } = await db.from(p.table).insert({ [fk]: p.person_id, sender: 'ai', message: body, created_at: new Date().toISOString() })
    if (error) return { error: error.message }
    return { success: true }
  }

  return { error: `Unknown action type: ${action.action_type}` }
}
