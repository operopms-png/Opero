'use client'
// Signed agreements and files for a partner. Staff (ownerId given) upload and control what the partner sees; a partner sees theirs and can add more.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PARTNER_DOC_TYPES } from '../../lib/partner-docs'

const ACCENT = '#89CFF0', MUTE = '#667085', LINE = '#E6E9EF'
const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid #D0D4E4', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', background: '#fff' }
const btn: React.CSSProperties = { background: ACCENT, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { background: '#fff', color: '#323338', border: '1px solid #D0D4E4', borderRadius: 4, padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }
type F = { id: string; label: string; name: string; created_at: string; status: string; visible: boolean; mine: boolean; reason: string | null; url: string | null }

export default function PartnerDocuments({ ownerId }: { ownerId?: string }) {
  const [files, setFiles] = useState<F[]>([]), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [cat, setCat] = useState('agreement')
  const ref = useRef<HTMLInputElement>(null)
  const auth = useCallback(async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }), [])
  const load = useCallback(async () => {
    const r = await fetch('/api/partner-docs' + (ownerId ? `?owner_id=${ownerId}` : ''), { headers: await auth() })
    const j = await r.json().catch(() => ({})); if (r.ok) setFiles(j.files ?? []); else setErr(j.error || 'Could not load')
  }, [ownerId, auth])
  useEffect(() => { load() }, [load])

  async function upload() {
    const file = ref.current?.files?.[0]; if (!file) { setErr('Choose a file first.'); return }
    setBusy(true); setErr('')
    const fd = new FormData(); fd.append('category', cat); fd.append('file', file); if (ownerId) fd.append('owner_id', ownerId)
    const r = await fetch('/api/partner-docs', { method: 'POST', headers: await auth(), body: fd }); const j = await r.json().catch(() => ({}))
    setBusy(false); if (!r.ok) { setErr(j.error || 'Upload failed'); return }
    if (ref.current) ref.current.value = ''; load()
  }
  async function patch(body: any) { await fetch('/api/partner-docs', { method: 'PATCH', headers: { ...(await auth()), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); load() }
  async function remove(id: string) { await fetch('/api/partner-docs?id=' + id, { method: 'DELETE', headers: await auth() }); load() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={input} value={cat} onChange={e => setCat(e.target.value)}>{Object.entries(PARTNER_DOC_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input ref={ref} type="file" accept=".pdf,.doc,.docx,image/*" style={{ ...input, maxWidth: '100%' }} />
        <button style={btn} disabled={busy} onClick={upload}>{busy ? 'Uploading…' : ownerId ? 'Upload' : 'Upload for review'}</button>
        {err && <span style={{ color: '#B42318', fontSize: 12 }}>{err}</span>}
      </div>
      {!ownerId && <div style={{ fontSize: 12, color: MUTE }}>Files you add are checked by our team before they are marked as received. PDF, Word or photo, up to 15 MB.</div>}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8 }}>
        {files.length === 0 && <div style={{ padding: 14, fontSize: 13, color: '#98A2B3' }}>{ownerId ? 'No documents yet. Upload the signed agreement above.' : 'Your signed agreement and documents will appear here.'}</div>}
        {files.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '10px 14px', borderTop: i ? `1px solid ${LINE}` : 'none', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: MUTE, wordBreak: 'break-all' }}>{f.name} · {new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{f.status === 'rejected' && f.reason ? ` · Rejected: ${f.reason}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {f.status !== 'approved' && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: f.status === 'rejected' ? '#FEE4E2' : '#FEF0C7', color: f.status === 'rejected' ? '#B42318' : '#B54708' }}>{f.status === 'rejected' ? 'Rejected' : 'Awaiting review'}</span>}
              {f.url && <a href={f.url} target="_blank" rel="noreferrer" style={ghost}>Open</a>}
              {ownerId && f.status === 'pending' && <><button style={ghost} onClick={() => patch({ id: f.id, status: 'approved' })}>Approve</button><button style={ghost} onClick={() => patch({ id: f.id, status: 'rejected', reason: 'Please upload a clearer copy' })}>Reject</button></>}
              {ownerId && f.status === 'approved' && <button style={ghost} onClick={() => patch({ id: f.id, visible: !f.visible })}>{f.visible ? 'Hide from partner' : 'Show to partner'}</button>}
              {(ownerId || (f.mine && f.status === 'pending')) && <button style={ghost} onClick={() => remove(f.id)}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
