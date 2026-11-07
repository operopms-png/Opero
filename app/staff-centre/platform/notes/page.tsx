'use client'
// Platform Owner → Notes: private notes in the look of the iPhone Notes app. List with Pinned / Today /
// Previous 7 Days / Previous 30 Days / Older, search, the first line is the title, checklists, pin, delete,
// and everything saves by itself. Owner login only (notes live in platform_notes, one set per owner login).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ownerFetch } from '../../../../lib/platform-fetch'

type Note = { id: string; body: string; pinned: boolean; created_at: string; updated_at: string }
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
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null)
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
      setNotes(r.data.notes); setSel(r.data.notes[0]?.id ?? null)
    })
  }, [])

  const sorted = useMemo(() => (notes ?? []).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updated_at) - +new Date(a.updated_at)), [notes])
  const shown = useMemo(() => q ? sorted.filter(n => n.body.toLowerCase().includes(q.toLowerCase())) : sorted, [sorted, q])
  const cur = notes?.find(n => n.id === sel) ?? null

  const create = useCallback(async () => {
    const r = await ownerFetch('/api/platform/notes', { method: 'POST', body: JSON.stringify({ body: '' }) })
    if (!r.ok) { setErr(r.data?.error || 'Could not create a note'); return }
    setNotes(p => [r.data.note, ...(p ?? [])]); setSel(r.data.note.id); setMobileEditor(true); setQ('')
    setTimeout(() => area.current?.focus(), 50)
  }, [])

  function edit(id: string, body: string) {
    setNotes(p => (p ?? []).map(n => n.id === id ? { ...n, body, updated_at: new Date().toISOString() } : n))
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => { ownerFetch('/api/platform/notes', { method: 'PATCH', body: JSON.stringify({ id, body }) }).then(r => { if (!r.ok) setErr(r.data?.error || 'Could not save') }) }, 600)
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
        <div style={{ padding: '18px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>Notes</div>
          <button className="btn" onClick={create} title="New note" aria-label="New note"><Icon d={I.compose} /></button>
        </div>
        <div style={{ margin: '0 14px 8px', background: '#EEEEF0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
          <Icon d={I.search} size={16} color="#8E8E93" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 16, fontFamily: 'inherit' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px' }}>
          {shown.length === 0 && <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 10px', fontSize: 15 }}>{q ? 'No Results' : 'No Notes'}</div>}
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
        <div style={{ borderTop: '1px solid #E5E5EA', padding: '8px 0', textAlign: 'center', fontSize: 12, color: '#8E8E93' }}>{notes.length} Note{notes.length === 1 ? '' : 's'}</div>
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
