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
import { generateRentReminders, sendPendingReminders } from './rent-reminders'
import { runEstimate } from './earnings-estimate'
import { sendPush } from './push'
import { proposePortfolioReview } from './ai-portfolio'
import { proposeChiefPlan } from './ai-chief'
import { proposePmContractorRequests, listContractors, pickContractor } from './ai-contractors'
import { proposeLeaseDocs } from './ai-proposals-docs'
import { expireStaleDrafts, runScoped, scopedBusiness, svc as svcClient, aiTask } from './ai-proposal-utils'
import { styleInstructions } from './ai-style'
import { proposeRentMatches } from './ai-proposals-finance'
import { proposeMaintenancePredictions, proposeMarketForecast } from './ai-forecasting'
import { proposeDealScreening, proposeDealFinder, proposeGoalPlanner } from './ai-deals'
import { proposeWatchers, proposeInvoiceChase, proposeReviewReplies, proposeTeamWeekly } from './ai-watchers'
import { proposeViewings, proposeListings, proposeInvestorUpdates } from './ai-proposals-estate-dev'
import { proposeCompliance, proposeRenewals, proposeArrears, proposeDeposits, proposeInsurance, proposeInspections, proposeStatementReminders } from './ai-proposals-modules'

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
      if (!to) { result.noRecipient!++; await aiTask(businessId, `Assign a cleaner for ${property?.name ?? 'a property'}`, `A clean on ${t.scheduled_date} has nobody to send instructions to. Assign the clean to a team member who has an email address.`); continue }
      const system = `You are a cleaning coordinator for a short-term rental company. Draft a short, practical turnover-cleaning checklist and instruction message to send to the cleaner ${to.name} for the property below. Plain text, no subject line, ready to send. Use only the information given.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Max guests: ${property?.max_guests ?? 'Unknown'}
House rules: ${property?.house_rules ?? 'None on file'}
Notes for this job: ${t.notes ?? 'None'}${await styleInstructions(businessId, 'cleaning')}`
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
      let to: { name: string; email: string } | null = await resolveRecipient(businessId, t.assigned_to, t.property_id, 'role.ilike.%maint%,role.ilike.%contractor%,role.ilike.%repair%,role.ilike.%handy%')
      if (!to && !t.assigned_to) { const c = await pickContractor(businessId, await listContractors(businessId, 'str'), `${t.title ?? ''}. ${t.description ?? ''}`); if (c) to = { name: c.name, email: c.email } }
      if (!to) { result.noRecipient!++; await aiTask(businessId, `Assign a contractor: ${String(t.title ?? 'maintenance job').slice(0, 60)} at ${property?.name ?? 'a property'}`, 'An open maintenance ticket has nobody to send the request to. Assign it to a team member who has an email address.'); continue }
      const system = `You are a maintenance coordinator for a short-term rental company. Draft a short, clear message to ${to.name} asking them to deal with the issue below. Include the property, the problem, the priority and what you need back from them. Plain text, no subject line, ready to send. Use only the information given.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Priority: ${t.priority ?? 'medium'}${await styleInstructions(businessId, 'maintenance')}`
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
  const marketCache = new Map<string, any>() // one web search per place per run
  for (const businessId of businesses) {
    const { data: props } = await db.from('properties').select('id, name, nightly_rate, max_guests, city, country').eq('user_id', businessId).gt('nightly_rate', 0).limit(15)
    for (const p of props ?? []) {
      const { data: bookings } = await db.from('bookings').select('check_in, check_out, total_amount, status').eq('property_id', p.id).gte('check_in', ninetyAgo)
      const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
      const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
      const occupancyPct = Math.min(100, Math.round((nights / 90) * 100))
      const avgNightly = nights > 0 ? Math.round(active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0) / nights) : 0
      const current = Number(p.nightly_rate)
      // Live market rates for the area, from a web search of current listings. Treated as a guide:
      // it is shown to the approver with its sources, never applied without approval.
      const country = /jamaica|st\.? james/i.test(p.country ?? '') ? 'Jamaica' : (p.country ?? '')
      const cur = country === 'Jamaica' ? 'USD' : 'GBP'
      const sym = cur === 'USD' ? '$' : '£'
      const place = `${String(p.city ?? '').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}|${country}`
      if (!marketCache.has(place) && p.city) {
        const est = await runEstimate({ location: String(p.city), country, currency: cur as 'USD' | 'GBP' }).catch(() => null)
        marketCache.set(place, est?.short_let ?? null)
      }
      const market = marketCache.get(place) ?? null
      const marketLine = market?.nightly_typical
        ? `Market nightly rates for similar holiday lets nearby, from a live web search (confidence ${market.confidence}): low ${sym}${market.nightly_low}, typical ${sym}${market.nightly_typical}, high ${sym}${market.nightly_high}. Basis: ${market.basis}`
        : 'No market data could be found for this area.'
      const system = `You are a revenue manager for a short-term rental. From the property's own booking performance below and the market data below, recommend one nightly rate. Do not go outside the market range unless the property's own results clearly justify it. Reply with ONLY JSON: {"recommended_rate": number, "reason": "one or two plain sentences"}. Keep the change modest and only move the rate if the data supports it; otherwise return the current rate.

Property: ${p.name} (${p.city ?? ''}, ${p.country ?? ''}), max ${p.max_guests ?? '?'} guests
Current listed nightly rate: ${sym}${current}
Last 90 days occupancy: ${occupancyPct}%
Last 90 days average realised nightly rate: ${avgNightly ? sym + avgNightly : 'no bookings in period'}\n${marketLine}`
      const { text, error } = await callClaude(system, 'Give your rate recommendation as JSON.', 250)
      const out = parseJson(text)
      const rate = Math.round(Number(out?.recommended_rate))
      if (error || !out || !Number.isFinite(rate) || rate <= 0) { result.errors.push(`rate ${p.name}: ${error ?? 'unreadable answer'}`); continue }
      // Only worth a person's time if it's a real change, and never a wild one.
      if (Math.abs(rate - current) / current < 0.05 || rate < current * 0.7 || rate > current * 1.3) { result.skipped++; continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'revenue', actionType: 'rate_change',
        title: `Nightly rate: ${p.name} ${sym}${current} to ${sym}${rate}`, propertyName: p.name, draftBody: String(rate),
        payload: { property_id: p.id, current_rate: current },
        context: { market: market?.nightly_typical ? { low: market.nightly_low, typical: market.nightly_typical, high: market.nightly_high, confidence: market.confidence, basis: market.basis, symbol: sym, comparables: (market.comparables ?? []).slice(0, 4) } : null, summary: `${occupancyPct}% occupancy over 90 days, average realised rate ${avgNightly ? sym + avgNightly : 'n/a'}. ${String(out.reason ?? '').slice(0, 300)}`, current_rate: current },
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
  const only = scopedBusiness()
  const businesses = Array.from(new Set((data ?? []).map((r: any) => r.business_id as string))).filter(b => !only || b === only)
  result.businesses = businesses.length
  for (const businessId of businesses) {
    const r = await generateRentReminders(businessId, 'AI (daily)')
    result.created += r.created; result.skippedNoPhone += r.skippedNoPhone
    if (r.error) result.errors.push(`rent ${businessId}: ${r.error}`)
    const sent = await sendPendingReminders(businessId).catch(e => ({ sent: 0, skipped: 0, errors: [String(e)] }))
    result.errors.push(...sent.errors)
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
Nights booked: ${nights}${await styleInstructions(businessId, 'owner')}`
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

// ---------- maintenance follow-up ----------
// Jobs still open after 3 days: ask whoever is assigned for a status update. Vacation-rental tickets go to the
// assigned team member by email; Property Management jobs (the assignee there is just a name) become a task.
export async function proposeMaintenanceFollowups() {
  const db = getServiceClient()
  const result = fresh(); result.noRecipient = 0
  const businesses = await enabledBusinesses('maint_followup')
  result.businesses = businesses.length
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString()

  for (const businessId of businesses) {
    const { data: props } = await db.from('properties').select('id, name').eq('user_id', businessId)
    const ids = (props ?? []).map((p: any) => p.id)
    if (ids.length) {
      const { data: tickets } = await db.from('maintenance_tickets').select('id, property_id, assigned_to, title, created_at, status').in('property_id', ids).eq('status', 'open').lt('created_at', cutoff).limit(30)
      for (const t of tickets ?? []) {
        const property: any = (props ?? []).find((p: any) => p.id === t.property_id)
        const to = t.assigned_to ? await resolveRecipient(businessId, t.assigned_to, t.property_id, 'role.ilike.%maint%') : null
        const days = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)
        if (!to) { result.noRecipient!++; await aiTask(businessId, `Chase maintenance: ${String(t.title ?? 'job').slice(0, 60)} at ${property?.name ?? 'a property'}`, `Open for ${days} days and not assigned to anyone with an email address.`); continue }
        const body = `Hi ${to.name.split(' ')[0]},\n\nA quick check on this job: "${t.title ?? 'Maintenance issue'}" at ${property?.name ?? 'the property'}. It was reported ${days} days ago and is still open.\n\nCould you let us know when it will be done, or tell us if you need anything from us to get it finished?\n\nThank you.`
        const q = await queueAiAction({
          userId: businessId, agentKey: 'maint_followup', actionType: 'email_out',
          title: `Follow up: ${String(t.title ?? 'maintenance job').slice(0, 60)}`, propertyName: property?.name ?? null, draftBody: body,
          payload: { to: to.email, subject: `Update needed: ${t.title ?? 'maintenance job'}`, ticket_id: t.id },
          context: { summary: `Open ${days} days · will be emailed to ${to.name}` },
          dedupe: { key: 'ticket_id', value: t.id, sinceIso: dayStr(-3) },
        })
        if ('queued' in q) result.queued++; else result.skipped++
      }
    }
    const { data: pmJobs } = await db.from('pm_maintenance').select('id, property_id, title, status, assigned_to, created_at').eq('user_id', businessId).lt('created_at', cutoff).limit(30)
    for (const j of (pmJobs ?? []).filter((x: any) => /open|new|pending|progress/i.test(String(x.status ?? '')))) {
      const { data: prop } = await db.from('pm_properties').select('name, address').eq('id', j.property_id).eq('user_id', businessId).maybeSingle()
      const days = Math.floor((Date.now() - new Date(j.created_at).getTime()) / 86400000)
      result.queued++
      await aiTask(businessId, `Chase repair: ${String(j.title ?? 'job').slice(0, 60)} at ${prop?.name || prop?.address || 'a property'}`, `Open for ${days} days${j.assigned_to ? `, with ${j.assigned_to}` : ', and not assigned'}. Ask for a status update and tell the tenant what is happening.`)
    }
  }
  return result
}

// ---------- weekly management report ----------
// Monday email to the business owner: this week in counts. The AI writes the short summary from the
// figures; the figures themselves are added by code so they cannot be altered.
export async function proposeWeeklyReport() {
  const db = getServiceClient()
  const result = fresh()
  const businesses = await enabledBusinesses('weekly_report')
  result.businesses = businesses.length
  const weekAgo = dayStr(-7), today = dayStr()
  const monday = dayStr(-((new Date().getUTCDay() + 6) % 7))

  for (const businessId of businesses) {
    const { data: u } = await db.auth.admin.getUserById(businessId)
    const to = u?.user?.email
    if (!to) { result.errors.push(`weekly ${businessId}: no owner email`); continue }
    const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
    const head = { count: 'exact' as const, head: true }
    const [sent, waiting, rejected, rentIn, overdue, openPm, openStr, ending, expired] = await Promise.all([
      count(db.from('ai_pending_actions').select('id', head).eq('user_id', businessId).eq('status', 'executed').gte('decided_at', weekAgo)),
      count(db.from('ai_pending_actions').select('id', head).eq('user_id', businessId).eq('status', 'pending')),
      count(db.from('ai_pending_actions').select('id', head).eq('user_id', businessId).eq('status', 'rejected').not('decided_by', 'is', null).gte('decided_at', weekAgo)),
      count(db.from('pm_rent_payments').select('id', head).eq('user_id', businessId).gte('paid_date', weekAgo).lte('paid_date', today)),
      count(db.from('pm_rent_payments').select('id', head).eq('user_id', businessId).lt('due_date', today).not('status', 'ilike', 'paid')),
      count(db.from('pm_maintenance').select('id', head).eq('user_id', businessId).not('status', 'ilike', '%resolv%').not('status', 'ilike', '%clos%').not('status', 'ilike', '%complet%').not('status', 'ilike', '%done%').not('status', 'ilike', '%cancel%')),
      count(db.from('maintenance_tickets').select('id', head).eq('status', 'open').in('property_id', ((await db.from('properties').select('id').eq('user_id', businessId)).data ?? []).map((p: any) => p.id))),
      count(db.from('pm_leases').select('id', head).eq('user_id', businessId).gte('end_date', today).lte('end_date', dayStr(60))),
      count(db.from('pm_compliance').select('id', head).eq('user_id', businessId).lt('expiry_date', today)),
    ])
    const figures = [
      `AI drafts approved and sent this week: ${sent}`, `AI drafts rejected this week: ${rejected}`, `AI drafts waiting for approval: ${waiting}`,
      `Rent payments received this week: ${rentIn}`, `Rent payments overdue: ${overdue}`,
      `Open maintenance jobs: ${openPm + openStr}`, `Tenancies ending in the next 60 days: ${ending}`, `Compliance certificates expired: ${expired}`,
    ]
    const system = `You write the opening paragraph of a weekly management report for a property company's owner. Use only the figures below. Two or three sentences in plain professional English: say what looks fine and what needs attention. No emojis, no advice beyond pointing at the figures, and do not invent numbers.\n\n${figures.join('\n')}${await styleInstructions(businessId, 'weekly_report')}`
    const { text, error } = await callClaude(system, 'Write the opening paragraph.', 250)
    if (error || !text) { result.errors.push(`weekly ${businessId}: ${error ?? 'no text'}`); continue }
    const q = await queueAiAction({
      userId: businessId, agentKey: 'weekly_report', actionType: 'email_out',
      title: `Weekly report, week of ${monday}`, draftBody: `${text.trim()}\n\nThe figures:\n${figures.map(f => '- ' + f).join('\n')}`,
      payload: { to, subject: `Weekly report, week of ${monday}`, week: monday },
      context: { summary: `Counts from your records · will be emailed to ${to}` },
      dedupe: { key: 'week', value: monday },
    })
    if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
  }
  return result
}

// force = run everything now regardless of the day (for manual testing and "Run now").
// businessId = run for that one business only; leave empty for the scheduled run over everyone.
export async function runAiProposals(force = false, businessId?: string) {
  return runScoped(businessId, async () => {
    try {
      const startedAt = new Date().toISOString()
      const now = new Date()
      const out: Record<string, unknown> = {}
      out.expiry = await expireStaleDrafts()
      out.cleaning = await proposeCleaning()
      out.maintenance = await proposeMaintenance()
      out.rentReminders = await proposeRentReminders()
      out.compliance = await proposeCompliance()
      out.chief = await proposeChiefPlan()
      out.pmRepairs = await proposePmContractorRequests()
      out.renewals = await proposeRenewals()
      out.arrears = await proposeArrears()
      out.viewings = await proposeViewings()
      out.rentMatches = await proposeRentMatches()
      out.listings = await proposeListings()
      out.leaseDocs = await proposeLeaseDocs()
      out.deposits = await proposeDeposits()
      out.insurance = await proposeInsurance()
      out.inspections = await proposeInspections()
      out.maintFollowups = await proposeMaintenanceFollowups()
      Object.assign(out, await proposeWatchers())
      out.invoiceChase = await proposeInvoiceChase()
      out.reviewReplies = await proposeReviewReplies()
      out.dealScreening = await proposeDealScreening()
      out.dealFinder = await proposeDealFinder()
      if (force || now.getUTCDay() === 1) out.goalPlanner = await proposeGoalPlanner()
      if (force || (now.getUTCDate() >= 2 && now.getUTCDate() <= 10)) out.statements = await proposeStatementReminders()
      if (force || now.getUTCDay() === 1) out.maintPredictions = await proposeMaintenancePredictions()
      if (force || now.getUTCDay() === 1) out.weeklyReport = await proposeWeeklyReport()
      if (force || now.getUTCDay() === 1) out.teamWeekly = await proposeTeamWeekly()
      if (force || now.getUTCDay() === 1) out.rates = await proposeRates()
      if (force || now.getUTCDate() === 1) { out.ownerReports = await proposeOwnerReports(); out.marketForecast = await proposeMarketForecast(); out.investorUpdates = await proposeInvestorUpdates(); out.portfolio = await proposePortfolioReview() }
      await svcClient().from('ai_run_log').insert({ user_id: businessId ?? null, workflow: 'proposals', ok: true, result: out })
      // Tell each business's phones how many new drafts are waiting (one message per business).
      const { data: fresh } = await svcClient().from('ai_pending_actions').select('user_id').eq('status', 'pending').gte('created_at', startedAt)
      const per = new Map<string, number>()
      for (const r of fresh ?? []) per.set(r.user_id, (per.get(r.user_id) ?? 0) + 1)
      for (const [biz, n] of per) await sendPush(biz, { title: `${n} new AI draft${n === 1 ? '' : 's'} to approve`, body: 'Open AI Approvals to review them.', url: '/staff-centre/ai-command-centre/approvals' }).catch(() => {})
      return { ok: true, ...out }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      await svcClient().from('ai_run_log').insert({ user_id: businessId ?? null, workflow: 'proposals', ok: false, result: { error } })
      return { ok: false, error }
    }
  })
}
