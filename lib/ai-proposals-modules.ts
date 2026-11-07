// Scheduled AI agents for property management: compliance chaser, lease renewals and
// arrears escalation. Each one only drafts an email into the approvals queue (Staff Centre ->
// AI Command Centre -> AI Approvals). Nothing is sent until a person approves it.
//
// Each agent runs only for a business that switched it on in AI Assistant -> Property manager.
import { queueAiAction } from './ai-approvals'
import { svc, aiTask, aiTaskBy, freshCounts, enabledBusinesses, companyName, dayStr, daysBetween, niceDate, firstName } from './ai-proposal-utils'

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const money = (n: number, cur: string) => (SYM[cur] ?? '') + Math.round(n).toLocaleString('en-GB')

// ---------- compliance chaser ----------
// Certificates that have expired or expire within 30 days -> a reminder to the landlord.
export async function proposeCompliance() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_compliance')
  result.businesses = businesses.length
  const today = dayStr(), horizon = dayStr(30)

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: rows } = await db.from('pm_compliance').select('id, property_id, type, expiry_date').eq('user_id', businessId)
      .not('expiry_date', 'is', null).lte('expiry_date', horizon).not('property_id', 'is', null)
    for (const r of rows ?? []) {
      const { data: prop } = await db.from('pm_properties').select('name, address, owner_id').eq('id', r.property_id).eq('user_id', businessId).maybeSingle()
      const { data: landlord } = prop?.owner_id
        ? await db.from('pm_landlords').select('name, email').eq('id', prop.owner_id).eq('user_id', businessId).maybeSingle()
        : { data: null }
      if (!prop || !landlord?.email) { result.noRecipient++; if (prop) await aiTaskBy('pm_compliance', businessId, `Add a landlord email for ${prop.name || prop.address}`, `The ${r.type} certificate is ${daysBetween(r.expiry_date, today) < 0 ? 'expired' : 'expiring'}, but the landlord has no email address, so no reminder can be drafted.`); continue }

      const left = daysBetween(r.expiry_date, today)
      const expired = left < 0
      const where = prop.name || prop.address
      const hi = firstName(landlord.name) ? `Dear ${firstName(landlord.name)},` : 'Hello,'
      const body = expired
        ? `${hi}\n\nThe ${r.type} certificate for ${where} expired on ${niceDate(r.expiry_date)}. This needs renewing as soon as possible, because a property without a valid certificate can put you at legal risk.\n\nPlease let us know if you would like us to arrange the renewal, or send us the new certificate if you already have it.\n\nKind regards,\n${sign}`
        : `${hi}\n\nThe ${r.type} certificate for ${where} expires on ${niceDate(r.expiry_date)} (${left} day${left === 1 ? '' : 's'} from now). It will need renewing before then.\n\nPlease let us know if you would like us to arrange it, or send us the new certificate if you already have it.\n\nKind regards,\n${sign}`

      const q = await queueAiAction({
        userId: businessId, agentKey: 'pm_compliance', actionType: 'email_out',
        title: `${expired ? 'Expired' : 'Expiring'}: ${r.type} at ${where}`, propertyName: where, draftBody: body,
        payload: { to: landlord.email, subject: `${r.type} ${expired ? 'has expired' : 'is due for renewal'} - ${where}`, compliance_id: `${r.id}:${r.expiry_date}` },
        context: { summary: `${r.type} ${expired ? `expired ${-left} days ago` : `expires in ${left} days`} · will be emailed to ${landlord.name}` },
        // Chase again after three weeks if the same certificate is still out of date.
        dedupe: { key: 'compliance_id', value: `${r.id}:${r.expiry_date}`, sinceIso: dayStr(-21) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- lease renewals ----------
// Tenancies ending within 60 days that have no renewal decision yet -> an email to the tenant.
const ENDED = /end|terminat|expir|cancel|draft/i
const DECIDED = /renewed|agree|accept|declin|notice|vacat/i
export async function proposeRenewals() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_renewals')
  result.businesses = businesses.length
  const today = dayStr(), horizon = dayStr(60)

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: leases } = await db.from('pm_leases').select('id, tenant_id, property_id, end_date, status, renewal_status')
      .eq('user_id', businessId).gte('end_date', today).lte('end_date', horizon)
    for (const l of leases ?? []) {
      if (ENDED.test(l.status || '') || DECIDED.test(l.renewal_status || '')) { result.skipped++; continue }
      const [{ data: tenant }, { data: prop }] = await Promise.all([
        db.from('pm_tenants').select('name, email').eq('id', l.tenant_id).eq('user_id', businessId).maybeSingle(),
        db.from('pm_properties').select('name, address').eq('id', l.property_id).eq('user_id', businessId).maybeSingle(),
      ])
      if (!tenant?.email) { result.noRecipient++; await aiTaskBy('pm_renewals', businessId, `Add an email for ${tenant?.name ?? 'a tenant'}`, 'Their tenancy ends within 60 days but they have no email address, so no renewal message can be drafted.'); continue }
      const where = prop?.name || prop?.address || 'your home'
      const left = daysBetween(l.end_date, today)
      const hi = firstName(tenant.name) ? `Dear ${firstName(tenant.name)},` : 'Hello,'
      const body = `${hi}\n\nYour tenancy at ${where} is due to end on ${niceDate(l.end_date)} (${left} days from now).\n\nWe would like to talk to you about what you plan to do. Please reply to let us know whether you would like to stay on, and we will come back to you with the renewal details. If you are planning to move out, please tell us as soon as you can so we can arrange the end of the tenancy.\n\nKind regards,\n${sign}`
      const q = await queueAiAction({
        userId: businessId, agentKey: 'pm_renewals', actionType: 'email_out',
        title: `Renewal: ${tenant.name} at ${where}`, propertyName: where, draftBody: body,
        payload: { to: tenant.email, subject: `Your tenancy at ${where}`, lease_id: l.id },
        context: { summary: `Tenancy ends ${niceDate(l.end_date)} · will be emailed to ${tenant.name}` },
        dedupe: { key: 'lease_id', value: l.id, sinceIso: dayStr(-45) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- arrears escalation ----------
// Rent more than 14 days late -> a firmer email to the tenant. The first reminders (before due,
// 1 day late, 7 days late) are the text messages on Finance -> Reminders.
export async function proposeArrears() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_arrears')
  result.businesses = businesses.length
  const today = dayStr(), cutoff = dayStr(-14)

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: rows } = await db.from('pm_rent_payments').select('id, tenant_id, property_id, amount, due_date, status')
      .eq('user_id', businessId).lte('due_date', cutoff)
    for (const r of (rows ?? []).filter((x: any) => String(x.status).toLowerCase() !== 'paid')) {
      const [{ data: tenant }, { data: prop }] = await Promise.all([
        db.from('pm_tenants').select('name, email').eq('id', r.tenant_id).eq('user_id', businessId).maybeSingle(),
        db.from('pm_properties').select('name, address, country, currency').eq('id', r.property_id).eq('user_id', businessId).maybeSingle(),
      ])
      if (!tenant?.email) { result.noRecipient++; await aiTaskBy('pm_arrears', businessId, `Chase rent by phone: ${tenant?.name ?? 'a tenant'}`, 'Rent is more than 14 days overdue and the tenant has no email address, so no message can be drafted.', 0); continue }
      const cur = prop?.currency || (/jamaica/i.test(prop?.country || '') ? 'JMD' : 'GBP')
      const days = daysBetween(today, r.due_date)
      const where = prop?.name || prop?.address || 'your property'
      const amt = money(Number(r.amount) || 0, cur)
      const hi = firstName(tenant.name) ? `Dear ${firstName(tenant.name)},` : 'Hello,'
      const body = `${hi}\n\nOur records show that your rent of ${amt} for ${where}, which was due on ${niceDate(r.due_date)}, is now ${days} days overdue.\n\nPlease pay the amount in full within 7 days, or contact us today if you are having difficulty so that we can agree a way forward. If you have already paid, please reply with the date and how you paid so we can correct our records.\n\nKind regards,\n${sign}`
      const q = await queueAiAction({
        userId: businessId, agentKey: 'pm_arrears', actionType: 'email_out',
        title: `Arrears ${days} days: ${tenant.name}`, propertyName: where, draftBody: body,
        payload: { to: tenant.email, subject: `Rent overdue - ${where}`, payment_id: r.id },
        context: { summary: `${amt} overdue ${days} days · will be emailed to ${tenant.name}. Check the payment record before approving.` },
        dedupe: { key: 'payment_id', value: r.id, sinceIso: dayStr(-7) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- deposit protection ----------
// A deposit taken on a UK tenancy has to be put in a government-approved scheme, and the tenant
// given the prescribed information, within 30 days. This watches the lease record and warns staff
// (an alert and a task) before the deadline and every day after it, until the protected date is
// filled in. It never contacts the tenant or the landlord.
const LEASE_OVER = /end|terminat|expir|cancel|draft/i
export async function proposeDeposits() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_deposits')
  result.businesses = businesses.length
  const today = dayStr()
  const { aiAlert } = await import('./push')

  for (const businessId of businesses) {
    const { data: props } = await db.from('pm_properties').select('id, name, address, country').eq('user_id', businessId).is('ended_at', null)
    const { data: leases } = await db.from('pm_leases').select('id, tenant_id, property_id, start_date, status, deposit')
      .eq('user_id', businessId).gt('deposit', 0).is('deposit_protected_date', null).gte('start_date', dayStr(-180))
    let overdue = 0, soon = 0
    for (const l of leases ?? []) {
      const prop: any = (props ?? []).find((p: any) => p.id === l.property_id)
      if (!l.start_date || LEASE_OVER.test(l.status || '') || /jamaica|st\.? james/i.test(prop?.country || '')) continue
      const deadline = new Date(new Date(l.start_date + 'T12:00:00Z').getTime() + 30 * 86400000).toISOString().slice(0, 10)
      const left = daysBetween(deadline, today)
      if (left > 10) continue
      const { data: tenant } = await db.from('pm_tenants').select('name').eq('id', l.tenant_id).eq('user_id', businessId).maybeSingle()
      const where = prop?.name || prop?.address || 'a property'
      left < 0 ? overdue++ : soon++
      result.queued++
      await aiTaskBy('pm_deposits', businessId, `Protect deposit: ${tenant?.name ?? 'tenant'} at ${where}`,
        `The deposit has no protected date on the lease. It should be in a government-approved scheme, with the prescribed information given to the tenant, within 30 days of receipt (about ${niceDate(deadline)} counting from the lease start). ${left < 0 ? `That is ${-left} days overdue.` : `${left} days left.`} Enter the scheme and protected date on the lease once done.`, Math.max(0, left))
    }
    if (overdue) await aiAlert(businessId, `${overdue} tenancy deposit${overdue === 1 ? ' is' : 's are'} past the 30-day protection deadline`, 'Check Leases: no protected date is recorded. Protect the deposit and give the tenant the prescribed information.', '/staff-centre/tasks')
    else if (soon) await aiAlert(businessId, `${soon} tenancy deposit${soon === 1 ? '' : 's'} must be protected within 10 days`, 'No protected date is recorded on the lease yet.', '/staff-centre/tasks')
  }
  return result
}

// ---------- insurance renewals ----------
export async function proposeInsurance() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_insurance')
  result.businesses = businesses.length
  const today = dayStr(), horizon = dayStr(30)

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: rows } = await db.from('pm_insurance_policies').select('id, property_id, policy_type, insurer, policy_number, renewal_date')
      .eq('user_id', businessId).not('renewal_date', 'is', null).lte('renewal_date', horizon).gte('renewal_date', dayStr(-30))
    for (const r of rows ?? []) {
      const { data: prop } = r.property_id ? await db.from('pm_properties').select('name, address, owner_id').eq('id', r.property_id).eq('user_id', businessId).maybeSingle() : { data: null }
      const { data: landlord } = prop?.owner_id ? await db.from('pm_landlords').select('name, email').eq('id', prop.owner_id).eq('user_id', businessId).maybeSingle() : { data: null }
      const where = prop?.name || prop?.address || 'your property'
      const left = daysBetween(r.renewal_date, today)
      if (!landlord?.email) { result.noRecipient++; await aiTaskBy('pm_insurance', businessId, `Chase insurance renewal: ${r.policy_type ?? 'policy'} at ${where}`, `The policy ${left < 0 ? 'passed its renewal date' : `renews on ${niceDate(r.renewal_date)}`}, and the landlord has no email address for a reminder.`); continue }
      const hi = firstName(landlord.name) ? `Dear ${firstName(landlord.name)},` : 'Hello,'
      const policy = [r.policy_type, r.insurer && `with ${r.insurer}`, r.policy_number && `(policy ${r.policy_number})`].filter(Boolean).join(' ')
      const body = `${hi}\n\nThe ${policy || 'insurance policy'} for ${where} ${left < 0 ? `was due for renewal on ${niceDate(r.renewal_date)}` : `renews on ${niceDate(r.renewal_date)}`}.\n\nPlease let us know whether it is being renewed, and send us the new schedule or certificate when you have it. If you would like us to help arrange cover, reply and we will look into it.\n\nKind regards,\n${sign}`
      const q = await queueAiAction({
        userId: businessId, agentKey: 'pm_insurance', actionType: 'email_out',
        title: `Insurance ${left < 0 ? 'overdue' : 'renewal'}: ${where}`, propertyName: where, draftBody: body,
        payload: { to: landlord.email, subject: `Insurance renewal - ${where}`, policy_id: `${r.id}:${r.renewal_date}` },
        context: { summary: `${r.policy_type ?? 'Policy'} ${left < 0 ? `${-left} days past renewal` : `renews in ${left} days`} · will be emailed to ${landlord.name}` },
        dedupe: { key: 'policy_id', value: `${r.id}:${r.renewal_date}`, sinceIso: dayStr(-21) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- inspections ----------
// Properties with no inspection booked or done in the last six months get a task to book one.
export async function proposeInspections() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_inspections')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    const { data: props } = await db.from('pm_properties').select('id, name, address, status').eq('user_id', businessId).is('ended_at', null)
    const { data: insp } = await db.from('pm_inspections').select('property_id, scheduled_date, status').eq('user_id', businessId).gte('scheduled_date', dayStr(-182))
    const covered = new Set((insp ?? []).filter((i: any) => !/cancel/i.test(String(i.status ?? ''))).map((i: any) => i.property_id))
    for (const p of (props ?? []).filter((x: any) => !/sold|clos|inactive|archiv|vacat/i.test(String(x.status ?? '')))) {
      if (covered.has(p.id)) { result.skipped++; continue }
      result.queued++
      await aiTaskBy('pm_inspections', businessId, `Book an inspection: ${p.name || p.address}`, 'No inspection has been done or booked in the last six months. Book one on the Inspections tab.', 7)
    }
  }
  return result
}

// ---------- landlord statements ----------
// The statement figures are built on Reports -> Landlord Reports from the full records. This makes
// sure none are forgotten: from the 2nd to the 10th it lists landlords who received rent last month
// but have no statement for it.
export async function proposeStatementReminders() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('pm_statements')
  result.businesses = businesses.length
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const f = from.toISOString().slice(0, 10), t = to.toISOString().slice(0, 10)
  const monthName = from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const { aiAlert } = await import('./push')

  for (const businessId of businesses) {
    const { data: props } = await db.from('pm_properties').select('id, owner_id').eq('user_id', businessId).is('ended_at', null).not('owner_id', 'is', null)
    const owner = new Map((props ?? []).map((p: any) => [p.id, p.owner_id as string]))
    if (!owner.size) continue
    const { data: paid } = await db.from('pm_rent_payments').select('property_id, status, paid_date').eq('user_id', businessId).gte('paid_date', f).lte('paid_date', t)
    const withRent = new Set((paid ?? []).filter((r: any) => String(r.status).toLowerCase() === 'paid').map((r: any) => owner.get(r.property_id)).filter(Boolean) as string[])
    if (!withRent.size) continue
    const { data: done } = await db.from('landlord_statements').select('landlord_id').eq('user_id', businessId).eq('module', 'pm').lte('period_from', t).gte('period_to', f)
    const have = new Set((done ?? []).map((d: any) => d.landlord_id))
    const missing = Array.from(withRent).filter(id => !have.has(id))
    if (!missing.length) continue
    const { data: names } = await db.from('pm_landlords').select('name').eq('user_id', businessId).in('id', missing)
    result.queued += missing.length
    const list = (names ?? []).map((n: any) => n.name).slice(0, 8).join(', ')
    await aiTaskBy('pm_statements', businessId, `Prepare ${monthName} landlord statements`, `${missing.length} landlord${missing.length === 1 ? ' has' : 's have'} rent received in ${monthName} but no statement: ${list}. Build and send them on Reports, Landlord Reports.`, 3)
    await aiAlert(businessId, `${missing.length} landlord statement${missing.length === 1 ? '' : 's'} for ${monthName} not prepared`, list, '/pm?tab=Landlord%20Reports')
  }
  return result
}
