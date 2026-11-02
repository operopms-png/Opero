import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller, type Caller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'
import { sendSms } from '@/lib/send-sms'
import { normalizePhone, smsConnection, nameForPhone } from '@/lib/sms'
import { generateRentReminders } from '@/lib/rent-reminders'

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
const isHuman = (c: Caller) => c.isAdmin || /co.?founder/i.test(c.role)

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
    const r = await generateRentReminders(c.businessId, c.name || c.email)
    if (r.error) return bad(r.error, 500)
    return NextResponse.json({ created: r.created, skippedNoPhone: r.skippedNoPhone })
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
