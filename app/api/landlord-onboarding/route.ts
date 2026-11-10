export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { AGREEMENT_TYPES, type Step } from '@/lib/landlord-onboarding'

// A landlord's onboarding: named manager, agreement, and the checklist.
//   GET ?landlord_id=…   the landlord sees their own (no id); staff pass landlord_id. Staff also get `team` (people who can be the manager).
//   PUT {landlord_id, manager_id?, agreement_type?, agreement_start?, agreement_end?, agreement_terms?, onboarded?}   staff only
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const COLS = 'id, user_id, name, email, phone, address, bank_name, account_number, id_url, portal_user_id, manager_id, agreement_type, agreement_start, agreement_end, agreement_terms, onboarded_at'
const ISO = /^\d{4}-\d{2}-\d{2}$/

async function who(req: NextRequest, landlordId: string) {
  if (landlordId) {
    const c = await getCaller(req); if (!c) return null
    const { data } = await db.from('pm_landlords').select(COLS).eq('id', landlordId).eq('user_id', c.businessId).maybeSingle()
    return data ? { l: data, staff: true, businessId: c.businessId } : null
  }
  const uid = await requireUser(req); if (!uid) return null
  const { data } = await db.from('pm_landlords').select(COLS).eq('portal_user_id', uid).maybeSingle()
  return data ? { l: data, staff: false, businessId: data.user_id } : null
}

export async function GET(req: NextRequest) {
  const w = await who(req, req.nextUrl.searchParams.get('landlord_id') || ''); if (!w) return bad('Not found', 404)
  const l = w.l
  const [{ data: docs }, { count: props }, { data: mgr }] = await Promise.all([
    db.from('lease_documents').select('category').eq('subject', 'landlord').eq('head_lease_id', l.id).eq('status', 'approved'),
    db.from('pm_properties').select('id', { count: 'exact', head: true }).eq('owner_id', l.id).is('ended_at', null),
    l.manager_id ? db.from('team_members').select('name, role, email, phone').eq('id', l.manager_id).eq('user_id', l.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const has = (k: string) => (docs ?? []).some((d: any) => d.category === k)
  const steps: Step[] = [
    { key: 'details', label: 'Contact details', done: !!(l.email && l.phone && l.address), hint: 'Email, phone and address' },
    { key: 'id', label: 'ID and proof of ownership', done: (has('landlord_id') || !!l.id_url) && has('ownership'), hint: 'Passport or licence, and the title deed' },
    { key: 'bank', label: 'Payout details', done: !!(l.bank_name && l.account_number), hint: 'Where we send their payments' },
    { key: 'agreement', label: 'Signed agreement', done: has('mgmt_agreement') && !!l.agreement_type, hint: 'Agreement type agreed and the signed copy filed' },
    { key: 'manager', label: 'Manager assigned', done: !!l.manager_id, hint: 'Their named point of contact' },
    { key: 'property', label: 'Property linked', done: (props ?? 0) > 0, hint: 'At least one property under management' },
    { key: 'portal', label: 'Portal login', done: !!l.portal_user_id, hint: 'They can sign in to their portal' },
  ]
  const out: any = {
    landlord: { id: l.id, name: l.name },
    manager: mgr ?? null,
    agreement: { type: l.agreement_type, label: l.agreement_type ? AGREEMENT_TYPES[l.agreement_type]?.label ?? l.agreement_type : null, start: l.agreement_start, end: l.agreement_end, terms: l.agreement_terms },
    steps, onboarded_at: l.onboarded_at, staff: w.staff,
  }
  if (w.staff) { const { data: team } = await db.from('team_members').select('id, name, role').eq('user_id', w.businessId).eq('status', 'Active').order('name'); out.team = team ?? []; out.manager_id = l.manager_id }
  return NextResponse.json(out)
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.landlord_id) return bad('Missing landlord')
  const w = await who(req, String(b.landlord_id)); if (!w?.staff) return bad('Not found', 404)
  const u: any = {}
  if ('manager_id' in b) {
    if (b.manager_id) { const { data: m } = await db.from('team_members').select('id').eq('id', b.manager_id).eq('user_id', w.businessId).maybeSingle(); if (!m) return bad('Choose someone from your team'); u.manager_id = m.id } else u.manager_id = null
  }
  if ('agreement_type' in b) { if (b.agreement_type && !AGREEMENT_TYPES[b.agreement_type]) return bad('Choose an agreement type'); u.agreement_type = b.agreement_type || null }
  for (const k of ['agreement_start', 'agreement_end']) if (k in b) { if (b[k] && !ISO.test(String(b[k]))) return bad('Enter a valid date'); u[k] = b[k] || null }
  if ('agreement_terms' in b) u.agreement_terms = String(b.agreement_terms || '').slice(0, 2000) || null
  if ('onboarded' in b) u.onboarded_at = b.onboarded ? new Date().toISOString() : null
  if (!Object.keys(u).length) return bad('Nothing to change')
  const { error } = await db.from('pm_landlords').update(u).eq('id', w.l.id)
  return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
}
