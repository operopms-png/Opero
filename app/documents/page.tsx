'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function DocumentsPage() {
    const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'contract', url: '', property_id: '' })
  const [properties, setProperties] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('documents').select('*, properties(name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name'),
    ])
    setDocs(d ?? [])
    setProperties(p ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name || !form.url) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('documents').insert([{ ...form, user_id: user?.id, property_id: form.property_id || null }])
    if (error) { alert(error.message); setSaving(false); return }
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', type: 'contract', url: '', property_id: '' })
    load()
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document?')) return
    await supabase.from('documents').delete().eq('id', id)
    setDocs(prev => prev.filter((d: any) => d.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#101828' }}>Document Storage</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{docs.length}</span>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add Document</button>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3' }}>Loading...</div> :
        docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No documents yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add contracts, inventories and compliance documents</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((d: any) => (
              <div key={d.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#101828' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2, textTransform: 'capitalize' }}>{d.type}{d.properties ? ` · ${d.properties.name}` : ''}</div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#344054' }}>View</a>
                <button onClick={() => deleteDoc(d.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>Add Document</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Document Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Villa Rosso Lease Agreement" style={inp} /></div>
              <div><label style={lbl}>Document URL *</label><input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." style={inp} /></div>
              <div><label style={lbl}>Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{...inp, cursor: 'pointer'}}>
                  <option value="contract">Contract</option>
                  <option value="inventory">Inventory</option>
                  <option value="compliance">Compliance</option>
                  <option value="invoice">Invoice</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label style={lbl}>Property (optional)</label>
                <select value={form.property_id} onChange={e => setForm({...form, property_id: e.target.value})} style={{...inp, cursor: 'pointer'}}>
                  <option value="">All properties</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.url} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name || !form.url ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add Document'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
