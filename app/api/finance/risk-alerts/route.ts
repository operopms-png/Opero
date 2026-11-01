import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'

// Staff Centre → Finance → Risk alerts. For every property we sublet under a head lease
// (Property Management → Head Leases), flags the ones where tenant rent is late while we
// still owe the landlord the head rent, so a shortfall is found early.
//
// GET -> { today, alerts: [{ property, landlord, head_rent, rent_overdue, rent_received, days_overdue, risk, action, … }] }
//
// Head rent comes from the head lease (rent_payable) and is taken as GBP, the same as
// Unit Profit. Tenant rent keeps its own currency; the head-rent comparison is only made
// when both are GBP.

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(await hasScTab(c, 'finance'))) return bad('You don’t have access to Finance — ask an admin to tick it in Team Management.', 403)
  const T = today(), month = T.slice(0, 7)
  const [leases, props, rent, tenants] = await Promise.all([
    q(db.from('pm_head_leases').select('id,property_id,landlord_name,rent_payable,expiry_date,break_date').eq('user_id', c.businessId)),
    q(db.from('pm_properties').select('id,name,country').eq('user_id', c.businessId)),
    q(db.from('pm_rent_payments').select('id,tenant_id,property_id,amount,due_date,paid_date,status').eq('user_id', c.businessId)),
    q(db.from('pm_tenants').select('id,name').eq('user_id', c.businessId)),
  ])
  const alerts: any[] = []
  for (const l of leases) {
    if (!l.property_id) continue
    const p = props.find((x: any) => x.id === l.property_id)
    const cur = /jamaica/i.test(p?.country || '') ? 'JMD' : 'GBP'
    const rows = rent.filter((r: any) => r.property_id === l.property_id)
    const late = rows.filter((r: any) => String(r.status).toLowerCase() !== 'paid' && r.due_date && r.due_date < T)
    if (!late.length) continue
    const days = Math.max(...late.map((r: any) => Math.round((new Date(T).getTime() - new Date(r.due_date).getTime()) / 864e5)))
    const overdue = late.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0)
    const dueThisMonth = rows.filter((r: any) => (r.due_date || '').slice(0, 7) === month).reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0)
    const received = rows.filter((r: any) => String(r.status).toLowerCase() === 'paid' && (r.paid_date || '').slice(0, 7) === month).reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0)
    const head = Number(l.rent_payable) || 0
    const covered = cur === 'GBP' && head > 0
    const risk = days >= 7 || (covered && overdue >= head) ? 'High' : 'Medium'
    const action = risk === 'High'
      ? 'Contact the tenant, review their payment history and start the arrears procedure where appropriate.'
      : 'Send a missed-payment reminder and check again in a few days.'
    alerts.push({
      id: l.id, property: p?.name || 'Property', landlord: l.landlord_name || null, currency: cur,
      tenants: [...new Set(late.map((r: any) => tenants.find((t: any) => t.id === r.tenant_id)?.name).filter(Boolean))],
      rent_due_this_month: dueThisMonth, rent_received: received, rent_overdue: overdue, days_overdue: days,
      head_rent: head, head_currency: 'GBP', exposure: covered ? Math.min(head, overdue) : null,
      head_lease_expiry: l.expiry_date || null, risk, action,
    })
  }
  alerts.sort((a, b) => (a.risk === b.risk ? b.days_overdue - a.days_overdue : a.risk === 'High' ? -1 : 1))
  return NextResponse.json({ today: T, alerts })
}
