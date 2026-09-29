'use client'
import { useRef, useState } from 'react'
import type { Board, Column, Group, Item } from '@/lib/crm-board'
import { BRAND, GROUP_COLORS, labelsOf, fmtNumber, currencyOf, singular } from '@/lib/crm-board'
import Cell from './Cell'
import { ColumnHeader, AddColumnButton } from './ColumnMenus'
import Popover, { menuItem } from './Popover'
import type { Crm } from './useCrm'

export const NAME_W = 340
const ROW_H = 36

export type SortState = { colId: string; dir: 'asc' | 'desc' } | null

export default function BoardTable({ crm, board, cols, groups, itemsFor, selected, setSelected, onOpenItem, sort, setSort }: {
  crm: Crm
  board: Board
  cols: Column[]
  groups: Group[]
  itemsFor: (g: Group) => Item[]
  selected: Set<string>
  setSelected: (s: Set<string>) => void
  onOpenItem: (id: string) => void
  sort: SortState
  setSort: (s: SortState) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const totalW = 6 + 36 + NAME_W + cols.reduce((a, c) => a + c.width, 0) + 44

  const dropOn = async (targetItem: Item | null, group: Group) => {
    if (!dragId) return
    const moving = crm.itemsById.get(dragId)
    setDragId(null); setDropTarget(null)
    if (!moving || moving.id === targetItem?.id) return
    const list = itemsFor(group).filter(i => i.id !== moving.id)
    let position: number
    if (!targetItem) position = list.length ? list[list.length - 1].position + 1 : 1
    else {
      const idx = list.findIndex(i => i.id === targetItem.id)
      const prev = list[idx - 1]
      position = prev ? (prev.position + targetItem.position) / 2 : targetItem.position - 1
    }
    await crm.updateItem(moving.id, { group_id: group.id, position })
  }

  return (
    <div style={{ minWidth: totalW, paddingBottom: 40 }}>
      {groups.map(g => {
        const gi = itemsFor(g)
        const allSel = gi.length > 0 && gi.every(i => selected.has(i.id))
        return (
          <div key={g.id} style={{ marginBottom: 36 }}
            onDragOver={e => { if (dragId) e.preventDefault() }}
            onDrop={e => { e.preventDefault(); if (dropTarget === 'g:' + g.id) dropOn(null, g) }}>
            <GroupHeader g={g} crm={crm} count={gi.length} board={board} onDragOverHeader={() => setDropTarget('g:' + g.id)} />
            {!g.collapsed && (
              <div style={{ borderRadius: '8px 8px 0 0' }}>
                {/* column headers */}
                <div style={{ display: 'flex', height: ROW_H, borderTop: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff' }}>
                  <div style={{ position: 'sticky', left: 0, zIndex: 3, display: 'flex', background: '#fff' }}>
                    <div style={{ width: 6, background: g.color, borderTopLeftRadius: 6 }} />
                    <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BRAND.rowBorder}` }}>
                      <input type="checkbox" checked={allSel} onChange={() => { const n = new Set(selected); gi.forEach(i => allSel ? n.delete(i.id) : n.add(i.id)); setSelected(n) }} />
                    </div>
                    <div style={{ width: NAME_W, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: BRAND.ink, borderRight: `1px solid ${BRAND.rowBorder}`, boxShadow: '2px 0 3px -2px rgba(0,0,0,0.08)' }}>
                      {board.item_label ? board.item_label.charAt(0).toUpperCase() + board.item_label.slice(1) : 'Item'}
                    </div>
                  </div>
                  {cols.map(c => <ColumnHeader key={c.id} col={c} crm={crm} sort={sort?.colId === c.id ? sort.dir : null} onSort={dir => setSort(dir ? { colId: c.id, dir } : null)} />)}
                  <AddColumnButton boardId={board.id} crm={crm} />
                </div>
                {/* rows */}
                {gi.map(item => {
                  const sel = selected.has(item.id)
                  const upd = crm.updateCounts[item.id] ?? 0
                  return (
                    <div key={item.id} className="crm-row" style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}`, background: sel ? BRAND.selected : '#fff', boxShadow: dropTarget === item.id ? `inset 0 2px 0 ${BRAND.goldDark}` : undefined }}
                      onDragOver={e => { if (dragId) { e.preventDefault(); setDropTarget(item.id) } }}
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); dropOn(item, g) }}>
                      <div className="crm-sticky" style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: sel ? BRAND.selected : '#fff' }}>
                        <div style={{ width: 6, background: g.color }} />
                        <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BRAND.rowBorder}` }}>
                          <input type="checkbox" checked={sel} onChange={() => { const n = new Set(selected); sel ? n.delete(item.id) : n.add(item.id); setSelected(n) }} />
                        </div>
                        <div draggable onDragStart={e => { setDragId(item.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                          style={{ width: NAME_W, display: 'flex', alignItems: 'center', borderRight: `1px solid ${BRAND.rowBorder}`, boxShadow: '2px 0 3px -2px rgba(0,0,0,0.08)', cursor: 'grab' }}>
                          <NameCell item={item} crm={crm} />
                          <button className="crm-hover-show" onClick={() => onOpenItem(item.id)} title="Open" style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted, fontSize: 12, padding: '0 6px', whiteSpace: 'nowrap' }}>⤢ Open</button>
                          <button onClick={() => onOpenItem(item.id)} title="Updates" style={{ width: 40, height: '100%', border: 'none', borderLeft: `1px solid ${BRAND.rowBorder}`, background: 'none', cursor: 'pointer', position: 'relative', color: upd ? '#1F76C2' : '#C3C6D4', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />{!upd && <path d="M12 8v8M8 12h8" />}</svg>
                            {upd > 0 && <span style={{ position: 'absolute', bottom: 5, right: 6, background: '#1F76C2', color: '#fff', borderRadius: 8, fontSize: 9, padding: '0 4px', lineHeight: '13px' }}>{upd}</span>}
                          </button>
                        </div>
                      </div>
                      {cols.map(c => (
                        <div key={c.id} style={{ width: c.width, flexShrink: 0, borderRight: `1px solid ${BRAND.rowBorder}`, height: '100%', boxSizing: 'border-box', padding: c.type === 'status' ? 1 : 0 }}>
                          <Cell col={c} item={item} crm={crm} />
                        </div>
                      ))}
                      <div style={{ width: 44, flexShrink: 0 }} />
                    </div>
                  )
                })}
                {/* add row */}
                <AddRow board={board} group={g} crm={crm} />
                {/* summary */}
                <SummaryRow cols={cols} items={gi} />
              </div>
            )}
          </div>
        )
      })}
      <button onClick={() => crm.addGroup(board.id)} style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${BRAND.border}`, borderRadius: 4, background: '#fff', color: BRAND.ink, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add new group</button>
    </div>
  )
}

function NameCell({ item, crm }: { item: Item; crm: Crm }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.name)
  if (editing) {
    const save = () => { setEditing(false); const t = draft.trim(); if (t && t !== item.name) crm.updateItem(item.id, { name: t }) }
    return <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      style={{ flex: 1, height: 28, margin: '0 6px 0 20px', border: `1px solid ${BRAND.goldDark}`, borderRadius: 3, padding: '0 6px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
  }
  return (
    <div onClick={() => { setDraft(item.name); setEditing(true) }} style={{ flex: 1, paddingLeft: 20, fontSize: 13.5, color: BRAND.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text', height: '100%', display: 'flex', alignItems: 'center' }}>
      {item.name || <span style={{ color: '#9699A6' }}>Untitled</span>}
    </div>
  )
}

function AddRow({ board, group, crm }: { board: Board; group: Group; crm: Crm }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const t = draft.trim()
    if (!t || busy) return
    setBusy(true)
    await crm.addItem(board.id, group.id, t)
    setDraft(''); setBusy(false)
  }
  return (
    <div style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
      <div style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: '#fff' }}>
        <div style={{ width: 6, background: group.color, opacity: 0.5, borderBottomLeftRadius: 6 }} />
        <div style={{ width: 36, borderRight: `1px solid ${BRAND.rowBorder}` }} />
        <div style={{ width: NAME_W, display: 'flex', alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }} onBlur={submit}
            placeholder={`+ Add ${singular(board.item_label)}`} style={{ flex: 1, height: 28, margin: '0 10px 0 16px', border: '1px solid transparent', borderRadius: 3, padding: '0 6px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'transparent' }}
            onFocus={e => (e.target.style.borderColor = BRAND.goldDark)} />
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ cols, items }: { cols: Column[]; items: Item[] }) {
  return (
    <div style={{ display: 'flex', height: ROW_H + 4 }}>
      <div style={{ position: 'sticky', left: 0, zIndex: 2, width: 6 + 36 + NAME_W, background: '#fff' }} />
      {cols.map(c => {
        let content: React.ReactNode = null
        if (c.type === 'number' && (c.settings?.sum ?? true)) {
          const vals = items.map(i => Number(i.values?.[c.id])).filter(n => !Number.isNaN(n) && n !== 0)
          const sum = vals.reduce((a, b) => a + b, 0)
          content = vals.length ? <div style={{ textAlign: 'center', lineHeight: 1.1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtNumber(sum, currencyOf(c))}</div><div style={{ fontSize: 10, color: BRAND.muted }}>sum</div></div> : null
        }
        if (c.type === 'status' && items.length) {
          const labels = labelsOf(c)
          const counts = labels.map(l => ({ l, n: items.filter(i => i.values?.[c.id] === l.id).length })).filter(x => x.n)
          const empty = items.length - counts.reduce((a, b) => a + b.n, 0)
          content = (
            <div style={{ display: 'flex', width: '100%', height: 22, margin: '0 6px', overflow: 'hidden' }}>
              {counts.map(({ l, n }) => <div key={l.id} title={`${l.label}: ${n}`} style={{ flex: n, background: l.color }} />)}
              {empty > 0 && <div title={`Empty: ${empty}`} style={{ flex: empty, background: '#C4C4C4' }} />}
            </div>
          )
        }
        return <div key={c.id} style={{ width: c.width, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff', boxSizing: 'border-box' }}>{content}</div>
      })}
    </div>
  )
}

function GroupHeader({ g, crm, count, board, onDragOverHeader }: { g: Group; crm: Crm; count: number; board: Board; onDragOverHeader: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(g.title)
  const [colors, setColors] = useState(false)
  return (
    <div onDragOver={onDragOverHeader} style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, zIndex: 3, background: '#fff', paddingRight: 12 }}>
      <button ref={ref} className="crm-hover-show-group" onClick={() => setMenu(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted, fontSize: 16, width: 22 }}>⋯</button>
      <button onClick={() => crm.updateGroup(g.id, { collapsed: !g.collapsed })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: g.color, fontSize: 14, transform: g.collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', padding: 0, width: 18 }}>⌄</button>
      {editing
        ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { setEditing(false); if (draft.trim() && draft !== g.title) crm.updateGroup(g.id, { title: draft.trim() }) }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{ fontSize: 18, fontWeight: 500, color: g.color, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', outline: 'none' }} />
        : <span onClick={() => { setDraft(g.title); setEditing(true) }} style={{ fontSize: 18, fontWeight: 500, color: g.color, cursor: 'text' }}>{g.title}</span>}
      <span style={{ fontSize: 13, color: BRAND.muted, marginLeft: 6 }}>{count} {count === 1 ? singular(board.item_label) : singular(board.item_label).endsWith('y') ? singular(board.item_label).slice(0, -1) + 'ies' : singular(board.item_label) + 's'}</span>
      {menu && (
        <Popover anchor={ref.current} onClose={() => { setMenu(false); setColors(false) }} width={220} align="left">
          {colors ? (
            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
              {GROUP_COLORS.map(c => <button key={c} onClick={() => { crm.updateGroup(g.id, { color: c }); setMenu(false); setColors(false) }} style={{ width: 26, height: 26, borderRadius: '50%', border: c === g.color ? '2px solid #323338' : 'none', background: c, cursor: 'pointer' }} />)}
            </div>
          ) : (
            <div style={{ padding: 6 }}>
              <button style={menuItem} onClick={() => { setMenu(false); setDraft(g.title); setEditing(true) }}>✎ Rename group</button>
              <button style={menuItem} onClick={() => setColors(true)}>● Change colour</button>
              <button style={menuItem} onClick={() => { crm.updateGroup(g.id, { collapsed: !g.collapsed }); setMenu(false) }}>{g.collapsed ? '⌄ Expand' : '⌃ Collapse'}</button>
              <button style={menuItem} onClick={async () => { setMenu(false); await crm.addItem(board.id, g.id, `New ${singular(board.item_label)}`, {}, true) }}>+ Add {singular(board.item_label)}</button>
              <div style={{ borderTop: `1px solid ${BRAND.rowBorder}`, margin: '4px 0' }} />
              <button style={{ ...menuItem, color: '#DF2F4A' }} onClick={() => { setMenu(false); if (confirm(`Delete the "${g.title}" group and its ${count} ${count === 1 ? 'item' : 'items'}? This can't be undone.`)) crm.deleteGroup(g.id) }}>🗑 Delete group</button>
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}
