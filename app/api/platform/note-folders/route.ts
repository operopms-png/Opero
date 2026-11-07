import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner } from '@/lib/platform-owner-auth'

// Platform Owner → Notes folders. Owner login only; folders belong to the signed-in owner's email.
// POST {name} create · PATCH {id, name} rename · DELETE ?id= (the notes inside are kept and become unfiled)
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const clean = (v: unknown) => String(v ?? '').trim().slice(0, 80)

export async function POST(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const name = clean((await req.json().catch(() => ({}))).name)
  if (!name) return bad('Give the folder a name.')
  const { data, error } = await db.from('platform_note_folders').insert({ owner_email: o.email, name }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ folder: data })
}

export async function PATCH(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const b = await req.json().catch(() => ({}))
  const name = clean(b.name)
  if (!b.id || !name) return bad('id and name are required')
  const { data, error } = await db.from('platform_note_folders').update({ name }).eq('id', b.id).eq('owner_email', o.email).select('*').maybeSingle()
  if (error) return bad(error.message, 500)
  if (!data) return bad('Folder not found', 404)
  return NextResponse.json({ folder: data })
}

export async function DELETE(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return bad('id is required')
  const { error } = await db.from('platform_note_folders').delete().eq('id', id).eq('owner_email', o.email)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
