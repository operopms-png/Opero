'use client'
// The company's file library: add, find, open, edit, replace, send and delete files.
// Used by Staff Centre → Company Documents and by Team → HR Documents (hr = payslips and other
// people records, visible to Admin and HR Team only). Records live in doc_files through /api/documents.
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CrmPage, CrmHeader, Body, Empty, Loading, btn, input, label } from '@/components/crm/Page'
import { staffApi } from '@/lib/staff-api'
import { HR_FOLDERS, HR_STARTERS } from '@/lib/hr-docs'

const COMPANY_FOLDERS = ['Company Incorporation', 'ADO1 Forms', 'Certificates', 'Insurance']
const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const size = (n: number | null) => !n ? '' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gap: 10, maxWidth: 560 }

async function upload(file: File, hr: boolean) {
  const ext = file.name.split('.').pop()
  const path = `${hr ? 'hr-docs' : 'company-docs'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}

export default function FileLibrary({ hr = false }: { hr?: boolean }) {
  const SUGGESTED = hr ? HR_FOLDERS : COMPANY_FOLDERS
  const [files, setFiles] = useState<any[] | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [q, setQ] = useState('')
  const [folder, setFolder] = useState('All')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<any>({ file: null, name: '', folder: SUGGESTED[0], property_label: '' })
  const [edit, setEdit] = useState<any>(null)   // { id, name, folder, file }
  const [send, setSend] = useState<any>(null)   // { id, name, to, toName, subject, message }

  const load = () => staffApi(`/api/documents?files=1${hr ? '&scope=hr' : ''}`).then((d: any) => { setFiles(d.files || []); setIsAdmin(!!d.isAdmin) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const folders = useMemo(() => [...new Set([...SUGGESTED, ...(files || []).map(f => f.folder).filter(Boolean)])], [files, SUGGESTED])
  const shown = (files || []).filter(f =>
    (folder === 'All' || f.folder === folder) &&
    (!q || [f.name, f.folder, f.property_label].some((x: any) => String(x || '').toLowerCase().includes(q.toLowerCase()))))
  const reset = () => setForm({ file: null, name: '', folder: SUGGESTED[0], property_label: '' })

  async function save() {
    if (!form.file) return setErr('Choose a file first.')
    setBusy(true); setErr(''); setNote('')
    try {
      const url = await upload(form.file, hr)
      await staffApi('/api/documents', { action: 'file-add', url, name: form.name.trim() || form.file.name, folder: form.folder.trim() || SUGGESTED[0], property_label: form.property_label.trim() || null, size: form.file.size, mime: form.file.type })
      setAdding(false); reset(); await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function addStarters() {
    setBusy(true); setErr(''); setNote('')
    try {
      const have = new Set((files || []).map(f => f.name))
      let n = 0
      for (const s of HR_STARTERS) {
        if (have.has(s.name)) continue
        await staffApi('/api/documents', { action: 'file-add', url: window.location.origin + s.path, name: s.name, folder: s.folder, mime: s.mime })
        n++
      }
      setNote(n ? `Added ${n} NOVOURQ template${n > 1 ? 's' : ''}.` : 'The NOVOURQ templates are already here.')
      await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function saveEdit() {
    setBusy(true); setErr(''); setNote('')
    try {
      const body: any = { action: 'file-update', id: edit.id, name: edit.name.trim(), folder: edit.folder.trim() }
      if (edit.file) { body.url = await upload(edit.file, hr); body.size = edit.file.size; body.mime = edit.file.type }
      await staffApi('/api/documents', body)
      setEdit(null); await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function sendIt() {
    setBusy(true); setErr(''); setNote('')
    try {
      await staffApi('/api/documents', { action: 'file-send', id: send.id, to: send.to, name: send.toName, subject: send.subject, message: send.message })
      setNote(`Sent “${send.name}” to ${send.to}.`); setSend(null)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return
    await staffApi('/api/documents', { action: 'file-delete', id }).catch(e => setErr(e.message))
    load()
  }

  const isPdf = (f: any) => /pdf/i.test(f.mime || '') || /\.pdf($|\?)/i.test(f.url || '')
  const title = hr ? 'HR Documents' : 'Company Documents'
  const subtitle = hr
    ? 'Payslips, HR forms and contracts. Open a fillable form to complete it, replace it with the finished copy, and send it to the person. Only Admin and HR Team can see this page.'
    : 'Incorporation papers, ADO1 forms, certificates and insurance. Search here, edit, send, or ask the assistants.'

  return (
    <CrmPage>
      <CrmHeader title={title} subtitle={subtitle} actions={<>
        {hr && <button style={btn('ghost')} disabled={busy} onClick={addStarters}>Add NOVOURQ templates</button>}
        <button style={btn('gold')} onClick={() => setAdding(a => !a)}>+ Add document</button>
      </>} />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {note && <div style={{ color: '#067647', marginBottom: 12 }}>{note}</div>}
        {adding && (
          <div style={card}>
            <div><span style={label}>File</span><input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null, name: form.name || (e.target.files?.[0]?.name ?? '') })} /></div>
            <div><span style={label}>Name</span><input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><span style={label}>Folder</span><input style={input} list="doc-folders" value={form.folder} onChange={e => setForm({ ...form, folder: e.target.value })} />
              <datalist id="doc-folders">{folders.map(f => <option key={f} value={f} />)}</datalist>
              {hr && <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Keep it in one of these folders so it stays on this page: {HR_FOLDERS.join(', ')}.</div>}</div>
            {!hr && <div><span style={label}>Property or company (optional)</span><input style={input} value={form.property_label} onChange={e => setForm({ ...form, property_label: e.target.value })} /></div>}
            <div><button style={btn('gold')} disabled={busy} onClick={save}>{busy ? 'Uploading…' : 'Save document'}</button></div>
          </div>
        )}
        {edit && (
          <div style={card}>
            <div style={{ fontWeight: 700 }}>Edit document</div>
            <div><span style={label}>Name</span><input style={input} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
            <div><span style={label}>Folder</span><input style={input} list="doc-folders" value={edit.folder} onChange={e => setEdit({ ...edit, folder: e.target.value })} /></div>
            <div><span style={label}>Replace the file (optional)</span><input type="file" onChange={e => setEdit({ ...edit, file: e.target.files?.[0] ?? null })} />
              <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Fill in the form, save it as a PDF, then upload the finished copy here. The name and folder stay the same.</div></div>
            <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold')} disabled={busy || !edit.name.trim()} onClick={saveEdit}>{busy ? 'Saving…' : 'Save changes'}</button><button style={btn('ghost')} onClick={() => setEdit(null)}>Cancel</button></div>
          </div>
        )}
        {send && (
          <div style={card}>
            <div style={{ fontWeight: 700 }}>Send “{send.name}”</div>
            <div><span style={label}>Send to (email)</span><input style={input} type="email" value={send.to} onChange={e => setSend({ ...send, to: e.target.value })} /></div>
            <div><span style={label}>Their name</span><input style={input} value={send.toName} onChange={e => setSend({ ...send, toName: e.target.value })} /></div>
            <div><span style={label}>Subject</span><input style={input} value={send.subject} onChange={e => setSend({ ...send, subject: e.target.value })} /></div>
            <div><span style={label}>Message</span><textarea style={{ ...input, minHeight: 90 }} value={send.message} onChange={e => setSend({ ...send, message: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold')} disabled={busy || !send.to.trim()} onClick={sendIt}>{busy ? 'Sending…' : 'Send email'}</button><button style={btn('ghost')} onClick={() => setSend(null)}>Cancel</button></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <input style={{ ...input, maxWidth: 340 }} placeholder="Search name or folder" value={q} onChange={e => setQ(e.target.value)} />
          {['All', ...folders].map(f => (
            <button key={f} onClick={() => setFolder(f)} style={btn(folder === f ? 'gold' : 'ghost', true)}>{f}</button>
          ))}
        </div>
        {!files ? (!err && <Loading />) : shown.length === 0 ? <Empty>{files.length === 0 ? (hr ? 'No HR documents yet. Press “Add NOVOURQ templates” for the payslip, or add your own.' : 'No company documents yet. Add the first one.') : 'Nothing matches that search.'}</Empty> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {shown.map(f => (
              <div key={f.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#1B2F6E', textDecoration: 'none' }}>{f.name}</a>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{f.folder}{f.property_label ? ` · ${f.property_label}` : ''}{f.size ? ` · ${size(f.size)}` : ''} · added {when(f.created_at)}</div>
                </div>
                <a href={f.url} target="_blank" rel="noreferrer" style={btn('ghost', true)}>{isPdf(f) ? 'Open / fill in' : 'Open'}</a>
                <button style={btn('ghost', true)} onClick={() => { setSend(null); setEdit({ id: f.id, name: f.name, folder: f.folder, file: null }) }}>Edit</button>
                <button style={btn('ghost', true)} onClick={() => { setEdit(null); setSend({ id: f.id, name: f.name, to: '', toName: '', subject: '', message: '' }) }}>Send</button>
                {isAdmin && <button style={btn('ghost', true)} onClick={() => remove(f.id)}>Delete</button>}
              </div>
            ))}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
