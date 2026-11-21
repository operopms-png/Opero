'use client'
export const dynamic = 'force-dynamic'
// Public "Request a demo" form (linked from thenovourq.com). No login. Posts to /api/public/request-demo,
// which saves the lead in NOVOURQ's CRM at Enquiry.
import { useState } from 'react'

const NAVY = '#0B1B45', BLUE = '#2A3FA8', BG = '#D0D6F0'
const MANAGES = ['Long-term rentals', 'Short stays (Airbnb, Booking.com)', 'Estate agency / sales', 'Property development', 'A mix of these', 'Not sure yet']
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 10, border: '1px solid #A9B4DE', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: NAVY }
const lab: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 6px' }

export default function RequestDemoPage() {
  const [f, setF] = useState({ first_name: '', last_name: '', company: '', email: '', phone: '', manages: '', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/public/request-demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
      setDone(true); window.scrollTo(0, 0)
    } catch (x: any) { setErr(x.message) }
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "Manrope, Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: NAVY }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 16px 56px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32, alignItems: 'start' }}>
        <div>
          <div style={{ letterSpacing: 5, fontWeight: 700, fontSize: 15, marginBottom: 28 }}>NOVOURQ</div>
          <h1 style={{ fontSize: 'clamp(34px,5vw,54px)', lineHeight: 1.05, fontWeight: 300, letterSpacing: '-.03em', margin: '0 0 18px' }}>See <b style={{ fontWeight: 800 }}>Novourq Cloud AI</b> in action</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 460, margin: 0 }}>Tell us a little about you and we will arrange a demo of one dashboard for your properties, bookings, rent and team, with an AI that answers from your own data.</p>
        </div>
        <div style={{ background: NAVY, color: '#fff', borderRadius: 18, padding: '28px 24px', boxShadow: '0 18px 40px rgba(11,27,69,.25)' }}>
          {done ? (
            <div><h2 style={{ margin: '0 0 10px', fontSize: 28 }}>Thank you{f.first_name ? `, ${f.first_name}` : ''}.</h2><p style={{ lineHeight: 1.6, margin: 0 }}>We have your request. A member of our team will contact you shortly to arrange your demo. We have also sent a confirmation to {f.email}.</p></div>
          ) : (
            <form onSubmit={submit}>
              <h2 style={{ margin: '0 0 18px', fontSize: 30, fontWeight: 700 }}>Request a demo</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
                <div><label style={{ ...lab, color: '#C8D4F5' }}>First name *</label><input style={inp} value={f.first_name} onChange={e => set('first_name', e.target.value)} required /></div>
                <div><label style={{ ...lab, color: '#C8D4F5' }}>Last name *</label><input style={inp} value={f.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
                <div><label style={{ ...lab, color: '#C8D4F5' }}>Company name</label><input style={inp} value={f.company} onChange={e => set('company', e.target.value)} /></div>
                <div><label style={{ ...lab, color: '#C8D4F5' }}>Business email *</label><input style={inp} type="email" value={f.email} onChange={e => set('email', e.target.value)} required /></div>
              </div>
              <label style={{ ...lab, color: '#C8D4F5', marginTop: 14 }}>Phone or WhatsApp</label><input style={inp} value={f.phone} onChange={e => set('phone', e.target.value)} />
              <label style={{ ...lab, color: '#C8D4F5', marginTop: 14 }}>What do you manage?</label>
              <select style={inp} value={f.manages} onChange={e => set('manages', e.target.value)}><option value="">Select one</option>{MANAGES.map(m => <option key={m}>{m}</option>)}</select>
              <label style={{ ...lab, color: '#C8D4F5', marginTop: 14 }}>Tell us what you need</label>
              <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} value={f.message} onChange={e => set('message', e.target.value)} placeholder="Add notes" />
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={e => set('website', e.target.value)} style={{ position: 'absolute', left: -9999, height: 0, width: 0, opacity: 0 }} />
              {err && <div role="alert" style={{ marginTop: 14, color: '#FFB4AB', fontSize: 14 }}>{err}</div>}
              <button type="submit" disabled={busy} style={{ marginTop: 20, background: '#fff', color: NAVY, border: 0, borderRadius: 999, padding: '14px 30px', fontSize: 16, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? .7 : 1 }}>{busy ? 'Sending…' : 'Submit'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
