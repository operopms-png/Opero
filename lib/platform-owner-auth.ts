// Server-side gate for the Platform Owner pages. Every /api/platform/* route calls
// requireOwner first: only the platform owner's own login (lib/platform-owner.ts) gets through,
// so a client company's admin can never read cross-client data, even by calling the route directly.
import type { NextRequest } from 'next/server'
import { getCaller, type Caller } from '@/lib/mailbox'
import { serviceClient } from '@/lib/admin-auth'
import { isPlatformOwnerEmail } from '@/lib/platform-owner'

export async function requireOwner(req: NextRequest): Promise<Caller | null> {
  const c = await getCaller(req)
  return c && isPlatformOwnerEmail(c.email) ? c : null
}

// Readable names for client companies: the company name from their invoice settings,
// otherwise the sign-in email of the business owner.
export async function clientLabels(ids: string[]): Promise<Record<string, { name: string; email: string }>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)))
  const out: Record<string, { name: string; email: string }> = {}
  if (!uniq.length) return out
  const { data: inv } = await serviceClient.from('invoice_settings').select('business_id, company_name').in('business_id', uniq)
  const names = new Map((inv ?? []).map((r: any) => [r.business_id, String(r.company_name ?? '').trim()]))
  await Promise.all(uniq.map(async id => {
    let email = ''
    try { email = (await serviceClient.auth.admin.getUserById(id)).data.user?.email ?? '' } catch { /* unknown user */ }
    out[id] = { name: names.get(id) || email || 'Unknown client', email }
  }))
  return out
}
