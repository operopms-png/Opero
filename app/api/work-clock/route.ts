export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceClient as db } from '@/lib/admin-auth'
import { lateMinutes, localParts, toMinutes, validTz, type Shift } from '@/lib/clock'

// Work Hours: clock in / clock out, shift start times and late arrivals. Each company sees only its own people.
//   GET                      -> me: my own clock status (any staff member); and for the owner and chosen viewers also rows, shifts, missing
//   POST {action:'in'|'out'} -> clock myself in or out
//   POST {action:'shift', email, name, shift_start, grace_minutes, days, tz}  -> owner only: set someone's shift
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const DEF: Shift = { shift_start: '09:00', grace_minutes: 5, days: [1, 2, 3, 4, 5], tz: 'Europe/London' }
const shape = (r: any, now = Date.now()) => {
  const open = !r.clock_out && !r.note
  const end = r.clock_out ? new Date(r.clock_out).getTime() : open ? now : new Date(r.clock_in).getTime()
  return { ...r, open, seconds: Math.max(0, Math.round((end - new Date(r.clock_in).getTime()) / 1000)) }
}

async function isStaff(c: { uid: string; email: string }) {
  const [t, o1, o2] = await Promise.all([
    db.from('team_members').select('id', { count: 'exact', head: true }).eq('email', c.email),
    db.from('mailboxes').select('id', { count: 'exact', head: true }).eq('user_id', c.uid),
    db.from('hr_employees').select('id', { count: 'exact', head: true }).eq('user_id', c.uid),
  ])
  return !!(t.count || o1.count || o2.count)
}
async function canView(c: { uid: string; email: string; businessId: string }) {
  if (c.uid === c.businessId) return true
  const { count } = await db.from('work_hours_viewers').select('email', { count: 'exact', head: true }).eq('business_id', c.businessId).eq('email', c.email)
  return !!count
}
const shiftOf = (row: any): Shift => row ? { shift_start: row.shift_start, grace_minutes: row.grace_minutes, days: row.days ?? DEF.days, tz: row.tz || DEF.tz } : DEF

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const now = new Date()
  const eligible = await isStaff(c)
  const { data: myShift } = await db.from('work_shifts').select('*').eq('business_id', c.businessId).eq('email', c.email).maybeSingle()
  const since = new Date(now.getTime() - 3 * 864e5).toISOString()
  const { data: mine } = await db.from('work_clock').select('*').eq('user_id', c.uid).gte('clock_in', since).order('clock_in', { ascending: false }).limit(10)
  const tz = shiftOf(myShift).tz, today = localParts(now, tz).date
  const rowsMine = (mine ?? []).map(r => shape(r))
  const me = { eligible, shift: myShift ? shiftOf(myShift) : null, open: rowsMine.find(r => r.open && now.getTime() - new Date(r.clock_in).getTime() < 18 * 36e5) ?? null, today: rowsMine.filter(r => localParts(new Date(r.clock_in), tz).date === today), now: now.toISOString() }
  if (!(await canView(c))) return NextResponse.json({ me, canView: false })

  const u = new URL(req.url)
  const from = u.searchParams.get('from') || new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)
  const to = u.searchParams.get('to') || now.toISOString().slice(0, 10)
  const [{ data: rows }, { data: shifts }, { data: recent }] = await Promise.all([
    db.from('work_clock').select('*').eq('business_id', c.businessId).gte('clock_in', from + 'T00:00:00Z').lte('clock_in', to + 'T23:59:59Z').order('clock_in', { ascending: false }).limit(2000),
    db.from('work_shifts').select('*').eq('business_id', c.businessId),
    db.from('work_clock').select('email,clock_in').eq('business_id', c.businessId).gte('clock_in', since).limit(500),
  ])
  // People with a shift today who have not clocked in once the grace period has passed
  const missing: { email: string; name: string; shift_start: string; minutes: number }[] = []
  for (const s of shifts ?? []) {
    const sh = shiftOf(s), l = localParts(now, sh.tz)
    if (!sh.days.includes(l.dow)) continue
    const over = l.minutes - toMinutes(sh.shift_start)
    if (over <= sh.grace_minutes) continue
    if ((recent ?? []).some(r => r.email === s.email && localParts(new Date(r.clock_in), sh.tz).date === l.date)) continue
    missing.push({ email: s.email, name: s.name || s.email, shift_start: sh.shift_start, minutes: over })
  }
  return NextResponse.json({ me, canView: true, rows: (rows ?? []).map(r => shape(r)), shifts: shifts ?? [], missing })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const now = new Date()

  if (b.action === 'in' || b.action === 'out') {
    if (!(await isStaff(c))) return bad('Clocking in is for staff and account owners only.', 403)
    const { data: open } = await db.from('work_clock').select('*').eq('user_id', c.uid).is('clock_out', null).is('note', null).order('clock_in', { ascending: false }).limit(5)
    const fresh = (open ?? []).find(r => now.getTime() - new Date(r.clock_in).getTime() < 18 * 36e5)
    // anything left open for more than 18 hours was never clocked out
    for (const r of (open ?? []).filter(r => r !== fresh)) await db.from('work_clock').update({ note: 'Not clocked out' }).eq('id', r.id)
    if (b.action === 'out') {
      if (!fresh) return bad('You are not clocked in.')
      await db.from('work_clock').update({ clock_out: now.toISOString() }).eq('id', fresh.id)
      return NextResponse.json({ ok: true })
    }
    if (fresh) return NextResponse.json({ ok: true, already: true })
    const { data: s } = await db.from('work_shifts').select('*').eq('business_id', c.businessId).eq('email', c.email).maybeSingle()
    const late = s ? lateMinutes(now, shiftOf(s)) : 0
    const { error } = await db.from('work_clock').insert({ business_id: c.businessId, user_id: c.uid, email: c.email, name: c.name, clock_in: now.toISOString(), shift_start: s?.shift_start ?? null, late_minutes: late })
    if (error) return bad(error.message, 500)
    return NextResponse.json({ ok: true, late })
  }

  if (b.action === 'shift') {
    if (c.uid !== c.businessId) return bad('Only the account owner can set shifts.', 403)
    const email = String(b.email || '').toLowerCase().trim(); if (!email) return bad('Choose a person.')
    if (b.remove) { await db.from('work_shifts').delete().eq('business_id', c.businessId).eq('email', email); return NextResponse.json({ ok: true }) }
    const start = String(b.shift_start || ''); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return bad('Enter the start time like 09:00.')
    const tz = String(b.tz || DEF.tz); if (!validTz(tz)) return bad('Unknown time zone.')
    const days = Array.from(new Set((Array.isArray(b.days) ? b.days : DEF.days).map(Number).filter((n: number) => n >= 1 && n <= 7))); if (!days.length) return bad('Choose at least one working day.')
    const grace = Math.min(60, Math.max(0, Number(b.grace_minutes) || 0))
    const { error } = await db.from('work_shifts').upsert({ business_id: c.businessId, email, name: String(b.name || '').slice(0, 120) || null, shift_start: start, grace_minutes: grace, days, tz }, { onConflict: 'business_id,email' })
    if (error) return bad(error.message, 500)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action.')
}
