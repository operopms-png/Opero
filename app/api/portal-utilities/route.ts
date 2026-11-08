export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { resolveLink } from '@/lib/client-link'
import { loadUtilities } from '@/lib/utilities-data'

// What an owner or tenant sees of their property's utilities (read only), in the portal or through a secure link.
//   GET ?kind=landlord|tenant[&id=…]  → { properties: […] }   Owners see accounts marked visible to owner; tenants see accounts marked visible to tenant.
//   Staff previewing a portal pass id and must belong to the same company.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind'), id = req.nextUrl.searchParams.get('id') || ''
  if (kind !== 'landlord' && kind !== 'tenant') return bad('Unknown type.')
  const table = kind === 'landlord' ? 'pm_landlords' : 'pm_tenants'
  let rec: any = null
  const lk = req.headers.get('x-client-link')
  if (lk) { const r = await resolveLink(lk); if (!r || r.subject !== kind) return bad('This link has expired. Ask us for a new one.', 401); rec = { id: r.rec.id, user_id: r.rec.user_id } }
  else {
    const token = (req.headers.get('authorization') ?? '').replace('Bearer ', ''); if (!token) return bad('Not signed in', 401)
    const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await asUser.auth.getUser(token); if (!user) return bad('Not signed in', 401)
    const { data: own } = await db.from(table).select('id, user_id').eq('portal_user_id', user.id).maybeSingle()
    if (own) rec = own
    else if (id) { const c = await getCaller(req); if (c) { const { data } = await db.from(table).select('id, user_id').eq('id', id).eq('user_id', c.businessId).maybeSingle(); rec = data } }
  }
  if (!rec) return bad('Not found.', 404)
  let propertyIds: string[] = []
  if (kind === 'landlord') propertyIds = ((await db.from('pm_properties').select('id').eq('owner_id', rec.id).eq('user_id', rec.user_id).is('ended_at', null)).data ?? []).map((p: any) => p.id)
  else { const { data: t } = await db.from('pm_tenants').select('property_id').eq('id', rec.id).maybeSingle(); if (t?.property_id) propertyIds = [t.property_id] }
  return NextResponse.json({ properties: await loadUtilities(rec.user_id, { propertyIds, visible: kind === 'landlord' ? 'owner' : 'tenant' }) })
}
