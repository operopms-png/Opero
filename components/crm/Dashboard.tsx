'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell as RCell } from 'recharts'
import type { Board, Column, Item, FileRef } from '@/lib/crm-board'
import { BRAND, colByKey, labelsOf, labelFor, fmtNumber, currencyOf, fmtDate, isImage } from '@/lib/crm-board'
import { Avatar } from './Cell'
import type { Crm } from './useCrm'

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
const cardHead: React.CSSProperties = { padding: '14px 20px', fontSize: 16, fontWeight: 500, color: BRAND.ink, borderBottom: `1px solid ${BRAND.rowBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const WON = '#A8862E'
const OPEN = '#1F76C2'

export default function Dashboard({ crm, onOpenItem, onOpenBoard }: { crm: Crm; onOpenItem: (id: string) => void; onOpenBoard: (id: string) => void }) {
  const props = crm.boards.find(b => b.kind === 'properties')
  const tx = crm.boards.find(b => b.kind === 'transactions')
  const contacts = crm.boards.find(b => b.kind === 'contacts')
  const [q, setQ] = useState('')

  const P = (k: string) => colByKey(crm.columns, props?.id, k)
  const T = (k: string) => colByKey(crm.columns, tx?.id, k)
  const propItems = crm.items.filter(i => i.board_id === props?.id && (!q || i.name.toLowerCase().includes(q.toLowerCase())))
  const txItems = crm.items.filter(i => i.board_id === tx?.id && (!q || i.name.toLowerCase().includes(q.toLowerCase())))
  const contactItems = crm.items.filter(i => i.board_id === contacts?.id)

  const pPrice = P('price'), pRenew = P('renewal_date'), pType = P('property_type'), pCtype = P('contract_type'), pAgent = P('agent'), pAddr = P('address'), pMedia = P('media')
  const tPrice = T('price'), tStatus = T('status'), tClose = T('close_date'), tComm = T('commission'), tAgent = T('agent')
  const cur = currencyOf(pPrice) || currencyOf(tPrice) || '£'

  const isClosed = (i: Item) => { const l = labelFor(tStatus, i.values?.[tStatus?.id ?? ''])?.label?.toLowerCase() ?? ''; return l.startsWith('closed') }
  const isWon = (i: Item) => (labelFor(tStatus, i.values?.[tStatus?.id ?? ''])?.label?.toLowerCase() ?? '') === 'closed won'

  const activeValue = pPrice ? propItems.reduce((a, i) => a + (Number(i.values?.[pPrice.id]) || 0), 0) : 0
  const in90 = Date.now() + 90 * 864e5
  const renewals = pRenew ? propItems.filter(i => { const d = i.values?.[pRenew.id]; if (!d) return false; const t = new Date(d + 'T00:00:00').getTime(); return t >= Date.now() - 864e5 && t <= in90 }) : []
  const openTx = txItems.filter(i => !isClosed(i))
  const pipeline = tPrice ? openTx.reduce((a, i) => a + (Number(i.values?.[tPrice.id]) || 0), 0) : 0
  const commissionWon = tComm ? txItems.filter(isWon).reduce((a, i) => a + (Number(i.values?.[tComm.id]) || 0), 0) : 0

  // Conversion funnel from Contacts → Type of contact
  const cType = colByKey(crm.columns, contacts?.id, 'contact_type')
  const funnel = cType ? labelsOf(cType).map(l => ({ name: l.label, count: contactItems.filter(i => i.values?.[cType.id] === l.id).length, color: l.color })).filter(f => f.count > 0) : []

  // Monthly deals (last 12 months by close date, else created date)
  const monthly = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, k) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + k, 1); return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), Won: 0, Open: 0 } })
    for (const i of txItems) {
      const d = (tClose && i.values?.[tClose.id]) || i.created_at?.slice(0, 10)
      const m = months.find(x => x.key === String(d).slice(0, 7))
      if (m) { if (isWon(i)) m.Won++; else if (!isClosed(i)) m.Open++ }
    }
    return months
  }, [txItems, tClose]) // eslint-disable-line react-hooks/exhaustive-deps

  // Team performance
  const team = useMemo(() => {
    const m = new Map<string, { name: string; deals: number; won: number; commission: number }>()
    for (const i of txItems) {
      const ppl: any[] = (tAgent && i.values?.[tAgent.id]) || []
      for (const p of ppl.length ? ppl : [{ id: '_', name: 'Unassigned' }]) {
        const r = m.get(p.id) ?? { name: p.name, deals: 0, won: 0, commission: 0 }
        r.deals++
        if (isWon(i)) { r.won++; r.commission += tComm ? Number(i.values?.[tComm.id]) || 0 : 0 }
        m.set(p.id, r)
      }
    }
    return [...m.values()].sort((a, b) => b.deals - a.deals)
  }, [txItems, tAgent, tComm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Files gallery
  const files = useMemo(() => {
    const out: { f: FileRef; item: Item; col: Column; board: Board }[] = []
    for (const c of crm.columns.filter(c => c.type === 'file')) {
      const b = crm.boards.find(b => b.id === c.board_id)
      if (!b) continue
      for (const i of crm.items) if (i.board_id === c.board_id) for (const f of (i.values?.[c.id] ?? []) as FileRef[]) out.push({ f, item: i, col: c, board: b })
    }
    return out
  }, [crm.columns, crm.items, crm.boards])
  const [fq, setFq] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Type to filter" style={{ height: 32, width: 220, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontFamily: 'inherit', fontSize: 13 }} />
        <span style={{ fontSize: 12.5, color: BRAND.muted }}>{[props, tx, contacts].filter(Boolean).length} connected boards</span>
      </div>

      {props && <div style={card}>
        <div style={cardHead}>Property portfolio map<span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 400 }}>{pAddr ? 'Pins come from each property’s Address' : 'Add a Location column called Address to Properties'}</span></div>
        <PortfolioMap crm={crm} items={propItems} addrCol={pAddr} onOpenItem={onOpenItem} priceCol={pPrice} />
      </div>}

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14 }}>
        {props && <div style={card}>
          <div style={cardHead}>Property portfolio cards<button onClick={() => onOpenBoard(props.id)} style={linkBtn}>Open board →</button></div>
          <div style={{ display: 'flex', gap: 12, padding: 12, overflowX: 'auto' }}>
            {propItems.map(i => {
              const img = pMedia ? ((i.values?.[pMedia.id] ?? []) as FileRef[]).find(isImage) : null
              const rows: [string, React.ReactNode][] = [
                ['Property type', pType && <Pill col={pType} v={i.values?.[pType.id]} />],
                ['Contract type', pCtype && <Pill col={pCtype} v={i.values?.[pCtype.id]} />],
                ['Agent', pAgent && ((i.values?.[pAgent.id] ?? []) as any[]).map(p => <Avatar key={p.id} p={p} size={22} />)],
                ['Renewal date', pRenew && fmtDate(i.values?.[pRenew.id])],
                ['Address', pAddr && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{i.values?.[pAddr.id]?.address ?? ''}</span>],
                ['Price', pPrice && fmtNumber(i.values?.[pPrice.id], currencyOf(pPrice))],
              ]
              return (
                <div key={i.id} onClick={() => onOpenItem(i.id)} style={{ width: 236, flexShrink: 0, border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, cursor: 'pointer', overflow: 'hidden' }}>
                  <div style={{ height: 120, background: img ? `url(${img.url}) center/cover` : '#F6F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C3C6D4', fontSize: 28 }}>{!img && '⌂'}</div>
                  <div style={{ padding: '10px 10px 4px', fontSize: 14, fontWeight: 500 }}>{i.name}</div>
                  {rows.filter(r => r[1] !== undefined && r[1] !== null).map(([k, v]) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12.5, color: BRAND.muted, minHeight: 26 }}>
                      <span>{k}</span><span style={{ color: BRAND.ink, minWidth: 0 }}>{v || ''}</span>
                    </div>
                  ))}
                  <div style={{ height: 8 }} />
                </div>
              )
            })}
            {!propItems.length && <div style={{ padding: 30, color: BRAND.muted }}>No properties yet.</div>}
          </div>
        </div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Stat title="Active properties value" value={fmtNumber(activeValue, cur) || `${cur}0`} sub={`${propItems.length} properties`} />
          <div style={card}>
            <div style={cardHead}>Upcoming renewals<span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 400 }}>next 90 days</span></div>
            <div style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 400, color: BRAND.ink }}>{renewals.length} {renewals.length === 1 ? 'property' : 'properties'}</div>
              {renewals.slice(0, 4).map(i => <div key={i.id} onClick={() => onOpenItem(i.id)} style={{ fontSize: 13, color: BRAND.muted, cursor: 'pointer', marginTop: 4 }}>{i.name} — {fmtDate(i.values?.[pRenew!.id])}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: '22px 0', textAlign: 'center', fontSize: 36, fontWeight: 600, color: BRAND.goldDark }}>Pipeline overview</div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <Stat title="Pipeline forecast value" value={fmtNumber(pipeline, currencyOf(tPrice) || cur) || `${cur}0`} sub="open deals" />
        <Stat title="Open transactions" value={`${openTx.length} ${openTx.length === 1 ? 'transaction' : 'transactions'}`} sub={tx ? <button onClick={() => onOpenBoard(tx.id)} style={linkBtn}>Open board →</button> : null} />
        <Stat title="Commission won" value={fmtNumber(commissionWon, currencyOf(tComm) || cur) || `${cur}0`} sub="closed won deals" />
      </div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 14 }}>
        <div style={card}>
          <div style={cardHead}>Conversion funnel<span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 400 }}>contacts by type</span></div>
          <div style={{ height: 280, padding: '16px 12px 8px' }}>
            {funnel.length ? (
              <ResponsiveContainer>
                <BarChart data={funnel} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} interval={0} angle={funnel.length > 5 ? -30 : 0} textAnchor={funnel.length > 5 ? 'end' : 'middle'} height={funnel.length > 5 ? 60 : 30} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(208,174,76,0.12)' }} formatter={(v: any) => [v, 'Contacts']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44} label={{ position: 'top', fontSize: 12, fill: BRAND.ink }}>
                    {funnel.map((f, k) => <RCell key={k} fill={WON} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty>Add a “Type of contact” status column to Contacts.</Empty>}
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>Monthly deals<span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 400 }}>last 12 months</span></div>
          <div style={{ height: 280, padding: '16px 12px 8px' }}>
            <ResponsiveContainer>
              <LineChart data={monthly} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF0F4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Won" name="Closed won" stroke={WON} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Open" name="Open" stroke={OPEN} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}>Team performance</div>
        {team.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ color: BRAND.muted, textAlign: 'left' }}>{['Agent', 'Deals', 'Closed won', 'Win rate', 'Commission won'].map(h => <th key={h} style={{ padding: '10px 20px', fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {team.map(r => (
                  <tr key={r.name}>
                    <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar p={{ id: r.name, name: r.name }} size={26} />{r.name}</span></td>
                    <td style={td}>{r.deals}</td>
                    <td style={td}>{r.won}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 90, height: 8, background: '#EEF0F4', borderRadius: 4, overflow: 'hidden', display: 'inline-block' }}><span style={{ display: 'block', height: '100%', width: `${r.deals ? (r.won / r.deals) * 100 : 0}%`, background: WON, borderRadius: 4 }} /></span>
                        {r.deals ? Math.round((r.won / r.deals) * 100) : 0}%
                      </span>
                    </td>
                    <td style={td}>{fmtNumber(r.commission, currencyOf(tComm) || cur) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Assign agents on the Transactions board to see team performance.</Empty>}
      </div>

      <div style={card}>
        <div style={cardHead}>Files gallery<input value={fq} onChange={e => setFq(e.target.value)} placeholder="Search for files" style={{ height: 30, width: 200, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontFamily: 'inherit', fontSize: 13 }} /></div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12.5, color: BRAND.muted, marginBottom: 10 }}>Showing {files.filter(x => x.f.name.toLowerCase().includes(fq.toLowerCase())).length} of {files.length} files</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {files.filter(x => x.f.name.toLowerCase().includes(fq.toLowerCase())).map((x, k) => (
              <a key={k} href={x.f.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: BRAND.ink }}>
                <div style={{ height: 110, borderRadius: 6, border: `1px solid ${BRAND.rowBorder}`, background: isImage(x.f) ? `url(${x.f.url}) center/cover` : '#F6F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.muted, fontWeight: 700 }}>{!isImage(x.f) && (x.f.name.split('.').pop() ?? '').toUpperCase().slice(0, 4)}</div>
                <div style={{ fontSize: 12.5, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.f.name}</div>
                <div style={{ fontSize: 11.5, color: BRAND.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.item.name} · {x.col.title}</div>
              </a>
            ))}
          </div>
          {!files.length && <Empty>Files you add to any board show up here.</Empty>}
        </div>
      </div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '10px 20px', borderBottom: `1px solid ${BRAND.rowBorder}`, color: BRAND.ink }
const linkBtn: React.CSSProperties = { border: 'none', background: 'none', color: BRAND.goldDark, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0 }

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 30, textAlign: 'center', color: BRAND.muted, fontSize: 13.5 }}>{children}</div>
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={cardHead}>{title}</div>
      <div style={{ padding: '26px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 500, color: BRAND.ink, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 8 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Pill({ col, v }: { col: Column; v: any }) {
  const l = labelFor(col, v)
  if (!l) return null
  return <span style={{ display: 'block', background: l.color, color: '#fff', textAlign: 'center', padding: '3px 6px', fontSize: 12, borderRadius: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span>
}

// Leaflet + OpenStreetMap, loaded from a CDN on first use
function PortfolioMap({ crm, items, addrCol, priceCol, onOpenItem }: { crm: Crm; items: Item[]; addrCol?: Column; priceCol?: Column; onOpenItem: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const layer = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const geocoding = useRef(false)

  useEffect(() => {
    const w = window as any
    if (w.L) { setReady(true); return }
    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link'); css.id = 'leaflet-css'; css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css)
    }
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = () => setReady(true); document.body.appendChild(s)
  }, [])

  // fill in missing coordinates (1 request per second, Nominatim's limit)
  useEffect(() => {
    if (!addrCol || geocoding.current) return
    const todo = items.filter(i => i.values?.[addrCol.id]?.address && i.values[addrCol.id].lat == null && !i.values[addrCol.id].geofail)
    if (!todo.length) return
    geocoding.current = true
    ;(async () => {
      for (const i of todo.slice(0, 25)) {
        const a = i.values[addrCol.id]
        const g = await crm.geocode(a.address)
        if (g === undefined) break // lookup service unreachable — try again next visit
        await crm.setValue(i.id, addrCol, g ? { ...a, ...g } : { ...a, geofail: true })
        await new Promise(r => setTimeout(r, 1100))
      }
      geocoding.current = false
    })()
  }, [items, addrCol]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const L = (window as any).L
    if (!ready || !L || !el.current) return
    if (!map.current) {
      // Jamaica
      const jm = L.latLngBounds([17.6, -78.5], [18.6, -76.1])
      map.current = L.map(el.current, { scrollWheelZoom: false, maxBounds: jm.pad(0.5), minZoom: 8 }).fitBounds(jm)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map.current)
      layer.current = L.layerGroup().addTo(map.current)
    }
    layer.current.clearLayers()
    const pts: [number, number][] = []
    for (const i of items) {
      const a = addrCol ? i.values?.[addrCol.id] : null
      if (a?.lat == null || a.lat < 17.4 || a.lat > 18.8 || a.lng < -78.6 || a.lng > -75.9) continue
      pts.push([a.lat, a.lng])
      const icon = L.divIcon({ className: '', html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${BRAND.goldDark};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`, iconSize: [26, 26], iconAnchor: [13, 26] })
      const m = L.marker([a.lat, a.lng], { icon }).addTo(layer.current)
      const price = priceCol && i.values?.[priceCol.id] != null ? ` · ${fmtNumber(i.values[priceCol.id], currencyOf(priceCol))}` : ''
      m.bindTooltip(`<b>${i.name.replace(/</g, '&lt;')}</b>${price}<br/>${String(a.address).replace(/</g, '&lt;')}`)
      m.on('click', () => onOpenItem(i.id))
    }
    const inJm = pts.filter(([la, ln]) => la > 17.4 && la < 18.8 && ln > -78.6 && ln < -75.9)
    if (inJm.length === 1) map.current.setView(inJm[0], 13)
    else if (inJm.length > 1) map.current.fitBounds(inJm, { padding: [40, 40], maxZoom: 13 })
  }, [ready, items, addrCol, priceCol, onOpenItem])

  return <div ref={el} style={{ height: 380, background: '#EEF0F4' }} />
}
