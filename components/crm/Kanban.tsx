'use client'
import { useState } from 'react'
import type { Board, Column, Item } from '@/lib/crm-board'
import { BRAND, labelsOf, labelFor, fmtNumber, currencyOf, fmtDate, isImage } from '@/lib/crm-board'
import { Avatar } from './Cell'
import type { Crm } from './useCrm'

// Cards grouped by a status column; drag a card to change its status.
export default function Kanban({ crm, board, cols, items, onOpenItem }: { crm: Crm; board: Board; cols: Column[]; items: Item[]; onOpenItem: (id: string) => void }) {
  const statusCols = cols.filter(c => c.type === 'status')
  const [colId, setColId] = useState(statusCols.find(c => c.key === 'status')?.id ?? statusCols[0]?.id ?? '')
  const [drag, setDrag] = useState<string | null>(null)
  const col = statusCols.find(c => c.id === colId)
  if (!col) return <div style={{ padding: 40, color: BRAND.muted }}>Add a Status column to this board to use the Kanban view.</div>
  const lanes = [...labelsOf(col), { id: '__none', label: 'No status', color: '#C4C4C4' }]
  const priceCol = cols.find(c => c.type === 'number')
  const personCol = cols.find(c => c.type === 'person')
  const dateCol = cols.find(c => c.type === 'date')
  const fileCol = cols.find(c => c.type === 'file')
  const addCard = async (laneId: string) => {
    const g = crm.groups.filter(g => g.board_id === board.id).sort((a, b) => a.position - b.position)[0]
    await crm.addItem(board.id, g?.id ?? null, `New ${board.item_label}`, laneId === '__none' ? {} : { [col.id]: laneId })
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: BRAND.muted }}>
        Columns from
        <select value={colId} onChange={e => setColId(e.target.value)} style={{ height: 30, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontFamily: 'inherit' }}>
          {statusCols.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 30 }}>
        {lanes.map(l => {
          const laneItems = items.filter(i => (labelFor(col, i.values?.[col.id])?.id ?? '__none') === l.id)
          const total = priceCol ? laneItems.reduce((a, i) => a + (Number(i.values?.[priceCol.id]) || 0), 0) : 0
          return (
            <div key={l.id} onDragOver={e => { if (drag) e.preventDefault() }} onDrop={() => { if (drag) crm.setValue(drag, col, l.id === '__none' ? null : l.id); setDrag(null) }}
              style={{ width: 260, flexShrink: 0, background: '#F6F7FB', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: l.color, color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span>{l.label} / {laneItems.length}</span>
                {priceCol && total > 0 && <span style={{ fontWeight: 500, fontSize: 12.5 }}>{fmtNumber(total, currencyOf(priceCol))}</span>}
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                {laneItems.map(i => {
                  const img = fileCol ? (i.values?.[fileCol.id] ?? []).find(isImage) : null
                  const ppl = personCol ? (i.values?.[personCol.id] ?? []) : []
                  return (
                    <div key={i.id} draggable onDragStart={() => setDrag(i.id)} onDragEnd={() => setDrag(null)} onClick={() => onOpenItem(i.id)}
                      style={{ background: '#fff', borderRadius: 6, padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', opacity: drag === i.id ? 0.5 : 1 }}>
                      {img && <img src={img.url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />}
                      <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.ink, marginBottom: 6 }}>{i.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: BRAND.muted }}>
                        {priceCol && i.values?.[priceCol.id] != null && <span style={{ fontWeight: 600, color: BRAND.ink }}>{fmtNumber(i.values[priceCol.id], currencyOf(priceCol))}</span>}
                        {dateCol && i.values?.[dateCol.id] && <span>{fmtDate(i.values[dateCol.id])}</span>}
                        <span style={{ marginLeft: 'auto', display: 'flex' }}>{ppl.slice(0, 2).map((p: any, k: number) => <span key={p.id} style={{ marginLeft: k ? -6 : 0 }}><Avatar p={p} size={22} /></span>)}</span>
                      </div>
                    </div>
                  )
                })}
                <button onClick={() => addCard(l.id)} style={{ border: 'none', background: 'none', color: BRAND.muted, fontSize: 13, textAlign: 'left', padding: '4px 2px', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add {board.item_label}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
