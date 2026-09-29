'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Group } from '@/lib/crm-board'
import { BRAND, cellText, sortValue, labelsOf, singular } from '@/lib/crm-board'
import { downloadCsv } from '@/lib/export-csv'
import { useCrm } from '@/components/crm/useCrm'
import BoardTable, { type SortState } from '@/components/crm/BoardTable'
import Kanban from '@/components/crm/Kanban'
import Dashboard from '@/components/crm/Dashboard'
import ItemPanel from '@/components/crm/ItemPanel'
import Popover, { Modal, menuItem } from '@/components/crm/Popover'
import { Avatar } from '@/components/crm/Cell'

type View = { kind: 'home' } | { kind: 'dashboard' } | { kind: 'board'; id: string }

const KIND_ICON: Record<string, React.ReactNode> = {
  contacts: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.2c3 .2 5.5 2.3 5.5 5.3" /></svg>,
  properties: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></svg>,
  transactions: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5v11" /></svg>,
  custom: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10" /></svg>,
  dashboard: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 16v-3M12 16V8M17 16v-5" /></svg>,
  home: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>,
}

const tb: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', border: 'none', background: 'none', borderRadius: 4, fontSize: 13.5, color: BRAND.ink, cursor: 'pointer', fontFamily: 'inherit' }

function readLS(k: string) { try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null } }
function writeLS(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

export default function CrmPage() {
  const crm = useCrm()
  const [view, setViewState] = useState<View>({ kind: 'home' })
  const [panelOpen, setPanelOpen] = useState(true)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [newBoard, setNewBoard] = useState(false)

  // restore view from the URL (?board=…, ?view=dashboard)
  useEffect(() => {
    if (crm.loading) return
    const sp = new URLSearchParams(window.location.search)
    const b = sp.get('board')
    if (b && crm.boards.some(x => x.id === b)) setViewState({ kind: 'board', id: b })
    else if (sp.get('view') === 'dashboard') setViewState({ kind: 'dashboard' })
    const it = sp.get('item'); if (it) setOpenItem(it)
  }, [crm.loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const setView = (v: View) => {
    setViewState(v)
    const url = v.kind === 'board' ? `?board=${v.id}` : v.kind === 'dashboard' ? '?view=dashboard' : window.location.pathname
    window.history.replaceState(null, '', url)
  }

  if (crm.loading) return <Shell><div style={{ padding: 60, color: BRAND.muted, textAlign: 'center', width: '100%' }}>Loading CRM…</div></Shell>
  if (crm.error) return <Shell><div style={{ padding: 60, color: '#DF2F4A', width: '100%' }}>Couldn’t load the CRM: {crm.error}</div></Shell>

  const board = view.kind === 'board' ? crm.boards.find(b => b.id === view.id) : undefined

  return (
    <Shell>
      {/* workspace panel */}
      {panelOpen ? (
        <aside style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${BRAND.rowBorder}`, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 10px' }}>
            <span style={{ fontSize: 13, color: BRAND.muted }}>Workspace</span>
            <button onClick={() => setPanelOpen(false)} title="Collapse" style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted }}>«</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 34, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontSize: 13.5 }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: BRAND.gold, color: BRAND.brown, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
              Sangsters CRM
            </div>
            <button onClick={() => setNewBoard(true)} title="Add board" style={{ width: 34, height: 34, border: `1px solid ${BRAND.border}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 18, color: BRAND.ink }}>+</button>
          </div>
          <NavItem icon={KIND_ICON.home} label="Workspace home" active={view.kind === 'home'} onClick={() => setView({ kind: 'home' })} />
          {crm.boards.map(b => <NavItem key={b.id} icon={KIND_ICON[b.kind] ?? KIND_ICON.custom} label={b.name} active={view.kind === 'board' && view.id === b.id} onClick={() => setView({ kind: 'board', id: b.id })} />)}
          <NavItem icon={KIND_ICON.dashboard} label="Property portfolio dashboard" active={view.kind === 'dashboard'} onClick={() => setView({ kind: 'dashboard' })} />
        </aside>
      ) : (
        <button onClick={() => setPanelOpen(true)} title="Show workspace" style={{ width: 28, flexShrink: 0, border: 'none', borderRight: `1px solid ${BRAND.rowBorder}`, background: '#fff', cursor: 'pointer', color: BRAND.muted }}>»</button>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {view.kind === 'home' && <Home crm={crm} onOpen={id => setView({ kind: 'board', id })} onDashboard={() => setView({ kind: 'dashboard' })} onNew={() => setNewBoard(true)} />}
        {view.kind === 'dashboard' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px 40px', background: '#F6F7FB' }}>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 14px', color: BRAND.ink }}>Property portfolio dashboard</h1>
            <Dashboard crm={crm} onOpenItem={setOpenItem} onOpenBoard={id => setView({ kind: 'board', id })} />
          </div>
        )}
        {view.kind === 'board' && board && <BoardView key={board.id} crm={crm} board={board} onOpenItem={setOpenItem} onDeleted={() => setView({ kind: 'home' })} />}
        {view.kind === 'board' && !board && <div style={{ padding: 40, color: BRAND.muted }}>That board no longer exists.</div>}
      </main>

      {openItem && crm.itemsById.get(openItem) && <ItemPanel crm={crm} itemId={openItem} onClose={() => setOpenItem(null)} />}
      {newBoard && <NewBoardModal crm={crm} onClose={() => setNewBoard(false)} onCreated={b => { setNewBoard(false); setView({ kind: 'board', id: b.id }) }} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-clear { opacity: 0 } .crm-row:hover .crm-clear { opacity: 1 }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
        @media (max-width: 900px) { .crm-dash-row { grid-template-columns: 1fr !important } }
      `}</style>
      {children}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="crm-nav" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: active ? `1px solid ${BRAND.goldDark}` : '1px solid transparent', borderRadius: 4, background: active ? BRAND.selected : 'none', color: BRAND.ink, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
      <span style={{ color: BRAND.muted, display: 'flex' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

function Home({ crm, onOpen, onDashboard, onNew }: { crm: ReturnType<typeof useCrm>; onOpen: (id: string) => void; onDashboard: () => void; onNew: () => void }) {
  const lastMod = (b: Board) => {
    const t = crm.items.filter(i => i.board_id === b.id).reduce((a, i) => Math.max(a, new Date(i.updated_at).getTime()), new Date(b.created_at).getTime())
    return new Date(t)
  }
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ height: 130, background: `linear-gradient(135deg, ${BRAND.selected}, #F3E6C8)` }} />
      <div style={{ padding: '0 40px 40px', marginTop: -44 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ width: 88, height: 88, borderRadius: 10, background: '#fff', border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <img src="/logo.PNG" alt="Sangsters" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ paddingBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Sangsters CRM</h1>
            <div style={{ fontSize: 13.5, color: BRAND.muted }}>Contacts, properties, tasks and deals in one place</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '26px 0 12px' }}>
          <button onClick={onNew} style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 600, padding: '0 14px' }}>+ New board</button>
          <button onClick={onDashboard} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>{KIND_ICON.dashboard} Open dashboard</button>
        </div>
        <div style={{ border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead><tr style={{ background: '#fff', color: BRAND.muted, textAlign: 'left' }}>{['Board', 'Items', 'Groups', 'Columns', 'Created', 'Last modified'].map(h => <th key={h} style={{ padding: '10px 16px', fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {crm.boards.map(b => (
                <tr key={b.id} onClick={() => onOpen(b.id)} className="crm-nav" style={{ cursor: 'pointer' }}>
                  <td style={cellTd}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: BRAND.muted, display: 'flex' }}>{KIND_ICON[b.kind] ?? KIND_ICON.custom}</span>{b.name}</span></td>
                  <td style={cellTd}>{crm.items.filter(i => i.board_id === b.id).length}</td>
                  <td style={cellTd}>{crm.groups.filter(g => g.board_id === b.id).length}</td>
                  <td style={cellTd}>{crm.columns.filter(c => c.board_id === b.id).length}</td>
                  <td style={cellTd}>{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={cellTd}>{lastMod(b).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
              <tr onClick={onDashboard} className="crm-nav" style={{ cursor: 'pointer' }}>
                <td style={cellTd}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: BRAND.muted, display: 'flex' }}>{KIND_ICON.dashboard}</span>Property portfolio dashboard</span></td>
                <td style={cellTd} colSpan={5}><span style={{ color: BRAND.muted }}>{crm.boards.length} connected boards</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
const cellTd: React.CSSProperties = { padding: '11px 16px', borderBottom: `1px solid ${BRAND.rowBorder}` }

function NewBoardModal({ crm, onClose, onCreated }: { crm: ReturnType<typeof useCrm>; onClose: () => void; onCreated: (b: Board) => void }) {
  const [name, setName] = useState('New board')
  const [label, setLabel] = useState('item')
  const [copy, setCopy] = useState('')
  const [busy, setBusy] = useState(false)
  const f: React.CSSProperties = { width: '100%', height: 36, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  return (
    <Modal onClose={onClose}>
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 500 }}>Create board</h2>
        <label style={{ fontSize: 13, color: BRAND.muted }}>Board name</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} style={{ ...f, margin: '4px 0 14px' }} />
        <label style={{ fontSize: 13, color: BRAND.muted }}>What does each row represent? (e.g. item, lead, viewing, landlord)</label>
        <input value={label} onChange={e => setLabel(e.target.value)} style={{ ...f, margin: '4px 0 14px' }} />
        <label style={{ fontSize: 13, color: BRAND.muted }}>Start from</label>
        <select value={copy} onChange={e => setCopy(e.target.value)} style={{ ...f, margin: '4px 0 6px' }}>
          <option value="">Blank board (Owner, Status, Date, Notes)</option>
          {crm.boards.map(b => <option key={b.id} value={b.id}>Copy columns from {b.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} style={{ ...tb, border: `1px solid ${BRAND.border}` }}>Cancel</button>
          <button disabled={busy || !name.trim()} onClick={async () => { setBusy(true); const b = await crm.addBoard(name.trim(), copy || undefined); if (b) { if (label.trim() && label.trim() !== b.item_label) await crm.updateBoard(b.id, { item_label: label.trim() }); onCreated({ ...b, item_label: label.trim() || b.item_label }) } setBusy(false) }}
            style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 600, padding: '0 16px', opacity: busy ? 0.6 : 1 }}>{busy ? 'Creating…' : 'Create board'}</button>
        </div>
      </div>
    </Modal>
  )
}

function BoardView({ crm, board, onOpenItem, onDeleted }: { crm: ReturnType<typeof useCrm>; board: Board; onOpenItem: (id: string) => void; onDeleted: () => void }) {
  const [tab, setTab] = useState<'table' | 'kanban'>(() => readLS(`crm-tab-${board.id}`) ?? 'table')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [person, setPerson] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<{ colId: string; ids: string[] } | null>(null)
  const [sort, setSort] = useState<SortState>(null)
  const [hidden, setHidden] = useState<string[]>(() => readLS(`crm-hidden-${board.id}`) ?? [])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pop, setPop] = useState<null | 'new' | 'person' | 'filter' | 'hide' | 'board' | 'move'>(null)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(board.name)
  const anchors = { new: useRef<HTMLButtonElement>(null), person: useRef<HTMLButtonElement>(null), filter: useRef<HTMLButtonElement>(null), hide: useRef<HTMLButtonElement>(null), board: useRef<HTMLButtonElement>(null), move: useRef<HTMLButtonElement>(null) }

  useEffect(() => writeLS(`crm-tab-${board.id}`, tab), [tab, board.id])
  useEffect(() => writeLS(`crm-hidden-${board.id}`, hidden), [hidden, board.id])

  const allCols = crm.columns.filter(c => c.board_id === board.id).sort((a, b) => a.position - b.position)
  const cols = allCols.filter(c => !hidden.includes(c.id))
  const groups = crm.groups.filter(g => g.board_id === board.id).sort((a, b) => a.position - b.position)
  const personCols = allCols.filter(c => c.type === 'person')
  const statusCols = allCols.filter(c => c.type === 'status')

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = crm.items.filter(i => i.board_id === board.id)
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q) || allCols.some(c => cellText(c, i, crm.itemsById).toLowerCase().includes(q)))
    if (person) list = list.filter(i => personCols.some(c => (i.values?.[c.id] ?? []).some((p: any) => p.id === person)))
    if (statusFilter?.ids.length) list = list.filter(i => statusFilter.ids.includes(i.values?.[statusFilter.colId] ?? '__empty'))
    const sc = sort ? allCols.find(c => c.id === sort.colId) : null
    if (sc && sort) list = [...list].sort((a, b) => { const x = sortValue(sc, a, crm.itemsById), y = sortValue(sc, b, crm.itemsById); const r = x < y ? -1 : x > y ? 1 : 0; return sort.dir === 'asc' ? r : -r })
    else list = [...list].sort((a, b) => a.position - b.position)
    return list
  }, [crm.items, crm.itemsById, board.id, search, person, statusFilter, sort, allCols, personCols])

  const itemsFor = (g: Group) => visible.filter(i => i.group_id === g.id)
  const ungrouped = visible.filter(i => !i.group_id || !groups.some(g => g.id === i.group_id))

  const newItem = async () => {
    const g = groups[0] ?? await crm.addGroup(board.id, 'Group title')
    if (g) { const it = await crm.addItem(board.id, g.id, `New ${singular(board.item_label)}`, {}, true); if (it) onOpenItem(it.id) }
  }

  const exportCsv = () => {
    const rows = visible.map(i => {
      const r: Record<string, string> = { [board.item_label]: i.name, Group: crm.groups.find(g => g.id === i.group_id)?.title ?? '' }
      for (const c of allCols) r[c.title] = cellText(c, i, crm.itemsById)
      return r
    })
    downloadCsv(`${board.name.toLowerCase().replace(/\s+/g, '-')}.csv`, rows)
  }

  const activeFilters = (person ? 1 : 0) + (statusFilter?.ids.length ? 1 : 0)
  const ItemPlural = board.item_label.charAt(0).toUpperCase() + board.item_label.slice(1)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* header */}
      <div style={{ padding: '16px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {renaming
            ? <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={() => { setRenaming(false); if (title.trim() && title !== board.name) crm.updateBoard(board.id, { name: title.trim() }) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                style={{ fontSize: 24, fontWeight: 500, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit' }} />
            : <h1 onClick={() => { setTitle(board.name); setRenaming(true) }} style={{ margin: 0, fontSize: 24, fontWeight: 500, cursor: 'text' }}>{board.name}</h1>}
          <button ref={anchors.board} onClick={() => setPop('board')} style={{ ...tb, padding: '0 6px' }}>⌄</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={exportCsv} className="crm-tb" style={tb}>⇩ Export</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${BRAND.rowBorder}`, marginTop: 8 }}>
          {([['table', 'Main table'], ['kanban', 'Kanban']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...tb, borderRadius: 0, height: 36, borderBottom: tab === k ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', fontWeight: tab === k ? 500 : 400 }}>{l}</button>
          ))}
        </div>
        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 0', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', borderRadius: 4, overflow: 'hidden', marginRight: 8 }}>
            <button onClick={newItem} style={{ ...tb, borderRadius: 0, background: BRAND.goldDark, color: '#fff', fontWeight: 500, padding: '0 12px' }}>New {singular(board.item_label)}</button>
            <button ref={anchors.new} onClick={() => setPop('new')} style={{ ...tb, borderRadius: 0, background: BRAND.goldDark, color: '#fff', padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.35)' }}>⌄</button>
          </div>
          {searchOpen || search
            ? <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onBlur={() => setSearchOpen(false)} placeholder="Search this board" style={{ height: 32, width: 200, border: `1px solid ${BRAND.goldDark}`, borderRadius: 4, padding: '0 10px', fontFamily: 'inherit', fontSize: 13.5 }} />
            : <button onClick={() => setSearchOpen(true)} className="crm-tb" style={tb}>⌕ Search</button>}
          {personCols.length > 0 && <button ref={anchors.person} onClick={() => setPop('person')} className="crm-tb" style={{ ...tb, background: person ? BRAND.selected : 'none' }}>◉ Person{person ? ' ·1' : ''}</button>}
          <button ref={anchors.filter} onClick={() => setPop('filter')} className="crm-tb" style={{ ...tb, background: statusFilter?.ids.length ? BRAND.selected : 'none' }}>⏷ Filter{statusFilter?.ids.length ? ` ·${statusFilter.ids.length}` : ''}</button>
          <button className="crm-tb" onClick={() => setSort(null)} style={{ ...tb, background: sort ? BRAND.selected : 'none' }} title={sort ? 'Clear sort' : 'Sort from any column header'}>⇅ Sort{sort ? ` · ${allCols.find(c => c.id === sort.colId)?.title} ×` : ''}</button>
          <button ref={anchors.hide} onClick={() => setPop('hide')} className="crm-tb" style={{ ...tb, background: hidden.length ? BRAND.selected : 'none' }}>◌ Hide{hidden.length ? ` ·${hidden.length}` : ''}</button>
          {activeFilters > 0 && <button onClick={() => { setPerson(null); setStatusFilter(null) }} style={{ ...tb, color: BRAND.goldDark }}>Clear filters</button>}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: BRAND.muted }}>{visible.length} {visible.length === 1 ? singular(board.item_label) : 'items'}</span>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0 0' }}>
        {tab === 'table'
          ? <div style={{ paddingLeft: 28, paddingRight: 28, width: 'max-content', minWidth: '100%', boxSizing: 'border-box' }}>
              <BoardTable crm={crm} board={board} cols={cols} groups={groups} itemsFor={itemsFor} selected={selected} setSelected={setSelected} onOpenItem={onOpenItem} sort={sort} setSort={setSort} />
              {ungrouped.length > 0 && <div style={{ fontSize: 13, color: BRAND.muted, padding: '0 0 30px' }}>{ungrouped.length} item(s) have no group — <button onClick={() => groups[0] && crm.moveItems(ungrouped.map(i => i.id), groups[0].id)} style={{ border: 'none', background: 'none', color: BRAND.goldDark, cursor: 'pointer', fontFamily: 'inherit' }}>move them to {groups[0]?.title}</button></div>}
            </div>
          : <div style={{ padding: '0 28px' }}><Kanban crm={crm} board={board} cols={allCols} items={visible} onOpenItem={onOpenItem} /></div>}
      </div>

      {/* bulk actions */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', zIndex: 800, overflow: 'hidden' }}>
          <div style={{ background: BRAND.goldDark, color: '#fff', fontSize: 22, fontWeight: 500, padding: '12px 18px' }}>{selected.size}</div>
          <div style={{ padding: '0 16px', fontSize: 14 }}>{ItemPlural}{selected.size === 1 ? '' : 's'} selected</div>
          <button onClick={async () => { await crm.duplicateItems([...selected]); setSelected(new Set()) }} className="crm-tb" style={tb}>⧉ Duplicate</button>
          <button ref={anchors.move} onClick={() => setPop('move')} className="crm-tb" style={tb}>→ Move to</button>
          <button onClick={async () => { if (confirm(`Delete ${selected.size} ${selected.size === 1 ? 'item' : 'items'}? Linked contacts/deals elsewhere in the portal are removed too.`)) { await crm.deleteItems([...selected]); setSelected(new Set()) } }} className="crm-tb" style={{ ...tb, color: '#DF2F4A' }}>🗑 Delete</button>
          <button onClick={() => setSelected(new Set())} style={{ ...tb, borderLeft: `1px solid ${BRAND.rowBorder}`, borderRadius: 0, height: 52, padding: '0 16px' }}>×</button>
        </div>
      )}

      {/* popovers */}
      {pop === 'new' && <Popover anchor={anchors.new.current} onClose={() => setPop(null)} width={200} align="left">
        <div style={{ padding: 6 }}>
          <button style={menuItem} onClick={() => { setPop(null); newItem() }}>+ New {singular(board.item_label)}</button>
          <button style={menuItem} onClick={() => { setPop(null); crm.addGroup(board.id) }}>+ New group of {singular(board.item_label)}s</button>
        </div>
      </Popover>}
      {pop === 'person' && <Popover anchor={anchors.person.current} onClose={() => setPop(null)} width={260} align="left">
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quick person filter</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {crm.people.map(p => <button key={p.id} title={p.name} onClick={() => { setPerson(person === p.id ? null : p.id); setPop(null) }} style={{ border: person === p.id ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', borderRadius: '50%', padding: 0, background: 'none', cursor: 'pointer' }}><Avatar p={p} size={32} /></button>)}
          </div>
        </div>
      </Popover>}
      {pop === 'filter' && <Popover anchor={anchors.filter.current} onClose={() => setPop(null)} width={300} align="left">
        <div style={{ padding: 12 }}>
          {!statusCols.length ? <div style={{ fontSize: 13, color: BRAND.muted }}>Add a Status column to filter by it.</div> : <>
            <select value={statusFilter?.colId ?? statusCols[0].id} onChange={e => setStatusFilter({ colId: e.target.value, ids: [] })} style={{ width: '100%', height: 32, border: `1px solid ${BRAND.border}`, borderRadius: 4, marginBottom: 8, fontFamily: 'inherit' }}>
              {statusCols.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            {(() => {
              const col = statusCols.find(c => c.id === (statusFilter?.colId ?? statusCols[0].id))!
              const ids = statusFilter?.colId === col.id ? statusFilter.ids : []
              const toggle = (id: string) => setStatusFilter({ colId: col.id, ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
              return [...labelsOf(col), { id: '__empty', label: 'Blank', color: '#C4C4C4' }].map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ids.includes(l.id)} onChange={() => toggle(l.id)} />
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />{l.label}
                  <span style={{ marginLeft: 'auto', color: BRAND.muted, fontSize: 12 }}>{crm.items.filter(i => i.board_id === board.id && (i.values?.[col.id] ?? '__empty') === l.id).length}</span>
                </label>
              ))
            })()}
          </>}
        </div>
      </Popover>}
      {pop === 'hide' && <Popover anchor={anchors.hide.current} onClose={() => setPop(null)} width={260} align="left">
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Display columns</div>
          {allCols.map(c => <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', fontSize: 13.5, cursor: 'pointer' }}><input type="checkbox" checked={!hidden.includes(c.id)} onChange={() => setHidden(hidden.includes(c.id) ? hidden.filter(x => x !== c.id) : [...hidden, c.id])} />{c.title}</label>)}
        </div>
      </Popover>}
      {pop === 'move' && <Popover anchor={anchors.move.current} onClose={() => setPop(null)} width={220}>
        <div style={{ padding: 6 }}>
          {groups.map(g => <button key={g.id} style={menuItem} onClick={async () => { setPop(null); await crm.moveItems([...selected], g.id); setSelected(new Set()) }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }} />{g.title}</button>)}
        </div>
      </Popover>}
      {pop === 'board' && <Popover anchor={anchors.board.current} onClose={() => setPop(null)} width={260} align="left">
        <BoardMenu crm={crm} board={board} onClose={() => setPop(null)} onRename={() => { setPop(null); setTitle(board.name); setRenaming(true) }} onDeleted={onDeleted} />
      </Popover>}
    </div>
  )
}

function BoardMenu({ crm, board, onClose, onRename, onDeleted }: { crm: ReturnType<typeof useCrm>; board: Board; onClose: () => void; onRename: () => void; onDeleted: () => void }) {
  const [label, setLabel] = useState(board.item_label)
  const system = board.kind !== 'custom'
  return (
    <div style={{ padding: 8 }}>
      <button style={menuItem} onClick={onRename}>✎ Rename board</button>
      <div style={{ padding: '6px 12px' }}>
        <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 4 }}>Each row is a…</div>
        <input value={label} onChange={e => setLabel(e.target.value)} onBlur={() => { if (label.trim() && label !== board.item_label) crm.updateBoard(board.id, { item_label: label.trim() }) }}
          style={{ width: '100%', height: 30, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ borderTop: `1px solid ${BRAND.rowBorder}`, margin: '6px 0' }} />
      {system
        ? <div style={{ fontSize: 12, color: BRAND.muted, padding: '4px 12px 6px' }}>This is a core board (it feeds the dashboard and website enquiries), so it can’t be deleted — but you can rename it and change all of its columns.</div>
        : <button style={{ ...menuItem, color: '#DF2F4A' }} onClick={async () => { onClose(); if (confirm(`Delete the "${board.name}" board and everything on it? This can't be undone.`)) { await crm.deleteBoard(board.id); onDeleted() } }}>🗑 Delete board</button>}
    </div>
  )
}

