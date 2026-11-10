export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Long-term (property management) side of a partner's portal: rent, tenancies and repairs on the properties linked to them.
//   GET ?owner_id=…          partner sees their own; staff pass owner_id. Staff also get `options`, every long-term property they could link.
//   PUT {owner_id, pm_property_ids}   staff: choose which long-term properties belong to this partner
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const COLS = 'id, name, business_id, pm_property_ids, split_percentage, currency'

async function who(req: NextRequest, ownerId: string) {
  if (ownerId) {
    const c = await getCaller(req); if (!c) return null
    const { data } = await db.from('owner_profiles').select(COLS).eq('id', ownerId).eq('business_id', c.businessId).maybeSingle()
    return data ? { owner: data, staff: true } : null
  }
  const uid = await requireUser(req); if (!uid) return null
  const { data } = await db.from('owner_profiles').select(COLS).eq('user_id', uid).maybeSingle()
  return data ? { owner: data, staff: false } : null
}

export async function GET(req: NextRequest) {
  const w = await who(req, req.nextUrl.searchParams.get('owner_id') || ''); if (!w) return bad('Not found', 404)
  const ids: string[] = w.owner.pm_property_ids ?? []
  const out: any = { split: Number(w.owner.split_percentage) || 0, properties: [], months: [], maintenance: [], options: [] }
  if (w.staff) {
    const { data } = await db.from('pm_properties').select('id, name').eq('user_id', w.owner.business_id).is('ended_at', null).order('name')
    out.options = data ?? []; out.linked = ids
  }
  if (!ids.length) return NextResponse.json(out)
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - 5, 1)
  const [pr, ls, pay, mt] = await Promise.all([
    db.from('pm_properties').select('id, name, address, currency, status, monthly_income').in('id', ids),
    db.from('pm_leases').select('property_id, monthly_rent, end_date, status, pm_tenants(name)').in('property_id', ids).order('end_date', { ascending: false }),
    db.from('pm_rent_payments').select('property_id, amount, due_date, paid_date, status').in('property_id', ids).gte('due_date', since.toISOString().slice(0, 10)),
    db.from('pm_maintenance').select('id, property_id, title, description, priority, status, created_at').in('property_id', ids).order('created_at', { ascending: false }).limit(100),
  ])
  const lease = (pid: string) => (ls.data ?? []).find((l: any) => l.property_id === pid && String(l.status).toLowerCase() === 'active') ?? (ls.data ?? []).find((l: any) => l.property_id === pid)
  out.properties = (pr.data ?? []).map((p: any) => { const l: any = lease(p.id); return { id: p.id, name: p.name, address: p.address, currency: p.currency || 'JMD', status: p.status, rent: Number(l?.monthly_rent ?? p.monthly_income) || 0, tenant: l?.pm_tenants?.name ?? null, lease_end: l?.end_date ?? null } })
  const m = new Map<string, { month: string; due: number; collected: number; late: number }>()
  for (const r of pay.data ?? []) {
    const k = String(r.due_date).slice(0, 7); const e = m.get(k) ?? { month: k, due: 0, collected: 0, late: 0 }
    const a = Number(r.amount) || 0; e.due += a
    if (r.paid_date) { e.collected += a; if (String(r.paid_date) > String(r.due_date)) e.late += a }
    m.set(k, e)
  }
  out.months = [...m.values()].sort((a, b) => a.month.localeCompare(b.month))
  out.maintenance = mt.data ?? []
  return NextResponse.json(out)
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.owner_id || !Array.isArray(b.pm_property_ids)) return bad('Missing details')
  const w = await who(req, String(b.owner_id)); if (!w?.staff) return bad('Not found', 404)
  const { data: ok } = await db.from('pm_properties').select('id').eq('user_id', w.owner.business_id).in('id', b.pm_property_ids)
  await db.from('owner_profiles').update({ pm_property_ids: (ok ?? []).map((p: any) => p.id) }).eq('id', w.owner.id)
  return NextResponse.json({ ok: true })
}
