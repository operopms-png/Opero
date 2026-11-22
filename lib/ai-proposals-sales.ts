// AI sales agent. Follows up every open enquiry and deal in the CRM until it is won or lost, and checks in with
// customers some weeks after a win. Like every agent it only drafts into AI Approvals; nothing is sent until a person approves.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, freshCounts, enabledBusinesses, companyName, firstName } from './ai-proposal-utils'

const done = (r: any, q: any) => { if ('queued' in q) r.queued++; else { r.skipped++; if ('error' in q) r.errors.push(q.error) } }
const MAX_PER_BUSINESS = 12
const closed = (s: any) => /won|lost|closed|cancel/i.test(String(s ?? ''))
const won = (s: any) => /won/i.test(String(s ?? '')) && !/lost/i.test(String(s ?? ''))
// Days since the enquiry arrived, and what each step says.
const STEPS: { step: string; from: number; to: number; brief: string }[] = [
  { step: 'first', from: 1, to: 3, brief: 'Reply to a new enquiry: thank them, say we have their details, and offer a call or viewing. Ask one clear question.' },
  { step: 'second', from: 4, to: 9, brief: 'A gentle follow-up a few days after we first got in touch. Offer help, ask if they still need what they asked about.' },
  { step: 'third', from: 10, to: 20, brief: 'A short second follow-up. Make it easy to reply with a yes or no, and say we will not keep chasing.' },
  { step: 'last', from: 21, to: 35, brief: 'A final polite check-in. Say we will close the enquiry for now and they are welcome to come back any time.' },
]

export async function proposeSalesFollowups() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('sales_followup')
  result.businesses = businesses.length
  const now = Date.now()
  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: deals } = await db.from('crm_deals').select('id, name, stage, value, module, notes, created_at, contact_id').eq('user_id', businessId).order('created_at', { ascending: false }).limit(300)
    const ids = [...new Set((deals ?? []).map((d: any) => d.contact_id).filter(Boolean))]
    const { data: contacts } = ids.length ? await db.from('crm_contacts').select('id, name, email, marketing_unsub_at').eq('user_id', businessId).in('id', ids) : { data: [] as any[] }
    const byId = new Map((contacts ?? []).map((c: any) => [c.id, c]))
    let queued = 0
    for (const d of deals ?? []) {
      if (queued >= MAX_PER_BUSINESS) break
      const c: any = byId.get(d.contact_id)
      if (!c?.email) { if (!closed(d.stage)) result.noRecipient++; continue }
      if (c.marketing_unsub_at) { result.skipped++; continue }
      const age = Math.floor((now - new Date(d.created_at).getTime()) / 86400000)
      let step: string | null = null, brief = ''
      if (won(d.stage)) {
        if (age >= 45 && age <= 90) { step = 'checkin'; brief = 'A friendly check-in with a customer who recently started with us: ask how it is going and whether they need anything else (another property, another service). No hard sell.' }
      } else if (!closed(d.stage)) {
        const s = STEPS.find(x => age >= x.from && age <= x.to)
        if (s) { step = s.step; brief = s.brief }
      }
      if (!step) continue
      const facts = [`Enquiry: ${d.name}`, d.module && `Area: ${d.module}`, d.stage && `Stage: ${d.stage}`, d.value && `Value: ${d.value}`, d.notes && `Notes: ${String(d.notes).slice(0, 500)}`, `Contact first name: ${firstName(c.name) || 'there'}`, `Days since the enquiry: ${age}`].filter(Boolean).join('\n')
      const system = `You write short emails from ${sign} to a person who enquired. ${brief} Use only the facts below. Do not invent prices, availability, offers, deadlines or promises. Warm, plain and professional, 60 to 110 words, no emojis. Start with "Hi ${firstName(c.name) || 'there'}," and end with "Kind regards,\n${sign}". Return only the email body.`
      const { text, error } = await callClaude(system, 'Write the email body.', 350)
      if (error || !text) { result.errors.push(`${d.name}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'sales_followup', actionType: 'email_out',
        title: `${step === 'checkin' ? 'Customer check-in' : 'Enquiry follow-up'}: ${c.name || d.name}`, propertyName: d.name, draftBody: text,
        payload: { to: c.email, subject: step === 'checkin' ? `Checking in from ${sign}` : `Your enquiry with ${sign}`, deal_step: `${d.id}:${step}` },
        context: { summary: `${step === 'checkin' ? 'Check-in' : `Follow-up (${step})`} for ${d.name}, ${age} days after the enquiry. Will be emailed to ${c.name || c.email}. Check it before approving.` },
        dedupe: { key: 'deal_step', value: `${d.id}:${step}` },
      })
      done(result, q); if ('queued' in q) queued++
    }
  }
  return result
}
