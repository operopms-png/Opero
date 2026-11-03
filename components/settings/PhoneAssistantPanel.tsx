'use client'
// Settings -> Phone Assistant: link your own mobile, then message or voice-note Novourq Cloud AI on WhatsApp.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type P = { id: string; phone: string; verified: boolean; code: string | null }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

export default function PhoneAssistantPanel() {
  const [phones, setPhones] = useState<P[]>([])
  const [number, setNumber] = useState<string | null>(null)
  const [voice, setVoice] = useState(false)
  const [isAdmin, setIsAdmin] = useState(true)
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => staffApi<{ phones: P[]; number: string | null; voice: boolean; isAdmin: boolean }>('/api/assistant-phones').then(d => { setPhones(d.phones); setNumber(d.number); setVoice(d.voice); setIsAdmin(d.isAdmin) }).catch(() => {})
  useEffect(() => { load() }, [])
  async function add() {
    setBusy(true); setErr('')
    try { await staffApi('/api/assistant-phones', { phone }); setPhone(''); await load() } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  async function remove(id: string) { await staffApi('/api/assistant-phones', { remove: id }).catch(() => {}); load() }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Phone Assistant</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Message Novourq Cloud AI on WhatsApp from your own phone. Ask about your portfolio, or tell it what needs doing and it adds the job to your Task board.</div>
      {!number && <div style={{ ...card, color: '#9A6700', fontSize: 14 }}>WhatsApp is not switched on for the platform yet, so linking will not work until it is.</div>}
      {!isAdmin && <div style={{ ...card, color: '#667085', fontSize: 14 }}>Only an account admin can link a phone.</div>}
      {isAdmin && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>Link your phone</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>Enter your mobile number with its country code. You will get a 6-digit code to send us on WhatsApp.</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input id="assistant-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900123" style={{ flex: '1 1 200px', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }} />
            <button onClick={add} disabled={busy || !phone.trim()} style={{ ...btn, opacity: busy || !phone.trim() ? .6 : 1 }}>Get code</button>
          </div>
          {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginTop: 10 }}>{err}</div>}
        </div>
      )}
      {phones.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 10 }}>Your phones</div>
          {phones.map(p => (
            <div key={p.id} style={{ borderTop: '1px solid #E4E7EC', padding: '10px 0', fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <b>{p.phone}</b>
                <span style={{ color: p.verified ? '#0E7C55' : '#9A6700', fontWeight: 600, fontSize: 13 }}>{p.verified ? 'Linked' : 'Waiting for your code'}</span>
                {isAdmin && <button onClick={() => remove(p.id)} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#B42318', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Remove</button>}
              </div>
              {!p.verified && p.code && <div style={{ fontSize: 13, color: '#344054', marginTop: 6 }}>From {p.phone}, send <b>LINK {p.code}</b> on WhatsApp{number ? <> to <b>{number}</b></> : ''}.</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ ...card, fontSize: 13, color: '#344054', lineHeight: 1.6 }}>
        <b>What it can do:</b> answer questions from your portal data, and turn a request into a task on your Task board. It cannot send emails, move money or sign anything from WhatsApp.<br />
        <b>Voice notes:</b> {voice ? 'switched on. Your recording is sent to a speech-to-text provider to turn it into text.' : 'not switched on yet. Type your message for now.'}
      </div>
    </div>
  )
}
