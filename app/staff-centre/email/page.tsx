'use client'
// Email: the company's real mailboxes (Bluehost IMAP/SMTP) inside the portal.
// Read the inbox, reply, forward and compose from any connected address;
// admins connect mailboxes and choose which staff can see each one.
// All mail goes through /api/mailboxes, which checks access server-side.
// New emails open pre-filled with the chosen email template (greeting, sign-off)
// and its branded footer is added on send -- admins manage templates under
// Mailbox settings → Email templates; staff pick one when writing.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, Modal, Pill, Avatar, btn, input, label } from '../../../components/crm/Page'
import { DEFAULT_FORMAT, footerHtml, type EmailTemplate } from '../../../lib/email-format-shared'

async function api(path: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/mailboxes' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Something went wrong')
  return d
}

const CAT_COLOR: Record<string, string> = { Enquiry: '#579BFC', Booking: '#00C875', Viewing: '#9D50DD', Maintenance: '#FDAB3D', Tenant: '#66CCFF', Landlord: '#784BD1', Invoice: '#C4C4C4', 'Job application': '#037F4C', Complaint: '#DF2F4A', Spam: '#9699A6' }
const COLORS = ['#D0AE4C', '#579BFC', '#00C875', '#9D50DD', '#FDAB3D', '#DF2F4A', '#66CCFF', '#784BD1', '#FF7575', '#037F4C', '#BB3354']
const colorFor = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length] }
function when(d: string) {
  const t = new Date(d), now = new Date()
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (now.getTime() - t.getTime() < 6 * 864e5) return t.toLocaleDateString('en-GB', { weekday: 'short' })
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(t.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
const kb = (n: number) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'

type Draft = { from: string; to: string; cc: string; subject: string; body: string; template_id?: string; footer_override?: string | null; footerRev?: number; toName?: string | null; reply_to_message_id?: string; quoted?: string; files: { filename: string; content: string; contentType: string; size: number }[] }

export default function EmailPage() {
  const [loading, setLoading] = useState(true)
  const [boxes, setBoxes] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [team, setTeam] = useState<any[]>([])
  const [view, setView] = useState<'mail' | 'settings' | 'templates'>('mail')
  const [box, setBox] = useState<string>('all')
  const [folder, setFolder] = useState<'INBOX' | 'Sent'>('INBOX')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [msg, setMsg] = useState<any | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [sending, setSending] = useState(false)
  const [connectFor, setConnectFor] = useState<any | null>(null)
  const [accessFor, setAccessFor] = useState<any | null>(null)
  const [toast, setToast] = useState('')
  const [templates, setTemplates] = useState<EmailTemplate[]>([{ ...DEFAULT_FORMAT, id: '', name: 'Standard', is_default: true }])
  const [me, setMe] = useState<{ name: string }>({ name: '' })
  const reqId = useRef(0)

  const connected = boxes.filter(b => b.status === 'connected')
  const byId = (id: string) => boxes.find(b => b.id === id)
  const current = box === 'all' ? null : byId(box)
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 5000) }

  async function loadBoxes() {
    const d = await api('')
    setBoxes(d.mailboxes); setIsAdmin(d.isAdmin); setTeam(d.team ?? [])
    if (d.templates?.length) setTemplates(d.templates); if (d.me) setMe(d.me)
    return d.mailboxes as any[]
  }
  async function loadList() {
    const my = ++reqId.current
    setListLoading(true)
    try {
      const params = new URLSearchParams({ messages: box, folder, ...(q ? { q } : {}), ...(unreadOnly ? { unread: '1' } : {}) })
      const d = await api('?' + params.toString())
      if (my === reqId.current) setList(d.messages)
    } catch (e: any) { if (my === reqId.current) setList([]) }
    if (my === reqId.current) setListLoading(false)
  }
  async function sync(force = false, id?: string) {
    setSyncing(true)
    try { await api('', { action: 'sync', force, id }) } catch {}
    setSyncing(false)
    await Promise.all([loadBoxes(), loadList()])
  }

  useEffect(() => { (async () => { try { await loadBoxes() } catch (e: any) { flash(e.message) } setLoading(false); sync() })() }, [])
  useEffect(() => { if (!loading) loadList() }, [box, folder, unreadOnly, loading])
  useEffect(() => { const t = setTimeout(() => { if (!loading) loadList() }, 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { const t = setInterval(() => sync(), 90_000); return () => clearInterval(t) }, [box, folder])

  async function open(m: any) {
    setOpenId(m.id); setMsg(null)
    try {
      const d = await api('?message=' + m.id)
      setMsg(d.message)
      if (!m.seen) { setList(l => l.map(x => x.id === m.id ? { ...x, seen: true } : x)); setBoxes(bs => bs.map(b => b.id === m.mailbox_id && m.folder === 'INBOX' ? { ...b, unread: Math.max(0, b.unread - 1) } : b)) }
    } catch (e: any) { flash(e.message) }
  }
  async function markUnread() {
    if (!msg) return
    await api('', { action: 'seen', id: msg.mailbox_id, message_id: msg.id, seen: false }).catch(() => {})
    setList(l => l.map(x => x.id === msg.id ? { ...x, seen: false } : x))
    setBoxes(bs => bs.map(b => b.id === msg.mailbox_id ? { ...b, unread: b.unread + 1 } : b))
    setOpenId(null); setMsg(null)
  }
  async function download(m: any, a: any) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/mailboxes?attachment=${m.id}&index=${a.index}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
    if (!res.ok) { flash('Could not download that attachment'); return }
    const url = URL.createObjectURL(await res.blob())
    const el = document.createElement('a'); el.href = url; el.download = a.filename; el.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const defaultT = templates.find(t => t.is_default) || templates[0]
  const tpl = (id?: string) => templates.find(t => t.id === id) || defaultT

  // Pre-filled body from a template: greeting, space to write, sign-off, name.
  function formatted(toName?: string | null, format: EmailTemplate = defaultT) {
    const first = toName && !toName.includes('@') ? toName.replace(/["']/g, '').trim().split(/\s+/)[0] : ''
    const greeting = format.greeting.replace('{name}', first).replace(/\s+,/, ' ,').replace(/ {2,}/g, ' ')
    const signName = format.sign_name && me.name && !me.name.includes('@') ? '\n' + me.name : ''
    return `${greeting}\n\n\n\n${format.closing}${signName}`
  }

  function compose(kind: 'new' | 'reply' | 'replyAll' | 'forward') {
    const fromId = (msg && byId(msg.mailbox_id)?.status === 'connected') ? msg.mailbox_id : (current?.status === 'connected' ? current.id : connected[0]?.id)
    if (!fromId) { flash('Connect a mailbox first (Mailbox settings).'); return }
    if (kind === 'new' || !msg) { setDraft({ from: fromId, to: '', cc: '', subject: '', body: formatted(), template_id: defaultT.id, files: [] }); return }
    const me = (byId(msg.mailbox_id)?.email ?? '').toLowerCase()
    const sender = msg.from_name ? `${msg.from_name} <${msg.from_email}>` : msg.from_email
    const others = [msg.to_list, msg.cc_list].filter(Boolean).join(', ').split(',').map((s: string) => s.trim()).filter((s: string) => s && !s.toLowerCase().includes(me))
    const quoted = `On ${new Date(msg.date).toLocaleString('en-GB')}, ${sender} wrote:`
    const subj = msg.subject || ''
    if (kind === 'forward') {
      setDraft({ from: fromId, to: '', cc: '', subject: /^fwd?:/i.test(subj) ? subj : 'Fwd: ' + subj, body: formatted(), template_id: defaultT.id, quoted: `---------- Forwarded message ----------\nFrom: ${sender}\nDate: ${new Date(msg.date).toLocaleString('en-GB')}\nSubject: ${subj}\nTo: ${msg.to_list ?? ''}\n\n${msg.body_text ?? ''}`, files: [] })
    } else {
      setDraft({ from: fromId, to: msg.folder === 'Sent' ? (msg.to_list ?? '') : sender, cc: kind === 'replyAll' ? others.join(', ') : '', subject: /^re:/i.test(subj) ? subj : 'Re: ' + subj, body: formatted(msg.folder === 'Sent' ? null : msg.from_name), template_id: defaultT.id, toName: msg.folder === 'Sent' ? null : msg.from_name, reply_to_message_id: msg.id, quoted: `${quoted}\n${(msg.body_text ?? '').split('\n').map((l: string) => '> ' + l).join('\n')}`, files: [] })
    }
  }

  async function send() {
    if (!draft) return
    if (!draft.to.trim()) { flash('Add who it’s going to.'); return }
    setSending(true)
    try {
      // The server wraps this in the chosen template (branded footer) before sending
      await api('', { action: 'send', id: draft.from, template_id: draft.template_id || null, footer_override: draft.footer_override || null, to: draft.to, cc: draft.cc, subject: draft.subject || '(no subject)', body_text: draft.body, quoted_text: draft.quoted || null, reply_to_message_id: draft.reply_to_message_id, attachments: draft.files.map(f => ({ filename: f.filename, content: f.content, contentType: f.contentType })) })
      setDraft(null)
      flash('Sent from ' + byId(draft.from)?.email)
      if (folder === 'Sent') loadList()
    } catch (e: any) { flash(e.message) }
    setSending(false)
  }

  async function addFiles(files: FileList | null) {
    if (!files || !draft) return
    const added: Draft['files'] = []
    for (const f of Array.from(files)) {
      const b64: string = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1] ?? ''); fr.readAsDataURL(f) })
      added.push({ filename: f.name, content: b64, contentType: f.type || 'application/octet-stream', size: f.size })
    }
    const total = [...draft.files, ...added].reduce((s, f) => s + f.size, 0)
    if (total > 15 * 1048576) { flash('Attachments are limited to 15 MB per email.'); return }
    setDraft({ ...draft, files: [...draft.files, ...added] })
  }

  const totalUnread = boxes.reduce((s, b) => s + (b.unread || 0), 0)
  const frameDoc = useMemo(() => {
    if (!msg) return ''
    const body = msg.body_html || `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${esc(msg.body_text || '')}</pre>`
    return `<!doctype html><html><head><base target="_blank"><meta charset="utf-8"><style>body{font-family:Figtree,Arial,sans-serif;font-size:14px;line-height:1.55;color:#323338;margin:0;padding:4px 2px;word-wrap:break-word}img{max-width:100%;height:auto}table{max-width:100%}a{color:#A8862E}blockquote{border-left:2px solid #D0D4E4;margin:8px 0;padding-left:10px;color:#676879}</style></head><body>${body}</body></html>`
  }, [msg])

  if (loading) return <CrmPage><div style={{ padding: 60, color: C.faint }}>Loading email…</div></CrmPage>

  const NavItem = ({ on, onClick, children, count, dot }: any) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: on ? '1px solid ' + C.gold : '1px solid transparent', borderRadius: 4, background: on ? C.cream : 'transparent', color: C.ink, fontSize: 13.5, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 2 }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      {count > 0 && <span style={{ background: C.red, color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '1px 7px' }}>{count}</span>}
    </button>
  )

  return (
    <CrmPage fill>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Workspace nav */}
        <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid ' + C.row, padding: '16px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#fff' }}>
          <div style={{ fontSize: 13, color: C.muted, padding: '0 6px 6px' }}>Workspace</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid ' + C.border, borderRadius: 4, padding: '7px 10px', marginBottom: 12 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: C.gold, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>E</span>
            <span style={{ fontSize: 14 }}>Email</span>
          </div>
          <button onClick={() => compose('new')} style={{ ...btn('gold'), justifyContent: 'center', marginBottom: 14 }}>+ New email</button>
          <div style={{ fontSize: 12, color: C.muted, padding: '0 6px 4px' }}>Folders</div>
          <NavItem on={view === 'mail' && folder === 'INBOX'} onClick={() => { setView('mail'); setFolder('INBOX'); setOpenId(null); setMsg(null) }} count={box === 'all' ? totalUnread : (current?.unread ?? 0)}>Inbox</NavItem>
          <NavItem on={view === 'mail' && folder === 'Sent'} onClick={() => { setView('mail'); setFolder('Sent'); setOpenId(null); setMsg(null) }}>Sent</NavItem>
          <div style={{ fontSize: 12, color: C.muted, padding: '12px 6px 4px' }}>Mailboxes</div>
          <NavItem on={view === 'mail' && box === 'all'} onClick={() => { setView('mail'); setBox('all'); setOpenId(null); setMsg(null) }} count={totalUnread}>All mailboxes</NavItem>
          {boxes.map(b => (
            <NavItem key={b.id} on={view === 'mail' && box === b.id} onClick={() => { setView('mail'); setBox(b.id); setOpenId(null); setMsg(null) }} count={b.unread} dot={b.status === 'connected' ? colorFor(b.email) : C.grey}>
              <span title={b.email}>{b.email.split('@')[0]}</span>
            </NavItem>
          ))}
          {boxes.length === 0 && <div style={{ fontSize: 12.5, color: C.faint, padding: '4px 8px' }}>No mailboxes shared with you yet.</div>}
          <div style={{ flex: 1 }} />
          <NavItem on={view === 'templates'} onClick={() => setView('templates')}>Email templates</NavItem>
          {isAdmin && <NavItem on={view === 'settings'} onClick={() => setView('settings')}>Mailbox settings</NavItem>}
          <div style={{ fontSize: 12, color: C.faint, padding: '8px 8px 0' }}>{connected.length} of {boxes.length} connected{syncing ? ' · checking…' : ''}</div>
        </div>

        {view === 'templates' ? (
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine }}>
              <h1 style={{ fontSize: 26, fontWeight: 500, color: C.brown, margin: '0 0 2px' }}>Email templates</h1>
              <div style={{ fontSize: 13, color: '#8A7248', maxWidth: 760, lineHeight: 1.5 }}>The opening line, sign-off and footer that go on every email. Click any words in the preview to change them, then save. You can also change the footer for a single email while writing it.</div>
            </div>
            <div style={{ padding: '20px 28px 40px' }}>
              <TemplatesEditor templates={templates} onChange={setTemplates} flash={flash} sampleEmail={connected[0]?.email ?? 'hello@sangstersgroup.com'} isAdmin={isAdmin} />
            </div>
          </div>
        ) : view === 'settings' ? (
          <Settings boxes={boxes} team={team} onConnect={setConnectFor} onAccess={setAccessFor} reload={loadBoxes} flash={flash} templates={templates} onTemplates={setTemplates} sampleEmail={connected[0]?.email ?? 'hello@sangstersgroup.com'} />
        ) : (
          <>
            {/* Message list */}
            <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid ' + C.row, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff' }}>
              <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid ' + C.row }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder === 'Sent' ? 'Sent' : 'Inbox'} <span style={{ fontSize: 14, color: C.faint }}>{current ? current.email.split('@')[0] : 'all'}</span></h1>
                  <button onClick={() => sync(true, current?.id)} title="Check for new mail" style={{ ...btn('ghost', true), padding: '5px 9px' }}>{syncing ? '…' : '↻'}</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search mail" style={{ ...input, fontSize: 13, padding: '6px 10px' }} />
                  {folder === 'INBOX' && <button onClick={() => setUnreadOnly(u => !u)} style={{ ...btn(unreadOnly ? 'gold' : 'ghost', true) }}>Unread</button>}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {current && current.status !== 'connected' ? (
                  <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
                    <div style={{ fontWeight: 600, color: C.ink, marginBottom: 6 }}>{current.email} isn’t connected yet</div>
                    {current.last_error && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{current.last_error}</div>}
                    {isAdmin ? <button onClick={() => setConnectFor(current)} style={btn('gold')}>Connect mailbox</button> : 'Ask an admin to connect it.'}
                  </div>
                ) : list.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: C.faint, fontSize: 14 }}>{listLoading ? 'Loading…' : connected.length === 0 ? (isAdmin ? 'No mailboxes connected yet. Open Mailbox settings to connect one.' : 'No mailboxes connected yet.') : q ? 'Nothing matches your search.' : 'No emails here.'}</div>
                ) : list.map(m => {
                  const who = folder === 'Sent' ? ('To: ' + (m.to_list || '—')) : (m.from_name || m.from_email || 'Unknown')
                  const by = folder === 'Sent' && m.sent_by ? m.sent_by : null
                  const on = m.id === openId
                  const mbx = byId(m.mailbox_id)
                  return (
                    <div key={m.id} onClick={() => open(m)} style={{ padding: '10px 14px 10px 12px', borderBottom: '1px solid ' + C.row, cursor: 'pointer', background: on ? C.cream : '#fff', borderLeft: '3px solid ' + (on ? C.goldDark : !m.seen ? C.blue : 'transparent') }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: m.seen ? 400 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</span>
                        {m.has_attachments && <span title="Has attachments" style={{ fontSize: 12, color: C.faint }}>📎</span>}
                        <span style={{ fontSize: 12, color: m.seen ? C.faint : C.blue, flexShrink: 0 }}>{when(m.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: m.seen ? 400 : 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject || '(no subject)'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {box === 'all' && mbx && <span style={{ fontSize: 11, color: '#fff', background: colorFor(mbx.email), borderRadius: 3, padding: '1px 6px', flexShrink: 0 }}>{mbx.email.split('@')[0]}</span>}
                        {m.ai_category && m.ai_category !== 'Other' && <span style={{ fontSize: 11, color: '#fff', background: CAT_COLOR[m.ai_category] ?? C.grey, borderRadius: 3, padding: '1px 6px', flexShrink: 0 }}>{m.ai_category}</span>}
                        {m.ai_status === 'drafted' && <span title="AI reply ready" style={{ fontSize: 11, color: C.goldDark, border: '1px solid ' + C.gold, borderRadius: 3, padding: '0 5px', flexShrink: 0 }}>AI draft</span>}
                        {m.ai_status === 'replied' && <span title="AI replied" style={{ fontSize: 11, color: '#00854D', border: '1px solid #A6E9C9', borderRadius: 3, padding: '0 5px', flexShrink: 0 }}>AI replied</span>}
                        {by && <span title="Sent by" style={{ fontSize: 11, color: C.brown, background: C.cream, border: '1px solid ' + C.creamLine, borderRadius: 3, padding: '0 5px', flexShrink: 0 }}>by {by}</span>}
                        <span style={{ fontSize: 12.5, color: C.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.snippet}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Reading pane */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              {!openId ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.goldDark} strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                  </div>
                  <div>Pick an email to read it</div>
                </div>
              ) : !msg ? <div style={{ padding: 40, color: C.faint }}>Opening…</div> : (
                <>
                  <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid ' + C.row }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, flex: 1 }}>{msg.subject || '(no subject)'}</h2>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => compose('reply')} style={btn('gold', true)}>Reply</button>
                        <button onClick={() => compose('replyAll')} style={btn('ghost', true)}>Reply all</button>
                        <button onClick={() => compose('forward')} style={btn('ghost', true)}>Forward</button>
                        {msg.folder === 'INBOX' && <button onClick={markUnread} title="Mark as unread" style={btn('ghost', true)}>Unread</button>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                      <Avatar name={msg.from_name || msg.from_email || '?'} color={colorFor(msg.from_email || '')} size={34} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                        <div><b style={{ fontWeight: 600 }}>{msg.from_name || msg.from_email}</b> {msg.from_name && <span style={{ color: C.faint }}>&lt;{msg.from_email}&gt;</span>}</div>
                        <div style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>To: {msg.to_list || '—'}{msg.cc_list ? ` · Cc: ${msg.cc_list}` : ''}</div>
                        {msg.sent_by && <div style={{ color: C.brown }}>Sent by {msg.sent_by} from the portal</div>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12.5, color: C.muted }}>
                        <div>{new Date(msg.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        {byId(msg.mailbox_id) && <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, color: '#fff', background: colorFor(byId(msg.mailbox_id).email), borderRadius: 3, padding: '1px 6px' }}>{byId(msg.mailbox_id).email}</span>}
                      </div>
                    </div>
                    {(msg.attachments ?? []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                        {msg.attachments.map((a: any) => (
                          <button key={a.index} onClick={() => download(msg, a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid ' + C.border, borderRadius: 4, padding: '5px 10px', background: '#fff', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', color: C.ink }}>
                            📎 {a.filename} <span style={{ color: C.faint }}>{kb(a.size || 0)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.ai_draft && (
                    <div style={{ margin: '12px 24px 0', border: '1px solid ' + (msg.ai_status === 'replied' ? '#A6E9C9' : C.creamLine), background: msg.ai_status === 'replied' ? '#E6F9F0' : C.cream, borderRadius: 6, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: msg.ai_status === 'replied' ? '#00854D' : C.brown }}>{msg.ai_status === 'replied' ? 'The AI receptionist already replied' : 'AI receptionist drafted a reply'}</span>
                        <div style={{ flex: 1 }} />
                        {msg.ai_status !== 'replied' && <button onClick={() => { compose('reply'); setDraft(d => d ? { ...d, body: msg.ai_draft } : d) }} style={btn('gold', true)}>Use this reply</button>}
                      </div>
                      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: C.ink, maxHeight: 160, overflowY: 'auto' }}>{msg.ai_draft}</div>
                    </div>
                  )}
                  <iframe title="Email" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={frameDoc} style={{ flex: 1, border: 'none', width: '100%', padding: '8px 18px', boxSizing: 'border-box' }} />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {draft && (
        <Modal title={draft.reply_to_message_id ? 'Reply' : draft.subject.startsWith('Fwd') ? 'Forward' : 'New email'} width={680} onClose={() => setDraft(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px 10px', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: C.muted }}>From</span>
            <select value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} style={{ ...input, cursor: 'pointer' }}>
              {connected.map(b => <option key={b.id} value={b.id}>{b.display_name ? `${b.display_name} <${b.email}>` : b.email}</option>)}
            </select>
            <span style={{ color: C.muted }}>To</span>
            <input value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} placeholder="name@example.com, another@example.com" style={input} autoFocus={!draft.to} />
            <span style={{ color: C.muted }}>Cc</span>
            <input value={draft.cc} onChange={e => setDraft({ ...draft, cc: e.target.value })} style={input} />
            <span style={{ color: C.muted }}>Subject</span>
            <input value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} style={input} />
            {templates.length > 1 && <>
              <span style={{ color: C.muted }}>Template</span>
              <select value={tpl(draft.template_id).id} onChange={e => {
                const next = tpl(e.target.value)
                // Swap the pre-filled text only if they haven't started typing
                const untouched = draft.body === formatted(draft.toName, tpl(draft.template_id))
                setDraft({ ...draft, template_id: next.id, footer_override: null, body: untouched ? formatted(draft.toName, next) : draft.body })
              }} style={{ ...input, cursor: 'pointer' }}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</option>)}
              </select>
            </>}
          </div>
          <textarea value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} autoFocus={!!draft.to} placeholder="Write your message…" style={{ ...input, marginTop: 12, minHeight: 200, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }} />
          {tpl(draft.template_id).footer_enabled && (
            <details style={{ marginTop: 8, fontSize: 12.5, color: C.muted }}>
              <summary style={{ cursor: 'pointer' }}>✓ Footer added automatically — preview &amp; edit{draft.footer_override ? ' (changed for this email)' : ''}</summary>
              <div style={{ fontSize: 11.5, color: C.faint, margin: '6px 0 4px' }}>Click any words to change them for this email only.{draft.footer_override && <> <button onClick={() => setDraft({ ...draft, footer_override: null, footerRev: (draft.footerRev || 0) + 1 })} style={{ border: 'none', background: 'none', color: C.goldDark, cursor: 'pointer', padding: 0, fontSize: 11.5 }}>Undo my changes</button></>}</div>
              <EditableHtml key={(draft.template_id || '') + ':' + (draft.footerRev || 0) + ':' + draft.from} html={draft.footer_override || footerHtml(tpl(draft.template_id), byId(draft.from)?.email ?? '')} onChange={h => setDraft(d => d ? { ...d, footer_override: h } : d)} />
            </details>
          )}
          {draft.quoted && <details style={{ marginTop: 8, fontSize: 12.5, color: C.muted }}><summary style={{ cursor: 'pointer' }}>Show quoted email</summary><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', maxHeight: 180, overflowY: 'auto', background: C.hover, padding: 10, borderRadius: 4 }}>{draft.quoted}</pre></details>}
          {draft.files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {draft.files.map((f, i) => <span key={i} style={{ fontSize: 12.5, border: '1px solid ' + C.border, borderRadius: 4, padding: '4px 8px' }}>📎 {f.filename} <span style={{ color: C.faint }}>{kb(f.size)}</span> <button onClick={() => setDraft({ ...draft, files: draft.files.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.faint }}>×</button></span>)}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <label style={{ ...btn('ghost', true), cursor: 'pointer' }}>📎 Attach<input type="file" multiple onChange={e => { addFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} /></label>
            <div style={{ flex: 1 }} />
            <button onClick={() => setDraft(null)} style={btn('ghost')}>Discard</button>
            <button onClick={send} disabled={sending} style={{ ...btn('gold'), opacity: sending ? 0.6 : 1 }}>{sending ? 'Sending…' : 'Send'}</button>
          </div>
        </Modal>
      )}

      {connectFor && <ConnectModal mb={connectFor} onClose={() => setConnectFor(null)} onDone={async (n: number) => { setConnectFor(null); flash(`${connectFor.email} connected${n ? ` — ${n} emails loaded` : ''}.`); await loadBoxes(); loadList() }} />}
      {accessFor && <AccessModal mb={accessFor} team={team} onClose={() => setAccessFor(null)} onDone={async () => { setAccessFor(null); await loadBoxes() }} />}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13.5, zIndex: 80, boxShadow: '0 6px 20px rgba(0,0,0,.2)' }}>{toast}</div>}
    </CrmPage>
  )
}

// ---------- Mailbox settings (admins) ----------
function Settings({ boxes, team, onConnect, onAccess, reload, flash, templates, onTemplates, sampleEmail }: any) {
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const act = async (body: any, ok?: string) => { try { await api('', body); if (ok) flash(ok); await reload() } catch (e: any) { flash(e.message) } }
  const cols = 'minmax(220px,1.4fr) 150px 130px minmax(150px,1fr) 90px 120px 180px'
  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: C.brown, margin: '0 0 2px' }}>Mailbox settings</h1>
          <div style={{ fontSize: 13, color: '#8A7248', maxWidth: 760, lineHeight: 1.5 }}>Connect each address with its email password (from Bluehost → Email). Passwords are stored encrypted and never shown again. Admins see every mailbox; choose which staff can see each one.</div>
        </div>
        <button onClick={() => setAdding(true)} style={btn('gold')}>+ Add mailbox</button>
      </div>
      <div style={{ padding: '20px 28px 40px' }}>
        {adding && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@sangstersgroup.com" style={{ ...input, width: 320 }} autoFocus />
            <button onClick={async () => { await act({ action: 'add', email: newEmail }, 'Mailbox added'); setAdding(false); setNewEmail('') }} style={btn('gold', true)}>Add</button>
            <button onClick={() => setAdding(false)} style={btn('ghost', true)}>Cancel</button>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1040 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, borderLeft: '6px solid ' + C.gold, borderTop: '1px solid ' + C.row, borderRight: '1px solid ' + C.row, fontSize: 13, color: C.muted }}>
              {['Address', 'Shown as', 'Status', 'Who can see it', 'Marketing', 'AI replies', ''].map((h, i) => <div key={i} style={{ padding: '8px 10px', borderLeft: i ? '1px solid ' + C.row : 'none', borderBottom: '1px solid ' + C.row, textAlign: i ? 'center' : 'left' }}>{h}</div>)}
            </div>
            {boxes.map((b: any) => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: cols, borderLeft: '6px solid ' + C.gold, borderRight: '1px solid ' + C.row, fontSize: 14 }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.status === 'connected' ? colorFor(b.email) : C.grey, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.email}</div>
                    {b.last_error ? <div style={{ fontSize: 12, color: C.red }}>{b.last_error}</div> : b.last_synced_at ? <div style={{ fontSize: 12, color: C.faint }}>Checked {when(b.last_synced_at)}</div> : null}
                  </div>
                </div>
                <div style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center' }}>
                  {editing === b.id
                    ? <input value={nameDraft} autoFocus onChange={e => setNameDraft(e.target.value)} onBlur={async () => { setEditing(null); if (nameDraft !== (b.display_name ?? '')) await act({ action: 'update', id: b.id, display_name: nameDraft }) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ ...input, padding: '4px 6px', fontSize: 13 }} />
                    : <span onClick={() => { setEditing(b.id); setNameDraft(b.display_name ?? '') }} title="Click to edit the name people see" style={{ cursor: 'text', fontSize: 13, color: b.display_name ? C.ink : C.faint, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.display_name || 'Add a name'}</span>}
                </div>
                <div style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill width={110} color={b.status === 'connected' ? C.green : b.status === 'error' ? C.red : C.grey}>{b.status === 'connected' ? 'Connected' : b.status === 'error' ? 'Needs attention' : 'Not connected'}</Pill>
                </div>
                <div onClick={() => onAccess(b)} title="Choose who can see this mailbox" style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', cursor: 'pointer', fontSize: 12.5 }}>
                  <span style={{ color: C.muted }}>Admins</span>
                  {(b.access_teams ?? []).map((r: string) => <span key={'t' + r} style={{ background: C.cream, border: '1px solid ' + C.creamLine, color: C.brown, borderRadius: 10, padding: '1px 7px' }}>{r}</span>)}
                  {(b.access ?? []).map((e: string) => { const t = team.find((x: any) => x.email?.toLowerCase() === e); return <span key={e} style={{ background: C.hover, border: '1px solid ' + C.row, borderRadius: 10, padding: '1px 7px' }}>{t?.name || e}</span> })}
                  <span style={{ color: C.goldDark }}>+</span>
                </div>
                <div style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill width={60} color={b.use_for_marketing ? C.green : C.grey} onClick={() => act({ action: 'update', id: b.id, use_for_marketing: !b.use_for_marketing })} title="Can Marketing send from this address?">{b.use_for_marketing ? 'Yes' : 'No'}</Pill>
                </div>
                <div style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill width={96} color={b.ai_mode === 'auto' ? C.green : b.ai_mode === 'draft' ? C.gold : C.grey} onClick={() => act({ action: 'update', id: b.id, ai_mode: b.ai_mode === 'off' || !b.ai_mode ? 'draft' : b.ai_mode === 'draft' ? 'auto' : 'off' })} title="Off → Drafts (staff approve) → Auto-reply">{b.ai_mode === 'auto' ? 'Auto-reply' : b.ai_mode === 'draft' ? 'Drafts' : 'Off'}</Pill>
                </div>
                <div style={{ padding: '6px 10px', borderLeft: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <button onClick={() => onConnect(b)} style={btn(b.status === 'connected' ? 'ghost' : 'gold', true)}>{b.status === 'connected' ? 'Reconnect' : 'Connect'}</button>
                  {b.status === 'connected'
                    ? <button onClick={() => confirm(`Disconnect ${b.email}? Its emails will be removed from the portal (nothing is deleted from Bluehost).`) && act({ action: 'update', id: b.id, disconnect: true }, 'Disconnected')} style={btn('ghost', true)}>Disconnect</button>
                    : <button onClick={() => confirm(`Remove ${b.email} from the portal?`) && act({ action: 'remove', id: b.id }, 'Removed')} title="Remove" style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectModal({ mb, onClose, onDone }: any) {
  const [password, setPassword] = useState('')
  const [adv, setAdv] = useState(false)
  const [cfg, setCfg] = useState({ imap_host: mb.imap_host, imap_port: mb.imap_port, smtp_host: mb.smtp_host, smtp_port: mb.smtp_port, username: mb.username ?? '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function go() {
    setBusy(true); setErr('')
    try { const d = await api('', { action: 'connect', id: mb.id, password, ...cfg }); onDone(d.synced ?? 0) } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  return (
    <Modal title={`Connect ${mb.email}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Enter this mailbox’s password — the same one you use to log in to Bluehost webmail for this address. We’ll test it, then load recent emails.</div>
      <label style={label}>Password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && go()} autoFocus autoComplete="new-password" style={input} />
      <button onClick={() => setAdv(a => !a)} style={{ border: 'none', background: 'none', color: C.goldDark, fontSize: 13, cursor: 'pointer', padding: '10px 0 0', fontFamily: 'inherit' }}>{adv ? 'Hide' : 'Show'} server settings</button>
      {adv && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginTop: 10 }}>
          <div><label style={label}>Incoming (IMAP) server</label><input value={cfg.imap_host} onChange={e => setCfg({ ...cfg, imap_host: e.target.value })} style={input} /></div>
          <div><label style={label}>Port</label><input type="number" value={cfg.imap_port} onChange={e => setCfg({ ...cfg, imap_port: Number(e.target.value) })} style={input} /></div>
          <div><label style={label}>Outgoing (SMTP) server</label><input value={cfg.smtp_host} onChange={e => setCfg({ ...cfg, smtp_host: e.target.value })} style={input} /></div>
          <div><label style={label}>Port</label><input type="number" value={cfg.smtp_port} onChange={e => setCfg({ ...cfg, smtp_port: Number(e.target.value) })} style={input} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label}>Username (leave blank to use the email address)</label><input value={cfg.username} onChange={e => setCfg({ ...cfg, username: e.target.value })} style={input} /></div>
        </div>
      )}
      {err && <div style={{ marginTop: 12, background: '#FDE8EC', border: '1px solid #F5B5C1', color: C.red, borderRadius: 4, padding: '8px 12px', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btn('ghost')}>Cancel</button>
        <button onClick={go} disabled={busy || !password} style={{ ...btn('gold'), opacity: busy || !password ? 0.6 : 1 }}>{busy ? 'Testing & loading…' : 'Connect'}</button>
      </div>
    </Modal>
  )
}

function AccessModal({ mb, team, onClose, onDone }: any) {
  const [sel, setSel] = useState<string[]>(mb.access ?? [])
  const [teams, setTeams] = useState<string[]>(mb.access_teams ?? [])
  const [busy, setBusy] = useState(false)
  const staff = team.filter((t: any) => String(t.role ?? '').toLowerCase() !== 'admin' && t.email)
  const roles = Array.from(new Set(staff.map((t: any) => String(t.role ?? '').trim()).filter(Boolean))) as string[]
  async function save() {
    setBusy(true)
    try { await api('', { action: 'update', id: mb.id, access: sel, access_teams: teams }); onDone() } catch (e: any) { alert(e.message) }
    setBusy(false)
  }
  const box: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid ' + C.row, cursor: 'pointer', fontSize: 14 }
  return (
    <Modal title={`Who can see ${mb.email}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Admins always see every mailbox. Give it to a whole team (anyone added to that team later gets it too), or to individual staff.</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Teams</div>
      <div style={{ border: '1px solid ' + C.row, borderRadius: 4, marginBottom: 14 }}>
        {roles.length === 0 && <div style={{ padding: 12, fontSize: 13, color: C.faint }}>No teams yet — set staff roles in Team Management.</div>}
        {roles.map(r => {
          const on = teams.includes(r)
          const n = staff.filter((t: any) => String(t.role ?? '').trim() === r).length
          return (
            <label key={r} style={box}>
              <input type="checkbox" checked={on} onChange={() => setTeams(x => on ? x.filter(y => y !== r) : [...x, r])} style={{ accentColor: C.goldDark }} />
              <span style={{ flex: 1 }}>{r}</span><span style={{ fontSize: 12, color: C.faint }}>{n} {n === 1 ? 'person' : 'people'}</span>
            </label>
          )
        })}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Individual staff</div>
      <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid ' + C.row, borderRadius: 4 }}>
        {staff.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.faint }}>No non-admin staff yet.</div>}
        {staff.map((t: any) => {
          const e = t.email.toLowerCase()
          const on = sel.includes(e)
          const viaTeam = teams.includes(String(t.role ?? '').trim())
          return (
            <label key={e} style={{ ...box, opacity: viaTeam ? 0.6 : 1 }}>
              <input type="checkbox" checked={on || viaTeam} disabled={viaTeam} onChange={() => setSel(s => on ? s.filter(x => x !== e) : [...s, e])} style={{ accentColor: C.goldDark }} />
              <Avatar name={t.name || e} color={colorFor(e)} size={24} />
              <span style={{ flex: 1 }}>{t.name || e}<span style={{ color: C.faint, fontSize: 12 }}> · {viaTeam ? 'via team' : t.role}</span></span>
            </label>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btn('ghost')}>Cancel</button>
        <button onClick={save} disabled={busy} style={btn('gold')}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  )
}

// Email templates: each has its own greeting/sign-off (pre-filled when writing)
// and branded footer (added on send). The default is pre-selected for staff and
// used for AI replies and Marketing.
const BLANK_T: EmailTemplate = { ...DEFAULT_FORMAT, id: '', name: '', is_default: false }
function TemplatesEditor({ templates, onChange, flash, sampleEmail, isAdmin }: { templates: EmailTemplate[]; onChange: (t: EmailTemplate[]) => void; flash: (t: string) => void; sampleEmail: string; isAdmin: boolean }) {
  const open = true
  const [showCode, setShowCode] = useState(false)
  const [rev, setRev] = useState(0) // bump to reload the click-to-edit footer
  const [selId, setSelId] = useState<string>(templates.find(t => t.is_default)?.id ?? templates[0]?.id ?? '')
  const [f, setF] = useState<EmailTemplate>(templates.find(t => t.id === selId) ?? templates[0] ?? BLANK_T)
  const [busy, setBusy] = useState(false)
  const saved = templates.find(t => t.id === f.id)
  const dirty = !saved || JSON.stringify(saved) !== JSON.stringify(f)
  useEffect(() => { const t = templates.find(x => x.id === selId); if (t) { setF(t); setRev(r => r + 1) } }, [templates, selId])
  const pick = (t: EmailTemplate) => { if (dirty && f.id && !confirm('Discard your unsaved changes to this template?')) return; setSelId(t.id); setF(t) }
  const set = (k: keyof EmailTemplate, v: any) => setF(p => ({ ...p, [k]: v }))
  const field = (k: keyof EmailTemplate, lbl: string, wide = false, hint?: string) => (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <label style={label}>{lbl}</label>
      <input value={String(f[k] ?? '')} onChange={e => set(k, e.target.value)} style={input} />
      {hint && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{hint}</div>}
    </div>
  )
  async function run(body: any, ok: string) {
    setBusy(true)
    try {
      const d = await api('', body); onChange(d.templates)
      if (body.action === 'delete_template') { const n = d.templates.find((t: EmailTemplate) => t.is_default) ?? d.templates[0]; if (n) { setSelId(n.id); setF(n) } }
      else if (d.id) setSelId(d.id)
      flash(ok)
    } catch (e: any) { flash(e.message) }
    setBusy(false)
  }
  function addNew() {
    const base = templates.find(t => t.is_default) ?? templates[0] ?? BLANK_T
    setSelId(''); setF({ ...base, id: '', name: 'New template', is_default: false })
  }
  const def = templates.find(t => t.is_default) ?? templates[0]
  const sample = `${f.greeting.replace('{name}', 'Sarah')}\n\nThank you for your message. [Your message here]\n\n${f.closing}${f.sign_name ? '\nYour name' : ''}`
  return (
    <div style={{ border: '1px solid ' + C.row, borderLeft: '6px solid ' + C.gold, borderRadius: 4, marginBottom: 22, background: '#fff' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.brown }}>Email templates <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 400 }}>· {templates.length}</span></div>
          <div style={{ fontSize: 12.5, color: C.muted }}>Staff pick a template when writing an email; <b style={{ fontWeight: 500 }}>{def?.name}</b> is the default and is also used for AI replies and Marketing.</div>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid ' + C.row, padding: '12px 14px 16px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            {templates.map(t => (
              <button key={t.id} onClick={() => pick(t)} style={{ ...btn(t.id === f.id ? 'gold' : 'ghost', true) }}>{t.name}{t.is_default ? ' ★' : ''}</button>
            ))}
            {!f.id && <button style={btn('gold', true)}>{f.name || 'New template'}</button>}
            <button onClick={addNew} style={{ ...btn('ghost', true), borderStyle: 'dashed' }}>+ New template</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', alignContent: 'start' }}>
              {field('name', 'Template name', true, 'e.g. Standard, Tenants, Investors, Short reply')}
              {field('greeting', 'Opening line', false, '{name} = the person’s first name')}
              {field('closing', 'Sign-off')}
              <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.sign_name} onChange={e => set('sign_name', e.target.checked)} /> Add the sender’s name under the sign-off</label>
              <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={f.footer_enabled} onChange={e => set('footer_enabled', e.target.checked)} /> Add the company footer</label>
              {f.footer_enabled && (f.footer_html || '').trim() !== '' && <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: C.muted, background: C.cream, border: '1px solid ' + C.creamLine, borderRadius: 4, padding: '8px 10px' }}>
                This template has a designed footer. <b style={{ fontWeight: 500, color: C.brown }}>Click any words in the preview to change them</b>, then press Save template.
                {isAdmin && <div style={{ marginTop: 6 }}>
                  <button onClick={() => setShowCode(v => !v)} style={{ border: 'none', background: 'none', color: C.goldDark, cursor: 'pointer', padding: 0, fontSize: 12 }}>{showCode ? 'Hide HTML code' : 'Edit HTML code'}</button>
                  {showCode && <textarea value={f.footer_html} onChange={e => set('footer_html', e.target.value)} rows={10} style={{ ...input, marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, resize: 'vertical' }} />}
                </div>}
              </div>}
              {f.footer_enabled && !(f.footer_html || '').trim() && <>
                {field('company', 'Company name')}
                {field('phone', 'Office phone')}
                {field('contact_email', 'Contact email', true, 'Shown in the footer (leave blank to show the address it’s sent from)')}
                {field('tagline', 'Tagline', true)}
                {field('website', 'Website')}
                {field('company_number', 'Company number')}
                {field('address_uk', 'London address', true)}
                {field('address_jm', 'Jamaica address', true)}
                {field('rating', 'Rating line', true)}
                {field('disclaimer', 'Small print', true)}
              </>}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <button onClick={() => run({ action: 'save_template', template: f }, f.id ? 'Template saved' : 'Template added')} disabled={busy || !f.name.trim()} style={{ ...btn('gold'), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : f.id ? 'Save template' : 'Add template'}</button>
                {isAdmin && f.id && !f.is_default && <button onClick={() => run({ action: 'default_template', id: f.id }, `${f.name} is now the default`)} disabled={busy} style={btn('ghost')}>Make default</button>}
                {f.id && f.is_default && <span style={{ fontSize: 12.5, color: C.goldDark, alignSelf: 'center' }}>★ Default template</span>}
                <div style={{ flex: 1 }} />
                {isAdmin && f.id && templates.length > 1 && <button onClick={() => confirm(`Delete the “${f.name}” template?`) && run({ action: 'delete_template', id: f.id }, 'Template deleted')} disabled={busy} style={btn('danger')}>Delete</button>}
                {!f.id && <button onClick={() => { const d = templates.find(t => t.is_default) ?? templates[0]; if (d) { setSelId(d.id); setF(d) } }} style={btn('ghost')}>Cancel</button>}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Preview</div>
              <div style={{ border: '1px solid ' + C.row, borderRadius: 4, padding: 16, background: '#fff', overflowX: 'auto' }}>
                <div style={{ fontFamily: 'Arial,sans-serif', fontSize: 14, lineHeight: 1.5, color: '#323338', whiteSpace: 'pre-wrap' }}>{sample}</div>
                {(f.footer_html || '').trim() && f.footer_enabled
                  ? <EditableHtml key={f.id + (showCode ? ':code' : '') + ':' + rev} html={f.footer_html} onChange={h => set('footer_html', h)} />
                  : <div dangerouslySetInnerHTML={{ __html: footerHtml(f, sampleEmail) }} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Click-to-edit HTML (email footers): keeps the design and images, lets people
// change the words. Uncontrolled while typing so the cursor doesn't jump.
function EditableHtml({ html, onChange }: { html: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning spellCheck
      onInput={e => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      onClick={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault() }}
      title="Click to change the words"
      style={{ outline: '1px dashed ' + C.creamLine, outlineOffset: 4, borderRadius: 2, cursor: 'text', marginTop: 4 }} />
  )
}
