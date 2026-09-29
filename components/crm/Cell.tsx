'use client'
import { useRef, useState } from 'react'
import type { Column, Item, Person, FileRef, Label } from '@/lib/crm-board'
import { labelFor, labelsOf, fmtDate, fmtNumber, currencyOf, formulaValue, initials, avatarColor, isImage, PALETTE, newId, BRAND } from '@/lib/crm-board'
import Popover, { menuItem } from './Popover'
import type { Crm } from './useCrm'

const cellBase: React.CSSProperties = {
  height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13.5, color: BRAND.ink, overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer', position: 'relative',
}
const input: React.CSSProperties = {
  width: '100%', height: '100%', border: `1px solid ${BRAND.goldDark}`, outline: 'none', padding: '0 8px', fontSize: 13.5,
  fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: BRAND.ink, textAlign: 'center',
}

export default function Cell({ col, item, crm, compact }: { col: Column; item: Item; crm: Crm; compact?: boolean }) {
  const v = item.values?.[col.id]
  const set = (val: any) => crm.setValue(item.id, col, val)
  switch (col.type) {
    case 'status': return <StatusCell col={col} value={v} onChange={set} crm={crm} />
    case 'date': return <DateCell value={v} onChange={set} />
    case 'person': return <PersonCell value={v} onChange={set} people={crm.people} />
    case 'number': return <TextishCell value={v} onChange={x => set(x === '' ? null : Number(x))} kind="number" display={fmtNumber(v, currencyOf(col))} />
    case 'phone': return <TextishCell value={v} onChange={set} kind="tel" display={v ? <a href={`tel:${v}`} onClick={e => e.stopPropagation()} style={{ color: '#1F76C2', textDecoration: 'none' }}>{v}</a> : ''} />
    case 'email': return <TextishCell value={v} onChange={set} kind="email" display={v ? <a href={`mailto:${v}`} onClick={e => e.stopPropagation()} style={{ color: '#1F76C2', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</a> : ''} />
    case 'url': return <TextishCell value={v} onChange={x => set(x && !/^https?:\/\//i.test(x) ? 'https://' + x : x)} kind="url" display={v ? <a href={v} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#1F76C2', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(v).replace(/^https?:\/\//, '')}</a> : ''} />
    case 'checkbox': return (
      <div style={cellBase} onClick={() => set(v ? null : true)}>
        <span style={{ width: 18, height: 18, borderRadius: 4, border: v ? 'none' : '1px solid #C3C6D4', background: v ? 'transparent' : '#fff', color: '#00C875', fontSize: 18, lineHeight: '18px', textAlign: 'center', fontWeight: 700 }}>{v ? '✓' : ''}</span>
      </div>
    )
    case 'location': return <LocationCell value={v} onChange={set} crm={crm} />
    case 'file': return <FileCell value={v} onChange={set} crm={crm} compact={compact} />
    case 'link': return <LinkCell col={col} value={v} onChange={set} crm={crm} self={item} />
    case 'formula': { const n = formulaValue(col, item); return <div style={{ ...cellBase, cursor: 'default' }}>{n == null ? '' : fmtNumber(Math.round(n * 100) / 100, col.settings?.currency ?? '')}</div> }
    default: return <TextishCell value={v} onChange={set} kind="text" display={v ?? ''} align="left" />
  }
}

function TextishCell({ value, onChange, kind, display, align = 'center' }: { value: any; onChange: (v: any) => void; kind: string; display: React.ReactNode; align?: 'left' | 'center' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (editing) {
    const save = () => { setEditing(false); if (String(draft) !== String(value ?? '')) onChange(draft.trim()) }
    return <input autoFocus type={kind === 'number' ? 'number' : 'text'} value={draft} onChange={e => setDraft(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} style={{ ...input, textAlign: align }} />
  }
  return (
    <div style={{ ...cellBase, justifyContent: align === 'left' ? 'flex-start' : 'center', padding: '0 8px', boxSizing: 'border-box' }} onClick={() => { setDraft(value ?? ''); setEditing(true) }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</span>
    </div>
  )
}

export function StatusCell({ col, value, onChange, crm, height }: { col: Column; value: any; onChange: (v: any) => void; crm: Crm; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editLabels, setEditLabels] = useState(false)
  const lbl = labelFor(col, value)
  return (
    <>
      <div ref={ref} onClick={() => setOpen(true)} style={{ ...cellBase, height: height ?? '100%', background: lbl?.color ?? '#C4C4C4', color: '#fff', fontWeight: 500, padding: '0 6px', boxSizing: 'border-box' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lbl?.label ?? ''}</span>
      </div>
      {open && (
        <Popover anchor={ref.current} onClose={() => { setOpen(false); setEditLabels(false) }} width={editLabels ? 300 : 220}>
          {editLabels
            ? <LabelEditor col={col} crm={crm} onDone={() => setEditLabels(false)} />
            : (
              <div style={{ padding: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {labelsOf(col).map(l => (
                    <button key={l.id} onClick={() => { onChange(l.id); setOpen(false) }} style={{ height: 32, border: 'none', borderRadius: 4, background: l.color, color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', outline: l.id === value ? '2px solid #323338' : 'none', outlineOffset: 1 }}>{l.label}</button>
                  ))}
                  <button onClick={() => { onChange(null); setOpen(false) }} style={{ height: 32, border: '1px dashed #C3C6D4', borderRadius: 4, background: '#fff', color: BRAND.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                </div>
                <div style={{ borderTop: `1px solid ${BRAND.rowBorder}`, marginTop: 10, paddingTop: 6 }}>
                  <button onClick={() => setEditLabels(true)} style={{ ...menuItem, justifyContent: 'center', fontSize: 13 }}>✎ Edit labels</button>
                </div>
              </div>
            )}
        </Popover>
      )}
    </>
  )
}

export function LabelEditor({ col, crm, onDone }: { col: Column; crm: Crm; onDone: () => void }) {
  const [labels, setLabels] = useState<Label[]>(labelsOf(col))
  const [picker, setPicker] = useState<string | null>(null)
  const save = (next: Label[]) => { setLabels(next); crm.updateColumn(col.id, { settings: { ...col.settings, labels: next } }) }
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Labels</div>
      {labels.map((l, i) => (
        <div key={l.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <button title="Colour" onClick={() => setPicker(picker === l.id ? null : l.id)} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: l.color, cursor: 'pointer', flexShrink: 0 }} />
          <input defaultValue={l.label} onBlur={e => { const t = e.target.value.trim(); if (t && t !== l.label) save(labels.map(x => x.id === l.id ? { ...x, label: t } : x)) }}
            style={{ flex: 1, height: 28, border: '1px solid #C3C6D4', borderRadius: 4, padding: '0 8px', fontSize: 13, fontFamily: 'inherit' }} />
          <button title="Move up" disabled={i === 0} onClick={() => { const n = [...labels]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; save(n) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted }}>↑</button>
          <button title="Delete" onClick={() => save(labels.filter(x => x.id !== l.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DF2F4A', fontSize: 16 }}>×</button>
        </div>
          {picker === l.id && (
            <div style={{ background: '#F5F6F8', borderRadius: 6, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginBottom: 8 }}>
              {PALETTE.map(c => <button key={c} onClick={() => { save(labels.map(x => x.id === l.id ? { ...x, color: c } : x)); setPicker(null) }} style={{ width: 24, height: 24, borderRadius: 4, border: c === l.color ? '2px solid #323338' : 'none', background: c, cursor: 'pointer' }} />)}
            </div>
          )}
        </div>
      ))}
      <button onClick={() => save([...labels, { id: newId(), label: 'New label', color: PALETTE[labels.length % PALETTE.length] }])} style={{ ...menuItem, justifyContent: 'center', border: '1px dashed #C3C6D4', marginTop: 4, fontSize: 13 }}>+ New label</button>
      <button onClick={onDone} style={{ marginTop: 10, width: '100%', height: 32, border: 'none', borderRadius: 4, background: BRAND.goldDark, color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
    </div>
  )
}

function DateCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const overdue = value && new Date(value + 'T23:59:59') < new Date()
  return (
    <div style={cellBase} onClick={() => { try { ref.current?.showPicker() } catch { ref.current?.focus() } }}>
      <span style={{ color: BRAND.ink }}>{fmtDate(value)}</span>
      {overdue && <span title="Past date" style={{ marginLeft: 5, color: '#DF2F4A', fontSize: 11 }}>!</span>}
      <input ref={ref} type="date" value={value ?? ''} onChange={e => onChange(e.target.value || null)} style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }} tabIndex={-1} />
      {value && <button className="crm-clear" title="Clear date" onClick={e => { e.stopPropagation(); onChange(null) }} style={{ position: 'absolute', right: 4, border: 'none', background: 'none', color: '#9699A6', cursor: 'pointer', fontSize: 14 }}>×</button>}
    </div>
  )
}

export function Avatar({ p, size = 24 }: { p: Person; size?: number }) {
  return <span title={p.name} style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(p.name), color: '#fff', fontSize: size * 0.42, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', flexShrink: 0 }}>{initials(p.name)}</span>
}

function EmptyPerson() {
  return <span style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #C3C6D4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#C3C6D4' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
  </span>
}

function PersonCell({ value, onChange, people }: { value: any; onChange: (v: any) => void; people: Person[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const sel: Person[] = Array.isArray(value) ? value : []
  const toggle = (p: Person) => onChange(sel.some(s => s.id === p.id) ? sel.filter(s => s.id !== p.id) : [...sel, { id: p.id, name: p.name }])
  return (
    <>
      <div ref={ref} style={cellBase} onClick={() => setOpen(true)}>
        {sel.length ? <span style={{ display: 'flex' }}>{sel.slice(0, 3).map((p, i) => <span key={p.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar p={p} /></span>)}{sel.length > 3 && <span style={{ fontSize: 11, marginLeft: 3, color: BRAND.muted }}>+{sel.length - 3}</span>}</span> : <EmptyPerson />}
      </div>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} width={260}>
          <div style={{ padding: 10 }}>
            <input autoFocus placeholder="Search names" value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', height: 32, border: '1px solid #C3C6D4', borderRadius: 4, padding: '0 8px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} />
            {people.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).map(p => {
              const on = sel.some(s => s.id === p.id)
              return (
                <button key={p.id} onClick={() => toggle(p)} style={{ ...menuItem, background: on ? BRAND.selected : 'none' }}>
                  <Avatar p={p} size={26} /><span style={{ flex: 1 }}>{p.name}</span>{on && <span style={{ color: BRAND.goldDark }}>✓</span>}
                </button>
              )
            })}
            {!people.length && <div style={{ fontSize: 13, color: BRAND.muted, padding: 8 }}>No team members yet — add them in Settings → Team Management.</div>}
          </div>
        </Popover>
      )}
    </>
  )
}

function LocationCell({ value, onChange, crm }: { value: any; onChange: (v: any) => void; crm: Crm }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const addr = value?.address ?? ''
  if (editing) {
    const save = async () => {
      setEditing(false)
      const t = draft.trim()
      if (t === addr) return
      if (!t) { onChange(null); return }
      const g = await crm.geocode(t)
      onChange(g ? { address: t, ...g } : g === null ? { address: t, geofail: true } : { address: t })
    }
    return <input autoFocus value={draft} placeholder="Type an address" onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} style={{ ...input, textAlign: 'left' }} />
  }
  return (
    <div style={{ ...cellBase, justifyContent: 'flex-start', padding: '0 8px', boxSizing: 'border-box', gap: 4 }} onClick={() => { setDraft(addr); setEditing(true) }}>
      {addr && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#676879" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{addr}</span>
    </div>
  )
}

function FileCell({ value, onChange, crm, compact }: { value: any; onChange: (v: any) => void; crm: Crm; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const files: FileRef[] = Array.isArray(value) ? value : []
  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    const added: FileRef[] = []
    for (const f of Array.from(list)) { const r = await crm.uploadFile(f); if (r) added.push(r) }
    setBusy(false)
    if (added.length) onChange([...files, ...added])
  }
  return (
    <>
      <div ref={ref} style={{ ...cellBase, gap: 3 }} onClick={() => files.length ? setOpen(true) : fileRef.current?.click()}
        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files) }}>
        {busy ? <span style={{ fontSize: 12, color: BRAND.muted }}>Uploading…</span>
          : files.length ? files.slice(0, compact ? 1 : 3).map((f, i) => isImage(f)
            ? <img key={i} src={f.url} alt={f.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, border: '1px solid #E6E9EF' }} />
            : <span key={i} title={f.name} style={{ width: 22, height: 26, borderRadius: 3, background: '#E6E9EF', fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: BRAND.muted, fontWeight: 700 }}>{(f.name.split('.').pop() ?? 'FILE').slice(0, 4).toUpperCase()}</span>)
          : <span className="crm-hover-show" style={{ color: '#C3C6D4', fontSize: 16 }}>⊕</span>}
        {files.length > 3 && !compact && <span style={{ fontSize: 11, color: BRAND.muted }}>+{files.length - 3}</span>}
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={e => { upload(e.target.files); e.target.value = '' }} />
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} width={300}>
          <div style={{ padding: 10 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: `1px solid ${BRAND.rowBorder}` }}>
                {isImage(f) ? <img src={f.url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ width: 36, height: 36, borderRadius: 4, background: '#E6E9EF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: BRAND.muted }}>{(f.name.split('.').pop() ?? '').toUpperCase().slice(0, 4)}</span>}
                <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 13, color: '#1F76C2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{f.name}</a>
                <button title="Remove" onClick={() => onChange(files.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#DF2F4A', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} style={{ ...menuItem, justifyContent: 'center', marginTop: 8, border: '1px dashed #C3C6D4', fontSize: 13 }}>{busy ? 'Uploading…' : '+ Add files'}</button>
          </div>
        </Popover>
      )}
    </>
  )
}

function LinkCell({ col, value, onChange, crm, self }: { col: Column; value: any; onChange: (v: any) => void; crm: Crm; self: Item }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ids: string[] = Array.isArray(value) ? value : []
  const linked = ids.map(id => crm.itemsById.get(id)).filter(Boolean) as Item[]
  const target = crm.boards.find(b => b.id === col.settings?.board_id)
  const options = crm.items.filter(i => i.board_id === target?.id && i.id !== self.id && i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
  return (
    <>
      <div ref={ref} style={{ ...cellBase, gap: 4, padding: '0 6px', boxSizing: 'border-box' }} onClick={() => setOpen(true)}>
        {linked.length ? linked.slice(0, 2).map(i => (
          <span key={i.id} style={{ background: '#E5F4FF', color: BRAND.ink, borderRadius: 4, padding: '2px 6px', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: linked.length > 1 ? '48%' : '100%' }}>{i.name}</span>
        )) : <span className="crm-hover-show" style={{ color: '#C3C6D4', fontSize: 16 }}>⊕</span>}
        {linked.length > 2 && <span style={{ fontSize: 11, color: BRAND.muted }}>+{linked.length - 2}</span>}
      </div>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} width={300}>
          <div style={{ padding: 10 }}>
            {!target ? <div style={{ fontSize: 13, color: BRAND.muted }}>Choose which board this column connects to from the column menu (⋯ → Settings).</div> : <>
              <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 6 }}>Linked from <b>{target.name}</b></div>
              {linked.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {linked.map(i => <span key={i.id} style={{ background: '#E5F4FF', borderRadius: 4, padding: '3px 6px', fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}>{i.name}<button onClick={() => onChange(ids.filter(x => x !== i.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted, padding: 0 }}>×</button></span>)}
              </div>}
              <input autoFocus placeholder={`Search ${target.name.toLowerCase()}`} value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', height: 32, border: '1px solid #C3C6D4', borderRadius: 4, padding: '0 8px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 6 }} />
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {options.map(o => {
                  const on = ids.includes(o.id)
                  return <button key={o.id} onClick={() => onChange(on ? ids.filter(x => x !== o.id) : [...ids, o.id])} style={{ ...menuItem, background: on ? BRAND.selected : 'none', fontSize: 13 }}><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>{on && <span style={{ color: BRAND.goldDark }}>✓</span>}</button>
                })}
                {!options.length && <div style={{ fontSize: 13, color: BRAND.muted, padding: 6 }}>No matches</div>}
              </div>
              <button onClick={async () => { const n = q.trim() || 'New item'; const g = crm.groups.filter(g => g.board_id === target.id).sort((a, b) => a.position - b.position)[0]; const it = await crm.addItem(target.id, g?.id ?? null, n); if (it) onChange([...ids, it.id]); setQ('') }}
                style={{ ...menuItem, justifyContent: 'center', marginTop: 6, border: '1px dashed #C3C6D4', fontSize: 13 }}>+ Create {q.trim() ? `"${q.trim()}"` : 'new'} in {target.name}</button>
            </>}
          </div>
        </Popover>
      )}
    </>
  )
}
