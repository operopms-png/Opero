import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as db } from '@/lib/admin-auth'
import { CLEAN_TABLES, MAINT_FOR, DEFAULT_CLEAN_CHECKLIST } from '@/lib/cleaning-checklist'

async function ownTask(table: string, id: string, businessId: string) {
  const m = MAINT_FOR[table]
  if (!m || !id) return null
  const { data: t } = await db.from(table).select('*').eq('id', id).maybeSingle()
  if (!t) return null
  const { data: p } = await db.from(m.props).select('id,name,user_id').eq('id', t.property_id).maybeSingle()
  if (!p || p.user_id !== businessId) return null
  return { task: t, property: p }
}

// GET ?table=&id= -> the checklist to show (saved on the task, else the business's own, else the default)
export async function GET(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const table = req.nextUrl.searchParams.get('table') || ''
  const id = req.nextUrl.searchParams.get('id') || ''
  const found = await ownTask(table, id, who.businessId)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let checklist = found.task.checklist
  if (!Array.isArray(checklist) || !checklist.length) {
    const { data: tpl } = await db.from('cleaning_checklists').select('items').eq('business_id', who.businessId).maybeSingle()
    const texts: string[] = Array.isArray(tpl?.items) && tpl!.items.length ? tpl!.items : DEFAULT_CLEAN_CHECKLIST
    checklist = texts.map(text => ({ text, done: false }))
  }
  return NextResponse.json({ task: { ...found.task, checklist }, property: found.property.name })
}

// PATCH { table, id, checklist?, before_media?, after_media?, notes?, complete? }
export async function PATCH(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const b = await req.json()
  const found = await ownTask(b.table, b.id, who.businessId)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const patch: any = {}
  if (Array.isArray(b.checklist)) patch.checklist = b.checklist.map((c: any) => ({ text: String(c.text).slice(0, 200), done: !!c.done }))
  if (typeof b.before_media === 'string') patch.before_media = b.before_media
  if (typeof b.after_media === 'string') patch.after_media = b.after_media
  if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 2000)
  if (b.start) patch.status = 'in_progress'
  if (b.complete) {
    const list = patch.checklist ?? found.task.checklist ?? []
    if (list.some((c: any) => !c.done)) return NextResponse.json({ error: 'Tick every checklist item first' }, { status: 400 })
    patch.status = 'completed'; patch.completed_at = new Date().toISOString(); patch.completed_by = who.email
  }
  const { error } = await db.from(b.table).update(patch).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST { table, id, title, description, priority, photos[] } -> a maintenance ticket the maintenance team picks up
export async function POST(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const b = await req.json()
  const found = await ownTask(b.table, b.id, who.businessId)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const title = String(b.title || '').trim().slice(0, 200)
  if (!title) return NextResponse.json({ error: 'Say what needs fixing' }, { status: 400 })
  const photos: string[] = (Array.isArray(b.photos) ? b.photos : []).filter((u: any) => typeof u === 'string' && u.startsWith('http')).slice(0, 8)
  const priority = ['low', 'medium', 'high', 'urgent'].includes(b.priority) ? b.priority : 'medium'
  const base: any = { property_id: found.task.property_id, title, description: String(b.description || '').slice(0, 2000) || null, priority, status: 'open', source: 'cleaner', reported_by: who.email }
  const m = MAINT_FOR[b.table]
  if (m.table === 'maintenance_tickets') Object.assign(base, { photos, attachment_url: photos[0] ?? null, cleaning_task_id: b.id, category: 'Reported by cleaner' })
  else Object.assign(base, { user_id: who.businessId, photos })
  const { error } = await db.from(m.table).insert(base)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
