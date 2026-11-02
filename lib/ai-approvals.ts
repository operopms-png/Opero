// Shared approvals queue for AI agents. Agents never act directly: they call
// queueAiAction() to propose something, a human approves it in Staff Centre →
// AI Approvals, and only then does executeAiAction() carry it out. Every row
// keeps who proposed, who decided, when, and exactly what went out.
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type AiActionType = 'guest_reply'

export async function queueAiAction(input: {
  userId: string
  agentKey: string
  actionType: AiActionType
  title: string
  propertyName?: string | null
  draftBody: string
  payload: Record<string, any>
  context?: Record<string, any>
}) {
  const supabase = getServiceClient()

  // Don't stack duplicates: one pending draft per booking per guest message.
  if (input.actionType === 'guest_reply' && input.payload.booking_id) {
    const { data: existing } = await supabase
      .from('ai_pending_actions')
      .select('id')
      .eq('user_id', input.userId)
      .eq('action_type', 'guest_reply')
      .eq('status', 'pending')
      .eq('payload->>booking_id', input.payload.booking_id)
      .limit(1)
    if (existing?.length) return { skipped: 'a draft is already waiting for this booking' }
  }

  const { data, error } = await supabase.from('ai_pending_actions').insert({
    user_id: input.userId,
    agent_key: input.agentKey,
    action_type: input.actionType,
    title: input.title,
    property_name: input.propertyName ?? null,
    draft_body: input.draftBody,
    payload: input.payload,
    context: input.context ?? {},
  }).select('id').single()
  if (error) return { error: error.message }
  return { queued: true, id: data.id as string }
}

// Carries out an approved action. Only called from the approve route.
export async function executeAiAction(action: { user_id: string; action_type: string; payload: any }, body: string) {
  if (action.action_type === 'guest_reply') {
    const { booking_id, subject } = action.payload ?? {}
    if (!booking_id) return { error: 'Missing booking_id' }
    // Imported lazily: ai-guest-receptionist imports this file too.
    const { sendGuestMessage } = await import('./ai-guest-receptionist')
    return sendGuestMessage(action.user_id, booking_id, subject, body, 'ai')
  }
  return { error: `Unknown action type: ${action.action_type}` }
}
