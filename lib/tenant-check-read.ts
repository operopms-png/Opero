import { serviceClient as db } from '@/lib/admin-auth'
import { callClaudeWithDocument } from '@/lib/claude'

// Reads a tenant's uploaded check document with AI and files what it saw for staff to review in
// Compliance → Tenant Checks. It only reads and pre-fills. Staff confirm Passed or Failed themselves.
export const READ_CATEGORIES = ['tenant_id', 'right_to_rent', 'income', 'bank_statement'] as const
const FIELDS: Record<string, string> = {
  tenant_id: '{"full_name":string|null,"date_of_birth":"YYYY-MM-DD"|null,"document_type":string|null,"expiry":"YYYY-MM-DD"|null,"address":string|null}',
  right_to_rent: '{"full_name":string|null,"date_of_birth":"YYYY-MM-DD"|null,"document_type":string|null,"status":"Unlimited"|"Time-limited"|"No Right to Rent"|null,"expiry":"YYYY-MM-DD"|null,"share_code":string|null}',
  income: '{"full_name":string|null,"employer":string|null,"monthly_income":number|null,"period":string|null}',
  bank_statement: '{"full_name":string|null,"statement_start":"YYYY-MM-DD"|null,"statement_end":"YYYY-MM-DD"|null,"monthly_income":number|null,"income_regular":boolean|null,"overdraft_seen":boolean|null,"bounced_payments_seen":boolean|null,"gambling_seen":boolean|null}',
}
const MEDIA: Record<string, string> = { 'image/jpeg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp', 'application/pdf': 'application/pdf' }

export async function readTenantCheckDoc(o: { businessId: string; tenantId: string; leaseDocId?: string | null; category: string; fileName: string; mime: string; bytes: Buffer }) {
  try {
    if (!(READ_CATEGORIES as readonly string[]).includes(o.category)) return
    const mediaType = MEDIA[o.mime]; if (!mediaType || o.bytes.length > 8 * 1024 * 1024) return
    const system = `You read one document uploaded by a UK tenant for a letting agency's tenant checks. Extract only what is visibly printed on it. Never guess. Use null for anything you cannot read. Reply with one JSON object and nothing else, in this shape: ${FIELDS[o.category]}. Dates must be YYYY-MM-DD. monthly_income is a number in pounds with no symbol.`
    const r = await callClaudeWithDocument(system, 'Read this document and return the JSON.', { base64: o.bytes.toString('base64'), mediaType }, 600)
    if (!r.text) return
    const m = r.text.match(/\{[\s\S]*\}/); if (!m) return
    const extracted = JSON.parse(m[0])
    await db.from('tenant_check_reads').insert({ business_id: o.businessId, tenant_id: o.tenantId, lease_doc_id: o.leaseDocId ?? null, category: o.category, file_name: o.fileName.slice(0, 120), extracted, status: 'review' })
  } catch { /* the document is already filed; staff can still check it by hand */ }
}
