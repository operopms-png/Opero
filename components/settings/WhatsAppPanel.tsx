'use client'
// Settings -> WhatsApp: connect your company's WhatsApp Business number (Meta Cloud API) so the team can use it
// from Inbox, and choose whether Novourq Cloud AI answers on it.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type Conn = { id: string; label: string; phone: string; verified_name: string | null; quality: string | null; status: string; connected_by_name: string | null; ai_receptionist_enabled: boolean; ai_when: 'always' | 'out_of_hours'; ai_receptionist_greeting: string | null; ai_receptionist_business_info: string | null }
type Data = { configured: boolean; isAdmin: boolean; appId: string | null; configId: string | null; connections: Conn[] }
const GREEN = '#1DA851'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const input: React.CSSProperties = { width: '100%', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#323338', margin: '12px 0 4px', display: 'block' }

export default function WhatsAppPanel() {
  const [d, setD] = useState<Data | null>(null)
  const [f, setF] = useState({ phone_number_id: '', waba_id: '', access_token: '', label: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState('')
  const load = () => staffApi<Data>('/api/whatsapp/connections').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  // One-click Meta sign-up (shown only when the platform has a Meta configuration id).
  function facebook() {
    const w = window as any
    const start = () => {
      w.FB.init({ appId: d!.appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' })
      let ids: { phone_number_id?: string; waba_id?: string } = {}
      const onMsg = (e: MessageEvent) => {
        if (!/facebook\.com$/.test(new URL(e.origin).hostname)) return
        try { const m = JSON.parse(e.data); if (m.type === 'WA_EMBEDDED_SIGNUP' && m.event === 'FINISH') ids = m.data } catch {}
      }
      window.addEventListener('message', onMsg)
      w.FB.login((r: any) => {
        window.removeEventListener('message', onMsg)
        if (!r?.authResponse?.code) { setErr('Facebook sign-in was cancelled.'); return }
        run({ code: r.authResponse.code, phone_number_id: ids.phone_number_id, waba_id: ids.waba_id })
      }, { config_id: d!.configId, response_type: 'code', override_default_response_type: true, extras: { setup: {}, featureType: '', sessionInfoVersion: '3' } })
    }
    if (w.FB) return start()
    const s = document.createElement('script'); s.src = 'https://connect.facebook.net/en_US/sdk.js'; s.async = true; s.onload = start; document.body.appendChild(s)
  }
  async function run(extra: any) {
    setBusy(true); setErr('')
    try { await staffApi('/api/whatsapp/connections', { action: 'connect', label: f.label, ...extra }); setF({ phone_number_id: '', waba_id: '', access_token: '', label: '' }); await load() } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  async function update(c: Conn, patch: Partial<Conn>) {
    setD(x => x && { ...x, connections: x.connections.map(k => k.id === c.id ? { ...k, ...patch } : k) })
    try { await staffApi('/api/whatsapp/connections', { action: 'update', id: c.id, ...patch }); setSaved(c.id); setTimeout(() => setSaved(''), 1500) } catch (e: any) { setErr(e.message); load() }
  }
  async function remove(c: Conn) {
    if (!window.confirm(`Disconnect ${c.phone}? Chats stay saved but you will not be able to send or receive until you connect it again.`)) return
    await staffApi('/api/whatsapp/connections', { action: 'remove', id: c.id }).catch(e => setErr(e.message)); load()
  }
  if (!d) return <div style={{ color: '#667085', fontSize: 14 }}>{err || 'Loading…'}</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>WhatsApp</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Connect your company’s WhatsApp Business number. Staff then read and reply from Inbox → Conversations → WhatsApp, and Novourq Cloud AI can answer for you and hand over to a person.</div>
      {!d.configured && <div style={{ ...card, color: '#9A6700', fontSize: 14 }}>WhatsApp is not switched on for the platform yet. The platform owner needs to add the Meta app details in Netlify first.</div>}
      {!d.isAdmin && <div style={{ ...card, color: '#667085', fontSize: 14 }}>Only an account admin can connect or change WhatsApp.</div>}

      {d.connections.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: GREEN }} />
            <b style={{ fontSize: 16 }}>{c.phone}</b><span style={{ color: '#667085', fontSize: 13 }}>{c.verified_name || c.label}{c.quality ? ` · quality ${c.quality.toLowerCase()}` : ''}</span>
            {saved === c.id && <span style={{ color: GREEN, fontSize: 12 }}>Saved</span>}
            {d.isAdmin && <button onClick={() => remove(c)} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#B42318', fontSize: 13, cursor: 'pointer' }}>Disconnect</button>}
          </div>
          <div style={{ fontSize: 12.5, color: '#667085', margin: '6px 0 0' }}>Connected by {c.connected_by_name || 'an admin'}. Free-text replies work for 24 hours after the customer last wrote; after that WhatsApp only allows an approved template.</div>
          <label style={{ ...label, display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
            <input type="checkbox" disabled={!d.isAdmin} checked={c.ai_receptionist_enabled} onChange={e => update(c, { ai_receptionist_enabled: e.target.checked })} />
            Let Novourq Cloud AI answer on this number
          </label>
          {c.ai_receptionist_enabled && (<>
            <label style={label}>When should it answer?</label>
            <select disabled={!d.isAdmin} value={c.ai_when} onChange={e => update(c, { ai_when: e.target.value as any })} style={input}>
              <option value="always">Always</option><option value="out_of_hours">Only when the office is closed</option>
            </select>
            <label style={label}>Greeting for a first message (optional)</label>
            <input disabled={!d.isAdmin} defaultValue={c.ai_receptionist_greeting ?? ''} onBlur={e => e.target.value !== (c.ai_receptionist_greeting ?? '') && update(c, { ai_receptionist_greeting: e.target.value })} placeholder="Hi, thanks for messaging us…" style={input} />
            <label style={label}>Extra information just for WhatsApp (optional)</label>
            <textarea disabled={!d.isAdmin} defaultValue={c.ai_receptionist_business_info ?? ''} onBlur={e => e.target.value !== (c.ai_receptionist_business_info ?? '') && update(c, { ai_receptionist_business_info: e.target.value })} rows={4} placeholder="Anything it should know on top of the AI Receptionist knowledge" style={{ ...input, resize: 'vertical' }} />
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 10 }}>It stops replying in a chat as soon as a team member answers or presses Take over, and it hands over by itself for money, contracts, complaints and emergencies. What it may send on its own follows Settings → AI Authority.</div>
          </>)}
        </div>
      ))}

      {d.isAdmin && d.configured && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>{d.connections.length ? 'Connect another number' : 'Connect your number'}</div>
          {d.appId && d.configId && <>
            <button onClick={facebook} disabled={busy} style={{ ...btn, background: GREEN, opacity: busy ? .6 : 1 }}>Connect with Facebook</button>
            <div style={{ fontSize: 12.5, color: '#667085', margin: '8px 0 14px' }}>Sign in to Meta and pick or create your WhatsApp Business account. Or enter the details by hand:</div>
          </>}
          <label style={label}>Name for this number</label><input value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="NOVOURQ" style={input} />
          <label style={label}>Phone number ID</label><input value={f.phone_number_id} onChange={e => setF({ ...f, phone_number_id: e.target.value })} placeholder="From Meta → WhatsApp → API Setup" style={input} />
          <label style={label}>WhatsApp Business Account ID</label><input value={f.waba_id} onChange={e => setF({ ...f, waba_id: e.target.value })} style={input} />
          <label style={label}>Access token</label><input type="password" autoComplete="off" value={f.access_token} onChange={e => setF({ ...f, access_token: e.target.value })} placeholder="Permanent token from a Meta system user" style={input} />
          <div style={{ marginTop: 14 }}><button onClick={() => run(f)} disabled={busy || !f.phone_number_id || !f.waba_id || !f.access_token} style={{ ...btn, opacity: busy || !f.phone_number_id || !f.waba_id || !f.access_token ? .6 : 1 }}>{busy ? 'Connecting…' : 'Connect'}</button></div>
        </div>
      )}
      {err && <div role="alert" style={{ color: '#B42318', fontSize: 13 }}>{err}</div>}
    </div>
  )
}
