import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { processNewEmails } from '@/lib/receptionist'
import { getCaller, canAccess, PUBLIC_COLS, encrypt, testConnection, syncMailbox, sendFromMailbox, setSeen, fetchAttachment, friendlyError } from '@/lib/mailbox'

// Everything about connected mailboxes goes through here so access is
// checked server-side and passwords never reach the browser.
//   GET  ?                       -> mailboxes I can use (+ unread counts, team list for admins)
//   GET  ?messages=<id|all>&folder=INBOX|Sent&q=&before=  -> message list
//   GET  ?message=<id>           -> one message (marks it read)
//   GET  ?attachment=<id>&index= -> attachment file
//   POST {action: connect|update|sync|send|seen|add|remove}

export const maxDuration = 60

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function loadMailbox(id: string) {
  const { data } = await serviceClient.from('mailboxes').select('*').eq('id', id).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const sp = req.nextUrl.searchParams

  if (sp.get('attachment')) {
    const { data: m } = await serviceClient.from('mailbox_messages').select('*').eq('id', sp.get('attachment')!).maybeSingle()
    if (!m) return bad('Not found', 404)
    const mb = await loadMailbox(m.mailbox_id)
    if (!mb || !canAccess(mb, c)) return bad('Not allowed', 403)
    if (!m.uid) return bad('This attachment is not available', 404)
    const path = m.folder === 'Sent' ? (mb.sent_path || 'Sent') : 'INBOX'
    const a = await fetchAttachment(mb, path, Number(m.uid), Number(sp.get('index') || 0)).catch(() => null)
    if (!a) return bad('Attachment not found', 404)
    return new NextResponse(new Uint8Array(a.content), { headers: { 'Content-Type': a.contentType || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${(a.filename || 'attachment').replace(/"/g, '')}"` } })
  }

  if (sp.get('message')) {
    const { data: m } = await serviceClient.from('mailbox_messages').select('*').eq('id', sp.get('message')!).maybeSingle()
    if (!m) return bad('Not found', 404)
    const mb = await loadMailbox(m.mailbox_id)
    if (!mb || !canAccess(mb, c)) return bad('Not allowed', 403)
    if (!m.seen) {
      await serviceClient.from('mailbox_messages').update({ seen: true }).eq('id', m.id)
      if (m.folder === 'INBOX') setSeen(mb, Number(m.uid), true).catch(() => {})
    }
    return NextResponse.json({ message: { ...m, seen: true } })
  }

  const { data: all } = await serviceClient.from('mailboxes').select(PUBLIC_COLS).eq('user_id', c.businessId).order('email')
  const mine = (all ?? []).filter(mb => canAccess(mb, c))

  if (sp.get('messages')) {
    const which = sp.get('messages')!
    const ids = which === 'all' ? mine.map(m => m.id) : mine.filter(m => m.id === which).map(m => m.id)
    if (!ids.length) return NextResponse.json({ messages: [] })
    let q = serviceClient.from('mailbox_messages').select('id,mailbox_id,folder,from_name,from_email,to_list,subject,snippet,date,seen,attachments,ai_category,ai_status').in('mailbox_id', ids).eq('folder', sp.get('folder') || 'INBOX').order('date', { ascending: false }).limit(60)
    if (sp.get('before')) q = q.lt('date', sp.get('before')!)
    if (sp.get('unread') === '1') q = q.eq('seen', false)
    const term = (sp.get('q') || '').trim().replace(/[%,()]/g, ' ')
    if (term) q = q.or(`subject.ilike.%${term}%,from_email.ilike.%${term}%,from_name.ilike.%${term}%,to_list.ilike.%${term}%,snippet.ilike.%${term}%`)
    const { data, error } = await q
    if (error) return bad(error.message, 500)
    return NextResponse.json({ messages: (data ?? []).map(m => ({ ...m, has_attachments: (m.attachments ?? []).length > 0, attachments: undefined })) })
  }

  const unread: Record<string, number> = {}
  await Promise.all(mine.map(async mb => {
    const { count } = await serviceClient.from('mailbox_messages').select('id', { count: 'exact', head: true }).eq('mailbox_id', mb.id).eq('folder', 'INBOX').eq('seen', false)
    unread[mb.id] = count ?? 0
  }))
  let team: any[] = []
  if (c.isAdmin) {
    const { data } = await serviceClient.from('team_members').select('name,email,role').eq('user_id', c.businessId).order('name')
    team = data ?? []
  }
  return NextResponse.json({ mailboxes: mine.map(m => ({ ...m, unread: unread[m.id] ?? 0 })), isAdmin: c.isAdmin, team })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const body = await req.json().catch(() => ({}))
  const action = body.action

  if (action === 'add') {
    if (!c.isAdmin) return bad('Only admins can add mailboxes', 403)
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Enter a valid email address')
    const domain = email.split('@')[1]
    const { data, error } = await serviceClient.from('mailboxes').insert({ user_id: c.businessId, email, display_name: body.display_name || null, imap_host: `mail.${domain}`, smtp_host: `mail.${domain}` }).select(PUBLIC_COLS).single()
    if (error) return bad(/duplicate/.test(error.message) ? 'That address is already added' : error.message)
    return NextResponse.json({ mailbox: data })
  }

  const mb = body.id ? await loadMailbox(body.id) : null
  if (action !== 'sync' && (!mb || !canAccess(mb, c))) return bad('Mailbox not found', 404)

  if (action === 'connect') {
    if (!c.isAdmin) return bad('Only admins can connect mailboxes', 403)
    if (!body.password) return bad('Enter the mailbox password')
    const cfg = {
      ...mb,
      imap_host: String(body.imap_host || mb.imap_host).trim(), imap_port: Number(body.imap_port || mb.imap_port),
      smtp_host: String(body.smtp_host || mb.smtp_host).trim(), smtp_port: Number(body.smtp_port || mb.smtp_port),
      username: String(body.username || '').trim() || null,
    }
    try { await testConnection(cfg, body.password) } catch (e: any) {
      await serviceClient.from('mailboxes').update({ last_error: friendlyError(e) }).eq('id', mb.id)
      return bad(friendlyError(e))
    }
    const patch = { imap_host: cfg.imap_host, imap_port: cfg.imap_port, smtp_host: cfg.smtp_host, smtp_port: cfg.smtp_port, username: cfg.username, password_enc: encrypt(body.password), status: 'connected', last_error: null, inbox_last_uid: 0, inbox_uidvalidity: null, sent_last_uid: 0, sent_uidvalidity: null, sent_path: null }
    await serviceClient.from('mailbox_messages').delete().eq('mailbox_id', mb.id)
    await serviceClient.from('mailboxes').update(patch).eq('id', mb.id)
    const r = await syncMailbox({ ...mb, ...patch })
    return NextResponse.json({ ok: true, synced: r.added, error: r.error })
  }

  if (action === 'update') {
    if (!c.isAdmin) return bad('Only admins can change mailboxes', 403)
    const patch: any = {}
    if (body.display_name !== undefined) patch.display_name = body.display_name || null
    if (Array.isArray(body.access)) patch.access = body.access.map((x: string) => String(x).toLowerCase())
    if (body.use_for_marketing !== undefined) patch.use_for_marketing = !!body.use_for_marketing
    if (['off', 'draft', 'auto'].includes(body.ai_mode)) patch.ai_mode = body.ai_mode
    if (body.disconnect) Object.assign(patch, { password_enc: null, status: 'not_connected', last_error: null })
    if (body.email && body.email !== mb.email) {
      if (mb.status === 'connected') return bad('Disconnect the mailbox before changing its address')
      patch.email = String(body.email).trim().toLowerCase()
    }
    const { error } = await serviceClient.from('mailboxes').update(patch).eq('id', mb.id)
    if (error) return bad(error.message)
    if (body.disconnect) await serviceClient.from('mailbox_messages').delete().eq('mailbox_id', mb.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove') {
    if (!c.isAdmin) return bad('Only admins can remove mailboxes', 403)
    await serviceClient.from('mailboxes').delete().eq('id', mb.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'sync') {
    let list: any[]
    if (mb) { if (!canAccess(mb, c)) return bad('Not allowed', 403); list = [mb] }
    else {
      const { data } = await serviceClient.from('mailboxes').select('*').eq('user_id', c.businessId).eq('status', 'connected')
      list = (data ?? []).filter(m => canAccess(m, c))
    }
    const fresh = Date.now() - 45_000
    const due = list.filter(m => m.status === 'connected' && (body.force || !m.last_synced_at || new Date(m.last_synced_at).getTime() < fresh))
    const results = await Promise.all(due.map(async m => { const r = await syncMailbox(m); if (!r.error) await processNewEmails(m, 2).catch(() => {}); return { id: m.id, ...r } }))
    return NextResponse.json({ results })
  }

  if (action === 'seen') {
    const { data: m } = await serviceClient.from('mailbox_messages').select('id,uid,folder,mailbox_id').eq('id', body.message_id).eq('mailbox_id', mb.id).maybeSingle()
    if (!m) return bad('Not found', 404)
    await serviceClient.from('mailbox_messages').update({ seen: !!body.seen }).eq('id', m.id)
    if (m.folder === 'INBOX') await setSeen(mb, Number(m.uid), !!body.seen)
    return NextResponse.json({ ok: true })
  }

  if (action === 'send') {
    if (mb.status !== 'connected' || !mb.password_enc) return bad('That mailbox is not connected yet')
    if (!body.to || !body.subject) return bad('Add a recipient and a subject')
    let inReplyTo: string | null = null, references: string | null = null
    if (body.reply_to_message_id) {
      const { data: orig } = await serviceClient.from('mailbox_messages').select('message_id,references_ids,mailbox_id').eq('id', body.reply_to_message_id).maybeSingle()
      if (orig && orig.mailbox_id === mb.id && orig.message_id) { inReplyTo = orig.message_id; references = [orig.references_ids, orig.message_id].filter(Boolean).join(' ') }
    }
    try {
      const r = await sendFromMailbox(mb, { to: body.to, cc: body.cc, bcc: body.bcc, subject: body.subject, html: body.html, text: body.text, inReplyTo, references, attachments: body.attachments })
      return NextResponse.json({ ok: true, id: r.id })
    } catch (e: any) { return bad(friendlyError(e), 502) }
  }

  return bad('Unknown action')
}
