import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller, canAccess, sendFromMailbox, fetchReplyTo, importFromSender, friendlyError, type Caller } from '@/lib/mailbox'
import { parseAirbnbEmail, isAirbnbReplyAddress, airbnbThreadUrl, airbnbRoomUrl, type AbItem } from '@/lib/airbnb-mail'
import { addCrmLead } from '@/lib/crm-lead'

// Airbnb Inbox: the chats our guest-side Airbnb account (e.g. hello@, used to
// message hosts about our services) has with hosts. Built from the Airbnb
// notification emails in the connected mailboxes; replies go to the email's
// Reply-To address, which Airbnb posts into the same chat.
//   GET                         -> threads (+ messages) from mailboxes I can use
//   POST {action: reply|import|crm|status|read}

export const maxDuration = 60
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

type Thread = {
  key: string; threadId: string | null; host: string | null; listing: string | null; roomId: string | null
  mailboxId: string; mailboxEmail: string; items: AbItem[]; lastAt: string; lastText: string; lastFromHost: string | null
  lastEmailId: string | null; subject: string; status: string; unread: boolean; crmContactId: string | null
  airbnbUrl: string | null; listingUrl: string | null
}

async function myMailboxes(c: Caller) {
  const { data } = await serviceClient.from('mailboxes').select('*').eq('user_id', c.businessId)
  return (data ?? []).filter(m => canAccess(m, c))
}

async function buildThreads(c: Caller): Promise<{ threads: Thread[]; mailboxes: any[] }> {
  const mbs = await myMailboxes(c)
  if (!mbs.length) return { threads: [], mailboxes: [] }
  const ids = mbs.map(m => m.id)
  const [{ data: inbound }, { data: sent }, { data: state }] = await Promise.all([
    serviceClient.from('mailbox_messages').select('id,mailbox_id,uid,message_id,from_email,subject,body_text,date,reply_to').in('mailbox_id', ids).eq('folder', 'INBOX').ilike('from_email', '%airbnb.com').order('date', { ascending: true }).limit(1500),
    serviceClient.from('mailbox_messages').select('id,mailbox_id,in_reply_to,to_list,body_text,date,sent_by').in('mailbox_id', ids).eq('folder', 'Sent').ilike('to_list', '%airbnb.com%').order('date', { ascending: true }).limit(1000),
    serviceClient.from('airbnb_threads').select('*').eq('business_id', c.businessId),
  ])
  const byKey = new Map<string, Thread>()
  const msgIdToKey = new Map<string, string>()
  const looseEvents: { listing: string | null; host: string | null; item: AbItem; mailboxId: string; roomId: string | null; subject: string }[] = []
  const mbEmail = (id: string) => mbs.find(m => m.id === id)?.email ?? ''

  for (const r of inbound ?? []) {
    const p = parseAirbnbEmail(r)
    if (!p || !p.items.length) continue
    if (!p.threadId) { for (const it of p.items) looseEvents.push({ listing: p.listing, host: p.host, item: it, mailboxId: r.mailbox_id, roomId: p.roomId, subject: r.subject }); continue }
    const key = p.threadId
    let t = byKey.get(key)
    if (!t) {
      t = { key, threadId: p.threadId, host: p.host, listing: p.listing, roomId: p.roomId, mailboxId: r.mailbox_id, mailboxEmail: mbEmail(r.mailbox_id), items: [], lastAt: r.date, lastText: '', lastFromHost: null, lastEmailId: null, subject: r.subject, status: 'open', unread: false, crmContactId: null, airbnbUrl: airbnbThreadUrl(p.threadId), listingUrl: p.roomId ? airbnbRoomUrl(p.roomId) : null }
      byKey.set(key, t)
    }
    t.host ||= p.host; t.listing ||= p.listing; t.roomId ||= p.roomId
    if (r.message_id) msgIdToKey.set(r.message_id, key)
    for (const it of p.items) {
      // quoted earlier messages: skip if we already show that text
      if (it.at === null && t.items.some(x => norm(x.text) === norm(it.text))) continue
      if (it.kind === 'event' && t.items.some(x => x.kind === 'event' && x.text === it.text)) continue
      t.items.push(it)
    }
    if (p.items.some(i => i.kind === 'host' && i.at)) { t.lastEmailId = r.id; t.subject = r.subject; t.mailboxId = r.mailbox_id; t.mailboxEmail = mbEmail(r.mailbox_id) }
    if (r.date >= t.lastAt) t.lastAt = r.date
  }
  // our replies sent from the portal
  for (const s of sent ?? []) {
    const key = s.in_reply_to ? msgIdToKey.get(s.in_reply_to) : undefined
    const t = key ? byKey.get(key) : undefined
    if (!t) continue
    const text = (s.body_text ?? '').trim()
    if (!text) continue
    // the host's next email quotes it back as "You: …" — keep the timed copy
    t.items = t.items.filter(x => !(x.kind === 'you' && x.at === null && norm(x.text) === norm(text)))
    t.items.push({ kind: 'you', text, at: s.date, emailId: s.id, sentBy: s.sent_by })
    if (s.date >= t.lastAt) t.lastAt = s.date
  }
  // booking invitations etc. without a chat link: attach by listing (or host)
  for (const e of looseEvents) {
    let t = [...byKey.values()].find(x => e.listing && x.listing && norm(x.listing) === norm(e.listing)) ?? [...byKey.values()].find(x => e.host && x.host && norm(x.host) === norm(e.host) && !e.listing)
    if (!t) {
      const key = 'l:' + norm(e.listing || e.host || e.subject)
      t = byKey.get(key)
      if (!t) { t = { key, threadId: null, host: e.host, listing: e.listing, roomId: e.roomId, mailboxId: e.mailboxId, mailboxEmail: mbEmail(e.mailboxId), items: [], lastAt: e.item.at ?? '', lastText: '', lastFromHost: null, lastEmailId: null, subject: e.subject, status: 'open', unread: false, crmContactId: null, airbnbUrl: null, listingUrl: e.roomId ? airbnbRoomUrl(e.roomId) : null }; byKey.set(key, t) }
    }
    if (t.items.some(x => x.kind === 'event' && x.text === e.item.text)) continue
    t.items.push(e.item)
    if ((e.item.at ?? '') > t.lastAt) t.lastAt = e.item.at ?? t.lastAt
  }

  const st = new Map((state ?? []).map(s => [s.thread_key, s]))
  const threads = [...byKey.values()].map(t => {
    // undated quotes sit just before the message that quoted them
    const timed: AbItem[] = []
    let pending: AbItem[] = []
    for (const it of t.items) { if (it.at === null) pending.push(it); else { timed.push(...pending.map(p => ({ ...p, at: null, _before: it.at } as any)), it); pending = [] } }
    timed.push(...pending)
    const sortAt = (x: any) => x.at ?? x._before ?? ''
    t.items = timed.map((x, i) => ({ x, i })).sort((a, b) => sortAt(a.x) < sortAt(b.x) ? -1 : sortAt(a.x) > sortAt(b.x) ? 1 : a.i - b.i).map(({ x }) => { const { _before, ...rest } = x as any; return rest })
    const last = [...t.items].reverse().find(x => x.kind !== 'event') ?? t.items[t.items.length - 1]
    t.lastText = last?.text ?? ''
    const lastHost = [...t.items].reverse().find(x => x.kind === 'host' && x.at)
    t.lastFromHost = lastHost?.at ?? null
    const s = st.get(t.key)
    t.status = s?.status ?? 'open'
    t.crmContactId = s?.crm_contact_id ?? null
    t.unread = !!t.lastFromHost && (!s?.read_at || s.read_at < t.lastFromHost) && last?.kind === 'host'
    return t
  }).sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
  return { threads, mailboxes: mbs.map(m => ({ id: m.id, email: m.email, status: m.status })) }
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
