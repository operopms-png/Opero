import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { DOC_SETS, isSubject, LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'

// After a recipient submits a form on their link, they upload their ID and other documents here.
//   POST multipart { t, email, category, file }   -> { ok }
// The file is filed on the same landlord or co-host record as their submission, awaiting review in Documents.
// Only someone who has already submitted a form on this link with that email can upload.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' }
const MAX = 15 * 1024 * 1024

export async function POST(req: NextRequest) {
  const f = await req.formData().catch(() => null)
  if (!f) return bad('Could not read the upload.')
  const t = String(f.get('t') || ''), email = String(f.get('email') || '').trim().toLowerCase(), cat = String(f.get('category') || ''), file = f.get('file')
  if (!/^[0-9a-f]{16,64}$/.test(t)) return bad('This link is no longer available.', 404)
  const { data: l } = await db.from('service_links').select('id,business_id,active').eq('token', t).eq('active', true).maybeSingle()
  if (!l) return bad('This link is no longer available.', 404)
  if (!(file instanceof File) || !file.size) return bad('Choose a file first.')
  const ext = TYPES[file.type]
  if (!ext) return bad('Upload a PDF or a photo (JPG, PNG, WEBP or HEIC).')
  if (file.size > MAX) return bad('That file is over 15 MB. Choose a smaller one.')
  const { data: sub } = await db.from('service_submissions').select('lease_doc_id').eq('link_id', l.id).ilike('submitter_email', email).not('lease_doc_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!sub?.lease_doc_id) return bad('Submit your form first, then upload your documents.')
  const { data: base } = await db.from('lease_documents').select('subject,head_lease_id').eq('id', sub.lease_doc_id).maybeSingle()
  if (!base || !isSubject(base.subject)) return bad('Could not find your record.', 500)
  const type = DOC_SETS[base.subject as keyof typeof DOC_SETS].find(x => x.key === cat && !x.byUs)
  if (!type) return bad('Choose which document this is.')
  const path = `${l.business_id}/${base.subject}/${base.head_lease_id}/${randomUUID()}.${ext}`
  const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (up.error) return bad('Upload failed. Please try again.', 500)
  const { error } = await db.from('lease_documents').insert({ user_id: l.business_id, subject: base.subject, head_lease_id: base.head_lease_id, category: cat, name: String(file.name || type.label).slice(0, 120), path, mime: file.type, size: file.size, uploaded_by: email, uploaded_by_portal: true, status: 'pending', visible_to_portal: true })
  if (error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]).catch(() => null); return bad('Could not save the file.', 500) }
  await db.from('notifications').insert({ user_id: l.business_id, title: `Document to review: ${type.label}`, message: `${email} uploaded ${type.label} from their link. Approve or reject it in Documents.`, type: 'document', module: 'staffcentre', link: '/staff-centre/documents' }).then(() => {}, () => {})
  return NextResponse.json({ ok: true })
}
