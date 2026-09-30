'use client'
import { useEffect, useState } from 'react'
import { BRAND, initials, avatarColor } from '@/lib/crm-board'
import { HR_BOARDS, hrBoard } from '@/lib/hr-boards'
import { fmtDate } from '@/lib/marketing-boards'
import { useMultiBoards } from '@/components/boards/useMultiBoards'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'

// Staff Centre → People & HR: a CRM-style workspace with one board per HR record type.
type View = { kind: 'home' } | { kind: 'board'; key: string }

const ICON: Record<string, React.ReactNode> = {
  home: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>,
  employees: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.2c3 .2 5.5 2.3 5.5 5.3" /></svg>,
  onboarding: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></svg>,
  reviews: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>,
  training: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></svg>,
  discipline: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>,
  time: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  requests: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>,
  goals: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>,
}
const today = () => new Date().toISOString().slice(0, 10)

export default function HrPage() {
  const store = useMultiBoards(HR_BOARDS, {
    refs: rows => ({ employees: (rows.employees ?? []).map(e => ({ value: e.id, label: e.full_name, color: '#D0AE4C' })).sort((a, b) => a.label.localeCompare(b.label)) }),
    patch: (k, row, p) => {
      // keep the "done" dates filled in automatically
      if (k === 'onboarding' && 'status' in p) return { ...p, completed_date: p.status === 'Complete' ? (row.completed_date ?? today()) : null }
      if (k === 'requests' && 'status' in p) return { ...p, resolved_date: p.status !== 'Pending' ? (row.resolved_date ?? today()) : null }
      if (k === 'goals' && 'status' in p && p.status === 'Achieved') return { ...p, progress_pct: 100 }
      return p
    },
  })
  const [view, setViewState] = useState<View>({ kind: 'home' })
  const [panelOpen, setPanelOpen] = useState(true)
  const [open, setOpen] = useState<{ board: string; id: string } | null>(null)

  useEffect(() => {
    if (store.loading) return
    const b = new URLSearchParams(window.location.search).get('board')
    if (b && hrBoard(b)) setViewState({ kind: 'board', key: b })
  }, [store.loading])
  const setView = (v: View) => { setViewState(v); window.history.replaceState(null, '', v.kind === 'board' ? `?board=${v.key}` : window.location.pathname) }

  const board = view.kind === 'board' ? hrBoard(view.key) : undefined

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
        @media (max-width: 1100px) { .hr-tiles { grid-template-columns: repeat(3, minmax(0,1fr)) !important } }
        @media (max-width: 900px) { .hr-ws { display: none !important } .hr-row { grid-template-columns: 1fr !important } }
      `}</style>
      {panelOpen ? (
        <aside className="hr-ws" style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${BRAND.rowBorder}`, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 10px' }}>
            <span style={{ fontSize: 13, color: BRAND.muted }}>Workspace</span>
            <button onClick={() => setPanelOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted }}>«</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontSize: 13.5, marginBottom: 12, whiteSpace: 'nowrap' }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: BRAND.gold, color: BRAND.brown, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
            Sangsters People & HR
          </div>
          <Nav icon={ICON.home} label="HR dashboard" active={view.kind === 'home'} onClick={() => setView({ kind: 'home' })} />
          {HR_BOARDS.map(b => <Nav key={b.key} icon={ICON[b.key]} label={b.title} count={store.rows[b.key]?.length} active={view.kind === 'board' && view.key === b.key} onClick={() => setView({ kind: 'board', key: b.key })} />)}
        </aside>
      ) : <button onClick={() => setPanelOpen(true)} style={{ width: 28, flexShrink: 0, border: 'none', borderRight: `1px solid ${BRAND.rowBorder}`, background: '#fff', cursor: 'pointer', color: BRAND.muted }}>»</button>}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {store.loading ? <div style={{ padding: 60, color: BRAND.muted, textAlign: 'center' }}>Loading People & HR…</div>
          : store.error ? <div style={{ padding: 60, color: '#DF2F4A' }}>Couldn’t load People & HR: {store.error}</div>
          : view.kind === 'home' ? <Dashboard store={store} go={k => setView({ kind: 'board', key: k })} openItem={(b, id) => setOpen({ board: b, id })} />
          : board && <MkBoardView key={board.key} mk={store} board={board} onOpen={id => setOpen({ board: board.key, id })} />}
      </main>
      {open && hrBoard(open.board) && <MkPanel key={open.id} mk={store} board={hrBoard(open.board)!} id={open.id} onClose={() => setOpen(null)} onOpenOther={(b, id) => setOpen({ board: b, id })} />}
    </div>
  )
}

function Nav({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button className="crm-nav" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: active ? `1px solid ${BRAND.goldDark}` : '1px solid transparent', borderRadius: 4, background: active ? BRAND.selected : 'none', color: BRAND.ink, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
      <span style={{ color: BRAND.muted, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count ? <span style={{ fontSize: 11.5, color: BRAND.muted }}>{count}</span> : null}
    </button>
  )
}

function Dashboard({ store, go, openItem }: { store: ReturnType<typeof useMultiBoards>; go: (k: string) => void; openItem: (b: string, id: string) => void }) {
  const r = store.rows
  const emp = (id: string) => (r.employees ?? []).find(e => e.id === id)?.full_name ?? '—'
  const now = Date.now()
  const days = (d: string) => (new Date(d + 'T00:00:00').getTime() - now) / 86400000
  const active = (r.employees ?? []).filter(e => e.status === 'Active')
  const pendingOnb = (r.onboarding ?? []).filter(o => o.status === 'Pending')
  const pendingReq = (r.requests ?? []).filter(x => x.status === 'Pending')
  const disc90 = (r.discipline ?? []).filter(d => d.date_issued && days(d.date_issued) >= -90)
  const expiring = (r.training ?? []).filter(t => t.expiry_date && days(t.expiry_date) <= 60)
  const goals = r.goals ?? []
  const tiles = [
    { l: 'Active employees', v: active.length, k: 'employees', hl: true },
    { l: 'Pending onboarding', v: pendingOnb.length, k: 'onboarding' },
    { l: 'Pending HR requests', v: pendingReq.length, k: 'requests' },
    { l: 'Discipline (90 days)', v: disc90.length, k: 'discipline' },
    { l: 'Training expiring (60 days)', v: expiring.length, k: 'training' },
  ]
  const card: React.CSSProperties = { border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }
  const head: React.CSSProperties = { padding: '12px 18px', fontSize: 15.5, fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const link: React.CSSProperties = { border: 'none', background: 'none', color: BRAND.goldDark, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${BRAND.rowBorder}`, cursor: 'pointer', fontSize: 13.5 }
  const empty = (t: string) => <div style={{ padding: 24, color: BRAND.muted, fontSize: 13.5, textAlign: 'center' }}>{t}</div>
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ height: 120, background: `linear-gradient(135deg, ${BRAND.selected}, #F3E6C8)` }} />
      <div style={{ padding: '0 32px 40px', marginTop: -40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 22 }}>
          <div style={{ width: 80, height: 80, borderRadius: 10, background: '#fff', border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', overflow: 'hidden', flexShrink: 0 }}><img src="/logo.PNG" alt="Sangsters" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
          <div style={{ paddingBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500 }}>People & HR</h1>
            <div style={{ fontSize: 13.5, color: BRAND.muted }}>Employees, onboarding, reviews, training, requests and goals in one place</div>
          </div>
        </div>
        <div className="hr-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
          {tiles.map(t => (
            <button key={t.l} onClick={() => go(t.k)} style={{ textAlign: 'left', border: `1px solid ${t.hl ? '#EADBB8' : BRAND.rowBorder}`, background: t.hl ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', borderRadius: 8, padding: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 12.5, color: t.hl ? '#8A6B2E' : BRAND.muted }}>{t.l}</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: t.hl ? BRAND.brown : BRAND.ink }}>{t.v}</div>
            </button>
          ))}
        </div>
        <div className="hr-row" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={card}>
            <div style={head}>Team <button style={link} onClick={() => go('employees')}>Open Employees →</button></div>
            {(r.employees ?? []).length === 0 ? empty('No employees yet.') : (r.employees ?? []).map(e => (
              <div key={e.id} className="crm-nav" style={row} onClick={() => openItem('employees', e.id)}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(e.full_name), color: '#fff', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(e.full_name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500 }}>{e.full_name}</div><div style={{ fontSize: 12.5, color: BRAND.muted }}>{[e.role, e.department].filter(Boolean).join(' · ')}</div></div>
                <span style={{ background: e.status === 'Active' ? '#00C875' : e.status === 'On Leave' ? '#FDAB3D' : '#C4C4C4', color: '#fff', fontSize: 12, borderRadius: 3, padding: '2px 10px' }}>{e.status}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={head}>Needs attention</div>
            {[
              ...pendingReq.map(x => ({ b: 'requests', id: x.id, t: x.title, s: `${x.type} request · ${emp(x.employee_id)}`, c: '#FDAB3D' })),
              ...pendingOnb.map(x => ({ b: 'onboarding', id: x.id, t: x.task, s: `Onboarding · ${emp(x.employee_id)}${x.due_date ? ` · due ${fmtDate(x.due_date)}` : ''}`, c: '#579BFC' })),
              ...expiring.map(x => ({ b: 'training', id: x.id, t: x.training_name, s: `${days(x.expiry_date) < 0 ? 'Expired' : 'Expires'} ${fmtDate(x.expiry_date)} · ${emp(x.employee_id)}`, c: '#DF2F4A' })),
            ].slice(0, 10).map(x => (
              <div key={x.b + x.id} className="crm-nav" style={row} onClick={() => openItem(x.b, x.id)}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }}>{x.t}</div><div style={{ fontSize: 12.5, color: BRAND.muted }}>{x.s}</div></div>
              </div>
            ))}
            {pendingReq.length + pendingOnb.length + expiring.length === 0 && empty('Nothing waiting — all clear.')}
          </div>
        </div>
        <div style={card}>
          <div style={head}>Company goals <button style={link} onClick={() => go('goals')}>Open Company goals →</button></div>
          {goals.length === 0 ? empty('No goals yet.') : goals.map(g => {
            const p = Math.max(0, Math.min(100, Number(g.progress_pct) || 0))
            return (
              <div key={g.id} className="crm-nav" style={row} onClick={() => openItem('goals', g.id)}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500 }}>{g.title}</div><div style={{ fontSize: 12.5, color: BRAND.muted }}>{g.owner_employee_id ? emp(g.owner_employee_id) : 'No owner'}{g.target_date ? ` · target ${fmtDate(g.target_date)}` : ''}</div></div>
                <div style={{ width: 180, height: 8, background: '#F1F2F6', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${p}%`, height: '100%', background: p >= 100 ? '#00C875' : BRAND.gold }} /></div>
                <span style={{ width: 40, textAlign: 'right', color: BRAND.muted, fontSize: 12.5 }}>{p}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
