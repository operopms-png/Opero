// Shared approvals queue for AI agents. Agents never act directly: they call
// queueAiAction() to propose something, a human approves it in Staff Centre →
// AI Approvals, and only then does executeAiAction() carry it out. Every row
// keeps who proposed, who decided, when, and exactly what went out.
import { createClient } from '@supabase/supabase-js'
import { aiTask, aiTaskBy } from './ai-proposal-utils'
import { authorityFor } from './ai-authority'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type AiActionType = 'guest_reply' | 'owner_report' | 'cleaning_instruction' | 'maintenance_instruction' | 'rate_change' | 'portal_reply' | 'email_out' | 'listing_description' | 'mark_rent_paid' | 'lease_update' | 'import_records' | 'marketing_list' | 'partner_investment' | 'building_notice' | 'social_post' | 'video_brief' | 'investor_pack' | 'whatsapp_send' | 'call_followup'

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
  reason?: string // why the AI is proposing this, shown in the audit trail
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

  const gate = await authorityFor(input.userId, input.agentKey, input.actionType, `${input.title} ${input.draftBody}`).catch(() => null)
  if (gate?.mode === 'never') return { skipped: gate.why }
  const { data, error } = await supabase.from('ai_pending_actions').insert({
    user_id: input.userId,
    reason: (input.reason ?? input.context?.summary ?? `${input.agentKey} proposed this: ${input.title}`).toString().slice(0, 500),
    authority: 'person',
    agent_key: input.agentKey,
    action_type: input.actionType,
    title: input.title,
    property_name: input.propertyName ?? null,
    draft_body: input.draftBody,
    payload: input.payload,
    context: input.context ?? {},
  }).select('id').single()
  if (error) return { error: error.message }
  const autoSent = await autoSendIfOn(input.userId, input.agentKey, input.actionType, data.id as string, `${input.title} ${input.draftBody}`).catch(() => false)
  return { queued: true, id: data.id as string, autoSent }
}

// Novourq Cloud AI carries out its own work without waiting: messages, replies, instructions, price changes,
// listings, rent matching and imports. Two things always wait for a person for now: anything that sends money
// and anything that is a legal contract (lease changes, renewal offers, signing). At most 40 a day per business;
// past that, drafts wait in Approvals as before.
const AUTO_DAILY_CAP = 40

async function autoSendIfOn(userId: string, agentKey: string, actionType: string, id: string, text: string) {
  const gate = await authorityFor(userId, agentKey, actionType, text)
  if (gate.mode !== 'auto') return false
  const db = getServiceClient()
  const { data: ag } = await db.from('ai_agents').select('auto_send, enabled, changed_by').eq('user_id', userId).eq('agent_key', agentKey).maybeSingle()
  if (!ag?.enabled || !ag?.auto_send) return false
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
  const { count } = await db.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('decision_note', 'Sent automatically').gte('decided_at', startOfDay.toISOString())
  if ((count ?? 0) >= AUTO_DAILY_CAP) return false
  const { data: claimed } = await db.from('ai_pending_actions')
    .update({ status: 'approved', decided_by_name: 'Novourq Cloud AI', decision_note: 'Sent automatically', decided_at: new Date().toISOString(), authority: 'auto', authorised_by: ag.changed_by ? `${ag.changed_by} (switched on automatic sending)` : 'Account admin (automatic sending is on by default)' })
    .eq('id', id).eq('status', 'pending').select('*')
  const row = claimed?.[0]
  if (!row) return false
  if (!row.draft_body && actionType !== 'rate_change' && actionType !== 'mark_rent_paid' && actionType !== 'import_records') return false
  const result: any = await executeAiAction(row, row.draft_body)
  if (result && 'error' in result && result.error) {
    await db.from('ai_pending_actions').update({ status: 'failed', error: String(result.error).slice(0, 500) }).eq('id', id)
    await aiTaskBy(agentKey, userId, `Fix failed AI action: ${String(row.title ?? '').slice(0, 80)}`, String(result.error), 0)
    return false
  }
  await db.from('ai_pending_actions').update({ status: 'executed', executed_at: new Date().toISOString(), error: null }).eq('id', id)
  await db.from('ai_activity_log').insert({ user_id: userId, agent_key: agentKey, action: `Sent automatically: ${row.title}`, property_name: row.property_name, reason: row.reason ?? null, authorised_by: ag.changed_by ? `${ag.changed_by} (switched on automatic sending)` : 'Account admin (automatic sending is on by default)' })
  return true
}

const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

async function emailOut(to: string | undefined, subject: string, body: string, businessId?: string) {
  if (!to) return { error: 'Missing recipient email' }
  const { sendEmail } = await import('./send-email')
  let result: any
  if (businessId) {
    const { brandedEmail } = await import('./branded-email')
    const b = await brandedEmail(businessId, body)
    result = await sendEmail(to, subject, b.html, b.replyTo, b.from)
  } else result = await sendEmail(to, subject, `<p>${esc(body).replace(/\n/g, '<br/>')}</p>`)
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
    const r: any = await emailOut(p.to, p.subject || 'Message from your property manager', body, action.user_id)
    // A chat-booked viewing becomes Scheduled once its confirmation email has gone out.
    if (r?.success && p.confirm_viewing_id) {
      await getServiceClient().from('estate_viewings').update({ status: 'Scheduled' }).eq('id', p.confirm_viewing_id).eq('user_id', action.user_id).ilike('status', 'requested')
    }
    return r
  }
  if (action.action_type === 'marketing_list') {
    const { sendToList } = await import('./marketing-send')
    const r = await sendToList({ businessId: action.user_id, audience: p.audience, mode: p.mode, subject: String(p.subject || ''), body, docIds: Array.isArray(p.doc_ids) ? p.doc_ids : [] })
    return r.error ? { error: r.error } : { success: true }
  }
  if (action.action_type === 'video_brief') {
    // Becomes a task: make the video in Snippo from this brief, then upload it to Marketing, Videos.
    const due = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    const { error } = await getServiceClient().from('staff_tasks').insert({ user_id: action.user_id, title: `Make video in Snippo: ${p.label || 'brief'}`.slice(0, 140), status: 'On track', due_date: due, notes: `[AI] ${String(body).slice(0, 1800)}\n\nWhen finished, upload it in Marketing, Videos.` })
    return error ? { error: error.message } : { success: true }
  }
  if (action.action_type === 'social_post') {
    // Saved to Marketing, Social posts. It is not posted to the platform from here; that needs the account connected.
    const mod = ['pm', 'str', 'estate', 'dev'].includes(p.module) ? p.module : 'estate'
    const { error } = await getServiceClient().from('marketing_socials').insert({ user_id: action.user_id, module: mod, caption: String(body).slice(0, 2000), platform: p.platform || 'Instagram', status: 'Scheduled', scheduled_at: p.scheduled_at || null, owner: 'Novourq Cloud AI' })
    return error ? { error: error.message } : { success: true }
  }
  if (action.action_type === 'owner_report') return emailOut(p.to, p.subject || 'Your monthly property report', body, action.user_id)
  if (action.action_type === 'cleaning_instruction') return emailOut(p.to, p.subject || 'Cleaning instructions', body, action.user_id)
  if (action.action_type === 'maintenance_instruction') return emailOut(p.to, p.subject || 'Maintenance request', body, action.user_id)

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

  if (action.action_type === 'partner_investment') {
    // Only the amount invested and currency. Re-checked here: the partner must still belong to this account.
    const invested = Number(p.invested)
    if (!p.owner_id || !(invested > 0)) return { error: 'Invalid amount.' }
    const { CURRENCIES } = await import('./partner-schedule')
    const currency = CURRENCIES[String(p.currency)] ? String(p.currency) : 'JMD'
    const { data, error } = await getServiceClient().from('owner_profiles').update({ invested, currency }).eq('id', p.owner_id).eq('business_id', action.user_id).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Partner not found for this account.' }
    return { success: true }
  }

  if (action.action_type === 'whatsapp_send') {
    // Sends the approved (and possibly edited) text through the company's own linked WhatsApp number.
    const to = String(p.jid || p.phone || '')
    if (!to) return { error: 'The recipient is missing.' }
    const { sendWhatsApp } = await import('./whatsapp')
    const r = await sendWhatsApp(action.user_id, { to, text: body, by: 'Novourq Cloud AI (approved)' })
    return r.ok ? { success: true } : { error: r.error }
  }

  if (action.action_type === 'investor_pack') {
    // Makes an investor pack's link live (stage Sent). Re-checked here: an existing pack must still be this account's and still a draft.
    // The link is never sent to the investor from here; a person copies it from Pack Builder.
    const db = getServiceClient(), now = new Date().toISOString()
    if (p.pack_id) {
      const { data: cur } = await db.from('invest_packs').select('id,stage').eq('id', String(p.pack_id)).eq('business_id', action.user_id).maybeSingle()
      if (!cur) return { error: 'That pack no longer exists.' }
      if (cur.stage !== 'draft') return { success: true }
      const { error } = await db.from('invest_packs').update({ stage: 'sent', sent_at: now, updated_at: now }).eq('id', cur.id).eq('business_id', action.user_id)
      if (error) return { error: error.message }
      return { success: true }
    }
    const investor = String(p.investor || '').trim().slice(0, 80)
    if (!investor) return { error: 'The investor name is missing.' }
    const { cleanPack, DEFAULT_PACK, DEFAULT_PROPERTY_PACK } = await import('./pack-calc')
    const prop = p.kind === 'property'
    const data = cleanPack({ ...(prop ? DEFAULT_PROPERTY_PACK : DEFAULT_PACK), prepared_for: investor, investors: Number(p.investors) || 2 })
    const { error } = await db.from('invest_packs').insert({ business_id: action.user_id, name: `${prop ? 'Property pack' : 'Investment pack'}: ${investor}`.slice(0, 150), prepared_for: investor, stage: 'sent', sent_at: now, data, created_by: 'Novourq Cloud AI' })
    if (error) return { error: error.message }
    return { success: true }
  }

  if (action.action_type === 'building_notice') {
    // Posts the notice for the chosen homes (re-checked against this account) and emails the people it is for.
    const ids: string[] = Array.isArray(p.property_ids) ? p.property_ids : []
    const { data: ok } = ids.length ? await getServiceClient().from('pm_properties').select('id').in('id', ids).eq('user_id', action.user_id) : { data: [] as any[] }
    const valid = (ok ?? []).map((x: any) => x.id)
    if (!valid.length || !p.title || !p.body) return { error: 'The homes or the notice text are missing.' }
    const { data: n, error } = await getServiceClient().from('building_notices').insert({
      business_id: action.user_id, title: String(p.title).slice(0, 140), body: String(p.body).slice(0, 4000), building_name: p.building_name ?? null, property_ids: valid,
      for_tenants: p.for_tenants !== false, for_landlords: p.for_landlords !== false, for_partners: p.for_partners !== false, created_by_name: p.created_by_name ?? 'Novourq Cloud AI',
    }).select('*').single()
    if (error) return { error: error.message }
    if (p.send_email !== false) { const { emailNotice } = await import('./building-notices'); await emailNotice(n).catch(() => 0) }
    return { success: true }
  }

  if (action.action_type === 'listing_description') {
    if (!p.property_id) return { error: 'Missing property_id' }
    const { data, error } = await getServiceClient().from('estate_properties').update({ description: body }).eq('id', p.property_id).eq('user_id', action.user_id).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Property not found for this account.' }
    return { success: true }
  }

  if (action.action_type === 'call_followup') {
    // A follow-up text back to a caller from AI Call Line. Note and task follow-ups are
    // not outward, so they are written straight to call_followups (lib/ai-call-followups.ts)
    // without going through here; only the message kind reaches the queue, and only here.
    const to = String(p.to || '')
    if (!to) return { error: 'The caller’s number is missing.' }
    const { sendSms } = await import('./send-sms')
    const r = await sendSms(to, body)
    if (r.skipped) return { error: 'Texting is not set up yet (Twilio), so this could not be sent.' }
    if (r.error) return { error: r.error }
    if (p.followup_id) await getServiceClient().from('call_followups').update({ status: 'sent' }).eq('id', p.followup_id)
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
