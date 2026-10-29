import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre cards: upcoming tasks, active leads, occupancy and top opportunities.
// Real counts from the account's own records only.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

  const [tasks, leads, pmU, esU, opps] = await Promise.all([
    db.from('staff_tasks').select('title,status,due_date').eq('user_id', biz),
    db.from('sales_leads').select('status').eq('user_id', biz),
    db.from('pm_units').select('status').eq('user_id', biz),
    db.from('estate_units').select('status').eq('user_id', biz),
    db.from('client_properties').select('id,address,area,price,currency,price_is_rent,stage,updated_at').eq('business_id', biz).order('updated_at', { ascending: false }),
  ])

  const isDone = (s: string | null) => /done|complete|closed|finished/i.test(s || '')
  const open = (tasks.data ?? []).filter((t: any) => !isDone(t.status))
  const dueSoon = open.filter((t: any) => t.due_date && t.due_date <= in7)
  const units = [...(pmU.data ?? []), ...(esU.data ?? [])] as { status: string | null }[]
  const occupied = units.filter(u => /occupied/i.test(u.status || '')).length
  const activeLeads = (leads.data ?? []).filter((l: any) => !/won|lost|closed/i.test(l.status || '')).length
  const newOpps = (opps.data ?? []).filter((p: any) => !['signed', 'converted', 'lost'].includes(String(p.stage || '').toLowerCase()))

  return NextResponse.json({
    tasks: {
      open: open.length,
      dueSoon: dueSoon.length,
      overdue: open.filter((t: any) => t.due_date && t.due_date < today).length,
      next: dueSoon.slice(0, 3).map((t: any) => ({ title: t.title, due: t.due_date })),
    },
    leads: { active: activeLeads },
    occupancy: { units: units.length, occupied, pct: units.length ? Math.round((occupied / units.length) * 100) : null },
    opportunities: {
      count: newOpps.length,
      top: newOpps.slice(0, 3).map((p: any) => ({ id: p.id, address: p.address, area: p.area, price: p.price, currency: p.currency, rent: !!p.price_is_rent })),
    },
  })
}
