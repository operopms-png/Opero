export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { loadUtilities } from '@/lib/utilities-data'

// Utility bills per property (electricity, internet and the rest). Staff only; private bill files; scoped to the caller's company.
//   GET                                   → { properties: [{id,name,currency,accounts:[{…, bills:[…]}]}] }
//   POST multipart {utility_id, period_end, amount, usage?, usage_unit?, due_date?, paid?, file?}   → adds a bill
//   PATCH {bill_id, paid}  |  {utility_id, visible_to_owner?, visible_to_tenant?}
//   DELETE ?bill_id=…
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental|estate/i.test(c.role || '')
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' }
const MAX = 15 * 1024 * 1024
const isDate = (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))

async function guard(req: NextRequest) {
  const c = await getCaller(req); if (!c) return { err: bad('Not signed in', 401) }; if (!allowed(c)) return { err: bad('Not allowed.', 403) }
  return { c }
}

export async function GET(req: NextRequest) {
  const g = await guard(req); if (g.err) return g.err
  return NextResponse.json({ properties: await loadUtilities(g.c!.businessId, { inbox: true }) })
}

export async function POST(req: NextRequest) {
  const g = await guard(req); if (g.err) return g.err; const c = g.c!
  const f = await req.formData().catch(() => null); if (!f) return bad('Nothing received.')
  const { data: acct } = await db.from('pm_utilities').select('id, property_id').eq('id', String(f.get('utility_id') || '')).eq('user_id', c.businessId).maybeSingle()
  if (!acct) return bad('Bill account not found.', 404)
  const amount = Number(f.get('amount')); if (!(amount >= 0) || String(f.get('amount') || '') === '') return bad('Enter the bill amount.')
  const period_end = String(f.get('period_end') || ''); if (!isDate(period_end)) return bad('Enter the bill date.')
  const due = String(f.get('due_date') || ''), usageRaw = String(f.get('usage') || '').trim()
  if (due && !isDate(due)) return bad('That due date does not look right.')
  const usage = usageRaw === '' ? null : Number(usageRaw); if (usage != null && !(usage >= 0)) return bad('Usage must be a number.')
  let bill_path: string | null = null, bill_name: string | null = null
  const file = f.get('file')
  if (file && typeof file !== 'string' && file.size > 0) {
    const ext = TYPES[file.type]; if (!ext) return bad('Upload a PDF or a photo (JPG, PNG, WEBP or HEIC).')
    if (file.size > MAX) return bad('That file is over 15 MB.')
    bill_path = `${c.businessId}/utility/${acct.id}/${randomUUID()}.${ext}`; bill_name = String(file.name || 'Bill').slice(0, 120)
    const up = await db.storage.from(LEASE_DOC_BUCKET).upload(bill_path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (up.error) return bad('Could not save the file.', 500)
  }
  const { error } = await db.from('pm_utility_bills').insert({ user_id: c.businessId, utility_id: acct.id, property_id: acct.property_id, period_end, amount, usage, usage_unit: String(f.get('usage_unit') || '').slice(0, 12) || null, due_date: due || null, paid: f.get('paid') === 'true', bill_path, bill_name })
  if (error) { if (bill_path) await db.storage.from(LEASE_DOC_BUCKET).remove([bill_path]); return bad('Could not save the bill.', 500) }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const g = await guard(req); if (g.err) return g.err; const c = g.c!
  const b = await req.json().catch(() => ({}))
  if (b.bill_id) {
    const { error } = await db.from('pm_utility_bills').update({ paid: !!b.paid }).eq('id', String(b.bill_id)).eq('user_id', c.businessId)
    return error ? bad('Could not update.', 500) : NextResponse.json({ ok: true })
  }
  if (b.utility_id) {
    const patch: any = {}
    if (typeof b.visible_to_owner === 'boolean') patch.visible_to_owner = b.visible_to_owner
    if (typeof b.visible_to_tenant === 'boolean') patch.visible_to_tenant = b.visible_to_tenant
    if (!Object.keys(patch).length) return bad('Nothing to change.')
    const { error } = await db.from('pm_utilities').update(patch).eq('id', String(b.utility_id)).eq('user_id', c.businessId)
    return error ? bad('Could not update.', 500) : NextResponse.json({ ok: true })
  }
  return bad('Nothing to change.')
}

export async function DELETE(req: NextRequest) {
  const g = await guard(req); if (g.err) return g.err; const c = g.c!
  const id = req.nextUrl.searchParams.get('bill_id') || ''
  const { data: b } = await db.from('pm_utility_bills').select('id, bill_path').eq('id', id).eq('user_id', c.businessId).maybeSingle()
  if (!b) return bad('Not found.', 404)
  await db.from('pm_utility_bills').delete().eq('id', b.id)
  if (b.bill_path) await db.storage.from(LEASE_DOC_BUCKET).remove([b.bill_path])
  return NextResponse.json({ ok: true })
}
