export const dynamic = 'force-dynamic'
import { readTenantCheckDoc } from '@/lib/tenant-check-read'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DOC_SETS, DOC_SUBJECT_TABLE, LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { resolveLink } from '@/lib/client-link'
import { PORTAL_SUBJECTS, WHO, type PortalSubject } from '@/lib/doc-hub'

// What an owner or tenant sees and does in their portal Documents tab.
//   GET ?kind=landlord|tenant|ea_landlord|ea_tenant[&id=…]   → the checklist with a state for each document, files, what is missing
//   POST multipart {kind, category, expires_on?, file}        → upload a document (goes to the team for review)
//   DELETE ?kind=&id=…                                        → remove a file of theirs that is still awaiting review
// The portal user gets their own record; staff previewing a portal pass id and must belong to the same company (view only).
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }
const MAX = 15 * 1024 * 1024

async function who(req: NextRequest, kind: PortalSubject, id: string) {
  const lk = req.headers.get('x-client-link')
  if (lk) { const r = await resolveLink(lk); if (!r || r.subject !== kind) return { err: bad('This link has expired. Ask us for a new one.', 401) }; return { rec: r.rec, self: true } }
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return { err: bad('Not signed in', 401) }
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await asUser.auth.getUser(token)
  if (!user) return { err: bad('Not signed in', 401) }
  const table = DOC_SUBJECT_TABLE[kind]
  const { data: own } = await db.from(table).select('id, user_id, name, email').eq('portal_user_id', user.id).maybeSingle()
  if (own) return { rec: own, self: true }
  const c = id ? await getCaller(req) : null
  if (c && id) { const { data } = await db.from(table).select('id, user_id, name, email').eq('id', id).eq('user_id', c.businessId).maybeSingle(); if (data) return { rec: data, self: false } }
  return { err: bad('Not found.', 404) }
}
const kindOf = (v: any) => { const k = String(v || ''); return (PORTAL_SUBJECTS as string[]).includes(k) ? k as PortalSubject : null }

export async function GET(req: NextRequest) {
  const kind = kindOf(req.nextUrl.searchParams.get('kind')); if (!kind) return bad('Unknown type.')
  const w = await who(req, kind, req.nextUrl.searchParams.get('id') || ''); if (w.err) return w.err
  const rec = w.rec!
  const { data } = await db.from('lease_documents').select('*').eq('subject', kind).eq('head_lease_id', rec.id).eq('user_id', rec.user_id).order('created_at', { ascending: false })
  const all = data ?? []
  const shown = all.filter((f: any) => f.visible_to_portal !== false || f.uploaded_by_portal)
  const files = await Promise.all(shown.map(async (f: any) => {
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 300)
    return { id: f.id, category: f.category, name: f.name, expires_on: f.expires_on, created_at: f.created_at, status: f.status ?? 'approved', reason: f.reject_reason, mine: !!f.uploaded_by_portal, url: s?.signedUrl ?? null }
  }))
  const items = DOC_SETS[kind].map(t => {
    const mine = files.filter(f => f.category === t.key)
    const state = t.byUs && !(mine.some(f => f.status === 'approved') || all.some((f: any) => f.category === t.key && f.status !== 'rejected')) ? 'byus' : t.optional ? (mine.length ? 'approved' : 'optional') : mine.some(f => f.status === 'approved') || all.some((f: any) => f.category === t.key && f.visible_to_portal === false && f.status !== 'rejected') ? 'approved' : mine.some(f => f.status === 'pending') ? 'pending' : mine.some(f => f.status === 'rejected') ? 'rejected' : 'todo'
    return { key: t.key, label: t.label, hint: t.hint, expiry: !!t.expiry, optional: !!t.optional, state, reason: mine.find(f => f.status === 'rejected')?.reason ?? null }
  })
  return NextResponse.json({ files, items, canUpload: !!w.self })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null); if (!form) return bad('Upload failed.')
  const kind = kindOf(form.get('kind')); if (!kind) return bad('Unknown type.')
  const w = await who(req, kind, ''); if (w.err) return w.err
  const rec = w.rec!
  const cat = String(form.get('category') || '')
  const type = DOC_SETS[kind].find(t => t.key === cat); if (!type) return bad('Choose a document type.')
  if (type.byUs) return bad('We add this document for you, so there is nothing to upload.')
  const file = form.get('file'); if (!(file instanceof File)) return bad('Choose a file first.')
  const ext = TYPES[file.type]; if (!ext) return bad('Upload a PDF, Word file or a photo (JPG, PNG, HEIC).')
  if (file.size > MAX) return bad('That file is too large. The limit is 15 MB.')
  const { count } = await db.from('lease_documents').select('id', { count: 'exact', head: true }).eq('subject', kind).eq('head_lease_id', rec.id).eq('category', cat).eq('uploaded_by_portal', true)
  if ((count ?? 0) >= 6) return bad('That is enough files for this one. Ask your property manager to remove some.')
  const exp = String(form.get('expires_on') || ''); const expires_on = type.expiry && /^\d{4}-\d{2}-\d{2}$/.test(exp) ? exp : null
  const bytes = Buffer.from(await file.arrayBuffer())
  const path = `${rec.user_id}/${kind}/${rec.id}/${randomUUID()}.${ext}`
  const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false })
  if (up.error) return bad('Upload failed. Please try again.', 500)
  const { data: ins, error } = await db.from('lease_documents').insert({ user_id: rec.user_id, subject: kind, head_lease_id: rec.id, category: cat, name: String(file.name || 'Document').slice(0, 120), path, mime: file.type, size: file.size, expires_on, uploaded_by: rec.email || rec.name, uploaded_by_portal: true, status: 'pending', visible_to_portal: true }).select('id').single()
  if (error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]).catch(() => null); return bad('Could not save the file.', 500) }
  await db.from('notifications').insert({ user_id: rec.user_id, title: `Document to review: ${type.label}`, message: `${rec.name} (${WHO[kind]}) uploaded ${type.label}. Approve or reject it in Documents.`, type: 'document', module: 'staffcentre', link: '/staff-centre/documents' }).then(() => {}, () => {})
  if (kind === 'tenant') await Promise.race([readTenantCheckDoc({ businessId: rec.user_id, tenantId: rec.id, leaseDocId: ins?.id, category: cat, fileName: String(file.name || 'Document'), mime: file.type, bytes }), new Promise(r => setTimeout(r, 18000))])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const kind = kindOf(req.nextUrl.searchParams.get('kind')); if (!kind) return bad('Unknown type.')
  const w = await who(req, kind, ''); if (w.err) return w.err
  const id = req.nextUrl.searchParams.get('id') || ''
  const { data: f } = await db.from('lease_documents').select('id, path').eq('id', id).eq('subject', kind).eq('head_lease_id', w.rec!.id).eq('uploaded_by_portal', true).eq('status', 'pending').maybeSingle()
  if (!f) return bad('You can only remove a file that is still waiting for review.', 404)
  await db.storage.from(LEASE_DOC_BUCKET).remove([f.path]).catch(() => null)
  await db.from('lease_documents').delete().eq('id', f.id)
  return NextResponse.json({ ok: true })
}
