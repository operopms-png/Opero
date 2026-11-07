'use client'
// Platform Owner → Notes: private notes in the look of the iPhone Notes app. List with Pinned / Today /
// Previous 7 Days / Previous 30 Days / Older, folders (collapsible list with counts, new, rename, delete, move a note),
// search, the first line is the title, checklists, pin, delete, and everything saves by itself. Owner login only (notes live in platform_notes, one set per owner login).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ownerFetch } from '../../../../lib/platform-fetch'

type Note = { id: string; body: string; pinned: boolean; folder_id: string | null; created_at: string; updated_at: string }
type Folder = { id: string; name: string }
const YEL = '#E0A100'
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Inter, Arial, sans-serif"

const titleOf = (b: string) => (b.split('\n').find(l => l.trim()) ?? '').replace(/^[☐☑]\s?/, '').trim() || 'New Note'
const previewOf = (b: string) => {
  const lines = b.split('\n').map(l => l.trim()).filter(Boolean)
  return (lines[1] ?? '').replace(/^[☐☑]\s?/, '') || 'No additional text'
}
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
function shortDate(iso: string) {
  const d = new Date(iso), now = new Date(), y = new Date(now.getTime() - 864e5)
  if (sameDay(d, now)) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (sameDay(d, y)) return 'Yesterday'
  if (now.getTime() - d.getTime() < 7 * 864e5) return d.toLocaleDateString('en-GB', { weekday: 'long' })
  return d.toLocaleDateString('en-GB')
}
const longDate = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

function groupNotes(notes: Note[]) {
  const now = Date.now()
  const g: { title: string; items: Note[] }[] = [{ title: 'Pinned', items: [] }, { title: 'Today', items: [] }, { title: 'Yesterday', items: [] }, { title: 'Previous 7 Days', items: [] }, { title: 'Previous 30 Days', items: [] }, { title: 'Older', items: [] }]
  for (const n of notes) {
    const d = new Date(n.updated_at), age = now - d.getTime()
    const k = n.pinned ? 0 : sameDay(d, new Date()) ? 1 : sameDay(d, new Date(now - 864e5)) ? 2 : age < 7 * 864e5 ? 3 : age < 30 * 864e5 ? 4 : 5
    g[k].items.push(n)
  }
  return g.filter(x => x.items.length)
}

const Icon = ({ d, size = 22, color = YEL, fill = 'none' }: { d: string; size?: number; color?: string; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const I = {
  compose: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  pin: 'M12 17v5M9 3h6l-1 6 3 4H7l3-4z',
  check: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h9',
  back: 'M15 18l-6-6 6-6',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  folderPlus: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 10v6M9 13h6',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [view, setView] = useState<string | null>(null)          // null = all notes, otherwise a folder id
  const [foldersOpen, setFoldersOpen] = useState(true)
  const [folderForm, setFolderForm] = useState<{ mode: 'new' | 'rename'; name: string } | null>(null)
  const [folderMenu, setFolderMenu] = useState(false)
  const [confirmFolderDel, setConfirmFolderDel] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [mobileEditor, setMobileEditor] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [err, setErr] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ownerFetch('/api/platform/notes').then(r => {
      if (!r.ok) { setErr(r.data?.error || 'Could not load notes'); return }
      setNotes(r.data.notes); setFolders(r.data.folders ?? []); setSel(r.data.notes[0]?.id ?? null)
    })
  }, [])

  const sorted = useMemo(() => (notes ?? []).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updated_at) - +new Date(a.updated_at)), [notes])
  const inView = useMemo(() => view ? sorted.filter(n => n.folder_id === view) : sorted, [sorted, view])
  const shown = useMemo(() => q ? inView.filter(n => n.body.toLowerCase().includes(q.toLowerCase())) : inView, [inView, q])
  const curFolder = folders.find(f => f.id === view) ?? null
  const cur = notes?.find(n => n.id === sel) ?? null

  const create = useCallback(async () => {
    const r = await ownerFetch('/api/platform/notes', { method: 'POST', body: JSON.stringify({ body: '', folder_id: view }) })
    if (!r.ok) { setErr(r.data?.error || 'Could not create a note'); return }
    setNotes(p => [r.data.note, ...(p ?? [])]); setSel(r.data.note.id); setMobileEditor(true); setQ('')
    setTimeout(() => area.current?.focus(), 50)
  }, [])

  function edit(id: string, body: string) {
    setNotes(p => (p ?? []).map(n => n.id === id ? { ...n, body, updated_at: new Date().toISOString() } : n))
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => { ownerFetch('/api/platform/notes', { method: 'PATCH', body: JSON.stringify({ id, body }) }).then(r => { if (!r.ok) setErr(r.data?.error || 'Could not save') }) }, 600)
  }
  async function saveFolder() {
    const name = folderForm?.name.trim()
    if (!folderForm || !name) return
    if (folderForm.mode === 'new') {
      const r = await ownerFetch('/api/platform/note-folders', { method: 'POST', body: JSON.stringify({ name }) })
      if (!r.ok) { setErr(r.data?.error || 'Could not create the folder'); return }
      setFolders(p => [...p, r.data.folder].sort((a, b) => a.name.localeCompare(b.name))); setFoldersOpen(true)
    } else if (curFolder) {
      const r = await ownerFetch('/api/platform/note-folders', { method: 'PATCH', body: JSON.stringify({ id: curFolder.id, name }) })
      if (!r.ok) { setErr(r.data?.error || 'Could not rename the folder'); return }
      setFolders(p => p.map(f => f.id === curFolder.id ? r.data.folder : f).sort((a, b) => a.name.localeCompare(b.name)))
    }
    setFolderForm(null); setFolderMenu(false)
  }
  async function deleteFolder() {
    if (!curFolder) return
    const id = curFolder.id
    setFolders(p => p.filter(f => f.id !== id))
    setNotes(p => (p ?? []).map(n => n.folder_id === id ? { ...n, folder_id: null } : n))
    setView(null); setConfirmFolderDel(false); setFolderMenu(false)
    await ownerFetch('/api/platform/note-folders?id=' + id, { method: 'DELETE' })
  }
  async function moveNote(n: Note, folder_id: string | null) {
    setNotes(p => (p ?? []).map(x => x.id === n.id ? { ...x, folder_id } : x)); setMoveOpen(false)
    await ownerFetch('/api/platform/notes', { method: 'PATCH', body: JSON.stringify({ id: n.id, folder_id }) })
  }
  async function togglePin(n: Note) {
    setNotes(p => (p ?? []).map(x => x.id === n.id ? { ...x, pinned: !x.pinned } : x))
    await ownerFetch('/api/platform/notes', { method: 'PATCH', body: JSON.stringify({ id: n.id, pinned: !n.pinned }) })
  }
  async function remove(n: Note) {
    clearTimeout(timers.current[n.id])
    const rest = (notes ?? []).filter(x => x.id !== n.id)
    setNotes(rest); setSel(rest[0]?.id ?? null); setConfirmDel(false); setMobileEditor(false)
    await ownerFetch('/api/platform/notes?id=' + n.id, { method: 'DELETE' })
  }
  // Checklist button: the line the cursor is on goes ☐ → ☑ → plain → ☐
  function checklist() {
    const el = area.current; if (!el || !cur) return
    const pos = el.selectionStart, text = cur.body
    const start = text.lastIndexOf('\n', pos - 1) + 1
    let end = text.indexOf('\n', pos); if (end < 0) end = text.length
    const line = text.slice(start, end)
    const next = line.startsWith('☐ ') ? '☑ ' + line.slice(2) : line.startsWith('☑ ') ? line.slice(2) : '☐ ' + line
    edit(cur.id, text.slice(0, start) + next + text.slice(end))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + next.length, start + next.length) }, 0)
  }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || !cur) return
    const el = e.currentTarget, pos = el.selectionStart, text = cur.body
    const start = text.lastIndexOf('\n', pos - 1) + 1
    const line = text.slice(start, pos)
    const m = line.match(/^([☐☑]) /)
    if (!m) return
    e.preventDefault()
    if (line.trim().length <= 1) { edit(cur.id, text.slice(0, start) + text.slice(pos)); return } // empty item: end the list
    const ins = '\n☐ '
    edit(cur.id, text.slice(0, pos) + ins + text.slice(pos))
    setTimeout(() => el.setSelectionRange(pos + ins.length, pos + ins.length), 0)
  }

  if (err && !notes) return <div style={{ padding: 40, fontFamily: FONT, color: '#667085' }}>{err}</div>
  if (!notes) return <div style={{ padding: 60, textAlign: 'center', color: '#98A2B3', fontFamily: FONT }}>Loading…</div>

  return (
    <div className="nvn" style={{ display: 'flex', height: 'calc(100vh - var(--hub-h, 0px))', background: '#fff', fontFamily: FONT, color: '#000' }}>
      <style>{`
        .nvn .row:hover{background:#F2F2F7}
        .nvn .btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
        .nvn .btn:hover{background:#F2F2F7}
        .nvn textarea{outline:none}
        @media(max-width:768px){
          .nvn .list{width:100%!important;display:${mobileEditor ? 'none' : 'flex'}!important}
          .nvn .editor{display:${mobileEditor ? 'flex' : 'none'}!important}
          .nvn .backbtn{display:inline-flex!important}
        }
      `}</style>

      {/* Notes list */}
      <div className="list" style={{ width: 330, flexShrink: 0, borderRight: '1px solid #E5E5EA', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {curFolder ? (
          <div style={{ padding: '10px 12px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="btn" style={{ color: YEL, fontSize: 17 }} onClick={() => { setView(null); setFolderMenu(false); setFolderForm(null); setConfirmFolderDel(false) }}><Icon d={I.back} /> Notes</button>
              <div style={{ position: 'relative', display: 'flex', gap: 2 }}>
                <button className="btn" onClick={() => setFolderMenu(v => !v)} title="Folder options" aria-label="Folder options"><Icon d={I.more} /></button>
                <button className="btn" onClick={create} title="New note" aria-label="New note"><Icon d={I.compose} /></button>
                {folderMenu && (
                  <div style={{ position: 'absolute', right: 34, top: 36, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 5, minWidth: 190, overflow: 'hidden' }}>
                    <div className="row" style={{ padding: '11px 14px', cursor: 'pointer', fontSize: 15 }} onClick={() => { setFolderForm({ mode: 'rename', name: curFolder.name }); setFolderMenu(false) }}>Rename Folder</div>
                    <div className="row" style={{ padding: '11px 14px', cursor: 'pointer', fontSize: 15, color: '#FF3B30', borderTop: '1px solid #F0F0F2' }} onClick={() => { setConfirmFolderDel(true); setFolderMenu(false) }}>Delete Folder</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', padding: '4px 6px 0' }}>{curFolder.name}</div>
            <div style={{ fontSize: 14, color: '#8E8E93', padding: '0 6px' }}>{inView.length} Note{inView.length === 1 ? '' : 's'}</div>
            {confirmFolderDel && (
              <div style={{ margin: '8px 6px 0', fontSize: 14 }}>Delete this folder? Its notes are kept and move to All Notes.
                <button className="btn" style={{ color: '#FF3B30', fontWeight: 600 }} onClick={deleteFolder}>Delete</button>
                <button className="btn" style={{ color: YEL }} onClick={() => setConfirmFolderDel(false)}>Cancel</button></div>
            )}
          </div>
        ) : (
          <div style={{ padding: '18px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>Notes</div>
              <div style={{ fontSize: 14, color: '#8E8E93' }}>{notes.length} Note{notes.length === 1 ? '' : 's'} · {folders.length} Folder{folders.length === 1 ? '' : 's'}</div>
            </div>
            <button className="btn" onClick={create} title="New note" aria-label="New note"><Icon d={I.compose} /></button>
          </div>
        )}
        {folderForm && (
          <div style={{ margin: '0 14px 8px', padding: 12, background: '#F2F2F7', borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{folderForm.mode === 'new' ? 'New Folder' : 'Rename Folder'}</div>
            <input autoFocus value={folderForm.name} maxLength={80} placeholder="Name" onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveFolder(); if (e.key === 'Escape') setFolderForm(null) }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid #D1D1D6', fontSize: 16, fontFamily: 'inherit', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
              <button className="btn" style={{ color: YEL }} onClick={() => setFolderForm(null)}>Cancel</button>
              <button className="btn" style={{ color: YEL, fontWeight: 700, opacity: folderForm.name.trim() ? 1 : .4 }} onClick={saveFolder}>Save</button>
            </div>
          </div>
        )}
        <div style={{ margin: '0 14px 8px', background: '#EEEEF0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
          <Icon d={I.search} size={16} color="#8E8E93" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 16, fontFamily: 'inherit' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px' }}>
          {!curFolder && !q && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 6px' }}>
                <button className="btn" style={{ padding: 0, fontSize: 18, fontWeight: 700, color: '#000' }} onClick={() => setFoldersOpen(v => !v)}>Folders <Icon d={foldersOpen ? I.chevD : I.chevR} size={18} /></button>
                <button className="btn" onClick={() => { setFolderForm({ mode: 'new', name: '' }); setFoldersOpen(true) }} title="New folder" aria-label="New folder"><Icon d={I.folderPlus} /></button>
              </div>
              {foldersOpen && (
                <div style={{ background: '#fff', border: '1px solid #EDEDF0', borderRadius: 14 }}>
                  {folders.length === 0 && <div style={{ padding: '14px 16px', color: '#8E8E93', fontSize: 14 }}>No folders yet. Tap the folder icon to add one.</div>}
                  {folders.map((f, i) => (
                    <div key={f.id} className="row" onClick={() => { setView(f.id); setSel(null); setMobileEditor(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 46, cursor: 'pointer', borderRadius: 14, borderTop: i ? '1px solid #F0F0F2' : 'none' }}>
                      <Icon d={I.folder} size={22} />
                      <span style={{ flex: 1, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                      <span style={{ color: '#8E8E93', fontSize: 16 }}>{notes.filter(n => n.folder_id === f.id).length}</span>
                      <Icon d={I.chevR} size={16} color="#C7C7CC" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {shown.length === 0 && <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 10px', fontSize: 15 }}>{q ? 'No Results' : curFolder ? 'No Notes in this folder' : 'No Notes'}</div>}
          {groupNotes(shown).map(g => (
            <div key={g.title} style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6C6C70', padding: '0 8px 6px' }}>{g.title}</div>
              <div style={{ background: '#fff', borderRadius: 10 }}>
                {g.items.map((n, i) => (
                  <div key={n.id} className="row" onClick={() => { setSel(n.id); setMobileEditor(true); setConfirmDel(false) }}
                    style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: n.id === sel ? '#FFE9A3' : undefined, borderTop: i && n.id !== sel ? '1px solid #F0F0F2' : '1px solid transparent' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleOf(n.body)}</div>
                    <div style={{ fontSize: 14, color: '#6C6C70', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: '#000', marginRight: 8 }}>{shortDate(n.updated_at)}</span>{previewOf(n.body)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #E5E5EA', padding: '8px 0', textAlign: 'center', fontSize: 12, color: '#8E8E93' }}>{inView.length} Note{inView.length === 1 ? '' : 's'}</div>
      </div>

      {/* Editor */}
      <div className="editor" style={{ flex: 1, minWidth: 0, flexDirection: 'column', display: 'flex', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 8 }}>
          <button className="btn backbtn" style={{ display: 'none', color: YEL, fontSize: 17 }} onClick={() => setMobileEditor(false)}><Icon d={I.back} /> Notes</button>
          <div style={{ flex: 1 }} />
          {cur && (confirmDel
            ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>Delete this note?
                <button className="btn" style={{ color: '#FF3B30', fontWeight: 600 }} onClick={() => remove(cur)}>Delete</button>
                <button className="btn" style={{ color: YEL }} onClick={() => setConfirmDel(false)}>Cancel</button></div>
            : <>
                <button className="btn" onClick={checklist} title="Checklist" aria-label="Checklist"><Icon d={I.check} /></button>
                <div style={{ position: 'relative' }}>
                  <button className="btn" onClick={() => setMoveOpen(v => !v)} title="Move to folder" aria-label="Move to folder"><Icon d={I.folder} /></button>
                  {moveOpen && (
                    <div style={{ position: 'absolute', right: 0, top: 38, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 5, minWidth: 210, maxHeight: 300, overflowY: 'auto' }}>
                      <div style={{ padding: '9px 14px', fontSize: 12, color: '#8E8E93', fontWeight: 600 }}>Move to</div>
                      <div className="row" style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 15, display: 'flex', justifyContent: 'space-between' }} onClick={() => moveNote(cur, null)}>No folder {!cur.folder_id && <span style={{ color: YEL }}>✓</span>}</div>
                      {folders.map(f => <div key={f.id} className="row" style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 15, display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid #F0F0F2' }} onClick={() => moveNote(cur, f.id)}><span>{f.name}</span>{cur.folder_id === f.id && <span style={{ color: YEL }}>✓</span>}</div>)}
                    </div>
                  )}
                </div>
                <button className="btn" onClick={() => togglePin(cur)} title={cur.pinned ? 'Unpin' : 'Pin'} aria-label="Pin"><Icon d={I.pin} fill={cur.pinned ? YEL : 'none'} /></button>
                <button className="btn" onClick={() => setConfirmDel(true)} title="Delete" aria-label="Delete"><Icon d={I.trash} /></button>
                <button className="btn" onClick={create} title="New note" aria-label="New note"><Icon d={I.compose} /></button>
              </>)}
        </div>
        {cur ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8E8E93', padding: '2px 0 10px' }}>{longDate(cur.updated_at)}</div>
            <textarea ref={area} key={cur.id} value={cur.body} onChange={e => edit(cur.id, e.target.value)} onKeyDown={onKey}
              placeholder="Start typing. The first line is the title."
              style={{ flex: 1, border: 'none', resize: 'none', padding: '0 clamp(18px, 6vw, 64px) 40px', fontSize: 17, lineHeight: 1.5, fontFamily: 'inherit', caretColor: YEL, color: '#000' }} />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C7C7CC', fontSize: 22 }}>No Note Selected</div>
        )}
        {err && <div style={{ padding: '6px 16px', fontSize: 12, color: '#B42318' }}>{err}</div>}
      </div>
    </div>
  )
}
