export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { ID_BUCKET } from '@/lib/guest-checkin'

// Guest ID photos: POST multipart {token, file} adds one, DELETE ?token=&path= removes one of the guest's own.
// Stored in the private 'guest-ids' bucket. Only admins and the property team can ever open them (Guest Check-ins tab).
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TOKEN_RE = /^[0-9a-f]{20,64}$/
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' }
const MAX_BYTES = 8 * 1024 * 1024, MAX_FILES = 6

async function rowFor(token: string) {
  if (!TOKEN_RE.test(token || '')) return null
  const { data } = await db.from('guest_checkins').select('id, user_id, status, id_files').eq('token', token).maybeSingle()
  return data
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return bad('Upload failed.')
  const row = await rowFor(String(form.get('token') || ''))
  if (!row) return bad('This check-in link is not valid.', 404)
  if (row.status === 'complete') return bad('This check-in is already complete.')
  const file = form.get('file')
  if (!(file instanceof File)) return bad('Choose a photo first.')
  const ext = TYPES[file.type]
  if (!ext) return bad('Please upload a photo (JPG, PNG, HEIC) or a PDF.')
  if (file.size > MAX_BYTES) return bad('That file is too large. The limit is 8 MB.')
  const files: any[] = row.id_files ?? []
  if (files.length >= MAX_FILES) return bad(`You can upload up to ${MAX_FILES} files.`)
  const path = `${row.user_id}/${row.id}/${randomUUID()}.${ext}`
  const { error } = await db.storage.from(ID_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (error) return bad('Upload failed. Please try again.', 500)
  const next = [...files, { path, name: String(file.name || 'ID').slice(0, 80), size: file.size, uploaded_at: new Date().toISOString() }]
  await db.from('guest_checkins').update({ id_files: next }).eq('id', row.id)
  return NextResponse.json({ ok: true, ids: next.map(f => ({ path: f.path, name: f.name })) })
}

export async function DELETE(req: NextRequest) {
  const row = await rowFor(req.nextUrl.searchParams.get('token') || '')
  if (!row) return bad('This check-in link is not valid.', 404)
  if (row.status === 'complete') return bad('This check-in is already complete.')
  const path = req.nextUrl.searchParams.get('path') || ''
  const files: any[] = row.id_files ?? []
  if (!files.some(f => f.path === path)) return bad('File not found.', 404)
  await db.storage.from(ID_BUCKET).remove([path]).catch(() => null)
  const next = files.filter(f => f.path !== path)
  await db.from('guest_checkins').update({ id_files: next }).eq('id', row.id)
  return NextResponse.json({ ok: true, ids: next.map(f => ({ path: f.path, name: f.name })) })
}
