'use client'
// "📋 Scripts" button for message boxes (Email compose, Airbnb Inbox).
// Lists the scripts set to show in that place; click to insert (fill-ins
// completed), or copy. Staff guides show as read-only tips.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fillScript, categoryColor, type Script } from '../../lib/scripts-shared'

const C = { ink: '#323338', muted: '#676879', faint: '#9699A6', border: '#D0D4E4', row: '#E6E9EF', cream: '#FBF4E6', gold: '#A8862E', brown: '#624920' }

async function api(path: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}

let cache: Record<string, { at: number; list: Script[]; me: string }> = {}

export default function ScriptPicker({ where, name, property, onInsert, up }: {
  where: 'email' | 'airbnb'; name?: string | null; property?: string | null
  onInsert: (text: string) => void; up?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Script[] | null>(cache[where]?.list ?? null)
  const [me, setMe] = useState(cache[where]?.me ?? '')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [guide, setGuide] = useState<Script | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const hit = cache[where]
    if (!hit || Date.now() - hit.at > 60_000) api(`/api/scripts?where=${where}`).then(d => { cache[where] = { at: Date.now(), list: d.scripts, me: d.me }; setList(d.scripts); setMe(d.me) }).catch(e => setErr(e.message))
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, where])

  const fill = (s: Script) => fillScript(s.body, { name, property, myName: me })
  const used = (s: Script) => { api('/api/scripts', { action: 'used', id: s.id }).catch(() => {}) }
  const shown = (list ?? []).filter(s => !q || `${s.name} ${s.category} ${s.stage ?? ''} ${s.body}`.toLowerCase().includes(q.toLowerCase()))
  const cats = [...new Set(shown.map(s => s.category))]

  return (
    <div ref={box} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 4, border: '1px solid ' + C.gold, background: C.cream, color: C.brown, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>📋 Scripts ▾</button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 60, left: 0, [up ? 'bottom' : 'top']: 'calc(100% + 6px)', width: 'min(440px, 86vw)', maxHeight: 420, display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.16)' } as any}>
          <div style={{ padding: 10, borderBottom: '1px solid ' + C.row }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search scripts…" style={{ width: '100%', padding: '7px 9px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ overflowY: 'auto', padding: 6 }}>
            {err && <div style={{ padding: 10, fontSize: 13, color: '#DF2F4A' }}>{err}</div>}
            {!list && !err && <div style={{ padding: 10, fontSize: 13, color: C.faint }}>Loading…</div>}
            {list && !shown.length && <div style={{ padding: 10, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{list.length ? 'No scripts match.' : <>No scripts yet. Add them in <a href="/staff-centre/marketing?view=scripts" style={{ color: C.gold }}>Marketing → Scripts</a>.</>}</div>}
            {cats.map(cat => (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em', padding: '8px 8px 4px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: categoryColor(cat) }} />{cat}</div>
                {shown.filter(s => s.category === cat).map(s => s.kind === 'guide' ? (
                  <button key={s.id} type="button" onClick={() => setGuide(guide?.id === s.id ? null : s)} style={{ display: 'block', width: '100%', textAlign: 'left', border: '1px dashed #C9B37A', background: '#FFFCF3', borderRadius: 5, padding: '7px 9px', margin: '2px 0', cursor: 'pointer', fontFamily: 'inherit', color: C.ink }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>📘 {s.name}</span> <span style={{ fontSize: 11.5, color: C.faint }}>staff guide · not for sending</span>
                    {guide?.id === s.id && <span style={{ display: 'block', whiteSpace: 'pre-wrap', fontSize: 12.5, color: C.ink, marginTop: 6, lineHeight: 1.5 }}>{s.body}</span>}
                  </button>
                ) : (
                  <div key={s.id} className="sp-row" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 5, padding: '6px 8px' }}>
                    <button type="button" onClick={() => { onInsert(fill(s)); used(s); setOpen(false) }} title="Insert into message" style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: C.ink, padding: 0 }}>
                      {s.stage && <span style={{ display: 'block', fontSize: 11, color: categoryColor(s.category), fontWeight: 600 }}>{s.stage}</span>}
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fill(s).replace(/\s+/g, ' ')}</span>
                      {s.note && <span style={{ display: 'block', fontSize: 11.5, color: '#9A6A00', marginTop: 2 }}>⚠ {s.note}</span>}
                    </button>
                    <button type="button" title="Copy" onClick={() => { navigator.clipboard?.writeText(fill(s)).then(() => { setCopied(s.id); used(s); setTimeout(() => setCopied(''), 1500) }).catch(() => {}) }} style={{ flexShrink: 0, border: '1px solid ' + C.border, background: '#fff', borderRadius: 4, padding: '3px 7px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: copied === s.id ? '#00A35C' : C.muted }}>{copied === s.id ? '✓' : '⧉'}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '7px 10px', borderTop: '1px solid ' + C.row, fontSize: 11.5, color: C.faint, display: 'flex', justifyContent: 'space-between' }}>
            <span>Click to insert · ⧉ to copy</span><a href="/staff-centre/marketing?view=scripts" style={{ color: C.gold }}>Manage scripts</a>
          </div>
          <style>{`.sp-row:hover{background:${C.cream}}`}</style>
        </div>
      )}
    </div>
  )
}
