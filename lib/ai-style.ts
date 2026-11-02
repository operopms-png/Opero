// House style for AI drafts, set per business on AI Assistant -> Property manager -> Settings.
// Appended to the instructions of every agent that writes free text with Claude.
import { svc } from './ai-proposal-utils'

export async function clientStyle(businessId: string) {
  const { data } = await svc().from('ai_client_settings').select('tone, country_rules, signoff').eq('user_id', businessId).maybeSingle()
  return { tone: (data?.tone as string) || '', rules: (data?.country_rules as string) || '', signoff: (data?.signoff as string) || '' }
}

// Text to add to a Claude system prompt. Empty when the business has set nothing.
export async function styleInstructions(businessId: string) {
  const s = await clientStyle(businessId)
  const parts = [
    s.tone && `House tone: ${s.tone}`,
    s.rules && `Local rules and wording to respect (follow these, never contradict them): ${s.rules}`,
  ].filter(Boolean)
  return parts.length ? `\n\n${parts.join('\n')}` : ''
}
