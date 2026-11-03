// Watcher skills. Each one looks at one tab's records every day, finds what needs a person, and leaves
// ONE task on Staff Centre -> Tasks that lists it. Nothing is sent or changed: a person decides.
// The three that write (invoice chase, review replies, team summary) only add drafts for approval.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc, aiTask, freshCounts, enabledBusinesses, companyName, dayStr, firstName } from './ai-proposal-utils'

type Db = ReturnType<typeof svc>
type Found = { title: string; lines: string[]; dueInDays?: number } | null
type Watcher = { agent: string; resultKey: string; find: (db: Db, biz: string, names: Map<string, string>) => Promise<Found> }

const today = () => dayStr()
const soon = (d: number) => dayStr(d)
const done = (s: unknown) => /done|complete|closed|resolved|paid|filed|signed|cancel|void|reject|hired|declin/i.test(String(s ?? ''))
const money = (n: unknown) => Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })
const cap = (lines: string[], n = 12) => lines.length > n ? [...lines.slice(0, n), `…and ${lines.length - n} more`] : lines

async function propertyNames(db: Db, biz: string) {
  const m = new Map<string, string>()
  for (const t of ['pm_properties', 'estate_properties']) {
    const { data } = await db.from(t).select('id, name, address').eq('user_id', biz)
    for (const p of data ?? []) m.set(p.id, p.name || p.address || 'Property')
  }
  return m
}

const WATCHERS: Watcher[] = [
  { agent: 'keys_check', resultKey: 'keysCheck', async find(db, biz, nm) {
    const { data } = await db.from('pm_keys').select('key_set, held_by, property_id, last_checked').eq('user_id', biz)
    const old = (data ?? []).filter((k: any) => !k.last_checked || k.last_checked < dayStr(-180))
    return old.length ? { title: 'Check key sets not checked in 6 months', lines: cap(old.map((k: any) => `${nm.get(k.property_id) ?? 'Property'}: ${k.key_set || 'key set'}${k.held_by ? `, held by ${k.held_by}` : ''}, ${k.last_checked ? 'last checked ' + k.last_checked : 'never checked'}`)) } : null
  } },
  { agent: 'head_lease_watch', resultKey: 'headLeaseWatch', async find(db, biz, nm) {
    const { data } = await db.from('pm_head_leases').select('property_id, expiry_date, break_date').eq('user_id', biz)
    const lines: string[] = []
    for (const h of data ?? []) {
      if (h.expiry_date && h.expiry_date <= soon(90)) lines.push(`${nm.get(h.property_id) ?? 'Property'}: head lease ${h.expiry_date < today() ? 'expired' : 'expires'} ${h.expiry_date}`)
      if (h.break_date && h.break_date <= soon(90) && h.break_date >= dayStr(-14)) lines.push(`${nm.get(h.property_id) ?? 'Property'}: break date ${h.break_date}`)
    }
    return lines.length ? { title: 'Head leases expiring or reaching a break date', lines: cap(lines) } : null
  } },
  { agent: 'risk_alerts', resultKey: 'riskAlerts', async find(db, biz, nm) {
    const [{ data: hl }, { data: units }] = await Promise.all([
      db.from('pm_head_leases').select('property_id, rent_payable').eq('user_id', biz),
      db.from('pm_units').select('property_id, monthly_rent, tenant_id').eq('user_id', biz),
    ])
    const lines: string[] = []
    for (const h of hl ?? []) {
      const head = Number(h.rent_payable) || 0
      if (!head) continue
      const income = (units ?? []).filter((u: any) => u.property_id === h.property_id && u.tenant_id).reduce((a: number, u: any) => a + (Number(u.monthly_rent) || 0), 0)
      if (income < head) lines.push(`${nm.get(h.property_id) ?? 'Property'}: head rent ${money(head)} a month, sublet income ${money(income)}`)
    }
    return lines.length ? { title: 'Sublet properties where income is below head rent', lines: cap(lines) } : null
  } },
  { agent: 'hmo_licence', resultKey: 'hmoLicence', async find(db, biz, nm) {
    const { data } = await db.from('pm_hmo_rooms').select('property_id, room_name, licence_expiry').eq('user_id', biz).not('licence_expiry', 'is', null).lte('licence_expiry', soon(60))
    return data?.length ? { title: 'HMO licences expiring', lines: cap(data.map((r: any) => `${nm.get(r.property_id) ?? 'Property'}${r.room_name ? ' · ' + r.room_name : ''}: licence ${r.licence_expiry < today() ? 'expired' : 'expires'} ${r.licence_expiry}`)) } : null
  } },
  { agent: 'utilities_watch', resultKey: 'utilitiesWatch', async find(db, biz, nm) {
    const { data } = await db.from('pm_utilities').select('property_id, service, supplier, next_bill_date, monthly_amount').eq('user_id', biz).not('next_bill_date', 'is', null).lte('next_bill_date', soon(7))
    return data?.length ? { title: 'Utility bills due this week', lines: cap(data.map((u: any) => `${nm.get(u.property_id) ?? 'Property'}: ${u.service || 'utility'}${u.supplier ? ' (' + u.supplier + ')' : ''} due ${u.next_bill_date}${u.monthly_amount ? ', about ' + money(u.monthly_amount) : ''}`)) } : null
  } },
  { agent: 'mortgage_watch', resultKey: 'mortgageWatch', async find(db, biz, nm) {
    const lines: string[] = []
    for (const t of ['pm_mortgages', 'estate_mortgages']) {
      const { data } = await db.from(t).select('property_id, bank, end_date, rate').eq('user_id', biz).not('end_date', 'is', null).lte('end_date', soon(120))
      for (const m of data ?? []) lines.push(`${nm.get(m.property_id) ?? 'Property'}: ${m.bank || 'loan'} ${m.end_date < today() ? 'ended' : 'ends'} ${m.end_date}${m.rate ? ' (rate ' + m.rate + '%)' : ''}. Check refinance options.`)
    }
    return lines.length ? { title: 'Mortgages and loans ending soon', lines: cap(lines) } : null
  } },
  { agent: 'tenant_checks', resultKey: 'tenantChecks', async find(db, biz, nm) {
    const { data } = await db.from('pm_tenants').select('name, status, id_url, property_id').eq('user_id', biz).is('id_url', null)
    const open = (data ?? []).filter((t: any) => t.name && !/former|past|ended|left|inactive/i.test(String(t.status ?? '')))
    return open.length ? { title: 'Tenants with no ID on file', lines: cap(open.map((t: any) => `${t.name}${t.property_id ? ' · ' + (nm.get(t.property_id) ?? '') : ''}: upload ID and complete checks`)) } : null
  } },
  { agent: 'expense_sorter', resultKey: 'expenseSorter', async find(db, biz) {
    const lines: string[] = []
    for (const t of ['office_expenses', 'estate_expenses']) {
      const { data } = await db.from(t).select('description, vendor, amount, category, date').eq('user_id', biz).gte('date', dayStr(-60))
      for (const e of data ?? []) if (!e.category || /^other$/i.test(String(e.category))) lines.push(`${e.date}: ${e.description || e.vendor || 'expense'} ${money(e.amount)} needs a category`)
    }
    return lines.length ? { title: 'Expenses without a category', lines: cap(lines) } : null
  } },
  { agent: 'dev_milestones', resultKey: 'devMilestones', async find(db, biz) {
    const { data } = await db.from('dev_milestones').select('name, due_date, status, project_id').eq('user_id', biz).lt('due_date', today())
    const late = (data ?? []).filter((m: any) => !done(m.status))
    return late.length ? { title: 'Development milestones overdue', lines: cap(late.map((m: any) => `${m.name}: due ${m.due_date}`)) } : null
  } },
  { agent: 'dev_budget', resultKey: 'devBudget', async find(db, biz) {
    const { data } = await db.from('dev_budget_items').select('name, budgeted, actual').eq('user_id', biz)
    const over = (data ?? []).filter((b: any) => Number(b.budgeted) > 0 && Number(b.actual) > Number(b.budgeted))
    return over.length ? { title: 'Development budget lines over budget', lines: cap(over.map((b: any) => `${b.name}: budget ${money(b.budgeted)}, spent ${money(b.actual)}`)) } : null
  } },
  { agent: 'dev_snags', resultKey: 'devSnags', async find(db, biz) {
    const { data } = await db.from('dev_snagging').select('title, status, assigned_to, reported_date, created_at').eq('user_id', biz)
    const open = (data ?? []).filter((s: any) => !done(s.status) && (!s.assigned_to || (s.reported_date ?? String(s.created_at).slice(0, 10)) < dayStr(-14)))
    return open.length ? { title: 'Snags unassigned or open over 2 weeks', lines: cap(open.map((s: any) => `${s.title}: ${s.assigned_to ? 'assigned to ' + s.assigned_to : 'nobody assigned'}`)) } : null
  } },
  { agent: 'dev_compliance', resultKey: 'devCompliance', async find(db, biz) {
    const { data } = await db.from('dev_compliance').select('type, expiry_date, status').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', soon(60))
    return data?.length ? { title: 'Development approvals expiring', lines: cap(data.map((c: any) => `${c.type}: ${c.expiry_date < today() ? 'expired' : 'expires'} ${c.expiry_date}`)) } : null
  } },
  { agent: 'dev_safety', resultKey: 'devSafety', async find(db, biz) {
    const { data: projects } = await db.from('dev_projects').select('id, name, status').eq('user_id', biz)
    const live = (projects ?? []).filter((p: any) => !done(p.status) && !/plan|on hold|not start/i.test(String(p.status ?? '')))
    const lines: string[] = []
    for (const p of live) {
      const { data } = await db.from('dev_health_safety').select('id').eq('user_id', biz).eq('project_id', p.id).gte('date', dayStr(-14)).limit(1)
      if (!data?.length) lines.push(`${p.name}: no health and safety record in 14 days`)
    }
    return lines.length ? { title: 'Site health and safety records missing', lines: cap(lines) } : null
  } },
  { agent: 'smart_watch', resultKey: 'smartWatch', async find(db, biz) {
    const { data } = await db.from('smart_devices').select('name, online, battery').eq('business_id', biz)
    const bad = (data ?? []).filter((d: any) => d.online === false || (d.battery != null && Number(d.battery) < 20))
    return bad.length ? { title: 'Smart devices offline or low on battery', lines: cap(bad.map((d: any) => `${d.name}: ${d.online === false ? 'offline' : 'battery ' + d.battery + '%'}`)) } : null
  } },
  { agent: 'tax_watch', resultKey: 'taxWatch', async find(db, biz) {
    const { data } = await db.from('tax_obligations').select('tax_type, due_date, status').eq('business_id', biz).lte('due_date', soon(30))
    const due = (data ?? []).filter((t: any) => !done(t.status))
    return due.length ? { title: 'Tax filings due within 30 days', lines: cap(due.map((t: any) => `${t.tax_type}: due ${t.due_date}`)), dueInDays: 2 } : null
  } },
  { agent: 'partner_payouts', resultKey: 'partnerPayouts', async find(db, biz) {
    const { data } = await db.from('partner_payouts').select('payee_name, amount, currency, due_date').eq('user_id', biz).is('paid_date', null).lte('due_date', soon(3))
    return data?.length ? { title: 'Partner and investor payouts due', lines: cap(data.map((p: any) => `${p.payee_name}: ${p.currency ?? ''} ${money(p.amount)} due ${p.due_date}`)) } : null
  } },
  { agent: 'hr_watch', resultKey: 'hrWatch', async find(db, biz) {
    const lines: string[] = []
    const { data: emps } = await db.from('hr_employees').select('id, full_name, status').eq('user_id', biz)
    const name = new Map((emps ?? []).map((e: any) => [e.id, e.full_name]))
    const { data: tr } = await db.from('hr_training_records').select('employee_id, training_name, expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', soon(45))
    for (const t of tr ?? []) lines.push(`${name.get(t.employee_id) ?? 'Staff member'}: ${t.training_name} ${t.expiry_date < today() ? 'expired' : 'expires'} ${t.expiry_date}`)
    const { data: rq } = await db.from('hr_requests').select('employee_id, title, type, status, created_at').eq('user_id', biz).lt('created_at', dayStr(-3))
    for (const r of rq ?? []) if (/pend|open|new|request/i.test(String(r.status ?? '')) && !done(r.status)) lines.push(`${name.get(r.employee_id) ?? 'Staff member'}: ${r.title || r.type} waiting over 3 days`)
    const { data: ob } = await db.from('hr_onboarding_tasks').select('employee_id, task, status, due_date').eq('user_id', biz).lt('due_date', today())
    for (const o of ob ?? []) if (!done(o.status)) lines.push(`${name.get(o.employee_id) ?? 'New starter'}: onboarding "${o.task}" overdue`)
    const { data: rv } = await db.from('hr_performance_reviews').select('employee_id, review_date').eq('user_id', biz)
    const lastReview = new Map<string, string>()
    for (const r of rv ?? []) if (!lastReview.get(r.employee_id) || r.review_date > lastReview.get(r.employee_id)!) lastReview.set(r.employee_id, r.review_date)
    for (const e of emps ?? []) if (!/former|left|ended|inactive|terminated/i.test(String(e.status ?? '')) && (lastReview.get(e.id) ?? '0') < dayStr(-365)) lines.push(`${e.full_name}: no performance review in 12 months`)
    return lines.length ? { title: 'People and HR items needing attention', lines: cap(lines, 15) } : null
  } },
  { agent: 'applications_watch', resultKey: 'applicationsWatch', async find(db, biz) {
    const { data } = await db.from('job_applications').select('candidate_name, role_applied, stage, interview_at, created_at').eq('user_id', biz)
    const lines: string[] = []
    for (const a of data ?? []) {
      if (done(a.stage)) continue
      if (a.interview_at && a.interview_at.slice(0, 10) >= today() && a.interview_at.slice(0, 10) <= soon(2)) lines.push(`${a.candidate_name}: interview ${a.interview_at.slice(0, 16).replace('T', ' ')} for ${a.role_applied}`)
      else if (/new|appl|receiv/i.test(String(a.stage ?? '')) && String(a.created_at).slice(0, 10) < dayStr(-7)) lines.push(`${a.candidate_name}: ${a.role_applied} application waiting over 7 days`)
    }
    return lines.length ? { title: 'Job applications needing a reply', lines: cap(lines) } : null
  } },
  // Month-end summary for the accountant (first three days of the month)
  { agent: 'accounting_export', resultKey: 'accountingExport', async find(db, biz) {
    const now = new Date()
    if (now.getUTCDate() > 3) return null
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const s = start.toISOString().slice(0, 10), e = end.toISOString().slice(0, 10)
    const label = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const [{ data: inv }, { data: off }, { data: est }] = await Promise.all([
      db.from('invoices').select('currency, total, status, paid_at').eq('business_id', biz).gte('issue_date', s).lt('issue_date', e),
      db.from('office_expenses').select('amount, category').eq('user_id', biz).gte('date', s).lt('date', e),
      db.from('estate_expenses').select('amount, category').eq('user_id', biz).gte('date', s).lt('date', e),
    ])
    const invoiced: Record<string, number> = {}, paid: Record<string, number> = {}
    for (const i of (inv ?? []).filter((x: any) => !/draft|void|cancel/i.test(String(x.status ?? '')))) {
      const c = i.currency || 'GBP'; invoiced[c] = (invoiced[c] || 0) + Number(i.total || 0); if (i.paid_at) paid[c] = (paid[c] || 0) + Number(i.total || 0)
    }
    const exp = [...(off ?? []), ...(est ?? [])]
    const spend = exp.reduce((a: number, x: any) => a + Number(x.amount || 0), 0)
    const uncat = exp.filter((x: any) => !String(x.category ?? '').trim()).length
    if (!Object.keys(invoiced).length && !exp.length) return null
    const lines = [
      ...Object.keys(invoiced).map(c => `Invoiced ${c} ${money(invoiced[c])}, paid ${c} ${money(paid[c] || 0)}, still unpaid ${c} ${money(invoiced[c] - (paid[c] || 0))}`),
      `Expenses logged: ${exp.length}, total ${money(spend)}`,
      uncat ? `${uncat} expense${uncat === 1 ? ' has' : 's have'} no category. Fix these before sending to your accountant.` : 'Every expense has a category.',
      'Export the invoices and expenses from Finance and send them to your accountant.',
    ]
    return { title: `Month-end for your accountant: ${label}`, lines, dueInDays: 5 }
  } },
  // SOPs, policies and contract templates not reviewed for a year (first of the month)
  { agent: 'templates_review', resultKey: 'templatesReview', async find(db, biz) {
    if (new Date().getUTCDate() !== 1) return null
    const cutoff = dayStr(-365)
    const [{ data: docs }, { data: tpl }] = await Promise.all([
      db.from('company_documents').select('name, category, created_at').eq('user_id', biz),
      db.from('doc_templates').select('name, updated_at').eq('business_id', biz).eq('active', true),
    ])
    const lines = [
      ...(docs ?? []).filter((d: any) => /sop|polic|procedure|handbook/i.test(`${d.category ?? ''} ${d.name ?? ''}`) && String(d.created_at).slice(0, 10) < cutoff).map((d: any) => `${d.name}: last added ${String(d.created_at).slice(0, 10)}`),
      ...(tpl ?? []).filter((t: any) => String(t.updated_at).slice(0, 10) < cutoff).map((t: any) => `Contract template "${t.name}": last changed ${String(t.updated_at).slice(0, 10)}`),
    ]
    return lines.length ? { title: 'SOPs and templates not reviewed in a year', lines: [...cap(lines), 'Check they still match the law and how you work.'], dueInDays: 14 } : null
  } },
  // Tomorrow's meetings, with the open tasks that are due
  { agent: 'meetings_prep', resultKey: 'meetingsPrep', async find(db, biz) {
    const t = soon(1), t2 = soon(2)
    const [{ data: crm }, { data: bk }, { data: sales }, { data: tasks }] = await Promise.all([
      db.from('crm_meetings').select('title, time, location, status').eq('user_id', biz).eq('date', t),
      db.from('meetings').select('title, attendee_name, scheduled_at, status').eq('user_id', biz).gte('scheduled_at', t).lt('scheduled_at', t2),
      db.from('sales_meetings').select('title, contact, meeting_time').eq('user_id', biz).eq('meeting_date', t),
      db.from('staff_tasks').select('title, due_date, status').eq('user_id', biz).neq('status', 'Done').lte('due_date', t),
    ])
    const lines = [
      ...(crm ?? []).filter((m: any) => !done(m.status)).map((m: any) => `${m.time || ''} ${m.title}${m.location ? ' at ' + m.location : ''}`.trim()),
      ...(bk ?? []).filter((m: any) => !done(m.status)).map((m: any) => `${String(m.scheduled_at).slice(11, 16)} ${m.title || 'Meeting'}${m.attendee_name ? ' with ' + m.attendee_name : ''}`),
      ...(sales ?? []).map((m: any) => `${m.meeting_time || ''} ${m.title}${m.contact ? ' with ' + m.contact : ''}`.trim()),
    ]
    if (!lines.length) return null
    const open = (tasks ?? []).slice(0, 6).map((x: any) => `Open task: ${x.title}${x.due_date ? ' (due ' + x.due_date + ')' : ''}`)
    return { title: `Meetings tomorrow (${t}): ${lines.length}`, lines: [...cap(lines), ...open], dueInDays: 1 }
  } },
  // New accounts: what is left to set up in the first three weeks
  { agent: 'onboarding_help', resultKey: 'onboardingHelp', async find(db, biz) {
    const { data: sub } = await db.from('subscriptions').select('created_at').eq('user_id', biz).order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (!sub || String(sub.created_at).slice(0, 10) < dayStr(-21)) return null
    const [{ data: pm }, { data: est }, { data: set }, { count: team }] = await Promise.all([
      db.from('pm_properties').select('id').eq('user_id', biz).limit(1),
      db.from('estate_properties').select('id').eq('user_id', biz).limit(1),
      db.from('invoice_settings').select('company_name, logo_url, contact_lines').eq('business_id', biz).maybeSingle(),
      db.from('staff_tasks').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    ])
    const todo: string[] = []
    if (!pm?.length && !est?.length) todo.push('Add your first property in Real Estate Intelligence')
    if (!set?.company_name) todo.push('Add your company name in Invoice settings')
    if (!set?.logo_url) todo.push('Upload your logo in Invoice settings so your emails carry it')
    if (!String(set?.contact_lines ?? '').trim()) todo.push('Add your contact details in Invoice settings for the email footer')
    if (!team) todo.push('Open Workflows and press "Run all now" to see Novourq Cloud AI work')
    return todo.length ? { title: `Finish setting up Novourq: ${todo.length} step${todo.length === 1 ? '' : 's'} left`, lines: [...todo, 'The Guide tab in Settings explains each step.'], dueInDays: 3 } : null
  } },
]

export async function proposeWatchers() {
  const out: Record<string, ReturnType<typeof freshCounts> & { created: number }> = {}
  const db = svc()
  const namesCache = new Map<string, Map<string, string>>()
  for (const w of WATCHERS) {
    const result = Object.assign(freshCounts(), { created: 0 })
    out[w.resultKey] = result
    const businesses = await enabledBusinesses(w.agent)
    result.businesses = businesses.length
    for (const biz of businesses) {
      try {
        if (!namesCache.has(biz)) namesCache.set(biz, await propertyNames(db, biz))
        const found = await w.find(db, biz, namesCache.get(biz)!)
        if (!found) { result.skipped++; continue }
        const made = await aiTask(biz, found.title, found.lines.join('\n'), found.dueInDays ?? 1)
        if (made) { result.queued++; result.created++ } else result.skipped++
      } catch (e) { result.errors.push(`${w.agent} ${biz}: ${e instanceof Error ? e.message : String(e)}`) }
    }
  }
  return out
}

// ---------- invoice chase: drafts a polite reminder to the person billed ----------
export async function proposeInvoiceChase() {
  const db = svc(); const result = freshCounts()
  const businesses = await enabledBusinesses('invoice_chase'); result.businesses = businesses.length
  for (const biz of businesses) {
    const sign = await companyName(biz)
    const { data } = await db.from('invoices').select('id, number, status, bill_to_name, bill_to_email, currency, total, due_date, token, paid_at').eq('business_id', biz).is('paid_at', null).lt('due_date', dayStr(-3)).not('bill_to_email', 'is', null).limit(5)
    for (const inv of (data ?? []).filter((i: any) => !done(i.status) && !/draft/i.test(String(i.status ?? '')))) {
      const link = inv.token ? `https://app.thenovourq.com/invoice/${inv.token}` : ''
      const system = `You write a short, polite payment reminder from a property company. Plain text, no subject line, no emojis, 3 to 5 sentences. Mention the invoice number, amount and original due date, and ask them to pay or reply if there is a problem. Sign off with "${sign}".`
      const { text, error } = await callClaude(system, `To: ${firstName(inv.bill_to_name) || 'there'}\nInvoice: ${inv.number}\nAmount: ${inv.currency ?? ''} ${money(inv.total)}\nWas due: ${inv.due_date}\n${link ? 'Pay or view: ' + link : ''}`, 350)
      if (error || !text) { result.errors.push(`invoice_chase ${inv.id}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: biz, agentKey: 'invoice_chase', actionType: 'email_out',
        title: `Invoice ${inv.number} overdue`, draftBody: text.trim(),
        payload: { to: inv.bill_to_email, subject: `Reminder: invoice ${inv.number}`, chase_invoice_id: inv.id },
        context: { summary: `Due ${inv.due_date} · will be emailed to ${inv.bill_to_name ?? inv.bill_to_email}` },
        dedupe: { key: 'chase_invoice_id', value: inv.id, sinceIso: dayStr(-7) },
      })
      if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
    }
  }
  return result
}

// ---------- review replies: drafts a response to each unanswered review, left in a task ----------
export async function proposeReviewReplies() {
  const db = svc(); const result = freshCounts()
  const businesses = await enabledBusinesses('review_replies'); result.businesses = businesses.length
  for (const biz of businesses) {
    const sign = await companyName(biz)
    const { data } = await db.from('str_reviews').select('guest_name, platform, rating, review_text, responded, response_text').eq('user_id', biz).eq('responded', false).not('review_text', 'is', null).order('review_date', { ascending: false }).limit(3)
    for (const r of data ?? []) {
      if (r.response_text) continue
      const system = `You reply to a guest review for a property company. Warm, specific, honest, under 80 words, no emojis. Thank them; for criticism, acknowledge it and say what will be looked at. Sign off with "${sign}".`
      const { text, error } = await callClaude(system, `Guest: ${firstName(r.guest_name)}\nPlatform: ${r.platform}\nRating: ${r.rating}\nReview: ${String(r.review_text).slice(0, 800)}`, 250)
      if (error || !text) { result.errors.push(`review_replies: ${error ?? 'no text'}`); continue }
      const made = await aiTask(biz, `Post reply to ${r.guest_name || 'guest'}'s ${r.platform || ''} review`.trim(), `Draft reply: ${text.trim()}`.slice(0, 480), 2)
      if (made) result.queued++; else result.skipped++
    }
  }
  return result
}

// ---------- weekly team summary, emailed to the business owner after approval ----------
export async function proposeTeamWeekly() {
  const db = svc(); const result = freshCounts()
  const businesses = await enabledBusinesses('team_weekly'); result.businesses = businesses.length
  const week = dayStr().slice(0, 4) + '-W' + Math.ceil((Date.now() - new Date(new Date().getUTCFullYear(), 0, 1).getTime()) / 604800000)
  for (const biz of businesses) {
    const { data: u } = await db.auth.admin.getUserById(biz)
    const to = u?.user?.email
    if (!to) { result.errors.push(`team_weekly ${biz}: no owner email`); continue }
    const sign = await companyName(biz)
    const { data: tasks } = await db.from('staff_tasks').select('title, status, due_date, assigned_to, created_at').eq('user_id', biz)
    const open = (tasks ?? []).filter((t: any) => !done(t.status))
    const overdue = open.filter((t: any) => t.due_date && t.due_date < today())
    const { count: pendingReq } = await db.from('hr_requests').select('id', { count: 'exact', head: true }).eq('user_id', biz).ilike('status', '%pend%')
    const { count: apps } = await db.from('job_applications').select('id', { count: 'exact', head: true }).eq('user_id', biz).not('stage', 'ilike', '%hired%').not('stage', 'ilike', '%reject%')
    const facts = `Open tasks: ${open.length}\nOverdue tasks: ${overdue.length}\n${overdue.slice(0, 8).map((t: any) => `- ${t.title} (due ${t.due_date}${t.assigned_to ? ', ' + t.assigned_to : ''})`).join('\n')}\nStaff requests waiting: ${pendingReq ?? 0}\nOpen job applications: ${apps ?? 0}`
    const system = `You write a short weekly team summary for a business owner. Use ONLY the facts given. Plain text, no emojis, under 150 words: how the team is doing, what is overdue, what needs a decision. Sign off with "${sign}".`
    const { text, error } = await callClaude(system, facts, 450)
    if (error || !text) { result.errors.push(`team_weekly ${biz}: ${error ?? 'no text'}`); continue }
    const q = await queueAiAction({
      userId: biz, agentKey: 'team_weekly', actionType: 'email_out',
      title: `Team summary, week ${week}`, draftBody: text.trim(),
      payload: { to, subject: `Team summary, week ${week}`, team_week: week },
      context: { summary: `Tasks, requests and applications · will be emailed to ${to}` },
      dedupe: { key: 'team_week', value: week },
    })
    if ('queued' in q) result.queued++; else { result.skipped++; if ('error' in q) result.errors.push(q.error!) }
  }
  return result
}

export const WATCHER_AGENTS = WATCHERS.map(w => w.agent)
