'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { C, MODULE_COLOR, CrmPage, CrmHeader, Body, Pill, Avatar, Group, Row, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'

const MODULES: { k: string; l: string; color: string }[] = [
  { k: 'str', l: 'Vacation Rentals', color: MODULE_COLOR.str },
  { k: 'pm', l: 'Property Management', color: MODULE_COLOR.pm },
  { k: 'ea', l: 'Estate Agency', color: MODULE_COLOR.ea },
  { k: 'dev', l: 'Developments', color: MODULE_COLOR.dev },
  { k: 'staff', l: 'Staff', color: MODULE_COLOR.staff },
  { k: 'other', l: 'Other', color: MODULE_COLOR.other },
]

function moduleInfo(k: string) { return MODULES.find(m => m.k === k) ?? MODULES[MODULES.length - 1] }

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
  { module: 'staff', name: 'Cleaners Portal', url: '/staff-dashboard?team=cleaning', live: true, sort_order: 6 },
]

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

  async function toggleLive(p: any) {
    setPortals(list => list.map(x => x.id === p.id ? { ...x, live: !p.live } : x))
    const { error } = await supabase.from('client_portals').update({ live: !p.live }).eq('id', p.id)
    if (error) { alert(error.message); load() }
  }

  if (loading) return <Loading />

  const cols = [
    { k: 'n', l: 'Portal', w: 'minmax(260px,1.3fr)' },
    { k: 'u', l: 'Link', w: 'minmax(180px,1fr)' },
    { k: 's', l: 'Status', w: 130 },
    { k: 'o', l: 'Open', w: 150 },
    { k: 'a', l: '', w: 130 },
  ]
  const groups = MODULES.map(m => ({ m, list: portals.filter(p => moduleInfo(p.module).k === m.k) })).filter(g => g.list.length)

  return (
    <CrmPage>
      <CrmHeader
        title="Portal Access"
        subtitle="Every client-facing portal, across every module. Add, rename or retire any of them — nothing here is hardcoded."
        actions={<button onClick={() => { setForm({ module: 'other', live: true }); setEditId(null); setModal('portal') }} style={btn('gold')}>+ Add portal</button>}
      />
      <Body>
        {portals.length === 0 ? <Empty>No portals yet.</Empty> : groups.map(({ m, list }) => (
          <Group key={m.k} title={m.l} color={m.color} count={list.length} cols={cols}>
            {list.map(p => (
              <Row key={p.id} cells={[
                <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={p.name.replace(/^.*—\s*/, '')} color={m.color} />
                  <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                </div>,
                <span key="u" style={{ fontSize: 13, color: C.muted, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.url}</span>,
                <Pill key="s" color={p.live ? C.green : C.grey} onClick={() => toggleLive(p)} title="Click to switch between Live and Preview" width={96}>{p.live ? 'Live' : 'Preview'}</Pill>,
                <a key="o" href={p.url} style={{ ...btn(p.live ? 'gold' : 'ghost', true), minWidth: 110, justifyContent: 'center' }}>{p.live ? 'Open portal' : 'Preview'}</a>,
                <div key="a" style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setForm(p); setEditId(p.id); setModal('portal') }} style={btn('ghost', true)}>Edit</button>
                  <button onClick={() => del(p.id)} title="Delete" style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button>
                </div>,
              ]} />
            ))}
          </Group>
        ))}
      </Body>

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.live ?? true} onChange={e => setForm({ ...form, live: e.target.checked })} />
              Live (unchecked shows as "Preview")
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.url} style={{ ...btn('gold'), flex: 1, justifyContent: 'center', opacity: saving || !form.name || !form.url ? 0.6 : 1 }}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Portal'}</button>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}
