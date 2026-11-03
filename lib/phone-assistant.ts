// Novourq Cloud AI over WhatsApp: a client's admin links their own mobile, then messages or voice-notes the AI.
// Server-only. Uses the same portal snapshot and system prompt as the in-portal Ask AI.
import { serviceClient as db } from '@/lib/admin-auth'
import type { Caller } from '@/lib/mailbox'
import { portalContext, systemPrompt, askClaude, type ChatMsg } from '@/lib/ask-ai'
import { aiTask } from '@/lib/ai-proposal-utils'

const HOURLY_LIMIT = 30

export async function transcribe(mediaUrl: string, contentType: string): Promise<{ text?: string; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { error: 'no-key' }
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
  const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
  const audio = await fetch(mediaUrl, { headers: { Authorization: auth } })
  if (!audio.ok) return { error: 'download' }
  const buf = await audio.arrayBuffer()
  if (buf.byteLength > 20 * 1024 * 1024) return { error: 'too-big' }
  const ext = contentType.includes('mpeg') ? 'mp3' : contentType.includes('mp4') || contentType.includes('m4a') ? 'm4a' : contentType.includes('wav') ? 'wav' : 'ogg'
  const form = new FormData()
  form.append('file', new Blob([buf], { type: contentType }), `voice.${ext}`)
  form.append('model', 'whisper-1')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
  if (!res.ok) return { error: 'transcribe' }
  const d = await res.json().catch(() => ({}))
  return d.text ? { text: String(d.text).trim() } : { error: 'empty' }
}

const FORMAT = `

You are replying on WhatsApp to the account admin, from their own phone.
- Keep it short: under 120 words unless they ask for detail. Plain text only: no markdown, no tables, no headings. Use short lines.
- If they clearly ask for something to be done, chased, booked, remembered or followed up, add it to "tasks" so it lands on the Task board. You cannot send emails, move money or change records from here, so say it has been added as a task for the team or the right AI skill to pick up. Never claim something was sent or paid.
- Do not create tasks for questions.
Reply ONLY with JSON, no other text: {"reply": "text to send", "tasks": [{"title": "short title", "notes": "one line of detail", "days": 1}]}`

function parse(text: string): { reply: string; tasks: { title: string; notes?: string; days?: number }[] } {
  const m = text.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const j = JSON.parse(m[0])
      if (typeof j.reply === 'string' && j.reply.trim()) return { reply: j.reply.trim(), tasks: Array.isArray(j.tasks) ? j.tasks.slice(0, 5) : [] }
    } catch { /* fall through */ }
  }
  return { reply: text.trim().slice(0, 1200), tasks: [] }
}

export async function handleAssistantMessage(row: { business_id: string; user_email: string; name: string | null; phone: string }, text: string, via: 'text' | 'voice'): Promise<string> {
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('assistant_messages').select('id', { count: 'exact', head: true }).eq('phone', row.phone).eq('role', 'user').gte('created_at', since)
  if ((count ?? 0) >= HOURLY_LIMIT) return 'You have sent a lot of messages in the last hour. Please try again a little later.'

  const c: Caller = { uid: row.business_id, email: row.user_email, businessId: row.business_id, isAdmin: true, role: 'admin', name: row.name || 'there' }
  const { data: hist } = await db.from('assistant_messages').select('role,content').eq('phone', row.phone).order('created_at', { ascending: false }).limit(10)
  const messages: ChatMsg[] = [...(hist ?? []).reverse().map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })), { role: 'user', content: text }]
  const portal = await portalContext(c).catch(() => null)
  const out = await askClaude(systemPrompt({ c, portal, web: false }) + FORMAT, messages, false)
  if (out.error || !out.text) return 'Sorry, I could not answer that just now. Please try again in a minute.'
  const { reply, tasks } = parse(out.text)

  let made = 0
  for (const t of tasks) {
    if (t?.title && await aiTask(row.business_id, String(t.title), String(t.notes || 'Added from WhatsApp'), Math.min(30, Math.max(0, Number(t.days) || 1)))) made++
  }
  await db.from('assistant_messages').insert([
    { business_id: row.business_id, phone: row.phone, role: 'user', content: text.slice(0, 4000), via },
    { business_id: row.business_id, phone: row.phone, role: 'assistant', content: reply.slice(0, 4000), via: 'text' },
  ])
  return made ? `${reply}\n\n(${made} task${made === 1 ? '' : 's'} added to your Task board.)` : reply
}
