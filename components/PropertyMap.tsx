'use client'
// Interactive street map of every property and found deal, coloured by status.
// Data comes from /api/property-map. Used full size on Real Estate Intelligence → Map, and compact on the dashboards.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import BuildingFloors from '@/components/BuildingFloors'
import PropertyMap3D from '@/components/PropertyMap3D'

type Status = 'let' | 'vac' | 'arr' | 'cert' | 'deal'
type Item = { id: string; source: string; name: string; address: string; country: string; lat: number | null; lng: number | null; status: Status; facts: { label: string; value: string }[]; href: string; url?: string; building?: { source: 'pm' | 'estate'; id: string; name: string } }
const LINE = '#D9E2F0', NAVY = '#1B2F6E', MUTED = '#667085', TXT = '#101828', BLUE = '#2F6DB5'
const ST: Record<Status, { label: string; color: string }> = {
  let: { label: 'Let', color: '#0E7C55' }, vac: { label: 'Vacant', color: '#2F6DB5' },
  arr: { label: 'Rent behind', color: '#B42318' }, cert: { label: 'Certificate due', color: '#C98A00' }, deal: { label: 'Deal found', color: '#7A3FB0' },
}
const ORDER: Status[] = ['let', 'vac', 'arr', 'cert', 'deal']
const REGIONS: { key: string; label: string; test: RegExp }[] = [
  { key: 'all', label: 'All', test: /./ }, { key: 'uk', label: 'UK', test: /united kingdom|^uk$|england|scotland|wales/i },
  { key: 'jam', label: 'Jamaica', test: /jamaica/i },
]

export default function PropertyMap({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [unplaced, setUnplaced] = useState(0)
  const [err, setErr] = useState('')
  const [on, setOn] = useState<Record<Status, boolean>>({ let: true, vac: true, arr: true, cert: true, deal: true })
  const [region, setRegion] = useState('all')
  const [sel, setSel] = useState<Item | null>(null)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [tower, setTower] = useState<{ source: 'pm' | 'estate'; id: string } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const layer = useRef<any>(null)
  const LRef = useRef<any>(null)
  const fitted = useRef('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/property-map', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(d.error || 'Could not load the map'); setItems([]); return }
      setItems(d.items ?? []); setUnplaced(d.unplaced ?? 0)
    })().catch(() => { setErr('Could not load the map'); setItems([]) })
  }, [])

  const shown = useMemo(() => (items ?? []).filter(i => on[i.status] && i.lat != null && i.lng != null && REGIONS.find(r => r.key === region)!.test.test(i.country || (i.status === 'deal' ? 'x' : ''))), [items, on, region])
  const counts = useMemo(() => { const c: Record<string, number> = {}; (items ?? []).forEach(i => { c[i.status] = (c[i.status] || 0) + 1 }); return c }, [items])

  // Draw the map once, then redraw the pins whenever the filters or data change
  useEffect(() => {
    if (items === null || !box.current) return
    let dead = false
    ;(async () => {
      const L = (LRef.current ??= (await import('leaflet')).default)
      if (dead || !box.current) return
      if (!map.current) {
        map.current = L.map(box.current, { scrollWheelZoom: false, zoomControl: true }).setView([30, 0], 2)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current)
        layer.current = L.layerGroup().addTo(map.current)
        map.current.on('click', () => setSel(null))
      }
      layer.current.clearLayers()
      shown.forEach(i => {
        const c = ST[i.status].color
        const shape = i.status === 'deal'
          ? `<div style="width:18px;height:18px;background:${c};border:2px solid #fff;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`
          : `<div style="width:18px;height:18px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`
        const m = L.marker([i.lat!, i.lng!], { icon: L.divIcon({ html: shape, className: '', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: true, title: i.name })
        m.on('click', (e: any) => { L.DomEvent.stopPropagation(e); setSel(i) })
        m.addTo(layer.current)
      })
      const sig = region + ':' + shown.map(s => s.id).join(',')
      if (shown.length && fitted.current !== sig) {
        fitted.current = sig
        const b = L.latLngBounds(shown.map(s => [s.lat!, s.lng!]))
        map.current.fitBounds(b, { padding: [50, 50], maxZoom: 15 })
      }
      setTimeout(() => map.current?.invalidateSize(), 50)
    })()
    return () => { dead = true }
  }, [items, shown, region])
  useEffect(() => () => { map.current?.remove(); map.current = null }, [])

  const selOk = sel && shown.some(s => s.id === sel.id) ? sel : null
  const h = compact ? 340 : 560

  const panel = selOk ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.09em', textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{selOk.status === 'deal' ? 'Deal' : 'Property'}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>{selOk.name}</div>
      {selOk.address && <div style={{ fontSize: 13, color: MUTED }}>{selOk.address}</div>}
      <span style={{ alignSelf: 'flex-start', background: ST[selOk.status].color, color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{ST[selOk.status].label}</span>
      <div>{selOk.facts.map(f => (
        <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, padding: '7px 0', borderTop: `1px solid ${LINE}` }}>
          <span style={{ color: MUTED }}>{f.label}</span><span style={{ fontWeight: 600, textAlign: 'right', color: TXT }}>{f.value}</span>
        </div>))}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={selOk.href} style={btn}>{selOk.status === 'deal' ? 'Open Deal Analyser' : 'Open property'}</Link>
        {selOk.building && !compact && <button type="button" onClick={() => setTower({ source: selOk.building!.source, id: selOk.building!.id })} style={{ ...btn, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600 }}>View floors</button>}
        {selOk.building && compact && <Link href="/property/map" style={btn}>Open map for floors</Link>}
        {selOk.url && <a href={selOk.url} target="_blank" rel="noopener noreferrer" style={btn}>View listing</a>}
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>Click a pin or pick a property to see its tenant, rent, repairs and certificates. Purple diamonds are deals Novourq Cloud AI has found.</p>
      <div style={{ maxHeight: h - 90, overflowY: 'auto' }}>
        {shown.map(i => (
          <button key={i.id} type="button" onClick={() => setSel(i)} style={{ font: 'inherit', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', border: 0, borderTop: `1px solid ${LINE}`, background: 'none', cursor: 'pointer', color: TXT, fontSize: 13.5 }}>
            <span style={{ width: 10, height: 10, flex: 'none', borderRadius: i.status === 'deal' ? 2 : '50%', background: ST[i.status].color }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
            <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 12 }}>{ST[i.status].label}</span>
          </button>))}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${LINE}` }}>
        {compact && <b style={{ fontSize: 14, color: TXT, marginRight: 6 }}>Property map</b>}
        {ORDER.map(k => (
          <button key={k} type="button" aria-pressed={on[k]} onClick={() => setOn(o => ({ ...o, [k]: !o[k] }))}
            style={{ font: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 20, border: `1px solid ${LINE}`, background: '#fff', color: TXT, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: on[k] ? 1 : .45 }}>
            <span style={{ width: 10, height: 10, borderRadius: k === 'deal' ? 2 : '50%', background: ST[k].color, transform: k === 'deal' ? 'rotate(45deg)' : undefined }} />{ST[k].label} ({counts[k] ?? 0})
          </button>))}
        <span style={{ flex: 1 }} />
        {REGIONS.map(r => (
          <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)}
            style={{ font: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 20, border: `1px solid ${region === r.key ? '#89CFF0' : LINE}`, background: region === r.key ? '#E3F4FC' : '#fff', color: region === r.key ? NAVY : MUTED, cursor: 'pointer' }}>{r.label}</button>))}
        {!compact && (['2d', '3d'] as const).map(v => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); if (v === '2d') setTimeout(() => map.current?.invalidateSize(), 60) }}
            style={{ font: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: `1px solid ${view === v ? NAVY : LINE}`, background: view === v ? NAVY : '#fff', color: view === v ? '#fff' : NAVY, cursor: 'pointer' }}>{v === '2d' ? 'Map' : '3D'}</button>))}
        {compact && <Link href="/property/map" style={{ ...btn, padding: '6px 12px', fontSize: 12.5 }}>Open full map</Link>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'minmax(0,1fr)' : 'minmax(0,1.8fr) minmax(260px,1fr)' }} className={compact ? undefined : 'pmap-grid'}>
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div ref={box} style={{ height: h, background: '#E9EEF6', zIndex: 0, display: view === '2d' ? 'block' : 'none' }} aria-label="Map of your properties" />
          {!compact && <PropertyMap3D items={shown} selectedId={selOk?.id ?? null} onSelect={id => setSel(shown.find(x => x.id === id) ?? null)} height={h} visible={view === '3d'} />}
          {items === null && <Overlay>Loading your properties…</Overlay>}
          {items !== null && err && <Overlay>{err}</Overlay>}
          {items !== null && !err && shown.length === 0 && <Overlay>{(items ?? []).length === 0 ? 'No properties yet. Add one and it appears here.' : 'Nothing to show with these filters.'}</Overlay>}
        </div>
        {!compact && <div style={{ padding: 16, borderLeft: `1px solid ${LINE}`, minWidth: 0 }} className="pmap-side">{panel}</div>}
      </div>
      {compact && selOk && <div style={{ padding: 14, borderTop: `1px solid ${LINE}` }}>{panel}</div>}
      {unplaced > 0 && <div style={{ padding: '9px 14px', borderTop: `1px solid ${LINE}`, fontSize: 12.5, color: MUTED }}>{unplaced} {unplaced === 1 ? 'property is' : 'properties are'} not on the map yet. Positions are looked up from each address; reload in a minute and more appear. Check the address if one stays missing.</div>}
      <style>{`.leaflet-container{font-family:inherit}@media (max-width:760px){.pmap-grid{grid-template-columns:minmax(0,1fr)!important}.pmap-side{border-left:0!important;border-top:1px solid ${LINE}}}`}</style>
    </div>
    {tower && !compact && <BuildingFloors source={tower.source} id={tower.id} onClose={() => setTower(null)} />}
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(247,248,250,.85)', color: MUTED, fontSize: 13.5, textAlign: 'center', padding: 16, pointerEvents: 'none' }}>{children}</div>
}
const btn: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${LINE}`, color: BLUE, background: '#EAF3FC', textDecoration: 'none' }
