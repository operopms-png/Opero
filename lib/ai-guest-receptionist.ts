// AI guest replies -- checks if the AI Guest Agent (ai_agents,
// agent_key='guest') is switched on for the account, and if so,
// generates a draft using the same property-knowledge prompt as the
// manual "test agent" flow in /api/ai/guest-reply.
//
// The draft is NEVER sent automatically. It goes into the shared
// approvals queue (ai_pending_actions) and only goes out through
// sendGuestMessage() below once a staff member approves it in
// Staff Centre -> AI Approvals. Approved replies are logged with
// sender:'ai' so the thread still shows which messages were AI-written.
import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { sendEmail } from './send-email'
import { sendSmoobuGuestMessage } from './smoobu-client'
import { EMAIL_DOMAIN } from '@/lib/brand'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

// Shared by both the manual guest-send route and this auto-reply path
// -- sends through Smoobu if the booking came from there (relays into
// the guest's real Airbnb/Booking.com chat), otherwise falls back to
// plain email.
export async function sendGuestMessage(userId: string, bookingId: string, subject: string | undefined, body: string, sender: 'staff' | 'ai' = 'staff') {
  const supabase = getServiceClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_email, reply_token, external_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Booking not found' }

  const smoobuMatch = booking.external_id?.match(/^smoobu-(\d+)$/)

  if (smoobuMatch) {
    const { data: integ } = await supabase.from('integrations').select('smoobu_api_key, smoobu_api_secret').eq('user_id', userId).single()
    if (!integ?.smoobu_api_key) return { error: 'Smoobu is not connected for this account.' }
    try {
      await sendSmoobuGuestMessage({ apiKey: integ.smoobu_api_key, secret: (integ as any).smoobu_api_secret }, smoobuMatch[1], subject, body)
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  } else {
    if (!booking.guest_email) return { error: 'This booking has no guest email on file.' }
    const replyTo = booking.reply_token ? `guest+${booking.reply_token}@${EMAIL_DOMAIN}` : undefined
    const result = await sendEmail(booking.guest_email, subject || 'Message from your host', `<p>${body.replace(/\n/g, '<br/>')}</p>`, replyTo)
    if (result.error) return { error: result.error }
  }

  await supabase.from('str_guest_messages').insert({ user_id: userId, booking_id: bookingId, sender, subject: subject || null, message: body })
  return { success: true }
}

export async function maybeAutoReplyToGuest(userId: string, bookingId: string, guestMessage: string) {
  const supabase = getServiceClient()

  const { data: agent } = await supabase.from('ai_agents').select('enabled').eq('user_id', userId).eq('agent_key', 'guest').maybeSingle()
  if (!agent?.enabled) return { skipped: 'agent not active' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, property_id, properties(name, address, city, country, wifi_name, wifi_password, house_rules, checkin_instructions, checkout_instructions)')
    .eq('id', bookingId)
    .single()
  if (!booking) return { skipped: 'booking not found' }

  const property = (booking as any).properties
  const knowledge = `
Property: ${property?.name ?? ''}
Address: ${property?.address ?? ''}, ${property?.city ?? ''}, ${property?.country ?? ''}
WiFi network: ${property?.wifi_name ?? 'Not provided'}
WiFi password: ${property?.wifi_password ?? 'Not provided'}
Check-in instructions: ${property?.checkin_instructions ?? 'Not provided'}
Check-out instructions: ${property?.checkout_instructions ?? 'Not provided'}
House rules: ${property?.house_rules ?? 'Not provided'}
`.trim()

  const systemPrompt = `You are a friendly, professional short-term rental guest support assistant. Answer the guest's message using ONLY the property information provided below. If the answer isn't covered by this information, politely say you'll check with the host and follow up — never invent details (like WiFi passwords, exact addresses, or rules) that aren't in the provided info. Keep replies warm, concise, and ready to send as-is.

${knowledge}`

  const { text: reply, error } = await callClaude(systemPrompt, `Guest name: ${booking.guest_name || 'Guest'}\nGuest message: ${guestMessage}`, 500)
  if (error || !reply) return { skipped: `AI generation failed: ${error}` }

  const queued = await queueAiAction({
    userId,
    agentKey: 'guest',
    actionType: 'guest_reply',
    title: `Reply to ${booking.guest_name || 'guest'}`,
    propertyName: property?.name,
    draftBody: reply,
    payload: { booking_id: bookingId },
    context: { guest_name: booking.guest_name || null, guest_message: guestMessage },
  })
  if ('error' in queued && queued.error) return { skipped: `queue failed: ${queued.error}` }
  if ('skipped' in queued) return { skipped: queued.skipped }

  await supabase.from('ai_activity_log').insert({ user_id: userId, agent_key: 'guest', action: `Drafted reply for ${booking.guest_name || 'guest'} (awaiting approval)`, property_name: property?.name })

  return { drafted: true }
}
