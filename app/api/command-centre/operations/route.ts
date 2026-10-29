import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Operations feed. Counts only, from the signed-in business's own records.
// Maintenance, cleaning, turnovers and compliance, each with a link to its tab.
const DONE_CLEAN = ['done', 'completed', 'complete', 'cancelled']
const DONE_MAINT = ['resolved', 'closed', 'done', 'completed', 'cancelled']

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
  const in30 = new Date(new Date(today).getTime() + 30 * 864e5).toISOString().slice(0, 10)

  const { data: props } = await db.from('properties').select('id').eq('user_id', biz)
  const propIds = (props ?? []).map((p: any) => p.id)

  const countIn = async (table: string, col: string, ids: string[], notIn: string[]) => {
    if (ids.length === 0) return 0
    const { count } = await db.from(table).select('id', { count: 'exact', head: true }).in(col, ids).not('status', 'in', `(${notIn.join(',')})`)
    return count ?? 0
  }
  const countOwn = async (table: string, notIn: string[]) => {
    const { count } = await db.from(table).select('id', { count: 'exact', head: true }).eq('user_id', biz).not('status', 'in', `(${notIn.join(',')})`)
    return count ?? 0
  }

  const [mt, em, pmm, cleaning, turnovers] = await Promise.all([
    countIn('maintenance_tickets', 'property_id', propIds, DONE_MAINT),
    countOwn('estate_maintenance', DONE_MAINT),
    countOwn('pm_maintenance', DONE_MAINT),
    countIn('cleaning_tasks', 'property_id', propIds, DONE_CLEAN),
    countIn('turnovers', 'property_id', propIds, DONE_CLEAN),
  ])

  // Compliance: certificates expired, or due within 30 days
  const comp = await Promise.all(['str_compliance', 'pm_compliance', 'estate_compliance', 'dev_compliance'].map(t =>
    db.from(t).select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null)))
  let expired = 0, due = 0
  comp.forEach(r => (r.data ?? []).forEach((row: any) => {
    if (row.expiry_date < today) expired++
    else if (row.expiry_date <= in30) due++
  }))

  return NextResponse.json({
    asOf: today,
    maintenance: { open: mt + em + pmm, href: '/staff-centre/maintenance' },
    cleaning: { open: cleaning, href: '/cleaning' },
    turnovers: { open: turnovers, href: '/turnovers' },
    compliance: { expired, dueWithin30Days: due, href: '/staff-centre/compliance' },
  })
}
