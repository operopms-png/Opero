import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as db } from '@/lib/admin-auth'

const PROPS: Record<string, string> = { maintenance_tickets: 'properties', pm_maintenance: 'pm_properties', estate_maintenance: 'estate_properties' }

async function own(table: string, id: string, businessId: string) {
  const pt = PROPS[table]
  if (!pt || !id) return null
  const { data: t } = await db.from(table).select('*').eq('id', id).maybeSingle()
  if (!t) return null
  const { data: p } = await db.from(pt).select('id,name,user_id').eq('id', t.property_id).maybeSingle()
  return p && p.user_id === businessId ? { task: t, property: p.name as string } : null
}

export async function GET(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const f = await own(req.nextUrl.searchParams.get('table') || '', req.nextUrl.searchParams.get('id') || '', who.businessId)
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(f)
}

// PATCH { table, id, start?, before_media?, after_media?, resolution_notes?, cost?, solve? }
export async function PATCH(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const b = await req.json()
  const f = await own(b.table, b.id, who.businessId)
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const patch: any = {}
  if (typeof b.before_media === 'string') patch.before_media = b.before_media
  if (typeof b.after_media === 'string') patch.after_media = b.after_media
  if (typeof b.resolution_notes === 'string') patch.resolution_notes = b.resolution_notes.slice(0, 3000)
  if (b.cost !== undefined) { const c = Number(b.cost); if (b.cost === '' || b.cost === null) patch.cost = null; else if (Number.isFinite(c) && c >= 0) patch.cost = c }
  if (b.start && ['open', 'pending'].includes(f.task.status)) patch.status = 'in_progress'
  if (b.solve) {
    const notes = patch.resolution_notes ?? f.task.resolution_notes
    if (!notes || !String(notes).trim()) return NextResponse.json({ error: 'Say what was done first' }, { status: 400 })
    patch.status = 'resolved'; patch.resolved_at = new Date().toISOString(); patch.resolved_by = who.email
  }
  const { error } = await db.from(b.table).update(patch).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
