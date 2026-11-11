export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { resolveLink } from '@/lib/client-link'
import { packFor, sendPack, TENANT_KINDS, PACK } from '@/lib/tenancy-pack'

// GET  (tenant: sign-in or secure link header x-client-link; staff preview: ?kind=pm_tenant|ea_tenant&id=…) → { items }
// GET  ?overview=1  (staff) → { items: pack contents, tenants: each tenant with how much of the pack is signed }
// POST {kind, id}   (staff) → sends every pack document the tenant has not been given yet
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TABLE: Record<string, string> = { pm_tenant: 'pm_tenants', ea_tenant: 'estate_tenants' }

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  if (sp.get('overview')) {
    const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
    const [pm, ea, sends] = await Promise.all([
      db.from('pm_tenants').select('id,name,email,created_at').eq('user_id', c.businessId).order('created_at', { ascending: false }).limit(100),
      db.from('estate_tenants').select('id,name,email,created_at').eq('user_id', c.businessId).order('created_at', { ascending: false }).limit(100),
      db.from('doc_sends').select('person_kind,person_id,status,template_id').eq('business_id', c.businessId).in('person_kind', TENANT_KINDS).neq('status', 'void'),
    ])
    const per = (kind: string, rows: any[]) => rows.map(t => { const mine = (sends.data ?? []).filter((s: any) => s.person_kind === kind && s.person_id === t.id); return { kind, id: t.id, name: t.name, email: t.email, sent: mine.length, signed: mine.filter((s: any) => s.status === 'signed').length } })
    return NextResponse.json({ items: PACK.map(p => ({ key: p.key, title: p.title, type: p.kind })), tenants: [...per('pm_tenant', pm.data ?? []), ...per('ea_tenant', ea.data ?? [])] })
  }
  const lk = req.headers.get('x-client-link')
  if (lk) {
    const r = await resolveLink(lk); if (!r || !['tenant', 'ea_tenant'].includes(r.subject)) return bad('This link has expired.', 401)
    return NextResponse.json({ items: await packFor(r.link.business_id, r.subject === 'tenant' ? 'pm_tenant' : 'ea_tenant', r.rec.id) })
  }
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', ''); if (!token) return bad('Not signed in', 401)
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await asUser.auth.getUser(token); if (!user) return bad('Not signed in', 401)
  for (const kind of TENANT_KINDS) {
    const { data: own } = await db.from(TABLE[kind]).select('id,user_id').eq('portal_user_id', user.id).maybeSingle()
    if (own) return NextResponse.json({ items: await packFor(own.user_id, kind, own.id) })
  }
  const kind = sp.get('kind') || '', id = sp.get('id') || ''
  const c = TENANT_KINDS.includes(kind) && id ? await getCaller(req) : null
  if (c) { const { data } = await db.from(TABLE[kind]).select('id').eq('id', id).eq('user_id', c.businessId).maybeSingle(); if (data) return NextResponse.json({ items: await packFor(c.businessId, kind, id), preview: true }) }
  return bad('Not found', 404)
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  if (!TENANT_KINDS.includes(b.kind) || !/^[0-9a-f-]{36}$/.test(b.id || '')) return bad('Choose a tenant.')
  const { data } = await db.from(TABLE[b.kind]).select('id,email').eq('id', b.id).eq('user_id', c.businessId).maybeSingle(); if (!data) return bad('Tenant not found.', 404)
  try { const made = await sendPack(c.businessId, b.kind, b.id, { name: c.name, email: c.email }); return NextResponse.json({ ok: true, made }) }
  catch (e: any) { return bad(e?.message || 'Could not send the pack.', 500) }
}
