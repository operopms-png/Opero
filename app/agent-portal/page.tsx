'use client'
export const dynamic = 'force-dynamic'
// Agent portal: an agent signs in, sees their code, logs their own guests and tenants and follows each one's commission.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENCIES, type Cur } from '@/lib/currency'

const NAVY = '#16233F', BLUE = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: NAVY, background: '#fff' }
const lab: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, margin: '12px 0 5px' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '18px 18px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 14 }
const STATUS: Record<string, string> = { logged: 'Logged', screening: 'Screening', approved: 'Approved', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' }
const CSTAT: Record<string, string> = { none: '', pending: 'Commission pending', payable: 'Commission due', paid: 'Paid', clawed_back: 'Clawed back' }
const STEPS = [
  ['1', 'Log', 'Add your guest or tenant with the + Log button.'],
  ['2', 'We screen', 'Our team checks them. You can follow the status below.'],
  ['3', 'Approved', 'They book or move in. The status changes to Approved, then Completed.'],
  ['4', 'You get paid', 'We confirm your commission and pay it to the account you gave us.'],
]
function HowItWorks() {
  return (
    <details open style={{ ...card, padding: '14px 18px' }}>
      <summary style={{ fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>How it works</summary>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 14 }}>
        {STEPS.map(([n, t, d], i) => (
          <div key={n} style={{ position: 'relative', background: '#F5F8FC', border: '1px solid #E4EAF3', borderRadius: 12, padding: '12px 12px 14px' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 3 ? '#12B76A' : BLUE, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 14, margin: '8px 0 3px' }}>{t}</div>
            <div style={{ fontSize: 12.5, color: '#667085', lineHeight: 1.45 }}>{d}</div>
          </div>))}
      </div>
    </details>
  )
}
const blank = { referral_type: 'short_term', channel: 'direct', person_name: '', person_email: '', person_phone: '', property_label: '', start_date: '', end_date: '', value: '', notes: '' }

export default function AgentPortal() {
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading')
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  const [email, setEmail] = useState(''), [pw, setPw] = useState('')
  const [cur, setCur] = useState<Cur>('GBP')
  useEffect(() => { try { const c = localStorage.getItem('agent-cur') as Cur; if (c && CURRENCIES[c]) setCur(c) } catch {} }, [])
  const pick = (c: Cur) => { setCur(c); try { localStorage.setItem('agent-cur', c) } catch {} }
  const money = (n: number) => { const x = (Number(n) || 0) * (data?.rates?.[cur] ?? 1); return CURRENCIES[cur].sym + x.toLocaleString(CURRENCIES[cur].locale, { minimumFractionDigits: 0, maximumFractionDigits: cur === 'JMD' ? 0 : 2 }) }
  const [form, setForm] = useState<any>(blank), [showForm, setShowForm] = useState(false), [busy, setBusy] = useState(false)

  const call = useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const r = await fetch('/api/agent-portal', { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } })
    return { ok: r.ok, j: await r.json().catch(() => ({})) }
  }, [])
  const load = useCallback(async () => {
    const r = await call()
    if (!r) { setState('out'); return }
    if (!r.ok) { setErr(r.j.error || 'Could not load your account.'); setState('out'); return }
    setData(r.j); setState('in')
  }, [call])
  useEffect(() => { load() }, [load])

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) { setErr('Email or password is not right.'); return }
    load()
  }
  async function logOut() { await supabase.auth.signOut(); setData(null); setState('out') }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = await call({ method: 'POST', body: JSON.stringify(form) })
    setBusy(false)
    if (!r?.ok) { setErr(r?.j.error || 'Could not save.'); return }
    setForm(blank); setShowForm(false); load()
  }
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))
  const a = data?.agent, refs: any[] = data?.referrals ?? []
  const owed = refs.filter(r => r.commission_status === 'payable').reduce((s, r) => s + (r.commission ?? 0), 0)
  const paid = refs.filter(r => r.commission_status === 'paid').reduce((s, r) => s + (r.commission ?? 0), 0)
  const pending = refs.filter(r => ['pending', 'none'].includes(r.commission_status) && !['rejected', 'cancelled'].includes(r.status)).reduce((s, r) => s + (r.commission ?? 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: 'Inter, system-ui, sans-serif', color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '22px 16px 56px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div><div style={{ opacity: .8, fontSize: 14, marginTop: 4 }}>Agent portal</div></div>
          {state === 'in' && <button onClick={logOut} style={{ background: 'none', border: '1px solid rgba(255,255,255,.4)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>}
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: '-34px auto 0', padding: '0 16px 40px' }}>
        {state === 'loading' && <div style={card}>Loading…</div>}
        {state === 'out' && (
          <form onSubmit={signIn} style={card}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Sign in</div>
            <label style={lab}>Email</label><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
            <label style={lab}>Password</label><input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="current-password" />
            {err && <div style={{ marginTop: 12, color: '#B42318', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ display: 'block', width: '100%', marginTop: 16, border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700, padding: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <div style={{ fontSize: 13, color: '#667085', marginTop: 12 }}>New agent? Use the sign-up link we sent you. Forgotten your password? <a href="/reset-password" style={{ color: BLUE }}>Reset it</a>.</div>
          </form>)}
        {state === 'in' && a && <>
          <div style={card}>
            <div style={{ fontSize: 13, color: '#667085' }}>Welcome</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{a.name}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 14 }}>
              <span style={{ background: '#EAF2FB', borderRadius: 999, padding: '5px 12px' }}>Your code: <b>{a.code}</b></span>
            </div>
            {a.status !== 'active' && <div style={{ marginTop: 12, background: '#FFF6E5', border: '1px solid #F5D9A0', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}>Your account is waiting for approval. You can log guests and tenants once it is approved.</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 10, fontSize: 13 }}>
            <label htmlFor="cur" style={{ margin: 0, color: '#667085', fontWeight: 400 }}>Show amounts in</label>
            <select id="cur" value={cur} onChange={e => pick(e.target.value as Cur)} style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: 13.5 }}>{(Object.keys(CURRENCIES) as Cur[]).map(c => <option key={c} value={c}>{CURRENCIES[c].label}</option>)}</select>
          </div>
          {cur !== 'GBP' && <div style={{ fontSize: 12, color: '#667085', margin: '-4px 0 10px', textAlign: 'right' }}>Converted from pounds at today’s rate. Your commission is agreed and paid in pounds.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 14 }}>
            {[['Due to you', money(owed)], ['Pending', money(pending)], ['Paid', money(paid)]].map(([l, v]) => <div key={l} style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12.5, color: '#667085' }}>{l}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{v}</div></div>)}
          </div>
          <HowItWorks />
          {a.status === 'active' && !showForm && <button onClick={() => setShowForm(true)} style={{ display: 'block', width: '100%', border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700, padding: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>+ Log a guest or tenant</button>}
          {showForm && (
            <form onSubmit={save} style={card}>
              <div style={{ fontWeight: 700 }}>Log a guest or tenant</div>
              <label style={lab}>Is this a guest or a tenant?</label>
              <select style={inp} value={form.referral_type} onChange={e => set('referral_type', e.target.value)}><option value="short_term">Guest (short stay)</option><option value="long_term">Tenant (long term)</option></select>
              <label style={lab}>Name *</label><input style={inp} value={form.person_name} onChange={e => set('person_name', e.target.value)} required />
              <label style={lab}>Email</label><input style={inp} type="email" value={form.person_email} onChange={e => set('person_email', e.target.value)} />
              <label style={lab}>Phone</label><input style={inp} type="tel" value={form.person_phone} onChange={e => set('person_phone', e.target.value)} />
              <label style={lab}>Property</label><input style={inp} value={form.property_label} onChange={e => set('property_label', e.target.value)} placeholder="Which property" />
              {form.referral_type === 'short_term' && <><label style={lab}>Where did they book?</label><select style={inp} value={form.channel} onChange={e => set('channel', e.target.value)}><option value="direct">Direct</option><option value="airbnb">Airbnb</option><option value="booking_com">Booking.com</option><option value="other">Other</option></select></>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
                <div><label style={lab}>{form.referral_type === 'short_term' ? 'Check-in' : 'Move-in'}</label><input style={inp} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
                {form.referral_type === 'short_term' && <div><label style={lab}>Check-out</label><input style={inp} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>}
              </div>
              <label style={lab}>{form.referral_type === 'short_term' ? 'Booking value (£)' : 'Monthly rent (£)'}</label><input style={inp} type="number" min="0" step="any" value={form.value} onChange={e => set('value', e.target.value)} />
              <label style={lab}>Notes</label><textarea style={{ ...inp, minHeight: 70 }} value={form.notes} onChange={e => set('notes', e.target.value)} />
              {err && <div style={{ marginTop: 12, color: '#B42318', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}><button type="submit" disabled={busy} style={{ flex: 1, border: 'none', borderRadius: 10, background: NAVY, color: '#fff', fontWeight: 700, padding: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{busy ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => { setShowForm(false); setErr('') }} style={{ borderRadius: 10, border: '1px solid #D0D5DD', background: '#fff', padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit', color: NAVY }}>Cancel</button></div>
            </form>)}
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Your guests and tenants</div>
            {refs.length === 0 && <div style={{ color: '#667085', fontSize: 14, padding: '8px 0' }}>None logged yet.</div>}
            {refs.map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid #EAECF0', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.person_name}</div>
                  <div style={{ fontSize: 12.5, color: '#667085' }}>{r.referral_type === 'short_term' ? 'Guest' : 'Tenant'}{r.property_label ? ' · ' + r.property_label : ''} · Logged {new Date(r.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{STATUS[r.status] ?? r.status}</div>
                  <div style={{ fontSize: 12.5, color: '#667085' }}>{r.commission == null ? 'Commission to be confirmed' : money(r.commission) + (CSTAT[r.commission_status] ? ' · ' + CSTAT[r.commission_status] : '')}</div>
                </div>
              </div>))}
          </div>
        </>}
      </div>
    </div>
  )
}
