// Scheduled AI proposals. The AI does the writing on a schedule and puts every result in
// the approvals queue (Staff Centre -> AI Command Centre -> AI Approvals); a person approves
// it before anything is sent or changed. Nothing here sends or changes anything itself.
//
// Each agent only runs for a business that switched it on in AI Manager (ai_agents.enabled),
// so by default none of this does anything.
//   daily   : cleaning instructions, maintenance requests, rent reminder drafts
//   Mondays : nightly rate reviews
//   the 1st : monthly owner reports
import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { generateRentReminders } from './rent-reminders'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Counts = { businesses: number; queued: number; skipped: number; noRecipient?: number; errors: string[] }
const fresh = (): Counts => ({ businesses: 0, queued: 0, skipped: 0, errors: [] })
const money = (n: number) => `£${Math.round(n).toLocaleString()}`
const dayStr = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
const monthStart = () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()

async function enabledBusinesses(agentKey: string) {
  const { data } = await getServiceClient().from('ai_agents').select('user_id').eq('agent_key', agentKey).eq('enabled', true)
  return (data ?? []).map((a: any) => a.user_id as string)
}

// Who gets the message: the team member the job is assigned to, or else the one team member
// of the right type who covers that property. If it's unclear or they have no email, nothing is
// proposed (a person has to assign it first).
async function resolveRecipient(businessId: string, assignedTo: string | null, propertyId: string, roleFilter: string) {
  const db = getServiceClient()
  if (assignedTo) {
    const { data } = await db.from('team_members').select('name, email').eq('id', assignedTo).eq('user_id', businessId).maybeSingle()
    return data?.email ? { name: data.name as string, email: data.email as string } : null
  }
  const { data } = await db.from('team_members').select('name, email').eq('user_id', businessId).or(roleFilter).contains('property_ids', [propertyId])
  const withEmail = (data ?? []).filter((m: any) => m.email)
  return withEmail.length === 1 ? { name: withEmail[0].name as string, email: withEmail[0].email as string } : null
}

// ---------- cleaning ----------
export async function proposeCleaning() {
  const db = getServiceClient()
  const result = fresh(); result.noRecipient = 0
  const businesses = await enabledBusinesses('cleaning')
  result.businesses = businesses.length
  for (const businessId of businesses) {
    const { data: props } = await db.from('properties').select('id, name, address, city, max_guests, house_rules').eq('user_id', businessId)
    const ids = (props ?? []).map((p: any) => p.id)
    if (!ids.length) continue
    const { data: tasks } = await db.from('cleaning_tasks').select('id, property_id, assigned_to, scheduled_date, notes')
      .in('property_id', ids).eq('status', 'pending').gte('scheduled_date', dayStr(0)).lte('scheduled_date', dayStr(2))
    for (const t of tasks ?? []) {
      const property: any = (props ?? []).find((p: any) => p.id === t.property_id)
      const to = await resolveRecipient(businessId, t.assigned_to, t.property_id, 'role.ilike.%clean%')
      if (!to) { result.noRecipient!++; continue }
      const system = `You are a cleaning coordinator for a short-term rental company. Draft a short, practical turnover-cleaning checklist and instruction message to send to the cleaner ${to.name} for the property below. Plain text, no subject line, ready to send. Use only the information given.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Max guests: ${property?.max_guests ?? 'Unknown'}
House rules: ${property?.house_rules ?? 'None on file'}
Notes for this job: ${t.notes ?? 'None'}`
      const { text, error } = await callClaude(system, `Cleaning date: ${t.scheduled_date}. Draft the instruction message.`, 450)
      if (error || !text) { result.errors.push(`cleaning ${t.id}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'cleaning', actionType: 'cleaning_instruction',
        title: `Cleaning ${t.scheduled_date}: ${property?.name ?? 'property'}`, propertyName: property?.name ?? null, draftBody: text,
        payload: { task_id: t.id, to: to.email, subject: `Cleaning on ${t.scheduled_date}: ${property?.name ?? 'property'}` },
        context: { summary: `Cleaning on ${t.scheduled_date}, will be emailed to ${to.name}` },
        dedupe: { key: 'task_id', value: t.id },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(`cleaning ${t.id}: ${q.error}`) }
    }
  }
  return result
}

// ---------- maintenance ----------
export async function proposeMaintenance() {
  const db = getServiceClient()
  const result = fresh(); result.noRecipient = 0
  const businesses = await enabledBusinesses('maintenance')
  result.businesses = businesses.length
  for (const businessId of businesses) {
    const { data: props } = await db.from('properties').select('id, name, address, city').eq('user_id', businessId)
    const ids = (props ?? []).map((p: any) => p.id)
    if (!ids.length) continue
    // Only recent tickets, so switching the agent on doesn't mail out the whole backlog.
    const { data: tickets } = await db.from('maintenance_tickets').select('id, property_id, assigned_to, title, description, priority')
      .in('property_id', ids).eq('status', 'open').gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString())
    for (const t of tickets ?? []) {
      const property: any = (props ?? []).find((p: any) => p.id === t.property_id)
      const to = await resolveRecipient(businessId, t.assigned_to, t.property_id, 'role.ilike.%maint%,role.ilike.%contractor%,role.ilike.%repair%,role.ilike.%handy%')
      if (!to) { result.noRecipient!++; continue }
      const system = `You are a maintenance coordinator for a short-term rental company. Draft a short, clear message to ${to.name} asking them to deal with the issue below. Include the property, the problem, the priority and what you need back from them. Plain text, no subject line, ready to send. Use only the information given.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Priority: ${t.priority ?? 'medium'}`
      const { text, error } = await callClaude(system, `Issue: ${t.title ?? 'Maintenance issue'}\nDetails: ${t.description || 'No further details provided.'}`, 400)
      if (error || !text) { result.errors.push(`maintenance ${t.id}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'maintenance', actionType: 'maintenance_instruction',
        title: `Maintenance: ${t.title ?? 'issue'} (${property?.name ?? 'property'})`, propertyName: property?.name ?? null, draftBody: text,
        payload: { ticket_id: t.id, to: to.email, subject: `Maintenance request: ${t.title ?? 'issue'}` },
        context: { summary: `${t.priority ?? 'medium'} priority, will be emailed to ${to.name}` },
        dedupe: { key: 'ticket_id', value: t.id },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(`maintenance ${t.id}: ${q.error}`) }
    }
  }
  return result
}

// ---------- nightly rates ----------
function parseJson(text?: string) {
  if (!text) return null
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

export async function proposeRates() {
  const db = getServiceClient()
  const result = fresh()
  const businesses = await enabledBusinesses('revenue')
  result.businesses = businesses.length
  const ninetyAgo = dayStr(-90)
  for (const businessId of businesses) {
    const { data: props } = await db.from('properties').select('id, name, nightly_rate, max_guests, city, country').eq('user_id', businessId).gt('nightly_rate', 0).limit(15)
    for (const p of props ?? []) {
      const { data: bookings } = await db.from('bookings').select('check_in, check_out, total_amount, status').eq('property_id', p.id).gte('check_in', ninetyAgo)
      const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
      const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
      const occupancyPct = Math.min(100, Math.round((nights / 90) * 100))
      const avgNightly = nights > 0 ? Math.round(active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0) / nights) : 0
      const current = Number(p.nightly_rate)
      const system = `You are a revenue manager for a short-term rental. From the property's own booking performance below (no competitor data is available), recommend one nightly rate. Reply with ONLY JSON: {"recommended_rate": number, "reason": "one or two plain sentences"}. Keep the change modest and only move the rate if the data supports it; otherwise return the current rate.

Property: ${p.name} (${p.city ?? ''}, ${p.country ?? ''}), max ${p.max_guests ?? '?'} guests
Current listed nightly rate: £${current}
Last 90 days occupancy: ${occupancyPct}%
Last 90 days average realised nightly rate: ${avgNightly ? '£' + avgNightly : 'no bookings in period'}`
      const { text, error } = await callClaude(system, 'Give your rate recommendation as JSON.', 250)
      const out = parseJson(text)
      const rate = Math.round(Number(out?.recommended_rate))
      if (error || !out || !Number.isFinite(rate) || rate <= 0) { result.errors.push(`rate ${p.name}: ${error ?? 'unreadable answer'}`); continue }
      // Only worth a person's time if it's a real change, and never a wild one.
      if (Math.abs(rate - current) / current < 0.05 || rate < current * 0.7 || rate > current * 1.3) { result.skipped++; continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'revenue', actionType: 'rate_change',
        title: `Nightly rate: ${p.name} ${money(current)} to ${money(rate)}`, propertyName: p.name, draftBody: String(rate),
        payload: { property_id: p.id, current_rate: current },
        context: { summary: `${occupancyPct}% occupancy over 90 days, average realised rate ${avgNightly ? money(avgNightly) : 'n/a'}. ${String(out.reason ?? '').slice(0, 300)}`, current_rate: current },
        dedupe: { key: 'property_id', value: p.id, sinceIso: new Date(Date.now() - 7 * 86400000).toISOString() },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(`rate ${p.name}: ${q.error}`) }
    }
  }
  return result
}

// ---------- rent reminders ----------
// Reminder drafts already wait for approval on Finance -> Reminders. This just drafts them
// every day for businesses that already use that screen, instead of needing a button press.
export async function proposeRentReminders() {
  const db = getServiceClient()
  const result = { businesses: 0, created: 0, skippedNoPhone: 0, errors: [] as string[] }
  const { data } = await db.from('rent_reminders').select('business_id')
  const businesses = Array.from(new Set((data ?? []).map((r: any) => r.business_id as string)))
  result.businesses = businesses.length
  for (const businessId of businesses) {
    const r = await generateRentReminders(businessId, 'AI (daily)')
    result.created += r.created; result.skippedNoPhone += r.skippedNoPhone
    if (r.error) result.errors.push(`rent ${businessId}: ${r.error}`)
  }
  return result
}

// ---------- owner reports ----------
export async function proposeOwnerReports() {
  const db = getServiceClient()
  const result = fresh()
  const businesses = await enabledBusinesses('owner')
  result.businesses = businesses.length
  const thirtyAgo = dayStr(-30)

  for (const businessId of businesses) {
    const { data: owners } = await db.from('owner_profiles').select('id, name, email, property_ids, split_percentage').eq('business_id', businessId)
    for (const owner of owners ?? []) {
      const ids: string[] = owner.property_ids ?? []
      if (!owner.email || !ids.length) { result.skipped++; continue }

      const [{ data: properties }, { data: bookings }] = await Promise.all([
        db.from('properties').select('name').in('id', ids),
        db.from('bookings').select('check_in, check_out, total_amount, status').in('property_id', ids).gte('check_in', thirtyAgo),
      ])
      const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
      const revenue = active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0)
      const share = owner.split_percentage ?? 60
      const ownerShare = revenue * (share / 100)
      const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
      const propertyNames = (properties ?? []).map((p: any) => p.name).join(', ')

      const system = `You are drafting a friendly, professional monthly owner report email on behalf of a short-term rental management company. Use only the figures given below and do not invent any other numbers, bookings or events. Sign off with just "The management team".

Owner: ${owner.name}
Properties: ${propertyNames || 'None on file'}
Period: last 30 days
Total bookings revenue: ${money(revenue)}
Owner's share (${share}%): ${money(ownerShare)}
Nights booked: ${nights}`
      const { text, error } = await callClaude(system, 'Draft the monthly owner report email body (no subject line).', 500)
      if (error || !text) { result.errors.push(`${owner.name}: ${error ?? 'no text'}`); continue }

      const q = await queueAiAction({
        userId: businessId, agentKey: 'owner', actionType: 'owner_report',
        title: `Monthly report to ${owner.name}`, propertyName: propertyNames || null, draftBody: text,
        payload: { owner_id: owner.id, to: owner.email, subject: 'Your monthly property report' },
        context: { summary: `Last 30 days: ${money(revenue)} revenue, owner share ${money(ownerShare)}, ${nights} nights` },
        // One report per owner per calendar month.
        dedupe: { key: 'owner_id', value: owner.id, sinceIso: monthStart() },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(`${owner.name}: ${q.error}`) }
    }
  }
  return result
}

// force = run everything now regardless of the day (for manual testing).
export async function runAiProposals(force = false) {
  try {
    const now = new Date()
    const out: Record<string, unknown> = {}
    out.cleaning = await proposeCleaning()
    out.maintenance = await proposeMaintenance()
    out.rentReminders = await proposeRentReminders()
    if (force || now.getUTCDay() === 1) out.rates = await proposeRates()
    if (force || now.getUTCDate() === 1) out.ownerReports = await proposeOwnerReports()
    return { ok: true, ...out }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
