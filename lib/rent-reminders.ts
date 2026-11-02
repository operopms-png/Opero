// Rent reminder drafting, shared by the Finance -> Reminders screen and the daily AI job.
// Drafts only: nothing here sends a text. A person approves every reminder before it goes out.
import { serviceClient as db } from '@/lib/admin-auth'

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
export const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
export const money = (n: any, cur: string) => (SYM[cur] ?? '') + Math.round(Number(n) || 0).toLocaleString('en-GB')
export const dayMs = 864e5
export const first = (n?: string | null) => { const t = (n || '').trim(); if (!t) return ''; const m = t.match(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+(.+)$/i); return m ? `${m[1]}. ${m[2].split(/\s+/).pop()}` : t.split(/\s+/)[0] }
export const nice = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
export const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
export type Item = { ref: string; module: 'pm' | 'ea'; tenant: string; phone: string | null; property: string | null; amount: number; currency: string; due_date: string; days: number }
export function draft(stage: string, i: Item) {
  const hi = `Hi${first(i.tenant) ? ' ' + first(i.tenant) : ''}`
  const amt = money(i.amount, i.currency), when = nice(i.due_date)
  if (stage === 'before') return `${hi}, a friendly reminder that your rent of ${amt}${i.property ? ' for ' + i.property : ''} is due on ${when}. Reply here if you have any questions. — NOVOURQ Group`
  if (stage === 'late1') return `${hi}, we haven't received your rent of ${amt} that was due on ${when}. If you've already paid, please ignore this message. Otherwise, please reply here and let us know when we can expect it. — NOVOURQ Group`
  return `${hi}, your rent of ${amt} that was due on ${when} is now ${i.days} days overdue. Please arrange payment or get in touch today so we can agree a plan. — NOVOURQ Group`
}

// Rent that is due within 3 days, or already late, across Property Management and Estate Agency.
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
    if (days < -3) continue
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
    const stage = i.days >= 7 ? 'late7' : i.days >= 1 ? 'late1' : 'before'
    return { business_id: businessId, module: i.module, rent_ref: i.ref, stage, tenant: i.tenant, phone: i.phone, property: i.property, amount: i.amount, currency: i.currency, due_date: i.due_date, message: draft(stage, i), drafted_by: draftedBy }
  }).filter(r => r.phone)
  const skippedNoPhone = items.length - rows.length
  if (!rows.length) return { created: 0, skippedNoPhone }
  const { data, error } = await db.from('rent_reminders').upsert(rows, { onConflict: 'business_id,rent_ref,stage', ignoreDuplicates: true }).select('id')
  if (error) return { created: 0, skippedNoPhone, error: error.message }
  return { created: data?.length ?? 0, skippedNoPhone }
}
