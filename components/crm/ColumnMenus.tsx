'use client'
import { useRef, useState } from 'react'
import type { Column, ColumnType } from '@/lib/crm-board'
import { COLUMN_TYPES, BRAND } from '@/lib/crm-board'
import Popover, { menuItem } from './Popover'
import { LabelEditor } from './Cell'
import type { Crm } from './useCrm'

const field: React.CSSProperties = { width: '100%', height: 32, border: '1px solid #C3C6D4', borderRadius: 4, padding: '0 8px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: BRAND.muted, margin: '8px 0 4px', display: 'block' }

export function ColumnHeader({ col, crm, onSort, sort }: { col: Column; crm: Crm; onSort: (dir: 'asc' | 'desc' | null) => void; sort?: 'asc' | 'desc' | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'rename' | 'labels' | 'settings'>('menu')
  const [draft, setDraft] = useState(col.title)
  const [w, setW] = useState<number | null>(null)
  const close = () => { setOpen(false); setMode('menu') }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const x0 = e.clientX, w0 = col.width
    let cur = w0
    const move = (ev: MouseEvent) => { cur = Math.max(70, Math.min(600, w0 + ev.clientX - x0)); setW(cur) }
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); setW(null); if (cur !== w0) crm.updateColumn(col.id, { width: cur }) }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  return (
    <div ref={ref} className="crm-colhead" style={{ width: w ?? col.width, flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: `1px solid ${BRAND.rowBorder}`, fontSize: 13.5, color: BRAND.ink, padding: '0 22px', boxSizing: 'border-box', cursor: 'pointer' }}
      onClick={() => setOpen(true)} title={col.title}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.title}</span>
      {sort && <span style={{ marginLeft: 4, fontSize: 11, color: BRAND.goldDark }}>{sort === 'asc' ? '▲' : '▼'}</span>}
      {col.type === 'link' && <span title="Connected board" style={{ marginLeft: 4, fontSize: 11, color: '#9699A6' }}>ⓘ</span>}
      <span className="crm-hover-show" style={{ position: 'absolute', right: 6, color: '#676879', fontSize: 14 }}>⋯</span>
      <span onMouseDown={startResize} onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 3 }} />
      {open && (
        <Popover anchor={ref.current} onClose={close} width={mode === 'labels' ? 300 : 240}>
          {mode === 'menu' && (
            <div style={{ padding: 6 }}>
              <button style={menuItem} onClick={() => { setDraft(col.title); setMode('rename') }}>✎ Rename</button>
              {col.type === 'status' && <button style={menuItem} onClick={() => setMode('labels')}>▤ Edit labels</button>}
              {['number', 'link', 'formula'].includes(col.type) && <button style={menuItem} onClick={() => setMode('settings')}>⚙ Settings</button>}
              <button style={menuItem} onClick={() => { onSort(sort === 'asc' ? null : 'asc'); close() }}>▲ Sort ascending{sort === 'asc' ? ' ✓' : ''}</button>
              <button style={menuItem} onClick={() => { onSort(sort === 'desc' ? null : 'desc'); close() }}>▼ Sort descending{sort === 'desc' ? ' ✓' : ''}</button>
              <button style={menuItem} onClick={() => { crm.moveColumn(col.id, -1); close() }}>← Move left</button>
              <button style={menuItem} onClick={() => { crm.moveColumn(col.id, 1); close() }}>→ Move right</button>
              <div style={{ borderTop: `1px solid ${BRAND.rowBorder}`, margin: '4px 0' }} />
              <button style={{ ...menuItem, color: '#DF2F4A' }} onClick={() => { if (confirm(`Delete the "${col.title}" column? Its data will be removed from every row.`)) { crm.deleteColumn(col.id); close() } }}>🗑 Delete column</button>
            </div>
          )}
          {mode === 'rename' && (
            <div style={{ padding: 12 }}>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { crm.updateColumn(col.id, { title: draft.trim() }); close() } }} style={field} />
              <button onClick={() => { if (draft.trim()) crm.updateColumn(col.id, { title: draft.trim() }); close() }} style={primaryBtn}>Save</button>
            </div>
          )}
          {mode === 'labels' && <LabelEditor col={col} crm={crm} onDone={close} />}
          {mode === 'settings' && <ColumnSettings col={col} crm={crm} onDone={close} />}
        </Popover>
      )}
    </div>
  )
}

export const primaryBtn: React.CSSProperties = { marginTop: 10, width: '100%', height: 32, border: 'none', borderRadius: 4, background: BRAND.goldDark, color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }

function ColumnSettings({ col, crm, onDone }: { col: Column; crm: Crm; onDone: () => void }) {
  const [s, setS] = useState<any>({ ...col.settings })
  const numberCols = crm.columns.filter(c => c.board_id === col.board_id && c.type === 'number')
  return (
    <div style={{ padding: 12 }}>
      {col.type === 'number' && <>
        <label style={lbl}>Currency / unit symbol</label>
        <select value={s.currency ?? ''} onChange={e => setS({ ...s, currency: e.target.value })} style={field}>
          <option value="">None</option><option value="£">£ GBP</option><option value="$">$ USD</option><option value="J$">J$ JMD</option><option value="AED ">AED</option><option value="€">€ EUR</option>
        </select>
        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={!!s.sum} onChange={e => setS({ ...s, sum: e.target.checked })} /> Show total under each group</label>
      </>}
      {col.type === 'link' && <>
        <label style={lbl}>Connect to board</label>
        <select value={s.board_id ?? ''} onChange={e => setS({ ...s, board_id: e.target.value })} style={field}>
          <option value="">Choose…</option>
          {crm.boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </>}
      {col.type === 'formula' && <>
        <label style={lbl}>Calculate</label>
        <select value={s.a ?? ''} onChange={e => setS({ ...s, a: e.target.value })} style={field}><option value="">Column…</option>{numberCols.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <select value={s.op ?? '/'} onChange={e => setS({ ...s, op: e.target.value })} style={{ ...field, marginTop: 6 }}><option value="+">+ plus</option><option value="-">− minus</option><option value="*">× times</option><option value="/">÷ divided by</option></select>
        <select value={s.b ?? ''} onChange={e => setS({ ...s, b: e.target.value })} style={{ ...field, marginTop: 6 }}><option value="">Column…</option>{numberCols.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <label style={lbl}>Currency symbol</label>
        <input value={s.currency ?? ''} onChange={e => setS({ ...s, currency: e.target.value })} style={field} placeholder="e.g. £" />
      </>}
      <button onClick={() => { crm.updateColumn(col.id, { settings: s }); onDone() }} style={primaryBtn}>Save</button>
    </div>
  )
}

export function AddColumnButton({ boardId, crm }: { boardId: string; crm: Crm }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [linkStep, setLinkStep] = useState(false)
  const [target, setTarget] = useState('')
  const [twoWay, setTwoWay] = useState(true)
  const close = () => { setOpen(false); setLinkStep(false); setTarget('') }
  const add = async (type: ColumnType, title: string, settings: any = {}) => { await crm.addColumn(boardId, type, title, settings); close() }
  return (
    <div ref={ref} onClick={() => setOpen(true)} style={{ width: 44, flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: BRAND.muted, fontSize: 18 }} title="Add column">
      +
      {open && (
        <Popover anchor={ref.current} onClose={close} width={linkStep ? 260 : 320} align="right">
          {!linkStep ? (
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.muted, margin: '2px 4px 8px' }}>Add a column</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {COLUMN_TYPES.map(t => (
                  <button key={t.type} onClick={e => { e.stopPropagation(); if (t.type === 'link') setLinkStep(true); else if (t.type === 'formula') add('formula', 'Formula', { op: '/' }); else add(t.type, t.label === 'People' ? 'Person' : t.label) }}
                    style={{ ...menuItem, fontSize: 13, padding: '7px 8px' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: t.color, color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
              <label style={lbl}>Connect to which board?</label>
              <select value={target} onChange={e => setTarget(e.target.value)} style={field}>
                <option value="">Choose…</option>
                {crm.boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={twoWay} onChange={e => setTwoWay(e.target.checked)} /> Show the link on that board too</label>
              <button disabled={!target} onClick={() => add('link', crm.boards.find(b => b.id === target)?.name ?? 'Link', { board_id: target, two_way: twoWay && target !== boardId })} style={{ ...primaryBtn, opacity: target ? 1 : 0.5 }}>Add column</button>
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}
