'use client'
// Documents checklist for one head lease: master lease, head lessor documents, landlord ID, proof of ownership, change of electricity.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ownerFetch } from '@/lib/platform-fetch'
import { LEASE_DOC_TYPES } from '@/lib/lease-doc-types'

const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: bg, color: fg })
const daysTo = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

export default function LeaseDocuments({ lease, onClose, onChanged }: { lease: any; onClose: () => void; onChanged?: () => void }) {
  const [files, setFiles] = useState<any[]>([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [exp, setExp] = useState<Record<string, string>>({})
  const pick = useRef<HTMLInputElement>(null)
  const target = useRef('')

  const load = useCallback(async () => {
    const r = await ownerFetch('/api/lease-docs?head_lease_id=' + lease.id)
    if (r.ok) setFiles(r.data.files ?? []); else setMsg(r.data?.error || 'Could not load documents.')
  }, [lease.id])
  useEffect(() => { load() }, [load])

  async function upload(f: File | undefined) {
    const cat = target.current; if (!f || !cat) return
    setBusy(cat); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData(); fd.append('head_lease_id', lease.id); fd.append('category', cat); fd.append('file', f); if (exp[cat]) fd.append('expires_on', exp[cat])
    const res = await fetch('/api/lease-docs', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, body: fd })
    const j = await res.json().catch(() => ({}))
    setBusy(''); if (pick.current) pick.current.value = ''
    if (!res.ok) setMsg(j.error || 'Upload failed.'); else { setExp(e => ({ ...e, [cat]: '' })); await load(); onChanged?.() }
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this file? This cannot be undone.')) return
    const r = await ownerFetch('/api/lease-docs?id=' + id, { method: 'DELETE' })
    if (!r.ok) setMsg(r.data?.error || 'Could not delete.'); else { await load(); onChanged?.() }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>Documents</div><div style={{ fontSize: 12.5, color: '#667085' }}>{lease.pm_properties?.name ?? 'Head lease'}{lease.landlord_name ? ' · ' + lease.landlord_name : ''}</div></div>
          <button onClick={onClose} style={{ fontSize: 12, color: '#2F6DB5', background: '#fff', border: '1px solid #2F6DB5', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ fontSize: 12, color: '#475467', background: '#F2F7FD', borderRadius: 8, padding: '8px 10px', margin: '12px 0 2px' }}>Private. Only your team can open these files. Links expire after 5 minutes.</div>
        {msg && <div style={{ background: '#FEF3F2', color: '#B42318', border: '1px solid #FDA29B', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginTop: 8 }}>{msg}</div>}
        <input ref={pick} type="file" accept="application/pdf,image/*,.doc,.docx" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
        {LEASE_DOC_TYPES.map(t => {
          const list = files.filter(f => f.category === t.key)
          const soon = list.map(f => f.expires_on).filter(Boolean).sort()[0] as string | undefined
          const d = soon ? daysTo(soon) : null
          return (
            <div key={t.key} style={{ border: '1px solid #E4E7EC', borderRadius: 12, padding: '11px 12px', marginTop: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                {d != null && d < 90 ? <span style={pill(d < 0 ? '#FEF3F2' : '#FFF4E0', d < 0 ? '#B42318' : '#B54708')}>{d < 0 ? 'Expired' : `Expires ${soon}`}</span> : list.length ? <span style={pill('#E7F6EC', '#067647')}>Uploaded</span> : <span style={pill('#F2F4F7', '#667085')}>Missing</span>}
              </div>
              <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>{t.hint}</div>
              {list.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, background: '#F2F7FD', borderRadius: 8, padding: '7px 9px', marginTop: 7 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{f.expires_on ? ` · expires ${f.expires_on}` : ''}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{f.url && <a href={f.url} target="_blank" rel="noreferrer" style={{ color: '#2F6DB5', marginRight: 10 }}>View</a>}<button onClick={() => remove(f.id)} style={{ border: 'none', background: 'none', color: '#B42318', cursor: 'pointer', fontSize: 12.5, padding: 0 }}>Delete</button></span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                {t.expiry && <input type="date" value={exp[t.key] ?? ''} onChange={e => setExp({ ...exp, [t.key]: e.target.value })} title="Expiry date of the ID" style={{ fontSize: 13, padding: '6px 8px', borderRadius: 8, border: '1px solid #C9D6E6' }} />}
                <button disabled={!!busy} onClick={() => { target.current = t.key; pick.current?.click() }} style={{ flex: 1, border: '1.5px dashed #9DBDE6', borderRadius: 10, background: '#F8FBFF', color: '#2F6DB5', fontSize: 13, padding: 9, cursor: 'pointer', fontFamily: 'inherit' }}>{busy === t.key ? 'Uploading…' : '+ Upload file'}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
