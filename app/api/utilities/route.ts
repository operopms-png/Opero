export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { loadUtilities } from '@/lib/utilities-data'
import { limitSplit } from '@/lib/utility-limit'

// Utility bills per property (electricity, internet and the rest). Staff only; private bill files; scoped to the caller's company.
//   GET                                   → { properties: [{id,name,currency,accounts:[{…, bills:[…]}]}] }
//   POST multipart {utility_id, period_end, amount, usage?, usage_unit?, due_date?, paid?, file?}   → adds a bill
//   PATCH {bill_id, paid}  |  {utility_id, visible_to_owner?, visible_to_tenant?, covered_limit?}  |  {apply_limit_all}  |  {bill_id, invoice_tenant:true} (draft invoice for the part above the limit)
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

// Raises a DRAFT invoice to the tenant for the part of an electricity bill above the covered limit. Staff review and send it from Invoices.
async function invoiceTenant(c: any, billId: string) {
  const { data: bill } = await db.from('pm_utility_bills').select('id, utility_id, property_id, amount, period_end, due_date, tenant_invoice_id').eq('id', billId).eq('user_id', c.businessId).maybeSingle()
  if (!bill) return bad('Bill not found.', 404)
  if (bill.tenant_invoice_id) return bad('This bill has already been invoiced to the tenant.')
  const { data: acct } = await db.from('pm_utilities').select('service, supplier, covered_limit').eq('id', bill.utility_id).eq('user_id', c.businessId).maybeSingle()
  const { over } = limitSplit(Number(bill.amount), acct?.covered_limit) ?? { over: 0 }
  if (!(over > 0)) return bad('This bill is within the covered limit. Nothing to invoice.')
  const [{ data: prop }, { data: tenants }] = await Promise.all([
    db.from('pm_properties').select('name, currency').eq('id', bill.property_id).maybeSingle(),
    db.from('pm_tenants').select('id, name, email, phone').eq('user_id', c.businessId).eq('property_id', bill.property_id).order('created_at', { ascending: false }).limit(1),
  ])
  const t = tenants?.[0]; if (!t) return bad('No tenant is linked to this property yet.')
  const cur = ['GBP', 'JMD', 'USD'].includes(prop?.currency) ? prop!.currency : 'JMD'
  const { data: num, error: nErr } = await db.rpc('next_invoice_number', { biz: c.businessId })
  if (nErr) return bad('Could not number the invoice.', 500)
  const sym = cur === 'JMD' ? 'J$' : cur === 'USD' ? 'US$' : '£', fmt = (n: number) => sym + Math.round(n).toLocaleString('en-GB')
  const desc = `${acct?.supplier || 'Electricity'} bill ${bill.period_end}: ${fmt(Number(bill.amount))}, less ${fmt(Number(acct!.covered_limit))} covered. Your share above the limit`
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
  const { data: inv, error } = await db.from('invoices').insert({
    business_id: c.businessId, created_by: c.name || c.email, number: num, status: 'draft', bill_to_name: t.name, bill_to_email: t.email || null, bill_to_phone: t.phone || null,
    bill_to_address: prop?.name || null, person_kind: 'pm_tenant', person_id: t.id, module: 'pm', issue_date: today, due_date: bill.due_date || null, currency: cur,
    items: [{ description: desc, qty: 1, amount: over }], total: over, note: 'Electricity above the covered monthly limit.', updated_at: new Date().toISOString(),
  }).select('id, number').single()
  if (error || !inv) return bad('Could not create the invoice.', 500)
  await db.from('pm_utility_bills').update({ tenant_invoice_id: inv.id }).eq('id', bill.id)
  return NextResponse.json({ ok: true, invoice: inv.number, tenant: t.name, amount: over })
}

export async function PATCH(req: NextRequest) {
  const g = await guard(req); if (g.err) return g.err; const c = g.c!
  const b = await req.json().catch(() => ({}))
  if (b.bill_id && !b.invoice_tenant) {
    const { error } = await db.from('pm_utility_bills').update({ paid: !!b.paid }).eq('id', String(b.bill_id)).eq('user_id', c.businessId)
    return error ? bad('Could not update.', 500) : NextResponse.json({ ok: true })
  }
  if (b.apply_limit_all !== undefined) {
    const lim = b.apply_limit_all === null ? null : Number(b.apply_limit_all); if (lim != null && !(lim >= 0)) return bad('Enter the limit as a number.')
    const { error } = await db.from('pm_utilities').update({ covered_limit: lim }).eq('user_id', c.businessId).ilike('service', 'electric%')
    return error ? bad('Could not update.', 500) : NextResponse.json({ ok: true })
  }
  if (b.bill_id && b.invoice_tenant) return invoiceTenant(c, String(b.bill_id))
  if (b.utility_id) {
    const patch: any = {}
    if (b.covered_limit !== undefined) { const lim = b.covered_limit === null || b.covered_limit === '' ? null : Number(b.covered_limit); if (lim != null && !(lim >= 0)) return bad('Enter the limit as a number.'); patch.covered_limit = lim }
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
