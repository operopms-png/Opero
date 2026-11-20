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
    : (s.phone_greeting ? s.phone_greeting.replace(/\s*please hold[^.!?]*[.!?]/gi, '').trim() + ` I'm ${s.assistant_name}, the virtual assistant. How can I help you today?` : `Hello, thank you for calling ${company}. I'm ${s.assistant_name}, the virtual receptionist. How can I help you today?`)
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
      await addTurn(p.CallSid, 'assistant', 'No response — offered voicemail.')
      return twiml(voicemailBody(req, s, "Sorry, I can't hear you."))
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
Reply ONLY with JSON: {"say": "what to say next", "action": "continue"|${canTransfer ? '"transfer"|' : ''}"voicemail"|"end", "message": null | {"name": "", "phone": "", "reason": "", "urgent": boolean}, "viewing": null | {"property": "", "name": "", "phone": "", "preferred_times": ""}}
Use "voicemail" when the caller asks to leave a voicemail or you cannot help and they would rather leave a recording (say one short line first; the voicemail message plays after). Use "end" only after saying goodbye. Keep "message"/"viewing" filled in once you have the details (repeat them on later turns).`
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
  if (out.action === 'voicemail') return twiml(`<Say voice="${voice}" language="en-GB">${xml(out.say)}</Say>` + voicemailBody(req, s, ''))
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
  if (spoke) await logCallerToCrm(s, { phone: o.message?.phone || o.viewing?.phone || sess.caller, name: o.message?.name || o.viewing?.name || null, why: o.viewing ? 'Viewing request by phone' : o.message ? 'Phone message' : 'Phone call', summary })
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

// ---------- voicemail ----------
// Plays the voicemail message, then records. Twilio posts to /api/receptionist/voice/voicemail when the caller finishes.
export function voicemailBody(req: NextRequest, s: Settings, lead: string) {
  const msg = s.phone_voicemail_message || `You've reached ${s.company_name || 'us'}. Please leave your name and number after the tone, and we'll call you back shortly. Thank you.`
  const u = `${base(req)}/api/receptionist/voice/voicemail?biz=${s.business_id}`
  return `<Say voice="${xml(s.phone_voice)}" language="en-GB">${xml((lead ? lead + ' ' : '') + msg)}</Say><Record maxLength="120" timeout="6" playBeep="true" finishOnKey="#" transcribe="true" transcribeCallback="${xml(u + '&t=1')}" action="${xml(u)}" method="POST"/>`
}

// The caller finished leaving a voicemail: write it up, add them to the CRM and alert staff.
export async function saveVoicemail(s: Settings, p: Record<string, string>) {
  const callSid = p.CallSid
  const caller = p.From || null
  const secs = Number(p.RecordingDuration || 0)
  const url = p.RecordingUrl ? `${p.RecordingUrl}.mp3` : null
  const { data: sess } = await serviceClient.from('ai_call_sessions').select('turns,outcome').eq('call_sid', callSid).maybeSingle()
  const turns: any[] = sess?.turns ?? []
  if (sess) await serviceClient.from('ai_call_sessions').update({ outcome: { ...(sess.outcome ?? {}), finalized: true, voicemail: { url, secs } }, updated_at: new Date().toISOString() }).eq('call_sid', callSid)
  const talk = turns.map(t => `${t.role === 'caller' ? 'Caller' : s.assistant_name}: ${t.text}`).join('\n')
  const summary = secs > 0 ? `Voicemail left (${secs}s).${url ? ' Recording: ' + url : ''}` : 'Caller reached voicemail but left no message.'
  await serviceClient.from('call_logs').insert({ user_id: s.business_id, direction: 'inbound', contact_phone: caller, staff_name: s.assistant_name, status: 'voicemail', duration_seconds: secs || null, twilio_call_sid: callSid, transcript: talk || null, summary })
  const logId = await claim(s.business_id, 'phone', callSid, { contact: caller, subject: 'Voicemail', link: '/staff-centre/receptionist' })
  if (logId) await finish(logId, { action: 'message_taken', summary, needs_staff: secs > 0, details: { transcript: talk, voicemail_url: url } })
  await logCallerToCrm(s, { phone: caller, name: null, why: 'Left a voicemail', summary })
  if (secs > 0) await alertStaff(s, 'New voicemail', `${caller || 'Unknown number'} left a voicemail (${secs}s).${url ? '\n' + url : ''}`, '/staff-centre/receptionist')
}

// Twilio's transcript of the voicemail arrives a little later: add it to the call record.
export async function saveVoicemailTranscript(s: Settings, p: Record<string, string>) {
  const text = (p.TranscriptionText || '').trim()
  if (!text || !p.CallSid) return
  const { data: row } = await serviceClient.from('call_logs').select('id,summary').eq('twilio_call_sid', p.CallSid).eq('status', 'voicemail').maybeSingle()
  if (row) await serviceClient.from('call_logs').update({ summary: `${row.summary}\nTranscript: ${text}`.slice(0, 2000) }).eq('id', row.id)
  await alertStaff(s, 'Voicemail transcript', text.slice(0, 400), '/staff-centre/receptionist')
}

// Every caller ends up in the CRM: a new contact if their number isn't there yet, and a note on the contact either way.
export async function logCallerToCrm(s: Settings, c: { phone: string | null; name: string | null; why: string; summary: string }) {
  try {
    const digits = (c.phone || '').replace(/\D/g, '')
    if (digits.length < 7) return
    const tail = digits.slice(-7)
    const { data: all } = await serviceClient.from('crm_contacts').select('id,name,phone').eq('user_id', s.business_id).not('phone', 'is', null).limit(5000)
    const found = (all ?? []).filter(x => String(x.phone).replace(/\D/g, '').endsWith(tail)).slice(0, 1)
    let id = found[0]?.id as string | undefined
    if (!id) {
      const { data: ins } = await serviceClient.from('crm_contacts').insert({ user_id: s.business_id, name: c.name || `Caller ${c.phone}`, phone: c.phone, type: 'contact', source: 'Phone call (AI receptionist)', status: 'prospect', notes: c.why }).select('id').single()
      id = ins?.id
    } else if (c.name && /^Caller /.test(found[0]?.name || '')) {
      await serviceClient.from('crm_contacts').update({ name: c.name }).eq('id', id)
    }
    if (id) await serviceClient.from('crm_activities').insert({ user_id: s.business_id, contact_id: id, type: 'call', subject: c.why, body: c.summary, content: c.summary, logged_by: s.assistant_name || 'AI receptionist' })
  } catch { /* the CRM note is an extra, never break the call */ }
}
