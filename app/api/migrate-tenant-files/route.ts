export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'

// Moves a company's old public tenant files (pm_documents / estate_documents with a tenant) into the private tenant checklist.
// Admins and Co Founders only. Safe to run again: each file is removed from the old list only after the private copy is saved.
// POST {} → {moved, failed, left}   (up to 25 files per run; run again until left is 0)
const MAP: [RegExp, string][] = [
  [/tenancy|agreement|lease|contract/i, 'tenancy'], [/right to rent|immigration|visa|share code/i, 'right_to_rent'],
  [/proof of income|income|payslip|salary/i, 'income'], [/reference/i, 'references'], [/deposit/i, 'deposit'],
  [/inventory|check-in|check in|inspection/i, 'inventory'], [/notice|correspondence|letter/i, 'notice'], [/\bid\b|passport|licen[cs]e/i, 'tenant_id'],
]
const catOf = (v: string) => (MAP.find(([re]) => re.test(v || '')) || [null, 'other'])[1]
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!c.isAdmin && !/co founder/i.test(c.role || '')) return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
  let moved = 0, failed = 0, left = 0
  for (const [table, subject, tenants] of [['pm_documents', 'tenant', 'pm_tenants'], ['estate_documents', 'ea_tenant', 'estate_tenants']] as const) {
    const { data: rows } = await db.from(table).select('*').eq('user_id', c.businessId).not('tenant_id', 'is', null).order('created_at').limit(26)
    for (const [i, r] of (rows || []).entries()) {
      if (moved + failed >= 25) { left += (rows || []).length - i; break }
      try {
        const link = String(r.file_url || r.url || '')
        if (!/^https?:\/\//.test(link)) throw new Error('no file')
        const { data: own } = await db.from(tenants).select('id').eq('id', r.tenant_id).eq('user_id', c.businessId).maybeSingle()
        if (!own) throw new Error('tenant missing')
        const res = await fetch(link); if (!res.ok) throw new Error('download failed')
        const buf = Buffer.from(await res.arrayBuffer()); if (buf.length > 15 * 1024 * 1024) throw new Error('too big')
        const mime = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0]
        const ext = EXT[mime] || (link.split('?')[0].split('.').pop() || 'bin').slice(0, 5).toLowerCase()
        const path = `${c.businessId}/${subject}/${r.tenant_id}/${randomUUID()}.${ext}`
        const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, buf, { contentType: mime, upsert: false }); if (up.error) throw up.error
        const ins = await db.from('lease_documents').insert({ user_id: c.businessId, subject, head_lease_id: r.tenant_id, category: catOf(r.category || r.type || ''), name: String(r.name || 'Document').slice(0, 120), path, mime, size: buf.length, uploaded_by: 'moved from old files', visible_to_portal: r.visible_to_tenant !== false, status: 'approved', expires_on: r.expiry_date || null })
        if (ins.error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]); throw ins.error }
        const m = link.match(/\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/)
        if (m) await db.storage.from(m[1]).remove([decodeURIComponent(m[2])])
        await db.from(table).delete().eq('id', r.id); moved++
      } catch { failed++ }
    }
  }
  return NextResponse.json({ moved, failed, left })
}
