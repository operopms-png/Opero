'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// Public partner sign-up page: helloopero.com/join/<slug>
// Shows the business's partner pitch and a one-time membership checkout.
// The account is only activated after Stripe confirms payment.

const ACCENT = '#3B4AFF'
const TEXT = '#101828'

const FEATURES = [
  { icon: '£', title: 'Your investment dashboard', desc: 'Capital in, returned, outstanding, payback and ROI, live.' },
  { icon: '%', title: 'Deal Analyser', desc: 'Run the numbers on any deal: rent-to-rent, HMO, buy-to-let and more.' },
  { icon: '✦', title: 'Partners broadcast', desc: 'New opportunities and updates from the team, with photos.' },
  { icon: '⌂', title: 'Owner Portal', desc: 'Bookings, statements and messages for properties you’re in.' },
]

export default function JoinPage() {
  // Next 16: route params come from useParams() in client pages (the params prop is a Promise)
  const { slug } = useParams() as { slug: string }
  const [link, setLink] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.rpc('public_join_link', { p_slug: slug }).then(({ data }) => {
      setLink(data ?? null)
      setLoaded(true)
    })
  }, [slug])

  async function join() {
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) { setError('Please fill in your name, email and phone.'); return }
    if (form.password.length < 8) { setError('Your password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/partner-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const fee = Number(link?.fee_gbp) || 75
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: TEXT }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', margin: '12px 0 4px' }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}
        @media(max-width:820px){.join-grid{grid-template-columns:1fr !important}}`}</style>
      <nav style={{ height: 60, background: '#fff', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8 }}>
        <img src="/logo.PNG" alt="Opero" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Opero</span>
      </nav>

      {!loaded ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
      ) : !link ? (
        <div style={{ maxWidth: 480, margin: '60px auto', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>This link isn’t active</div>
          <div style={{ fontSize: 14, color: '#667085' }}>Please check the link you were sent, or contact the team who shared it.</div>
        </div>
      ) : (
        <div className="join-grid" style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Partner programme</div>
            <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 10px' }}>{link.headline || 'Become a partner'}</h1>
            {link.blurb && <div style={{ fontSize: 15, color: '#667085', lineHeight: 1.6, marginBottom: 22 }}>{link.blurb}</div>}
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 12, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EEF0FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontWeight: 800 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                  <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 26 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Become a partner</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <b style={{ fontSize: 34 }}>£{fee % 1 === 0 ? fee : fee.toFixed(2)}</b>
              <span style={{ color: '#667085', fontSize: 14 }}>one-time membership</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 6 }}>No monthly fees. Membership is separate from any amount you invest.</div>

            <label style={label}>Full name</label>
            <input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" autoComplete="name" />
            <label style={label}>Email</label>
            <input style={input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" autoComplete="email" />
            <label style={label}>Phone</label>
            <input style={input} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 900000" autoComplete="tel" />
            <label style={label}>Create a password</label>
            <input style={input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min. 8 characters" autoComplete="new-password" onKeyDown={e => e.key === 'Enter' && join()} />

            {error && <div style={{ fontSize: 13, color: '#B42318', background: '#FEF3F2', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>{error}</div>}

            <button onClick={join} disabled={loading} style={{ width: '100%', marginTop: 18, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: 13, fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Opening secure payment…' : `Pay £${fee % 1 === 0 ? fee : fee.toFixed(2)} & join →`}
            </button>
            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
              Secure card payment by Stripe. Your account is created once payment succeeds, and you’ll go straight to your Partners portal.<br />
              Already a partner? <a href="/login" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
