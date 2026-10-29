import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Operations cards. Real counts only, scoped to the signed-in account.
// Maintenance, cleaning and turnovers are linked to the account through their property.
// Compliance counts the STR and PM compliance records (expired, or expiring within 30 days).
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const { data: props } = await db.from('properties').select('id').eq('user_id', biz)
  const propIds = (props ?? []).map((p: any) => p.id)
  const none = { open: 0, urgent: 0, pending: 0, overdue: 0, upcoming: 0, expired: 0, expiring: 0 }
  if (propIds.length === 0) return NextResponse.json(none)

  const [maint, clean, turn, str, pm] = await Promise.all([
    db.from('maintenance_tickets').select('priority,status').in('property_id', propIds),
    db.from('cleaning_tasks').select('status,scheduled_date').in('property_id', propIds),
    db.from('turnovers').select('check_out,status').in('property_id', propIds),
    db.from('str_compliance').select('expiry_date').eq('user_id', biz),
    db.from('pm_compliance').select('expiry_date').eq('user_id', biz),
  ])

  const open = (maint.data ?? []).filter((t: any) => t.status !== 'resolved')
  const pending = (clean.data ?? []).filter((t: any) => t.status === 'pending')
  const compliance = [...(str.data ?? []), ...(pm.data ?? [])] as { expiry_date: string | null }[]

  return NextResponse.json({
    open: open.length,
    urgent: open.filter((t: any) => t.priority === 'urgent').length,
    pending: pending.length,
    overdue: pending.filter((t: any) => t.scheduled_date && t.scheduled_date < today).length,
    upcoming: (turn.data ?? []).filter((t: any) => t.check_out && t.check_out >= today && t.check_out <= in7).length,
    expired: compliance.filter(r => r.expiry_date && r.expiry_date < today).length,
    expiring: compliance.filter(r => r.expiry_date && r.expiry_date >= today && r.expiry_date <= in30).length,
  })
}
