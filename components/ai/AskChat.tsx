'use client'
// Ask AI chat box. Used full-size in Staff Centre → AI Assistant → Ask AI
// (with saved chats down the side) and compact in the Deal Analyser, where
// it gets the deal's figures and AI verdict as context.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const C = { gold: '#D0AE4C', gd: '#A8862E', brown: '#624920', cream: '#FBF4E6', ink: '#323338', muted: '#676879', faint: '#9699A6', row: '#E6E9EF', border: '#D0D4E4', purple: '#7A35B8' }

async function api(body?: any, qs = '') {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/ask-ai' + qs, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => null)
  if (!d) throw new Error(res.status >= 500 ? 'The AI took too long to answer — try again, or turn off Search the web for a quicker reply.' : 'Something went wrong')
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}

// --- tiny, safe markdown (escape first, then format) ---
const escH = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
function inline(s: string) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
}
export function md(src: string) {
  const lines = escH(src || '').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split('|').map(x => x.trim())); i++ }
      if (rows.length) out.push('<div class="ak-tw"><table><thead><tr>' + rows[0].map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' + rows.slice(1).map(r => '<tr>' + r.map(x => `<td>${inline(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>')
      continue
    }
    if (/^\s*[-*•]\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*•]\s+/, '')); i++ } out.push('<ul>' + items.map(x => `<li>${inline(x.replace(/^\[ \]\s*/, '☐ ').replace(/^\[[xX]\]\s*/, '☑ '))}</li>`).join('') + '</ul>'); continue }
    if (/^\s*\d+[.)]\s+/.test(l)) { const start = parseInt(l.trim(), 10) || 1; const items: string[] = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++ } out.push(`<ol start="${start}">` + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>'); continue }
    const h = l.match(/^(#{1,4})\s+(.*)$/)
    if (h) { out.push(`<h${Math.min(6, h[1].length + 2)}>${inline(h[2])}</h${Math.min(6, h[1].length + 2)}>`); i++; continue }
    if (/^\s*(---|\*\*\*)\s*$/.test(l)) { out.push('<hr>'); i++; continue }
    if (!l.trim()) { i++; continue }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^\s*(\||[-*•]\s|\d+[.)]\s|#{1,4}\s)/.test(lines[i])) { para.push(inline(lines[i])); i++ }
    out.push('<p>' + para.join('<br>') + '</p>')
  }
  return out.join('')
}

type Msg = { role: 'user' | 'assistant'; content: string; at?: string; web?: boolean }

export default function AskChat({ kind = 'general', refId, deal, compact, suggestions = [], showHistory, intro, autoAsk }: {
  kind?: 'general' | 'deal'; refId?: string | null; deal?: any; compact?: boolean; suggestions?: string[]; showHistory?: boolean; intro?: React.ReactNode; autoAsk?: string
}) {
  const [chats, setChats] = useState<any[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [usePortal, setUsePortal] = useState(true)
  const [useWeb, setUseWeb] = useState(kind === 'deal')
  const [copied, setCopied] = useState(-1)
  const end = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)

  const loadChats = useCallback(() => { if (showHistory) api(undefined, `?kind=${kind}`).then(d => setChats(d.chats)).catch(() => {}) }, [kind, showHistory])
  useEffect(() => { loadChats() }, [loadChats])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }, [msgs.length, busy])

  const open = async (id: string) => { setErr(''); try { const d = await api(undefined, `?id=${id}`); setChatId(id); setMsgs(d.chat.messages || []) } catch (e: any) { setErr(e.message) } }
  const fresh = () => { setChatId(null); setMsgs([]); setErr(''); setText(''); setTimeout(() => ta.current?.focus(), 0) }
  const remove = async (id: string) => { if (!confirm('Delete this chat?')) return; await api({ action: 'delete', id }).catch(() => {}); if (id === chatId) fresh(); loadChats() }

  async function send(q?: string) {
    const message = (q ?? text).trim()
    if (!message || busy) return
    setErr(''); setText(''); setBusy(true)
    setMsgs(m => [...m, { role: 'user', content: message }])
    try {
      const d = await api({ action: 'send', id: chatId, kind, ref: refId, message, use_portal: usePortal, use_web: useWeb, deal })
      setChatId(d.chat.id); setMsgs(d.chat.messages); loadChats()
    } catch (e: any) { setErr(e.message); setMsgs(m => m.slice(0, -1)); setText(message) }
    finally { setBusy(false) }
  }
  const asked = useRef(false)
  useEffect(() => { if (autoAsk && !asked.current) { asked.current = true; send(autoAsk) } }, [autoAsk]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (on: boolean, set: (v: boolean) => void, label: string, title: string) => (
    <button type="button" title={title} onClick={() => set(!on)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, border: '1px solid ' + C.border, borderRadius: 16, padding: '5px 11px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: C.ink }}>
      <span style={{ width: 26, height: 15, borderRadius: 8, background: on ? '#00C875' : '#C4C4C4', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: 2, left: on ? 13 : 2, width: 11, height: 11, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} /></span>{label}
    </button>
  )

  const chatBox = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: compact ? '10px 14px' : '10px 22px', borderBottom: '1px solid ' + C.row, flexWrap: 'wrap', background: '#fff' }}>
        {toggle(usePortal, setUsePortal, 'Use portal data', 'Let the AI read your properties, tenancies, Airbnb chats, scripts and CRM (read-only)')}
        {toggle(useWeb, setUseWeb, 'Search the web', 'Let the AI look up current rents, laws and news online')}
        {showHistory && msgs.length > 0 && <button onClick={fresh} style={{ fontSize: 12.5, border: 'none', background: 'none', color: C.gd, cursor: 'pointer', fontFamily: 'inherit' }}>+ New chat</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.faint }}>Answering with <b style={{ color: C.muted }}>Claude</b></span>
      </div>
      <div className="ak-msgs" style={{ flex: 1, overflowY: 'auto', padding: compact ? 14 : 22, background: '#FAFAFB', display: 'flex', flexDirection: 'column', gap: 14, minHeight: compact ? 260 : 0, maxHeight: compact ? 560 : undefined }}>
        {!msgs.length && !busy && (
          <div style={{ margin: 'auto 0', textAlign: 'center', color: C.muted, padding: '20px 10px' }}>
            {intro ?? <><div style={{ fontSize: 30 }}>✦</div><div style={{ fontSize: 17, fontWeight: 600, color: C.ink, margin: '6px 0 4px' }}>Ask anything</div><div style={{ fontSize: 13.5 }}>About your properties, tenants, Airbnb chats and leads — or property in Jamaica and the UK.</div></>}
          </div>
        )}
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '80%', background: C.gd, color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          : <div key={i} style={{ alignSelf: 'flex-start', maxWidth: compact ? '100%' : '86%', display: 'flex', gap: 10, minWidth: 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},${C.gd})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</span>
              <div style={{ background: '#fff', border: '1px solid ' + C.row, padding: '10px 15px', borderRadius: '4px 14px 14px 14px', minWidth: 0 }}>
                <div className="ak-md" dangerouslySetInnerHTML={{ __html: md(m.content) }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => navigator.clipboard?.writeText(m.content).then(() => { setCopied(i); setTimeout(() => setCopied(-1), 1500) })} style={{ fontSize: 12, border: '1px solid ' + C.border, borderRadius: 4, padding: '3px 9px', color: copied === i ? '#00A35C' : C.muted, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>{copied === i ? '✓ Copied' : '⧉ Copy'}</button>
                  {m.web && <span style={{ fontSize: 11.5, color: C.purple, background: '#F1E8FB', borderRadius: 3, padding: '2px 7px', fontWeight: 600 }}>🌐 used the web</span>}
                </div>
              </div>
            </div>)}
        {busy && <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, alignItems: 'center', color: C.muted, fontSize: 13 }}><span style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},${C.gd})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✦</span><span className="ak-dots">{useWeb ? 'Thinking and searching the web' : 'Thinking'}</span></div>}
        <div ref={end} />
      </div>
      {!msgs.length && suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: compact ? '8px 14px' : '8px 22px', background: '#FAFAFB' }}>
          {suggestions.map(s => <button key={s} onClick={() => send(s)} disabled={busy} style={{ fontSize: 12.5, border: '1px solid #E5D6B0', background: '#fff', borderRadius: 16, padding: '6px 12px', color: C.brown, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>)}
        </div>
      )}
      {err && <div style={{ color: '#DF2F4A', fontSize: 13, padding: '6px 22px', background: '#fff' }}>{err}</div>}
      <div style={{ padding: compact ? '10px 14px' : '12px 22px 16px', borderTop: '1px solid ' + C.row, display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff' }}>
        <textarea ref={ta} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={compact ? 2 : 2}
          placeholder={kind === 'deal' ? 'Ask about this deal — risks, what to negotiate, how to improve it…' : 'Ask anything about your business, properties or Jamaica / UK property…'}
          style={{ flex: 1, border: '1px solid ' + C.border, borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 48, outline: 'none', color: C.ink, lineHeight: 1.5 }} />
        <button onClick={() => send()} disabled={busy || !text.trim()} style={{ background: C.gd, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 18px', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: busy || !text.trim() ? 'default' : 'pointer', opacity: busy || !text.trim() ? 0.6 : 1 }}>Send</button>
      </div>
      <style>{`
        .ak-md{font-size:14px;line-height:1.6;color:${C.ink};overflow-wrap:anywhere}
        .ak-md p{margin:0 0 8px}.ak-md p:last-child{margin-bottom:0}
        .ak-md ul,.ak-md ol{margin:4px 0 8px;padding-left:20px}.ak-md li{margin:2px 0}
        .ak-md h3,.ak-md h4,.ak-md h5,.ak-md h6{margin:10px 0 6px;font-size:14.5px}
        .ak-md .ak-tw{overflow-x:auto;margin:6px 0 10px}
        .ak-md table{border-collapse:collapse;font-size:13px;min-width:100%}
        .ak-md th,.ak-md td{border-bottom:1px solid ${C.row};padding:6px 9px;text-align:left;vertical-align:top}
        .ak-md th{color:${C.muted};font-weight:600;font-size:12px;background:#FAFAFB}
        .ak-md a{color:${C.gd}}.ak-md code{background:#F1F2F5;border-radius:3px;padding:1px 4px;font-size:12.5px}
        .ak-md hr{border:none;border-top:1px solid ${C.row};margin:10px 0}
        .ak-dots:after{content:'…';animation:akd 1.2s steps(4,end) infinite}
        @keyframes akd{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
      `}</style>
    </div>
  )

  if (!showHistory) return <div style={{ border: '1px solid ' + C.row, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{chatBox}</div>
  return (
    <div className="ak-wrap" style={{ display: 'grid', gridTemplateColumns: '250px minmax(0,1fr)', flex: 1, minHeight: 0, height: '100%' }}>
      <div className="ak-hist" style={{ borderRight: '1px solid ' + C.row, padding: 14, background: '#FCFCFD', overflowY: 'auto' }}>
        <button onClick={fresh} style={{ border: '1px solid ' + C.gd, background: C.gd, color: '#fff', borderRadius: 6, padding: '9px 12px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, width: '100%', cursor: 'pointer' }}>+ New chat</button>
        <div style={{ fontSize: 11, letterSpacing: '.06em', color: C.faint, textTransform: 'uppercase', margin: '18px 4px 6px' }}>Your chats</div>
        {!chats.length && <div style={{ fontSize: 12.5, color: C.faint, padding: '4px' }}>Your past chats appear here. Only you can see them.</div>}
        {chats.map(ch => (
          <div key={ch.id} className="ak-ci" style={{ display: 'flex', alignItems: 'center', borderRadius: 6, background: ch.id === chatId ? C.cream : 'transparent' }}>
            <button onClick={() => open(ch.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', padding: '8px 9px', fontSize: 13, color: C.ink, fontWeight: ch.id === chatId ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', fontFamily: 'inherit' }}>{ch.title}</button>
            <button onClick={() => remove(ch.id)} title="Delete chat" className="ak-del" style={{ border: 'none', background: 'none', color: C.faint, cursor: 'pointer', padding: '0 8px', fontSize: 13 }}>✕</button>
          </div>
        ))}
      </div>
      {chatBox}
      <style>{`.ak-ci .ak-del{opacity:0}.ak-ci:hover .ak-del{opacity:1}@media(max-width:860px){.ak-wrap{grid-template-columns:1fr !important}.ak-hist{display:none}}`}</style>
    </div>
  )
}
