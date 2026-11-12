'use client'
export const dynamic = 'force-dynamic'
// Public agent sign-up: creates the agent's login and waits for staff approval. No staff login needed.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#16233F', BLUE = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: NAVY, background: '#fff' }
const lab: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, margin: '14px 0 5px' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '22px 20px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 14 }

export default function AgentSignup() {
  const { token } = useParams() as { token: string }
  const [live, setLive] = useState<boolean | null>(null)
  const [f, setF] = useState({ name: '', email: '', phone: '', country: '', password: '', payout_method: 'bank', payout_details: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  useEffect(() => { fetch('/api/public/agent-signup?t=' + encodeURIComponent(token)).then(r => setLive(r.ok)).catch(() => setLive(false)) }, [token])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/public/agent-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...f }) })
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong.')
      setDone(true); window.scrollTo(0, 0)
    } catch (x: any) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: 'Inter, system-ui, sans-serif', color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '26px 16px 60px', textAlign: 'center' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24 }}>Become an agent</h1>
        <div style={{ opacity: .8, fontSize: 14 }}>Refer guests and tenants and earn commission.</div>
      </div>
      <div style={{ maxWidth: 560, margin: '-36px auto 0', padding: '0 16px 40px' }}>
        {live === false && <div style={card}><b>This link is not active.</b></div>}
        {done && <div style={card}><h2 style={{ marginTop: 0 }}>Thank you, {f.name.split(' ')[0]}.</h2><p style={{ lineHeight: 1.6 }}>Your account is created. Our team will approve it shortly, then you can sign in and log your guests and tenants.</p><a href="/agent-portal" style={{ color: BLUE, fontWeight: 600 }}>Go to the agent portal</a></div>}
        {live && !done && (
          <form onSubmit={submit} style={card}>
            <label style={{ ...lab, marginTop: 0 }}>Full name <span style={{ color: '#D92D20' }}>*</span></label><input style={inp} value={f.name} onChange={e => set('name', e.target.value)} required />
            <label style={lab}>Email <span style={{ color: '#D92D20' }}>*</span></label><input style={inp} type="email" value={f.email} onChange={e => set('email', e.target.value)} required />
            <label style={lab}>Phone</label><input style={inp} type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} />
            <label style={lab}>Country</label><input style={inp} value={f.country} onChange={e => set('country', e.target.value)} placeholder="Jamaica / UK / UAE" />
            <label style={lab}>How should we pay your commission?</label>
            <select style={inp} value={f.payout_method} onChange={e => set('payout_method', e.target.value)}><option value="bank">Bank transfer</option><option value="wise">Wise</option><option value="other">Other</option></select>
            <label style={lab}>Payout details</label><input style={inp} value={f.payout_details} onChange={e => set('payout_details', e.target.value)} placeholder="Account name / reference" />
            <label style={lab}>Choose a password <span style={{ color: '#D92D20' }}>*</span></label><input style={inp} type="password" autoComplete="new-password" value={f.password} onChange={e => set('password', e.target.value)} minLength={8} required />
            <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>At least 8 characters. You will use it to sign in to your agent portal.</div>
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={e => set('website', e.target.value)} style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }} />
            {err && <div style={{ marginTop: 14, color: '#B42318', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ display: 'block', width: '100%', marginTop: 18, border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700, padding: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1 }}>{busy ? 'Creating…' : 'Create my agent account'}</button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#667085', marginTop: 12 }}>Already signed up? <a href="/agent-portal" style={{ color: BLUE, fontWeight: 600 }}>Sign in</a></div>
          </form>)}
      </div>
    </div>
  )
}
