// AI Chief of Staff. Reads the whole business, writes a ranked plan for the day, and turns plain-English
// instructions into work. It never acts directly: its output is staff tasks (internal) and email drafts
// that wait in AI Approvals. Emails are only drafted to addresses a person typed into the instruction.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, enabledBusinesses, dayStr, aiTask, aiTaskBy, freshCounts } from './ai-proposal-utils'
import { styleInstructions } from './ai-style'
import { aiAlert } from './push'

const rows = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => (r.data ?? []) as any[]).catch(() => [] as any[])
const open = (s: any) => !/paid|clos|resolv|complet|done|cancel/i.test(String(s ?? ''))

// Tenants and landlords on file, so an instruction can name them. Drafts may go only to these or to addresses typed in.
async function contactDirectory(biz: string) {
  const db = svc()
  const [t, l] = await Promise.all([
    rows(db.from('pm_tenants').select('name, email').eq('user_id', biz).not('email', 'is', null).limit(150)),
    rows(db.from('pm_landlords').select('name, email').eq('user_id', biz).not('email', 'is', null).limit(150)),
  ])
  return [...t.map(x => ({ role: 'tenant', name: String(x.name ?? ''), email: String(x.email).toLowerCase() })), ...l.map(x => ({ role: 'landlord', name: String(x.name ?? ''), email: String(x.email).toLowerCase() }))].filter(c => c.email.includes('@'))
}

export type ChiefStep = { title: string; why: string; notes: string; due_in_days: number }

// Plain counts from the records. The AI only ever sees these, so it cannot invent a figure.
export async function businessFacts(biz: string) {
  const db = svc(), today = dayStr()
  const props = await rows(db.from('properties').select('id').eq('user_id', biz))
  const ids = props.map(p => p.id)
  const [approvals, rent, pmComp, eaComp, devComp, pmLeases, pmMaint, strMaint, checkins, cleans, decided, tasks] = await Promise.all([
    rows(db.from('ai_pending_actions').select('id').eq('user_id', biz).in('status', ['pending', 'failed'])),
    rows(db.from('pm_rent_payments').select('status').eq('user_id', biz).lt('due_date', today)),
    rows(db.from('pm_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', dayStr(30))),
    rows(db.from('estate_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', dayStr(30))),
    rows(db.from('dev_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', dayStr(30))),
    rows(db.from('pm_leases').select('end_date, status').eq('user_id', biz).gte('end_date', today).lte('end_date', dayStr(60))),
    rows(db.from('pm_maintenance').select('status').eq('user_id', biz)),
    rows(db.from('maintenance_tickets').select('status').eq('user_id', biz)),
    ids.length ? rows(db.from('bookings').select('status').in('property_id', ids).in('check_in', [today, dayStr(1), dayStr(2)])) : [],
    rows(db.from('cleaning_tasks').select('status').eq('user_id', biz).lte('scheduled_date', today)),
    rows(db.from('ai_pending_actions').select('status').eq('user_id', biz).gte('decided_at', dayStr(-7)).in('status', ['executed', 'rejected'])),
    rows(db.from('staff_tasks').select('id, status').eq('user_id', biz).neq('status', 'Done')),
  ])
  const comp = [...pmComp, ...eaComp, ...devComp]
  return [
    `Drafts waiting for approval: ${approvals.length}`,
    `Overdue rent payments: ${rent.filter(r => String(r.status).toLowerCase() !== 'paid').length}`,
    `Compliance certificates expired: ${comp.filter(r => r.expiry_date < today).length}`,
    `Compliance certificates expiring within 30 days: ${comp.filter(r => r.expiry_date >= today).length}`,
    `Tenancies ending within 60 days: ${pmLeases.filter(l => !/end|terminat|expir|cancel/i.test(String(l.status ?? ''))).length}`,
    `Open maintenance jobs: ${[...pmMaint, ...strMaint].filter(m => open(m.status)).length}`,
    `Guest check-ins in the next 3 days: ${checkins.filter(b => b.status !== 'cancelled').length}`,
    `Cleans due or overdue: ${cleans.filter(t => String(t.status).toLowerCase() === 'pending').length}`,
    `AI drafts approved in the last 7 days: ${decided.filter(d => d.status === 'executed').length}; rejected: ${decided.filter(d => d.status === 'rejected').length}`,
    `Open staff tasks: ${tasks.length}`,
  ]
}

function parseJson(text: string): any | null {
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

export async function planDay(biz: string): Promise<{ summary: string; steps: ChiefStep[] } | { error: string }> {
  const facts = await businessFacts(biz)
  const system = `You are the chief of staff for a property business. From the figures below, plan today's work for the team. Use only these figures and invent nothing. Return only JSON: {"summary": "two or three plain sentences on the state of the business today", "steps": [{"title": "short imperative task", "why": "one sentence tied to a figure", "notes": "what to do, in one or two sentences", "due_in_days": 0}]}. At most 6 steps, most urgent first. Skip anything with a count of zero. Plain professional English, no emojis. Nothing is sent to anyone: these are tasks for the team.${await styleInstructions(biz, 'chief')}\n\nFigures:\n${facts.join('\n')}`
  const { text, error } = await callClaude(system, 'Write today\'s plan.', 900)
  if (error || !text) return { error: error ?? 'No reply from the AI' }
  const j = parseJson(text)
  if (!j || !Array.isArray(j.steps)) return { error: 'The AI reply could not be read' }
  const steps: ChiefStep[] = j.steps.slice(0, 6).map((s: any) => ({ title: String(s.title ?? '').slice(0, 120), why: String(s.why ?? '').slice(0, 300), notes: String(s.notes ?? '').slice(0, 400), due_in_days: Math.min(7, Math.max(0, Number(s.due_in_days) || 0)) })).filter((s: ChiefStep) => s.title)
  return { summary: String(j.summary ?? '').slice(0, 600), steps }
}

// Scheduled: one plan per day for each business that switched the Chief of Staff on.
export async function proposeChiefPlan() {
  const result = freshCounts()
  const businesses = await enabledBusinesses('chief')
  result.businesses = businesses.length
  for (const biz of businesses) {
    const { data: done } = await svc().from('ai_run_log').select('id').eq('user_id', biz).eq('workflow', 'chief').gte('ran_at', `${dayStr()}T00:00:00Z`).limit(1)
    if (done?.length) { result.skipped++; continue }
    const plan = await planDay(biz)
    if ('error' in plan) { result.errors.push(`chief ${biz}: ${plan.error}`); continue }
    for (const s of plan.steps) { await aiTaskBy('chief', biz, s.title, `${s.why} ${s.notes}`, s.due_in_days); result.queued++ }
    await svc().from('ai_run_log').insert({ user_id: biz, workflow: 'chief', ok: true, result: plan })
    if (plan.steps.length) await aiAlert(biz, 'Your AI plan for today is ready', plan.summary || `${plan.steps.length} tasks added to the task board.`, '/staff-centre/ai-command-centre/chief').catch(() => {})
  }
  return result
}

// A person types an instruction; the AI turns it into tasks, and into email drafts only for addresses typed in it.
export async function followInstruction(biz: string, instruction: string) {
  const facts = await businessFacts(biz)
  const dir = await contactDirectory(biz)
  const given = Array.from(new Set(instruction.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])).map(e => e.toLowerCase())
  const allowed = new Set([...given, ...dir.map(c => c.email)])
  const system = `You are the chief of staff for a property business. A team member has given you an instruction. Turn it into work for the team. Return only JSON: {"reply": "one or two sentences saying what you will set up, or what you need that you do not have", "tasks": [{"title": "short imperative task", "notes": "what to do", "due_in_days": 0}], "emails": [{"to": "address", "subject": "subject", "body": "full email text"}]}. At most 6 tasks. Draft an email only to an address in the instruction or in the contacts list below; otherwise make a task for the team to send it. Never invent facts, names, amounts or addresses. Nothing is sent without a person approving it. Plain professional English, no emojis.${await styleInstructions(biz, 'chief')}\n\nContacts on file (role, name, email):\n${dir.map(c => `${c.role}, ${c.name}, ${c.email}`).join('\n') || 'None'}\n\nCurrent figures:\n${facts.join('\n')}`
  const { text, error } = await callClaude(system, instruction.slice(0, 2000), 1500)
  if (error || !text) return { error: error ?? 'No reply from the AI' }
  const j = parseJson(text)
  if (!j) return { error: 'The AI reply could not be read' }
  let tasks = 0, drafts = 0
  for (const t of (Array.isArray(j.tasks) ? j.tasks : []).slice(0, 6)) {
    if (!t?.title) continue
    await aiTaskBy('chief', biz, String(t.title), `${String(t.notes ?? '')} (Instruction: ${instruction.slice(0, 120)})`, Math.min(14, Math.max(0, Number(t.due_in_days) || 1))); tasks++
  }
  for (const m of (Array.isArray(j.emails) ? j.emails : []).slice(0, 4)) {
    const to = String(m?.to ?? '').toLowerCase()
    if (!allowed.has(to) || !m.body) continue
    const q = await queueAiAction({ userId: biz, agentKey: 'chief', actionType: 'email_out', title: String(m.subject || 'Message').slice(0, 120), draftBody: String(m.body), payload: { to, subject: String(m.subject || 'Message') }, context: { summary: `Drafted from your instruction: "${instruction.slice(0, 120)}" · will be emailed to ${to}` } })
    if ('queued' in q) drafts++
  }
  return { reply: String(j.reply ?? '').slice(0, 500), tasks, drafts }
}

export async function latestPlan(biz: string) {
  const { data } = await svc().from('ai_run_log').select('result, ran_at').eq('user_id', biz).eq('workflow', 'chief').order('ran_at', { ascending: false }).limit(1)
  const r = data?.[0]; return r ? { result: r.result, created_at: r.ran_at } : null
}
