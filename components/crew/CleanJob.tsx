'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ACCENT = '#2F6DB5'
type Item = { text: string; done: boolean }

async function authFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers || {}) } })
}
async function upload(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `cleaning/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) return null
  return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}
const parse = (v: any): string[] => { try { const a = JSON.parse(v); return Array.isArray(a) ? a.filter(Boolean) : [] } catch { return [] } }

function Photos({ label, urls, onChange, disabled }: { label: string; urls: string[]; onChange: (u: string[]) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#323338', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((u, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={u} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            {!disabled && <button onClick={() => onChange(urls.filter((_, x) => x !== i))} aria-label="Remove photo" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer' }}>×</button>}
          </div>
        ))}
        {!disabled && (
          <label style={{ width: 72, height: 72, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 600, cursor: 'pointer' }}>
            {busy ? '…' : 'Add photo'}
            <input type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={async e => {
              const files = Array.from(e.target.files ?? []); if (!files.length) return
              setBusy(true)
              const got = (await Promise.all(files.map(upload))).filter((u): u is string => !!u)
              onChange([...urls, ...got]); setBusy(false); e.target.value = ''
            }} />
          </label>
        )}
      </div>
    </div>
  )
}

export default function CleanJob({ item, onClose, onChanged }: { item: { id: string; table: string; property?: string; title: string }; onClose: () => void; onChanged: (status: string) => void }) {
  const [list, setList] = useState<Item[]>([])
  const [before, setBefore] = useState<string[]>([])
  const [after, setAfter] = useState<string[]>([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [fix, setFix] = useState(false)
  const [fx, setFx] = useState({ title: '', description: '', priority: 'medium', photos: [] as string[] })
  const [reported, setReported] = useState(0)

  useEffect(() => {
    authFetch(`/api/crew-jobs?table=${item.table}&id=${item.id}`).then(r => r.json()).then(d => {
      if (d.task) { setList(d.task.checklist); setBefore(parse(d.task.before_media)); setAfter(parse(d.task.after_media)); setStatus(d.task.status) }
      else setMsg(d.error || 'Could not load this job')
      setLoading(false)
    })
  }, [item.id, item.table])

  const done = status === 'completed'
  const n = list.filter(i => i.done).length
  const all = list.length > 0 && n === list.length

  async function save(extra: any = {}) {
    const r = await authFetch('/api/crew-jobs', { method: 'PATCH', body: JSON.stringify({ table: item.table, id: item.id, checklist: list, before_media: JSON.stringify(before), after_media: JSON.stringify(after), ...extra }) })
    const d = await r.json(); if (!r.ok) setMsg(d.error || 'Could not save'); return r.ok
  }
  function tick(i: number) {
    if (done) return
    const next = list.map((c, x) => x === i ? { ...c, done: !c.done } : c)
    setList(next)
    authFetch('/api/crew-jobs', { method: 'PATCH', body: JSON.stringify({ table: item.table, id: item.id, checklist: next, start: status === 'pending' }) })
    if (status === 'pending') { setStatus('in_progress'); onChanged('in_progress') }
  }
  async function finish() {
    setMsg('')
    if (!all) { setMsg('Tick every item first.'); return }
    if (!before.length || !after.length) { setMsg('Add at least one before and one after photo.'); return }
    if (await save({ complete: true })) { setStatus('completed'); onChanged('completed') }
  }
  async function report() {
    setMsg('')
    const r = await authFetch('/api/crew-jobs', { method: 'POST', body: JSON.stringify({ table: item.table, id: item.id, ...fx }) })
    const d = await r.json()
    if (!r.ok) { setMsg(d.error || 'Could not send'); return }
    setReported(c => c + 1); setFix(false); setFx({ title: '', description: '', priority: 'medium', photos: [] })
  }

  const box: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div><div style={{ fontSize: 17, fontWeight: 700, color: '#323338' }}>{item.property ?? 'Clean'}</div><div style={{ fontSize: 12, color: '#667085' }}>{item.title}</div></div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, color: '#667085', cursor: 'pointer' }} aria-label="Close">×</button>
        </div>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: '#98A2B3' }}>Loading…</div> : (<>
          {done && <div style={{ margin: '14px 0', padding: 12, borderRadius: 10, background: '#ECFDF5', color: '#047857', fontSize: 13, fontWeight: 600 }}>Clean completed. The property now shows as ready.</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0 6px', fontSize: 13, fontWeight: 600, color: '#323338' }}><span>Checklist</span><span style={{ color: '#667085' }}>{n} of {list.length}</span></div>
          <div style={{ height: 6, background: '#EAECF0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}><div style={{ width: `${list.length ? n / list.length * 100 : 0}%`, height: '100%', background: ACCENT }} /></div>
          {list.map((c, i) => (
            <div key={i} onClick={() => tick(i)} role="checkbox" aria-checked={c.done} tabIndex={0} onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), tick(i))} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 0', borderTop: i ? '1px solid #F2F4F7' : 'none', cursor: done ? 'default' : 'pointer' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${c.done ? '#10B981' : '#D0D5DD'}`, background: c.done ? '#10B981' : '#fff', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.done ? '✓' : ''}</span>
              <span style={{ fontSize: 14, color: c.done ? '#98A2B3' : '#323338', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
            </div>
          ))}
          <div style={{ height: 14 }} />
          <Photos label="Before photos" urls={before} disabled={done} onChange={u => { setBefore(u); authFetch('/api/crew-jobs', { method: 'PATCH', body: JSON.stringify({ table: item.table, id: item.id, before_media: JSON.stringify(u) }) }) }} />
          <Photos label="After photos" urls={after} disabled={done} onChange={u => { setAfter(u); authFetch('/api/crew-jobs', { method: 'PATCH', body: JSON.stringify({ table: item.table, id: item.id, after_media: JSON.stringify(u) }) }) }} />

          <div style={{ border: '1px solid #E4E7EC', borderRadius: 12, padding: 14, margin: '4px 0 16px', background: '#F9FAFB' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#323338' }}>Maintenance needed?</div>
            <div style={{ fontSize: 12, color: '#667085', margin: '2px 0 10px' }}>Only use this if something needs the maintenance team. It goes straight to their list.</div>
            {reported > 0 && <div style={{ fontSize: 12, color: '#047857', fontWeight: 600, marginBottom: 8 }}>{reported} issue{reported > 1 ? 's' : ''} sent to the maintenance team.</div>}
            {!fix ? <button onClick={() => setFix(true)} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: '#fff', color: ACCENT, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Report an issue</button> : (
              <div style={{ display: 'grid', gap: 10 }}>
                <input style={box} placeholder="What needs fixing? e.g. Leaking kitchen tap" value={fx.title} onChange={e => setFx({ ...fx, title: e.target.value })} />
                <textarea style={box} rows={2} placeholder="Where is it and what did you see?" value={fx.description} onChange={e => setFx({ ...fx, description: e.target.value })} />
                <select style={box} value={fx.priority} onChange={e => setFx({ ...fx, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                <Photos label="Photos of the issue" urls={fx.photos} onChange={p => setFx({ ...fx, photos: p })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={report} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send to maintenance</button>
                  <button onClick={() => setFix(false)} style={{ padding: '11px 14px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          {msg && <div style={{ color: '#B42318', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
          {!done && <button onClick={finish} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: all && before.length && after.length ? 1 : .5 }}>Mark clean complete</button>}
        </>)}
      </div>
    </div>
  )
}
