// Rent reminder drafting, shared by the Finance -> Reminders screen and the daily AI job.
// Drafts here; the daily AI job sends the ones it drafted (see sendPendingReminders at the bottom).
import { serviceClient as db } from '@/lib/admin-auth'
import { sendSms } from '@/lib/send-sms'
import { normalizePhone, smsConnection, nameForPhone } from '@/lib/sms'

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
export const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
export const money = (n: any, cur: string) => (SYM[cur] ?? '') + Math.round(Number(n) || 0).toLocaleString('en-GB')
export const dayMs = 864e5
export const first = (n?: string | null) => { const t = (n || '').trim(); if (!t) return ''; const m = t.match(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+(.+)$/i); return m ? `${m[1]}. ${m[2].split(/\s+/).pop()}` : t.split(/\s+/)[0] }
export const nice = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
export const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
export type Item = { ref: string; module: 'pm' | 'ea'; tenant: string; phone: string | null; property: string | null; amount: number; currency: string; due_date: string; days: number }
// Reminder windows, by days from the due date (negative = before). One text per window per rent, never repeated.
//   before7  : 7 to 4 days before     before : 3 to 1 days before    due : on the day
//   late1    : 1 to 2 days late       late3  : 3 to 6 days late      late7 : 7 to 13 days late
//   late14   : 14 to 20 days late     late21 : 21 or more days late
export const WINDOW_LABEL: Record<string, string> = { before7: 'Early reminder', before: 'Friendly reminder', due: 'Due today', late1: 'Missed payment', late3: 'Second reminder', late7: 'Final notice', late14: 'Overdue two weeks', late21: 'Overdue three weeks' }
export function windowFor(days: number): string {
  if (days <= -4) return 'before7'
  if (days < 0) return 'before'
  if (days === 0) return 'due'
  if (days <= 2) return 'late1'
  if (days <= 6) return 'late3'
  if (days <= 13) return 'late7'
  if (days <= 20) return 'late14'
  return 'late21'
}
export function draft(stage: string, i: Item) {
  const hi = `Hi${first(i.tenant) ? ' ' + first(i.tenant) : ''}`
  const amt = money(i.amount, i.currency), when = nice(i.due_date)
  const of = `${amt}${i.property ? ' for ' + i.property : ''}`
  const sign = ' — NOVOURQ Group'
  if (stage === 'before7') return `${hi}, just a heads up that your rent of ${of} is due on ${when}. Reply here if you have any questions.${sign}`
  if (stage === 'before') return `${hi}, a friendly reminder that your rent of ${of} is due on ${when}. Reply here if you have any questions.${sign}`
  if (stage === 'due') return `${hi}, your rent of ${of} is due today. Thank you for paying on time. Reply here if you need anything.${sign}`
  if (stage === 'late1') return `${hi}, we haven't received your rent of ${amt} that was due on ${when}. If you've already paid, please ignore this message. Otherwise, please reply here and let us know when we can expect it.${sign}`
  if (stage === 'late3') return `${hi}, your rent of ${amt} due on ${when} is now ${i.days} days late. Please pay today or reply to let us know what is happening.${sign}`
  if (stage === 'late7') return `${hi}, your rent of ${amt} that was due on ${when} is now ${i.days} days overdue. Please arrange payment or get in touch today so we can agree a plan.${sign}`
  if (stage === 'late14') return `${hi}, your rent of ${amt} is now ${i.days} days overdue. We need to hear from you this week to agree how this will be paid. Please reply or call us.${sign}`
  return `${hi}, your rent of ${amt} is now ${i.days} days overdue. Please contact us today so we can agree a payment plan.${sign}`
}

// Rent that is due within 7 days, or already late, across Property Management and Estate Agency.
export async function candidates(biz: string): Promise<Item[]> {
  const T = today()
  const [pmRent, pmTenants, pmProps, eaSched, eaTen, eaTenants, eaProps] = await Promise.all([
    q(db.from('pm_rent_payments').select('id,tenant_id,property_id,amount,due_date,status').eq('user_id', biz)),
    q(db.from('pm_tenants').select('id,name,phone').eq('user_id', biz)),
    q(db.from('pm_properties').select('id,name,country').eq('user_id', biz)),
    q(db.from('estate_rent_schedules').select('id,tenancy_id,tenant_id,amount,due_day,status').eq('user_id', biz)),
    q(db.from('estate_tenancies').select('id,property_id,tenant_id').eq('user_id', biz)),
    q(db.from('estate_tenants').select('id,name,phone,property_id').eq('user_id', biz)),
    q(db.from('estate_properties').select('id,name,address,currency').eq('user_id', biz)),
  ])
  const out: Item[] = []
  for (const r of pmRent) {
    if (String(r.status).toLowerCase() === 'paid' || !r.due_date) continue
    const days = Math.round((new Date(T).getTime() - new Date(r.due_date).getTime()) / dayMs)
    if (days < -7) continue
    const t = pmTenants.find((x: any) => x.id === r.tenant_id), p = pmProps.find((x: any) => x.id === r.property_id)
    out.push({ ref: `pm:${r.id}`, module: 'pm', tenant: t?.name || 'Tenant', phone: t?.phone || null, property: p?.name || null, amount: Number(r.amount) || 0, currency: /jamaica/i.test(p?.country || '') ? 'JMD' : 'GBP', due_date: r.due_date, days })
  }
  for (const s of eaSched) {
    if (String(s.status).toLowerCase() !== 'overdue') continue
    const ten = eaTen.find((x: any) => x.id === s.tenancy_id), t = eaTenants.find((x: any) => x.id === (s.tenant_id || ten?.tenant_id)), p = eaProps.find((x: any) => x.id === (ten?.property_id || t?.property_id))
    const dueDay = parseInt(s.due_day) || 1, due = `${T.slice(0, 8)}${String(Math.min(dueDay, 28)).padStart(2, '0')}`
    const dueDate = due <= T ? due : (() => { const x = new Date(due); x.setMonth(x.getMonth() - 1); return x.toISOString().slice(0, 10) })()
    const days = Math.max(1, Math.round((new Date(T).getTime() - new Date(dueDate).getTime()) / dayMs))
    out.push({ ref: `ea:${s.id}`, module: 'ea', tenant: t?.name || 'Tenant', phone: t?.phone || null, property: p?.name || p?.address || null, amount: Number(s.amount) || 0, currency: ['GBP', 'JMD', 'USD'].includes(p?.currency) ? p.currency : 'JMD', due_date: dueDate, days })
  }
  return out
}

// Drafts reminders for rent due within 3 days or already late. Safe to run repeatedly:
// a reminder already drafted for the same rent and stage is not created again.
export async function generateRentReminders(businessId: string, draftedBy: string) {
  const items = await candidates(businessId)
  const rows = items.map(i => {
    const stage = windowFor(i.days)
    return { business_id: businessId, module: i.module, rent_ref: i.ref, stage, tenant: i.tenant, phone: i.phone, property: i.property, amount: i.amount, currency: i.currency, due_date: i.due_date, message: draft(stage, i), drafted_by: draftedBy }
  }).filter(r => r.phone)
  const skippedNoPhone = items.length - rows.length
  if (!rows.length) return { created: 0, skippedNoPhone }
  const { data, error } = await db.from('rent_reminders').upsert(rows, { onConflict: 'business_id,rent_ref,stage', ignoreDuplicates: true }).select('id')
  if (error) return { created: 0, skippedNoPhone, error: error.message }
  return { created: data?.length ?? 0, skippedNoPhone }
}


// ---- automatic sending (the daily job only): texts drafted by the AI go out without waiting ----

async function stillOwed(row: any) {
  const id = String(row.rent_ref).split(':')[1]
  if (String(row.rent_ref).startsWith('pm:')) {
    const { data } = await db.from('pm_rent_payments').select('status').eq('id', id).eq('user_id', row.business_id).maybeSingle()
    return !!data && String(data.status).toLowerCase() !== 'paid'
  }
  const { data } = await db.from('estate_rent_schedules').select('status').eq('id', id).eq('user_id', row.business_id).maybeSingle()
  return !!data && String(data.status).toLowerCase() === 'overdue'
}

// Sends every pending AI-drafted reminder for a business. Skips rent that has been paid since. Up to 40 a day.
export async function sendPendingReminders(businessId: string) {
  const out = { sent: 0, skipped: 0, errors: [] as string[] }
  const conn = await smsConnection(businessId)
  if (!conn) return out
  const start = new Date(); start.setUTCHours(0, 0, 0, 0)
  const { count } = await db.from('rent_reminders').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'sent').eq('decided_by', 'Novourq Cloud AI').gte('decided_at', start.toISOString())
  let room = 40 - (count ?? 0)
  const { data: rows } = await db.from('rent_reminders').select('*').eq('business_id', businessId).eq('status', 'pending').like('drafted_by', 'AI%')
  for (const row of rows ?? []) {
    if (room <= 0) break
    const decided = { decided_by: 'Novourq Cloud AI', decided_at: new Date().toISOString() }
    if (!(await stillOwed(row))) { await db.from('rent_reminders').update({ status: 'skipped', error: 'Rent already paid, so nothing was sent.', ...decided }).eq('id', row.id); out.skipped++; continue }
    const to = normalizePhone(row.phone)
    if (!to) { out.skipped++; continue }
    const r = await sendSms(to, row.message, conn.phone)
    if (r.skipped) return out
    if (r.error) { await db.from('rent_reminders').update({ error: r.error }).eq('id', row.id); out.errors.push(`${row.tenant}: ${r.error}`); continue }
    const known = await nameForPhone(businessId, to)
    await db.from('sms_messages').insert({ connection_id: conn.id, business_id: businessId, contact_phone: to, contact_name: known.name || row.tenant, contact_id: known.contactId, sender: 'staff', sent_by: 'Novourq Cloud AI', body: row.message, twilio_sid: r.sid || null, status: r.status || 'queued' })
    await db.from('rent_reminders').update({ status: 'sent', error: null, ...decided }).eq('id', row.id)
    out.sent++; room--
  }
  return out
}
