import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller, type Caller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'
import { sendSms } from '@/lib/send-sms'
import { normalizePhone, smsConnection, nameForPhone } from '@/lib/sms'

// Staff Centre → Finance → Reminders. Drafts rent reminder and missed-payment texts
// and holds them until a person approves them. Nothing is sent to a tenant without
// an approval from an admin or co-founder.
//
// GET                                  -> { canApprove, pending, recent }
// POST {action:'generate'}             -> drafts texts for rent due soon or late
// POST {action:'edit',    id, message} -> change a pending draft
// POST {action:'approve', id}          -> send the text (admin or co-founder only)
// POST {action:'skip',    id}          -> drop the draft (admin or co-founder only)

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const money = (n: any, cur: string) => (SYM[cur] ?? '') + Math.round(Number(n) || 0).toLocaleString('en-GB')
const dayMs = 864e5
const first = (n?: string | null) => { const t = (n || '').trim(); if (!t) return ''; const m = t.match(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+(.+)$/i); return m ? `${m[1]}. ${m[2].split(/\s+/).pop()}` : t.split(/\s+/)[0] }
const nice = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
const isHuman = (c: Caller) => c.isAdmin || /co.?founder/i.test(c.role)
const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])

type Item = { ref: string; module: 'pm' | 'ea'; tenant: string; phone: string | null; property: string | null; amount: number; currency: string; due_date: string; days: number }

function draft(stage: string, i: Item) {
  const hi = `Hi${first(i.tenant) ? ' ' + first(i.tenant) : ''}`
  const amt = money(i.amount, i.currency), when = nice(i.due_date)
  if (stage === 'before') return `${hi}, a friendly reminder that your rent of ${amt}${i.property ? ' for ' + i.property : ''} is due on ${when}. Reply here if you have any questions. — NOVOURQ Group`
  if (stage === 'late1') return `${hi}, we haven't received your rent of ${amt} that was due on ${when}. If you've already paid, please ignore this message. Otherwise, please reply here and let us know when we can expect it. — NOVOURQ Group`
  return `${hi}, your rent of ${amt} that was due on ${when} is now ${i.days} days overdue. Please arrange payment or get in touch today so we can agree a plan. — NOVOURQ Group`
}

// Rent that is due within 3 days, or already late, across Property Management and Estate Agency.
async function candidates(biz: string): Promise<Item[]> {
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

async function stillOwed(row: any) {
  const id = String(row.rent_ref).split(':')[1]
  if (row.module === 'pm') {
    const { data } = await db.from('pm_rent_payments').select('status').eq('id', id).eq('user_id', row.business_id).maybeSingle()
    return !!data && String(data.status).toLowerCase() !== 'paid'
  }
  const { data } = await db.from('estate_rent_schedules').select('status').eq('id', id).eq('user_id', row.business_id).maybeSingle()
  return !!data && String(data.status).toLowerCase() === 'overdue'
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(await hasScTab(c, 'finance'))) return bad('You don’t have access to Finance — ask an admin to tick it in Team Management.', 403)
  const [{ data: pending, error }, { data: recent }] = await Promise.all([
    db.from('rent_reminders').select('*').eq('business_id', c.businessId).eq('status', 'pending').order('due_date', { ascending: true }),
    db.from('rent_reminders').select('*').eq('business_id', c.businessId).neq('status', 'pending').order('decided_at', { ascending: false }).limit(30),
  ])
  if (error) return bad(error.message, 500)
  return NextResponse.json({ canApprove: isHuman(c), pending: pending ?? [], recent: recent ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(await hasScTab(c, 'finance'))) return bad('You don’t have access to Finance — ask an admin to tick it in Team Management.', 403)
  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')

  if (action === 'generate') {
    const items = await candidates(c.businessId)
    const rows = items.map(i => {
      const stage = i.days >= 7 ? 'late7' : i.days >= 1 ? 'late1' : 'before'
      return { business_id: c.businessId, module: i.module, rent_ref: i.ref, stage, tenant: i.tenant, phone: i.phone, property: i.property, amount: i.amount, currency: i.currency, due_date: i.due_date, message: draft(stage, i), drafted_by: c.name || c.email }
    }).filter(r => r.phone)
    const skippedNoPhone = items.length - rows.length
    if (!rows.length) return NextResponse.json({ created: 0, skippedNoPhone })
    const { data, error } = await db.from('rent_reminders').upsert(rows, { onConflict: 'business_id,rent_ref,stage', ignoreDuplicates: true }).select('id')
    if (error) return bad(error.message, 500)
    return NextResponse.json({ created: data?.length ?? 0, skippedNoPhone })
  }

  const id = String(b.id || '')
  const { data: row } = await db.from('rent_reminders').select('*').eq('id', id).eq('business_id', c.businessId).maybeSingle()
  if (!row) return bad('That draft no longer exists.', 404)
  if (row.status !== 'pending') return bad('That draft has already been dealt with.', 409)

  if (action === 'edit') {
    const message = String(b.message || '').trim()
    if (!message) return bad('Write a message first.')
    if (message.length > 1500) return bad('That message is too long for a text (1,500 characters max).')
    await db.from('rent_reminders').update({ message }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'skip' || action === 'approve') {
    if (!isHuman(c)) return bad('Only an admin or co-founder can approve or skip reminders.', 403)
    const decided = { decided_by: c.name || c.email, decided_at: new Date().toISOString() }
    if (action === 'skip') { await db.from('rent_reminders').update({ status: 'skipped', ...decided }).eq('id', id); return NextResponse.json({ ok: true }) }

    if (!(await stillOwed(row))) {
      await db.from('rent_reminders').update({ status: 'skipped', error: 'Rent already paid, so nothing was sent.', ...decided }).eq('id', id)
      return NextResponse.json({ ok: true, notSent: 'That rent has been paid since the draft was written, so no text was sent.' })
    }
    const to = normalizePhone(row.phone)
    if (!to) return bad('Check the tenant’s number — it needs a country code, e.g. +1 876… or +44 7…')
    const conn = await smsConnection(c.businessId)
    if (!conn) return bad('Texts aren’t switched on yet. Add the Twilio details in Netlify (see Inbox → Texts).', 503)
    const r = await sendSms(to, row.message, conn.phone)
    if (r.skipped) return bad('Texts aren’t switched on yet. Add the Twilio details in Netlify.', 503)
    if (r.error) { await db.from('rent_reminders').update({ error: r.error }).eq('id', id); return bad(`Twilio couldn’t send it: ${r.error}`, 502) }
    const known = await nameForPhone(c.businessId, to)
    await db.from('sms_messages').insert({ connection_id: conn.id, business_id: c.businessId, contact_phone: to, contact_name: known.name || row.tenant, contact_id: known.contactId, sender: 'staff', sent_by: c.name || c.email, body: row.message, twilio_sid: r.sid || null, status: r.status || 'queued' })
    await db.from('rent_reminders').update({ status: 'sent', error: null, ...decided }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return bad('Unknown action')
}
