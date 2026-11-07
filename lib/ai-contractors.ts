// Contractor directory for the maintenance agent. The AI picks the best-fitting contractor from the
// business's own list (Vendors tab) for a job, then drafts the request. It never invents a contractor,
// and the request is only sent after a person approves it in AI Approvals.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, enabledBusinesses, aiTask, aiTaskBy, freshCounts } from './ai-proposal-utils'
import { styleInstructions } from './ai-style'

export type Contractor = { id: string; name: string; email: string; type: string; company: string }

export async function listContractors(biz: string, module: string): Promise<Contractor[]> {
  const { data } = await svc().from('vendor_contractors').select('id, name, email, type, company, status').eq('user_id', biz).eq('module', module).limit(60)
  return (data ?? []).filter((c: any) => c.email && String(c.email).includes('@') && !/inactive|blocked/i.test(String(c.status ?? ''))).map((c: any) => ({ id: c.id, name: String(c.name), email: String(c.email), type: String(c.type ?? ''), company: String(c.company ?? '') }))
}

// Picks one contractor whose type fits the job, or null if none fits. Never returns someone not on the list.
export async function pickContractor(biz: string, list: Contractor[], issue: string): Promise<Contractor | null> {
  if (!list.length) return null
  if (list.length === 1 && !/clean/i.test(list[0].type)) return list[0]
  const system = `Choose the best contractor for a maintenance job from the list. Match the contractor's type to the work. Return only JSON: {"id": "<id from the list>"} or {"id": null} if none fits. Do not choose a cleaner for repairs.\n\nContractors:\n${list.map(c => `${c.id} | ${c.name}${c.company ? ' (' + c.company + ')' : ''} | ${c.type}`).join('\n')}`
  const r = await callClaude(system, issue.slice(0, 600), 80)
  const m = r.text?.match(/\{[\s\S]*\}/)
  try { const id = JSON.parse(m?.[0] ?? '{}').id; return list.find(c => c.id === id) ?? null } catch { return null }
}

// Property Management repair jobs that nobody has been asked to do yet. Recent ones only, so switching the
// agent on does not mail out the whole backlog.
export async function proposePmContractorRequests() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('maintenance')
  result.businesses = businesses.length
  for (const biz of businesses) {
    const list = await listContractors(biz, 'pm')
    const { data: jobs } = await db.from('pm_maintenance').select('id, property_id, title, description, priority, status, assigned_to')
      .eq('user_id', biz).eq('status', 'open').is('assigned_to', null).gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()).limit(15)
    if (!jobs?.length) continue
    const { data: props } = await db.from('pm_properties').select('id, name, address').eq('user_id', biz).is('ended_at', null)
    for (const j of jobs) {
      const prop: any = (props ?? []).find((p: any) => p.id === j.property_id)
      const issue = `${j.title ?? ''}. ${j.description ?? ''}`
      const to = await pickContractor(biz, list, issue)
      if (!to) { result.noRecipient++; await aiTaskBy('maintenance', biz, `Find a contractor: ${String(j.title ?? 'repair').slice(0, 60)} at ${prop?.name ?? 'a property'}`, list.length ? 'No contractor on your Vendors list fits this job. Add one with an email address.' : 'There are no contractors with an email address on your Vendors list. Add one so the AI can send repair requests.'); continue }
      const system = `You are a maintenance coordinator for a property management company. Draft a short, clear message to ${to.name} asking them to quote for or deal with the repair below. Include the property, the problem and the priority, and ask when they can attend and for a quote. Plain text, no subject line, ready to send. Use only the information given.\n\nProperty: ${prop?.name ?? 'Unknown'} (${prop?.address ?? ''})\nPriority: ${j.priority ?? 'medium'}${await styleInstructions(biz, 'maintenance')}`
      const { text, error } = await callClaude(system, `Repair: ${j.title ?? 'Repair'}\nDetails: ${j.description || 'No further details provided.'}`, 400)
      if (error || !text) { result.errors.push(`pm repair ${j.id}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: biz, agentKey: 'maintenance', actionType: 'maintenance_instruction',
        title: `Repair request: ${j.title ?? 'repair'} (${prop?.name ?? 'property'})`, propertyName: prop?.name ?? null, draftBody: text,
        payload: { job_id: j.id, to: to.email, subject: `Repair request: ${j.title ?? 'repair'}` },
        context: { summary: `${j.priority ?? 'medium'} priority · chosen from your Vendors list: ${to.name}${to.type ? ' (' + to.type + ')' : ''} · will be emailed to ${to.email}` },
        dedupe: { key: 'job_id', value: j.id },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(`pm repair ${j.id}: ${q.error}`) }
    }
  }
  return result
}
