'use client'
export const dynamic = 'force-dynamic'
// Public careers page: open roles, and an application form for the chosen role. No login.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#16233F', BLUE = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: NAVY, background: '#fff' }
const lab: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, margin: '14px 0 5px' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 14 }
type Role = { id: string; title: string; category: string; location: string; job_type: string; description: string }

export default function CareersPage() {
  const { token } = useParams() as { token: string }
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [live, setLive] = useState(true)
  const [pick, setPick] = useState<string>('')
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => { fetch('/api/public/careers?t=' + encodeURIComponent(token)).then(async r => { if (!r.ok) { setLive(false); return } const j = await r.json(); setRoles(j.roles) }).catch(() => setLive(false)) }, [token])
  const role = roles?.find(r => r.id === pick)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/public/careers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, role_id: pick, ...f }) })
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong.')
      setDone(true); window.scrollTo(0, 0)
    } catch (x: any) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: "Inter, system-ui, sans-serif", color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '26px 16px 60px', textAlign: 'center' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24 }}>Careers</h1>
        <div style={{ opacity: .8, fontSize: 14 }}>Join the team. Choose a role and apply below.</div>
      </div>
      <div style={{ maxWidth: 640, margin: '-36px auto 0', padding: '0 16px 40px' }}>
        {!live && <div style={card}><b>This page is not active.</b></div>}
        {live && roles === null && <div style={card}>Loading…</div>}
        {done && <div style={card}><h2 style={{ marginTop: 0 }}>Thank you, {f.name.split(' ')[0]}.</h2><p style={{ lineHeight: 1.6 }}>We have your application for {role?.title}. We will be in touch if we would like to take it further.</p></div>}
        {live && roles && !done && (roles.length === 0
          ? <div style={card}><b>There are no open roles right now.</b><p style={{ color: '#667085', fontSize: 14 }}>Please check back soon.</p></div>
          : <form onSubmit={submit}>
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Open roles</div>
                {roles.map(r => (
                  <button type="button" key={r.id} onClick={() => setPick(r.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 10, border: `2px solid ${pick === r.id ? BLUE : '#E4E7EC'}`, background: pick === r.id ? '#EAF2FB' : '#fff', cursor: 'pointer', fontFamily: 'inherit', color: NAVY, marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>{r.title}</div>
                    <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>{[r.category, r.location, r.job_type].filter(Boolean).join(' · ')}</div>
                    {pick === r.id && r.description && <div style={{ fontSize: 13.5, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{r.description}</div>}
                  </button>))}
              </div>
              {pick && <div style={card}>
                <div style={{ fontWeight: 700 }}>Apply for {role?.title}</div>
                <label style={lab}>Full name <span style={{ color: '#D92D20' }}>*</span></label><input style={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
                <label style={lab}>Email <span style={{ color: '#D92D20' }}>*</span></label><input style={inp} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
                <label style={lab}>Phone</label><input style={inp} type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
                <label style={lab}>Tell us about yourself</label><textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} />
                <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }} />
                {err && <div style={{ marginTop: 14, color: '#B42318', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
                <button type="submit" disabled={busy} style={{ display: 'block', width: '100%', marginTop: 18, border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700, padding: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1 }}>{busy ? 'Sending…' : 'Submit application'}</button>
              </div>}
            </form>)}
      </div>
    </div>
  )
}
