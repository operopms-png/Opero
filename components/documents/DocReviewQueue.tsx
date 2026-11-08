'use client'
// Staff Centre → Documents: files owners and tenants uploaded from their portals (approve or reject), and who still owes documents (chase).
import { useCallback, useEffect, useState } from 'react'
import { ownerFetch } from '@/lib/platform-fetch'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: 14, marginBottom: 16 }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '.05em', padding: '8px 10px', borderBottom: '1px solid #E4E7EC' }
const td: React.CSSProperties = { padding: '10px', fontSize: 13.5, borderBottom: '1px solid #F2F4F7', verticalAlign: 'top' }
const btn = (primary = false, danger = false): React.CSSProperties => ({ fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '5px 11px', cursor: 'pointer', marginRight: 6, fontFamily: 'inherit', background: primary ? '#2F6DB5' : '#fff', color: primary ? '#fff' : danger ? '#B42318' : '#2F6DB5', border: primary ? 'none' : `1px solid ${danger ? '#B42318' : '#2F6DB5'}` })
const ago = (d?: string | null) => { if (!d) return 'never'; const h = Math.floor((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago` }

export default function DocReviewQueue() {
  const [d, setD] = useState<{ review: any[]; incomplete: any[] } | null>(null)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { const r = await ownerFetch('/api/doc-hub'); if (r.ok) setD(r.data) }, [])
  useEffect(() => { load() }, [load])
  if (!d || (!d.review.length && !d.incomplete.length)) return null

  async function decide(f: any, status: 'approved' | 'rejected') {
    let reason = ''
    if (status === 'rejected') { reason = window.prompt('Why is it being rejected? They will be emailed this.') || ''; if (reason.trim().length < 3) return }
    const r = await ownerFetch('/api/lease-docs', { method: 'PATCH', body: JSON.stringify({ id: f.id, status, reason }) })
    setMsg(r.ok ? (status === 'approved' ? 'Approved.' : 'Rejected and emailed.') : (r.data?.error || 'Could not update.')); load()
  }
  const key = (p: any) => p.subject + p.id
  async function chase(list: any[]) {
    if (!list.length) return
    setBusy(true)
    const r = await ownerFetch('/api/doc-hub', { method: 'POST', body: JSON.stringify({ action: 'chase', items: list.map(p => ({ subject: p.subject, id: p.id })) }) })
    setBusy(false)
    setMsg(r.ok ? `Asked ${r.data.sent} ${r.data.sent === 1 ? 'person' : 'people'}${r.data.skipped ? `. ${r.data.skipped} skipped (no email address, or email is not set up).` : '. Reminders go out automatically every 3 days.'}` : (r.data?.error || 'Could not send.'))
    setSel({}); load()
  }
  const picked = d.incomplete.filter(p => sel[key(p)])

  return (
    <div>
      {msg && <div style={{ ...card, padding: '10px 14px', fontSize: 13.5, color: '#2F5DA0', background: '#F2F7FD' }}>{msg}</div>}
      {d.review.length > 0 && <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1B2A4A', marginBottom: 4 }}>To review ({d.review.length})</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 8 }}>Uploaded by owners and tenants from their portals.</div>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead><tr><th style={th}>Who</th><th style={th}>Document</th><th style={th}>Uploaded</th><th style={th}></th></tr></thead>
          <tbody>{d.review.map(f => <tr key={f.id}>
            <td style={td}><b>{f.person}</b><div style={{ fontSize: 12, color: '#667085' }}>{f.who}</div></td>
            <td style={td}>{f.category}<div style={{ fontSize: 12, color: '#667085' }}>{f.name}{f.expires_on ? ` · expires ${f.expires_on}` : ''}</div></td>
            <td style={td}>{ago(f.created_at)}</td>
            <td style={td}>{f.url && <a href={f.url} target="_blank" rel="noreferrer" style={{ ...btn(), textDecoration: 'none', display: 'inline-block' }}>View</a>}<button style={btn(true)} onClick={() => decide(f, 'approved')}>Approve</button><button style={btn(false, true)} onClick={() => decide(f, 'rejected')}>Reject</button></td>
          </tr>)}</tbody></table></div>
      </div>}
      {d.incomplete.length > 0 && <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 15, fontWeight: 700, color: '#1B2A4A' }}>Still missing documents ({d.incomplete.length})</div><div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>Asking someone emails them what is missing and starts automatic reminders every 3 days (up to 5).</div></div>
          <div><button style={btn(false)} onClick={() => setSel(Object.fromEntries(d.incomplete.map(p => [key(p), true])))}>Select all</button><button style={btn(true)} disabled={!picked.length || busy} onClick={() => chase(picked)}>{busy ? 'Sending…' : `Ask ${picked.length || ''} selected`}</button></div>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead><tr><th style={th}></th><th style={th}>Who</th><th style={th}>Missing</th><th style={th}>Last asked</th><th style={th}></th></tr></thead>
          <tbody>{d.incomplete.map(p => <tr key={key(p)}>
            <td style={td}><input type="checkbox" checked={!!sel[key(p)]} onChange={e => setSel({ ...sel, [key(p)]: e.target.checked })} /></td>
            <td style={td}><b>{p.name}</b><div style={{ fontSize: 12, color: '#667085' }}>{p.who}{p.email ? '' : ' · no email'}</div></td>
            <td style={td}>{p.missing}<div style={{ fontSize: 12, color: '#667085' }}>{p.missing_labels.join(', ')}</div></td>
            <td style={td}>{p.last_chased ? `${ago(p.last_chased)} (${p.chases}×)` : 'Not asked yet'}</td>
            <td style={td}><button style={btn()} disabled={busy} onClick={() => chase([p])}>{p.chases ? 'Chase' : 'Ask'}</button></td>
          </tr>)}</tbody></table></div>
      </div>}
    </div>
  )
}
