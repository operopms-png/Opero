export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { LEASE_DOC_KEYS, LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'

// Documents on a head lease (master lease, landlord ID, proof of ownership…). Private bucket, scoped to the caller's company.
// Admins, Co Founders and the property teams only. Files open through links that expire after 5 minutes.
//   GET ?head_lease_id=…            → files with signed links     GET ?counts=1 → {lease_id: number of categories filled}
//   POST multipart {head_lease_id, category, expires_on?, file}   DELETE ?id=…
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental|estate/i.test(c.role || '')
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }
const MAX = 15 * 1024 * 1024

async function ownLease(id: string, biz: string) {
  const { data } = await db.from('pm_head_leases').select('id').eq('id', id).eq('user_id', biz).maybeSingle()
  return !!data
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const sp = req.nextUrl.searchParams
  if (sp.get('counts')) {
    const { data } = await db.from('lease_documents').select('head_lease_id, category').eq('user_id', c.businessId)
    const m: Record<string, Set<string>> = {}
    for (const r of data ?? []) if (r.category !== 'other') (m[r.head_lease_id] ||= new Set()).add(r.category)
    return NextResponse.json({ counts: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size])) })
  }
  const lid = sp.get('head_lease_id') || ''
  if (!(await ownLease(lid, c.businessId))) return bad('Lease not found.', 404)
  const { data } = await db.from('lease_documents').select('*').eq('head_lease_id', lid).eq('user_id', c.businessId).order('created_at', { ascending: false })
  const files = await Promise.all((data ?? []).map(async (f: any) => {
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 300)
    return { id: f.id, category: f.category, name: f.name, size: f.size, expires_on: f.expires_on, created_at: f.created_at, url: s?.signedUrl ?? null }
  }))
  return NextResponse.json({ files })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const form = await req.formData().catch(() => null); if (!form) return bad('Upload failed.')
  const lid = String(form.get('head_lease_id') || ''), cat = String(form.get('category') || '')
  if (!LEASE_DOC_KEYS.includes(cat)) return bad('Choose a document type.')
  if (!(await ownLease(lid, c.businessId))) return bad('Lease not found.', 404)
  const file = form.get('file'); if (!(file instanceof File)) return bad('Choose a file first.')
  const ext = TYPES[file.type]; if (!ext) return bad('Upload a PDF, Word file or a photo (JPG, PNG, HEIC).')
  if (file.size > MAX) return bad('That file is too large. The limit is 15 MB.')
  const exp = String(form.get('expires_on') || ''); const expires_on = /^\d{4}-\d{2}-\d{2}$/.test(exp) ? exp : null
  const path = `${c.businessId}/${lid}/${randomUUID()}.${ext}`
  const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (up.error) return bad('Upload failed. Please try again.', 500)
  const { error } = await db.from('lease_documents').insert({ user_id: c.businessId, head_lease_id: lid, category: cat, name: String(file.name || 'Document').slice(0, 120), path, mime: file.type, size: file.size, expires_on, uploaded_by: c.email })
  if (error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]).catch(() => null); return bad('Could not save the file.', 500) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const id = req.nextUrl.searchParams.get('id') || ''
  const { data: f } = await db.from('lease_documents').select('id, path').eq('id', id).eq('user_id', c.businessId).maybeSingle()
  if (!f) return bad('File not found.', 404)
  await db.storage.from(LEASE_DOC_BUCKET).remove([f.path]).catch(() => null)
  await db.from('lease_documents').delete().eq('id', f.id)
  return NextResponse.json({ ok: true })
}
