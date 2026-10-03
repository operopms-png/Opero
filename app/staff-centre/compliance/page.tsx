'use client'
// Staff Centre → Operations → Compliance: every certificate, licence and
// insurance across all four businesses in one list, soonest expiry first.
// Add, renew (change the expiry) or remove from here; it writes to each
// business's own compliance list, so their pages stay in step.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty, Modal, btn, input, label } from '../../../components/crm/Page'
import { staffApi, MODULE_LABEL, MODULE_COL } from '../../../lib/staff-api'

const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  expired: { l: 'Expired', bg: '#FDECEC', c: '#B42318' }, due: { l: 'Due in 30 days', bg: '#FFF4DE', c: '#9A6400' },
  soon: { l: 'Due in 90 days', bg: '#FBF6EA', c: '#8E6B1F' }, ok: { l: 'Up to date', bg: '#E6F7EF', c: '#0E7C55' }, 'no-date': { l: 'No expiry date', bg: '#F2F2F2', c: '#5C5850' },
}
const TYPES = ['Gas Safety Certificate', 'EICR (Electrical)', 'EPC', 'Fire Risk Assessment', 'Building Insurance', 'Landlord Insurance', 'Public Liability Insurance', 'HMO Licence', 'Business / Trading Licence', 'TPDCo Licence', 'Fire Extinguisher Service', 'Planning Permission', 'Building Control Sign-off']
const fmt = (d?: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function Compliance() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('attention')
  const [mod, setMod] = useState('')
  const [edit, setEdit] = useState<any>(null)
  const load = () => staffApi('/api/compliance').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const items: any[] = d?.items || []
  const n = (s: string) => items.filter(i => i.status === s).length
  const shown = items.filter(i => (tab === 'all' || (tab === 'attention' ? ['expired', 'due', 'soon', 'no-date'].includes(i.status) : i.status === tab)) && (!mod || i.module === mod))
  return (
    <CrmPage>
      <CrmHeader title="Compliance" subtitle="Certificates, licences and insurance across every business, soonest expiry first."
        actions={<button style={btn('gold')} onClick={() => setEdit({ module: 'pm' })}>+ Add certificate</button>}
        tabs={[{ k: 'attention', l: 'Needs attention', count: n('expired') + n('due') + n('soon') + n('no-date') }, { k: 'expired', l: 'Expired', count: n('expired') }, { k: 'ok', l: 'Up to date', count: n('ok') }, { k: 'all', l: 'All', count: items.length }]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="Expired" value={<span style={{ color: n('expired') ? C.red : C.ink }}>{n('expired')}</span>} />
            <Stat label="Due in 30 days" value={<span style={{ color: n('due') ? '#9A6400' : C.ink }}>{n('due')}</span>} />
            <Stat label="Due in 90 days" value={n('soon')} />
            <Stat label="Up to date" value={<span style={{ color: '#0E7C55' }}>{n('ok')}</span>} highlight />
          </div>
          <select value={mod} onChange={e => setMod(e.target.value)} style={{ ...input, width: 'auto', marginBottom: 14 }}><option value="">All businesses</option>{['vr', 'pm', 'ea', 'dev'].map(k => <option key={k} value={k}>{MODULE_LABEL[k]}</option>)}</select>
          {shown.length === 0 ? <Empty>{items.length === 0 ? <>No certificates recorded yet. Press <b>Add certificate</b> to add gas safety, electrical, insurance, licences and so on — with an expiry date you’ll get reminded before they run out.</> : 'Nothing in this view.'}</Empty> : (
            <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 760 }}>
                <thead><tr style={{ background: '#F7F8FA' }}>{['Certificate', 'Property', 'Expires', 'Status', ''].map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
                <tbody>{shown.map(i => (
                  <tr key={i.module + i.id} style={{ borderTop: '1px solid #F0F1F4' }}>
                    <td style={td}><div style={{ fontWeight: 600 }}>{i.type}</div><div style={{ fontSize: 11.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COL[i.module], display: 'inline-block' }} />{MODULE_LABEL[i.module]}{i.reference ? ` · Ref ${i.reference}` : ''}</div></td>
                    <td style={td}>{i.property || '—'}</td>
                    <td style={td}>{fmt(i.expiry)}{i.days !== null && <div style={{ fontSize: 11.5, color: C.muted }}>{i.days < 0 ? `${-i.days} days ago` : i.days === 0 ? 'today' : `in ${i.days} days`}</div>}</td>
                    <td style={td}><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: STATUS[i.status].bg, color: STATUS[i.status].c, whiteSpace: 'nowrap' }}>{STATUS[i.status].l}</span></td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{i.document_url && <a href={i.document_url} target="_blank" rel="noreferrer" style={{ ...btn('ghost', true), marginRight: 6 }}>View</a>}<button style={btn(i.status === 'expired' || i.status === 'due' ? 'gold' : 'ghost', true)} onClick={() => setEdit(i)}>{i.status === 'expired' || i.status === 'due' ? 'Renew' : 'Edit'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>}
      </Body>
      {edit && <EditModal item={edit} properties={d?.properties || {}} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
    </CrmPage>
  )
}

function EditModal({ item, properties, onClose, onDone }: { item: any; properties: Record<string, { id: string; name: string }[]>; onClose: () => void; onDone: () => void }) {
  const isNew = !item.id
  const [f, setF] = useState<any>({ module: item.module, property_id: item.property_id || '', type: item.type || '', reference: item.reference || '', issued: item.issued || '', expiry: item.expiry || '', notes: item.notes || '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const save = async (action: string) => { setBusy(true); setErr(''); try { await staffApi('/api/compliance', { action, id: item.id, ...f, property_id: f.property_id || null }); onDone() } catch (e: any) { setErr(e.message); setBusy(false) } }
  return (
    <Modal title={isNew ? 'Add certificate' : `${item.type}`} onClose={onClose} width={520}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={label}>Business</label><select style={input} value={f.module} disabled={!isNew} onChange={e => { set('module', e.target.value); set('property_id', '') }}>{['vr', 'pm', 'ea', 'dev'].map(k => <option key={k} value={k}>{MODULE_LABEL[k]}</option>)}</select></div>
          <div><label style={label}>{f.module === 'dev' ? 'Project' : 'Property'}</label><select style={input} value={f.property_id} onChange={e => set('property_id', e.target.value)}><option value="">{f.module === 'ea' || f.module === 'dev' ? '—' : 'Company-wide'}</option>{(properties[f.module] || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <div><label style={label}>Certificate</label><input style={input} list="cert-types" value={f.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Gas Safety Certificate" /><datalist id="cert-types">{TYPES.map(t => <option key={t} value={t} />)}</datalist></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><label style={label}>Reference</label><input style={input} value={f.reference} onChange={e => set('reference', e.target.value)} /></div>
          <div><label style={label}>Issued</label><input style={input} type="date" value={f.issued} onChange={e => set('issued', e.target.value)} /></div>
          <div><label style={label}>Expires</label><input style={input} type="date" value={f.expiry} onChange={e => set('expiry', e.target.value)} /></div>
        </div>
        <div><label style={label}>Notes</label><textarea style={{ ...input, resize: 'vertical' }} rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && <button style={btn('danger')} disabled={busy} onClick={() => { if (confirm('Remove this certificate?')) save('delete') }}>Remove</button>}
          <div style={{ flex: 1 }} />
          <button style={btn('ghost')} onClick={onClose}>Cancel</button>
          <button style={btn('gold')} disabled={busy || !f.type.trim()} onClick={() => save(isNew ? 'create' : 'update')}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
const td: React.CSSProperties = { padding: '11px 16px', verticalAlign: 'top', color: C.ink }
