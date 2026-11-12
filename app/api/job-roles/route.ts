export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Staff manage the open roles shown on the careers page.
// GET → { roles }   POST { id?, title, category, location, job_type, description, active }   DELETE ?id=
const clean = (v: any, n: number) => String(v ?? '').trim().slice(0, n)
export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data } = await db.from('job_roles').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false })
  return NextResponse.json({ roles: data ?? [] })
}
export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const row = { title: clean(b.title, 120), category: clean(b.category, 60), location: clean(b.location, 120), job_type: clean(b.job_type, 40), description: clean(b.description, 3000), active: b.active !== false }
  if (!row.title) return NextResponse.json({ error: 'Please add a job title.' }, { status: 400 })
  const q = b.id ? db.from('job_roles').update(row).eq('id', b.id).eq('business_id', c.businessId) : db.from('job_roles').insert({ ...row, business_id: c.businessId })
  const { error } = await q
  if (error) return NextResponse.json({ error: 'Could not save the role.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
export async function DELETE(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id') || ''
  await db.from('job_roles').delete().eq('id', id).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
