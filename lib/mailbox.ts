// Connected mailboxes (Bluehost or any IMAP/SMTP host): encryption of the
// stored password, access checks, syncing new mail into mailbox_messages,
// and sending through the mailbox's own SMTP server (then filing a copy in
// its Sent folder so it shows in the normal mail app too).
// Server-only: uses the service-role client.
import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer'
import { simpleParser, ParsedMail } from 'mailparser'
import { serviceClient } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

// ---------- password encryption ----------
// AES-256-GCM. Key comes from MAILBOX_SECRET if set, otherwise is derived
// from the service-role key (already a server-only secret). If that key is
// ever rotated without MAILBOX_SECRET set, mailboxes just need reconnecting.
function key() {
  const base = process.env.MAILBOX_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!base) throw new Error('Mailbox encryption key is not configured')
  return crypto.createHash('sha256').update('opero-mailbox:' + base).digest()
}
export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':')
}
export function decrypt(blob: string) {
  const [v, iv, tag, data] = blob.split(':')
  if (v !== 'v1') throw new Error('Unknown password format')
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
}

// ---------- who is calling ----------
export type Caller = { uid: string; email: string; businessId: string; isAdmin: boolean; role: string; name: string }

export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await asUser.auth.getUser(token)
  if (!user) return null
  const email = (user.email ?? '').toLowerCase()
  const { data: tm } = await serviceClient.from('team_members').select('user_id,role,name').eq('email', user.email ?? '').order('created_at', { ascending: false }).limit(1)
  const businessId = tm?.[0]?.user_id ?? user.id
  const isAdmin = businessId === user.id || String(tm?.[0]?.role ?? '').toLowerCase() === 'admin'
  return { uid: user.id, email, businessId, isAdmin, role: String(tm?.[0]?.role ?? ''), name: String(tm?.[0]?.name ?? '').trim() || (user.user_metadata as any)?.name || email }
}

export function canAccess(mb: any, c: Caller) {
  if (mb.user_id !== c.businessId) return false
  if (c.isAdmin) return true
  if ((mb.access ?? []).map((x: string) => x.toLowerCase()).includes(c.email)) return true
  return !!c.role && (mb.access_teams ?? []).map((x: string) => x.toLowerCase()).includes(c.role.toLowerCase())
}

export const PUBLIC_COLS = 'id,user_id,email,display_name,imap_host,imap_port,smtp_host,smtp_port,username,status,last_error,last_synced_at,access,access_teams,use_for_marketing,ai_mode,created_at'

// ---------- connections ----------
export function imapFor(mb: any, password: string) {
  return new ImapFlow({
    host: mb.imap_host, port: mb.imap_port, secure: Number(mb.imap_port) === 993,
    auth: { user: mb.username || mb.email, pass: password },
    logger: false, socketTimeout: 60_000, greetingTimeout: 15_000, connectionTimeout: 15_000,
  } as any)
}
export function smtpFor(mb: any, password: string) {
  return nodemailer.createTransport({
    host: mb.smtp_host, port: mb.smtp_port, secure: Number(mb.smtp_port) === 465,
    auth: { user: mb.username || mb.email, pass: password },
    connectionTimeout: 15_000, greetingTimeout: 15_000,
  })
}

export function friendlyError(e: any): string {
  const m = String(e?.responseText || e?.response || e?.message || e)
  if (/auth|login|credentials|password|535|AUTHENTICATIONFAILED/i.test(m)) return 'The email or password was not accepted by the mail server.'
  if (/ENOTFOUND|getaddrinfo/i.test(m)) return 'Could not find that mail server. Check the server name.'
  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(m)) return 'Could not reach the mail server on that port.'
  if (/certificate|self.signed|altname/i.test(m)) return 'The mail server’s security certificate does not match that server name. Try the server name shown in Bluehost → Email → Connect devices.'
  return m.slice(0, 300)
}

async function findSentPath(client: ImapFlow): Promise<string | null> {
  const list = await client.list()
  const special = list.find((m: any) => m.specialUse === '\\Sent')
  if (special) return special.path
  const byName = list.find((m: any) => /^(inbox[./])?sent( items| messages)?$/i.test(m.path))
  return byName?.path ?? null
}

// ---------- sync ----------
const addr = (a: any) => (a?.value ?? []).map((v: any) => v.name ? `${v.name} <${v.address}>` : v.address).join(', ')

function toRow(mb: any, folder: string, uid: number, parsed: ParsedMail, flags: Set<string> | undefined) {
  const from = parsed.from?.value?.[0]
  const text = (parsed.text ?? '').trim()
  const html = typeof parsed.html === 'string' ? parsed.html : ''
  return {
    user_id: mb.user_id, mailbox_id: mb.id, folder, uid,
    message_id: parsed.messageId ?? null,
    in_reply_to: (parsed.inReplyTo as any) ?? null,
    references_ids: Array.isArray(parsed.references) ? parsed.references.join(' ') : (parsed.references ?? null),
    from_name: from?.name || null, from_email: from?.address?.toLowerCase() || null,
    to_list: addr(parsed.to) || null, cc_list: addr(parsed.cc) || null,
    subject: parsed.subject ?? '(no subject)',
    snippet: text.replace(/\s+/g, ' ').slice(0, 180),
    body_html: html.length > 600_000 ? null : (html || null),
    body_text: text.slice(0, 200_000) || null,
    attachments: (parsed.attachments ?? []).filter(a => a.contentDisposition !== 'inline' || !a.cid).map((a, i) => ({ index: i, filename: a.filename || `attachment-${i + 1}`, size: a.size, contentType: a.contentType })),
    is_bulk: (() => { const h: any = parsed.headers; const auto = String(h?.get?.('auto-submitted') ?? '').toLowerCase(); const prec = String(h?.get?.('precedence') ?? '').toLowerCase(); return !!h?.get?.('list-unsubscribe') || !!h?.get?.('list-id') || (auto !== '' && auto !== 'no') || /bulk|list|junk/.test(prec) })(),
    date: (parsed.date ?? new Date()).toISOString(),
    seen: folder !== 'INBOX' || !!flags?.has('\\Seen'),
  }
}

async function syncFolder(client: ImapFlow, mb: any, folder: 'INBOX' | 'Sent', path: string, state: { validity: number | null; last: number }) {
  const lock = await client.getMailboxLock(path)
  try {
    const box: any = client.mailbox
    const validity = Number(box.uidValidity)
    let last = state.last || 0
    if (state.validity && validity !== state.validity) {
      await serviceClient.from('mailbox_messages').delete().eq('mailbox_id', mb.id).eq('folder', folder)
      last = 0
    }
    if (!box.exists) return { validity, last, added: 0 }
    const range = last === 0 ? `${Math.max(1, box.exists - (folder === 'INBOX' ? 59 : 29))}:*` : `${last + 1}:*`
    const rows: any[] = []
    let maxUid = last
    for await (const msg of client.fetch(range, { uid: true, flags: true, source: true, size: true }, { uid: last !== 0 })) {
      if (!msg.uid || msg.uid <= last) continue
      maxUid = Math.max(maxUid, msg.uid)
      if (rows.length >= 150) continue
      try {
        const parsed = await simpleParser(msg.source as Buffer)
        rows.push(toRow(mb, folder, msg.uid, parsed, msg.flags as any))
      } catch (e) { console.error('[mailbox] parse failed', mb.email, msg.uid, e) }
    }
    // A copy we sent from the portal may already be stored without a uid
    // (servers that don't report one on APPEND): attach the uid to that row
    // instead of adding a duplicate.
    if (folder === 'Sent' && rows.length) {
      const { data: loose } = await serviceClient.from('mailbox_messages').select('id,message_id,uid').eq('mailbox_id', mb.id).eq('folder', 'Sent').is('uid', null)
      for (const l of loose ?? []) {
        const i = rows.findIndex(r => r.message_id && r.message_id === l.message_id)
        if (i >= 0) { await serviceClient.from('mailbox_messages').update({ uid: rows[i].uid }).eq('id', l.id); rows.splice(i, 1) }
      }
    }
    for (let i = 0; i < rows.length; i += 25) {
      const { error } = await serviceClient.from('mailbox_messages').upsert(rows.slice(i, i + 25), { onConflict: 'mailbox_id,folder,uid' })
      if (error) console.error('[mailbox] save failed', error.message)
    }
    return { validity, last: maxUid, added: rows.length }
  } finally { lock.release() }
}

export async function syncMailbox(mb: any): Promise<{ added: number; error?: string }> {
  if (!mb.password_enc) return { added: 0, error: 'Not connected' }
  const client = imapFor(mb, decrypt(mb.password_enc))
  client.on('error', () => {})
  try {
    await client.connect()
    const inbox = await syncFolder(client, mb, 'INBOX', 'INBOX', { validity: mb.inbox_uidvalidity ? Number(mb.inbox_uidvalidity) : null, last: Number(mb.inbox_last_uid) || 0 })
    const patch: any = { inbox_uidvalidity: inbox.validity, inbox_last_uid: inbox.last, last_synced_at: new Date().toISOString(), status: 'connected', last_error: null }
    let added = inbox.added
    const sentPath = mb.sent_path || await findSentPath(client)
    if (sentPath) {
      const sent = await syncFolder(client, mb, 'Sent', sentPath, { validity: mb.sent_uidvalidity ? Number(mb.sent_uidvalidity) : null, last: Number(mb.sent_last_uid) || 0 })
      Object.assign(patch, { sent_path: sentPath, sent_uidvalidity: sent.validity, sent_last_uid: sent.last })
      added += sent.added
    }
    await serviceClient.from('mailboxes').update(patch).eq('id', mb.id)
    return { added }
  } catch (e: any) {
    const msg = friendlyError(e)
    await serviceClient.from('mailboxes').update({ status: /password|accepted/.test(msg) ? 'error' : mb.status, last_error: msg, last_synced_at: new Date().toISOString() }).eq('id', mb.id)
    return { added: 0, error: msg }
  } finally {
    try { await client.logout() } catch {}
  }
}

export async function runMailboxSync() {
  const { data } = await serviceClient.from('mailboxes').select('*').eq('status', 'connected')
  const out: any[] = []
  for (const mb of data ?? []) out.push({ email: mb.email, ...(await syncMailbox(mb)) })
  return out
}

// ---------- test a new connection ----------
export async function testConnection(mb: any, password: string) {
  const client = imapFor(mb, password)
  client.on('error', () => {})
  try { await client.connect(); await client.list() } finally { try { await client.logout() } catch {} }
  await smtpFor(mb, password).verify()
}

// ---------- send ----------
export type Outgoing = { to: string; cc?: string; bcc?: string; subject: string; html?: string; text?: string; inReplyTo?: string | null; references?: string | null; attachments?: { filename: string; content: string; contentType?: string }[]; sentBy?: string }

export async function sendFromMailbox(mb: any, m: Outgoing) {
  const password = decrypt(mb.password_enc)
  const mail: any = {
    from: mb.display_name ? { name: mb.display_name, address: mb.email } : mb.email,
    to: m.to, cc: m.cc || undefined, bcc: m.bcc || undefined, subject: m.subject,
    html: m.html, text: m.text || (m.html ? m.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    inReplyTo: m.inReplyTo || undefined, references: m.references || undefined,
    attachments: (m.attachments ?? []).map(a => ({ filename: a.filename, content: Buffer.from(a.content, 'base64'), contentType: a.contentType })),
  }
  const raw: Buffer = await new Promise((res, rej) => new MailComposer(mail).compile().build((err: any, b: Buffer) => err ? rej(err) : res(b)))
  const all = [m.to, m.cc, m.bcc].filter(Boolean).join(',').split(',').map(s => (s.match(/<([^>]+)>/)?.[1] ?? s).trim()).filter(Boolean)
  await smtpFor(mb, password).sendMail({ envelope: { from: mb.email, to: all }, raw })

  // File a copy in the mailbox's own Sent folder (best effort)
  let uid: number | null = null
  const client = imapFor(mb, password)
  client.on('error', () => {})
  try {
    await client.connect()
    const sentPath = mb.sent_path || await findSentPath(client)
    if (sentPath) {
      const r: any = await client.append(sentPath, raw, ['\\Seen'])
      uid = r?.uid ?? null
      if (!mb.sent_path) await serviceClient.from('mailboxes').update({ sent_path: sentPath }).eq('id', mb.id)
    }
  } catch (e) { console.error('[mailbox] append to Sent failed', mb.email, e) } finally { try { await client.logout() } catch {} }

  const parsed = await simpleParser(raw)
  const row = toRow(mb, 'Sent', uid ?? 0, parsed, undefined)
  const { data } = await serviceClient.from('mailbox_messages').insert({ ...row, uid, date: new Date().toISOString(), sent_by: m.sentBy ?? null }).select('id').single()
  return { id: data?.id as string | undefined }
}

// ---------- server-side message actions ----------
export async function setSeen(mb: any, uid: number, seen: boolean) {
  if (!mb.password_enc || !uid) return
  const client = imapFor(mb, decrypt(mb.password_enc))
  client.on('error', () => {})
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try { seen ? await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }) : await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true }) } finally { lock.release() }
  } catch (e) { console.error('[mailbox] flag failed', e) } finally { try { await client.logout() } catch {} }
}

export async function fetchAttachment(mb: any, folderPath: string, uid: number, index: number) {
  const client = imapFor(mb, decrypt(mb.password_enc))
  client.on('error', () => {})
  try {
    await client.connect()
    const lock = await client.getMailboxLock(folderPath)
    try {
      const msg: any = await client.fetchOne(String(uid), { source: true }, { uid: true })
      if (!msg?.source) return null
      const parsed = await simpleParser(msg.source)
      const list = (parsed.attachments ?? []).filter(a => a.contentDisposition !== 'inline' || !a.cid)
      return list[index] ?? null
    } finally { lock.release() }
  } finally { try { await client.logout() } catch {} }
}
