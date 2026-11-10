'use client'
// Landlord onboarding. Staff (landlordId given): checklist, named manager, agreement terms, sign-off.
// Landlord portal: view="progress" (checklist card), "manager" (My Manager tab) or "agreement" (Agreement tab), read only.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AGREEMENT_TYPES, type Step } from '../../lib/landlord-onboarding'

const ACCENT = '#89CFF0', INK = '#323338', MUTE = '#667085', LINE = '#E6E9EF'
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #D0D4E4', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
const btn: React.CSSProperties = { background: ACCENT, color: '#fff', border: 'none', borderRadius: 4, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const day = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

type Data = { landlord: { id: string; name: string }; manager: { name: string; role: string; email: string | null; phone: string | null } | null; agreement: { type: string | null; label: string | null; start: string | null; end: string | null; terms: string | null }; steps: Step[]; onboarded_at: string | null; staff: boolean; team?: { id: string; name: string; role: string }[]; manager_id?: string | null }

export function useOnboarding(landlordId?: string) {
  const [d, setD] = useState<Data | null>(null), [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/landlord-onboarding' + (landlordId ? `?landlord_id=${landlordId}` : ''), { headers: { Authorization: `Bearer ${session?.access_token}` } })
    const j = await r.json().catch(() => ({})); if (r.ok) setD(j); else setErr(j.error || 'Could not load')
  }, [landlordId])
  useEffect(() => { load() }, [load])
  return { d, err, reload: load }
}

function Checklist({ steps }: { steps: Step[] }) {
  return <>{steps.map((s, i) => (
    <div key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: s.done ? '#067647' : '#fff', border: `2px solid ${s.done ? '#067647' : '#D0D5DD'}`, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.done ? '✓' : ''}</span>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: s.done ? INK : MUTE }}>{s.label}</div><div style={{ fontSize: 12, color: '#98A2B3' }}>{s.hint}</div></div>
    </div>
  ))}</>
}

export default function LandlordOnboarding({ landlordId, view }: { landlordId?: string; view?: 'progress' | 'manager' | 'agreement' }) {
  const { d, err, reload } = useOnboarding(landlordId)
  const [f, setF] = useState({ manager_id: '', agreement_type: '', agreement_start: '', agreement_end: '', agreement_terms: '' }), [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  useEffect(() => { if (d?.staff) setF({ manager_id: d.manager_id ?? '', agreement_type: d.agreement.type ?? '', agreement_start: d.agreement.start ?? '', agreement_end: d.agreement.end ?? '', agreement_terms: d.agreement.terms ?? '' }) }, [d])
  if (!d) return <div style={{ ...card, fontSize: 13, color: err ? '#B42318' : '#98A2B3' }}>{err || 'Loading…'}</div>
  const done = d.steps.filter(s => s.done).length, total = d.steps.length

  async function save(extra: any = {}) {
    setBusy(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/landlord-onboarding', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ landlord_id: landlordId, ...f, manager_id: f.manager_id || null, ...extra }) })
    const j = await r.json().catch(() => ({})); setBusy(false)
    setMsg(r.ok ? 'Saved' : j.error || 'Could not save'); if (r.ok) reload(); setTimeout(() => setMsg(''), 2500)
  }

  if (view === 'progress') {
    if (d.onboarded_at) return null
    return <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>Getting you set up</div>
      <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>{done} of {total} steps complete</div>
      <div style={{ height: 8, background: '#EEF0F4', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}><div style={{ width: `${(done / total) * 100}%`, height: '100%', background: ACCENT }} /></div>
      <Checklist steps={d.steps} />
    </div>
  }

  if (view === 'manager') {
    const m = d.manager
    return <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 12 }}>Your property manager</div>
      {!m ? <div style={{ fontSize: 13, color: '#98A2B3' }}>Your manager will be named here shortly. Until then, use the Messages tab and the team will reply.</div> : (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#EAF3FC', color: '#2F6DB5', fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.name.charAt(0)}</div>
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div><div style={{ fontSize: 12, color: MUTE }}>{m.role}</div>
            {m.email && <div style={{ fontSize: 13, marginTop: 6 }}>{m.email}</div>}{m.phone && <div style={{ fontSize: 13 }}>{m.phone}</div>}</div>
        </div>)}
      <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 14 }}>For anything about your property, message us in the Messages tab. We reply there.</div>
    </div>
  }

  if (view === 'agreement') {
    const a = d.agreement
    return <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 12 }}>Your agreement with us</div>
      {!a.type ? <div style={{ fontSize: 13, color: '#98A2B3' }}>Your agreement details will appear here once they are agreed.</div> : <>
        {[['Agreement', a.label], ['Starts', a.start ? day(a.start) : null], ['Ends', a.end ? day(a.end) : null]].filter(r => r[1]).map(r => <div key={r[0] as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${LINE}`, fontSize: 13 }}><span style={{ color: MUTE }}>{r[0]}</span><b>{r[1]}</b></div>)}
        {a.terms && <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10, fontSize: 13, whiteSpace: 'pre-wrap' }}>{a.terms}</div>}</>}
      <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 14 }}>Your signed copy is in the Documents tab.</div>
    </div>
  }

  // staff
  const lbl = (t: string) => <div style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 4 }}>{t}</div>
  return (
    <div style={{ ...card, background: '#F9FAFB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Onboarding: {d.landlord.name}</div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: d.onboarded_at ? '#E7F6EC' : '#FEF0C7', color: d.onboarded_at ? '#067647' : '#B54708' }}>{d.onboarded_at ? `Onboarded ${day(d.onboarded_at.slice(0, 10))}` : `${done} of ${total} steps`}</span>
      </div>
      <Checklist steps={d.steps} />
      <div style={{ borderTop: `1px solid ${LINE}`, margin: '12px 0', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        <div>{lbl('Their manager')}<select style={input} value={f.manager_id} onChange={e => setF({ ...f, manager_id: e.target.value })}><option value="">Not assigned</option>{(d.team ?? []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}</select></div>
        <div>{lbl('Agreement type')}<select style={input} value={f.agreement_type} onChange={e => setF({ ...f, agreement_type: e.target.value })}><option value="">Not agreed</option>{Object.entries(AGREEMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div>{lbl('Starts')}<input type="date" style={input} value={f.agreement_start} onChange={e => setF({ ...f, agreement_start: e.target.value })} /></div>
        <div>{lbl('Ends')}<input type="date" style={input} value={f.agreement_end} onChange={e => setF({ ...f, agreement_end: e.target.value })} /></div>
      </div>
      {f.agreement_type && <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 6 }}>{AGREEMENT_TYPES[f.agreement_type]?.hint}</div>}
      {lbl('Terms the landlord sees (for example the monthly rent we guarantee, or the split)')}
      <textarea style={{ ...input, minHeight: 70, marginBottom: 10 }} value={f.agreement_terms} onChange={e => setF({ ...f, agreement_terms: e.target.value })} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={btn} disabled={busy} onClick={() => save()}>Save</button>
        <button style={{ ...btn, background: '#fff', color: INK, border: '1px solid #D0D4E4' }} disabled={busy} onClick={() => save({ onboarded: !d.onboarded_at })}>{d.onboarded_at ? 'Reopen onboarding' : 'Mark as onboarded'}</button>
        {msg && <span style={{ fontSize: 12, color: msg === 'Saved' ? '#067647' : '#B42318' }}>{msg}</span>}
      </div>
    </div>
  )
}
