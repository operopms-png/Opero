import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Property Management cards: leases, vacancies, deposits, rent,
// insurance, head leases and viewings. Real counts from the account's own records only.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const month = today.slice(0, 7)

  const [units, rent, ins, head, viewings] = await Promise.all([
    db.from('pm_units').select('status,lease_end,deposit').eq('user_id', biz),
    db.from('pm_rent_payments').select('amount,status,due_date,paid_date').eq('user_id', biz),
    db.from('pm_insurance_policies').select('renewal_date').eq('user_id', biz),
    db.from('pm_head_leases').select('expiry_date').eq('user_id', biz),
    db.from('pm_viewings').select('status,scheduled_at').eq('user_id', biz),
  ])

  const u = (units.data ?? []) as { status: string | null; lease_end: string | null; deposit: number | null }[]
  const vacant = u.filter(x => /vacant/i.test(x.status || '')).length
  const occupied = u.filter(x => /occupied/i.test(x.status || '')).length
  const r = (rent.data ?? []) as { amount: number; status: string | null; due_date: string | null; paid_date: string | null }[]
  const paidThisMonth = r.filter(x => /paid/i.test(x.status || '') && (x.paid_date || x.due_date || '').slice(0, 7) === month)
  const dueThisMonth = r.filter(x => (x.due_date || '').slice(0, 7) === month)
  const overdueRent = r.filter(x => !/paid/i.test(x.status || '') && x.due_date && x.due_date < today)
  const ins_ = (ins.data ?? []) as { renewal_date: string | null }[]
  const hl = (head.data ?? []) as { expiry_date: string | null }[]
  const vw = (viewings.data ?? []) as { status: string | null; scheduled_at: string | null }[]

  return NextResponse.json({
    leases: {
      expired: u.filter(x => x.lease_end && x.lease_end < today).length,
      ending60: u.filter(x => x.lease_end && x.lease_end >= today && x.lease_end <= in60).length,
    },
    vacancies: { vacant, occupied, total: u.length },
    deposits: { held: Math.round(u.filter(x => /occupied/i.test(x.status || '')).reduce((a, x) => a + (Number(x.deposit) || 0), 0)) },
    rent: {
      collected: Math.round(paidThisMonth.reduce((a, x) => a + (Number(x.amount) || 0), 0)),
      due: Math.round(dueThisMonth.reduce((a, x) => a + (Number(x.amount) || 0), 0)),
      overdue: overdueRent.length,
    },
    insurance: {
      expired: ins_.filter(x => x.renewal_date && x.renewal_date < today).length,
      renewing30: ins_.filter(x => x.renewal_date && x.renewal_date >= today && x.renewal_date <= in30).length,
    },
    headLeases: { ending90: hl.filter(x => x.expiry_date && x.expiry_date >= today && x.expiry_date <= in90).length },
    viewings: { next7: vw.filter(x => x.scheduled_at && x.scheduled_at >= today && x.scheduled_at <= in7 && !/cancel/i.test(x.status || '')).length },
  })
}
