'use client'
// Settings -> Privacy & Data: download everything stored for the company, or ask for the account to be deleted.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'

type Req = { id: string; kind: string; status: string; note: string | null; created_at: string; completed_at: string | null }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const btn = (danger = false, off = false): React.CSSProperties => ({ background: danger ? '#B42318' : '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? .6 : 1, fontFamily: 'inherit' })

export default function PrivacyPanel() {
  const [reqs, setReqs] = useState<Req[]>([])
  const [isAdmin, setIsAdmin] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState('')
  const load = () => staffApi<{ requests: Req[]; isAdmin: boolean }>('/api/data-requests').then(d => { setReqs(d.requests); setIsAdmin(d.isAdmin) }).catch(() => {})
  useEffect(() => { load() }, [])

  async function download() {
    setBusy('export'); setErr(''); setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/data-export', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not prepare the export.') }
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = `novourq-data-export-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setMsg('Your export has downloaded.'); load()
    } catch (e: any) { setErr(e.message) }
    setBusy('')
  }
  async function requestDelete() {
    setBusy('delete'); setErr(''); setMsg('')
    try { await staffApi('/api/data-requests', { note }); setNote(''); setConfirm(''); setMsg('Your request has been received. We will check it is you, then delete the account within 30 days.'); load() } catch (e: any) { setErr(e.message) }
    setBusy('')
  }
  const pending = reqs.some(r => r.kind === 'delete' && r.status === 'pending')

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Privacy &amp; Data</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Your company data belongs to you. Take a copy any time, or ask us to delete it.</div>
      {!isAdmin && <div style={{ ...card, color: '#667085', fontSize: 14 }}>Only an account admin can export or delete the company data.</div>}
      {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {msg && <div role="status" style={{ color: '#0E7C55', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>Download your data</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 14 }}>One file with everything stored under your account: properties, tenants, leases, finance, CRM, tasks and AI activity. Passwords, tokens and keys are not included.</div>
        <button style={btn(false, !isAdmin || busy !== '')} disabled={!isAdmin || busy !== ''} onClick={download}>{busy === 'export' ? 'Preparing…' : 'Download my data'}</button>
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>Delete my account</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 14 }}>This asks us to permanently delete your company account and all its data. We check the request is from you, and you can download a copy first. Deletion cannot be undone.</div>
        {pending ? <div style={{ fontSize: 13, color: '#9A6700', background: '#FDF1D6', padding: '8px 12px', borderRadius: 8 }}>A deletion request is waiting. We will be in touch to confirm.</div> : (
          <>
            <label htmlFor="del-note" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Reason (optional)</label>
            <textarea id="del-note" rows={3} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }} />
            <label htmlFor="del-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Type DELETE to confirm</label>
            <input id="del-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: '100%', maxWidth: 260, boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginBottom: 14, display: 'block' }} />
            <button style={btn(true, !isAdmin || confirm !== 'DELETE' || busy !== '')} disabled={!isAdmin || confirm !== 'DELETE' || busy !== ''} onClick={requestDelete}>{busy === 'delete' ? 'Sending…' : 'Request deletion'}</button>
          </>
        )}
      </div>

      {reqs.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#323338', margin: '0 0 10px' }}>History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reqs.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                <b>{r.kind === 'export' ? 'Data export' : 'Deletion request'}</b>
                <span style={{ color: '#667085' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span style={{ marginLeft: 'auto', textTransform: 'capitalize', color: r.status === 'pending' ? '#9A6700' : '#0E7C55', fontWeight: 600 }}>{r.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
