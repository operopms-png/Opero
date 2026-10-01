'use client'
// Staff Centre → Airbnb Inbox: chats between our guest-side Airbnb account
// (hello@ — used to message hosts about our services) and hosts. Built from
// Airbnb's message emails; replies are sent by email and Airbnb posts them
// into the same chat, so the host sees them in Airbnb as normal.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Empty, Loading, btn } from '../../../components/crm/Page'

async function call(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/airbnb-inbox', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong')
  return data
}
const AIRBNB = '#FF385C'
const short = (d?: string | null) => { if (!d) return ''; const x = new Date(d); const days = (Date.now() - x.getTime()) / 864e5; return days < 1 ? x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : days < 7 ? x.toLocaleDateString('en-GB', { weekday: 'short' }) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
const full = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const initials = (n?: string | null) => (n || '?').split(/[\s-]+/).map(s => s[0]).join('').slice(0, 2).toUpperCase()

export default function AirbnbInboxPage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [narrow, setNarrow] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(() => call().then(x => { setD(x); setErr('') }).catch(e => setErr(e.message)), [])
  useEffect(() => {
    load()
    const i = setInterval(load, 60000)
    const r = () => setNarrow(window.innerWidth < 820); r(); window.addEventListener('resize', r)
    return () => { clearInterval(i); window.removeEventListener('resize', r) }
  }, [load])

  const threads: any[] = d?.threads ?? []
  const list = useMemo(() => threads.filter(t => t.status === tab && (!q || `${t.host} ${t.listing} ${t.lastText}`.toLowerCase().includes(q.toLowerCase()))), [threads, tab, q])
  const cur = threads.find(t => t.key === sel) ?? null

  useEffect(() => { if (!narrow && !sel && list.length) setSel(list[0].key) }, [narrow, sel, list])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    if (cur?.unread) call({ action: 'read', key: cur.key }).then(() => setD((x: any) => x && ({ ...x, threads: x.threads.map((t: any) => t.key === cur.key ? { ...t, unread: false } : t) }))).catch(() => {})
  }, [cur?.key, cur?.items?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (label: string, body: any, ok?: string) => {
    setBusy(label)
    try { const r = await call(body); if (ok) flash(ok); await load(); return r } catch (e: any) { flash(e.message) } finally { setBusy('') }
  }
  const send = async () => {
    if (!cur || !text.trim()) return
    const r = await act('send', { action: 'reply', key: cur.key, text }, 'Sent — it will appear in the Airbnb chat')
    if (r) setText('')
  }

  if (err && !d) return <CrmPage><CrmHeader title="Airbnb Inbox" /><Empty>{err}</Empty></CrmPage>
  if (!d) return <CrmPage><CrmHeader title="Airbnb Inbox" /><Loading /></CrmPage>

  const unread = threads.filter(t => t.unread && t.status === 'open').length
  const tabs = [{ k: 'open', l: 'Open', count: threads.filter(t => t.status === 'open').length }, { k: 'done', l: 'Done', count: threads.filter(t => t.status === 'done').length }]
  const showList = !narrow || !cur
  const showChat = !narrow || !!cur

  return (
    <CrmPage fill>
      <CrmHeader
        title="Airbnb Inbox"
        subtitle={<>Your chats with hosts from the Airbnb account on {d.mailboxes.find((m: any) => m.email.startsWith('hello@'))?.email ?? 'your connected mailboxes'}. Replies sent here appear in the Airbnb chat.{unread ? <b> {unread} unread.</b> : null}</>}
        actions={<button style={btn('ghost', true)} disabled={!!busy} onClick={() => act('import', { action: 'import' }, 'Checked for older Airbnb messages')}>{busy === 'import' ? 'Checking…' : '↻ Load older messages'}</button>}
        tabs={tabs} tab={tab} onTab={k => { setTab(k as any); setSel(null) }}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', borderTop: 'none' }}>
        {showList && (
          <div style={{ width: narrow ? '100%' : 340, flexShrink: 0, borderRight: narrow ? 'none' : '1px solid ' + C.row, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 12, borderBottom: '1px solid ' + C.row }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search hosts, listings, messages" style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {!list.length && <div style={{ padding: 24, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>{threads.length ? 'Nothing here.' : <>No Airbnb chats yet. When a host replies to your Airbnb account, the message email arrives in your mailbox and shows here. Press <b>Load older messages</b> to bring in past ones.</>}</div>}
              {list.map(t => (
                <button key={t.key} onClick={() => setSel(t.key)} style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid ' + C.row, background: t.key === sel ? C.cream : '#fff', cursor: 'pointer', fontFamily: 'inherit', color: C.ink }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: AIRBNB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initials(t.host)}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: t.unread ? 700 : 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.host || 'Host'}</span>
                      <span style={{ fontSize: 12, color: t.unread ? AIRBNB : C.faint, flexShrink: 0 }}>{short(t.lastAt)}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.listing || '—'}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 13, color: t.unread ? C.ink : C.faint, fontWeight: t.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.lastText}</span>
                      {t.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: AIRBNB, flexShrink: 0 }} />}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showChat && (cur ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {narrow && <button onClick={() => setSel(null)} style={{ ...btn('ghost', true), padding: '4px 10px' }}>‹ Back</button>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{cur.host || 'Host'}</div>
                <div style={{ fontSize: 13, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.listing || ''}{cur.mailboxEmail ? ` · via ${cur.mailboxEmail}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cur.listingUrl && <a href={cur.listingUrl} target="_blank" rel="noreferrer" style={btn('ghost', true)}>Listing ↗</a>}
                {cur.airbnbUrl && <a href={cur.airbnbUrl} target="_blank" rel="noreferrer" style={btn('ghost', true)}>Open in Airbnb ↗</a>}
                {cur.crmContactId
                  ? <a href="/staff-centre/crm" style={{ ...btn('ghost', true), color: C.green }}>✓ In CRM</a>
                  : <button style={btn('ghost', true)} disabled={!!busy} onClick={() => act('crm', { action: 'crm', key: cur.key }, 'Added to the CRM as a lead')}>{busy === 'crm' ? 'Adding…' : '+ Add to CRM'}</button>}
                <button style={btn('ghost', true)} disabled={!!busy} onClick={() => act('status', { action: 'status', key: cur.key, status: cur.status === 'done' ? 'open' : 'done' }, cur.status === 'done' ? 'Moved back to Open' : 'Marked as done')}>{cur.status === 'done' ? 'Reopen' : '✓ Done'}</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px', background: '#FAFAFB' }}>
              {cur.items.map((it: any, i: number) => it.kind === 'event'
                ? <div key={i} style={{ textAlign: 'center', fontSize: 12.5, color: C.muted, margin: '10px auto 14px', maxWidth: 520, lineHeight: 1.5 }}>{it.text}{it.at && <span style={{ color: C.faint }}> · {short(it.at)}</span>}</div>
                : (
                  <div key={i} style={{ display: 'flex', justifyContent: it.kind === 'you' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                    <div style={{ maxWidth: '78%' }}>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5, padding: '9px 13px', borderRadius: 14, background: it.kind === 'you' ? C.goldDark : '#fff', color: it.kind === 'you' ? '#fff' : C.ink, border: it.kind === 'you' ? 'none' : '1px solid ' + C.row, borderBottomRightRadius: it.kind === 'you' ? 4 : 14, borderBottomLeftRadius: it.kind === 'you' ? 14 : 4 }}>{it.text}</div>
                      <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3, textAlign: it.kind === 'you' ? 'right' : 'left' }}>
                        {it.kind === 'you' ? (it.sentBy ? `${it.sentBy} · ` : 'You · ') : `${cur.host || 'Host'} · `}{it.at ? full(it.at) : 'earlier'}
                      </div>
                    </div>
                  </div>
                ))}
              <div ref={endRef} />
            </div>

            <div style={{ borderTop: '1px solid ' + C.row, padding: 12, background: '#fff' }}>
              {cur.threadId ? (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} placeholder={`Message ${cur.host || 'the host'}…`} rows={3} style={{ flex: 1, resize: 'vertical', padding: '9px 11px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5, minHeight: 60 }} />
                    <button style={{ ...btn('gold'), background: AIRBNB, borderColor: AIRBNB }} disabled={!!busy || !text.trim()} onClick={send}>{busy === 'send' ? 'Sending…' : 'Send'}</button>
                  </div>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Sent through Airbnb as plain text — no email signature is added. Airbnb may hide phone numbers, emails and links in chats.</div>
                </>
              ) : <div style={{ fontSize: 13, color: C.muted }}>This is a booking notice without a chat. Reply to this host in Airbnb.</div>}
            </div>
          </div>
        ) : !narrow && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint, fontSize: 14 }}>Pick a conversation</div>)}
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 16px', borderRadius: 6, fontSize: 14, zIndex: 100, maxWidth: '90vw' }}>{toast}</div>}
    </CrmPage>
  )
}
