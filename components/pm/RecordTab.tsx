'use client'
// A small list-and-form tab for the Property Management area: Rent Reviews, Service Charges and Ground Rent,
// Planned Maintenance and Emergency Contacts. Each one is a table of records with Add, Edit and Delete.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cur } from '@/lib/company-currency'
const CUR_SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$', EUR: '€', AED: 'AED ', CAD: 'C$' }

export type Field = {
  key: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'property' | 'textarea'
  options?: string[]; required?: boolean; half?: boolean
}
export type Column = { label: string; width?: string; render: (r: any, ctx: { sym: (r: any) => string; today: string }) => React.ReactNode }
export type RowAction = { label: string; show?: (r: any) => boolean; patch: (r: any) => Record<string, any> }
export type RecordTabConfig = {
  table: string; noun: string; empty: string; orderBy: string; ascending?: boolean
  fields: Field[]; columns: Column[]; defaults?: Record<string, any>; actions?: RowAction[]
  summary?: (rows: any[], today: string) => { label: string; value: string; tone?: 'warn' | 'ok' }[]
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }

export default function RecordTab({ cfg, userId, properties }: { cfg: RecordTabConfig; userId: string; properties: any[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  async function load() {
    if (!userId) return
    const { data } = await supabase.from(cfg.table).select('*,pm_properties(name,currency)').eq('user_id', userId).order(cfg.orderBy, { ascending: cfg.ascending ?? true })
    setRows(data ?? []); setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [userId, cfg.table])

  const sym = (r: any) => CUR_SYM[r.pm_properties?.currency as string] ?? cur()
  const summary = useMemo(() => cfg.summary?.(rows, today) ?? [], [rows, cfg, today])

  function openAdd() { setForm({ ...(cfg.defaults ?? {}) }); setEditId(null); setErr(''); setModal(true) }
  function openEdit(r: any) {
    const f: Record<string, any> = {}
    for (const fd of cfg.fields) f[fd.key] = r[fd.key] ?? ''
    setForm(f); setEditId(r.id); setErr(''); setModal(true)
  }
  function payload() {
    const p: Record<string, any> = {}
    for (const fd of cfg.fields) {
      const v = form[fd.key]
      p[fd.key] = v === '' || v === undefined ? null : fd.type === 'number' ? Number(v) : v
    }
    return p
  }
  const missing = cfg.fields.some(fd => fd.required && (form[fd.key] === '' || form[fd.key] == null))

  async function save() {
    setSaving(true); setErr('')
    const p = payload()
    const { error } = editId
      ? await supabase.from(cfg.table).update(p).eq('id', editId)
      : await supabase.from(cfg.table).insert([{ ...p, user_id: userId }])
    setSaving(false)
    if (error) { setErr(error.message); return }
    setModal(false); setEditId(null); load()
  }
  async function remove(id: string) {
    if (!confirm(`Delete this ${cfg.noun}?`)) return
    await supabase.from(cfg.table).delete().eq('id', id); load()
  }
  async function act(r: any, a: RowAction) {
    await supabase.from(cfg.table).update(a.patch(r)).eq('id', r.id); load()
  }

  const grid = cfg.columns.map(c => c.width ?? '1fr').join(' ') + ' 170px'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {summary.map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '8px 14px' }}>
              <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.tone === 'warn' ? '#B42318' : s.tone === 'ok' ? '#067647' : '#1D4E89' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <button onClick={openAdd} style={{ background: '#2F6DB5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add {cfg.noun}</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
            {cfg.columns.map(c => <span key={c.label}>{c.label}</span>)}<span></span>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 50, color: '#98A2B3', fontSize: 14 }}>Loading</div>
            : rows.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>{cfg.empty}</div>
            : rows.map(r => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: grid, padding: '13px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, color: '#344054', alignItems: 'center' }}>
                {cfg.columns.map(c => <span key={c.label}>{c.render(r, { sym, today })}</span>)}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(cfg.actions ?? []).filter(a => !a.show || a.show(r)).map(a => (
                    <button key={a.label} onClick={() => act(r, a)} style={{ fontSize: 12, color: '#067647', background: 'none', border: '1px solid #067647', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{a.label}</button>
                  ))}
                  <button onClick={() => openEdit(r)} style={{ fontSize: 12, color: '#2F6DB5', background: 'none', border: '1px solid #2F6DB5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89', marginBottom: 16 }}>{editId ? 'Edit' : 'Add'} {cfg.noun}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {cfg.fields.map(fd => (
                <div key={fd.key} style={{ gridColumn: fd.half ? 'auto' : '1 / -1' }}>
                  <label style={lbl}>{fd.label}{fd.required ? ' *' : ''}</label>
                  {fd.type === 'property' ? (
                    <select style={inp} value={form[fd.key] ?? ''} onChange={e => setForm({ ...form, [fd.key]: e.target.value })}>
                      <option value="">{fd.required ? 'Select property' : 'All properties'}</option>
                      {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : fd.type === 'select' ? (
                    <select style={inp} value={form[fd.key] ?? ''} onChange={e => setForm({ ...form, [fd.key]: e.target.value })}>
                      {!fd.required && <option value="">Select</option>}
                      {fd.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : fd.type === 'textarea' ? (
                    <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={form[fd.key] ?? ''} onChange={e => setForm({ ...form, [fd.key]: e.target.value })} />
                  ) : (
                    <input type={fd.type ?? 'text'} style={inp} value={form[fd.key] ?? ''} onChange={e => setForm({ ...form, [fd.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 12 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={save} disabled={saving || missing} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: saving || missing ? '#98A2B3' : '#2F6DB5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving || missing ? 'default' : 'pointer' }}>{saving ? 'Saving' : 'Save'}</button>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
