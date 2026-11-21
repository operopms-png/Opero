// Lets Novourq Cloud AI (Ask AI and Novourq Voice) propose a change to how much a funding partner has put in.
// An admin asking directly saves at once: it only updates the amount invested and currency on the partner's card,
// and the old amount is written to the AI activity log (Staff Centre → AI Command Centre → AI Activity) so it can be put back.
// It does not move money and does not rebuild the repayment schedule.
import { serviceClient as db } from '@/lib/admin-auth'
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
  const { data: saved, error } = await db.from('owner_profiles').update({ invested, currency }).eq('id', p.id).eq('business_id', c.businessId).select('id')
  if (error) return { ok: false, error: error.message }
  if (!saved?.length) return { ok: false, error: 'Partner not found for this account.' }
  await db.from('ai_activity_log').insert({ user_id: c.businessId, agent_key: input.agentKey, action: `Updated ${p.name}'s amount invested: ${was} to ${sym}${fmt(invested)}`, reason: `Was ${was} (${p.currency || 'JMD'}). Asked for by ${c.name || c.email} ${input.via}`.slice(0, 500), authorised_by: `${c.name || c.email} asked for this ${input.via}` }).then(() => {}, () => {})
  return { ok: true, summary: `${p.name}: ${was} to ${sym}${fmt(invested)}` }
}
