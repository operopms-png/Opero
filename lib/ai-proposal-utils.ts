// Small helpers shared by the scheduled AI agents (lib/ai-proposals*.ts).
import { createClient } from '@supabase/supabase-js'
import { AsyncLocalStorage } from 'node:async_hooks'

export function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type Counts = { businesses: number; queued: number; skipped: number; noRecipient: number; errors: string[] }
export const freshCounts = (): Counts => ({ businesses: 0, queued: 0, skipped: 0, noRecipient: 0, errors: [] })

export const dayStr = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
export const niceDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
export const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || ''

// "Run now" from the screen runs every agent for one business only. The scheduled run has no scope
// and covers every business.
const scope = new AsyncLocalStorage<{ businessId: string }>()
export const runScoped = <T,>(businessId: string | undefined, fn: () => Promise<T>) => (businessId ? scope.run({ businessId }, fn) : fn())
export const scopedBusiness = () => scope.getStore()?.businessId

// Only businesses that switched this agent on in AI Manager.
export async function enabledBusinesses(agentKey: string) {
  let q = svc().from('ai_agents').select('user_id').eq('agent_key', agentKey).eq('enabled', true)
  const only = scopedBusiness()
  if (only) q = q.eq('user_id', only)
  const { data } = await q
  return (data ?? []).map((a: any) => a.user_id as string)
}

// Name used to sign drafts: the business's own company name, never a fixed one.
export async function companyName(businessId: string) {
  const custom = await svc().from('ai_client_settings').select('signoff').eq('user_id', businessId).maybeSingle()
  if (custom.data?.signoff?.trim()) return String(custom.data.signoff).trim()
  const { data } = await svc().from('invoice_settings').select('company_name').eq('business_id', businessId).maybeSingle()
  return (data?.company_name as string | undefined)?.trim() || 'Your property management team'
}

export const inList = <T,>(rows: T[] | null | undefined) => rows ?? []

// Drafts nobody decided on go stale: replies to guests and tenants after 3 days, everything
// else after 14. They are marked rejected with no decider, so they show as "Expired" in results.
export async function expireStaleDrafts() {
  const db = svc()
  const now = new Date().toISOString()
  const mark = { status: 'rejected', decided_at: now, decision_note: 'Expired: not approved in time' }
  const live = ['guest_reply', 'portal_reply']
  const only = scopedBusiness()
  let qa = db.from('ai_pending_actions').update(mark).eq('status', 'pending').in('action_type', live).lt('created_at', dayStr(-3))
  let qb = db.from('ai_pending_actions').update(mark).eq('status', 'pending').not('action_type', 'in', `(${live.join(',')})`).lt('created_at', dayStr(-14))
  if (only) { qa = qa.eq('user_id', only); qb = qb.eq('user_id', only) }
  const a = await qa.select('id')
  const b = await qb.select('id')
  return { expired: (a.data?.length ?? 0) + (b.data?.length ?? 0) }
}
