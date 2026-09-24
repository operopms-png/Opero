'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const MODULES: { k: string; l: string; color: string }[] = [
  { k: 'str', l: 'Vacation Rentals', color: '#3B4AFF' },
  { k: 'pm', l: 'Property Management', color: '#10B981' },
  { k: 'ea', l: 'Estate Agency', color: '#F59E0B' },
  { k: 'dev', l: 'Developments', color: '#8B5CF6' },
  { k: 'other', l: 'Other', color: '#667085' },
]
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

function moduleInfo(k: string) { return MODULES.find(m => m.k === k) ?? MODULES[4] }

// The real portals every account already has, seeded into client_portals
// once (on first visit, if the table is still empty for that account) so
// this page always starts pre-filled with what's actually live, rather
// than a blank editable list nobody would think to populate themselves.
const SEED_PORTALS = [
  { module: 'str', name: 'Vacation Rentals — Owner Portal', url: '/owner-portal', live: true, sort_order: 0 },
  { module: 'pm', name: 'Property Management — Landlord Portal', url: '/pm-owner-portal', live: true, sort_order: 1 },
  { module: 'pm', name: 'Property Management — Tenant Portal', url: '/pm-tenant-portal', live: true, sort_order: 2 },
  { module: 'ea', name: 'Estate Agency — Landlord Portal', url: '/estate-owner-portal', live: true, sort_order: 3 },
  { module: 'ea', name: 'Estate Agency — Tenant Portal', url: '/estate-tenant-portal', live: true, sort_order: 4 },
  { module: 'dev', name: 'Developments — Investors Portal', url: '/dev-investor-portal', live: false, sort_order: 5 },
]

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PortalAccessPage() {
  const [loading, setLoading] = useState(true)
  const [portals, setPortals] = useState<any[]>([])
  const [accountId, setAccountId] = useState<string | undefined>()
  const [modal, setModal] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = await getAccountId(user)
    setAccountId(uid)

    let { data: rows } = await supabase.from('client_portals').select('*').eq('user_id', uid).order('sort_order', { ascending: true })
    if (!rows || rows.length === 0) {
      const { error } = await supabase.from('client_portals').insert(SEED_PORTALS.map(p => ({ ...p, user_id: uid })))
      if (!error) {
        const { data: seeded } = await supabase.from('client_portals').select('*').eq('user_id', uid).order('sort_order', { ascending: true })
        rows = seeded
      }
    }
    setPortals(rows ?? [])
    setLoading(false)
  }

  async function save() {
    if (!form.name || !form.url) return
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('client_portals').update({ module: form.module, name: form.name, url: form.url, live: form.live }).eq('id', editId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('client_portals').insert({ user_id: accountId, module: form.module ?? 'other', name: form.name, url: form.url, live: form.live ?? true, sort_order: portals.length })
      if (error) { alert(error.message); setSaving(false); return }
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await load()
  }

  async function del(id: string) {
    if (!confirm('Remove this portal?')) return
    await supabase.from('client_portals').delete().eq('id', id)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '40px 48px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Staff Centre</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#101828', letterSpacing: '-0.01em' }}>Portal Access</h1>
            <div style={{ fontSize: 14, color: '#667085', maxWidth: 640, lineHeight: 1.5 }}>
              Every client-facing portal, across every module. Add, rename or retire any of them — nothing here is hardcoded.
            </div>
          </div>
          <button onClick={() => { setForm({ module: 'other', live: true }); setEditId(null); setModal('portal') }} style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Portal</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20 }}>
          {portals.length === 0 ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14, background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC' }}>No portals yet</div> :
          portals.map(p => {
            const mod = moduleInfo(p.module)
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: mod.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: mod.color, flexShrink: 0 }}>{p.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#101828' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#98A2B3' }}>{mod.l}</div>
                  </div>
                </div>
                <a href={p.url} style={{ background: p.live ? mod.color : '#F2F4F7', color: p.live ? '#fff' : '#667085', fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                  {p.live ? 'Open Portal' : 'Preview'}
                </a>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setForm(p); setEditId(p.id); setModal('portal') }} style={{ flex: 1, fontSize: 12, color: '#8B5CF6', background: 'none', border: '1px solid #8B5CF6', borderRadius: 6, padding: '5px 0', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => del(p.id)} style={{ flex: 1, fontSize: 12, color: '#EF4444', background: 'none', border: '1px solid #FEE2E2', borderRadius: 6, padding: '5px 0', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal === 'portal' && (
        <Modal title={editId ? 'Edit Portal' : 'Add Portal'} onClose={() => { setModal(null); setEditId(null); setForm({}) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={lbl}>Module</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.module ?? 'other'} onChange={e => setForm({ ...form, module: e.target.value })}>
                {MODULES.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Name *</label><input style={inp} value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Property Management — Landlord Portal" /></div>
            <div><label style={lbl}>URL *</label><input style={inp} value={form.url ?? ''} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="/pm-owner-portal or https://..." /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#344054', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.live ?? true} onChange={e => setForm({ ...form, live: e.target.checked })} />
              Live (unchecked shows as "Preview")
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.url} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name || !form.url ? 0.6 : 1 }}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Portal'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
