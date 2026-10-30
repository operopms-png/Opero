'use client'
// Staff Centre → Dashboard → Company Documents. The company's own file library:
// incorporation papers, ADO1 forms, certificates and insurance. Staff and the AI
// assistants read the same records through /api/documents?files=1.
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { CrmPage, CrmHeader, Body, Empty, Loading, btn, input, label } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const SUGGESTED = ['Company Incorporation', 'ADO1 Forms', 'Certificates', 'Insurance']
const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const size = (n: number | null) => !n ? '' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB'

export default function CompanyDocuments() {
  const [files, setFiles] = useState<any[] | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [folder, setFolder] = useState('All')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<any>({ file: null, name: '', folder: SUGGESTED[0], property_label: '' })

  const load = () => staffApi('/api/documents?files=1').then((d: any) => { setFiles(d.files || []); setIsAdmin(!!d.isAdmin) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const folders = useMemo(() => [...new Set([...SUGGESTED, ...(files || []).map(f => f.folder).filter(Boolean)])], [files])
  const shown = (files || []).filter(f =>
    (folder === 'All' || f.folder === folder) &&
    (!q || [f.name, f.folder, f.property_label].some((x: any) => String(x || '').toLowerCase().includes(q.toLowerCase()))))

  async function save() {
    if (!form.file) return setErr('Choose a file first.')
    setBusy(true); setErr('')
    try {
      const ext = form.file.name.split('.').pop()
      const path = `company-docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('pm-files').upload(path, form.file, { contentType: form.file.type })
      if (error) throw new Error(error.message)
      const url = supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
      await staffApi('/api/documents', { action: 'file-add', url, name: form.name.trim() || form.file.name, folder: form.folder.trim() || 'General', property_label: form.property_label.trim() || null, size: form.file.size, mime: form.file.type })
      setAdding(false); setForm({ file: null, name: '', folder: SUGGESTED[0], property_label: '' }); await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return
    await staffApi('/api/documents', { action: 'file-delete', id }).catch(e => setErr(e.message))
    load()
  }

  return (
    <CrmPage>
      <CrmHeader title="Company Documents" subtitle="Incorporation papers, ADO1 forms, certificates and insurance. Search here or ask the assistants." actions={<button style={btn('gold')} onClick={() => setAdding(a => !a)}>+ Add document</button>} />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {adding && (
          <div style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gap: 10, maxWidth: 560 }}>
            <div><span style={label}>File</span><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null, name: form.name || (e.target.files?.[0]?.name ?? '') })} /></div>
            <div><span style={label}>Name</span><input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><span style={label}>Folder</span><input style={input} list="doc-folders" value={form.folder} onChange={e => setForm({ ...form, folder: e.target.value })} />
              <datalist id="doc-folders">{folders.map(f => <option key={f} value={f} />)}</datalist></div>
            <div><span style={label}>Property or company (optional)</span><input style={input} value={form.property_label} onChange={e => setForm({ ...form, property_label: e.target.value })} /></div>
            <div><button style={btn('gold')} disabled={busy} onClick={save}>{busy ? 'Uploading…' : 'Save document'}</button></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <input style={{ ...input, maxWidth: 340 }} placeholder="Search name, folder or property" value={q} onChange={e => setQ(e.target.value)} />
          {['All', ...folders].map(f => (
            <button key={f} onClick={() => setFolder(f)} style={btn(folder === f ? 'gold' : 'ghost', true)}>{f}</button>
          ))}
        </div>
        {!files ? (!err && <Loading />) : shown.length === 0 ? <Empty>{files.length === 0 ? 'No company documents yet. Add the first one.' : 'Nothing matches that search.'}</Empty> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {shown.map(f => (
              <div key={f.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#1B2F6E', textDecoration: 'none' }}>{f.name}</a>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{f.folder}{f.property_label ? ` · ${f.property_label}` : ''}{f.size ? ` · ${size(f.size)}` : ''} · added {when(f.created_at)}</div>
                </div>
                {isAdmin && <button style={btn('ghost', true)} onClick={() => remove(f.id)}>Delete</button>}
              </div>
            ))}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
