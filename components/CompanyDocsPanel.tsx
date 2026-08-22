'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = 'sop' | 'contract_template'

const COPY: Record<Category, { empty: string; addLabel: string; namePlaceholder: string }> = {
  sop: {
    empty: 'No SOPs yet. Add training material and internal policies staff should follow.',
    addLabel: '+ Add SOP',
    namePlaceholder: 'e.g. Tenant Arrears Handling Procedure',
  },
  contract_template: {
    empty: 'No contract templates yet. Add the master versions you send to landlords and tenants.',
    addLabel: '+ Add Template',
    namePlaceholder: 'e.g. Assured Shorthold Tenancy Agreement',
  },
}

async function uploadCompanyFile(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `company-documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}

export default function CompanyDocsPanel({ category }: { category: Category }) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { load() }, [category])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('company_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const uploaded = await uploadCompanyFile(file)
    if (uploaded) setUrl(uploaded)
    setUploading(false)
  }

  function resetForm() { setName(''); setUrl(''); setNotes(''); setShowAdd(false) }

  async function save() {
    if (!name || !url) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('company_documents').insert([
      { user_id: user?.id, category, name, url, notes: notes || null },
    ])
    setSaving(false)
    if (error) { alert(error.message); return }
    resetForm()
    await load()
  }

  async function del(id: string) {
    if (!confirm('Delete this document?')) return
    await supabase.from('company_documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const copy = COPY[category]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowAdd(true)} style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{copy.addLabel}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14 }}>Loading…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14, maxWidth: 420, margin: '0 auto' }}>{copy.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(d => (
            <div key={d.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#101828' }}>{d.name}</div>
                {d.notes && <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{d.notes}</div>}
              </div>
              <a href={d.url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#344054', whiteSpace: 'nowrap' }}>View</a>
              <button onClick={() => del(d.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && resetForm()}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{copy.addLabel.replace('+ ', '')}</h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#667085' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Name *</label>
                <input style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} value={name} onChange={e => setName(e.target.value)} placeholder={copy.namePlaceholder} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>File *</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '2px dashed #D0D5DD', fontSize: 13, color: '#667085', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    {uploading ? 'Uploading…' : url ? 'Replace file' : 'Upload file (PDF, DOC, JPG, PNG)'}
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
                  </label>
                  {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3B4AFF', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>View file</a>}
                </div>
                {url && <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>✓ File uploaded</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Notes</label>
                <textarea style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional context for staff" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={resetForm} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !name || !url} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !name || !url ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
