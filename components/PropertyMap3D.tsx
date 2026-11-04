'use client'
// 3D city view: real buildings raised from OpenStreetMap data (served free by OpenFreeMap), with each of your
// properties raised in its status colour. Drag to pan, right-drag or two fingers to tilt and rotate.
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

type Item = { id: string; name: string; lat: number | null; lng: number | null; status: 'let' | 'vac' | 'arr' | 'cert' | 'deal' }
const COLOR = { let: '#0E7C55', vac: '#2F6DB5', arr: '#B42318', cert: '#C98A00', deal: '#7A3FB0' }

export default function PropertyMap3D({ items, selectedId, onSelect, height, visible }: { items: Item[]; selectedId: string | null; onSelect: (id: string) => void; height: number; visible: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const lib = useRef<any>(null)
  const markers = useRef<any[]>([])
  const fitted = useRef('')
  const [ready, setReady] = useState(false)
  const latest = useRef({ items, onSelect })
  latest.current = { items, onSelect }

  useEffect(() => {
    if (!visible || map.current || !box.current) return
    let dead = false
    ;(async () => {
      const ml = (lib.current ??= await import('maplibre-gl').then((x: any) => x.default ?? x))
      if (dead || !box.current) return
      const m = new ml.Map({ container: box.current, style: 'https://tiles.openfreemap.org/styles/liberty', center: [-1.5, 53], zoom: 5, pitch: 60, bearing: -20, maxPitch: 75, attributionControl: { compact: true } })
      map.current = m
      m.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right')
      m.on('load', () => {
        m.addSource('ours', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        m.addLayer({ id: 'ours-3d', type: 'fill-extrusion', source: 'ours', minzoom: 13, paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 0.95 } })
        m.on('idle', () => raise())
        setReady(true)
      })
    })()
    return () => { dead = true }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { markers.current.forEach(x => x.remove()); map.current?.remove(); map.current = null }, [])

  // Raise each property's own building in its status colour, using the building shape under its pin
  function raise() {
    const m = map.current; if (!m || !m.getSource('ours') || m.getZoom() < 14.5) return
    const feats: any[] = [], seen = new Set<string>()
    for (const it of latest.current.items) {
      if (it.lat == null || it.lng == null) continue
      const p = m.project([it.lng, it.lat])
      const hit = m.queryRenderedFeatures([[p.x - 5, p.y - 5], [p.x + 5, p.y + 5]], { layers: ['building-3d'] })[0]
      if (!hit || !hit.geometry) continue
      const key = it.id
      if (seen.has(key)) continue
      seen.add(key)
      feats.push({ type: 'Feature', properties: { c: COLOR[it.status], h: Number(hit.properties?.render_height ?? 10) + 1, b: Number(hit.properties?.render_min_height ?? 0) }, geometry: hit.geometry })
    }
    const sig = feats.length + ':' + feats.map(f => f.properties.c).join('')
    if ((m as any)._oursSig === sig) return
    ;(m as any)._oursSig = sig
    m.getSource('ours').setData({ type: 'FeatureCollection', features: feats })
  }

  function draw() {
    const m = map.current, ml = lib.current; if (!m || !ml) return
    markers.current.forEach(x => x.remove()); markers.current = []
    const pts = items.filter(i => i.lat != null && i.lng != null)
    pts.forEach(i => {
      const el = document.createElement('button')
      el.type = 'button'; el.title = i.name; el.setAttribute('aria-label', i.name)
      el.style.cssText = `width:${i.id === selectedId ? 24 : 18}px;height:${i.id === selectedId ? 24 : 18}px;border-radius:${i.status === 'deal' ? '3px' : '50%'};${i.status === 'deal' ? 'transform:rotate(45deg);' : ''}background:${COLOR[i.status]};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.5);cursor:pointer;padding:0`
      el.onclick = e => { e.stopPropagation(); latest.current.onSelect(i.id) }
      markers.current.push(new ml.Marker({ element: el, pitchAlignment: 'map' }).setLngLat([i.lng!, i.lat!]).addTo(m))
    })
    const sig = pts.map(p => p.id).join(',')
    if (pts.length && fitted.current !== sig) {
      fitted.current = sig
      const lats = pts.map(p => p.lat!), lngs = pts.map(p => p.lng!)
      const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs))
      if (span < 0.15) {
        const b = new ml.LngLatBounds()
        pts.forEach(p => b.extend([p.lng!, p.lat!]))
        m.fitBounds(b, { padding: 90, maxZoom: 16.5, pitch: 62, bearing: -20, duration: 900 })
      } else {
        // Spread across a region: street level only works close up, so start at the first property
        m.flyTo({ center: [pts[0].lng!, pts[0].lat!], zoom: 16.5, pitch: 62, bearing: -20, duration: 1200 })
      }
    }
  }
  useEffect(() => { if (ready) { draw(); (map.current as any)._oursSig = ''; setTimeout(raise, 1500) } }, [ready, items, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current; const it = items.find(i => i.id === selectedId)
    if (ready && m && it && it.lat != null && it.lng != null) m.flyTo({ center: [it.lng, it.lat], zoom: 17, pitch: 65, duration: 1200 })
  }, [selectedId, ready]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (visible) setTimeout(() => map.current?.resize(), 60) }, [visible])

  return <div ref={box} style={{ height, background: '#E9EEF6', display: visible ? 'block' : 'none' }} aria-label="3D map of your properties" />
}
