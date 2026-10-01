import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller, canAccess, sendFromMailbox, fetchReplyTo, importFromSender, friendlyError, type Caller } from '@/lib/mailbox'
import { parseAirbnbEmail, isAirbnbReplyAddress, airbnbThreadUrl, airbnbRoomUrl, type AbItem } from '@/lib/airbnb-mail'
import { addCrmLead } from '@/lib/crm-lead'
import { callClaude } from '@/lib/claude'
import { FAST_MODEL, parseJSON } from '@/lib/receptionist'
import { listScripts } from '@/lib/scripts'
import { scriptsForAi } from '@/lib/scripts-shared'
import { buildThreads, myMailboxes, AI_STAGES, type Stage, type Thread } from '@/lib/airbnb-inbox'

// Airbnb Inbox: the chats our guest-side Airbnb account (e.g. hello@, used to
// message hosts about our services) has with hosts. Built from the Airbnb
// notification emails in the connected mailboxes; replies go to the email's
// Reply-To address, which Airbnb posts into the same chat.
//   GET                         -> threads (+ messages) from mailboxes I can use
//   POST {action: reply|import|crm|status|read|ai_draft|analyse}
// The AI reads each chat and tags where the host stands (agreed / declined /
// has a question / unclear); 'waiting' = we sent the last message.

export const maxDuration = 60
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const STAGE_PROMPT = `You help a property management company's staff track Airbnb outreach. The company messages Airbnb hosts offering to manage their listing (co-hosting / management). Read the chat and say where the HOST stands now, based mainly on the host's latest message in context of what we said before.
Stages:
- "agreed": interested or open to it — e.g. yes, sure, tell me more, send details, happy to chat, "ok"/"when works for you" in reply to our offer of a chat.
- "declined": not interested — e.g. no thanks, not at this time, already managed/covered, we manage it ourselves.
- "question": they ask something specific before deciding (cost, how it works, who we are) without clearly agreeing or declining.
- "unclear": can't tell (very short, off-topic, or about a booking rather than our offer).
Reply ONLY with JSON: {"stage": "agreed"|"declined"|"question"|"unclear", "summary": "max 12 words, what the host said/means", "next": "max 12 words, the next step for staff (e.g. Send 'If they agree' script, Mark done, Answer their question)"}`

async function analyseThread(c: Caller, t: Thread) {
  const convo = t.items.filter(i => i.kind !== 'event').slice(-10).map(i => `${i.kind === 'you' ? 'US' : 'HOST'}: ${i.text}`).join('\n\n')
  const r = await callClaude(STAGE_PROMPT, `Host: ${t.host || 'unknown'} · Listing: ${t.listing || 'unknown'}\n\n${convo}`, 200, FAST_MODEL)
  const out = parseJSON<{ stage: string; summary?: string; next?: string }>(r.text)
  if (!out || !AI_STAGES.includes(out.stage)) return null
  await saveState(c, t.key, { ai_stage: out.stage, ai_summary: String(out.summary ?? '').slice(0, 200) || null, ai_next: String(out.next ?? '').slice(0, 200) || null, ai_for: t.lastFromHost })
  return out.stage
}

async function saveState(c: Caller, key: string, patch: any) {
  await serviceClient.from('airbnb_threads').upsert({ business_id: c.businessId, thread_key: key, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'business_id,thread_key' })
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  return NextResponse.json(await buildThreads(c))
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')

  if (action === 'import') {
    const mbs = (await myMailboxes(c)).filter(m => m.status === 'connected' && (!b.mailbox_id || m.id === b.mailbox_id))
    let added = 0
    for (const m of mbs) {
      try { added += (await importFromSender(m, 'airbnb.com', 365, 150)).added } catch (e: any) { return bad(friendlyError(e), 502) }
    }
    return NextResponse.json({ ok: true, added })
  }

  if (action === 'analyse') {
    // tag chats whose latest host message hasn't been read by the AI yet (a few at a time)
    const { threads: all } = await buildThreads(c)
    const todo = all.filter(x => x.needsAnalysis).slice(0, 12)
    let done = 0
    for (let i = 0; i < todo.length; i += 4) {
      const res = await Promise.all(todo.slice(i, i + 4).map(x => analyseThread(c, x).catch(() => null)))
      done += res.filter(Boolean).length
    }
    return NextResponse.json({ ok: true, done, left: Math.max(0, all.filter(x => x.needsAnalysis).length - todo.length) })
  }

  const { threads } = await buildThreads(c)
  const t = threads.find(x => x.key === String(b.key || ''))
  if (!t) return bad('Conversation not found', 404)

  if (action === 'read') { await saveState(c, t.key, { read_at: new Date().toISOString() }); return NextResponse.json({ ok: true }) }
  if (action === 'status') { await saveState(c, t.key, { status: b.status === 'done' ? 'done' : 'open' }); return NextResponse.json({ ok: true }) }

  if (action === 'reply') {
    const text = String(b.text || '').trim()
    if (!text) return bad('Write a message first')
    if (text.length > 4000) return bad('That message is too long for Airbnb')
    if (!t.lastEmailId) return bad('Reply in Airbnb for this one — there is no message email to answer yet.')
    const { data: orig } = await serviceClient.from('mailbox_messages').select('id,mailbox_id,uid,message_id,references_ids,subject,reply_to').eq('id', t.lastEmailId).maybeSingle()
    const { data: mb } = await serviceClient.from('mailboxes').select('*').eq('id', orig?.mailbox_id ?? '').maybeSingle()
    if (!orig || !mb || !canAccess(mb, c)) return bad('You don’t have access to that mailbox', 403)
    if (mb.status !== 'connected' || !mb.password_enc) return bad(`${mb.email} isn’t connected — reconnect it in Email.`)
    let to = orig.reply_to as string | null
    if (!to) {
      to = await fetchReplyTo(mb, Number(orig.uid))
      if (to) await serviceClient.from('mailbox_messages').update({ reply_to: to }).eq('id', orig.id)
    }
    if (!to || !isAirbnbReplyAddress(to)) return bad('Airbnb didn’t include a reply address on this email — reply in Airbnb instead.')
    try {
      // plain text only: anything else (signature, footer) would show in the Airbnb chat
      await sendFromMailbox(mb, {
        sentBy: c.name, to, subject: /^re:/i.test(orig.subject ?? '') ? orig.subject : `RE: ${orig.subject ?? ''}`, text,
        inReplyTo: orig.message_id, references: [orig.references_ids, orig.message_id].filter(Boolean).join(' ') || null,
      })
    } catch (e: any) { return bad(friendlyError(e), 502) }
    await saveState(c, t.key, { read_at: new Date().toISOString(), status: 'open' })
    return NextResponse.json({ ok: true })
  }

  if (action === 'ai_draft') {
    // Drafts the next message from our scripts; staff check it and press Send.
    // AI sticks to the Airbnb scripts (Facebook / agent / phone scripts are for staff to pick by hand)
    const allAb = await listScripts(c.businessId, 'airbnb')
    const scripts = allAb.some(x => /airbnb/i.test(x.category)) ? allAb.filter(x => /airbnb/i.test(x.category)) : allAb
    const guides = (await listScripts(c.businessId)).filter(x => x.kind === 'guide' && x.ai_use)
    const rules = scriptsForAi([...scripts, ...guides.filter(g => !scripts.some(x => x.id === g.id))])
    if (t.needsAnalysis) { const st2 = await analyseThread(c, t).catch(() => null); if (st2) t.stage = st2 as Stage }
    const STAGE_HINT: Record<string, string> = {
      new: 'The host has not replied yet: this is our opening message (use the open pitch script).',
      agreed: 'The host has AGREED / is interested: use the "If they agree" script.',
      declined: 'The host has DECLINED: use the "If they decline" script. Keep it short and gracious; do not push.',
      question: 'The host has asked a question: answer it using only facts in the scripts, then move towards the "If they agree" information or a quick call.',
      unclear: 'The host\'s position is unclear: reply briefly and ask politely whether they would be open to hearing more.',
      waiting: 'We sent the last message and are waiting for the host: write a short, polite follow-up only.',
    }
    const convo = t.items.slice(-14).map(i => i.kind === 'event' ? `[Airbnb notice: ${i.text}]` : `${i.kind === 'you' ? 'US' : `HOST (${t.host || 'host'})`}: ${i.text}`).join('\n\n')
    const system = `You write Airbnb messages for a property management company's staff. The company messages Airbnb hosts to offer its management services (co-hosting). You are drafting the company's NEXT message to this host, which a staff member will check before sending.
Rules:
- Plain text only, no markdown. Warm, confident, honest, brief. British English.
- Follow the approved scripts below: pick the one that fits where the conversation is (first message, they declined, they agreed/asked for details, etc.).
- When a script fits (opening, agreed, declined), copy it WORD FOR WORD: same headings, same lines, same order, nothing added, removed, shortened or reworded. The only change allowed is filling in the host's first name. Don't add sign-offs or extra sentences.
- Only write your own words for a question, an unclear reply or a follow-up — and then use only facts from the scripts; otherwise say we'll go through it on a quick call.
- Never include phone numbers, email addresses or web links (Airbnb blocks them). Don't invent prices, figures or promises that aren't in the scripts.
- The host's name on Airbnb is: ${t.host || 'unknown'}. Use it (or a first name the host signed with) — never invent one.
- WHERE THINGS STAND: ${STAGE_HINT[t.stage] ?? STAGE_HINT.unclear}${t.stageSummary ? ` (Host: ${t.stageSummary})` : ''}
- Output ONLY the message text.${rules || '\n\n(No scripts have been added yet — write a short, polite reply.)'}`
    const r = await callClaude(system, `Listing: ${t.listing || 'unknown'}\n\nConversation so far (oldest first):\n\n${convo || '(no messages yet — this would be the first message)'}\n\nWrite our next message.`, 900)
    if (!r.text) return bad(r.error ? 'The AI isn’t available right now: ' + r.error.slice(0, 120) : 'The AI couldn’t write a draft', 502)
    const used = scripts.filter(x => x.ai_use && x.kind !== 'guide')
    const draft = r.text.trim().replace(/^["“]|["”]$/g, '')
    // which script it leaned on (best word overlap), shown to staff
    const words = (x: string) => new Set(x.toLowerCase().match(/[a-z]{4,}/g) ?? [])
    const dw = words(draft)
    let best: { name: string; score: number } | null = null
    for (const x of used) { const w = words(x.body); let n = 0; w.forEach(v => { if (dw.has(v)) n++ }); const score = n / Math.max(8, w.size); if (!best || score > best.score) best = { name: x.name, score } }
    return NextResponse.json({ ok: true, draft, stage: t.stage, from: best && best.score > 0.25 ? best.name : null })
  }

  if (action === 'crm') {
    if (t.crmContactId) return NextResponse.json({ ok: true, id: t.crmContactId })
    const name = t.host ? `${t.host} (Airbnb host)` : 'Airbnb host'
    const convo = t.items.filter(i => i.kind !== 'event').slice(-6).map(i => `${i.kind === 'you' ? 'Us' : t.host || 'Host'}: ${i.text}`).join('\n')
    const notes = [`Airbnb host${t.listing ? ` — ${t.listing}` : ''}`, t.listingUrl && `Listing: ${t.listingUrl}`, t.airbnbUrl && `Chat: ${t.airbnbUrl}`, convo && `\n${convo}`].filter(Boolean).join('\n')
    const id = await addCrmLead({ businessId: c.businessId, name, source: 'Airbnb outreach', module: 'str', type: 'landlord', notes, dealName: `${t.host || 'Airbnb host'} — ${t.listing || 'co-hosting'}` })
    await saveState(c, t.key, { crm_contact_id: id })
    return NextResponse.json({ ok: true, id })
  }

  return bad('Unknown action')
}
