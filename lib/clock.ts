// Clock in / out: working out local time in a person's time zone, and whether a clock-in was late.
export const DAYNUM: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
export function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' })
  const p: Record<string, string> = {}; for (const x of f.formatToParts(d)) p[x.type] = x.value
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), dow: DAYNUM[p.weekday] ?? 1 }
}
export const toMinutes = (hhmm: string) => { const [h, m] = (hhmm || '09:00').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export type Shift = { shift_start: string; grace_minutes: number; days: number[]; tz: string }
/** Minutes late, or 0 when on time, inside the grace period, or on a day that is not one of their working days. */
export function lateMinutes(clockIn: Date, s: Shift) {
  const l = localParts(clockIn, s.tz)
  if (!s.days.includes(l.dow)) return 0
  const diff = l.minutes - toMinutes(s.shift_start)
  return diff > s.grace_minutes ? diff : 0
}
export const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return true } catch { return false } }
