import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'

// Owners and tenants from Property Management and Estate Agency in one list, one row per person.
// People are matched on email (or on name when there is no email). When the same person is in both
// modules but their details differ, the row says what differs so it can be fixed in one place.
//   GET -> { owners: Person[], tenants: Person[] }
type Row = { id: string; name: string | null; email: string | null; phone: string | null; status?: string | null }
const key = (r: Row) => (r.email || '').trim().toLowerCase() || 'name:' + (r.name || '').trim().toLowerCase()
const norm = (s: string | null | undefined) => (s || '').replace(/\s+/g, '').toLowerCase()

function merge(pm: Row[], ea: Row[]) {
  const map = new Map<string, any>()
  const add = (r: Row, mod: 'pm' | 'ea') => {
    const k = key(r)
    const p = map.get(k) ?? { key: k, name: r.name, email: r.email, phone: r.phone, status: r.status ?? null, modules: [], differs: [] as string[] }
    if (p.modules.includes(mod)) { map.set(k, p); return }
    if (p.modules.length) {
      if (norm(p.name) !== norm(r.name)) p.differs.push('name')
      if (norm(p.phone) !== norm(r.phone) && (p.phone || r.phone)) p.differs.push('phone')
      if (!p.phone && r.phone) p.phone = r.phone
    }
    p.modules.push(mod)
    map.set(k, p)
  }
  pm.forEach(r => add(r, 'pm')); ea.forEach(r => add(r, 'ea'))
  return [...map.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasScTab(c, 'companydocs'))) return NextResponse.json({ error: 'You don’t have access to this page.' }, { status: 403 })
  const biz = c.businessId
  const sel = (t: string, cols: string) => db.from(t).select(cols).eq('user_id', biz).limit(2000)
  const [pl, el, pt, et] = await Promise.all([
    sel('pm_landlords', 'id,name,email,phone'), sel('estate_landlords', 'id,name,email,phone'),
    sel('pm_tenants', 'id,name,email,phone,status'), sel('estate_tenants', 'id,name,email,phone,status'),
  ])
  const err = pl.error || el.error || pt.error || et.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({
    owners: merge((pl.data ?? []) as any, (el.data ?? []) as any),
    tenants: merge((pt.data ?? []) as any, (et.data ?? []) as any),
  })
}
