'use client'
// Data Hub (account admins): what is stored, how clean it is, where it came from, what changed, and data requests.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'

type D = {
  counts: Record<string, number>; score: number
  health: { text: string; detail: string; tone: 'ok' | 'warn' | 'bad'; names: string[] }[]
  sources: { label: string; value: string }[]
  changes: { action: string; who: string | null; when: string; property: string | null }[]
  requests: { id: string; kind: string; status: string; subject: string; who: string; note: string | null; created_at: string }[]
}
const TONE = { ok: ['#E4F5EE', '#0E7C55'], warn: ['#FFF4D6', '#9A6700'], bad: ['#FDE8E6', '#B42318'] } as const
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 18, minWidth: 0 }
const h3: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', margin: '0 0 8px' }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }
const ghost: React.CSSProperties = { ...btn, background: '#fff', color: '#1D4E89', border: '1px solid #C9DEF3' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function DataHub() {
  const [d, setD] = useState<D | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => staffApi<D>('/api/data-hub').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  async function exportAll() {
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/data-export', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      if (!r.ok) throw new Error()
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement('a'); a.href = url; a.download = 'novourq-data.json'; a.click(); URL.revokeObjectURL(url)
    } catch { setErr('Could not download. Please try again.') }
    setBusy(false)
  }
  async function resolve(id: string, status: 'completed' | 'declined') { await staffApi('/api/data-hub', { id, status }).catch(() => {}); load() }

  if (err && !d) return <div style={{ padding: 30, color: '#B42318' }}>{err}</div>
  if (!d) return <div style={{ padding: 30, color: '#667085' }}>Loading…</div>
  const scoreTone = d.score >= 90 ? 'ok' : d.score >= 70 ? 'warn' : 'bad'
  return (
    <div style={{ padding: 30, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Data Hub</h1>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Everything stored for your business, how complete it is, where it came from, and what clients and tenants have asked for.</div>
      {err && <div role="alert" style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        {[['Properties', d.counts.properties], ['Tenants', d.counts.tenants], ['Landlords', d.counts.landlords], ['Documents', d.counts.documents], ['Contacts', d.counts.contacts]].map(([l, v]) => (
          <div key={l as string} style={card}><div style={{ fontSize: 26, fontWeight: 700, color: '#1D4E89', fontVariantNumeric: 'tabular-nums' }}>{(v as number).toLocaleString('en-GB')}</div><div style={{ fontSize: 13, color: '#667085' }}>{l}</div></div>
        ))}
        <div style={card}><div style={{ fontSize: 26, fontWeight: 700, color: TONE[scoreTone][1] }}>{d.score}%</div><div style={{ fontSize: 13, color: '#667085' }}>Data health</div></div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Link href="/staff-centre/ai-command-centre/import" style={btn}>Import a spreadsheet</Link>
        <button onClick={exportAll} disabled={busy} style={ghost}>Download everything (JSON)</button>
        <Link href="/settings" style={ghost}>Privacy and data settings</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        <div style={card}>
          <h3 style={h3}>Data health</h3>
          {d.health.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', fontSize: 14 }}>
              <span style={{ minWidth: 0 }}>{h.text}<small style={{ display: 'block', color: '#667085', fontSize: 12.5 }}>{h.detail}{h.names.length ? `: ${h.names.join(', ')}` : ''}</small></span>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: TONE[h.tone][0], color: TONE[h.tone][1], alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>{h.tone === 'ok' ? 'Good' : h.tone === 'warn' ? 'Review' : 'Action needed'}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <h3 style={h3}>Where records come from</h3>
          {d.sources.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', fontSize: 14 }}><span>{s.label}</span><b style={{ color: '#1D4E89' }}>{s.value}</b></div>)}
        </div>
        <div style={card}>
          <h3 style={h3}>Recent changes by Novourq Cloud AI</h3>
          {d.changes.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>Nothing yet.</div>}
          {d.changes.map((c, i) => <div key={i} style={{ padding: '9px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', fontSize: 13.5 }}>{c.action}<small style={{ display: 'block', color: '#667085', fontSize: 12 }}>{when(c.when)}{c.who ? ` · ${c.who}` : ''}</small></div>)}
          <div style={{ marginTop: 8 }}><Link href="/staff-centre/ai-command-centre/activity" style={{ fontSize: 13, color: '#2F6DB5' }}>Open the full audit trail</Link></div>
        </div>
        <div style={card}>
          <h3 style={h3}>Data requests</h3>
          {d.requests.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>No requests. Tenants and landlords can ask for a download, correction or deletion from their My Data tab.</div>}
          {d.requests.map((r, i) => (
            <div key={r.id} style={{ padding: '9px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', fontSize: 13.5 }}>
              <b>{r.kind === 'delete' ? 'Deletion' : r.kind === 'correct' ? 'Correction' : 'Download'}</b> · {r.subject === 'account' ? 'Your account' : r.subject} · {r.who}
              <small style={{ display: 'block', color: '#667085', fontSize: 12 }}>{when(r.created_at)} · {r.status}{r.note ? ` · "${r.note.slice(0, 140)}"` : ''}</small>
              {r.status === 'pending' && r.subject !== 'account' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => resolve(r.id, 'completed')} style={{ ...ghost, padding: '5px 12px', fontSize: 12 }}>Mark dealt with</button>
                  <button onClick={() => resolve(r.id, 'declined')} style={{ ...ghost, padding: '5px 12px', fontSize: 12 }}>Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
