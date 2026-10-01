'use client'
// Marketing → Scripts: paste and organise the wording the team sends to
// clients. Grouped by category and shown in step order; each script picks
// where it appears (Email, Airbnb Inbox) and whether the AI may use it.
// "Staff guide" scripts are instructions for the team and are never sent.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C, Modal, btn, input, label } from '../crm/Page'
import { FILL_INS, categoryColor, fillScript, type Script } from '../../lib/scripts-shared'

async function api(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/scripts', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}
const BLANK: Partial<Script> = { name: '', category: '', stage: '', kind: 'message', body: '', note: '', show_email: true, show_airbnb: true, ai_use: true, sort: 0 }
const tag = (bg: string, fg: string, bold = false): React.CSSProperties => ({ fontSize: 11.5, padding: '2px 7px', borderRadius: 3, background: bg, color: fg, fontWeight: bold ? 600 : 400, whiteSpace: 'nowrap' })

export default function ScriptsView() {
  const [list, setList] = useState<Script[] | null>(null)
  const [me, setMe] = useState({ name: '', isAdmin: false })
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [edit, setEdit] = useState<Partial<Script> | null>(null)
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const load = () => api().then(d => { setList(d.scripts); setMe({ name: d.me, isAdmin: d.isAdmin }) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const cats = useMemo(() => [...new Set((list ?? []).map(s => s.category))].sort(), [list])
  const shown = (list ?? []).filter(s => (!cat || s.category === cat) && (!q || `${s.name} ${s.category} ${s.stage ?? ''} ${s.body}`.toLowerCase().includes(q.toLowerCase())))
  const groups = [...new Set(shown.map(s => s.category))].sort()

  const copy = (s: Script) => navigator.clipboard?.writeText(fillScript(s.body, { myName: me.name })).then(() => { setCopied(s.id); setTimeout(() => setCopied(''), 1500); api({ action: 'used', id: s.id }).catch(() => {}) })

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
      <div style={{ padding: '22px 28px 16px', background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: C.brown, margin: '0 0 2px' }}>Scripts</h1>
          <div style={{ fontSize: 13, color: '#8A7248', maxWidth: 720, lineHeight: 1.5 }}>Paste your scripts here once. They show in <b>Email</b> and the <b>Airbnb Inbox</b> under <b>📋 Scripts</b> so staff can insert or copy them, and the AI follows the ones marked <b>✦ AI can use</b>.</div>
        </div>
        <button style={btn('gold')} onClick={() => setEdit({ ...BLANK, category: cat || '' })}>+ New script</button>
      </div>

      <div style={{ padding: '16px 28px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search scripts…" style={{ ...input, flex: 1, minWidth: 200, width: 'auto' }} />
          {['', ...cats].map(c => (
            <button key={c || 'all'} onClick={() => setCat(c)} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 14, border: '1px solid ' + (cat === c ? C.ink : C.border), background: cat === c ? C.ink : '#fff', color: cat === c ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{c || 'All'}</button>
          ))}
        </div>

        {err && <div style={{ color: C.red, padding: 20 }}>{err}</div>}
        {!list && !err && <div style={{ color: C.faint, padding: 20 }}>Loading scripts…</div>}
        {list && !list.length && <div style={{ color: C.muted, padding: '30px 0', fontSize: 14 }}>No scripts yet. Press <b>+ New script</b> and paste your first one.</div>}

        {groups.map(g => {
          const items = shown.filter(s => s.category === g).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
          const color = categoryColor(g)
          const stages: string[] = []
          for (const s of items) if (!stages.includes(s.stage || '')) stages.push(s.stage || '')
          const numbered = items.some(s => s.stage)
          return (
            <div key={g} style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{g}
                <span style={{ color: C.faint, fontWeight: 400, fontSize: 13 }}>{items.length}</span>
                <button onClick={() => setEdit({ ...BLANK, category: g, sort: (items[items.length - 1]?.sort ?? 0) + 1 })} style={{ marginLeft: 6, border: 'none', background: 'none', color: C.goldDark, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add to {g}</button>
              </div>
              {stages.map((st, i) => {
                const inStage = items.filter(s => (s.stage || '') === st)
                const guide = inStage.every(s => s.kind === 'guide')
                return (
                  <div key={st || '_'} style={{ display: 'grid', gridTemplateColumns: numbered ? '40px minmax(0,1fr)' : 'minmax(0,1fr)', gap: '0 12px' }}>
                    {numbered && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: guide ? C.brown : color, color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{st ? i + 1 : '·'}</span>
                        {i < stages.length - 1 && <span style={{ flex: 1, width: 2, background: color + '40', margin: '4px 0' }} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0, paddingBottom: 12 }}>
                      {st && <div style={{ fontSize: 12, fontWeight: 700, color: guide ? C.brown : color, letterSpacing: '.04em', textTransform: 'uppercase', margin: '5px 0 7px' }}>{st}</div>}
                      <div style={{ display: 'grid', gridTemplateColumns: inStage.length > 1 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 10 }}>
                        {inStage.map(s => <Card key={s.id} s={s} color={color} copied={copied === s.id} onCopy={() => copy(s)} onEdit={() => setEdit(s)} />)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {edit && <Editor s={edit} cats={cats} canDelete={!!edit.id && (me.isAdmin || edit.created_by === me.name)} onClose={() => setEdit(null)}
        onSaved={(msg) => { setEdit(null); flash(msg); load() }} />}
      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 16px', borderRadius: 6, fontSize: 14, zIndex: 200 }}>{toast}</div>}
    </div>
  )
}

function Card({ s, color, copied, onCopy, onEdit }: { s: Script; color: string; copied: boolean; onCopy: () => void; onEdit: () => void }) {
  const [more, setMore] = useState(false)
  const long = s.body.length > 420
  if (s.kind === 'guide') return (
    <div style={{ border: '1px dashed #C9B37A', borderLeft: '4px solid ' + C.brown, background: '#FFFCF3', borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>📘 {s.name}</div>
        <button onClick={onEdit} style={btn('ghost', true)}>Edit</button>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.6, marginTop: 6 }}>{s.body}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={tag('#F1F2F5', C.muted)}>Staff guide · never sent</span>
        {s.show_airbnb && <span style={tag('#FFE8EC', '#D11A3F')}>Airbnb Inbox</span>}
        {s.show_email && <span style={tag('#E8F1FF', '#2F6FD6')}>Email</span>}
        {s.ai_use && <span style={tag('#F1E8FB', '#7A35B8', true)}>✦ AI knows this</span>}
      </div>
    </div>
  )
  return (
    <div style={{ border: '1px solid ' + C.row, borderLeft: '4px solid ' + color, borderRadius: 6, padding: '12px 14px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.name}</div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onCopy} style={{ ...btn('gold', true), background: copied ? C.green : C.goldDark, borderColor: copied ? C.green : C.goldDark }}>{copied ? '✓ Copied' : '⧉ Copy'}</button>
          <button onClick={onEdit} style={btn('ghost', true)}>Edit</button>
        </div>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.6, background: '#FAFAFB', border: '1px solid ' + C.row, borderRadius: 6, padding: '10px 12px', marginTop: 8, maxHeight: long && !more ? 190 : undefined, overflow: 'hidden', position: 'relative' }}>
        {s.body}
        {long && !more && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50, background: 'linear-gradient(transparent,#FAFAFB)' }} />}
      </div>
      {long && <button onClick={() => setMore(m => !m)} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.goldDark, fontSize: 12.5, cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>{more ? 'Show less' : 'Show all'}</button>}
      {s.note && <div style={{ fontSize: 12.5, color: '#9A6A00', background: '#FFF6DD', borderRadius: 4, padding: '6px 9px', marginTop: 8, lineHeight: 1.45 }}>⚠ {s.note}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {s.show_airbnb && <span style={tag('#FFE8EC', '#D11A3F')}>Airbnb Inbox</span>}
        {s.show_email && <span style={tag('#E8F1FF', '#2F6FD6')}>Email</span>}
        {s.ai_use ? <span style={tag('#F1E8FB', '#7A35B8', true)}>✦ AI can use</span> : <span style={tag('#F1F2F5', C.muted)}>Staff only</span>}
        {s.use_count > 0 && <span style={{ fontSize: 11.5, color: C.faint }}>Used {s.use_count} time{s.use_count === 1 ? '' : 's'}</span>}
      </div>
    </div>
  )
}

function Editor({ s, cats, canDelete, onClose, onSaved }: { s: Partial<Script>; cats: string[]; canDelete: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [f, setF] = useState<Partial<Script>>(s)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)
  const set = (k: keyof Script, v: any) => setF(p => ({ ...p, [k]: v }))
  const guide = f.kind === 'guide'
  const insertVar = (v: string) => {
    const el = ta.current; const body = f.body ?? ''
    const at = el ? el.selectionStart : body.length
    set('body', body.slice(0, at) + v + body.slice(el ? el.selectionEnd : at))
    setTimeout(() => { el?.focus(); el?.setSelectionRange(at + v.length, at + v.length) }, 0)
  }
  const run = async (body: any, msg: string) => {
    setBusy(true); setErr('')
    try { await api(body); onSaved(msg) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const chk = (on: boolean, txt: React.ReactNode, onClick: () => void, disabled = false) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={onClick} style={{ width: 16, height: 16, accentColor: C.goldDark }} />{txt}
    </label>
  )
  return (
    <Modal title={f.id ? 'Edit script' : 'New script'} width={660} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['message', 'guide'] as const).map(k => (
            <button key={k} onClick={() => set('kind', k)} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid ' + (f.kind === k ? C.goldDark : C.border), background: f.kind === k ? C.cream : '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{k === 'message' ? '💬 Message' : '📘 Staff guide'}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{k === 'message' ? 'Wording that gets sent to clients' : 'Instructions for the team, never sent'}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
          <div><span style={label}>Name</span><input value={f.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Welcome message" style={input} autoFocus /></div>
          <div><span style={label}>Category</span><input value={f.category ?? ''} onChange={e => set('category', e.target.value)} list="script-cats" placeholder="e.g. Airbnb outreach" style={input} />
            <datalist id="script-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', gap: 12 }}>
          <div><span style={label}>Step <span style={{ color: C.faint, fontWeight: 400 }}>(optional — scripts with the same step show side by side)</span></span><input value={f.stage ?? ''} onChange={e => set('stage', e.target.value)} placeholder="e.g. Step 2 · Reply depending on their answer" style={input} /></div>
          <div><span style={label}>Order</span><input type="number" value={f.sort ?? 0} onChange={e => set('sort', e.target.value)} style={input} /></div>
        </div>
        <div>
          <span style={label}>{guide ? 'Guide for staff' : 'Script — paste it here'}</span>
          <textarea ref={ta} value={f.body ?? ''} onChange={e => set('body', e.target.value)} rows={10} style={{ ...input, resize: 'vertical', lineHeight: 1.55, minHeight: 180 }} />
          {!guide && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>Fill-ins (click to add): {FILL_INS.map(v => <button key={v} type="button" onClick={() => insertVar(v)} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, background: '#F1F2F5', border: 'none', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: C.ink }}>{v}</button>)}</div>}
        </div>
        {!guide && <div><span style={label}>Tip for staff <span style={{ color: C.faint, fontWeight: 400 }}>(optional, not sent)</span></span><input value={f.note ?? ''} onChange={e => set('note', e.target.value)} placeholder="e.g. Airbnb may hide social media handles before a booking" style={input} /></div>}
        <div>
          <span style={label}>Show it in{guide ? <span style={{ color: C.faint, fontWeight: 400 }}> (as a read-only tip for staff)</span> : null}</span>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {chk(!!f.show_airbnb, 'Airbnb Inbox', () => set('show_airbnb', !f.show_airbnb))}
            {chk(!!f.show_email, 'Email', () => set('show_email', !f.show_email))}
          </div>
        </div>
        <div style={{ border: '1px solid #E5D6F5', background: '#FBF7FF', borderRadius: 6, padding: '10px 12px' }}>
          {chk(!!f.ai_use, <span><b style={{ color: '#7A35B8' }}>{guide ? '✦ AI knows this guide' : '✦ AI can use this script'}</b></span>, () => set('ai_use', !f.ai_use))}
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{guide ? 'The AI reads it for context (e.g. what the next step is) but never sends it.' : 'When the AI drafts a reply for this kind of message, it follows this wording instead of making something up.'}</div>
        </div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>{canDelete && <button disabled={busy} onClick={() => confirm(`Delete “${f.name}”?`) && run({ action: 'delete', id: f.id }, 'Script deleted')} style={btn('danger')}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn('ghost')}>Cancel</button>
            <button disabled={busy} onClick={() => run({ action: 'save', script: f }, f.id ? 'Script saved' : 'Script added')} style={{ ...btn('gold'), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save script'}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
