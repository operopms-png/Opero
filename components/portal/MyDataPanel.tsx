'use client'
// "My Data" tab for tenants and landlords: what is held about them, a download, and requests to correct or delete.
// Shows only the signed-in person's own data. Used in all four owner and tenant portals.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = { label: string; detail?: string; tag?: string; tone?: 'ok' | 'warn' | 'bad' | 'info'; href?: string }
type D = { role: 'tenant' | 'landlord' | null; business?: string; summary?: { label: string; value: string }[]; sections?: { title: string; rows: Row[] }[]; requests?: { id: string; kind: string; status: string; created_at: string }[] }
const TONE: Record<string, { bg: string; fg: string }> = { ok: { bg: '#E4F5EE', fg: '#0E7C55' }, warn: { bg: '#FFF4D6', fg: '#9A6700' }, bad: { bg: '#FDE8E6', fg: '#B42318' }, info: { bg: '#EAF3FC', fg: '#1D4E89' } }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 18, marginBottom: 16 }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { ...btn, background: '#fff', color: '#1D4E89', border: '1px solid #C9DEF3' }

async function auth() { const { data: { session } } = await supabase.auth.getSession(); return `Bearer ${session?.access_token ?? ''}` }

export default function MyDataPanel() {
  const [d, setD] = useState<D | null>(null)
  const [msg, setMsg] = useState('')
  const [ask, setAsk] = useState<'correct' | 'delete' | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    const r = await fetch('/api/my-data', { headers: { Authorization: await auth() } })
    setD(r.ok ? await r.json() : { role: null })
  }
  useEffect(() => { load().catch(() => setD({ role: null })) }, [])

  async function download() {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/my-data?download=1', { headers: { Authorization: await auth() } })
      if (!r.ok) throw new Error()
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement('a'); a.href = url; a.download = 'my-novourq-data.json'; a.click(); URL.revokeObjectURL(url)
      setMsg('Your data has been downloaded.')
    } catch { setMsg('Could not download your data. Please try again.') }
    setBusy(false)
  }
  async function submit() {
    if (!ask) return
    setBusy(true); setMsg('')
    const r = await fetch('/api/my-data', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: await auth() }, body: JSON.stringify({ kind: ask, note }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg(j.error || 'Something went wrong.'); return }
    setAsk(null); setNote(''); setMsg('Request sent. Your property manager will reply within 30 days. Nothing is changed or deleted until they have checked it.')
    load()
  }

  if (!d) return <div style={{ padding: 24, color: '#667085' }}>Loading your data…</div>
  if (!d.role) return <div style={card}>We could not find a record linked to your sign-in. If you think this is wrong, contact your property manager.</div>

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>My Data</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 16 }}>Everything {d.business} holds about you, in one place. Only you can see this page.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
        {(d.summary ?? []).map(s => <div key={s.label} style={{ ...card, marginBottom: 0, padding: '12px 14px' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#1D4E89' }}>{s.value}</div><div style={{ fontSize: 12, color: '#667085' }}>{s.label}</div></div>)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={download} disabled={busy} style={btn}>Download my data</button>
        <button onClick={() => { setAsk('correct'); setMsg('') }} style={ghost}>Correct my details</button>
        <button onClick={() => { setAsk('delete'); setMsg('') }} style={ghost}>Ask for my data to be deleted</button>
      </div>
      {msg && <div role="status" style={{ ...card, color: '#1D4E89', background: '#EAF3FC', fontSize: 14 }}>{msg}</div>}
      {ask && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>{ask === 'correct' ? 'What needs correcting?' : 'Ask for your data to be deleted'}</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 10 }}>{ask === 'correct' ? 'Say what is wrong and what it should say.' : 'Some records, such as tenancy agreements, deposits and rent payments, must legally be kept for a period. Your property manager will tell you what can be removed.'}</div>
          <textarea id="my-data-note" value={note} onChange={e => setNote(e.target.value)} rows={4} maxLength={1000} style={{ width: '100%', border: '1px solid #D0D5DD', borderRadius: 8, padding: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={submit} disabled={busy} style={btn}>Send request</button>
            <button onClick={() => setAsk(null)} style={ghost}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        {(d.sections ?? []).map(sec => (
          <div key={sec.title} style={{ ...card, marginBottom: 0, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 8 }}>{sec.title}</div>
            {sec.rows.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>Nothing here yet.</div>}
            {sec.rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', fontSize: 13.5 }}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{r.label}{r.detail && <small style={{ display: 'block', color: '#667085', fontSize: 12 }}>{r.detail}</small>}</span>
                {r.tag && (r.href
                  ? <a href={r.href} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: TONE.info.bg, color: TONE.info.fg, textDecoration: 'none', flex: 'none' }}>{r.tag}</a>
                  : <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: TONE[r.tone || 'info'].bg, color: TONE[r.tone || 'info'].fg, whiteSpace: 'nowrap', flex: 'none' }}>{r.tag}</span>)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {(d.requests ?? []).length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 8 }}>My requests</div>
          {d.requests!.map(r => <div key={r.id} style={{ fontSize: 13.5, padding: '6px 0', borderTop: '1px solid #F2F4F7' }}>{r.kind === 'delete' ? 'Deletion' : 'Correction'} request, {new Date(r.created_at).toLocaleDateString('en-GB')} · <b>{r.status === 'pending' ? 'Waiting for your property manager' : r.status}</b></div>)}
        </div>
      )}
    </div>
  )
}
