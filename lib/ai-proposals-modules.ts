// Scheduled AI agents for property management: compliance chaser, lease renewals and
// arrears escalation. Each one only drafts an email into the approvals queue (Staff Centre ->
// AI Command Centre -> AI Approvals). Nothing is sent until a person approves it.
//
// Each agent runs only for a business that switched it on in AI Assistant -> Property manager.
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses, companyName, dayStr, daysBetween, niceDate, firstName } from './ai-proposal-utils'

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
      if (!prop || !landlord?.email) { result.noRecipient++; continue }

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
      if (!tenant?.email) { result.noRecipient++; continue }
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
      if (!tenant?.email) { result.noRecipient++; continue }
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
