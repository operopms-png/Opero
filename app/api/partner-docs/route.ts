export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { PARTNER_DOC_TYPES } from '@/lib/partner-docs'

// Signed agreements and files for a partner (owner_profiles), kept in the same private bucket as lease documents.
//   GET ?owner_id=…     partner sees their own (visible ones and their own uploads); staff pass owner_id and see everything
//   POST multipart {category, file, owner_id?}   staff upload for a partner (approved, visible); a partner's own upload waits for review
//   PATCH {id, visible?, status?}                staff: show or hide a file, approve or reject a partner's upload
//   DELETE ?id=…                                 staff any file; a partner only their own file still awaiting review
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }
const MAX = 15 * 1024 * 1024
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

async function who(req: NextRequest, ownerId: string) {
  if (ownerId) {
    const c = await getCaller(req); if (!c) return null
    const { data } = await db.from('owner_profiles').select('id, name, email, business_id').eq('id', ownerId).eq('business_id', c.businessId).maybeSingle()
    return data ? { owner: data, staff: true, email: c.email } : null
  }
  const uid = await requireUser(req); if (!uid) return null
  const { data } = await db.from('owner_profiles').select('id, name, email, business_id').eq('user_id', uid).maybeSingle()
  return data ? { owner: data, staff: false, email: data.email || data.name } : null
}

export async function GET(req: NextRequest) {
  const w = await who(req, req.nextUrl.searchParams.get('owner_id') || ''); if (!w) return bad('Not found', 404)
  const { data } = await db.from('lease_documents').select('*').eq('subject', 'partner').eq('head_lease_id', w.owner.id).eq('user_id', w.owner.business_id).order('created_at', { ascending: false })
  const shown = (data ?? []).filter((f: any) => w.staff || (f.visible_to_portal !== false && f.status === 'approved') || f.uploaded_by_portal)
  const files = await Promise.all(shown.map(async (f: any) => {
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 300)
    return { id: f.id, category: f.category, label: PARTNER_DOC_TYPES[f.category] ?? f.category, name: f.name, created_at: f.created_at, status: f.status ?? 'approved', visible: f.visible_to_portal !== false, mine: !!f.uploaded_by_portal, reason: f.reject_reason, url: s?.signedUrl ?? null }
  }))
  return NextResponse.json({ files, staff: w.staff, types: PARTNER_DOC_TYPES })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null); if (!form) return bad('Upload failed.')
  const w = await who(req, String(form.get('owner_id') || '')); if (!w) return bad('Not found', 404)
  const cat = String(form.get('category') || ''); if (!PARTNER_DOC_TYPES[cat]) return bad('Choose a document type.')
  const file = form.get('file'); if (!(file instanceof File)) return bad('Choose a file first.')
  const ext = TYPES[file.type]; if (!ext) return bad('Upload a PDF, Word file or a photo (JPG, PNG, HEIC).')
  if (file.size > MAX) return bad('That file is too large. The limit is 15 MB.')
  if (!w.staff) {
    const { count } = await db.from('lease_documents').select('id', { count: 'exact', head: true }).eq('subject', 'partner').eq('head_lease_id', w.owner.id).eq('uploaded_by_portal', true)
    if ((count ?? 0) >= 20) return bad('That is enough files. Ask us to remove some.')
  }
  const path = `${w.owner.business_id}/partner/${w.owner.id}/${randomUUID()}.${ext}`
  const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (up.error) return bad('Upload failed. Please try again.', 500)
  const { error } = await db.from('lease_documents').insert({ user_id: w.owner.business_id, subject: 'partner', head_lease_id: w.owner.id, category: cat, name: String(file.name || 'Document').slice(0, 120), path, mime: file.type, size: file.size, uploaded_by: w.email, uploaded_by_portal: !w.staff, status: w.staff ? 'approved' : 'pending', visible_to_portal: true })
  if (error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]).catch(() => null); return bad('Could not save the file.', 500) }
  if (!w.staff) await db.from('notifications').insert({ user_id: w.owner.business_id, title: `Document to review: ${PARTNER_DOC_TYPES[cat]}`, message: `${w.owner.name} (Partner) uploaded a document. Approve or reject it in their Documents.`, type: 'document', module: 'staffcentre', link: '/staff-centre/partners?tab=Investors' }).then(() => {}, () => {})
  return NextResponse.json({ ok: true })
}

async function fileFor(req: NextRequest, id: string) {
  const { data: f } = await db.from('lease_documents').select('id, path, head_lease_id, uploaded_by_portal, status').eq('id', id).eq('subject', 'partner').maybeSingle()
  if (!f) return null
  const w = await who(req, f.head_lease_id) ?? await who(req, '')
  return w && w.owner.id === f.head_lease_id ? { f, w } : null
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null); if (!b?.id) return bad('Missing file')
  const r = await fileFor(req, b.id); if (!r || !r.w.staff) return bad('Not found', 404)
  const u: any = {}
  if (typeof b.visible === 'boolean') u.visible_to_portal = b.visible
  if (b.status === 'approved' || b.status === 'rejected') { u.status = b.status; u.reviewed_by = r.w.email; u.reviewed_at = new Date().toISOString(); u.reject_reason = b.status === 'rejected' ? String(b.reason || '').slice(0, 300) || null : null }
  await db.from('lease_documents').update(u).eq('id', b.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || ''
  const r = await fileFor(req, id); if (!r) return bad('Not found', 404)
  if (!r.w.staff && !(r.f.uploaded_by_portal && r.f.status === 'pending')) return bad('You can only remove a file that is still waiting for review.', 403)
  await db.storage.from(LEASE_DOC_BUCKET).remove([r.f.path]).catch(() => null)
  await db.from('lease_documents').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
