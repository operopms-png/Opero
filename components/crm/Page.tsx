'use client'
// Shared building blocks for Staff Centre pages that follow the CRM look:
// Figtree, cream-to-gold header band, gold underline tabs, monday-style
// grouped tables with coloured group borders and solid label pills.
import React from 'react'

export const C = {
  gold: '#D0AE4C', goldDark: '#A8862E', brown: '#624920', cream: '#FBF4E6', creamLine: '#EADBB8',
  ink: '#323338', muted: '#676879', faint: '#9699A6', row: '#E6E9EF', border: '#D0D4E4', hover: '#F5F6F8',
  green: '#00C875', orange: '#FDAB3D', red: '#DF2F4A', blue: '#579BFC', purple: '#9D50DD', grey: '#C4C4C4',
}

export const MODULE_COLOR: Record<string, string> = {
  str: '#D0AE4C', pm: '#00C875', ea: '#FDAB3D', dev: '#9D50DD', staff: '#624920', other: '#9699A6',
}

export const btn = (kind: 'gold' | 'ghost' | 'danger' = 'gold', small = false): React.CSSProperties => ({
  padding: small ? '5px 10px' : '8px 16px', borderRadius: 4, fontSize: small ? 12.5 : 14, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
  ...(kind === 'gold' ? { background: C.goldDark, color: '#fff', border: '1px solid ' + C.goldDark }
    : kind === 'danger' ? { background: '#fff', color: C.red, border: '1px solid ' + C.row }
    : { background: '#fff', color: C.ink, border: '1px solid ' + C.border }),
})

export const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid ' + C.border, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: C.ink, outline: 'none' }
export const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 5 }

export function CrmPage({ children, fill }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <div style={{ minHeight: 'calc(100vh - var(--hub-h, 0px))', height: fill ? 'calc(100vh - var(--hub-h, 0px))' : undefined, display: fill ? 'flex' : undefined, flexDirection: 'column', width: '100%', minWidth: 0, contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: C.ink, background: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');`}</style>
      {children}
    </div>
  )
}

export type Tab = { k: string; l: string; count?: number; color?: string }

export function CrmHeader({ title, subtitle, actions, tabs, tab, onTab, below }: {
  title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; tabs?: Tab[]; tab?: string; onTab?: (k: string) => void; below?: React.ReactNode
}) {
  return (
    <div style={{ padding: tabs ? '22px 28px 0' : '22px 28px', background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine, flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: C.brown, margin: '0 0 2px' }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: '#8A7248', maxWidth: 760, lineHeight: 1.5 }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      {below}
      {tabs && (
        <div style={{ display: 'flex', gap: 22, marginTop: 12, overflowX: 'auto' }}>
          {tabs.map(t => {
            const on = t.k === tab
            return (
              <button key={t.k} onClick={() => onTab?.(t.k)} style={{ padding: '8px 2px', marginBottom: -1, border: 'none', borderBottom: '2px solid ' + (on ? C.goldDark : 'transparent'), background: 'none', color: on ? C.ink : C.muted, fontSize: 14, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {t.color && <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />}
                {t.l}{t.count !== undefined && <span style={{ color: C.faint, fontWeight: 400 }}>{t.count}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: '20px 28px 40px', minWidth: 0, ...style }}>{children}</div>
}

export function Stat({ label: l, value, sub, highlight }: { label: string; value: React.ReactNode; sub?: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', border: '1px solid ' + (highlight ? C.creamLine : C.row), borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 13, color: highlight ? '#8A7248' : C.muted, marginBottom: 6 }}>{l}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: highlight ? C.brown : C.ink, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function Pill({ children, color, onClick, title, width }: { children: React.ReactNode; color: string; onClick?: () => void; title?: string; width?: number | string }) {
  return (
    <span onClick={onClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: width ?? 90, height: 28, padding: '0 10px', boxSizing: 'border-box', background: color, color: '#fff', fontSize: 12.5, fontWeight: 500, borderRadius: 4, cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}>{children}</span>
  )
}

export function Avatar({ name, color, size = 28 }: { name: string; color?: string; size?: number }) {
  const ini = (name || '?').split(/\s+/).filter(w => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color ?? C.gold, color: '#fff', fontSize: size * 0.38, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</span>
}

export type Col = { k: string; l: React.ReactNode; w: number | string; align?: 'left' | 'center' | 'right' }

// A monday-style group: coloured title, then a table whose rows carry a
// coloured left border. Columns are a CSS grid so every row lines up.
export function Group({ title, color, count, cols, children, right, collapsedDefault }: {
  title: React.ReactNode; color: string; count?: number; cols: Col[]; children: React.ReactNode; right?: React.ReactNode; collapsedDefault?: boolean
}) {
  const [open, setOpen] = React.useState(!collapsedDefault)
  const grid = cols.map(c => typeof c.w === 'number' ? c.w + 'px' : c.w).join(' ')
  const minW = cols.reduce((s, c) => s + (typeof c.w === 'number' ? c.w : 220), 0)
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <button onClick={() => setOpen(o => !o)} style={{ border: 'none', background: 'none', cursor: 'pointer', color, fontSize: 12, padding: 0, width: 16, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }}>▼</button>
        <span style={{ fontSize: 17, fontWeight: 600, color }}>{title}</span>
        {count !== undefined && <span style={{ fontSize: 13, color: C.faint }}>{count} {count === 1 ? 'item' : 'items'}</span>}
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {open && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: minW }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, borderLeft: '6px solid ' + color, borderTop: '1px solid ' + C.row, borderRight: '1px solid ' + C.row, borderTopLeftRadius: 4, background: '#fff' }}>
              {cols.map((c, i) => (
                <div key={c.k} style={{ padding: '8px 10px', fontSize: 13, color: C.muted, textAlign: c.align ?? (i === 0 ? 'left' : 'center'), borderLeft: i ? '1px solid ' + C.row : 'none', borderBottom: '1px solid ' + C.row, whiteSpace: 'normal', lineHeight: 1.25, display: 'flex', alignItems: 'center', justifyContent: c.align === 'right' ? 'flex-end' : (c.align ?? (i === 0 ? 'left' : 'center')) === 'center' ? 'center' : 'flex-start' }}>{c.l}</div>
              ))}
            </div>
            <GroupCtx.Provider value={{ grid, color }}>{children}</GroupCtx.Provider>
          </div>
        </div>
      )}
    </div>
  )
}

const GroupCtx = React.createContext<{ grid: string; color: string }>({ grid: '1fr', color: C.gold })

export function Row({ cells, onClick, active, below }: { cells: React.ReactNode[]; onClick?: () => void; active?: boolean; below?: React.ReactNode }) {
  const { grid, color } = React.useContext(GroupCtx)
  const [hover, setHover] = React.useState(false)
  return (
    <>
      <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'grid', gridTemplateColumns: grid, borderLeft: '6px solid ' + color, borderRight: '1px solid ' + C.row, background: active ? '#F0F3FF' : hover ? C.hover : '#fff', cursor: onClick ? 'pointer' : 'default' }}>
        {cells.map((c, i) => (
          <div key={i} style={{ padding: '6px 10px', minHeight: 40, boxSizing: 'border-box', fontSize: 14, borderLeft: i ? '1px solid ' + C.row : 'none', borderBottom: '1px solid ' + C.row, display: 'flex', alignItems: 'center', justifyContent: i === 0 ? 'flex-start' : 'center', minWidth: 0, overflow: 'hidden' }}>{c}</div>
        ))}
      </div>
      {below && <div style={{ borderLeft: '6px solid ' + color, borderRight: '1px solid ' + C.row, borderBottom: '1px solid ' + C.row, background: '#FAFBFC' }}>{below}</div>}
    </>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ border: '1px dashed ' + C.border, borderRadius: 8, padding: '48px 20px', textAlign: 'center', color: C.muted, fontSize: 14, background: '#fff' }}>{children}</div>
}

export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,23,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, fontFamily: 'Figtree, Inter, sans-serif' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 8, width: '100%', maxWidth: width, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid ' + C.row }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}

export function Loading() {
  return <CrmPage><div style={{ padding: 60, textAlign: 'center', color: C.faint, fontSize: 14 }}>Loading…</div></CrmPage>
}
