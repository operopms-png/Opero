'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Item } from '@/lib/crm-board'
import { BRAND, COLUMN_TYPES } from '@/lib/crm-board'
import Cell, { Avatar } from './Cell'
import type { Crm } from './useCrm'

export default function ItemPanel({ crm, itemId, onClose }: { crm: Crm; itemId: string; onClose: () => void }) {
  const item = crm.itemsById.get(itemId) as Item | undefined
  const [tab, setTab] = useState<'updates' | 'info'>('updates')
  const [updates, setUpdates] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [name, setName] = useState(item?.name ?? '')

  useEffect(() => { crm.loadUpdates(itemId).then(setUpdates) }, [itemId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setName(item?.name ?? '') }, [item?.name])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-crm-popover] input:focus')) onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  if (!item || typeof document === 'undefined') return null
  const board = crm.boards.find(b => b.id === item.board_id)
  const group = crm.groups.find(g => g.id === item.group_id)
  const cols = crm.columns.filter(c => c.board_id === item.board_id).sort((a, b) => a.position - b.position)

  const post = async () => {
    const t = draft.trim()
    if (!t) return
    const u = await crm.addUpdate(item.id, t)
    if (u) setUpdates(prev => [u, ...prev])
    setDraft('')
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(620px, 100vw)', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', fontFamily: 'Figtree, Inter, sans-serif', color: BRAND.ink }}>
        <div style={{ padding: '18px 24px 0', borderBottom: `1px solid ${BRAND.rowBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: BRAND.muted }}>×</button>
            <div style={{ fontSize: 12, color: BRAND.muted }}>{board?.name}{group ? ` · ` : ''}{group && <span style={{ color: group.color, fontWeight: 600 }}>{group.title}</span>}</div>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} onBlur={() => { const t = name.trim(); if (t && t !== item.name) crm.updateItem(item.id, { name: t }) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{ width: '100%', fontSize: 24, fontWeight: 600, border: '1px solid transparent', borderRadius: 4, padding: '4px 6px', margin: '6px 0 10px -6px', fontFamily: 'inherit', outline: 'none', color: BRAND.ink }}
            onFocus={e => (e.target.style.borderColor = BRAND.border)} />
          <div style={{ display: 'flex', gap: 22 }}>
            {(['updates', 'info'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: tab === t ? BRAND.ink : BRAND.muted, borderBottom: tab === t ? `2px solid ${BRAND.goldDark}` : '2px solid transparent', fontWeight: tab === t ? 600 : 400 }}>
                {t === 'updates' ? `Updates${updates.length ? ` / ${updates.length}` : ''}` : 'Details'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: tab === 'updates' ? '#F6F7FB' : '#fff' }}>
          {tab === 'updates' ? (
            <>
              <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: 12, marginBottom: 18 }}>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write an update, note a call, or log a viewing…" rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post() }}
                  style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={post} disabled={!draft.trim()} style={{ padding: '7px 16px', border: 'none', borderRadius: 4, background: BRAND.goldDark, color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: draft.trim() ? 1 : 0.5 }}>Update</button>
                </div>
              </div>
              {updates.map(u => (
                <div key={u.id} style={{ background: '#fff', border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Avatar p={{ id: u.author ?? '', name: u.author ?? 'Staff' }} size={30} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{u.author ?? 'Staff'}</div><div style={{ fontSize: 12, color: BRAND.muted }}>{new Date(u.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
                    <button title="Delete update" onClick={async () => { await crm.deleteUpdate(item.id, u.id); setUpdates(prev => prev.filter(x => x.id !== u.id)) }} style={{ border: 'none', background: 'none', color: '#9699A6', cursor: 'pointer' }}>🗑</button>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{u.body}</div>
                </div>
              ))}
              {!updates.length && <div style={{ textAlign: 'center', color: BRAND.muted, fontSize: 14, padding: 30 }}>No updates yet for this {board?.item_label ?? 'item'}.</div>}
            </>
          ) : (
            <div>
              {cols.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', minHeight: 40, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
                  <div style={{ width: 170, flexShrink: 0, fontSize: 13.5, color: BRAND.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: COLUMN_TYPES.find(t => t.type === c.type)?.color ?? '#C4C4C4', color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{COLUMN_TYPES.find(t => t.type === c.type)?.icon}</span>
                    {c.title}
                  </div>
                  <div style={{ flex: 1, height: 36, border: `1px solid ${BRAND.rowBorder}`, borderRadius: 4, overflow: 'hidden' }}><Cell col={c} item={item} crm={crm} /></div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                <select value={item.group_id ?? ''} onChange={e => crm.updateItem(item.id, { group_id: e.target.value })} style={{ height: 34, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontFamily: 'inherit' }}>
                  {crm.groups.filter(g => g.board_id === item.board_id).map(g => <option key={g.id} value={g.id}>Move to: {g.title}</option>)}
                </select>
                <button onClick={() => { if (confirm(`Delete "${item.name}"?${item.crm_contact_id ? ' This also removes the contact from the rest of the portal.' : ''}`)) { crm.deleteItems([item.id]); onClose() } }} style={{ marginLeft: 'auto', height: 34, padding: '0 14px', border: '1px solid #DF2F4A', color: '#DF2F4A', background: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              </div>
              <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 16 }}>Created {new Date(item.created_at).toLocaleString('en-GB')} · Last updated {new Date(item.updated_at).toLocaleString('en-GB')}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
