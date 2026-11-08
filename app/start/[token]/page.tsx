'use client'
export const dynamic = 'force-dynamic'
// The page a new client opens from a "new client link": their details, documents, then the contract to sign. No login.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PortalDocuments from '@/components/portal/PortalDocuments'
import SignDocument from '@/components/documents/SignDocument'

const BLUE = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }
const lab: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#667085', margin: '12px 0 4px' }
const btn: React.CSSProperties = { display: 'block', width: '100%', marginTop: 16, border: 'none', borderRadius: 8, background: BLUE, color: '#fff', fontSize: 15, fontWeight: 600, padding: 12, cursor: 'pointer', fontFamily: 'inherit' }

export default function StartPage() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ name: '', email: '', phone: '', property: '' })
  const [busy, setBusy] = useState(false)
  const [lk, setLk] = useState('')
  const [docTok, setDocTok] = useState('')
  const [signState, setSignState] = useState<any>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/public/onboard?t=' + encodeURIComponent(token)).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'This link is not valid.'); else {
      setD(j); setF({ name: j.prefill.name, email: j.prefill.email, phone: '', property: j.prefill.property })
      if (j.expired) setErr('This link has expired. Please ask us to send you a new one.')
      else if (j.status === 'done') setDone(true)
      else if (j.link_token) { setLk(j.link_token); setDocTok(j.doc_token || ''); setStep(j.ask_docs ? 1 : j.doc_token ? 2 : 3) }
    } }).catch(() => setErr('Could not load this page.'))
  }, [token])
  useEffect(() => { // load the contract when we reach the signing step
    if (step !== 2 || !docTok || signState) return
    fetch('/api/public/document?t=' + docTok).then(async r => { const j = await r.json().catch(() => ({})); if (r.ok && j.doc) setSignState(j); else setStep(3) }).catch(() => setStep(3))
  }, [step, docTok, signState])

  const post = async (body: any) => { const r = await fetch('/api/public/onboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, ...body }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j }
  async function saveDetails() {
    setErr(''); setBusy(true)
    try { const j = await post(f); setLk(j.link_token); setDocTok(j.doc_token || ''); setStep(d.ask_docs ? 1 : j.doc_token ? 2 : 3); if (!d.ask_docs && !j.doc_token) await post({ action: 'finish' }) }
    catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  async function afterDocs() { if (docTok) setStep(2); else { try { await post({ action: 'finish' }) } catch { /* shown as done anyway */ } setStep(3) } }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F4F7FB', fontFamily: 'Figtree, Segoe UI, Arial, sans-serif', color: '#1B2A4A' }
  if (step === 2 && signState) return <SignDocument token={docTok} first={signState} />
  if (!d && !err) return <div style={{ ...wrap, textAlign: 'center', paddingTop: 80, color: '#98A2B3' }}>Loading…</div>
  const names = ['Your details', 'Documents', 'Sign', 'Done'], total = (d?.ask_docs ? 1 : 0) + (d?.has_contract ? 1 : 0) + 2
  const shown = done ? 3 : step
  return (
    <div style={wrap}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '14px 16px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE }}>{d?.company || 'NOVOURQ'}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{shown === 3 ? 'All done' : 'Welcome'}</div>
          {d && !err && <><div style={{ display: 'flex', gap: 6, marginTop: 10 }}>{names.map((_, i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= shown ? BLUE : '#E4E7EC' }} />)}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>Step {shown + 1} of 4 · {names[shown]}</div></>}
        </div>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 16px 40px' }}>
        {err && <div style={{ background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 12 }}>{err}</div>}
        {d && !d.expired && !done && step === 0 && <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Tell us about you</div>
          <div style={{ fontSize: 13, color: '#667085' }}>{d.kind === 'owner' ? 'So we can set up your management agreement.' : 'So we can prepare your tenancy.'}</div>
          <label style={lab} htmlFor="n">Full name</label><input id="n" style={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" />
          <label style={lab} htmlFor="e">Email</label><input id="e" style={inp} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" />
          <label style={lab} htmlFor="p">Phone</label><input id="p" style={inp} type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
          <label style={lab} htmlFor="a">{d.kind === 'owner' ? 'Property address' : 'Property you are renting'}</label><input id="a" style={inp} value={f.property} onChange={e => setF({ ...f, property: e.target.value })} />
          <button style={{ ...btn, opacity: busy ? .6 : 1 }} disabled={busy} onClick={saveDetails}>{busy ? 'Saving…' : 'Continue'}</button>
        </div>}
        {d && !d.expired && !done && step === 1 && lk && <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Upload your documents</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 8 }}>Take a photo with your phone or choose a file. You can add more later from your private link.</div>
          <PortalDocuments kind={d.subject} link={lk} />
          <button style={btn} onClick={afterDocs}>{docTok ? 'Continue to sign' : 'Finish'}</button>
        </div>}
        {(done || step === 3) && !err && <div style={{ background: '#E7F6EC', border: '1px solid #B7E4C7', color: '#067647', borderRadius: 12, padding: 18, textAlign: 'center', fontWeight: 600 }}>
          Thank you{f.name ? ', ' + f.name.split(' ')[0] : ''}. We have everything we need for now.
          <div style={{ fontWeight: 400, fontSize: 13.5, marginTop: 8, color: '#344054' }}>We will check your documents and be in touch.{lk && <> <a href={`/d/${lk}`} style={{ color: BLUE }}>Open your documents page</a> any time to upload more or see your invoices.</>}</div>
        </div>}
      </div>
    </div>
  )
}
