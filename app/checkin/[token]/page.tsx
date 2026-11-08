'use client'
// The guest's online check-in page (public, opened from the link in their email): details, ID photo,
// security deposit card, house rules and terms. See lib/guest-checkin.ts and app/api/guest-checkin.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#1B2A4A', BLUE = '#2F6DB5', LINE = '#D5E4F5'
const FONT = "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
const money = (n: number, cur: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: (cur || 'gbp').toUpperCase() }).format(n)
const nice = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

async function call(path: string, body?: any) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

export default function GuestCheckin() {
  const { token } = useParams<{ token: string }>()
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', arrival_time: '', num_guests: '1' })
  const [sign, setSign] = useState({ accept: false, name: '' })
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const r = await call('/api/guest-checkin?token=' + token)
    if (!r.ok) { setErr(r.data?.error || 'This check-in link is not valid.'); return }
    setD(r.data)
    setForm(f => ({ guest_name: r.data.guest.name || f.guest_name, guest_phone: r.data.guest.phone || f.guest_phone, arrival_time: r.data.guest.arrival_time || f.arrival_time, num_guests: String(r.data.guest.num_guests || f.num_guests) }))
    if (r.data.status === 'complete') setDone(true)
  }, [token])

  useEffect(() => {
    load().then(async () => {
      const q = new URLSearchParams(window.location.search)
      if (q.get('deposit') === 'done' && q.get('session_id')) {
        const r = await call('/api/guest-checkin', { token, action: 'deposit_verify', session_id: q.get('session_id') })
        if (!r.ok) setMsg(r.data?.error || 'We could not confirm your card.')
        window.history.replaceState({}, '', window.location.pathname)
        load()
      } else if (q.get('deposit') === 'cancelled') { setMsg('Your card was not saved. You can try again.'); window.history.replaceState({}, '', window.location.pathname) }
    })
  }, [load, token])

  const step = async (action: string, extra: any, label: string) => {
    setBusy(label); setMsg('')
    const r = await call('/api/guest-checkin', { token, action, ...extra })
    setBusy('')
    if (!r.ok) { setMsg(r.data?.error || 'Something went wrong. Please try again.'); return null }
    await load(); return r.data
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy('upload'); setMsg('')
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('token', token); fd.append('file', f)
      const res = await fetch('/api/guest-checkin/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(j.error || 'Upload failed.'); break }
    }
    setBusy(''); if (fileRef.current) fileRef.current.value = ''; load()
  }
  async function removeFile(path: string) {
    setBusy('upload')
    await fetch(`/api/guest-checkin/upload?token=${token}&path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    setBusy(''); load()
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#EEF4FB', fontFamily: FONT, color: NAVY }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', minHeight: '100vh', boxShadow: '0 0 40px rgba(27,42,74,.08)' }}>{children}</div>
    </div>
  )
  if (err) return shell(<div style={{ padding: 40, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check-in link not found</div><div style={{ color: '#667085', fontSize: 14 }}>{err} Please use the link in your latest email, or contact your host.</div></div>)
  if (!d) return shell(<div style={{ padding: 60, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>)

  const detailsDone = !!(d.guest.name && d.guest.phone && d.guest.num_guests)
  const idDone = d.ids.length > 0
  const depositDone = !d.deposit.required || d.deposit.status === 'card_saved'
  const termsDone = d.terms.accepted
  const allDone = detailsDone && idDone && depositDone && termsDone
  const steps = [detailsDone, idDone, ...(d.deposit.required ? [depositDone] : []), termsDone]
  const n = (i: number) => i + 1

  const Card = ({ i, title, ok, children }: { i: number; title: string; ok: boolean; children: React.ReactNode }) => (
    <div style={{ border: `1px solid ${ok ? '#BFE3CC' : LINE}`, borderRadius: 14, padding: '14px 15px', marginBottom: 12, background: ok ? '#F6FCF8' : '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{i}. {title}</div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: ok ? '#E7F6EC' : '#FFF4E0', color: ok ? '#067647' : '#B54708' }}>{ok ? 'Done' : 'To do'}</span>
      </div>
      {children}
    </div>
  )
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: '1px solid #C9D6E6', fontSize: 16, fontFamily: 'inherit', marginBottom: 8, color: NAVY }
  const btn = (primary = true, disabled = false): React.CSSProperties => ({ width: '100%', padding: '13px', borderRadius: 11, border: primary ? 'none' : `1px solid ${BLUE}`, background: primary ? BLUE : '#fff', color: primary ? '#fff' : BLUE, fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .55 : 1, fontFamily: 'inherit' })

  const header = (
    <div style={{ background: NAVY, color: '#fff', padding: '22px 20px 16px' }}>
      <div style={{ fontSize: 11, letterSpacing: '.12em', opacity: .7 }}>ONLINE CHECK-IN</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{d.property.name}</div>
      <div style={{ fontSize: 13, opacity: .8, marginTop: 3 }}>{nice(d.booking.check_in)} to {nice(d.booking.check_out)}{d.property.address ? ` · ${d.property.address}` : ''}</div>
    </div>
  )

  if (done) return shell(<>{header}<div style={{ padding: '36px 24px', textAlign: 'center' }}>
    <div style={{ width: 56, height: 56, borderRadius: 28, background: '#E7F6EC', color: '#067647', fontSize: 30, lineHeight: '56px', margin: '0 auto 14px', fontWeight: 700 }}>✓</div>
    <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>You are checked in</div>
    <div style={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>Thank you{d.guest.name ? `, ${d.guest.name.split(' ')[0]}` : ''}. Everything is done. Your host will send your arrival instructions. We look forward to welcoming you.</div></div></>)

  return shell(<>
    {header}
    <div style={{ display: 'flex', gap: 5, padding: '14px 18px 0' }}>{steps.map((s, i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: s ? BLUE : LINE }} />)}</div>
    <div style={{ padding: '14px 18px 36px' }}>
      <div style={{ fontSize: 14, color: '#475467', marginBottom: 14, lineHeight: 1.5 }}>Please complete these steps before you arrive. It takes about two minutes.</div>
      {msg && <div style={{ background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, marginBottom: 12 }}>{msg}</div>}

      <Card i={n(0)} title="Your details" ok={detailsDone}>
        <input style={input} placeholder="Full name" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} autoComplete="name" />
        <input style={input} placeholder="Mobile number" value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })} inputMode="tel" autoComplete="tel" />
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={input} placeholder="Arrival time, e.g. 15:00" value={form.arrival_time} onChange={e => setForm({ ...form, arrival_time: e.target.value })} />
          <input style={{ ...input, width: 110 }} type="number" min={1} max={30} value={form.num_guests} onChange={e => setForm({ ...form, num_guests: e.target.value })} aria-label="Number of guests" />
        </div>
        <button style={btn(!detailsDone, busy === 'details')} disabled={!!busy} onClick={() => step('details', form, 'details')}>{busy === 'details' ? 'Saving…' : detailsDone ? 'Update details' : 'Save details'}</button>
      </Card>

      <Card i={n(1)} title="Photo ID" ok={idDone}>
        <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.5, marginBottom: 8 }}>A photo of the lead guest's passport or driving licence. It is private, seen only by the property team, and deleted {d.keepDays} days after your stay.</div>
        {d.ids.map((f: any) => (
          <div key={f.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '8px 10px', background: '#F2F7FD', borderRadius: 8, marginBottom: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
            <button onClick={() => removeFile(f.path)} style={{ border: 'none', background: 'none', color: '#B42318', fontSize: 13, cursor: 'pointer' }}>Remove</button>
          </div>
        ))}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture={undefined} multiple style={{ display: 'none' }} onChange={e => upload(e.target.files)} />
        <button style={btn(!idDone, busy === 'upload')} disabled={!!busy} onClick={() => fileRef.current?.click()}>{busy === 'upload' ? 'Uploading…' : idDone ? 'Add another photo' : 'Take or choose a photo'}</button>
      </Card>

      {d.deposit.required && (
        <Card i={n(2)} title="Security deposit" ok={depositDone}>
          <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.5, marginBottom: 8 }}>Nothing is charged now. Your card is kept on file for the {money(d.deposit.amount, d.deposit.currency)} deposit and is only charged if there is damage. It is released after check-out.</div>
          {depositDone ? <div style={{ fontSize: 13.5, color: '#067647', fontWeight: 600 }}>Card saved</div>
            : d.deposit.stripeReady
              ? <button style={btn(true, busy === 'deposit')} disabled={!!busy} onClick={async () => { const r = await step('deposit_start', {}, 'deposit'); if (r?.url) window.location.href = r.url }}>{busy === 'deposit' ? 'Opening…' : `Add card for the ${money(d.deposit.amount, d.deposit.currency)} deposit`}</button>
              : <div style={{ fontSize: 13.5, color: '#B54708' }}>Card saving is not set up for this property yet. Please contact your host.</div>}
        </Card>
      )}

      <Card i={n(d.deposit.required ? 3 : 2)} title="House rules and terms" ok={termsDone}>
        <div style={{ maxHeight: 190, overflowY: 'auto', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', background: '#FAFCFE', marginBottom: 10 }}>{d.terms.text || 'Please respect the property, the neighbours and the quiet hours. Your host will confirm any further rules.'}</div>
        {termsDone ? <div style={{ fontSize: 13.5, color: '#067647', fontWeight: 600 }}>Signed by {d.terms.signed_name}</div> : <>
          <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={sign.accept} onChange={e => setSign({ ...sign, accept: e.target.checked })} style={{ marginTop: 3, width: 18, height: 18 }} />
            <span>I have read and agree to the house rules and terms and conditions.</span>
          </label>
          <input style={input} placeholder="Type your full name to sign" value={sign.name} onChange={e => setSign({ ...sign, name: e.target.value })} />
          <button style={btn(true, !sign.accept || sign.name.trim().length < 3 || busy === 'terms')} disabled={!sign.accept || sign.name.trim().length < 3 || !!busy} onClick={() => step('terms', { accept: sign.accept, signed_name: sign.name }, 'terms')}>{busy === 'terms' ? 'Saving…' : 'Sign and agree'}</button>
        </>}
      </Card>

      <button style={{ ...btn(true, !allDone || busy === 'submit'), padding: 15, fontSize: 16 }} disabled={!allDone || !!busy}
        onClick={async () => { const r = await step('submit', {}, 'submit'); if (r) setDone(true) }}>{busy === 'submit' ? 'Submitting…' : 'Submit check-in'}</button>
      {!allDone && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#98A2B3', marginTop: 8 }}>Finish every step above to submit.</div>}
    </div>
  </>)
}
