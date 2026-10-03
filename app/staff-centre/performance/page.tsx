'use client'
import { useMemo, useState } from 'react'
import { BRAND, initials, avatarColor } from '@/lib/crm-board'
import { WINS_BOARD, money, fmtDate } from '@/lib/marketing-boards'
import { useTableBoard } from '@/components/applications/useApplications'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → Staff Performance: leaderboard + a CRM-style board of wins.
// Deals set to "Closed won" in CRM → Transactions are logged here automatically.
const PERIODS = ['This Month', 'This Quarter', 'This Year', 'All Time'] as const
function periodStart(p: string) {
  const n = new Date()
  if (p === 'This Month') return new Date(n.getFullYear(), n.getMonth(), 1)
  if (p === 'This Quarter') return new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1)
  if (p === 'This Year') return new Date(n.getFullYear(), 0, 1)
  return null
}
const catColor = (c: string) => WINS_BOARD.cols.find(x => x.key === 'category')!.options!.find(o => o.value === c)?.color ?? '#C4C4C4'
const catLabel = (c: string) => { const o = WINS_BOARD.cols.find(x => x.key === 'category')!.options!.find(o => o.value === c); return o?.label ?? o?.value ?? c }

export default function PerformancePage() {
  const store = useTableBoard(WINS_BOARD, { order: 'date_achieved', ownerField: 'staff_name' })
  const [period, setPeriod] = useState<string>('This Month')
  const [open, setOpen] = useState<string | null>(null)

  const all = store.rows.wins ?? []
  const inPeriod = useMemo(() => {
    const s = periodStart(period)
    return s ? all.filter(w => new Date(String(w.date_achieved) + 'T00:00:00') >= s) : all
  }, [all, period])
  const view = useMemo(() => ({ ...store, rows: { wins: inPeriod } }), [store, inPeriod])

  const board = useMemo(() => {
    const by: Record<string, { name: string; count: number; value: number; cats: Record<string, number>; last: string }> = {}
    for (const w of inPeriod) {
      const k = w.staff_name || 'Unassigned'
      by[k] ??= { name: k, count: 0, value: 0, cats: {}, last: '' }
      if (String(w.date_achieved ?? '') > by[k].last) by[k].last = String(w.date_achieved ?? '')
      by[k].count++; by[k].value += Number(w.value) || 0
      by[k].cats[w.category] = (by[k].cats[w.category] ?? 0) + 1
    }
    return Object.values(by).sort((a, b) => b.count - a.count || b.value - a.value)
  }, [inPeriod])

  const total = inPeriod.reduce((s, w) => s + (Number(w.value) || 0), 0)
  const tiles = [
    { l: 'Total wins', v: inPeriod.length, hl: true },
    { l: 'Total value', v: money(total) || '£0' },
    { l: 'Deals closed', v: inPeriod.filter(w => w.category === 'Deal Closed').length },
    { l: 'Staff on the board', v: board.filter(b => b.name !== 'Unassigned').length },
  ]
  const medal = ['🥇', '🥈', '🥉']

  return (
    <div style={{ height: 'calc(100vh - var(--hub-h, 0px))', width: '100%', contain: 'inline-size', overflowY: 'auto', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
        @media (max-width: 900px) { .perf-tiles { grid-template-columns: repeat(2, minmax(0,1fr)) !important } }
      `}</style>
      {store.loading ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading staff performance…</div>
        : store.error ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load staff performance: {store.error}</div>
        : <>
          <div style={{ background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid #EADBB8', padding: '22px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, color: BRAND.brown }}>Staff Performance</h1>
                <div style={{ fontSize: 13.5, color: '#8A6B2E', marginTop: 2 }}>Who’s winning. CRM deals set to “Closed won” and leads set to “Won” are added automatically for the agent on them, with the amount and date.</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{ height: 32, padding: '0 14px', borderRadius: 16, border: period === p ? `1px solid ${BRAND.goldDark}` : `1px solid #EADBB8`, background: period === p ? BRAND.goldDark : '#fff', color: period === p ? '#fff' : BRAND.ink, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 28px 4px' }}>
            <div className="perf-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
              {tiles.map(t => (
                <div key={t.l} style={{ border: `1px solid ${t.hl ? '#EADBB8' : BRAND.rowBorder}`, background: t.hl ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12.5, color: t.hl ? '#8A6B2E' : BRAND.muted }}>{t.l}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: t.hl ? BRAND.brown : BRAND.ink }}>{t.v}</div>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ padding: '12px 18px', fontSize: 16, fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}` }}>🏆 Leaderboard — {period}</div>
              {board.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: BRAND.muted, fontSize: 14 }}>No wins yet for {period.toLowerCase()}.</div>
                : board.map((b, i) => (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < board.length - 1 ? `1px solid ${BRAND.rowBorder}` : 'none', background: i === 0 ? BRAND.selected : '#fff', flexWrap: 'wrap' }}>
                    <span style={{ width: 26, fontSize: 18, textAlign: 'center' }}>{medal[i] ?? <span style={{ fontSize: 13, color: BRAND.muted }}>{i + 1}</span>}</span>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: b.name === 'Unassigned' ? '#C4C4C4' : avatarColor(b.name), color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{initials(b.name)}</span>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: b.name === 'Unassigned' ? BRAND.muted : BRAND.ink }}>{b.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {Object.entries(b.cats).map(([c, n]) => <span key={c} title={catLabel(c)} style={{ background: catColor(c), color: '#fff', fontSize: 11.5, borderRadius: 3, padding: '1px 7px' }}>{catLabel(c)} · {n}</span>)}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120, maxWidth: 360 }}>
                      <div style={{ background: '#F1F2F6', borderRadius: 4, height: 8, overflow: 'hidden' }}><div style={{ width: `${(b.count / board[0].count) * 100}%`, height: '100%', background: BRAND.gold }} /></div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: BRAND.brown }}>{money(b.value) || '£0'}</div>
                      <div style={{ fontSize: 12, color: BRAND.muted }}>{b.count} {b.count === 1 ? 'win' : 'wins'}{b.last ? ` · latest ${fmtDate(b.last)}` : ''}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            <MkBoardView mk={view} board={WINS_BOARD} onOpen={setOpen}
              headerRight={<span style={{ fontSize: 12.5, color: BRAND.muted, marginRight: 8 }}>Showing {period.toLowerCase()}</span>} />
          </div>
        </>}
      {open && <MkPanel key={open} mk={store} board={WINS_BOARD} id={open} onClose={() => setOpen(null)} onOpenOther={(_b, id) => setOpen(id)} />}
    </div>
  )
}
