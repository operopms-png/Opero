import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner } from '@/lib/platform-owner-auth'

// Platform Owner → Notes: the owner's private notes (platform_notes). Owner login only; each note
// belongs to the signed-in owner's email.  GET notes + folders · POST {body?, folder_id?} create · PATCH {id, body?, pinned?, folder_id?} · DELETE ?id=
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
// a folder id is only accepted if it is one of this owner's folders
async function ownFolder(email: string, id: unknown) {
  if (!id) return null
  const { data } = await db.from('platform_note_folders').select('id').eq('id', String(id)).eq('owner_email', email).maybeSingle()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const { data, error } = await db.from('platform_notes').select('*').eq('owner_email', o.email).order('updated_at', { ascending: false }).limit(2000)
  if (error) return bad(error.message, 500)
  const { data: folders } = await db.from('platform_note_folders').select('*').eq('owner_email', o.email).order('name')
  return NextResponse.json({ notes: data ?? [], folders: folders ?? [] })
}

export async function POST(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const b = await req.json().catch(() => ({}))
  const { data, error } = await db.from('platform_notes').insert({ owner_email: o.email, body: String(b.body ?? '').slice(0, 100000), folder_id: await ownFolder(o.email, b.folder_id) }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ note: data })
}

export async function PATCH(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return bad('id is required')
  const patch: Record<string, unknown> = {}
  if (typeof b.body === 'string') { patch.body = b.body.slice(0, 100000); patch.updated_at = new Date().toISOString() }
  if (typeof b.pinned === 'boolean') patch.pinned = b.pinned
  if ('folder_id' in b) patch.folder_id = await ownFolder(o.email, b.folder_id)
  const { data, error } = await db.from('platform_notes').update(patch).eq('id', b.id).eq('owner_email', o.email).select('*').maybeSingle()
  if (error) return bad(error.message, 500)
  if (!data) return bad('Note not found', 404)
  return NextResponse.json({ note: data })
}

export async function DELETE(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return bad('id is required')
  const { error } = await db.from('platform_notes').delete().eq('id', id).eq('owner_email', o.email)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
