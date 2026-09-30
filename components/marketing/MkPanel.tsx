'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BRAND } from '@/lib/crm-board'
import { type MkBoard, fmtDate } from '@/lib/marketing-boards'
import MkCell from './MkCell'
import type { BoardStore as Mk } from '@/lib/marketing-boards'

// Renders an email body exactly as /api/marketing-send sends it (newlines -> <br/>, wrapped in <p>).
// Sandboxed iframe: no scripts run.
function previewDoc(body: string) {
  const html = `<p>${(body || '').replace(/\n/g, '<br/>')}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#323338;background:#fff}img{max-width:100%;height:auto}p{margin:0}</style></head><body>${html}</body></html>`
}
export function EmailPreview({ body, height = 360 }: { body: string; height?: number }) {
  return (
    <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 6, overflow: 'hidden', background: '#F6F7FB' }}>
      {body?.trim()
        ? <iframe title="Email preview" sandbox="" srcDoc={previewDoc(body)} style={{ width: '100%', height, border: 'none', display: 'block', background: '#fff' }} />
        : <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9699A6' }}>Nothing to preview yet</div>}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12.5, color: BRAND.muted, marginBottom: 4, display: 'block' }
const field: React.CSSProperties = { width: '100%', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: BRAND.ink }
const btn: React.CSSProperties = { height: 34, padding: '0 14px', borderRadius: 4, border: `1px solid ${BRAND.border}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: BRAND.ink }
const gold: React.CSSProperties = { ...btn, border: 'none', background: BRAND.goldDark, color: '#fff', fontWeight: 600 }

function LongText({ title, value, onSave, placeholder, disabled }: { title: string; value: string; onSave: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [t, setT] = useState(value)
  useEffect(() => setT(value), [value])
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>{title}</label>
      <textarea value={t} disabled={disabled} onChange={e => setT(e.target.value)} onBlur={() => { if (t !== value) onSave(t) }} rows={5} placeholder={placeholder} style={{ ...field, resize: 'vertical', background: disabled ? '#FAFAFB' : '#fff' }} />
    </div>
  )
}

export default function MkPanel({ mk, board, id, onClose, onOpenOther }: { mk: Mk; board: MkBoard; id: string; onClose: () => void; onOpenOther: (board: string, id: string) => void }) {
  const row = mk.rows[board.key].find(r => r.id === id)
  const isEmail = board.key === 'emails', isTpl = board.key === 'templates'
  const sent = isEmail && row?.status === 'Sent'
  const replies = isEmail ? mk.replies[id] ?? [] : []
  const [tab, setTab] = useState<'main' | 'updates' | 'activity'>('main')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    if (!row) return
    setName(String(row[board.nameField] ?? '')); setBody(row.body ?? ''); setSubject(row.subject ?? '')
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-crm-popover]')) onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  if (!row || typeof document === 'undefined') return null
  const save = (patch: Record<string, any>) => mk.update(board.key, id, patch)
  const dirtyBody = (row.body ?? '') !== body
  const tabs: [typeof tab, string][] = [['main', isEmail ? 'Email' : isTpl ? 'Template' : 'Details'], ...(isEmail ? [['updates', `Replies${replies.length ? ` / ${replies.length}` : ''}`] as [typeof tab, string]] : []), ['activity', 'Activity log']]
  const fieldCols = board.cols.filter(c => c.type !== 'send' && c.type !== 'longtext' && !(isTpl && c.key === 'subject'))

  const sendNow = async () => {
    if (dirtyBody) await save({ body })
    if (!row.to_recipient) { alert('Add who the email is to first.'); return }
    if (!body.trim()) { alert('Write the email first.'); return }
    if (confirm(`Send "${row.subject}" to ${row.to_recipient} now?`)) await mk.sendEmail(id)
  }
  const saveAsTemplate = async () => {
    if (!body.trim()) { alert('Write the email first.'); return }
    const t = await mk.add('templates', { name: row.subject, subject: row.subject, body, module: row.module, category: 'Other' })
    if (t) alert(`Saved as the template "${row.subject}".`)
  }
  const useTemplate = async () => {
    const e = await mk.add('emails', { subject: row.subject, body: row.body, template: row.name, module: row.module, status: 'Draft' })
    if (e) onOpenOther('emails', e.id)
  }
  const applyTemplate = (tplId: string) => {
    const t = mk.rows.templates.find(x => x.id === tplId); if (!t) return
    if (body.trim() && !confirm('Replace the current email with this template?')) return
    setBody(t.body ?? ''); setName(t.subject ?? name)
    save({ body: t.body, subject: t.subject, template: t.name })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(640px, 100vw)', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', fontFamily: 'Figtree, Inter, sans-serif', color: BRAND.ink }}>
        <div style={{ padding: '18px 24px 0', borderBottom: `1px solid ${BRAND.rowBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: BRAND.muted }}>×</button>
            <div style={{ fontSize: 12, color: BRAND.muted }}>{board.title}{sent ? ' · Sent ' + fmtDate(row.sent_at, true) : ''}</div>
            <button onClick={async () => { if (confirm(`Delete this ${board.item}? This can't be undone.`)) { await mk.remove(board.key, [id]); onClose() } }} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#DF2F4A', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>🗑 Delete</button>
          </div>
          {board.nameRef
            ? <div style={{ fontSize: 22, fontWeight: 600, margin: '6px 0 10px' }}>{(mk.refs?.[board.cols.find(c => c.key === board.nameRef)?.ref ?? ''] ?? []).find(o => o.value === row[board.nameRef!])?.label ?? `${board.item[0].toUpperCase() + board.item.slice(1)} — choose below`}</div>
            : board.key === 'social'
            ? <div style={{ fontSize: 13, color: BRAND.muted, margin: '8px 0 10px' }}>Social post</div>
            : <input value={name} disabled={sent} onChange={e => setName(e.target.value)} onBlur={() => { const t = name.trim(); if (t && t !== row[board.nameField]) save({ [board.nameField]: t }) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                style={{ width: '100%', fontSize: 22, fontWeight: 600, border: '1px solid transparent', borderRadius: 4, padding: '4px 6px', margin: '6px 0 10px -6px', fontFamily: 'inherit', outline: 'none', color: BRAND.ink, background: '#fff' }}
                onFocus={e => (e.target.style.borderColor = BRAND.border)} />}
          <div style={{ display: 'flex', gap: 22 }}>
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: tab === k ? BRAND.ink : BRAND.muted, borderBottom: tab === k ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', fontWeight: tab === k ? 600 : 400 }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: tab === 'updates' ? '#F6F7FB' : '#fff' }}>
          {tab === 'main' && <>
            {board.key === 'social' && (
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Caption</label>
                <textarea value={name} onChange={e => setName(e.target.value)} onBlur={() => { const t = name.trim(); if (t && t !== row.caption) save({ caption: t }) }} rows={5} style={{ ...field, resize: 'vertical' }} />
              </div>
            )}
            {/* fields */}
            <div style={{ border: `1px solid ${BRAND.rowBorder}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
              {fieldCols.map(c => (
                <div key={c.key} style={{ display: 'flex', minHeight: 38, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
                  <div style={{ width: 150, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13.5, color: BRAND.muted, background: '#FAFAFB', borderRight: `1px solid ${BRAND.rowBorder}` }}>{c.title}</div>
                  <div style={{ flex: 1, height: 38, padding: c.type === 'status' ? 1 : 0 }}><MkCell mk={mk} board={board} col={c} row={row} /></div>
                </div>
              ))}
            </div>
            {board.cols.filter(c => c.type === 'longtext').map(c => <LongText key={c.key} disabled={c.readonlyWhen?.(row)} title={c.title} value={row[c.key] ?? ''} onSave={v => save({ [c.key]: v || null })} placeholder={board.key === 'campaigns' ? "Goals, budget breakdown, who it's aimed at…" : 'Add notes…'} />)}
            {(isEmail || isTpl) && (
              <div>
                {isTpl && <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} onBlur={() => { if (subject.trim() && subject !== row.subject) save({ subject: subject.trim() }) }} style={field} />
                </div>}
                {isEmail && !sent && mk.rows.templates.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Start from a template</label>
                    <select value="" onChange={e => applyTemplate(e.target.value)} style={{ ...field, height: 38 }}>
                      <option value="">Choose a template…</option>
                      {mk.rows.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <label style={lbl}>{isEmail ? 'Email' : 'Template'} body {!sent && <span style={{ color: '#9699A6' }}>(plain text or HTML — images work)</span>}</label>
                <textarea value={body} disabled={sent} onChange={e => setBody(e.target.value)} onBlur={() => { if (dirtyBody && body.trim()) save({ body }) }} rows={8} style={{ ...field, resize: 'vertical', marginBottom: 12, background: sent ? '#FAFAFB' : '#fff' }} />
                <label style={lbl}>Preview</label>
                <EmailPreview body={body} />
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {isEmail && !sent && <button onClick={sendNow} disabled={mk.sendingId === id} style={{ ...gold, opacity: mk.sendingId === id ? 0.6 : 1 }}>{mk.sendingId === id ? 'Sending…' : 'Send now'}</button>}
                  {isEmail && !sent && <button onClick={() => save({ status: 'Scheduled', body })} style={btn}>Mark as scheduled</button>}
                  {isEmail && <button onClick={saveAsTemplate} style={btn}>Save as template</button>}
                  {isTpl && <button onClick={useTemplate} style={gold}>Use template</button>}
                  {dirtyBody && !sent && <button onClick={() => save({ body })} style={btn}>Save changes</button>}
                </div>
                {isEmail && !sent && <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 10 }}>Emails go out from the sending address shown at the top of the Emails board. Replies land under “Replies”.</div>}
              </div>
            )}
          </>}

          {tab === 'updates' && (
            replies.length === 0
              ? <div style={{ textAlign: 'center', padding: 50, color: BRAND.muted, fontSize: 14 }}>{sent ? 'No replies yet. When someone replies to this email it shows up here.' : 'Replies show up here once the email is sent.'}</div>
              : replies.map(r => (
                <div key={r.id} style={{ background: '#fff', border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <b style={{ fontSize: 13.5 }}>{r.from_address}</b>
                    <span style={{ fontSize: 12, color: BRAND.muted }}>{fmtDate(r.created_at, true)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.body}</div>
                </div>
              ))
          )}

          {tab === 'activity' && (
            <div style={{ fontSize: 13.5 }}>
              {[
                { t: row.created_at, l: `${board.item[0].toUpperCase() + board.item.slice(1)} created${row.owner ? ` · owner ${row.owner}` : ''}` },
                ...(isEmail && row.scheduled_at ? [{ t: row.scheduled_at, l: 'Scheduled send date' }] : []),
                ...(isEmail && row.sent_at ? [{ t: row.sent_at, l: `Sent to ${row.to_recipient}` }] : []),
                ...(isEmail ? mk.events.filter(e => e.marketing_email_id === id).map(e => ({ t: e.created_at, l: `${String(e.type).charAt(0).toUpperCase() + String(e.type).slice(1)}${e.device_type ? ` · ${e.device_type}` : ''}` })) : []),
                ...replies.map(r => ({ t: r.created_at, l: `Reply from ${r.from_address}` })),
              ].filter(x => x.t).sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()).map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: `1px solid ${BRAND.rowBorder}` }}>
                  <span style={{ width: 160, flexShrink: 0, color: BRAND.muted }}>{fmtDate(x.t, true)}</span><span>{x.l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
