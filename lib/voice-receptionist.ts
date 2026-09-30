// Phone side of the AI Receptionist, on Twilio: <Gather input="speech"> →
// Claude decides what to say / do → <Say> back. Conversation state lives in
// ai_call_sessions (keyed by CallSid). When the call ends we write a
// call_logs row with transcript + summary, log it, and alert staff about
// any message taken or viewing requested. Server-only.
import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { callClaude } from '@/lib/claude'
import { basePrompt, getSettings, parseJSON, claim, finish, alertStaff, FAST_MODEL, Settings, isOpen } from '@/lib/receptionist'

export const xml = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const twiml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, { headers: { 'Content-Type': 'text/xml' } })

export async function readForm(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = String(v) })
  return params
}

// Twilio request signing. Logged (not enforced) when it doesn't match, since
// proxies can change the URL Twilio signed; the call itself still needs a
// real CallSid and a business with the phone receptionist switched on.
export function signatureOk(req: NextRequest, params: Record<string, string>) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const sig = req.headers.get('x-twilio-signature')
  if (!token || !sig) return !token
  const u = new URL(req.url)
  const host = req.headers.get('x-forwarded-host') || u.host
  const urls = [req.url, `https://${host}${u.pathname}${u.search}`]
  const data = Object.keys(params).sort().map(k => k + params[k]).join('')
  return urls.some(url => { try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(crypto.createHmac('sha1', token).update(url + data).digest('base64'))) } catch { return false } })
}

export function base(req: NextRequest) {
  const u = new URL(req.url)
  const host = req.headers.get('x-forwarded-host') || u.host
  return `${u.protocol === 'http:' && !host.startsWith('localhost') ? 'https:' : u.protocol}//${host}`
}

export function gather(req: NextRequest, s: Settings, say: string) {
  const action = `${base(req)}/api/receptionist/voice/turn?biz=${s.business_id}`
  return `<Gather input="speech" action="${xml(action)}" method="POST" speechTimeout="auto" speechModel="phone_call" language="en-GB" actionOnEmptyResult="true"><Say voice="${xml(s.phone_voice)}" language="en-GB">${xml(say)}</Say></Gather>`
}

export async function startSession(req: NextRequest, s: Settings, p: Record<string, string>, reason: 'direct' | 'no_answer') {
  if (!p.CallSid?.startsWith('CA')) return twiml('<Hangup/>')
  if (!signatureOk(req, p)) console.warn('[voice-ai] Twilio signature did not match for', p.CallSid)
  await serviceClient.from('ai_call_sessions').upsert({ call_sid: p.CallSid, business_id: s.business_id, caller: p.From ?? null, turns: [], updated_at: new Date().toISOString() }, { onConflict: 'call_sid', ignoreDuplicates: true })
  const company = s.company_name || 'us'
  const greet = reason === 'no_answer'
    ? `Sorry, the team can't get to the phone right now. I'm ${s.assistant_name}, the virtual receptionist for ${company}. I can answer questions, take a message or arrange a viewing. How can I help?`
    : (s.phone_greeting || `Hello, thank you for calling ${company}. I'm ${s.assistant_name}, the virtual receptionist. How can I help you today?`)
  await addTurn(p.CallSid, 'assistant', greet)
  return twiml(gather(req, s, greet))
}

async function addTurn(callSid: string, role: 'caller' | 'assistant', text: string, outcome?: any) {
  const { data } = await serviceClient.from('ai_call_sessions').select('turns,outcome').eq('call_sid', callSid).maybeSingle()
  const turns = [...(data?.turns ?? []), { role, text, at: new Date().toISOString() }]
  const patch: any = { turns, updated_at: new Date().toISOString() }
  if (outcome) patch.outcome = { ...(data?.outcome ?? {}), ...outcome }
  await serviceClient.from('ai_call_sessions').update(patch).eq('call_sid', callSid)
  return turns
}

export async function takeTurn(req: NextRequest, s: Settings, p: Record<string, string>) {
  if (!p.CallSid) return twiml('<Hangup/>')
  if (!signatureOk(req, p)) console.warn('[voice-ai] Twilio signature did not match for', p.CallSid)
  const { data: sess } = await serviceClient.from('ai_call_sessions').select('*').eq('call_sid', p.CallSid).maybeSingle()
  if (!sess || sess.business_id !== s.business_id) return twiml('<Hangup/>')
  const heard = (p.SpeechResult ?? '').trim()
  const voice = xml(s.phone_voice)

  if (!heard) {
    const silences = (sess.outcome?.silences ?? 0) + 1
    await serviceClient.from('ai_call_sessions').update({ outcome: { ...(sess.outcome ?? {}), silences }, updated_at: new Date().toISOString() }).eq('call_sid', p.CallSid)
    if (silences >= 2) {
      await addTurn(p.CallSid, 'assistant', 'No response — call ended.')
      return twiml(`<Say voice="${voice}" language="en-GB">Sorry, I can't hear you. Please call back or email us. Goodbye.</Say><Hangup/>`)
    }
    return twiml(gather(req, s, "Sorry, I didn't catch that. How can I help?"))
  }

  const turns = await addTurn(p.CallSid, 'caller', heard)
  const transcript = turns.map((t: any) => `${t.role === 'caller' ? 'CALLER' : 'YOU'}: ${t.text}`).join('\n')
  const canTransfer = !!s.phone_transfer_number && isOpen(s)
  const system = basePrompt(s, 'phone (your words are read aloud by a text-to-speech voice)') + `

The caller's number (caller ID) is ${p.From || 'withheld'}.
Speak naturally: 1–3 short sentences, no lists, no URLs, no emojis, spell out numbers as they should be spoken. Ask one question at a time.
You can: answer questions from the knowledge; take a message (get their name, the best number to call back — confirm the caller ID number is fine — and what it's about); take a viewing request (which property or area, their name, number, and preferred days/times — staff will confirm); ${canTransfer ? 'put them through to a member of staff if they ask for a person or it needs a human now' : 'nobody is available to transfer to right now, so offer to take a message instead'}.
Before ending, briefly confirm what you've noted and that the team will call back.
Reply ONLY with JSON: {"say": "what to say next", "action": "continue"|${canTransfer ? '"transfer"|' : ''}"end", "message": null | {"name": "", "phone": "", "reason": "", "urgent": boolean}, "viewing": null | {"property": "", "name": "", "phone": "", "preferred_times": ""}}
Use "end" only after saying goodbye. Keep "message"/"viewing" filled in once you have the details (repeat them on later turns).`
  const r = await callClaude(system, `Call so far:\n${transcript}\n\nWhat do you say next?`, 400, FAST_MODEL)
  const out = parseJSON(r.text) ?? { say: "Sorry, I'm having trouble right now. I'll make sure the team calls you back. Goodbye.", action: 'end', message: { name: '', phone: p.From ?? '', reason: 'AI could not answer — please call back', urgent: false } }
  const outcome: any = {}
  if (out.message?.reason || out.message?.name) outcome.message = out.message
  if (out.viewing?.property || out.viewing?.preferred_times) outcome.viewing = out.viewing
  if (out.action === 'transfer') outcome.transferred = true
  await addTurn(p.CallSid, 'assistant', out.say, Object.keys(outcome).length ? outcome : undefined)

  if (out.action === 'transfer' && canTransfer) {
    const after = `${base(req)}/api/receptionist/voice/after-dial?biz=${s.business_id}&from_ai=1`
    return twiml(`<Say voice="${voice}" language="en-GB">${xml(out.say)}</Say><Dial timeout="25" callerId="${xml(p.To || '')}" action="${xml(after)}">${xml(s.phone_transfer_number!)}</Dial>`)
  }
  if (out.action === 'end') {
    await finalizeCall(p.CallSid)
    return twiml(`<Say voice="${voice}" language="en-GB">${xml(out.say)}</Say><Hangup/>`)
  }
  return twiml(gather(req, s, out.say))
}

// Write the call up once it's over (called on "end", and by the scheduled
// sweep for callers who simply hung up).
export async function finalizeCall(callSid: string) {
  const { data: sess } = await serviceClient.from('ai_call_sessions').select('*').eq('call_sid', callSid).maybeSingle()
  if (!sess || sess.outcome?.finalized) return
  await serviceClient.from('ai_call_sessions').update({ outcome: { ...(sess.outcome ?? {}), finalized: true } }).eq('call_sid', callSid)
  const s = await getSettings(sess.business_id)
  if (!s) return
  const turns: any[] = sess.turns ?? []
  const spoke = turns.some(t => t.role === 'caller')
  const transcript = turns.map(t => `${t.role === 'caller' ? 'Caller' : s.assistant_name}: ${t.text}`).join('\n')
  let summary = spoke ? '' : 'Caller did not speak.'
  if (spoke) {
    const r = await callClaude('Summarise this phone call for a busy property manager in one or two sentences: who called, what they wanted, and what was promised. No preamble.', transcript, 150, FAST_MODEL)
    summary = (r.text ?? '').trim() || 'Call handled by the AI receptionist.'
  }
  const o = sess.outcome ?? {}
  const action = o.viewing ? 'viewing_requested' : o.message ? 'message_taken' : o.transferred ? 'transferred' : spoke ? 'replied' : 'skipped'
  await serviceClient.from('call_logs').insert({ user_id: s.business_id, direction: 'inbound', contact_phone: sess.caller, contact_name: o.message?.name || o.viewing?.name || null, staff_name: s.assistant_name, status: 'completed', twilio_call_sid: callSid, transcript, summary })
  const logId = await claim(s.business_id, 'phone', callSid, { contact_name: o.message?.name || o.viewing?.name || null, contact: o.message?.phone || o.viewing?.phone || sess.caller, subject: o.viewing ? 'Viewing request' : o.message ? 'Phone message' : 'Phone call', link: '/staff-centre/receptionist' })
  if (logId) await finish(logId, { action, summary, needs_staff: !!(o.message || o.viewing), details: { transcript, message: o.message ?? null, viewing: o.viewing ?? null } })
  if (o.message || o.viewing) {
    const d = o.viewing ? `Viewing request: ${o.viewing.property || 'property not given'} — ${o.viewing.preferred_times || 'no times given'}\n${o.viewing.name || ''} ${o.viewing.phone || sess.caller || ''}` : `${o.message.urgent ? 'URGENT — ' : ''}${o.message.reason}\n${o.message.name || ''} ${o.message.phone || sess.caller || ''}`
    await alertStaff(s, o.viewing ? 'New viewing request by phone' : `Phone message${o.message?.urgent ? ' (urgent)' : ''}`, `${d}\n\n${summary}`, '/staff-centre/receptionist')
  }
}

export async function sweepCalls() {
  const cutoff = new Date(Date.now() - 3 * 60e3).toISOString()
  const { data } = await serviceClient.from('ai_call_sessions').select('call_sid,outcome').lt('updated_at', cutoff).gt('created_at', new Date(Date.now() - 24 * 3600e3).toISOString())
  for (const r of data ?? []) if (!r.outcome?.finalized) await finalizeCall(r.call_sid)
}
