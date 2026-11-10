'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ACCENT = '#2F6DB5'
async function authFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` } as any })
}
async function upload(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `maintenance/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  return error ? null : supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}
const parse = (v: any): string[] => { if (Array.isArray(v)) return v.filter(Boolean); try { const a = JSON.parse(v); return Array.isArray(a) ? a.filter(Boolean) : [] } catch { return [] } }

function Photos({ label, urls, onChange, disabled }: { label: string; urls: string[]; onChange: (u: string[]) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#323338', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((u, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <a href={u} target="_blank" rel="noreferrer"><img src={u} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, display: 'block' }} /></a>
            {!disabled && <button onClick={() => onChange(urls.filter((_, x) => x !== i))} aria-label="Remove photo" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer' }}>×</button>}
          </div>
        ))}
        {!disabled && (
          <label style={{ width: 72, height: 72, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: ACCENT, fontWeight: 600, cursor: 'pointer' }}>
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

export default function MaintJob({ item, onClose, onChanged }: { item: { id: string; table: string; property?: string; title: string }; onClose: () => void; onChanged: (status: string) => void }) {
  const [t, setT] = useState<any>(null)
  const [before, setBefore] = useState<string[]>([])
  const [after, setAfter] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    authFetch(`/api/crew-maintenance?table=${item.table}&id=${item.id}`).then(r => r.json()).then(d => {
      if (d.task) { setT(d.task); setBefore(parse(d.task.before_media)); setAfter(parse(d.task.after_media)); setNotes(d.task.resolution_notes ?? ''); setCost(d.task.cost != null ? String(d.task.cost) : '') }
      else setMsg(d.error || 'Could not load this job')
    })
  }, [item.id, item.table])

  const patch = (b: any) => authFetch('/api/crew-maintenance', { method: 'PATCH', body: JSON.stringify({ table: item.table, id: item.id, ...b }) })
  const status = t?.status ?? 'open'
  const solved = status === 'resolved' || status === 'closed' || status === 'completed'
  const started = status !== 'open' && status !== 'pending'

  async function start() { const r = await patch({ start: true }); if (r.ok) { setT({ ...t, status: 'in_progress' }); onChanged('in_progress') } }
  async function solve() {
    setMsg('')
    if (!after.length) { setMsg('Add at least one after photo.'); return }
    const r = await patch({ resolution_notes: notes, cost, before_media: JSON.stringify(before), after_media: JSON.stringify(after), solve: true })
    const d = await r.json()
    if (!r.ok) { setMsg(d.error || 'Could not save'); return }
    setT({ ...t, status: 'resolved' }); onChanged('resolved')
  }
  const box: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const issuePhotos = parse(t?.photos)
  const step = (on: boolean, label: string) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: on ? '#047857' : '#98A2B3', fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? '#10B981' : '#D0D5DD' }} />{label}</span>
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div><div style={{ fontSize: 17, fontWeight: 700, color: '#323338' }}>{item.title}</div><div style={{ fontSize: 12, color: '#667085' }}>{item.property ?? ''}{t?.priority ? ` · ${t.priority} priority` : ''}{t?.source === 'cleaner' ? ' · reported by cleaner' : ''}</div></div>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', fontSize: 22, color: '#667085', cursor: 'pointer' }}>×</button>
        </div>
        {!t ? <div style={{ padding: 30, textAlign: 'center', color: '#98A2B3' }}>{msg || 'Loading…'}</div> : (<>
          <div style={{ display: 'flex', gap: 14, margin: '14px 0', flexWrap: 'wrap' }}>{step(true, 'Reported')}{step(started, 'In progress')}{step(solved, 'Solved')}</div>
          {t.description && <div style={{ background: '#F2F4F7', borderRadius: 10, padding: 12, fontSize: 13, color: '#344054', marginBottom: 12 }}>{t.description}</div>}
          {issuePhotos.length > 0 && <Photos label="Photos of the issue" urls={issuePhotos} onChange={() => {}} disabled />}
          {solved ? (<>
            <div style={{ padding: 12, borderRadius: 10, background: '#ECFDF5', color: '#047857', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Solved. Partners and landlords for this property now see it as Solved.</div>
            {notes && <div style={{ fontSize: 13, color: '#344054', marginBottom: 12 }}><b>What was done:</b> {notes}{cost ? ` (cost ${cost})` : ''}</div>}
            <Photos label="Before photos" urls={before} onChange={() => {}} disabled /><Photos label="After photos" urls={after} onChange={() => {}} disabled />
          </>) : !started ? (
            <button onClick={start} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Start job</button>
          ) : (<>
            <Photos label="Before photos" urls={before} onChange={u => { setBefore(u); patch({ before_media: JSON.stringify(u) }) }} />
            <Photos label="After photos" urls={after} onChange={u => { setAfter(u); patch({ after_media: JSON.stringify(u) }) }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>What was done</div>
            <textarea style={{ ...box, marginBottom: 12 }} rows={3} placeholder="Describe the repair and any parts used" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => patch({ resolution_notes: notes })} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Cost (optional)</div>
            <input style={{ ...box, marginBottom: 14 }} type="number" min="0" inputMode="decimal" placeholder="0" value={cost} onChange={e => setCost(e.target.value)} onBlur={() => patch({ cost })} />
            {msg && <div style={{ color: '#B42318', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
            <button onClick={solve} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Mark solved</button>
          </>)}
        </>)}
      </div>
    </div>
  )
}
