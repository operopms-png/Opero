// What the AI is allowed to do on its own. Server-only.
//   Level 1 Intelligence: answers and recommends, changes nothing (Ask AI, reports).
//   Level 2 Automation: proposes work; a person approves it in AI Approvals (mode "approval").
//   Level 3 Autonomous: carries approved kinds of work out itself and logs it (mode "auto"), with a daily cap.
// Some things can never run without a person: contracts, deposits, payouts, documents that change records.
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type Mode = 'auto' | 'approval' | 'never'

// Always wait for a person. Cannot be switched to automatic.
export const LOCKED_TYPES: Record<string, string> = { lease_update: 'Changes to a lease or tenancy are a legal commitment', marketing_list: 'Emailing your whole mailing list always waits for a person to approve it' }
export const LOCKED_AGENTS: Record<string, string> = {
  pm_renewals: 'Renewal offers are a legal commitment',
  doc_reader: 'Changes to records from documents are checked by a person',
  pm_deposits: 'Deposit decisions affect tenant money',
  partner_payouts: 'Payouts move money',
}
// Wait for a person unless an admin chooses otherwise.
export const DEFAULT_APPROVAL: Record<string, string> = { pm_arrears: 'Arrears messages are sensitive to tenants' }

// Words that always send a draft to a person, as a safety net on top of the rules above.
export const MONEY_OR_CONTRACT = /contract|tenancy agreement|assured shorthold|sign(ing)?\b|e-?sign|payout|pay out|refund|transfer|send(ing)? (money|funds)|wire/i

// The adjustable rules, shown in Settings -> AI Authority.
export const ADJUSTABLE: { key: string; label: string; help: string; kind: 'type' | 'agent'; default: Mode }[] = [
  { key: 'guest_reply', label: 'Replies to guests', help: 'Answers to short-stay guests.', kind: 'type', default: 'auto' },
  { key: 'portal_reply', label: 'Replies in tenant and landlord portals', help: 'Answers to messages in the portal chats.', kind: 'type', default: 'auto' },
  { key: 'email_out', label: 'Other emails to people', help: 'Reminders and follow-ups by email.', kind: 'type', default: 'auto' },
  { key: 'owner_report', label: 'Owner and landlord reports', help: 'Monthly reports sent to owners.', kind: 'type', default: 'auto' },
  { key: 'cleaning_instruction', label: 'Cleaning instructions', help: 'Messages to cleaners.', kind: 'type', default: 'auto' },
  { key: 'maintenance_instruction', label: 'Maintenance requests', help: 'Requests sent to contractors.', kind: 'type', default: 'auto' },
  { key: 'rate_change', label: 'Nightly rate changes', help: 'Price changes on short-stay listings.', kind: 'type', default: 'auto' },
  { key: 'mark_rent_paid', label: 'Marking rent as paid', help: 'Only exact matches to bank receipts.', kind: 'type', default: 'auto' },
  { key: 'listing_description', label: 'Listing descriptions', help: 'First drafts of website descriptions.', kind: 'type', default: 'auto' },
  { key: 'import_records', label: 'Importing records', help: 'Bulk imports from uploaded files.', kind: 'type', default: 'auto' },
  { key: 'pm_arrears', label: 'Rent arrears messages', help: 'Messages to tenants who are behind on rent.', kind: 'agent', default: 'approval' },
]
export const LOCKED_LIST = [...Object.values(LOCKED_TYPES), ...Object.values(LOCKED_AGENTS)]

export async function businessRules(businessId: string): Promise<Record<string, Mode>> {
  const { data } = await db().from('ai_action_rules').select('rule_key,mode').eq('business_id', businessId)
  return Object.fromEntries((data ?? []).map((r: any) => [r.rule_key, r.mode as Mode]))
}

// Decides whether this piece of work may run on its own. Locked items and the keyword net always win.
export async function authorityFor(businessId: string, agentKey: string, actionType: string, text: string): Promise<{ mode: Mode; why: string }> {
  if (LOCKED_TYPES[actionType]) return { mode: 'approval', why: LOCKED_TYPES[actionType] }
  if (LOCKED_AGENTS[agentKey]) return { mode: 'approval', why: LOCKED_AGENTS[agentKey] }
  const rules = await businessRules(businessId)
  const rule = rules[agentKey] ?? rules[actionType]
  if (rule === 'never') return { mode: 'never', why: 'Switched off in Settings, AI Authority' }
  if (rule === 'approval') return { mode: 'approval', why: 'Set to wait for a person in Settings, AI Authority' }
  if (MONEY_OR_CONTRACT.test(text)) return { mode: 'approval', why: 'Mentions money or a contract, so a person checks it' }
  if (!rule && DEFAULT_APPROVAL[agentKey]) return { mode: 'approval', why: DEFAULT_APPROVAL[agentKey] }
  return { mode: 'auto', why: rule === 'auto' ? 'Set to automatic by an admin in Settings, AI Authority' : 'Within the automatic limits' }
}
