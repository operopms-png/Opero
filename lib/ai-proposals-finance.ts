// Bank matching: finds money received on the Banking tab that matches an unpaid rent payment,
// and proposes marking that rent as paid. A person checks and approves each match; nothing is
// marked paid until then. Matches need the same amount, a date close to the due date, and the
// tenant's name in the bank description.
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses, dayStr, niceDate } from './ai-proposal-utils'

const shift = (iso: string, days: number) => new Date(new Date(iso + 'T12:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10)
const words = (name: string) => name.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 3)

export async function proposeRentMatches() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('rent_match')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    const { data: unpaid } = await db.from('pm_rent_payments').select('id, tenant_id, property_id, amount, due_date, status')
      .eq('user_id', businessId).gte('due_date', dayStr(-90)).lte('due_date', dayStr(7))
    const due = (unpaid ?? []).filter((r: any) => String(r.status).toLowerCase() !== 'paid')
    if (!due.length) continue
    const { data: txns } = await db.from('pm_transactions').select('id, description, amount, type, date')
      .eq('user_id', businessId).gte('date', dayStr(-95)).limit(2000)
    const credits = (txns ?? []).filter((t: any) => Number(t.amount) > 0 && !/expense|debit/i.test(String(t.type ?? '')))
    const { data: tenants } = await db.from('pm_tenants').select('id, name').eq('user_id', businessId)
    const used = new Set<string>()

    for (const r of due) {
      const tenant = (tenants ?? []).find((t: any) => t.id === r.tenant_id)
      const ws = words(tenant?.name ?? '')
      if (!ws.length) { result.skipped++; continue }
      const hits = credits.filter((t: any) =>
        !used.has(t.id) && Math.abs(Number(t.amount) - Number(r.amount)) < 0.01 &&
        t.date >= shift(r.due_date, -3) && t.date <= shift(r.due_date, 30) &&
        ws.some(w => String(t.description ?? '').toLowerCase().includes(w)))
      // Only propose when exactly one bank line fits; anything unclear stays for a person.
      if (hits.length !== 1) { result.skipped++; continue }
      const t = hits[0]; used.add(t.id)
      const q = await queueAiAction({
        userId: businessId, agentKey: 'rent_match', actionType: 'mark_rent_paid',
        title: `Rent received: ${tenant?.name}`, draftBody: `Mark ${tenant?.name}'s rent of ${Number(r.amount).toLocaleString('en-GB')} due ${niceDate(r.due_date)} as paid on ${niceDate(t.date)}.`,
        payload: { payment_id: r.id, transaction_id: t.id, pair: `${r.id}:${t.id}`, paid_date: t.date, amount: Number(r.amount) },
        context: { summary: `Bank line: "${t.description}", ${Number(t.amount).toLocaleString('en-GB')} on ${niceDate(t.date)}. Same amount, and the tenant's name is in the description.` },
        dedupe: { key: 'pair', value: `${r.id}:${t.id}` },
      })
      if ('queued' in q) result.queued++; else result.skipped++
    }
  }
  return result
}
