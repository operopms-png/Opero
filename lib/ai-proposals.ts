// Scheduled AI proposals. The AI writes the work on a schedule and puts it in the
// approvals queue (Staff Centre -> AI Command Centre -> AI Approvals); a person
// approves it before anything is sent. Nothing here sends anything itself.
//
// Currently: monthly owner reports. An agent only runs for a business that has
// switched it on in AI Manager (ai_agents.enabled), so it does nothing by default.
import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const monthStart = () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()

export async function proposeOwnerReports() {
  const db = getServiceClient()
  const { data: enabled } = await db.from('ai_agents').select('user_id').eq('agent_key', 'owner').eq('enabled', true)
  const businesses = (enabled ?? []).map((a: any) => a.user_id as string)
  const result = { ok: true, businesses: businesses.length, queued: 0, skipped: 0, errors: [] as string[] }
  if (!businesses.length) return result

  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  for (const businessId of businesses) {
    const { data: owners } = await db.from('owner_profiles').select('id, name, email, property_ids, split_percentage').eq('business_id', businessId)
    for (const owner of owners ?? []) {
      const ids: string[] = owner.property_ids ?? []
      if (!owner.email || !ids.length) { result.skipped++; continue }

      // One report per owner per calendar month, whatever its outcome.
      const { data: existing } = await db.from('ai_pending_actions').select('id')
        .eq('user_id', businessId).eq('action_type', 'owner_report').eq('payload->>owner_id', owner.id).gte('created_at', monthStart()).limit(1)
      if (existing?.length) { result.skipped++; continue }

      const [{ data: properties }, { data: bookings }] = await Promise.all([
        db.from('properties').select('name').in('id', ids),
        db.from('bookings').select('check_in, check_out, total_amount, status').in('property_id', ids).gte('check_in', thirtyAgo),
      ])
      const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
      const revenue = active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0)
      const share = owner.split_percentage ?? 60
      const ownerShare = revenue * (share / 100)
      const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
      const propertyNames = (properties ?? []).map((p: any) => p.name).join(', ')

      const system = `You are drafting a friendly, professional monthly owner report email on behalf of a short-term rental management company. Use only the figures given below and do not invent any other numbers, bookings or events. Sign off with just "The management team".

Owner: ${owner.name}
Properties: ${propertyNames || 'None on file'}
Period: last 30 days
Total bookings revenue: £${revenue.toLocaleString()}
Owner's share (${share}%): £${ownerShare.toLocaleString(undefined, { maximumFractionDigits: 0 })}
Nights booked: ${nights}`
      const { text, error } = await callClaude(system, 'Draft the monthly owner report email body (no subject line).', 500)
      if (error || !text) { result.errors.push(`${owner.name}: ${error ?? 'no text'}`); continue }

      const queued = await queueAiAction({
        userId: businessId,
        agentKey: 'owner',
        actionType: 'owner_report',
        title: `Monthly report to ${owner.name}`,
        propertyName: propertyNames || null,
        draftBody: text,
        payload: { owner_id: owner.id, to: owner.email, subject: 'Your monthly property report' },
        context: { summary: `Last 30 days: £${revenue.toLocaleString()} revenue, owner share £${ownerShare.toLocaleString(undefined, { maximumFractionDigits: 0 })}, ${nights} nights` },
      })
      if ('queued' in queued) result.queued++
      else { result.skipped++; if ('error' in queued) result.errors.push(`${owner.name}: ${queued.error}`) }
    }
  }
  return result
}

export async function runAiProposals() {
  try {
    const owners = await proposeOwnerReports()
    return { ok: true, ownerReports: owners }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
