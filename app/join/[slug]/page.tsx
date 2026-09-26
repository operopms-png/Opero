'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// Public partner sign-up page: helloopero.com/join/<slug>
// Shows the business's partner pitch and a one-time membership payment:
// card (Stripe, when the business has connected Stripe) or bank transfer
// (bank details + unique reference; staff confirm to unlock the account).

const ACCENT = '#3B4AFF'
const TEXT = '#101828'

const FEATURES = [
  { icon: '£', title: 'Your investment dashboard', desc: 'Capital in, returned, outstanding, payback and ROI, live.' },
  { icon: '%', title: 'Deal Analyser', desc: 'Run the numbers on any deal: rent-to-rent, HMO, buy-to-let and more.' },
  { icon: '✦', title: 'Partners broadcast', desc: 'New opportunities and updates from the team, with photos.' },
  { icon: '⌂', title: 'Owner Portal', desc: 'Bookings, statements and messages for properties you’re in.' },
]

type BankInfo = { signup_id: string; reference: string; amount: number; bank_name: string | null; account_name: string | null; sort_code: string; account_number: string; email: string }

export default function JoinPage() {
  // Next 16: route params come from useParams() in client pages (the params prop is a Promise)
  const { slug } = useParams() as { slug: string }
  const [link, setLink] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [method, setMethod] = useState<'card' | 'bank'>('card')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bank, setBank] = useState<BankInfo | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  useEffect(() => {
    supabase.rpc('public_join_link', { p_slug: slug }).then(({ data }) => {
      setLink(data ?? null)
      if (data && !data.card_enabled && data.bank_enabled) setMethod('bank')
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
        body: JSON.stringify({ slug, ...form, method }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      if (data.bank) { setBank(data.bank); setLoading(false); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
      setError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function markSent() {
    if (!bank) return
    setSending(true)
    try {
      await fetch('/api/partner-join/sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id: bank.signup_id, reference: bank.reference }),
      })
      setSent(true)
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setSending(false)
  }

  async function copy(key: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopiedKey(key); setTimeout(() => setCopiedKey(''), 1500) } catch {}
  }

  const fee = Number(link?.fee_gbp) || 75
  const feeText = `£${fee % 1 === 0 ? fee : fee.toFixed(2)}`
  const cardOn = !!link?.card_enabled
  const bankOn = !!link?.bank_enabled
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: TEXT }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', margin: '12px 0 4px' }
  const option = (on: boolean, disabled: boolean): React.CSSProperties => ({
    flex: 1, textAlign: 'left', padding: '10px 12px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    border: `1.5px solid ${on ? ACCENT : '#D0D5DD'}`, background: on ? '#EEF0FF' : '#fff', opacity: disabled ? 0.5 : 1,
  })

  const detailRow = (k: string, l: string, v: string, mono = false) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F2F4F7' }}>
      <span style={{ fontSize: 13, color: '#667085' }}>{l}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b style={{ fontSize: 14, fontFamily: mono ? 'monospace' : 'inherit' }}>{v}</b>
        <button onClick={() => copy(k, v)} style={{ background: 'none', border: '1px solid #D0D5DD', borderRadius: 6, fontSize: 11, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>{copiedKey === k ? 'Copied' : 'Copy'}</button>
      </span>
    </div>
  )

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
      ) : bank ? (
        <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 26 }}>
            {!sent ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Almost done</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Pay {feeText} by bank transfer</div>
                <div style={{ fontSize: 14, color: '#667085', lineHeight: 1.6, marginBottom: 12 }}>
                  Send the payment from your banking app using the details below. <b style={{ color: TEXT }}>Use the reference exactly</b> so we can match your payment.
                </div>
                <div style={{ marginBottom: 16 }}>
                  {detailRow('amt', 'Amount', feeText)}
                  {detailRow('name', 'Account name', bank.account_name ?? '')}
                  {bank.bank_name && detailRow('bank', 'Bank', bank.bank_name)}
                  {detailRow('sort', 'Sort code', bank.sort_code, true)}
                  {detailRow('acc', 'Account number', bank.account_number, true)}
                  {detailRow('ref', 'Reference', bank.reference, true)}
                </div>
                <button onClick={markSent} disabled={sending} style={{ width: '100%', background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: 13, fontWeight: 700, fontSize: 15, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {sending ? 'Letting the team know…' : 'I’ve sent the payment'}
                </button>
                <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                  Your account is created and will unlock as soon as the team confirms your payment.
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ECFDF3', color: '#067647', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>✓</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Thanks, we’ll check for your payment</div>
                <div style={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
                  Once your transfer with reference <b style={{ color: TEXT, fontFamily: 'monospace' }}>{bank.reference}</b> arrives, we’ll unlock your account and email <b style={{ color: TEXT }}>{bank.email}</b> a sign-in link. Bank transfers usually arrive within a few hours.
                </div>
              </div>
            )}
          </div>
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
              <b style={{ fontSize: 34 }}>{feeText}</b>
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

            <label style={label}>How would you like to pay?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={!cardOn} onClick={() => setMethod('card')} style={option(method === 'card', !cardOn)}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Card</div>
                <div style={{ fontSize: 11.5, color: '#667085' }}>{cardOn ? 'Instant access' : 'Coming soon'}</div>
              </button>
              <button type="button" disabled={!bankOn} onClick={() => setMethod('bank')} style={option(method === 'bank', !bankOn)}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Bank transfer</div>
                <div style={{ fontSize: 11.5, color: '#667085' }}>{bankOn ? 'Unlocked once received' : 'Not available'}</div>
              </button>
            </div>

            {error && <div style={{ fontSize: 13, color: '#B42318', background: '#FEF3F2', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>{error}</div>}

            <button onClick={join} disabled={loading || (!cardOn && !bankOn)} style={{ width: '100%', marginTop: 18, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: 13, fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading || (!cardOn && !bankOn) ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? (method === 'card' ? 'Opening secure payment…' : 'Getting bank details…') : method === 'card' ? `Pay ${feeText} & join →` : 'Continue to bank details →'}
            </button>
            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
              {method === 'card'
                ? 'Secure card payment by Stripe. Your account is created once payment succeeds, and you’ll go straight to your Partners portal.'
                : 'We’ll show you our bank details and your payment reference. Your account unlocks once the team confirms your transfer.'}<br />
              Already a partner? <a href="/login" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
