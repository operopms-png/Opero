'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Staff Centre → Maintenance Board → Building notices. Post a notice (gate works, lift out of order, water off…), pick the homes
// and who sees it. It shows at the top of the Maintenance tab for those tenants, landlords and partners and is emailed to them.
type Notice = { id: string; title: string; body: string; building_name: string | null; property_ids: string[]; for_tenants: boolean; for_landlords: boolean; for_partners: boolean; archived: boolean; created_by_name: string | null; created_at: string }
type Prop = { id: string; name: string }
const box: React.CSSProperties = { border: '1px solid #E4E7EC', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none' }
const lab: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: 'block', margin: '10px 0 4px' }

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers || {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong')
  return j
}

export default function StaffBuildingNotices({ onClose }: { onClose: () => void }) {
  const [notices, setNotices] = useState<Notice[]>([]), [props, setProps] = useState<Prop[]>([]), [canPost, setCanPost] = useState(true)
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [building, setBuilding] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [who, setWho] = useState({ t: true, l: true, p: true }), [email, setEmail] = useState(true)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  const load = () => api('/api/building-notices').then(j => { setNotices(j.notices); setProps(j.properties); setCanPost(j.canPost) }).catch(e => setMsg(e.message))
  useEffect(() => { load() }, [])
  const name = (id: string) => props.find(p => p.id === id)?.name ?? 'a home'
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function post() {
    setBusy(true); setMsg('')
    try {
      const j = await api('/api/building-notices', { method: 'POST', body: JSON.stringify({ title, body, building_name: building, property_ids: [...sel], for_tenants: who.t, for_landlords: who.l, for_partners: who.p, send_email: email }) })
      setTitle(''); setBody(''); setBuilding(''); setSel(new Set())
      setMsg(email ? `Posted. ${j.emailed} email${j.emailed === 1 ? '' : 's'} sent.` : 'Posted.')
      await load()
    } catch (e: any) { setMsg(e.message) }
    setBusy(false)
  }
  async function archive(n: Notice) { await api('/api/building-notices', { method: 'PATCH', body: JSON.stringify({ id: n.id, archived: !n.archived }) }).catch(e => setMsg(e.message)); load() }
  async function remove(n: Notice) { if (!window.confirm('Delete this notice? It disappears from every portal.')) return; await api('/api/building-notices?id=' + n.id, { method: 'DELETE' }).catch(e => setMsg(e.message)); load() }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', background: '#fff', borderLeft: '1px solid #E4E7EC', boxShadow: '-8px 0 24px rgba(0,0,0,.08)', zIndex: 60, overflowY: 'auto', padding: 18, fontFamily: 'inherit', color: '#323338' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 16 }}>Building notices</b>
        <button onClick={onClose} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: '#667085' }} aria-label="Close">×</button>
      </div>
      <div style={{ fontSize: 12.5, color: '#667085', margin: '4px 0 10px' }}>Shows at the top of the Maintenance tab for the people you choose, and is emailed to them. Partners only see notices posted after they were linked to the home.</div>

      {canPost && <>
        <label style={lab}>Heading</label>
        <input style={box} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Gate arms being repaired" />
        <label style={lab}>Building (optional label)</label>
        <input style={box} value={building} onChange={e => setBuilding(e.target.value)} placeholder="e.g. Appleton Hall Estates" />
        <label style={lab}>Notice</label>
        <textarea style={{ ...box, resize: 'vertical' }} rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Write it the way you want residents to read it." />
        <label style={lab}>Homes <button onClick={() => setSel(sel.size === props.length ? new Set() : new Set(props.map(p => p.id)))} style={{ background: 'none', border: 0, color: '#2F6DB5', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>{sel.size === props.length ? 'Clear all' : 'Select all'}</button></label>
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #E4E7EC', borderRadius: 8, padding: '6px 10px' }}>
          {props.map(p => <label key={p.id} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '3px 0' }}><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />{p.name}</label>)}
          {!props.length && <div style={{ fontSize: 13, color: '#98A2B3' }}>No properties yet.</div>}
        </div>
        <label style={lab}>Who sees it</label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
          <label><input type="checkbox" checked={who.t} onChange={e => setWho({ ...who, t: e.target.checked })} /> Tenants</label>
          <label><input type="checkbox" checked={who.l} onChange={e => setWho({ ...who, l: e.target.checked })} /> Landlords</label>
          <label><input type="checkbox" checked={who.p} onChange={e => setWho({ ...who, p: e.target.checked })} /> Partners</label>
        </div>
        <label style={{ display: 'flex', gap: 8, fontSize: 13, margin: '10px 0' }}><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} /> Also email them</label>
        <button disabled={busy || !title.trim() || !body.trim() || !sel.size} onClick={post} style={{ background: '#1B2F6E', color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !title.trim() || !body.trim() || !sel.size ? 0.5 : 1 }}>{busy ? 'Posting…' : 'Post notice'}</button>
      </>}
      {msg && <div style={{ fontSize: 12.5, margin: '10px 0', color: /posted/i.test(msg) ? '#047857' : '#B42318' }}>{msg}</div>}

      <div style={{ borderTop: '1px solid #EEF1F6', margin: '16px 0 8px' }} />
      <b style={{ fontSize: 13 }}>Posted notices</b>
      {!notices.length && <div style={{ fontSize: 13, color: '#98A2B3', padding: '10px 0' }}>None yet.</div>}
      {notices.map(n => (
        <div key={n.id} style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 12px', margin: '8px 0', opacity: n.archived ? 0.55 : 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}{n.archived ? ' (hidden)' : ''}</div>
          <div style={{ fontSize: 12, color: '#667085', margin: '2px 0 4px' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{n.created_by_name ? ` · ${n.created_by_name}` : ''} · {[n.for_tenants && 'tenants', n.for_landlords && 'landlords', n.for_partners && 'partners'].filter(Boolean).join(', ')} · {n.property_ids.slice(0, 3).map(name).join(', ')}{n.property_ids.length > 3 ? ` +${n.property_ids.length - 3}` : ''}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => archive(n)} style={{ background: 'none', border: 0, color: '#2F6DB5', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}>{n.archived ? 'Show again' : 'Hide'}</button>
            <button onClick={() => remove(n)} style={{ background: 'none', border: 0, color: '#B42318', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
