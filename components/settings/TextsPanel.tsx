'use client'
// Settings -> Texts: connect your company's own Twilio number so the team can text from Inbox -> Texts.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type Conn = { id: string; label: string; phone: string; own: boolean; connected_by_name: string | null }
type Data = { configured: boolean; isAdmin: boolean; webhookUrl: string; connections: Conn[] }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const input: React.CSSProperties = { width: '100%', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#323338', margin: '12px 0 4px', display: 'block' }

export default function TextsPanel() {
  const [d, setD] = useState<Data | null>(null)
  const [f, setF] = useState({ account_sid: '', auth_token: '', phone: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('')
  const load = () => staffApi<Data>('/api/sms/connections').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  async function connect() {
    setBusy(true); setErr(''); setNote('')
    try {
      const r: any = await staffApi('/api/sms/connections', { action: 'connect', ...f })
      setF({ account_sid: '', auth_token: '', phone: '' })
      setNote(r.webhookSet ? 'Connected. Incoming texts now go to your Inbox.' : `Connected, but we could not set the incoming-text address in Twilio. In Twilio, open the number, go to Messaging, and set “A message comes in” to ${r.webhookUrl} (HTTP POST).`)
      await load()
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  async function remove(c: Conn) {
    if (!window.confirm(`Disconnect ${c.phone}? Old texts stay saved, but you can’t send or receive until you connect a number again.`)) return
    await staffApi('/api/sms/connections', { action: 'remove', id: c.id }).catch(e => setErr(e.message)); load()
  }
  if (!d) return <div style={{ color: '#667085', fontSize: 14 }}>{err || 'Loading…'}</div>
  const mine = d.connections.find(c => c.own)

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Texts</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Connect your company’s own Twilio number. Your team then texts and reads replies in Human Intelligence Hub → Inbox → Conversations → Texts. Each company uses its own number and its own Twilio account.</div>
      {!d.isAdmin && <div style={{ ...card, color: '#667085', fontSize: 14 }}>Only an account admin can connect or change the number.</div>}

      {d.connections.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#FDAB3D' }} />
            <b style={{ fontSize: 16 }}>{c.phone}</b>
            <span style={{ color: '#667085', fontSize: 13 }}>{c.own ? 'Your Twilio number' : 'Platform number'}</span>
            {d.isAdmin && c.own && <button onClick={() => remove(c)} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#B42318', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Disconnect</button>}
          </div>
          {c.connected_by_name && <div style={{ fontSize: 12.5, color: '#667085', margin: '6px 0 0' }}>Connected by {c.connected_by_name}</div>}
        </div>
      ))}
      {note && <div style={{ ...card, color: '#067647', fontSize: 14 }}>{note}</div>}

      {d.isAdmin && !d.connections.some(c => !c.own) && (
        <div style={card}>
          <b style={{ fontSize: 16 }}>{mine ? 'Change your Twilio number' : 'Connect a Twilio number'}</b>
          <div style={{ fontSize: 13, color: '#667085', marginTop: 4 }}>In Twilio, buy a number that can send texts, then copy your Account SID and Auth Token from the Twilio console home page. We store the token encrypted and never show it again.</div>
          <label style={label}>Twilio Account SID</label>
          <input style={input} value={f.account_sid} onChange={e => setF({ ...f, account_sid: e.target.value })} placeholder="AC…" autoComplete="off" />
          <label style={label}>Twilio Auth Token</label>
          <input style={input} type="password" value={f.auth_token} onChange={e => setF({ ...f, auth_token: e.target.value })} autoComplete="new-password" />
          <label style={label}>Your Twilio number</label>
          <input style={input} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+44 7… or +1 876…" />
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ marginTop: 16 }}><button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy || !f.account_sid || !f.auth_token || !f.phone} onClick={connect}>{busy ? 'Checking with Twilio…' : 'Connect'}</button></div>
        </div>
      )}
      {!d.isAdmin ? null : err && d.connections.some(c => !c.own) ? <div style={{ color: '#B42318', fontSize: 13 }}>{err}</div> : null}
    </div>
  )
}
