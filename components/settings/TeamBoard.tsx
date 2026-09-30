'use client'
import { useMemo, useRef, useState } from 'react'
import Popover, { menuItem } from '@/components/crm/Popover'
import { BRAND, initials, avatarColor } from '@/lib/crm-board'
import { normalizeRole } from '@/lib/useRole'

// Team Management in the CRM board style: members grouped by role,
// click the role pill to change it, open a member to edit access.
export const ROLE_COLORS: Record<string, string> = {
  'Admin': '#D0AE4C',
  'Vacation Rental Team': '#00C875',
  'Property Management Team': '#579BFC',
  'Estate Agency Team': '#FDAB3D',
  'Development Team': '#9D50DD',
  'Cleaning Team': '#66CCFF',
  'Maintenance Team': '#FF642E',
  'Viewer': '#A1B4C6',
  'Partner': '#8A6B2E',
}
const MOD_LABEL: Record<string, string> = { str: 'Vacation Rentals', pm: 'Property Management', ea: 'Estate Agency', dev: 'Developments', sc: 'Staff Centre', aipm: 'AI Property Manager', invest: 'Deal Analyser' }
const NAME_W = 300
const ROW_H = 40
const tb: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', border: 'none', background: 'none', borderRadius: 4, fontSize: 13.5, color: BRAND.ink, cursor: 'pointer', fontFamily: 'inherit' }

type Col = { key: string; title: string; width: number }
const COLS: Col[] = [
  { key: 'role', title: 'Role', width: 190 },
  { key: 'email', title: 'Email', width: 250 },
  { key: 'phone', title: 'Phone', width: 150 },
  { key: 'access', title: 'Access', width: 230 },
  { key: 'properties', title: 'Properties', width: 130 },
  { key: 'status', title: 'Status', width: 120 },
  { key: 'actions', title: '', width: 170 },
]

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name || '?'), color: '#fff', fontSize: size * 0.4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(name)}</span>
}
function Pill({ text, color }: { text: string; color: string }) {
  return <div style={{ height: '100%', width: '100%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 6px', boxSizing: 'border-box' }}>{text}</div>
}

export default function TeamBoard({ me, myRole, team, roles, propertyCount, onInvite, onEdit, onDelete, onRoleChange }: {
  me: { name: string; email: string }
  myRole: string
  team: any[]
  roles: string[]
  propertyCount: number
  onInvite: () => void
  onEdit: (m: any) => void
  onDelete: (m: any) => void
  onRoleChange: (m: any, role: string) => void
}) {
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [pop, setPop] = useState<null | 'filter'>(null)
  const filterRef = useRef<HTMLButtonElement>(null)

  const all = useMemo(() => [
    { id: '__me', name: me.name, email: me.email, role: myRole, status: 'Active', phone: '', you: true },
    ...team.map(t => ({ ...t, role: normalizeRole(t.role) })),
  ], [team, me, myRole])

  const visible = all.filter(m => {
    const q = search.trim().toLowerCase()
    if (q && !`${m.name} ${m.email} ${m.role} ${m.phone ?? ''}`.toLowerCase().includes(q)) return false
    if (roleFilter.length && !roleFilter.includes(m.role)) return false
    return true
  })
  const groups = roles.map(r => ({ role: r, color: ROLE_COLORS[r] ?? '#C4C4C4', items: visible.filter(m => m.role === r) })).filter(g => g.items.length)
  const totalW = 6 + NAME_W + COLS.reduce((s, c) => s + c.width, 0)

  const tiles = [
    { l: 'Team members', v: all.length, hl: true },
    { l: 'Admins', v: all.filter(m => m.role === 'Admin').length },
    { l: 'Cleaning & maintenance', v: all.filter(m => m.role === 'Cleaning Team' || m.role === 'Maintenance Team').length },
    { l: 'Other roles', v: all.filter(m => !['Admin', 'Cleaning Team', 'Maintenance Team'].includes(m.role)).length },
  ]

  return (
    <div style={{ fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: BRAND.ink, contain: 'inline-size', width: '100%' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        .tm-row:hover, .tm-row:hover .tm-sticky { background: ${BRAND.hover} !important }
        .tm-tb:hover { background: ${BRAND.hover} }
        @media (max-width: 900px) { .tm-tiles { grid-template-columns: repeat(2, minmax(0,1fr)) !important } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Team Management</h2>
          <div style={{ fontSize: 13.5, color: BRAND.muted, marginTop: 2 }}>Everyone gets their own login. Set each person’s role, what they can open, and which properties they see.</div>
        </div>
      </div>

      <div className="tm-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
        {tiles.map(t => (
          <div key={t.l} style={{ border: `1px solid ${t.hl ? '#EADBB8' : BRAND.rowBorder}`, background: t.hl ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12.5, color: t.hl ? '#8A6B2E' : BRAND.muted }}>{t.l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: t.hl ? BRAND.brown : BRAND.ink }}>{t.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 12px', flexWrap: 'wrap', borderBottom: `1px solid ${BRAND.rowBorder}`, marginBottom: 12 }}>
        <button onClick={onInvite} style={{ ...tb, background: BRAND.goldDark, color: '#fff', fontWeight: 500, padding: '0 14px', marginRight: 8 }}>Invite member</button>
        {searchOpen || search
          ? <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onBlur={() => setSearchOpen(false)} placeholder="Search the team" style={{ height: 32, width: 200, border: `1px solid ${BRAND.goldDark}`, borderRadius: 4, padding: '0 10px', fontFamily: 'inherit', fontSize: 13.5 }} />
          : <button onClick={() => setSearchOpen(true)} className="tm-tb" style={tb}>⌕ Search</button>}
        <button ref={filterRef} onClick={() => setPop('filter')} className="tm-tb" style={{ ...tb, background: roleFilter.length ? BRAND.selected : 'none' }}>⏷ Filter{roleFilter.length ? ` ·${roleFilter.length}` : ''}</button>
        {roleFilter.length > 0 && <button onClick={() => setRoleFilter([])} style={{ ...tb, color: BRAND.goldDark }}>Clear filters</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: BRAND.muted }}>{visible.length} {visible.length === 1 ? 'member' : 'members'}</span>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
        <div style={{ minWidth: totalW }}>
          {groups.map(g => {
            const isCol = collapsed.includes(g.role)
            return (
              <div key={g.role} style={{ marginBottom: 28 }}>
                <div style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'center', gap: 8, height: 38 }}>
                  <button onClick={() => setCollapsed(isCol ? collapsed.filter(x => x !== g.role) : [...collapsed, g.role])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: g.color, fontSize: 14, transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', padding: 0, width: 18 }}>⌄</button>
                  <span style={{ fontSize: 18, fontWeight: 500, color: g.color === '#A1B4C6' ? '#6C7A89' : g.color }}>{g.role}</span>
                  <span style={{ fontSize: 13, color: BRAND.muted }}>{g.items.length} {g.items.length === 1 ? 'member' : 'members'}</span>
                </div>
                {!isCol && <>
                  <div style={{ display: 'flex', height: 36, borderTop: `1px solid ${BRAND.rowBorder}`, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff' }}>
                    <div style={{ position: 'sticky', left: 0, zIndex: 2, display: 'flex', background: '#fff' }}>
                      <div style={{ width: 6, background: g.color, borderTopLeftRadius: 6 }} />
                      <div style={{ width: NAME_W, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, borderRight: `1px solid ${BRAND.rowBorder}`, boxShadow: '2px 0 3px -2px rgba(0,0,0,0.08)' }}>Member</div>
                    </div>
                    {COLS.map(c => <div key={c.key} style={{ width: c.width, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, borderRight: `1px solid ${BRAND.rowBorder}` }}>{c.title}</div>)}
                  </div>
                  {g.items.map(m => <Row key={m.id} m={m} color={g.color} roles={roles} propertyCount={propertyCount} onEdit={onEdit} onDelete={onDelete} onRoleChange={onRoleChange} />)}
                  <div style={{ display: 'flex', height: 36, borderBottom: `1px solid ${BRAND.rowBorder}` }}>
                    <div style={{ position: 'sticky', left: 0, display: 'flex', background: '#fff' }}>
                      <div style={{ width: 6, background: g.color, opacity: 0.5, borderBottomLeftRadius: 6 }} />
                      <button onClick={onInvite} style={{ width: NAME_W, border: 'none', background: 'none', textAlign: 'left', paddingLeft: 22, color: BRAND.muted, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>+ Invite member</button>
                    </div>
                  </div>
                </>}
              </div>
            )
          })}
          {groups.length === 0 && <div style={{ padding: '30px 0', color: BRAND.muted }}>No one matches that search.</div>}
        </div>
      </div>

      {pop === 'filter' && <Popover anchor={filterRef.current} onClose={() => setPop(null)} width={280} align="left">
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.muted, marginBottom: 4 }}>Role</div>
          {roles.map(r => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', fontSize: 13.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={roleFilter.includes(r)} onChange={() => setRoleFilter(roleFilter.includes(r) ? roleFilter.filter(x => x !== r) : [...roleFilter, r])} />
              <span style={{ width: 12, height: 12, borderRadius: 3, background: ROLE_COLORS[r] ?? '#C4C4C4' }} />{r}
              <span style={{ marginLeft: 'auto', color: BRAND.muted, fontSize: 12 }}>{all.filter(m => m.role === r).length}</span>
            </label>
          ))}
        </div>
      </Popover>}
    </div>
  )
}

function Row({ m, color, roles, propertyCount, onEdit, onDelete, onRoleChange }: { m: any; color: string; roles: string[]; propertyCount: number; onEdit: (m: any) => void; onDelete: (m: any) => void; onRoleChange: (m: any, role: string) => void }) {
  const roleRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const cell: React.CSSProperties = { flexShrink: 0, height: '100%', borderRight: `1px solid ${BRAND.rowBorder}`, display: 'flex', alignItems: 'center', fontSize: 13.5, boxSizing: 'border-box', overflow: 'hidden' }
  const mods: string[] = (m.custom_modules ?? []).filter((k: string) => !k.startsWith('sc:'))
  const access = m.you ? 'Everything' : mods.length ? mods.map(k => MOD_LABEL[k] ?? k).join(', ') : 'Role default'
  const props = m.you ? 'All' : (m.property_ids?.length ? `${m.property_ids.length} of ${propertyCount}` : 'All')
  const active = (m.status ?? 'Active') === 'Active'
  return (
    <div className="tm-row" style={{ display: 'flex', height: ROW_H, borderBottom: `1px solid ${BRAND.rowBorder}`, background: '#fff' }}>
      <div className="tm-sticky" style={{ position: 'sticky', left: 0, zIndex: 1, display: 'flex', background: '#fff' }}>
        <div style={{ width: 6, background: color }} />
        <div onClick={() => !m.you && onEdit(m)} style={{ ...cell, width: NAME_W, gap: 10, paddingLeft: 16, cursor: m.you ? 'default' : 'pointer', boxShadow: '2px 0 3px -2px rgba(0,0,0,0.08)' }}>
          <Avatar name={m.name || m.email} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email}</span>
          {m.you && <span style={{ fontSize: 11.5, color: BRAND.brown, background: BRAND.selected, border: '1px solid #EADBB8', borderRadius: 10, padding: '0 8px' }}>You</span>}
        </div>
      </div>
      <div ref={roleRef} onClick={() => !m.you && setOpen(true)} style={{ ...cell, width: COLS[0].width, padding: 1, cursor: m.you ? 'default' : 'pointer' }}>
        <Pill text={m.role} color={ROLE_COLORS[m.role] ?? '#C4C4C4'} />
      </div>
      <div style={{ ...cell, width: COLS[1].width, padding: '0 10px' }}>{m.email ? <a href={`mailto:${m.email}`} style={{ color: BRAND.goldDark, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</a> : ''}</div>
      <div style={{ ...cell, width: COLS[2].width, padding: '0 10px' }}>{m.phone ? <a href={`tel:${String(m.phone).replace(/\s/g, '')}`} style={{ color: BRAND.ink, textDecoration: 'none' }}>{m.phone}</a> : ''}</div>
      <div title={access} style={{ ...cell, width: COLS[3].width, padding: '0 10px', color: access === 'Role default' ? BRAND.muted : BRAND.ink, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{access}</div>
      <div style={{ ...cell, width: COLS[4].width, justifyContent: 'center', color: props === 'All' ? BRAND.muted : BRAND.ink }}>{props}</div>
      <div style={{ ...cell, width: COLS[5].width, padding: 1 }}><Pill text={m.status ?? 'Active'} color={active ? '#00C875' : '#FDAB3D'} /></div>
      <div style={{ ...cell, width: COLS[6].width, gap: 6, justifyContent: 'center' }}>
        {!m.you && <>
          <a href={`/staff-dashboard?staff_id=${m.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: BRAND.goldDark, textDecoration: 'none', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>View as</a>
          <button onClick={() => onEdit(m)} style={{ fontSize: 12.5, color: BRAND.ink, background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
          <button onClick={() => onDelete(m)} title="Remove" style={{ border: 'none', background: 'none', color: '#9699A6', cursor: 'pointer', fontSize: 16 }}>🗑</button>
        </>}
      </div>
      {open && (
        <Popover anchor={roleRef.current} onClose={() => setOpen(false)} width={230}>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {roles.map(r => (
              <button key={r} onClick={() => { setOpen(false); if (r !== m.role) onRoleChange(m, r) }} style={{ border: r === m.role ? `2px solid ${BRAND.ink}` : '2px solid transparent', borderRadius: 3, padding: 0, background: 'none', cursor: 'pointer', height: 32 }}>
                <Pill text={r} color={ROLE_COLORS[r] ?? '#C4C4C4'} />
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  )
}

export { menuItem }
