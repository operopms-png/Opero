// Lets Novourq Cloud AI (Ask AI and Novourq Voice) propose a change to how much a funding partner has put in.
// It never saves anything itself: the change waits in AI Approvals (always, it cannot be switched to automatic)
// and a person presses Approve. Approving only updates the amount invested and currency on the partner's card.
// It does not move money and does not rebuild the repayment schedule.
import { serviceClient as db } from '@/lib/admin-auth'
import { queueAiAction } from '@/lib/ai-approvals'
import { CURRENCIES, SYMBOL } from '@/lib/partner-schedule'

type Who = { businessId: string; name: string; email: string; isAdmin: boolean }

export async function proposePartnerInvestment(c: Who, input: { partner: string; amount: unknown; currency?: string; agentKey: string; via: string }): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!c.isAdmin) return { ok: false, error: 'Only an admin can change a partner\'s investment.' }
  const name = String(input.partner || '').trim().slice(0, 120)
  if (!name) return { ok: false, error: 'Say which partner.' }
  const invested = Math.round(Number(String(input.amount).replace(/[^0-9.]/g, '')) * 100) / 100
  if (!(invested > 0) || invested > 100000000) return { ok: false, error: 'Give the total amount invested as a number above zero.' }
  const { data: found } = await db.from('owner_profiles').select('id, name, invested, currency').eq('business_id', c.businessId).ilike('name', `%${name.replace(/[%_]/g, '')}%`).limit(6)
  if (!found?.length) return { ok: false, error: `No partner called ${name} on this account. Check Staff Centre → Partners & Investors → Partners.` }
  if (found.length > 1) return { ok: false, error: `More than one match: ${found.map((p: any) => p.name).join(', ')}. Ask which one.` }
  const p: any = found[0]
  const currency = input.currency && CURRENCIES[String(input.currency).toUpperCase()] ? String(input.currency).toUpperCase() : (p.currency || 'JMD')
  const sym = SYMBOL[currency] ?? currency
  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const was = `${SYMBOL[p.currency || 'JMD'] ?? ''}${fmt(Number(p.invested) || 0)}`
  const draft = `Partner: ${p.name}\nAmount invested: was ${was}, change to ${sym}${fmt(invested)}\nCurrency: ${currency}\n\nThis only updates the amount invested on the partner's card. It does not move money and does not change the repayment schedule.`
  const q: any = await queueAiAction({
    userId: c.businessId, agentKey: input.agentKey, actionType: 'partner_investment',
    title: `Update ${p.name}'s investment to ${sym}${fmt(invested)}`, draftBody: draft,
    payload: { owner_id: p.id, invested, currency, previous_invested: Number(p.invested) || 0, previous_currency: p.currency || null },
    context: { summary: `Asked for by ${c.name || c.email} ${input.via}` }, reason: `Requested by ${c.name || c.email} ${input.via}`,
  })
  if (q?.error) return { ok: false, error: q.error }
  if (q?.skipped) return { ok: false, error: String(q.skipped) }
  return { ok: true, summary: `${p.name}: ${was} to ${sym}${fmt(invested)}` }
}
