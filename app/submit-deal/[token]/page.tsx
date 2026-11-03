'use client'
export const dynamic = 'force-dynamic'
// Public page: a local agent or partner submits a deal straight into a client's pipeline. No sign-in needed.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: '#fff', color: '#1B2F4B' }
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }
const blank = { name: '', company: '', email: '', phone: '', address: '', price: '', currency: 'JMD', beds: '', propertyType: '', rent: '', url: '', notes: '', website: '' }

export default function SubmitDeal() {
  const { token } = useParams<{ token: string }>()
  const [company, setCompany] = useState('')
  const [bad, setBad] = useState(false)
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    fetch('/api/deal-submit?token=' + encodeURIComponent(token)).then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) setBad(true); else setCompany(d.company || '') }).catch(() => setBad(true))
  }, [token])
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  async function send() {
    setBusy(true); setErr('')
    const r = await fetch('/api/deal-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, token }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(d.error || 'Something went wrong. Please try again.'); return }
    setDone(true); setF(blank)
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F4F7FB', padding: '32px 16px', fontFamily: 'system-ui, sans-serif', color: '#1B2F4B' }
  const box: React.CSSProperties = { maxWidth: 620, margin: '0 auto', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 28 }
  if (bad) return <div style={wrap}><div style={box}><h1 style={{ fontSize: 20, margin: 0 }}>This link is not active</h1><p style={{ color: '#667085' }}>Please ask for a new link.</p></div></div>
  if (done) return <div style={wrap}><div style={box}><h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Thank you</h1><p style={{ color: '#667085', margin: '0 0 16px' }}>Your deal has been sent{company ? ' to ' + company : ''}. They will be in touch if it is a fit.</p><button onClick={() => setDone(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Submit another deal</button></div></div>

  return (
    <div style={wrap}><div style={box}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>Submit a deal{company ? ` to ${company}` : ''}</h1>
      <p style={{ color: '#667085', fontSize: 14, margin: '0 0 22px' }}>Send a property you think is a good investment. It goes straight into their deal pipeline.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <div><label style={label} htmlFor="n">Your name *</label><input id="n" style={input} value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div><label style={label} htmlFor="c">Company or agency</label><input id="c" style={input} value={f.company} onChange={set('company')} autoComplete="organization" /></div>
        <div><label style={label} htmlFor="e">Email *</label><input id="e" type="email" style={input} value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div><label style={label} htmlFor="p">Phone</label><input id="p" type="tel" style={input} value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="a">Property address *</label><input id="a" style={input} value={f.address} onChange={set('address')} placeholder="Street, town or area, parish or city" /></div>
        <div><label style={label} htmlFor="pr">Asking price *</label><input id="pr" inputMode="numeric" style={input} value={f.price} onChange={set('price')} /></div>
        <div><label style={label} htmlFor="cu">Currency</label><select id="cu" style={input} value={f.currency} onChange={set('currency')}><option value="JMD">JMD (J$)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option></select></div>
        <div><label style={label} htmlFor="b">Bedrooms</label><input id="b" inputMode="numeric" style={input} value={f.beds} onChange={set('beds')} /></div>
        <div><label style={label} htmlFor="t">Property type</label><input id="t" style={input} value={f.propertyType} onChange={set('propertyType')} placeholder="House, apartment, land…" /></div>
        <div><label style={label} htmlFor="r">Expected monthly rent</label><input id="r" inputMode="numeric" style={input} value={f.rent} onChange={set('rent')} /></div>
        <div><label style={label} htmlFor="u">Link to listing or photos</label><input id="u" style={input} value={f.url} onChange={set('url')} placeholder="https://" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="no">Anything else we should know</label><textarea id="no" rows={4} style={{ ...input, resize: 'vertical' }} value={f.notes} onChange={set('notes')} placeholder="Condition, title status, why it is a good deal" /></div>
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
      {err && <div role="alert" style={{ color: '#B42318', fontSize: 14, marginTop: 14 }}>{err}</div>}
      <button onClick={send} disabled={busy} style={{ marginTop: 20, padding: '12px 24px', borderRadius: 8, border: 0, background: '#2F6DB5', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: busy ? .6 : 1 }}>{busy ? 'Sending…' : 'Submit deal'}</button>
    </div></div>
  )
}
