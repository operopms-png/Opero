'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Popover, { menuItem } from '@/components/crm/Popover'
import { BRAND } from '@/lib/crm-board'
import { downloadCsv } from '@/lib/export-csv'
import { type MkBoard, type MkCol, optionsOf, money } from '@/lib/marketing-boards'
import MkCell, { Avatar, Pill, cellText } from './MkCell'
import type { BoardStore as Mk } from '@/lib/marketing-boards'

const NAME_W = 340
const ROW_H = 36
const tb: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', border: 'none', background: 'none', borderRadius: 4, fontSize: 13.5, color: BRAND.ink, cursor: 'pointer', fontFamily: 'inherit' }

function readLS(k: string) { try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null } }
function writeLS(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

type Tab = 'table' | 'kanban' | 'calendar'
const plural = (s: string, n: number) => n === 1 ? s : s + 's'

export default function MkBoardView({ mk, board, onOpen, headerRight }: { mk: Mk; board: MkBoard; onOpen: (id: string) => void; headerRight?: React.ReactNode }) {
  const rows = mk.rows[board.key]
  const [tab, setTab] = useState<Tab>(() => readLS(`mk-tab-${board.key}`) ?? 'table')
  const [hidden, setHidden] = useState<string[]>(() => readLS(`mk-hidden-${board.key}`) ?? [])
  const [groupBy, setGroupBy] = useState<string>(() => readLS(`mk-group-${board.key}`) ?? board.groupBy)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [person, setPerson] = useState<string | null>(null)
  const [filter, setFilter] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pop, setPop] = useState<null | 'person' | 'filter' | 'sort' | 'hide' | 'group' | 'move'>(null)
  const a = { person: useRef<HTMLButtonElement>(null), filter: useRef<HTMLButtonElement>(null), sort: useRef<HTMLButtonElement>(null), hide: useRef<HTMLButtonElement>(null), group: useRef<HTMLButtonElement>(null), move: useRef<HTMLButtonElement>(null) }

  useEffect(() => writeLS(`mk-tab-${board.key}`, tab), [tab, board.key])
  useEffect(() => writeLS(`mk-hidden-${board.key}`, hidden), [hidden, board.key])
  useEffect(() => writeLS(`mk-group-${board.key}`, groupBy), [groupBy, board.key])

  const cols = board.cols.filter(c => !hidden.includes(c.key) && !c.hideInTable)
  const filterCols = board.cols.filter(c => c.type === 'status' || c.type === 'module' || c.type === 'ref')
  const hasPerson = board.cols.some(c => c.type === 'person')
  const groupCol = board.cols.find(c => c.key === groupBy) ?? board.cols.find(c => c.key === board.groupBy)!

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows
    if (q) list = list.filter(r => String(r[board.nameField] ?? '').toLowerCase().includes(q) || board.cols.some(c => cellText(mk, board, c, r).toLowerCase().includes(q)))
    if (person) list = list.filter(r => r.owner === person)
    for (const [k, vals] of Object.entries(filter)) if (vals.length) list = list.filter(r => vals.includes(r[k] ?? '__empty'))
    if (sort) {
      const c = board.cols.find(x => x.key === sort.key)
      const val = (r: any) => sort.key === board.nameField ? String(r[sort.key] ?? '').toLowerCase()
        : c?.type === 'number' ? Number(r[sort.key] ?? -Infinity) : c?.type === 'date' || c?.type === 'datetime' ? (r[sort.key] ? new Date(r[sort.key]).getTime() : Infinity) : cellText(mk, board, c!, r).toLowerCase()
      list = [...list].sort((x, y) => { const p = val(x), q2 = val(y); const d = p < q2 ? -1 : p > q2 ? 1 : 0; return sort.dir === 'asc' ? d : -d })
    }
    return list
  }, [rows, search, person, filter, sort, board, mk])

  const groups = useMemo(() => {
    const opts = optionsOf(groupCol, mk.people, mk.refs)
    const out = opts.map(o => ({ id: o.value, title: o.label ?? o.value, color: o.color, items: visible.filter(r => r[groupCol.key] === o.value) }))
    const rest = visible.filter(r => !opts.some(o => o.value === r[groupCol.key]))
    if (rest.length) out.push({ id: '__none', title: groupCol.type === 'person' ? 'No owner' : groupCol.type === 'ref' ? `No ${groupCol.title.toLowerCase()}` : 'Other', color: '#C4C4C4', items: rest })
    return out.filter(g => g.items.length || groupCol.type !== 'person')
  }, [visible, groupCol, mk.people])

  const newItem = async (values: Record<string, any> = {}) => {
    const it = await mk.add(board.key, values)
    if (it) onOpen(it.id)
  }

  const exportCsv = () => {
    const out = visible.map(r => {
      const o: Record<string, string> = { [board.item[0].toUpperCase() + board.item.slice(1)]: String(r[board.nameField] ?? '') }
      for (const c of board.cols) if (c.type !== 'send') o[c.title] = cellText(mk, board, c, r)
      return o
    })
    if (!out.length) { alert('Nothing to export yet.'); return }
    downloadCsv(`marketing-${board.key}-${new Date().toISOString().slice(0, 10)}.csv`, out)
  }

  const activeFilters = (person ? 1 : 0) + Object.values(filter).filter(v => v.length).length
  const totalW = 6 + 36 + NAME_W + cols.reduce((s, c) => s + c.width, 0) + 20

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '16px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{board.title}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {headerRight}
            <button onClick={exportCsv} className="crm-tb" style={tb}>⇩ Export</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${BRAND.rowBorder}`, marginTop: 8 }}>
          {([['table', 'Main table'], ['kanban', 'Kanban'], ...(board.dateField ? [['calendar', 'Calendar']] : [])] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...tb, borderRadius: 0, height: 36, borderBottom: tab === k ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', fontWeight: tab === k ? 500 : 400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 0', flexWrap: 'wrap' }}>
          <button onClick={() => newItem()} style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 500, padding: '0 14px', marginRight: 8 }}>New {board.item}</button>
          {searchOpen || search
            ? <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onBlur={() => setSearchOpen(false)} placeholder="Search this board" style={{ height: 32, width: 200, border: `1px solid ${BRAND.goldDark}`, borderRadius: 4, padding: '0 10px', fontFamily: 'inherit', fontSize: 13.5 }} />
            : <button onClick={() => setSearchOpen(true)} className="crm-tb" style={tb}>⌕ Search</button>}
          {hasPerson && <button ref={a.person} onClick={() => setPop('person')} className="crm-tb" style={{ ...tb, background: person ? BRAND.selected : 'none' }}>◉ Person{person ? ' ·1' : ''}</button>}
          <button ref={a.filter} onClick={() => setPop('filter')} className="crm-tb" style={{ ...tb, background: Object.values(filter).some(v => v.length) ? BRAND.selected : 'none' }}>⏷ Filter{Object.values(filter).flat().length ? ` ·${Object.values(filter).flat().length}` : ''}</button>
          <button ref={a.sort} onClick={() => setPop('sort')} className="crm-tb" style={{ ...tb, background: sort ? BRAND.selected : 'none' }}>⇅ Sort{sort ? ` · ${sort.key === board.nameField ? 'Name' : board.cols.find(c => c.key === sort.key)?.title}` : ''}</button>
          <button ref={a.hide} onClick={() => setPop('hide')} className="crm-tb" style={{ ...tb, background: hidden.length ? BRAND.selected : 'none' }}>◌ Hide{hidden.length ? ` ·${hidden.length}` : ''}</button>
          <button ref={a.group} onClick={() => setPop('group')} className="crm-tb" style={tb}>▤ Group by: {groupCol.title}</button>
          {activeFilters > 0 && <button onClick={() => { setPerson(null); setFilter({}) }} style={{ ...tb, color: BRAND.goldDark }}>Clear filters</button>}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: BRAND.muted }}>{visible.length} {plural(board.item, visible.length)}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'table' && (
          <div style={{ padding: '4px 28px 40px', width: 'max-content', minWidth: '100%', boxSizing: 'border-box' }}>
            <div style={{ minWidth: totalW }}>
              {groups.map(g => {
                const isCol = collapsed.includes(g.id)
                const allSel = g.items.length > 0 && g.items.every(r => selected.has(r.id))
                return (
                  <div key={g.id} style={{ marginBottom: 34 }}>
                    <div style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, zIndex: 3, background: '#fff', paddingRight: 12 }}>
                      <button onClick={() => setCollapsed(isCol ? collapsed.filter(x => x !== g.id) : [...collapsed, g.id])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: g.color, fontSize: 14, transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', padding: 0, width: 18 }}>⌄</button>
                      <span style={{ fontSize: 18, fontWeight: 500, color: g.color === '#C4C4C4' ? '#9699A6' : g.color }}>{g.title}</span>
                      <span style={{ fontSize: 13, color: BRAND.muted }}>{g.items.length} {plural(board.item, g.items.length)}</span>
                    </div>
                    {!isCol && <>
                      <div style={{ display: 'flex', height: ROW_H, borderTop: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff' }}>
                        <div style={{ position: 'sticky', left: 0, zIndex: 3, display: 'flex', background: '#fff' }}>
                          <div style={{ width: 6, background: g.color, borderTopLeftRadius: 6 }} />
                          <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BRAND.rowBorder}` }}>
                            <input type="checkbox" checked={allSel} onChange={() => { const n = new Set(selected); g.items.forEach(r => allSel ? n.delete(r.id) : n.add(r.id)); setSelected(n) }} />
                          </div>
                          <HeadCell width={NAME_W} title={board.item[0].toUpperCase() + board.item.slice(1)} sortDir={sort?.key === board.nameField ? sort.dir : null} onSort={() => setSort(s => s?.key === board.nameField ? (s.dir === 'asc' ? { key: board.nameField, dir: 'desc' } : null) : { key: board.nameField, dir: 'asc' })} shadow />
                        </div>
                        {cols.map(c => <HeadCell key={c.key} width={c.width} title={c.title} sortDir={sort?.key === c.key ? sort.dir : null} onSort={c.type === 'send' ? undefined : () => setSort(s => s?.key === c.key ? (s.dir === 'asc' ? { key: c.key, dir: 'desc' } : null) : { key: c.key, dir: 'asc' })} />)}
                      </div>
                      {g.items.map(r => {
                        const sel = selected.has(r.id)
                        const replies = board.key === 'emails' ? (mk.replies[r.id]?.length ?? 0) : 0
                        return (
                          <div key={r.id} className="crm-row" style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}`, background: sel ? BRAND.selected : '#fff' }}>
                            <div className="crm-sticky" style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: sel ? BRAND.selected : '#fff' }}>
                              <div style={{ width: 6, background: g.color }} />
                              <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BRAND.rowBorder}` }}>
                                <input type="checkbox" checked={sel} onChange={() => { const n = new Set(selected); sel ? n.delete(r.id) : n.add(r.id); setSelected(n) }} />
                              </div>
                              <div style={{ width: NAME_W, display: 'flex', alignItems: 'center', borderRight: `1px solid ${BRAND.rowBorder}`, boxShadow: '2px 0 3px -2px rgba(0,0,0,0.08)' }}>
                                <NameCell mk={mk} board={board} row={r} />
                                <button className="crm-hover-show" onClick={() => onOpen(r.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted, fontSize: 12, padding: '0 6px', whiteSpace: 'nowrap' }}>⤢ Open</button>
                                <button onClick={() => onOpen(r.id)} title={board.key === 'emails' ? 'Replies' : 'Open'} style={{ width: 40, height: '100%', border: 'none', borderLeft: `1px solid ${BRAND.rowBorder}`, background: 'none', cursor: 'pointer', position: 'relative', color: replies ? BRAND.goldDark : '#C3C6D4', flexShrink: 0 }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />{!replies && <path d="M12 8v8M8 12h8" />}</svg>
                                  {replies > 0 && <span style={{ position: 'absolute', bottom: 5, right: 6, background: BRAND.goldDark, color: '#fff', borderRadius: 8, fontSize: 9, padding: '0 4px', lineHeight: '13px' }}>{replies}</span>}
                                </button>
                              </div>
                            </div>
                            {cols.map(c => (
                              <div key={c.key} style={{ width: c.width, flexShrink: 0, borderRight: `1px solid ${BRAND.rowBorder}`, height: '100%', boxSizing: 'border-box', padding: c.type === 'status' ? 1 : 0 }}>
                                <MkCell mk={mk} board={board} col={c} row={r} />
                              </div>
                            ))}
                          </div>
                        )
                      })}
                      <AddRow board={board} color={g.color} onAdd={name => mk.add(board.key, { ...(board.nameRef ? {} : { [board.nameField]: name }), ...(g.id !== '__none' ? { [groupCol.key]: g.id } : {}) }).then(r => { if (r && board.nameRef) onOpen(r.id); return r })} />
                      <Summary cols={cols} items={g.items} />
                    </>}
                  </div>
                )
              })}
              {rows.length === 0 && <div style={{ padding: '30px 0', color: BRAND.muted, fontSize: 14 }}>No {board.item}s yet — click <b>New {board.item}</b> to add the first one.</div>}
            </div>
          </div>
        )}
        {tab === 'kanban' && <Kanban mk={mk} board={board} groupCol={groupCol} items={visible} onOpen={onOpen} />}
        {tab === 'calendar' && board.dateField && <Calendar board={board} items={visible} onOpen={onOpen} colorCol={board.cols.find(c => c.key === 'status')!} onNew={d => newItem({ [board.dateField!]: board.cols.find(c => c.key === board.dateField)?.type === 'date' ? d : new Date(d + 'T09:00:00').toISOString() })} />}
      </div>

      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', zIndex: 800, overflow: 'hidden' }}>
          <div style={{ background: BRAND.goldDark, color: '#fff', fontSize: 22, fontWeight: 500, padding: '12px 18px' }}>{selected.size}</div>
          <div style={{ padding: '0 16px', fontSize: 14 }}>{plural(board.item[0].toUpperCase() + board.item.slice(1), selected.size)} selected</div>
          <button onClick={async () => { await mk.duplicate(board.key, [...selected]); setSelected(new Set()) }} className="crm-tb" style={tb}>⧉ Duplicate</button>
          <button ref={a.move} onClick={() => setPop('move')} className="crm-tb" style={tb}>→ Set {groupCol.title.toLowerCase()}</button>
          <button onClick={async () => { if (confirm(`Delete ${selected.size} ${plural(board.item, selected.size)}? This can't be undone.`)) { await mk.remove(board.key, [...selected]); setSelected(new Set()) } }} className="crm-tb" style={{ ...tb, color: '#DF2F4A' }}>🗑 Delete</button>
          <button onClick={() => setSelected(new Set())} style={{ ...tb, borderLeft: `1px solid ${BRAND.rowBorder}`, borderRadius: 0, height: 52, padding: '0 16px' }}>×</button>
        </div>
      )}

      {pop === 'person' && <Popover anchor={a.person.current} onClose={() => setPop(null)} width={260} align="left">
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quick person filter</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {mk.people.map(p => <button key={p} title={p} onClick={() => { setPerson(person === p ? null : p); setPop(null) }} style={{ border: person === p ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', borderRadius: '50%', padding: 0, background: 'none', cursor: 'pointer' }}><Avatar name={p} size={32} /></button>)}
          </div>
        </div>
      </Popover>}
      {pop === 'filter' && <Popover anchor={a.filter.current} onClose={() => setPop(null)} width={320} align="left">
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filterCols.map(c => {
            const cur = filter[c.key] ?? []
            return (
              <div key={c.key}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.muted, marginBottom: 4 }}>{c.title}</div>
                {[...optionsOf(c, mk.people, mk.refs), { value: '__empty', label: 'Blank', color: '#C4C4C4' }].map(o => (
                  <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 2px', fontSize: 13.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={cur.includes(o.value)} onChange={() => setFilter({ ...filter, [c.key]: cur.includes(o.value) ? cur.filter(x => x !== o.value) : [...cur, o.value] })} />
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: o.color }} />{o.label ?? o.value}
                    <span style={{ marginLeft: 'auto', color: BRAND.muted, fontSize: 12 }}>{rows.filter(r => (r[c.key] ?? '__empty') === o.value).length}</span>
                  </label>
                ))}
              </div>
            )
          })}
        </div>
      </Popover>}
      {pop === 'sort' && <Popover anchor={a.sort.current} onClose={() => setPop(null)} width={240} align="left">
        <div style={{ padding: 6 }}>
          {[{ key: board.nameField, title: 'Name' }, ...board.cols.filter(c => c.type !== 'send')].map(c => (
            <button key={c.key} style={{ ...menuItem, fontWeight: sort?.key === c.key ? 600 : 400 }} onClick={() => { setSort(sort?.key === c.key && sort.dir === 'asc' ? { key: c.key, dir: 'desc' } : { key: c.key, dir: 'asc' }); setPop(null) }}>
              {c.title}{sort?.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
          {sort && <button style={{ ...menuItem, color: BRAND.goldDark }} onClick={() => { setSort(null); setPop(null) }}>Clear sort</button>}
        </div>
      </Popover>}
      {pop === 'hide' && <Popover anchor={a.hide.current} onClose={() => setPop(null)} width={240} align="left">
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Display columns</div>
          {board.cols.filter(c => !c.hideInTable).map(c => <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', fontSize: 13.5, cursor: 'pointer' }}><input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => setHidden(hidden.includes(c.key) ? hidden.filter(x => x !== c.key) : [...hidden, c.key])} />{c.title}</label>)}
        </div>
      </Popover>}
      {pop === 'group' && <Popover anchor={a.group.current} onClose={() => setPop(null)} width={220} align="left">
        <div style={{ padding: 6 }}>
          {board.cols.filter(c => c.type === 'status' || c.type === 'module' || c.type === 'person' || c.type === 'ref').map(c => <button key={c.key} style={{ ...menuItem, fontWeight: groupBy === c.key ? 600 : 400 }} onClick={() => { setGroupBy(c.key); setCollapsed([]); setPop(null) }}>{c.title}{groupBy === c.key ? ' ✓' : ''}</button>)}
        </div>
      </Popover>}
      {pop === 'move' && <Popover anchor={a.move.current} onClose={() => setPop(null)} width={220}>
        <div style={{ padding: 6 }}>
          {optionsOf(groupCol, mk.people, mk.refs).map(o => <button key={o.value} style={menuItem} onClick={async () => {
            setPop(null)
            const ids = [...selected].filter(id => !groupCol.readonlyWhen?.(rows.find(r => r.id === id)))
            await Promise.all(ids.map(id => mk.update(board.key, id, { [groupCol.key]: o.value })))
            setSelected(new Set())
          }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: o.color }} />{o.label ?? o.value}</button>)}
        </div>
      </Popover>}
    </div>
  )
}

function HeadCell({ width, title, sortDir, onSort, shadow }: { width: number; title: string; sortDir: 'asc' | 'desc' | null; onSort?: () => void; shadow?: boolean }) {
  return (
    <div onClick={onSort} className="crm-colhead" style={{ width, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13.5, color: BRAND.ink, borderRight: `1px solid ${BRAND.rowBorder}`, cursor: onSort ? 'pointer' : 'default', boxShadow: shadow ? '2px 0 3px -2px rgba(0,0,0,0.08)' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', padding: '0 6px', boxSizing: 'border-box' }}>
      {title}{sortDir ? <span style={{ color: BRAND.goldDark }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : onSort ? <span className="crm-hover-show" style={{ color: BRAND.muted, fontSize: 11 }}>⇅</span> : null}
    </div>
  )
}

function NameCell({ mk, board, row }: { mk: Mk; board: MkBoard; row: any }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const name = String(row[board.nameField] ?? '')
  const locked = board.key === 'emails' && row.status === 'Sent'
  if (board.nameRef) {
    const col = board.cols.find(c => c.key === board.nameRef)!
    return <div style={{ flex: 1, height: '100%', paddingLeft: 8, minWidth: 0 }}><MkCell mk={mk} board={board} col={{ ...col, width: 400 }} row={row} /></div>
  }
  if (editing) {
    const save = () => { setEditing(false); const t = draft.trim(); if (t && t !== name) mk.update(board.key, row.id, { [board.nameField]: t }) }
    return <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      style={{ flex: 1, height: 28, margin: '0 6px 0 20px', border: `1px solid ${BRAND.goldDark}`, borderRadius: 3, padding: '0 6px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
  }
  return (
    <div onClick={() => { if (locked) return; setDraft(name); setEditing(true) }} title={name} style={{ flex: 1, paddingLeft: 20, fontSize: 13.5, color: BRAND.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: locked ? 'default' : 'text', height: '100%', display: 'flex', alignItems: 'center' }}>
      {name || <span style={{ color: '#9699A6' }}>Untitled</span>}
    </div>
  )
}

function AddRow({ board, color, onAdd }: { board: MkBoard; color: string; onAdd: (name: string) => Promise<any> }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => { const t = draft.trim(); if (!t || busy) return; setBusy(true); await onAdd(t); setDraft(''); setBusy(false) }
  if (board.nameRef) return (
    <div style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
      <div style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: '#fff' }}>
        <div style={{ width: 6, background: color, opacity: 0.5, borderBottomLeftRadius: 6 }} />
        <div style={{ width: 36, borderRight: `1px solid ${BRAND.rowBorder}` }} />
        <button disabled={busy} onClick={async () => { setBusy(true); await onAdd(''); setBusy(false) }} style={{ width: NAME_W, border: 'none', background: 'none', textAlign: 'left', paddingLeft: 22, color: BRAND.muted, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add {board.item}</button>
      </div>
    </div>
  )
  return (
    <div style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
      <div style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: '#fff' }}>
        <div style={{ width: 6, background: color, opacity: 0.5, borderBottomLeftRadius: 6 }} />
        <div style={{ width: 36, borderRight: `1px solid ${BRAND.rowBorder}` }} />
        <div style={{ width: NAME_W, display: 'flex', alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }} onBlur={submit} placeholder={`+ Add ${board.item}`}
            style={{ flex: 1, height: 28, margin: '0 10px 0 16px', border: '1px solid transparent', borderRadius: 3, padding: '0 6px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'transparent' }}
            onFocus={e => (e.target.style.borderColor = BRAND.goldDark)} />
        </div>
      </div>
    </div>
  )
}

function Summary({ cols, items }: { cols: MkCol[]; items: any[] }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', height: ROW_H + 4 }}>
      <div style={{ position: 'sticky', left: 0, zIndex: 2, width: 6 + 36 + NAME_W, background: '#fff' }} />
      {cols.map(c => {
        let content: React.ReactNode = null
        if (c.type === 'number' && items.length) {
          const vals = items.map(i => Number(i[c.key])).filter(n => !Number.isNaN(n) && n !== 0)
          const sum = vals.reduce((x, y) => x + y, 0)
          if (vals.length) content = <div style={{ textAlign: 'center', lineHeight: 1.1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.currency ? money(sum, c.currency) : sum.toLocaleString('en-GB')}</div><div style={{ fontSize: 10, color: BRAND.muted }}>sum</div></div>
        }
        if (c.type === 'status' && items.length) {
          const counts = (c.options ?? []).map(o => ({ o, n: items.filter(i => i[c.key] === o.value).length })).filter(x => x.n)
          const empty = items.length - counts.reduce((x, y) => x + y.n, 0)
          content = <div style={{ display: 'flex', width: '100%', height: 22, margin: '0 6px', overflow: 'hidden' }}>
            {counts.map(({ o, n }) => <div key={o.value} title={`${o.value}: ${n}`} style={{ flex: n, background: o.color }} />)}
            {empty > 0 && <div title={`Empty: ${empty}`} style={{ flex: empty, background: '#C4C4C4' }} />}
          </div>
        }
        return <div key={c.key} style={{ width: c.width, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff', boxSizing: 'border-box' }}>{content}</div>
      })}
    </div>
  )
}

function Kanban({ mk, board, groupCol, items, onOpen }: { mk: Mk; board: MkBoard; groupCol: MkCol; items: any[]; onOpen: (id: string) => void }) {
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const lanes = [...optionsOf(groupCol, mk.people, mk.refs), { value: '__none', label: 'Blank', color: '#C4C4C4' }]
  const inLane = (l: string) => items.filter(r => l === '__none' ? !lanes.some(x => x.value === r[groupCol.key]) : r[groupCol.key] === l)
  const shown = board.cols.filter(c => c.key !== groupCol.key && c.type !== 'send' && c.type !== 'longtext').slice(0, 4)
  return (
    <div style={{ display: 'flex', gap: 12, padding: '4px 28px 40px', alignItems: 'flex-start', overflowX: 'auto' }}>
      {lanes.filter(l => l.value !== '__none' || inLane('__none').length).map(l => {
        const list = inLane(l.value)
        return (
          <div key={l.value} onDragOver={e => { if (drag) { e.preventDefault(); setOver(l.value) } }} onDragLeave={() => setOver(null)}
            onDrop={e => { e.preventDefault(); const r = items.find(x => x.id === drag); setDrag(null); setOver(null); if (r && l.value !== '__none' && r[groupCol.key] !== l.value && !groupCol.readonlyWhen?.(r)) mk.update(board.key, r.id, { [groupCol.key]: l.value }) }}
            style={{ flex: '0 0 260px', background: over === l.value ? BRAND.selected : '#F6F7FB', borderRadius: 8, padding: 8, minHeight: 120 }}>
            <div style={{ background: l.color, color: '#fff', borderRadius: 6, padding: '8px 12px', fontWeight: 500, fontSize: 14, marginBottom: 8 }}>{l.label ?? l.value} / {list.length}</div>
            {list.map(r => (
              <div key={r.id} draggable onDragStart={() => setDrag(r.id)} onDragEnd={() => { setDrag(null); setOver(null) }} onClick={() => onOpen(r.id)}
                style={{ background: '#fff', borderRadius: 6, padding: '10px 12px', marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: 13.5 }}>
                <div style={{ fontWeight: 500, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{r[board.nameField] || 'Untitled'}</div>
                {shown.map(c => {
                  const t = cellText(mk, board, c, r)
                  if (!t) return null
                  if (c.type === 'person') return <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: BRAND.muted, marginTop: 4 }}><Avatar name={t} size={20} />{t}</div>
                  if (c.type === 'status') { const o = c.options?.find(x => x.value === t); return <div key={c.key} style={{ marginTop: 4, width: 'fit-content', borderRadius: 3, overflow: 'hidden' }}><Pill text={t} color={o?.color ?? '#757575'} height={22} /></div> }
                  return <div key={c.key} style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 4 }}><span style={{ color: '#9699A6' }}>{c.title}:</span> {t}</div>
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Calendar({ board, items, onOpen, colorCol, onNew }: { board: MkBoard; items: any[]; onOpen: (id: string) => void; colorCol: MkCol; onNew: (ymd: string) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const start = new Date(month); const dow = (start.getDay() + 6) % 7; start.setDate(start.getDate() - dow)
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  const today = ymd(new Date())
  const onDay = (key: string) => items.filter(r => {
    const s = r[board.dateField!]; if (!s) return false
    const from = ymd(new Date(String(s).length === 10 ? s + 'T00:00:00' : s))
    const e = board.endField ? r[board.endField] : null
    const to = e ? ymd(new Date(String(e).length === 10 ? e + 'T00:00:00' : e)) : from
    return key >= from && key <= to
  })
  const undated = items.filter(r => !r[board.dateField!])
  return (
    <div style={{ padding: '4px 28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>‹</button>
        <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>Today</button>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>›</button>
        <span style={{ fontSize: 17, fontWeight: 500, marginLeft: 6 }}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        {undated.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 12.5, color: BRAND.muted }}>{undated.length} without a date (see Main table)</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', borderLeft: `1px solid ${BRAND.rowBorder}`, borderTop: `1px solid ${BRAND.rowBorder}` }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: BRAND.brown, background: BRAND.selected, borderRight: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}` }}>{d}</div>)}
        {days.map(d => {
          const key = ymd(d); const list = onDay(key); const inMonth = d.getMonth() === month.getMonth()
          return (
            <div key={key} onDoubleClick={() => onNew(key)} title="Double-click to add" style={{ minHeight: 104, padding: 6, borderRight: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: inMonth ? '#fff' : '#FAFAFB' }}>
              <div style={{ fontSize: 12, fontWeight: key === today ? 700 : 400, color: key === today ? '#fff' : inMonth ? BRAND.ink : '#B0B3C0', background: key === today ? BRAND.goldDark : 'none', borderRadius: 10, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>{d.getDate()}</div>
              {list.slice(0, 4).map(r => {
                const o = colorCol.options?.find(x => x.value === r[colorCol.key])
                return <div key={r.id} onClick={() => onOpen(r.id)} title={String(r[board.nameField] ?? '')} style={{ background: o?.color ?? '#C4C4C4', color: '#fff', borderRadius: 3, padding: '2px 6px', fontSize: 11.5, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{r[board.nameField] || 'Untitled'}</div>
              })}
              {list.length > 4 && <div style={{ fontSize: 11, color: BRAND.muted }}>+{list.length - 4} more</div>}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 8 }}>Tip: double-click a day to add a {board.item} on that date.</div>
    </div>
  )
}
