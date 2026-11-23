export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { emailNotice } from '@/lib/building-notices'

// Staff Centre -> Maintenance Board -> Building notices.
//   GET                       notices + the homes that can be chosen
//   POST {title, body, building_name?, property_ids[], for_tenants, for_landlords, for_partners, send_email}
//   PATCH {id, archived}      hide / show again
//   DELETE ?id=…
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const staffOk = (c: any) => c.isAdmin || /co founder|property management|vacation rental|development|upkeep/i.test(c.role || '')

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const [n, p] = await Promise.all([
    db.from('building_notices').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(100),
    db.from('pm_properties').select('id, name').eq('user_id', c.businessId).is('ended_at', null).order('name'),
  ])
  return NextResponse.json({ notices: n.data ?? [], properties: p.data ?? [], canPost: staffOk(c) })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  if (!staffOk(c)) return bad('Only staff can post notices.', 403)
  const b = await req.json().catch(() => null); if (!b) return bad('Missing details')
  const title = String(b.title || '').trim().slice(0, 140), body = String(b.body || '').trim().slice(0, 4000)
  if (!title || !body) return bad('Add a heading and the notice text.')
  const wanted: string[] = Array.isArray(b.property_ids) ? b.property_ids.filter((x: any) => typeof x === 'string') : []
  if (!wanted.length) return bad('Choose at least one home.')
  const { data: ok } = await db.from('pm_properties').select('id').in('id', wanted).eq('user_id', c.businessId)
  const ids = (ok ?? []).map((x: any) => x.id)
  if (!ids.length) return bad('Those homes were not found.')
  const row = {
    business_id: c.businessId, title, body, building_name: String(b.building_name || '').trim().slice(0, 120) || null, property_ids: ids,
    for_tenants: b.for_tenants !== false, for_landlords: b.for_landlords !== false, for_partners: b.for_partners !== false, created_by_name: c.name,
  }
  if (!row.for_tenants && !row.for_landlords && !row.for_partners) return bad('Choose who should see it.')
  const { data, error } = await db.from('building_notices').insert(row).select('*').single()
  if (error) return bad(error.message, 500)
  const emailed = b.send_email !== false ? await emailNotice(data).catch(() => 0) : 0
  return NextResponse.json({ notice: data, emailed })
}

export async function PATCH(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  if (!staffOk(c)) return bad('Only staff can change notices.', 403)
  const b = await req.json().catch(() => null); if (!b?.id) return bad('Missing id')
  await db.from('building_notices').update({ archived: !!b.archived }).eq('id', b.id).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  if (!staffOk(c)) return bad('Only staff can delete notices.', 403)
  await db.from('building_notices').delete().eq('id', req.nextUrl.searchParams.get('id') || '').eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
