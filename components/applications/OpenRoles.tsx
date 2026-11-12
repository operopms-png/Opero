'use client'
// Staff Centre → Applications → Open roles: the roles shown on the public careers page, plus its link.
import { useEffect, useState } from 'react'
import { BRAND } from '@/lib/crm-board'
import { ownerFetch } from '@/lib/platform-fetch'
import { Modal } from '@/components/crm/Popover'

type Role = { id?: string; title: string; category: string; location: string; job_type: string; description: string; active: boolean }
const CATS = ['Estate Agency', 'Operations', 'STR & Marketing', 'HR & Recruitment', 'Other']
const blank: Role = { title: '', category: 'Operations', location: '', job_type: 'Full time', description: '', active: true }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${BRAND.border}`, borderRadius: 6, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }
const btn: React.CSSProperties = { height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${BRAND.border}`, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: BRAND.ink }

export default function OpenRoles() {
  const [show, setShow] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [link, setLink] = useState('')
  const [edit, setEdit] = useState<Role | null>(null)
  const [msg, setMsg] = useState('')
  const load = async () => {
    const r = await ownerFetch('/api/job-roles'); if (r.ok) setRoles(r.data.roles)
    const l = await ownerFetch('/api/enquiry-link'); if (l.ok) setLink(l.data.careersUrl || '')
  }
  useEffect(() => { if (show) load() }, [show])
  const save = async () => {
    if (!edit) return
    const r = await ownerFetch('/api/job-roles', { method: 'POST', body: JSON.stringify(edit) })
    if (!r.ok) { setMsg(r.data.error || 'Could not save.'); return }
    setEdit(null); setMsg(''); load()
  }
  const del = async (id: string) => { await ownerFetch('/api/job-roles?id=' + id, { method: 'DELETE' }); load() }
  const copy = () => { navigator.clipboard?.writeText(link).then(() => { setMsg('Link copied'); setTimeout(() => setMsg(''), 1500) }).catch(() => {}) }
  return (
    <>
      <button className="crm-tb" onClick={() => setShow(true)} style={{ ...btn, marginRight: 8 }}>Open roles & careers link</button>
      {show && <Modal onClose={() => { setShow(false); setEdit(null) }} width={620}>
        <div style={{ padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Open roles</div>
          <div style={{ fontSize: 12.5, color: BRAND.muted, margin: '2px 0 10px' }}>Roles that are switched on show on your careers page. Applications land in this board at Applied.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <input readOnly value={link} onFocus={e => e.currentTarget.select()} style={{ ...inp, flex: '1 1 240px', width: 'auto' }} />
            <button onClick={copy} style={{ ...btn, background: BRAND.goldDark, color: '#fff', border: 'none', fontWeight: 600 }}>Copy link</button>
            <a href={link} target="_blank" rel="noreferrer" style={{ ...btn, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Open</a>
          </div>
          {msg && <div style={{ fontSize: 12.5, color: BRAND.muted, marginBottom: 8 }}>{msg}</div>}
          {edit ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <input style={inp} placeholder="Job title" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
                <select style={inp} value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
                <input style={inp} placeholder="Location" value={edit.location} onChange={e => setEdit({ ...edit, location: e.target.value })} />
                <select style={inp} value={edit.job_type} onChange={e => setEdit({ ...edit, job_type: e.target.value })}>{['Full time', 'Part time', 'Contract', 'Remote'].map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <textarea style={{ ...inp, minHeight: 100 }} placeholder="Description: what the job involves and what you are looking for" value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} /> Show on careers page</label>
              <div style={{ display: 'flex', gap: 8 }}><button onClick={save} style={{ ...btn, background: BRAND.goldDark, color: '#fff', border: 'none', fontWeight: 600 }}>Save role</button><button onClick={() => setEdit(null)} style={btn}>Cancel</button></div>
            </div>
          ) : (
            <>
              {roles.length === 0 && <div style={{ color: BRAND.muted, fontSize: 13.5, padding: '10px 0' }}>No roles yet. Add one to show it on the careers page.</div>}
              {roles.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${BRAND.rowBorder}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div><div style={{ fontSize: 12.5, color: BRAND.muted }}>{[r.category, r.location, r.job_type].filter(Boolean).join(' · ')}{r.active ? '' : ' · hidden'}</div></div>
                  <button style={btn} onClick={() => setEdit(r)}>Edit</button>
                  <button style={btn} onClick={() => r.id && del(r.id)}>Delete</button>
                </div>))}
              <button onClick={() => setEdit({ ...blank })} style={{ ...btn, marginTop: 12, background: BRAND.goldDark, color: '#fff', border: 'none', fontWeight: 600 }}>+ Add a role</button>
            </>
          )}
        </div>
      </Modal>}
    </>
  )
}
