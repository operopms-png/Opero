// Small helpers shared by the scheduled AI agents (lib/ai-proposals*.ts).
import { createClient } from '@supabase/supabase-js'

export function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type Counts = { businesses: number; queued: number; skipped: number; noRecipient: number; errors: string[] }
export const freshCounts = (): Counts => ({ businesses: 0, queued: 0, skipped: 0, noRecipient: 0, errors: [] })

export const dayStr = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
export const niceDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
export const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || ''

// Only businesses that switched this agent on in AI Manager.
export async function enabledBusinesses(agentKey: string) {
  const { data } = await svc().from('ai_agents').select('user_id').eq('agent_key', agentKey).eq('enabled', true)
  return (data ?? []).map((a: any) => a.user_id as string)
}

// Name used to sign drafts: the business's own company name, never a fixed one.
export async function companyName(businessId: string) {
  const { data } = await svc().from('invoice_settings').select('company_name').eq('business_id', businessId).maybeSingle()
  return (data?.company_name as string | undefined)?.trim() || 'Your property management team'
}

export const inList = <T,>(rows: T[] | null | undefined) => rows ?? []
