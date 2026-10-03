import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { ratesPerGBP, type Cur } from '@/lib/currency'
import { hasScTab } from '@/lib/staff-access'

// Staff Centre → Finance. Money worked out from what's already recorded in the
// portal — nothing has to be typed in twice:
//   money in   Airbnb/Booking.com bookings (USD), PM rent payments marked paid,
//              Estate Agency rent collected (rent schedules marked Paid), and
//              any Income transactions entered in a module
//   money out  owner payouts paid (PM & EA), Expense transactions, development
//              spend, and approved expense requests (Finance → Approvals)
// Each amount keeps its own currency; totals are converted to GBP at today's rate.
//
// GET ?view=overview&month=YYYY-MM | ?view=payouts | ?view=arrears
// POST {action:'payout-paid', module:'pm'|'ea', id, paid?:boolean}
// POST {action:'rent-paid',   module:'pm'|'ea', id}

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const pmCur = (p: any): Cur => /jamaica/i.test(p?.country || '') ? 'JMD' : 'GBP'
const eaCur = (p: any): Cur => (['GBP', 'JMD', 'USD'].includes(p?.currency) ? p.currency : 'JMD')
const ym = (d?: string | null) => (d || '').slice(0, 7)
const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])

async function load(biz: string) {
  const [vr, pmProps, eaProps, pmRent, pmTenants, pmLl, eaLl, pmPay, eaPay, eaSched, eaTen, eaTenants, strTx, pmTx, eaTx, devItems, devProjects, approvals, invoices] = await Promise.all([
    q(db.from('properties').select('id,name').eq('user_id', biz)),
    q(db.from('pm_properties').select('id,name,country').eq('user_id', biz)),
    q(db.from('estate_properties').select('id,name,address,currency').eq('user_id', biz)),
    q(db.from('pm_rent_payments').select('id,tenant_id,property_id,amount,due_date,paid_date,status,category').eq('user_id', biz)),
    q(db.from('pm_tenants').select('id,name,phone,email,property_id').eq('user_id', biz)),
    q(db.from('pm_landlords').select('id,name,phone').eq('user_id', biz)),
    q(db.from('estate_landlords').select('id,name,phone').eq('user_id', biz)),
    q(db.from('pm_landlord_payments').select('id,landlord_id,property_id,category,amount,due_date,paid_date,notes').eq('user_id', biz)),
    q(db.from('estate_landlord_payments').select('id,landlord_id,property_id,category,amount,due_date,paid_date,notes').eq('user_id', biz)),
    q(db.from('estate_rent_schedules').select('id,tenancy_id,tenant_id,amount,due_day,frequency,status,created_at').eq('user_id', biz)),
    q(db.from('estate_tenancies').select('id,property_id,tenant_id,rent,status,start_date,end_date').eq('user_id', biz)),
    q(db.from('estate_tenants').select('id,name,phone,email,property_id').eq('user_id', biz)),
    q(db.from('str_transactions').select('amount,type,date,description').eq('user_id', biz)),
    q(db.from('pm_transactions').select('amount,type,date,description').eq('user_id', biz)),
    q(db.from('estate_transactions').select('amount,type,date,description').eq('user_id', biz)),
    q(db.from('dev_budget_items').select('actual,created_at,name,project_id').eq('user_id', biz)),
    q(db.from('dev_projects').select('id,name').eq('user_id', biz)),
    q(db.from('approvals').select('amount,currency,status,decided_at,title,kind').eq('business_id', biz).eq('status', 'approved')),
    q(db.from('invoices').select('number,total,currency,paid_at,bill_to_name,module').eq('business_id', biz).eq('status', 'paid')),
  ])
  const vrIds = vr.map((p: any) => p.id)
  const bookings = vrIds.length ? await q(db.from('bookings').select('id,property_id,check_in,check_out,total_amount,status,guest_name').in('property_id', vrIds)) : []
  return { vr, pmProps, eaProps, pmRent, pmTenants, pmLl, eaLl, pmPay, eaPay, eaSched, eaTen, eaTenants, strTx, pmTx, eaTx, devItems, devProjects, approvals, invoices, bookings }
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(await hasScTab(c, 'finance'))) return bad('You don’t have access to Finance — ask an admin to tick it in Team Management.', 403)
  const view = req.nextUrl.searchParams.get('view') || 'overview'
  const d = await load(c.businessId)
  const T = today()
  const name = (list: any[], id: string, f = 'name') => list.find((x: any) => x.id === id)?.[f] || null
  const pmProp = (id: string) => d.pmProps.find((p: any) => p.id === id), eaProp = (id: string) => d.eaProps.find((p: any) => p.id === id)

  if (view === 'payouts') {
    const rows = [
      ...d.pmPay.map((p: any) => ({ ...p, module: 'pm', landlord: name(d.pmLl, p.landlord_id), phone: name(d.pmLl, p.landlord_id, 'phone'), property: pmProp(p.property_id)?.name || null, currency: pmCur(pmProp(p.property_id)) })),
      ...d.eaPay.map((p: any) => ({ ...p, module: 'ea', landlord: name(d.eaLl, p.landlord_id), phone: name(d.eaLl, p.landlord_id, 'phone'), property: eaProp(p.property_id)?.name || eaProp(p.property_id)?.address || null, currency: eaCur(eaProp(p.property_id)) })),
    ]
    const due = rows.filter(r => !r.paid_date).sort((a, b) => String(a.due_date || '9').localeCompare(String(b.due_date || '9'))).map(r => ({ ...r, overdue: !!r.due_date && r.due_date < T }))
    const paid = rows.filter(r => r.paid_date).sort((a, b) => b.paid_date.localeCompare(a.paid_date)).slice(0, 60)
    return NextResponse.json({ today: T, due, paid })
  }

  if (view === 'arrears') {
    const pm = d.pmRent.filter((r: any) => String(r.status).toLowerCase() !== 'paid' && r.due_date && r.due_date < T).map((r: any) => {
      const t = d.pmTenants.find((x: any) => x.id === r.tenant_id)
      return { id: r.id, module: 'pm', tenant: t?.name || 'Tenant', phone: t?.phone || null, email: t?.email || null, property: pmProp(r.property_id)?.name || null, amount: r.amount, currency: pmCur(pmProp(r.property_id)), due_date: r.due_date, days: Math.round((new Date(T).getTime() - new Date(r.due_date).getTime()) / 864e5), what: r.category || 'Rent' }
    })
    const ea = d.eaSched.filter((s: any) => String(s.status).toLowerCase() === 'overdue').map((s: any) => {
      const ten = d.eaTen.find((x: any) => x.id === s.tenancy_id), t = d.eaTenants.find((x: any) => x.id === (s.tenant_id || ten?.tenant_id)), p = eaProp(ten?.property_id || t?.property_id)
      const dueDay = parseInt(s.due_day) || 1, due = `${T.slice(0, 8)}${String(Math.min(dueDay, 28)).padStart(2, '0')}`
      const dueDate = due <= T ? due : (() => { const x = new Date(due); x.setMonth(x.getMonth() - 1); return x.toISOString().slice(0, 10) })()
      return { id: s.id, module: 'ea', tenant: t?.name || 'Tenant', phone: t?.phone || null, email: t?.email || null, property: p?.name || p?.address || null, amount: s.amount, currency: eaCur(p), due_date: dueDate, days: Math.max(0, Math.round((new Date(T).getTime() - new Date(dueDate).getTime()) / 864e5)), what: 'Rent' }
    })
    return NextResponse.json({ today: T, rows: [...pm, ...ea].sort((a, b) => b.days - a.days) })
  }

  // ── overview ──
  const rates = await ratesPerGBP()
  const toGBP = (v: number, cur: Cur) => (Number(v) || 0) / (rates[cur] || 1)
  const month = /^\d{4}-\d{2}$/.test(req.nextUrl.searchParams.get('month') || '') ? req.nextUrl.searchParams.get('month')! : T.slice(0, 7)
  const months: string[] = []
  { const [y, m] = month.split('-').map(Number); for (let i = 5; i >= 0; i--) { const dt = new Date(Date.UTC(y, m - 1 - i, 1)); months.push(dt.toISOString().slice(0, 7)) } }

  type Line = { month: string; dir: 'in' | 'out'; source: string; module: string; amount: number; currency: Cur; label: string }
  const lines: Line[] = []
  for (const b of d.bookings) if (String(b.status || '').toLowerCase() !== 'cancelled' && Number(b.total_amount) > 0) lines.push({ month: ym(b.check_in), dir: 'in', source: 'Bookings', module: 'vr', amount: Number(b.total_amount), currency: 'USD', label: `${name(d.vr, b.property_id) || 'Booking'} · ${b.guest_name || 'guest'}` })
  for (const r of d.pmRent) if (String(r.status).toLowerCase() === 'paid') lines.push({ month: ym(r.paid_date || r.due_date), dir: 'in', source: 'Rent collected', module: 'pm', amount: Number(r.amount) || 0, currency: pmCur(pmProp(r.property_id)), label: `${pmProp(r.property_id)?.name || 'Property'} · ${name(d.pmTenants, r.tenant_id) || 'tenant'}` })
  // Estate Agency: schedules marked Paid count for the current month (no payment history is stored per month)
  for (const s of d.eaSched) if (String(s.status).toLowerCase() === 'paid') { const ten = d.eaTen.find((x: any) => x.id === s.tenancy_id); const p = eaProp(ten?.property_id); lines.push({ month: T.slice(0, 7), dir: 'in', source: 'Rent collected', module: 'ea', amount: Number(s.amount) || 0, currency: eaCur(p), label: `${p?.name || p?.address || 'Property'} · ${name(d.eaTenants, s.tenant_id) || 'tenant'}` }) }
  for (const [list, mod, cur] of [[d.strTx, 'vr', 'USD'], [d.pmTx, 'pm', 'GBP'], [d.eaTx, 'ea', 'GBP']] as [any[], string, Cur][]) for (const t of list) if (t.date && Number(t.amount)) lines.push({ month: ym(t.date), dir: /income/i.test(t.type) ? 'in' : 'out', source: /income/i.test(t.type) ? 'Other income' : 'Expenses', module: mod, amount: Math.abs(Number(t.amount)), currency: cur, label: t.description || t.type })
  for (const p of [...d.pmPay.map((x: any) => ({ ...x, mod: 'pm', cur: pmCur(pmProp(x.property_id)), ll: name(d.pmLl, x.landlord_id) })), ...d.eaPay.map((x: any) => ({ ...x, mod: 'ea', cur: eaCur(eaProp(x.property_id)), ll: name(d.eaLl, x.landlord_id) }))]) if (p.paid_date) lines.push({ month: ym(p.paid_date), dir: 'out', source: 'Owner payouts', module: p.mod, amount: Number(p.amount) || 0, currency: p.cur, label: `${p.ll || 'Owner'} · ${p.category || 'payout'}` })
  for (const b of d.devItems) if (Number(b.actual) > 0) lines.push({ month: ym(b.created_at), dir: 'out', source: 'Development spend', module: 'dev', amount: Number(b.actual), currency: 'GBP', label: `${name(d.devProjects, b.project_id) || 'Project'} · ${b.name || ''}` })
  for (const v of d.invoices) if (Number(v.total) > 0 && v.paid_at) lines.push({ month: ym(v.paid_at), dir: 'in', source: 'Invoices', module: v.module || 'company', amount: Number(v.total), currency: (['GBP', 'JMD', 'USD'].includes(v.currency) ? v.currency : 'GBP') as Cur, label: `${v.number} · ${v.bill_to_name || 'client'}` })
  for (const a of d.approvals) if (Number(a.amount) > 0 && a.decided_at) lines.push({ month: ym(a.decided_at), dir: 'out', source: 'Approved expenses', module: 'company', amount: Number(a.amount), currency: (['GBP', 'JMD', 'USD'].includes(a.currency) ? a.currency : 'GBP') as Cur, label: a.title })

  const inMonth = lines.filter(l => l.month === month)
  const sum = (ls: Line[]) => Math.round(ls.reduce((a, l) => a + toGBP(l.amount, l.currency), 0))
  const byCur = (ls: Line[]) => { const o: Record<string, number> = {}; for (const l of ls) o[l.currency] = (o[l.currency] || 0) + l.amount; return o }
  const group = (dir: 'in' | 'out') => {
    const g = new Map<string, Line[]>(); for (const l of inMonth.filter(x => x.dir === dir)) { const k = l.source + '|' + l.module; g.set(k, [...(g.get(k) || []), l]) }
    return [...g.entries()].map(([k, ls]) => ({ source: k.split('|')[0], module: k.split('|')[1], gbp: sum(ls), byCurrency: byCur(ls), count: ls.length, items: ls.slice(0, 50).map(l => ({ label: l.label, amount: l.amount, currency: l.currency })) })).sort((a, b) => b.gbp - a.gbp)
  }
  const trend = months.map(m => ({ month: m, in: sum(lines.filter(l => l.month === m && l.dir === 'in')), out: sum(lines.filter(l => l.month === m && l.dir === 'out')) }))
  const prev = trend[trend.length - 2]
  const moneyIn = sum(inMonth.filter(l => l.dir === 'in')), moneyOut = sum(inMonth.filter(l => l.dir === 'out'))
  const rentRoll = d.eaTen.filter((t: any) => /active|current|signed/i.test(t.status || 'active') && (!t.end_date || t.end_date >= T)).reduce((a: number, t: any) => a + toGBP(Number(t.rent) || 0, eaCur(eaProp(t.property_id))), 0)
  const payoutsDue = [...d.pmPay.map((x: any) => toGBP(x.paid_date ? 0 : x.amount, pmCur(pmProp(x.property_id)))), ...d.eaPay.map((x: any) => toGBP(x.paid_date ? 0 : x.amount, eaCur(eaProp(x.property_id))))].reduce((a, b) => a + b, 0)
  return NextResponse.json({
    month, today: T, rates, moneyIn, moneyOut, profit: moneyIn - moneyOut, prevIn: prev?.in ?? 0, prevOut: prev?.out ?? 0,
    income: group('in'), costs: group('out'), trend, payoutsDue: Math.round(payoutsDue), rentRoll: Math.round(rentRoll),
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Only admins can mark payments.', 403)
  const b = await req.json().catch(() => ({}))
  const id = String(b.id || '')
  if (b.action === 'payout-paid') {
    const table = b.module === 'ea' ? 'estate_landlord_payments' : 'pm_landlord_payments'
    const { error } = await db.from(table).update({ paid_date: b.paid === false ? null : today() }).eq('id', id).eq('user_id', c.businessId)
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
  }
  if (b.action === 'rent-paid') {
    const { error } = b.module === 'ea'
      ? await db.from('estate_rent_schedules').update({ status: 'Paid' }).eq('id', id).eq('user_id', c.businessId)
      : await db.from('pm_rent_payments').update({ status: 'paid', paid_date: today() }).eq('id', id).eq('user_id', c.businessId)
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
