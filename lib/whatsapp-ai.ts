// Novourq Cloud AI answering on WhatsApp, with hand-over to staff. Server-only.
// Runs from the Meta webhook after an incoming message is saved. It stays silent when:
//   - AI replies are off for the number (Settings -> WhatsApp), or the office is open and the number is set to out-of-hours only
//   - a team member has replied or taken the chat over (whatsapp_threads.ai_paused)
//   - AI Authority says replies here wait for a person or are switched off
// It hands the chat to staff (AI paused + bell, push and email alert) when the person asks for something that needs a decision.
import { serviceClient as db } from '@/lib/admin-auth'
import { callClaude } from '@/lib/claude'
import { basePrompt, getSettings, isOpen, parseJSON, claim, finish, alertStaff, FAST_MODEL } from '@/lib/receptionist'
import { authorityFor } from '@/lib/ai-authority'
import { sendText, setAiPaused, threadState, windowOpen } from '@/lib/whatsapp-meta'

export async function maybeAiReply(conn: any, phone: string, name: string | null, incoming: string, wamid: string) {
  if (!conn.ai_receptionist_enabled) return { skipped: 'AI off for this number' }
  const s = await getSettings(conn.user_id)
  if (!s) return { skipped: 'receptionist not set up' }
  if (conn.ai_when === 'out_of_hours' && isOpen(s)) return { skipped: 'office open' }
  const t = await threadState(conn.id, phone)
  if (t?.ai_paused) return { skipped: 'a person has this chat' }
  if (!(await windowOpen(conn.id, phone))) return { skipped: 'window closed' }

  const logId = await claim(s.business_id, 'whatsapp', wamid, { contact_name: name, contact: phone, subject: 'WhatsApp message', link: '/staff-centre/inbox' })
  if (!logId) return { skipped: 'already handled' }

  const { data: rows } = await db.from('whatsapp_messages').select('sender,body').eq('connection_id', conn.id).eq('contact_phone', phone).order('created_at', { ascending: false }).limit(14)
  const convo = (rows ?? []).reverse().map((r: any) => `${r.sender === 'contact' ? 'CUSTOMER' : r.sender === 'ai' ? 'YOU' : 'STAFF'}: ${r.body}`).join('\n')
  const first = !(rows ?? []).some((r: any) => r.sender === 'ai')
  const extra = [conn.ai_receptionist_business_info && `EXTRA INFORMATION FOR THIS WHATSAPP NUMBER:\n${conn.ai_receptionist_business_info}`, first && conn.ai_receptionist_greeting && `If this is the first reply, start with this greeting: ${conn.ai_receptionist_greeting}`].filter(Boolean).join('\n\n')
  const system = basePrompt(s, 'WhatsApp') + `

${extra}

Customer: ${name || phone}.
Reply ONLY with JSON: {"reply": "your WhatsApp reply (short, plain text, no markdown)", "handover": boolean, "summary": "one line for staff"}
- handover=true for payments, refunds, disputes, notices, complaints, contracts, legal or financial questions, emergencies, anything you cannot answer from the knowledge, or if they ask for a person. Still write a short, kind reply telling them a member of the team will take over.`
  const r = await callClaude(system, `Conversation so far (oldest first):\n${convo}\n\nWrite the next reply to the customer.`, 600, FAST_MODEL)
  const out = parseJSON(r.text)
  const reply = String(out?.reply || '').trim().slice(0, 1500)
  if (!reply) { await finish(logId, { action: 'skipped', summary: r.error ? 'AI unavailable' : 'No reply generated' }); return { skipped: 'no reply' } }

  const summary = String(out?.summary || '').slice(0, 300) || null
  const gate = await authorityFor(s.business_id, 'portal', 'portal_reply', `${incoming} ${reply}`).catch(() => ({ mode: 'auto' as const, why: '' }))
  const handover = !!out?.handover || gate.mode !== 'auto'
  const link = '/staff-centre/inbox'

  // Held back: AI Authority says a person must check it (or it is off). Nothing is sent; the draft waits in the chat.
  if (gate.mode !== 'auto') {
    await setAiPaused(conn, phone, true, s.assistant_name, gate.why, gate.mode === 'approval' ? reply : null)
    await finish(logId, { action: 'drafted', summary, needs_staff: true, details: { why: gate.why } })
    await alertStaff(s, `${name || phone} is waiting for a WhatsApp reply`, `${summary ?? ''}\n\nThey wrote: ${incoming}\n\n${gate.mode === 'approval' ? `Suggested reply: ${reply}\n\n` : ''}${gate.why}.`, link)
    return { held: true }
  }

  const sent = await sendText(conn, phone, reply)
  if (sent.error) { await finish(logId, { action: 'skipped', summary: `Could not send: ${sent.error}`, needs_staff: true }); await alertStaff(s, `WhatsApp reply to ${name || phone} failed`, sent.error, link); return { skipped: 'send failed' } }
  await db.from('whatsapp_messages').insert({ connection_id: conn.id, business_id: conn.user_id, contact_phone: phone, contact_name: name, sender: 'ai', body: reply, wamid: sent.wamid || null, status: 'sent' })

  if (handover) {
    await setAiPaused(conn, phone, true, s.assistant_name, summary || 'The AI handed this chat to the team')
    await finish(logId, { action: 'replied', summary, needs_staff: true })
    await alertStaff(s, `${name || phone} needs a person on WhatsApp`, `${summary ?? ''}\n\nThey wrote: ${incoming}\n\nThe AI has replied and stepped back. Open the chat to take over.`, link)
    return { replied: true, handover: true }
  }
  await finish(logId, { action: 'replied', summary, needs_staff: false })
  return { replied: true }
}
