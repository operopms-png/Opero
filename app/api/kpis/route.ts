import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'
import { STARTERS, monthStart, addMonths, statusOf } from '@/lib/kpi'

// KPI Tracker. One row per KPI, one entry per KPI per month. Some KPIs are worked out from the portal
// (source 'auto:…'); a number typed in for a month always wins over the worked-out one.
//   GET            -> { month, kpis: Kpi[] }
//   POST { action: 'add' | 'edit' | 'remove' | 'set' | 'seed', … }
const MONTHS = 6

async function auto(biz: string, source: string, from: string, to: string): Promise<number | null> {
  const count = async (t: string, col: string, extra?: (q: any) => any) => {
    let q: any = db.from(t).select('id', { count: 'exact', head: true }).eq('user_id', biz).gte(col, from).lt(col, to)
    if (extra) q = extra(q)
    const { count: c, error } = await q
    return error ? null : (c ?? 0)
  }
  try {
    if (source === 'auto:enquiries') {
      const { count: c, error } = await db.from('website_chats').select('id', { count: 'exact', head: true }).eq('business_id', biz).gte('created_at', from).lt('created_at', to)
      const a = error ? 0 : (c ?? 0)
      const b = (await count('crm_contacts', 'created_at')) ?? 0
      return a + b
    }
    if (source === 'auto:viewings') return await count('estate_viewings', 'created_at')
    if (source === 'auto:deals_won') return await count('crm_deals', 'created_at', q => q.ilike('stage', '%won%'))
    if (source === 'auto:repairs_fixed') return await count('estate_maintenance', 'resolved_at')
    if (source === 'auto:rent_collected') {
      const { data, error } = await db.from('pm_rent_payments').select('status,paid_date,due_date').eq('user_id', biz).gte('due_date', from).lt('due_date', to).limit(5000)
      if (error || !data || !data.length) return null
      const paid = data.filter((r: any) => r.paid_date || String(r.status || '').toLowerCase() === 'paid').length
      return Math.round((paid / data.length) * 1000) / 10
    }
  } catch { /* fall through */ }
  return null
}

async function gate(req: NextRequest, write = false) {
  const c = await getCaller(req)
  if (!c) return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await hasScTab(c, 'companydocs')) && (write || !(await hasScTab(c, 'oversight')))) return { err: NextResponse.json({ error: 'You don’t have access to this page.' }, { status: 403 }) }
  return { c, biz: c.businessId as string }
}

async function seedIfEmpty(biz: string) {
  const { count } = await db.from('kpis').select('id', { count: 'exact', head: true }).eq('user_id', biz)
  if (count) return
  await db.from('kpis').insert(STARTERS.map((s, i) => ({ user_id: biz, ...s, sort_order: i })))
}

export async function GET(req: NextRequest) {
  const g = await gate(req); if ('err' in g) return g.err
  const biz = g.biz
  await seedIfEmpty(biz)
  const cur = monthStart()
  const first = addMonths(cur, -(MONTHS - 1))
  const [{ data: ks }, { data: es }] = await Promise.all([
    db.from('kpis').select('*').eq('user_id', biz).eq('active', true).order('sort_order').order('created_at'),
    db.from('kpi_entries').select('kpi_id,period,value').eq('user_id', biz).gte('period', first).limit(2000),
  ])
  const typed = new Map<string, number>()
  ;(es || []).forEach((e: any) => typed.set(e.kpi_id + '|' + e.period, Number(e.value)))
  const periods = Array.from({ length: MONTHS }, (_, i) => addMonths(first, i))
  const kpis = await Promise.all((ks || []).map(async (k: any) => {
    const isAuto = String(k.source || '').startsWith('auto:')
    const history = await Promise.all(periods.map(async p => {
      const t = typed.get(k.id + '|' + p)
      if (t != null) return { period: p, value: t }
      return { period: p, value: isAuto ? await auto(biz, k.source, p, addMonths(p, 1)) : null }
    }))
    const value = history[history.length - 1].value
    const prev = history[history.length - 2]?.value ?? null
    return { id: k.id, name: k.name, unit: k.unit, target: k.target == null ? null : Number(k.target), direction: k.direction, source: k.source, sort_order: k.sort_order, value, prev, auto: isAuto, history, status: statusOf(value, k.target == null ? null : Number(k.target), k.direction) }
  }))
  return NextResponse.json({ month: cur, kpis })
}

export async function POST(req: NextRequest) {
  const g = await gate(req, true); if ('err' in g) return g.err
  const biz = g.biz
  const b = await req.json().catch(() => ({}))
  const num = (v: any) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  const UNITS = ['number', 'percent', 'money', 'days'], DIRS = ['higher', 'lower']
  if (b.action === 'add') {
    const name = String(b.name || '').trim().slice(0, 80)
    if (!name) return NextResponse.json({ error: 'Give the KPI a name.' }, { status: 400 })
    const { count } = await db.from('kpis').select('id', { count: 'exact', head: true }).eq('user_id', biz)
    const { data, error } = await db.from('kpis').insert({ user_id: biz, name, unit: UNITS.includes(b.unit) ? b.unit : 'number', target: num(b.target), direction: DIRS.includes(b.direction) ? b.direction : 'higher', source: 'manual', sort_order: count ?? 0 }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }
  if (b.action === 'edit') {
    const patch: any = {}
    if (b.name != null) patch.name = String(b.name).trim().slice(0, 80)
    if (b.target !== undefined) patch.target = num(b.target)
    if (UNITS.includes(b.unit)) patch.unit = b.unit
    if (DIRS.includes(b.direction)) patch.direction = b.direction
    const { error } = await db.from('kpis').update(patch).eq('id', b.id).eq('user_id', biz)
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
  }
  if (b.action === 'remove') {
    const { error } = await db.from('kpis').update({ active: false }).eq('id', b.id).eq('user_id', biz)
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
  }
  if (b.action === 'set') {
    const period = /^\d{4}-\d{2}-\d{2}$/.test(String(b.period || '')) ? monthStart(new Date(b.period + 'T00:00:00Z')) : monthStart()
    const { data: k } = await db.from('kpis').select('id').eq('id', b.kpi_id).eq('user_id', biz).maybeSingle()
    if (!k) return NextResponse.json({ error: 'KPI not found.' }, { status: 404 })
    const v = num(b.value)
    if (v == null) { await db.from('kpi_entries').delete().eq('kpi_id', b.kpi_id).eq('user_id', biz).eq('period', period); return NextResponse.json({ ok: true }) }
    const { error } = await db.from('kpi_entries').upsert({ user_id: biz, kpi_id: b.kpi_id, period, value: v, note: b.note ? String(b.note).slice(0, 300) : null, entered_by: g.c.email || null }, { onConflict: 'kpi_id,period' })
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
