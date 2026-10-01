// Airbnb Inbox: builds the host chats (threads) from the Airbnb message emails
// in the mailboxes a staff member can use. Shared by /api/airbnb-inbox and
// Ask AI (/api/ask-ai). Server-only.
import { serviceClient } from '@/lib/admin-auth'
import { canAccess, type Caller } from '@/lib/mailbox'
import { parseAirbnbEmail, airbnbThreadUrl, airbnbRoomUrl, type AbItem } from '@/lib/airbnb-mail'

export const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export type Stage = 'agreed' | 'declined' | 'question' | 'unclear' | 'waiting' | 'new'
export const AI_STAGES = ['agreed', 'declined', 'question', 'unclear']
export type Thread = {
  key: string; threadId: string | null; host: string | null; listing: string | null; roomId: string | null
  mailboxId: string; mailboxEmail: string; items: AbItem[]; lastAt: string; lastText: string; lastFromHost: string | null
  lastEmailId: string | null; subject: string; status: string; unread: boolean; crmContactId: string | null
  stage: Stage; stageSummary: string | null; stageNext: string | null; needsAnalysis: boolean
  airbnbUrl: string | null; listingUrl: string | null
}

export async function myMailboxes(c: Caller) {
  const { data } = await serviceClient.from('mailboxes').select('*').eq('user_id', c.businessId)
  return (data ?? []).filter(m => canAccess(m, c))
}

export async function buildThreads(c: Caller): Promise<{ threads: Thread[]; mailboxes: any[] }> {
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
      t = { key, threadId: p.threadId, host: p.host, listing: p.listing, roomId: p.roomId, mailboxId: r.mailbox_id, mailboxEmail: mbEmail(r.mailbox_id), items: [], lastAt: r.date, lastText: '', lastFromHost: null, lastEmailId: null, subject: r.subject, status: 'open', unread: false, crmContactId: null, stage: 'new', stageSummary: null, stageNext: null, needsAnalysis: false, airbnbUrl: airbnbThreadUrl(p.threadId), listingUrl: p.roomId ? airbnbRoomUrl(p.roomId) : null }
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
    const all = [...byKey.values()]
    const sameHost = all.filter(x => e.host && x.host && norm(x.host) === norm(e.host))
    let t = all.find(x => e.listing && x.listing && norm(x.listing) === norm(e.listing)) ?? (sameHost.length === 1 ? sameHost[0] : undefined)
    if (!t) {
      const key = 'l:' + norm(e.host || e.listing || e.subject)
      t = byKey.get(key)
      if (!t) { t = { key, threadId: null, host: e.host, listing: e.listing, roomId: e.roomId, mailboxId: e.mailboxId, mailboxEmail: mbEmail(e.mailboxId), items: [], lastAt: e.item.at ?? '', lastText: '', lastFromHost: null, lastEmailId: null, subject: e.subject, status: 'open', unread: false, crmContactId: null, stage: 'new', stageSummary: null, stageNext: null, needsAnalysis: false, airbnbUrl: null, listingUrl: e.roomId ? airbnbRoomUrl(e.roomId) : null }; byKey.set(key, t) }
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
    // where the host stands: AI's reading of their latest message, kept until they write again
    const fresh = !!s?.ai_for && !!t.lastFromHost && new Date(s.ai_for).getTime() >= new Date(t.lastFromHost).getTime()
    const ai = fresh && AI_STAGES.includes(s.ai_stage) ? s.ai_stage as Stage : null
    t.needsAnalysis = !!t.threadId && !!t.lastFromHost && !fresh
    t.stageSummary = fresh ? s.ai_summary ?? null : null
    t.stageNext = fresh ? s.ai_next ?? null : null
    if (!t.lastFromHost) t.stage = t.items.some(x => x.kind === 'you') ? 'waiting' : 'new'
    else if (last?.kind === 'you') t.stage = ai === 'declined' || ai === 'agreed' ? ai : 'waiting'
    else t.stage = ai ?? 'new'
    return t
  }).sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
  return { threads, mailboxes: mbs.map(m => ({ id: m.id, email: m.email, status: m.status })) }
}

