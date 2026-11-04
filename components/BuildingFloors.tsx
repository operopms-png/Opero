'use client'
// Floor-by-floor view of one building: every flat is a block, coloured by status, stacked by floor.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FlatPlanEditor from '@/components/FlatPlanEditor'
import FlatViewer3D from '@/components/FlatViewer3D'
import { sanitizeLayout } from '@/lib/flat-layout'

type U = { id: string; unit: string; status: 'let' | 'vac' | 'arr' | 'avail' | 'res' | 'sold'; rent: string; tenant: string; detail: string; planUrl?: string | null; layout?: any }
type D = { name: string; address: string; floors: { floor: number | null; units: U[] }[]; totals: Record<string, number>; certs: string[] }
const LINE = '#D9E2F0', MUTED = '#667085', TXT = '#101828', NAVY = '#1B2F6E'
const ST = { let: { label: 'Let', color: '#0E7C55' }, vac: { label: 'Vacant', color: '#2F6DB5' }, arr: { label: 'Rent behind', color: '#B42318' }, avail: { label: 'Available', color: '#2F6DB5' }, res: { label: 'Reserved or exchanged', color: '#C98A00' }, sold: { label: 'Sold', color: '#0E7C55' } } as const
type K = keyof typeof ST

export default function BuildingFloors({ source, id, onClose }: { source: 'pm' | 'estate' | 'dev'; id: string; onClose: () => void }) {
  const [d, setD] = useState<D | null>(null)
  const [err, setErr] = useState('')
  const [only, setOnly] = useState<K | null>(null)
  const [sel, setSel] = useState<U | null>(null)
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    setD(null); setErr(''); setSel(null)
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/property-map/floors?source=${source}&building=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Could not load this building'); return }
      setD(j)
    })().catch(() => setErr('Could not load this building'))
  }, [source, id])

  const g = useMemo(() => {
    if (!d) return null
    const W = 86, H = 36, dx = 56, dy = -30, cols = Math.max(1, ...d.floors.map(f => f.units.length)), rows = d.floors.length
    const ox = 74, oy = 44 - dy
    return { W, H, dx, dy, cols, rows, ox, oy, vw: ox + cols * W + dx + 16, vh: oy + rows * H + 20 }
  }, [d])

  const total = d ? Object.values(d.totals).reduce((a, b) => a + b, 0) : 0
  const dev = source === 'dev'
  return (
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: '#2F6DB5', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div><div style={{ fontWeight: 700, fontSize: 14 }}>{d?.name ?? 'Building'} floors</div><div style={{ fontSize: 12.5, opacity: .9 }}>{d ? `${d.floors.length} ${d.floors.length === 1 ? 'floor' : 'floors'}, ${total} flats${d.address ? `, ${d.address}` : ''}` : 'Loading'}</div></div>
        <button type="button" onClick={onClose} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.6)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Close</button>
      </div>
      {err && <p style={{ padding: 16, margin: 0, color: MUTED, fontSize: 13.5 }}>{err}</p>}
      {!d && !err && <p style={{ padding: 16, margin: 0, color: MUTED, fontSize: 13.5 }}>Loading flats…</p>}
      {d && g && total === 0 && <p style={{ padding: 16, margin: 0, color: MUTED, fontSize: 13.5 }}>{dev ? 'No units are saved against this project yet. Add units in Development, Units, and they appear here.' : 'No flats are saved against this building yet. Add flats to the building and they appear here.'}</p>}
      {d && g && total > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 14px', borderBottom: `1px solid ${LINE}` }}>
            {(Object.keys(ST) as K[]).filter(k => (d.totals[k] || 0) > 0).map(k => (
              <button key={k} type="button" aria-pressed={!only || only === k} onClick={() => setOnly(only === k ? null : k)}
                style={{ font: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 20, border: `1px solid ${LINE}`, background: '#fff', color: TXT, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: !only || only === k ? 1 : .45 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: ST[k].color }} />{ST[k].label} ({d.totals[k]})
              </button>))}
            {d.certs.length > 0 && <span style={{ fontSize: 12.5, color: '#9A6700', fontWeight: 600, alignSelf: 'center' }}>Building certificates: {d.certs.join(', ')}</span>}
          </div>
          <div className="bf-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(240px,1fr)' }}>
            <div style={{ padding: 12, background: '#F3F6FA', minWidth: 0, overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${g.vw} ${g.vh}`} style={{ width: '100%', minWidth: Math.min(g.vw, 420), height: 'auto', display: 'block' }} role="img" aria-label={`${d.name}: ${total} flats by floor`}>
                <polygon points={`${g.ox},${g.oy} ${g.ox + g.dx},${g.oy + g.dy} ${g.ox + g.cols * g.W + g.dx},${g.oy + g.dy} ${g.ox + g.cols * g.W},${g.oy}`} fill="#C9D3E3" stroke="#fff" />
                {d.floors.map((f, row) => (
                  <g key={String(f.floor)}>
                    <text x={g.ox - 10} y={g.oy + row * g.H + g.H / 2 + 4} fontSize="11" textAnchor="end" fill={MUTED}>{f.floor == null ? 'Floor ?' : f.floor === 0 ? 'Ground' : `Floor ${f.floor}`}</text>
                    {f.units.map((u, c) => {
                      const dim = only && only !== u.status
                      return (
                        <g key={u.id} tabIndex={0} role="button" aria-label={`Flat ${u.unit}, ${ST[u.status].label}`} opacity={dim ? .18 : 1} style={{ cursor: 'pointer', outline: 'none' }}
                          onClick={() => setSel(u)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(u) } }}>
                          <rect x={g.ox + c * g.W} y={g.oy + row * g.H} width={g.W - 2} height={g.H - 2} fill={ST[u.status].color} stroke={sel?.id === u.id ? TXT : '#fff'} strokeWidth={sel?.id === u.id ? 3 : 1} />
                          <text x={g.ox + c * g.W + g.W / 2 - 1} y={g.oy + row * g.H + 14} fontSize="11" fontWeight="700" textAnchor="middle" fill="#fff" style={{ pointerEvents: 'none' }}>{u.unit.length > 9 ? u.unit.slice(0, 8) + '…' : u.unit}</text>
                          <text x={g.ox + c * g.W + g.W / 2 - 1} y={g.oy + row * g.H + 27} fontSize="10.5" textAnchor="middle" fill="#fff" style={{ pointerEvents: 'none' }}>{u.status === 'vac' ? (u.rent ? `${u.rent} ask` : 'Vacant') : u.rent || ' '}{u.layout ? ' ●' : ''}</text>
                        </g>
                      )
                    })}
                  </g>
                ))}
                <polygon points={`${g.ox + g.cols * g.W},${g.oy} ${g.ox + g.cols * g.W + g.dx},${g.oy + g.dy} ${g.ox + g.cols * g.W + g.dx},${g.oy + g.dy + g.rows * g.H} ${g.ox + g.cols * g.W},${g.oy + g.rows * g.H}`} fill="#B6C2D8" stroke="#fff" />
              </svg>
            </div>
            <div style={{ padding: 16, borderLeft: `1px solid ${LINE}`, minWidth: 0 }} className="bf-side">
              {sel ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11.5, letterSpacing: '.09em', textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>Flat</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>{sel.unit}</div>
                  <span style={{ alignSelf: 'flex-start', background: ST[sel.status].color, color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{ST[sel.status].label}</span>
                  {(dev ? [['Buyer', sel.tenant || 'None yet'], ['Price', sel.rent || 'Not set'], ['Details', sel.detail]] : [['Tenant', sel.status === 'vac' ? 'None' : sel.tenant || 'Not recorded'], ['Rent', sel.rent || 'Not recorded'], ['Status', sel.detail]]).map(([a, b]) => (
                    <div key={a} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, padding: '7px 0', borderTop: `1px solid ${LINE}` }}><span style={{ color: MUTED }}>{a}</span><span style={{ fontWeight: 600, textAlign: 'right', color: TXT }}>{b}</span></div>
                  ))}
                  {sel.planUrl && !/\.pdf($|\?)/i.test(sel.planUrl) && <a href={sel.planUrl} target="_blank" rel="noopener noreferrer"><img src={sel.planUrl} alt={`Floor plan of flat ${sel.unit}`} style={{ width: '100%', maxHeight: 180, objectFit: 'contain', border: `1px solid ${LINE}`, borderRadius: 8, background: '#fff' }} /></a>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sel.layout && <button type="button" onClick={() => setViewing(true)} style={pbtn(true)}>View in 3D and walk</button>}
                    <button type="button" onClick={() => setEditing(true)} style={pbtn()}>{sel.layout || sel.planUrl ? 'Edit floor plan' : 'Add floor plan'}</button>
                  </div>
                </div>
              ) : <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>Click a flat to see its tenant, rent and status. The top row is the top floor. Floors come from each flat's number (for example 3B is floor 3).</p>}
            </div>
          </div>
        </>
      )}
      {editing && sel && <FlatPlanEditor source={source} unit={sel} onClose={() => setEditing(false)} onSaved={p => {
        const next = { ...sel, ...(p.planUrl !== undefined ? { planUrl: p.planUrl } : {}), ...(p.layout !== undefined ? { layout: p.layout } : {}) }
        setSel(next); setD(x => x && { ...x, floors: x.floors.map(f => ({ ...f, units: f.units.map(u => (u.id === next.id ? next : u)) })) })
      }} />}
      {viewing && sel?.layout && sanitizeLayout(sel.layout) && <FlatViewer3D layout={sanitizeLayout(sel.layout)!} building={d?.name} title={`${d?.name ?? 'Building'}, flat ${sel.unit}`} onClose={() => setViewing(false)} />}
      <style>{`@media (max-width:760px){.bf-grid{grid-template-columns:minmax(0,1fr)!important}.bf-side{border-left:0!important;border-top:1px solid ${LINE}}}`}</style>
    </div>
  )
}

const pbtn = (primary = false): React.CSSProperties => ({ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${primary ? NAVY : LINE}`, background: primary ? NAVY : '#EAF3FC', color: primary ? '#fff' : '#2F6DB5', cursor: 'pointer' })
