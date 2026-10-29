import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Calendar, Meetings and Tasks counts, from the account's own records.
const isDone = (s: string | null) => /done|complete|closed|finished/i.test(s || '')

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const d = new Date(today + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - dow)
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  const in7 = new Date(d); in7.setUTCDate(d.getUTCDate() + 7)

  const [tasks, shifts, meetings] = await Promise.all([
    db.from('staff_tasks').select('status,due_date').eq('user_id', biz),
    db.from('staff_shifts').select('staff_id').eq('user_id', biz).gte('date', iso(mon)).lte('date', iso(sun)),
    db.from('meetings').select('status,scheduled_at').eq('user_id', biz),
  ])
  const open = ((tasks.data ?? []) as any[]).filter(t => !isDone(t.status))
  const ms = (meetings.data ?? []) as any[]
  const now = Date.now()
  return NextResponse.json({
    tasks: {
      open: open.length,
      overdue: open.filter(t => t.due_date && t.due_date < today).length,
      dueSoon: open.filter(t => t.due_date && t.due_date <= iso(in7)).length,
    },
    calendar: {
      shiftsThisWeek: (shifts.data ?? []).length,
      staffScheduled: new Set((shifts.data ?? []).map((s: any) => s.staff_id)).size,
    },
    meetings: {
      requested: ms.filter(m => m.status === 'requested').length,
      awaitingBooking: ms.filter(m => m.status === 'pending').length,
      upcoming: ms.filter(m => m.scheduled_at && new Date(m.scheduled_at).getTime() >= now).length,
    },
  })
}
