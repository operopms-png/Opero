'use client'
import { useEffect, useState } from 'react'
import { BRAND } from '@/lib/crm-board'
import { BOARDS, boardByKey } from '@/lib/marketing-boards'
import { useMarketing, type Mk } from '@/components/marketing/useMarketing'
import MkBoardView from '@/components/marketing/MkBoardView'
import MkPanel from '@/components/marketing/MkPanel'
import MkDashboard from '@/components/marketing/MkDashboard'
import { Modal } from '@/components/crm/Popover'
import ScriptsView from '@/components/marketing/ScriptsView'

type View = { kind: 'home' } | { kind: 'dashboard' } | { kind: 'scripts' } | { kind: 'board'; key: string }

const ICON: Record<string, React.ReactNode> = {
  home: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>,
  campaigns: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10v4a1 1 0 001 1h2l5 4V5L6 9H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6a8 8 0 010 12" /></svg>,
  emails: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  social: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>,
  ads: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15l2.5-6L12 15M7.8 13h3.4M15 9v6h1.5a2.5 2.5 0 000-5H15" /></svg>,
  templates: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  scripts: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z" /><path d="M9 9h6M9 13h4" /></svg>,
  dashboard: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 16v-3M12 16V8M17 16v-5" /></svg>,
}
const tb: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', border: 'none', background: 'none', borderRadius: 4, fontSize: 13.5, color: BRAND.ink, cursor: 'pointer', fontFamily: 'inherit' }

export default function MarketingPage() {
  const mk = useMarketing()
  const [view, setViewState] = useState<View>({ kind: 'home' })
  const [panelOpen, setPanelOpen] = useState(true)
  const [open, setOpen] = useState<{ board: string; id: string } | null>(null)
  const [senderModal, setSenderModal] = useState(false)

  useEffect(() => {
    if (mk.loading) return
    const sp = new URLSearchParams(window.location.search)
    const b = sp.get('board') as string | null
    if (b && boardByKey(b)) setViewState({ kind: 'board', key: b })
    else if (sp.get('view') === 'dashboard') setViewState({ kind: 'dashboard' })
    else if (sp.get('view') === 'scripts') setViewState({ kind: 'scripts' })
  }, [mk.loading])

  const setView = (v: View) => {
    setViewState(v)
    window.history.replaceState(null, '', v.kind === 'board' ? `?board=${v.key}` : v.kind === 'dashboard' ? '?view=dashboard' : v.kind === 'scripts' ? '?view=scripts' : window.location.pathname)
  }
  const openItem = (b: string, id: string) => setOpen({ board: b as string, id })

  if (mk.loading) return <Shell><div style={{ padding: 60, color: BRAND.muted, textAlign: 'center', width: '100%' }}>Loading marketing…</div></Shell>
  if (mk.error) return <Shell><div style={{ padding: 60, color: '#DF2F4A', width: '100%' }}>Couldn’t load marketing: {mk.error}</div></Shell>

  const board = view.kind === 'board' ? boardByKey(view.key) : undefined
  const sender = mk.sendSettings.marketing_from_email ? `${mk.sendSettings.marketing_from_name} <${mk.sendSettings.marketing_from_email}>` : 'Sangsters default address'

  return (
    <Shell>
      {panelOpen ? (
        <aside className="mk-ws" style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${BRAND.rowBorder}`, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 10px' }}>
            <span style={{ fontSize: 13, color: BRAND.muted }}>Workspace</span>
            <button onClick={() => setPanelOpen(false)} title="Collapse" style={{ border: 'none', background: 'none', cursor: 'pointer', color: BRAND.muted }}>«</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 8px', fontSize: 13.5, marginBottom: 12, whiteSpace: 'nowrap' }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: BRAND.gold, color: BRAND.brown, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
            Sangsters Marketing
          </div>
          <NavItem icon={ICON.home} label="Workspace home" active={view.kind === 'home'} onClick={() => setView({ kind: 'home' })} />
          {BOARDS.map(b => <NavItem key={b.key} icon={ICON[b.key]} label={b.title} count={mk.rows[b.key].length} active={view.kind === 'board' && view.key === b.key} onClick={() => setView({ kind: 'board', key: b.key })} />)}
          <NavItem icon={ICON.scripts} label="Scripts" active={view.kind === 'scripts'} onClick={() => setView({ kind: 'scripts' })} />
          <NavItem icon={ICON.dashboard} label="Marketing dashboard" active={view.kind === 'dashboard'} onClick={() => setView({ kind: 'dashboard' })} />
        </aside>
      ) : (
        <button onClick={() => setPanelOpen(true)} title="Show workspace" style={{ width: 28, flexShrink: 0, border: 'none', borderRight: `1px solid ${BRAND.rowBorder}`, background: '#fff', cursor: 'pointer', color: BRAND.muted }}>»</button>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {view.kind === 'scripts' && <ScriptsView />}
        {view.kind === 'home' && <Home mk={mk} onOpen={k => setView({ kind: 'board', key: k })} onDashboard={() => setView({ kind: 'dashboard' })} onScripts={() => setView({ kind: 'scripts' })} />}
        {view.kind === 'dashboard' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px 40px', background: '#F6F7FB' }}>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 14px' }}>Marketing dashboard</h1>
            <MkDashboard mk={mk} onOpen={openItem} />
          </div>
        )}
        {board && <MkBoardView key={board.key} mk={mk} board={board} onOpen={id => openItem(board.key, id)}
          headerRight={board.key === 'emails' ? (
            <span style={{ fontSize: 12.5, color: BRAND.muted, marginRight: 8 }}>Sending as <b style={{ color: BRAND.ink, fontWeight: 500 }}>{sender}</b> <button onClick={() => setSenderModal(true)} style={{ border: 'none', background: 'none', color: BRAND.goldDark, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}>{mk.sendSettings.marketing_from_email ? 'Change' : 'Set up'}</button></span>
          ) : undefined} />}
      </main>

      {open && boardByKey(open.board) && <MkPanel key={open.id} mk={mk} board={boardByKey(open.board)!} id={open.id} onClose={() => setOpen(null)} onOpenOther={openItem} />}
      {senderModal && <SenderModal mk={mk} onClose={() => setSenderModal(false)} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--hub-h, 0px))', width: '100%', contain: 'inline-size', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .crm-hover-show { opacity: 0; transition: opacity .1s }
        .crm-row:hover .crm-hover-show, .crm-colhead:hover .crm-hover-show { opacity: 1 }
        .crm-row:hover, .crm-row:hover .crm-sticky { background: ${BRAND.hover} !important }
        .crm-nav:hover { background: ${BRAND.hover} }
        .crm-tb:hover { background: ${BRAND.hover} }
        @media (max-width: 1100px) { .mk-tiles { grid-template-columns: repeat(3, minmax(0,1fr)) !important } }
        @media (max-width: 900px) { .crm-dash-row { grid-template-columns: 1fr !important } .mk-ws { display: none !important } }
        @media (max-width: 560px) { .mk-tiles { grid-template-columns: repeat(2, minmax(0,1fr)) !important } }
      `}</style>
      {children}
    </div>
  )
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button className="crm-nav" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: active ? `1px solid ${BRAND.goldDark}` : '1px solid transparent', borderRadius: 4, background: active ? BRAND.selected : 'none', color: BRAND.ink, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
      <span style={{ color: BRAND.muted, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count ? <span style={{ fontSize: 11.5, color: BRAND.muted }}>{count}</span> : null}
    </button>
  )
}

function Home({ mk, onOpen, onDashboard, onScripts }: { mk: Mk; onOpen: (k: string) => void; onDashboard: () => void; onScripts: () => void }) {
  const last = (k: string) => mk.rows[k].reduce((a, r) => Math.max(a, new Date(r.created_at).getTime()), 0)
  const td: React.CSSProperties = { padding: '11px 16px', borderBottom: `1px solid ${BRAND.rowBorder}` }
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ height: 130, background: `linear-gradient(135deg, ${BRAND.selected}, #F3E6C8)` }} />
      <div style={{ padding: '0 40px 40px', marginTop: -44 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ width: 88, height: 88, borderRadius: 10, background: '#fff', border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.PNG" alt="Sangsters" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ paddingBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Sangsters Marketing</h1>
            <div style={{ fontSize: 13.5, color: BRAND.muted }}>Campaigns, emails, social posts and ads for every module in one place</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '26px 0 12px', flexWrap: 'wrap' }}>
          <button onClick={() => onOpen('campaigns')} style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 600, padding: '0 14px' }}>+ New campaign</button>
          <button onClick={() => onOpen('emails')} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>{ICON.emails} Write an email</button>
          <button onClick={onDashboard} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>{ICON.dashboard} Open dashboard</button>
          <button onClick={onScripts} className="crm-tb" style={{ ...tb, border: `1px solid ${BRAND.border}` }}>{ICON.scripts} Scripts</button>
        </div>
        <div style={{ border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
            <thead><tr style={{ color: BRAND.muted, textAlign: 'left' }}>{['Board', 'Items', 'In progress', 'Last added'].map(h => <th key={h} style={{ padding: '10px 16px', fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {BOARDS.map(b => {
                const rows = mk.rows[b.key]
                const live = b.key === 'templates' ? rows.length : rows.filter(r => ['Active', 'Scheduled'].includes(r.status)).length
                const t = last(b.key)
                return (
                  <tr key={b.key} onClick={() => onOpen(b.key)} className="crm-nav" style={{ cursor: 'pointer' }}>
                    <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: BRAND.muted, display: 'flex' }}>{ICON[b.key]}</span>{b.title}</span></td>
                    <td style={td}>{rows.length}</td>
                    <td style={td}>{b.key === 'templates' ? '—' : live}</td>
                    <td style={td}>{t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  </tr>
                )
              })}
              <tr onClick={onDashboard} className="crm-nav" style={{ cursor: 'pointer' }}>
                <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: BRAND.muted, display: 'flex' }}>{ICON.dashboard}</span>Marketing dashboard</span></td>
                <td style={td} colSpan={3}><span style={{ color: BRAND.muted }}>Performance across every board</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SenderModal({ mk, onClose }: { mk: Mk; onClose: () => void }) {
  const [s, setS] = useState(mk.sendSettings)
  const [busy, setBusy] = useState(false)
  const f: React.CSSProperties = { width: '100%', height: 36, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', margin: '4px 0 14px' }
  return (
    <Modal onClose={onClose}>
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 500 }}>Sending address</h2>
        <p style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.5, margin: '0 0 16px' }}>This address’s domain must be verified in Resend (SPF/DKIM records added to its DNS), or emails will fail or land in spam.</p>
        <label style={{ fontSize: 13, color: BRAND.muted }}>From name</label>
        <input value={s.marketing_from_name} onChange={e => setS({ ...s, marketing_from_name: e.target.value })} placeholder="Sangsters Group" style={f} />
        <label style={{ fontSize: 13, color: BRAND.muted }}>From email</label>
        <input value={s.marketing_from_email} onChange={e => setS({ ...s, marketing_from_email: e.target.value })} placeholder="info@sangstersgroup.com" style={f} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...tb, border: `1px solid ${BRAND.border}` }}>Cancel</button>
          <button disabled={busy} onClick={async () => { setBusy(true); const ok = await mk.saveSendSettings(s); setBusy(false); if (ok) onClose() }} style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 600, padding: '0 16px', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
