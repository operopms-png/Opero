import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner } from '@/lib/platform-owner-auth'

// Platform Owner → Notes: the owner's private notes (platform_notes). Owner login only; each note
// belongs to the signed-in owner's email.  GET list · POST {body?} create · PATCH {id, body?, pinned?} · DELETE ?id=
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const { data, error } = await db.from('platform_notes').select('*').eq('owner_email', o.email).order('updated_at', { ascending: false }).limit(2000)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const o = await requireOwner(req); if (!o) return bad('Not authorized', 403)
  const b = await req.json().catch(() => ({}))
  const { data, error } = await db.from('platform_notes').insert({ owner_email: o.email, body: String(b.body ?? '').slice(0, 100000) }).select('*').single()
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
