'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// A tenant's own document folder (Property Management and Estate Agency).
// Staff can upload several files at once, pick a category, and choose whether the
// tenant sees each one in their tenant portal (Documents tab).

type Kind = 'pm' | 'estate'

export const TENANT_DOC_CATEGORIES = [
  'Tenancy agreement', 'ID', 'Proof of income', 'References', 'Right to rent / immigration', 'Deposit',
  'Inventory / check-in', 'Inspection', 'Notice', 'Correspondence', 'Other',
]

const TABLE: Record<Kind, 'pm_documents' | 'estate_documents'> = { pm: 'pm_documents', estate: 'estate_documents' }
const MAX_MB = 20

function fileLink(d: any) { return d.file_url || d.url || '' }
function niceSize(bytes: number) { return bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB' }

export default function TenantDocuments({ kind, tenant, onClose, onChanged }: {
  kind: Kind
  tenant: { id: string; name: string; property_id?: string | null }
  onClose: () => void
  onChanged?: () => void
}) {
  const table = TABLE[kind]
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(TENANT_DOC_CATEGORIES[0])
  const [visible, setVisible] = useState(true)
  const [queue, setQueue] = useState<{ name: string; size: number; status: 'waiting' | 'uploading' | 'done' | 'error'; error?: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const changed = useRef(false)

  useEffect(() => { load() }, [tenant.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }

  async function uploadAll(files: File[]) {
    if (!files.length) return
    setError('')
    const { data: biz } = await supabase.rpc('current_business_id')
    const { data: { user } } = await supabase.auth.getUser()
    const businessId = (biz as string) || user?.id
    if (!businessId) { setError('Please sign in again.'); return }

    const items = files.map(f => ({ name: f.name, size: f.size, status: 'waiting' as const }))
    setQueue(q => [...items, ...q])
    for (const f of files) {
      const mark = (status: 'uploading' | 'done' | 'error', err?: string) =>
        setQueue(q => q.map(x => x.name === f.name && x.size === f.size ? { ...x, status, error: err } : x))
      if (f.size > MAX_MB * 1024 * 1024) { mark('error', `Over ${MAX_MB} MB`); continue }
      mark('uploading')
      const ext = (f.name.split('.').pop() || 'file').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `tenant-documents/${kind}/${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('pm-files').upload(path, f, { contentType: f.type || undefined })
      if (upErr) { mark('error', 'Upload failed'); continue }
      const url = supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
      const name = f.name.replace(/\.[^.]+$/, '').slice(0, 150) || 'Document'
      const row: any = kind === 'pm'
        ? { user_id: businessId, tenant_id: tenant.id, property_id: tenant.property_id || null, name, type: category, category, url, file_url: url, visible_to_tenant: visible }
        : { user_id: businessId, tenant_id: tenant.id, property_id: tenant.property_id || null, name, category, file_url: url, visible_to_tenant: visible }
      const { error: dbErr } = await supabase.from(table).insert(row)
      if (dbErr) { mark('error', 'Could not save'); continue }
      mark('done')
      changed.current = true
    }
    await load()
    setTimeout(() => setQueue(q => q.filter(x => x.status !== 'done')), 2500)
  }

  async function update(d: any, patch: any) {
    setDocs(ds => ds.map(x => x.id === d.id ? { ...x, ...patch } : x))
    const { error: e } = await supabase.from(table).update(patch).eq('id', d.id)
    if (e) { setError('Could not save the change'); load() } else changed.current = true
  }

  async function remove(d: any) {
    if (!confirm(`Delete "${d.name}"? The tenant will no longer see it.`)) return
    const { error: e } = await supabase.from(table).delete().eq('id', d.id)
    if (e) { setError('Could not delete'); return }
    setDocs(ds => ds.filter(x => x.id !== d.id))
    changed.current = true
  }

  function close() {
    if (changed.current) onChanged?.()
    onClose()
  }

  const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', background: '#fff' }
  const grouped = TENANT_DOC_CATEGORIES.concat(Array.from(new Set(docs.map(d => d.category || d.type).filter((c: any) => c && !TENANT_DOC_CATEGORIES.includes(c)))))
    .map(c => ({ c, items: docs.filter(d => (d.category || d.type || 'Other') === c) }))
    .filter(g => g.items.length)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }} onClick={e => e.target === e.currentTarget && close()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif", overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant documents</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{tenant.name}</div>
          </div>
          <span style={{ fontSize: 12, color: '#667085' }}>{docs.length} {docs.length === 1 ? 'file' : 'files'}</span>
          <button onClick={close} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#667085', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2F4F7', background: '#FCFCFD' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
              {TENANT_DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', cursor: 'pointer', marginLeft: 'auto' }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
              Tenant can see in their portal
            </label>
          </div>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); uploadAll(Array.from(e.dataTransfer.files)) }}
            style={{ border: '2px dashed ' + (dragOver ? '#3B4AFF' : '#D0D5DD'), background: dragOver ? '#EEF1FF' : '#fff', borderRadius: 12, padding: '22px 16px', textAlign: 'center', cursor: 'pointer' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>Click to upload or drop files here</div>
            <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 2 }}>Choose as many as you like · PDF, Word, images · up to {MAX_MB} MB each</div>
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp,.xls,.xlsx,.txt" style={{ display: 'none' }}
              onChange={e => { uploadAll(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          </div>
          {queue.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {queue.map((q, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#344054' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{q.name} <span style={{ color: '#98A2B3' }}>· {niceSize(q.size)}</span></span>
                  <span style={{ fontWeight: 600, color: q.status === 'done' ? '#027A48' : q.status === 'error' ? '#B42318' : '#667085' }}>
                    {q.status === 'waiting' ? 'Waiting…' : q.status === 'uploading' ? 'Uploading…' : q.status === 'done' ? 'Saved ✓' : q.error}
                  </span>
                </div>
              ))}
            </div>
          )}
          {error && <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 24px 20px' }}>
          {loading ? <div style={{ padding: 30, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>Loading…</div>
            : docs.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>No documents yet. Upload the tenancy agreement, ID, references and anything else for this tenant.</div>
            : grouped.map(g => (
              <div key={g.c} style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{g.c} · {g.items.length}</div>
                {g.items.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #EAECF0', borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                      <div style={{ fontSize: 11.5, color: '#98A2B3' }}>
                        {new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        <select value={d.category || d.type || 'Other'} onChange={e => update(d, kind === 'pm' ? { category: e.target.value, type: e.target.value } : { category: e.target.value })}
                          style={{ fontSize: 11.5, border: 'none', background: 'none', color: '#667085', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}>
                          {Array.from(new Set([...TENANT_DOC_CATEGORIES, d.category || d.type || 'Other'])).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => update(d, { visible_to_tenant: !d.visible_to_tenant })} title="Choose whether the tenant sees this in their portal"
                      style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: d.visible_to_tenant ? '#ECFDF3' : '#F2F4F7', color: d.visible_to_tenant ? '#027A48' : '#667085', whiteSpace: 'nowrap' }}>
                      {d.visible_to_tenant ? 'Tenant can see' : 'Staff only'}
                    </button>
                    {fileLink(d) && <a href={fileLink(d)} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: '#3B4AFF', textDecoration: 'none' }}>Open</a>}
                    <button onClick={() => remove(d)} aria-label="Delete" style={{ background: 'none', border: 'none', color: '#F04438', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
