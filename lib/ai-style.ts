// House style for AI drafts, set per business on AI Assistant -> Property manager -> Settings.
// Appended to the instructions of every agent that writes free text with Claude.
import { svc } from './ai-proposal-utils'

export async function clientStyle(businessId: string) {
  const { data } = await svc().from('ai_client_settings').select('tone, country_rules, signoff').eq('user_id', businessId).maybeSingle()
  return { tone: (data?.tone as string) || '', rules: (data?.country_rules as string) || '', signoff: (data?.signoff as string) || '' }
}

// When the team edits a draft before approving it, the edited version is the better example.
// The last two corrections for this agent are shown to the AI so it writes the way the team does.
async function corrections(businessId: string, agentKey: string) {
  const { data } = await svc().from('ai_pending_actions').select('draft_body, final_body')
    .eq('user_id', businessId).eq('agent_key', agentKey).eq('status', 'executed').not('final_body', 'is', null)
    .order('decided_at', { ascending: false }).limit(25)
  const ex = (data ?? []).filter((r: any) => r.final_body && r.draft_body && r.final_body !== r.draft_body && r.draft_body.length < 1500 && r.final_body.length < 1500).slice(0, 3)
  // Drafts the team rejected with a reason are lessons too: say what not to do again.
  const { data: rej } = await svc().from('ai_pending_actions').select('draft_body, decision_note')
    .eq('user_id', businessId).eq('agent_key', agentKey).eq('status', 'rejected').not('decision_note', 'is', null)
    .order('decided_at', { ascending: false }).limit(10)
  const no = (rej ?? []).filter((r: any) => String(r.decision_note ?? '').trim().length > 3).slice(0, 3)
  let out = ''
  if (ex.length) out += '\n\nThis team has corrected earlier drafts from this agent. Write the way the corrected versions do, not the way the originals did:\n' +
    ex.map((r: any, i: number) => `Example ${i + 1}\nAI draft:\n${r.draft_body}\nTeam's final version:\n${r.final_body}`).join('\n\n')
  if (no.length) out += '\n\nThe team rejected earlier drafts for these reasons. Do not repeat these mistakes:\n' + no.map((r: any) => `- ${String(r.decision_note).trim().slice(0, 300)}`).join('\n')
  return out
}

// Text to add to a Claude system prompt. Empty when the business has set nothing.
export async function styleInstructions(businessId: string, agentKey?: string) {
  const s = await clientStyle(businessId)
  const parts = [
    s.tone && `House tone: ${s.tone}`,
    s.rules && `Local rules and wording to respect (follow these, never contradict them): ${s.rules}`,
  ].filter(Boolean)
  const learned = agentKey ? await corrections(businessId, agentKey) : ''
  return (parts.length ? `\n\n${parts.join('\n')}` : '') + learned
}
