'use client'
import { useRef, useState } from 'react'
import Popover, { menuItem } from '@/components/crm/Popover'
import { BRAND, initials, avatarColor } from '@/lib/crm-board'
import { type MkBoard, type MkCol, optionsOf, fmtDate, money, moduleLabel } from '@/lib/marketing-boards'
import type { BoardStore as Mk } from '@/lib/marketing-boards'

export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  return <span title={name} style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name), color: '#fff', fontSize: size * 0.4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(name)}</span>
}

export function Pill({ text, color, height = '100%' }: { text: string; color: string; height?: number | string }) {
  return <div style={{ height, width: '100%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 6px', boxSizing: 'border-box' }}>{text}</div>
}

// value shown for computed columns
export function computedValue(mk: Mk, board: MkBoard, col: MkCol, row: any): string {
  if (board.key === 'emails') {
    const s = mk.stats[row.id]
    const sent = row.status === 'Sent'
    if (col.key === 'sent_at') return row.sent_at ? fmtDate(row.sent_at, true) : ''
    if (!sent || !s) return col.key === 'replies' && s?.replies ? String(s.replies) : ''
    if (col.key === 'delivered') return s.bounced ? 'Bounced' : s.delivered ? 'Yes' : 'Pending'
    if (col.key === 'opens') return String(s.opened)
    if (col.key === 'clicks') return String(s.clicked)
    if (col.key === 'replies') return String(s.replies)
  }
  if (col.key === 'created_at') return fmtDate(row.created_at)
  if (col.key === 'source') return String(row.notes ?? '').startsWith('Auto-logged from CRM') ? (String(row.notes).includes('Contacts') ? 'CRM lead (auto)' : 'CRM deal (auto)') : 'Logged by hand'
  if (col.key === 'ctr') {
    const i = Number(row.impressions) || 0, c = Number(row.clicks) || 0
    return i ? `${((c / i) * 100).toFixed(1)}%` : ''
  }
  return ''
}

export function cellText(mk: Mk, board: MkBoard, col: MkCol, row: any): string {
  const v = row[col.key]
  switch (col.type) {
    case 'module': return moduleLabel(v)
    case 'date': return fmtDate(v)
    case 'datetime': return fmtDate(v, true)
    case 'number': return col.currency ? money(v, col.currency) : v == null ? '' : String(v)
    case 'computed': return computedValue(mk, board, col, row)
    case 'send': return ''
    default: return v == null ? '' : String(v)
  }
}

const toLocalInput = (d: any) => {
  if (!d) return ''
  const x = new Date(d); if (Number.isNaN(x.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`
}

export default function MkCell({ mk, board, col, row }: { mk: Mk; board: MkBoard; col: MkCol; row: any }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const v = row[col.key]
  const locked = col.readonlyWhen?.(row) ?? false
  const set = (val: any) => mk.update(board.key, row.id, { [col.key]: val })
  const base: React.CSSProperties = { height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: BRAND.ink, cursor: locked ? 'default' : 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', boxSizing: 'border-box' }

  if (col.type === 'status' || col.type === 'module') {
    const opts = optionsOf(col)
    const o = opts.find(x => x.value === v)
    return (
      <div ref={ref} style={base} onClick={() => !locked && setOpen(true)}>
        {col.type === 'module'
          ? (o ? <span style={{ display: 'inline-block', maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis', background: BRAND.selected, color: BRAND.brown, border: '1px solid #EADBB8', borderRadius: 12, padding: '1px 10px', fontSize: 12.5 }}>{o.label}</span> : null)
          : <Pill text={o?.label ?? v ?? ''} color={o?.color ?? (v ? '#757575' : '#C4C4C4')} />}
        {open && (
          <Popover anchor={ref.current} onClose={() => setOpen(false)} width={220}>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {opts.map(x => (
                <button key={x.value} onClick={() => { setOpen(false); set(x.value) }} style={{ border: x.value === v ? `2px solid ${BRAND.ink}` : '2px solid transparent', borderRadius: 3, padding: 0, background: 'none', cursor: 'pointer', height: 34 }}>
                  <Pill text={x.label ?? x.value} color={x.color} />
                </button>
              ))}
            </div>
          </Popover>
        )}
      </div>
    )
  }

  if (col.type === 'person') {
    return (
      <div ref={ref} style={{ ...base, gap: 6, justifyContent: col.width >= 110 ? 'flex-start' : 'center', padding: col.width >= 110 ? '0 8px' : 0 }} onClick={() => !locked && setOpen(true)}>
        {v ? <><Avatar name={v} />{col.width >= 110 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}</> : <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1px dashed #C3C6D4', color: '#C3C6D4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</span>}
        {open && (
          <Popover anchor={ref.current} onClose={() => setOpen(false)} width={240}>
            <div style={{ padding: 6 }}>
              {mk.people.map(p => <button key={p} style={{ ...menuItem, fontWeight: p === v ? 600 : 400 }} onClick={() => { setOpen(false); set(p) }}><Avatar name={p} size={22} />{p}</button>)}
              {v && <button style={{ ...menuItem, color: BRAND.muted }} onClick={() => { setOpen(false); set(col.key === 'staff_name' ? 'Unassigned' : null) }}>× Remove</button>}
            </div>
          </Popover>
        )}
      </div>
    )
  }

  if (col.type === 'computed') {
    const t = computedValue(mk, board, col, row)
    return <div style={{ ...base, cursor: 'default', color: t === 'Bounced' ? '#DF2F4A' : t === 'Yes' ? '#00A35E' : BRAND.ink }}>{t}</div>
  }

  if (col.type === 'send') {
    if (row.status === 'Sent') return <div style={{ ...base, cursor: 'default', color: BRAND.muted, fontSize: 12.5 }}>✓ Sent</div>
    const busy = mk.sendingId === row.id
    return <div style={base}><button disabled={busy} onClick={() => { if (!row.to_recipient || !row.body?.trim()) { alert('Add who it’s to and write the email first (open the email to edit it).'); return } if (confirm(`Send "${row.subject}" to ${row.to_recipient} now?`)) mk.sendEmail(row.id) }}
      style={{ border: 'none', background: BRAND.goldDark, color: '#fff', borderRadius: 4, padding: '4px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>{busy ? 'Sending…' : 'Send'}</button></div>
  }

  if (col.type === 'date' || col.type === 'datetime') {
    if (editing) {
      return <input autoFocus type={col.type === 'date' ? 'date' : 'datetime-local'} defaultValue={col.type === 'date' ? (v ?? '') : toLocalInput(v)}
        onBlur={e => { setEditing(false); const val = e.target.value; set(val ? (col.type === 'date' ? val : new Date(val).toISOString()) : null) }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: '100%', height: '100%', border: `1px solid ${BRAND.goldDark}`, fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }} />
    }
    return <div style={base} onClick={() => !locked && setEditing(true)}>{cellText(mk, board, col, row) || (locked ? '' : <span className="crm-hover-show" style={{ color: '#C3C6D4' }}>📅</span>)}</div>
  }

  // text / longtext / number
  if (editing) {
    const save = () => {
      setEditing(false)
      let val: any = draft.trim()
      if (col.type === 'number') val = val === '' ? null : Number(val.replace(/[£,]/g, ''))
      if (col.type === 'number' && val !== null && Number.isNaN(val)) return
      if ((val ?? '') !== (v ?? '')) set(val === '' ? null : val)
    }
    return <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      inputMode={col.type === 'number' ? 'decimal' : undefined}
      style={{ width: '100%', height: '100%', border: `1px solid ${BRAND.goldDark}`, padding: '0 8px', fontFamily: 'inherit', fontSize: 13.5, boxSizing: 'border-box', outline: 'none' }} />
  }
  const t = cellText(mk, board, col, row)
  if ((col.type === 'url' || col.type === 'email' || col.type === 'phone') && t) {
    const href = col.type === 'email' ? `mailto:${t}` : col.type === 'phone' ? `tel:${t.replace(/\s/g, '')}` : (/^https?:\/\//i.test(t) ? t : `https://${t}`)
    return (
      <div style={{ ...base, justifyContent: 'flex-start', padding: '0 10px', gap: 6 }} title={t}>
        <a href={href} target={col.type === 'url' ? '_blank' : undefined} rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: BRAND.goldDark, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.type === 'url' ? '🔗 Open' : t}</a>
        <button className="crm-hover-show" onClick={() => { setDraft(String(v ?? '')); setEditing(true) }} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted, fontSize: 12 }}>✎</button>
      </div>
    )
  }
  return <div style={{ ...base, justifyContent: col.type === 'number' ? 'center' : 'flex-start', padding: '0 10px' }} title={t} onClick={() => { if (locked) return; setDraft(v == null ? '' : String(v)); setEditing(true) }}>{t}</div>
}
