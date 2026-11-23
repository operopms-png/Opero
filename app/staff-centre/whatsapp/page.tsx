'use client'
// Staff Centre → Human Intelligence Hub → Clients and sales → WhatsApp. A mirror of one linked WhatsApp number (use a spare number):
// link it once with a QR code, then read every private chat and send from here. Ava can draft sends, but they wait in AI Approvals.
import { useCallback, useEffect, useRef, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { CrmPage, CrmHeader, Body, Loading, btn, input, label } from '@/components/crm/Page'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: 18, marginBottom: 16 }
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, background: '#F2F4F7', borderRadius: 4, padding: '6px 9px', wordBreak: 'break-all', display: 'block', marginTop: 4 }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const who = (c: any) => c.name || (c.phone ? '+' + c.phone : String(c.jid).split('@')[0])

export default function WhatsAppPage() {
  const [st, setSt] = useState<any>(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [url, setUrl] = useState(''), [copied, setCopied] = useState('')
  const [chats, setChats] = useState<any[]>([]), [jid, setJid] = useState<string | null>(null), [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState(''), [newTo, setNewTo] = useState(''), [composing, setComposing] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const status = useCallback(() => staffApi('/api/whatsapp-mirror?view=status').then((r: any) => { setSt(r); setErr('') }).catch(e => setErr(e.message)), [])
  useEffect(() => { status(); const t = setInterval(status, 4000); return () => clearInterval(t) }, [status])

  const connected = st?.status === 'connected'
  const loadChats = useCallback(() => staffApi('/api/whatsapp-mirror?view=chats').then((r: any) => setChats(r.chats)).catch(() => {}), [])
  const loadThread = useCallback((j: string) => staffApi('/api/whatsapp-mirror?view=thread&jid=' + encodeURIComponent(j)).then((r: any) => setMsgs(r.messages)).catch(() => {}), [])
  useEffect(() => { loadChats(); const t = setInterval(loadChats, 6000); return () => clearInterval(t) }, [loadChats])
  useEffect(() => { if (!jid) { setMsgs([]); return } loadThread(jid); const t = setInterval(() => loadThread(jid), 5000); return () => clearInterval(t) }, [jid, loadThread])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, jid])

  const act = async (fn: () => Promise<any>) => { setBusy(true); setErr(''); try { await fn() } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const copy = (k: string, v: string) => navigator.clipboard?.writeText(v).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1500) })
  const send = (to: string) => act(async () => {
    await staffApi('/api/whatsapp-mirror', { action: 'send', to, text }); setText(''); setNewTo(''); setComposing(false)
    await loadChats(); if (jid) await loadThread(jid)
  })

  if (!st && !err) return <CrmPage><CrmHeader title="WhatsApp" subtitle="Your linked WhatsApp number, mirrored here." /><Body><Loading /></Body></CrmPage>
  const portal = typeof window !== 'undefined' ? window.location.origin : ''
  const cur = chats.find(c => c.jid === jid)

  return (
    <CrmPage>
      <CrmHeader title="WhatsApp" subtitle="Link a spare WhatsApp number once, then read every private chat and send from here. Only admins and co-founders can see it." />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}

        {st && !st.configured && (
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Set up WhatsApp</div>
            <div style={{ fontSize: 14, color: '#475467', marginBottom: 12 }}>This gives your company its own private link code. WhatsApp itself is held by a small bridge service that you start once (steps appear next). Use a spare number, not your main one.</div>
            <button style={btn('gold')} disabled={busy} onClick={() => act(async () => { await staffApi('/api/whatsapp-mirror', { action: 'setup' }); await status() })}>Set up WhatsApp</button>
          </div>
        )}

        {st?.configured && (st.status === 'no_url' || st.status === 'unreachable') && (
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{st.status === 'unreachable' ? 'The bridge cannot be reached' : 'Start the bridge'}</div>
            <ol style={{ fontSize: 14, color: '#344054', lineHeight: 1.6, paddingLeft: 20, margin: '0 0 12px' }}>
              <li>Put the <b>whatsapp-bridge</b> folder from the portal code on an always-on host (Railway or Fly work well) with a small persistent disk mounted at <b>/data</b>.</li>
              <li>Give it these two settings:
                <span style={mono}>BRIDGE_SECRET = {st.secret} <button style={{ ...btn('ghost', true), marginLeft: 8 }} onClick={() => copy('s', st.secret)}>{copied === 's' ? 'Copied' : 'Copy'}</button></span>
                <span style={mono}>PORTAL_URL = {portal} <button style={{ ...btn('ghost', true), marginLeft: 8 }} onClick={() => copy('p', portal)}>{copied === 'p' ? 'Copied' : 'Copy'}</button></span>
              </li>
              <li>Paste the public https address of the running bridge below and save.</li>
            </ol>
            <span style={label}>Bridge address</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ ...input, flex: 1, minWidth: 240 }} placeholder="https://your-bridge.up.railway.app" value={url || st.bridge_url || ''} onChange={e => setUrl(e.target.value)} />
              <button style={btn('gold')} disabled={busy} onClick={() => act(async () => { await staffApi('/api/whatsapp-mirror', { action: 'setup', bridge_url: url || st.bridge_url || '' }); await status() })}>Save</button>
            </div>
          </div>
        )}

        {st?.status === 'qr' && (
          <div style={{ ...card, display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            {st.qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={st.qr} alt="WhatsApp link code" width={220} height={220} />}
            <div style={{ flex: 1, minWidth: 220, fontSize: 14, color: '#344054', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Scan to link the spare number</div>
              On the spare phone open WhatsApp, then Settings, then Linked devices, then Link a device, and scan this code. It refreshes by itself and this page updates when it links.
            </div>
          </div>
        )}
        {st?.status === 'starting' && <div style={card}>The bridge is starting. This takes a few seconds.</div>}
        {st?.status === 'closed' && <div style={card}>The bridge lost its WhatsApp connection and is reconnecting.</div>}

        {connected && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#ECFDF3', color: '#067647' }}>Linked: +{st.phone}</span>
              <button style={btn('ghost', true)} onClick={() => { setComposing(true); setJid(null) }}>New message</button>
              <button style={btn('ghost', true)} disabled={busy} onClick={() => { if (confirm('Unlink this WhatsApp number? You will need to scan a new code to link it again.')) act(async () => { await staffApi('/api/whatsapp-mirror', { action: 'logout' }); await status() }) }}>Unlink number</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,300px) minmax(0,1fr)', gap: 14, alignItems: 'start' }} className="wa-grid">
              <div style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, maxHeight: 560, overflowY: 'auto' }}>
                {chats.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: '#667085' }}>No chats yet. Messages appear here as they arrive or are sent.</div>}
                {chats.map(c => (
                  <button key={c.jid} onClick={() => { setJid(c.jid); setComposing(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #EEF1F6', background: c.jid === jid ? '#EAF3FC' : '#fff', padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 14, color: '#1D2939' }}>{who(c)}</b><span style={{ fontSize: 11.5, color: '#98A2B3', whiteSpace: 'nowrap' }}>{when(c.last_at)}</span></div>
                    <div style={{ fontSize: 13, color: '#667085', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last_from_me ? 'You: ' : ''}{c.last_body}</div>
                  </button>
                ))}
              </div>
              <div style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, display: 'flex', flexDirection: 'column', minHeight: 360 }}>
                {composing && (
                  <div style={{ padding: 16 }}>
                    <span style={label}>Phone number with country code, for example 447700900123</span>
                    <input style={input} value={newTo} onChange={e => setNewTo(e.target.value)} inputMode="tel" />
                    <span style={{ ...label, marginTop: 10 }}>Message</span>
                    <textarea style={{ ...input, minHeight: 90 }} value={text} onChange={e => setText(e.target.value)} />
                    <button style={{ ...btn('gold'), marginTop: 10 }} disabled={busy || !newTo.trim() || !text.trim()} onClick={() => send(newTo.trim())}>{busy ? 'Sending…' : 'Send'}</button>
                  </div>
                )}
                {!composing && !jid && <div style={{ padding: 24, color: '#667085', fontSize: 14 }}>Pick a chat, or press New message.</div>}
                {!composing && jid && (
                  <>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #EEF1F6', fontWeight: 600 }}>{cur ? who(cur) : ''}{cur?.phone ? <span style={{ fontWeight: 400, color: '#98A2B3', marginLeft: 8, fontSize: 13 }}>+{cur.phone}</span> : null}</div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 440, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#F8FAFC' }}>
                      {msgs.map(m => (
                        <div key={m.id} style={{ alignSelf: m.from_me ? 'flex-end' : 'flex-start', maxWidth: '78%', background: m.from_me ? '#1B2F6E' : '#fff', color: m.from_me ? '#fff' : '#1D2939', border: m.from_me ? 'none' : '1px solid #E4E7EC', borderRadius: 10, padding: '8px 12px', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {m.body}
                          <div style={{ fontSize: 10.5, opacity: .7, marginTop: 3, textAlign: 'right' }}>{m.from_me && m.sent_by ? m.sent_by + ' · ' : ''}{when(m.at)}</div>
                        </div>
                      ))}
                      <div ref={end} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #EEF1F6' }}>
                      <textarea style={{ ...input, flex: 1, minHeight: 44 }} rows={2} placeholder="Type a message" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() && !busy) send(jid) } }} />
                      <button style={btn('gold')} disabled={busy || !text.trim()} onClick={() => send(jid)}>{busy ? 'Sending…' : 'Send'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <style>{`@media(max-width:760px){.wa-grid{grid-template-columns:1fr !important}}`}</style>
          </>
        )}
      </Body>
    </CrmPage>
  )
}
