export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { buildSchedule, CURRENCIES } from '@/lib/partner-schedule'

// Monthly repayments back to a funding partner.
//   GET  ?owner_id=…            partner sees their own (no id needed); staff pass owner_id for a partner in their business
//   PUT  {owner_id, invested, currency, plan:{start,mode,monthly|pct+net}}   staff: save the amount in and rebuild the unpaid months
//   PATCH {id, paid?, amount?, due_on?}   staff: mark one month paid or undo it, or change its amount or date
//   POST {owner_id, due_on, amount}       staff: add a month
//   DELETE ?id=…                          staff: remove a month
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const COLS = 'id, name, invested, currency, business_id'

async function staffOwner(req: NextRequest, ownerId: string) {
  const c = await getCaller(req); if (!c) return null
  const { data } = await db.from('owner_profiles').select(COLS).eq('id', ownerId).eq('business_id', c.businessId).maybeSingle()
  return data ? { owner: data, caller: c } : null
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('owner_id') || ''
  let owner: any = null, staff = false
  if (id) { const s = await staffOwner(req, id); if (!s) return bad('Not found', 404); owner = s.owner; staff = true }
  else {
    const uid = await requireUser(req); if (!uid) return bad('Not signed in', 401)
    const { data } = await db.from('owner_profiles').select(COLS).eq('user_id', uid).maybeSingle()
    owner = data
  }
  if (!owner) return bad('Not found', 404)
  const { data: rows } = await db.from('partner_repayments').select('id, due_on, amount, paid_on, note').eq('owner_id', owner.id).order('due_on')
  return NextResponse.json({ owner: { id: owner.id, name: owner.name, invested: Number(owner.invested) || 0, currency: owner.currency || 'JMD' }, rows: rows ?? [], staff })
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.owner_id) return bad('Missing partner')
  const s = await staffOwner(req, String(b.owner_id)); if (!s) return bad('Not found', 404)
  const invested = Number(b.invested); if (!(invested >= 0)) return bad('Enter the amount invested')
  const currency = CURRENCIES[b.currency] ? String(b.currency) : 'JMD'
  await db.from('owner_profiles').update({ invested, currency }).eq('id', s.owner.id)
  const p = b.plan
  if (p) {
    const { data: paid } = await db.from('partner_repayments').select('amount').eq('owner_id', s.owner.id).not('paid_on', 'is', null)
    const paidSum = (paid ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0)
    const rows = buildSchedule({ invested: Math.max(0, invested - paidSum), start: String(p.start), mode: p.mode === 'pct' ? 'pct' : 'fixed', monthly: Number(p.monthly), pct: Number(p.pct), net: Number(p.net) })
    if (!rows.length) return bad('Enter a repayment and a first repayment date')
    await db.from('partner_repayments').delete().eq('owner_id', s.owner.id).is('paid_on', null)
    const { error } = await db.from('partner_repayments').insert(rows.map(r => ({ ...r, business_id: s.owner.business_id, owner_id: s.owner.id })))
    if (error) return bad(error.message, 500)
  }
  return NextResponse.json({ ok: true })
}

async function rowOwner(req: NextRequest, id: string) {
  const { data: r } = await db.from('partner_repayments').select('id, owner_id').eq('id', id).maybeSingle()
  return r && (await staffOwner(req, r.owner_id)) ? r : null
}
const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.id) return bad('Missing repayment')
  if (!(await rowOwner(req, b.id))) return bad('Not found', 404)
  const u: any = {}
  if (typeof b.paid === 'boolean') u.paid_on = b.paid ? new Date().toISOString().slice(0, 10) : null
  if (b.amount !== undefined) { const n = Number(b.amount); if (!(n >= 0)) return bad('Enter an amount'); u.amount = n }
  if (b.due_on !== undefined) { if (!ISO.test(String(b.due_on))) return bad('Enter a date'); u.due_on = b.due_on }
  if (!Object.keys(u).length) return bad('Nothing to change')
  const { error } = await db.from('partner_repayments').update(u).eq('id', b.id)
  return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.owner_id) return bad('Missing partner')
  const s = await staffOwner(req, String(b.owner_id)); if (!s) return bad('Not found', 404)
  const n = Number(b.amount); if (!(n >= 0) || !ISO.test(String(b.due_on))) return bad('Enter a date and an amount')
  const { error } = await db.from('partner_repayments').insert({ business_id: s.owner.business_id, owner_id: s.owner.id, due_on: b.due_on, amount: n })
  return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!(await rowOwner(req, id))) return bad('Not found', 404)
  await db.from('partner_repayments').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
