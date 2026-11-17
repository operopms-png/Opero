// Emails the account owner when someone with a shift today has not clocked in 15 minutes after it starts.
// Runs every 10 minutes. Each person is reported once per day, and not more than 3 hours after the shift started.
import { serviceClient as db } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import { localParts, toMinutes } from '@/lib/clock'

export async function runClockAlerts() {
  const now = new Date()
  const { data: shifts } = await db.from('work_shifts').select('*').limit(5000)
  const since = new Date(now.getTime() - 3 * 864e5).toISOString()
  const due = new Map<string, { name: string; email: string; start: string; over: number; day: string }[]>()
  for (const s of shifts ?? []) {
    const l = localParts(now, s.tz || 'Europe/London')
    if (!(s.days ?? []).includes(l.dow)) continue
    const over = l.minutes - toMinutes(s.shift_start)
    if (over < 15 || over > 180) continue
    const { data: rows } = await db.from('work_clock').select('clock_in').eq('business_id', s.business_id).eq('email', s.email).gte('clock_in', since)
    if ((rows ?? []).some(r => localParts(new Date(r.clock_in), s.tz || 'Europe/London').date === l.date)) continue
    const { error } = await db.from('work_clock_alerts').insert({ business_id: s.business_id, email: s.email, day: l.date })
    if (error) continue // already reported today
    const list = due.get(s.business_id) ?? []; list.push({ name: s.name || s.email, email: s.email, start: s.shift_start, over, day: l.date }); due.set(s.business_id, list)
  }
  let sent = 0
  for (const [biz, people] of due) {
    const { data: o } = await db.auth.admin.getUserById(biz)
    const to = o?.user?.email; if (!to) continue
    const li = people.map(p => `<li><b>${p.name}</b>: shift started ${p.start}, not clocked in ${p.over} minutes later.</li>`).join('')
    const html = `<div style="font-family:Arial,sans-serif;color:#101828;max-width:520px"><h2 style="color:#0B1F3A">Not clocked in</h2><ul>${li}</ul><p><a href="${SITE_URL}/staff-centre/work-hours" style="color:#2F6DB5">Open Work Hours</a></p></div>`
    const r: any = await sendEmail(to, people.length === 1 ? `${people[0].name} has not clocked in` : `${people.length} people have not clocked in`, html)
    if (!r?.skipped && !r?.error) sent++
  }
  return { checked: (shifts ?? []).length, alerted: [...due.values()].reduce((n, a) => n + a.length, 0), emailed: sent }
}
