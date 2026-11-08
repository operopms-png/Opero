// Loads utility accounts and their bills per property (server only). Used by the staff and portal utilities APIs.
import { serviceClient as db } from '@/lib/admin-auth'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { billAddress } from '@/lib/utility-inbox'

export async function loadUtilities(biz: string, opts: { propertyIds?: string[]; visible?: 'owner' | 'tenant'; files?: boolean; inbox?: boolean } = {}) {
  let q = db.from('pm_utilities').select('*').eq('user_id', biz)
  if (opts.propertyIds) q = q.in('property_id', opts.propertyIds.length ? opts.propertyIds : ['00000000-0000-0000-0000-000000000000'])
  if (opts.visible === 'owner') q = q.eq('visible_to_owner', true)
  if (opts.visible === 'tenant') q = q.eq('visible_to_tenant', true)
  const { data: accts } = await q
  const ids = (accts ?? []).map((a: any) => a.id)
  const [{ data: bills }, { data: props }] = await Promise.all([
    ids.length ? db.from('pm_utility_bills').select('*').in('utility_id', ids).order('period_end', { ascending: false }).limit(2000) : Promise.resolve({ data: [] as any[] }),
    db.from('pm_properties').select('id, name, currency').in('id', [...new Set((accts ?? []).map((a: any) => a.property_id).filter(Boolean))] as string[]),
  ])
  const byU: Record<string, any[]> = {}
  for (const b of bills ?? []) (byU[b.utility_id] ||= []).push(b)
  const out: Record<string, any> = {}
  for (const p of props ?? []) out[p.id] = { id: p.id, name: p.name, currency: p.currency || 'GBP', accounts: [] }
  for (const a of accts ?? []) {
    const p = out[a.property_id]; if (!p) continue
    const list = await Promise.all((byU[a.id] ?? []).slice(0, 36).map(async (b: any) => {
      let url: string | null = null
      if (opts.files !== false && b.bill_path) url = (await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(b.bill_path, 300)).data?.signedUrl ?? null
      return { id: b.id, period_end: b.period_end, source: b.source, amount: Number(b.amount), usage: b.usage != null ? Number(b.usage) : null, usage_unit: b.usage_unit, due_date: b.due_date, paid: b.paid, bill_name: b.bill_name, url }
    }))
    p.accounts.push({ id: a.id, service: a.service, supplier: a.supplier, account_holder: a.account_holder, account_reference: a.account_reference, inbox: opts.inbox ? billAddress(a.inbox_token) : undefined, monthly_amount: a.monthly_amount != null ? Number(a.monthly_amount) : null, next_bill_date: a.next_bill_date, visible_to_owner: a.visible_to_owner, visible_to_tenant: a.visible_to_tenant, bills: list })
  }
  return Object.values(out).sort((x: any, y: any) => String(x.name).localeCompare(String(y.name)))
}

