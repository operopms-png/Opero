'use client'
// 3D site view: ground coloured by slope, trees, pads with houses, labelled callouts.
// Drag to turn, scroll to zoom. `month` / `phases` drive the "watch it build" slider.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { type Grid, type Pad, at, cellSize, heightAt } from '@/lib/dev-terrain'

export type PadRow = Pad & { level: number; cut: number; fill: number }
export type Phases = { approvals: number; works: number; buildStart: number; build: number; sellStart: number; sell: number }
export type Preset = 'angle' | 'pads' | 'creek' | 'top' | 'side'

export const SLOPE_BANDS = [
  { max: 3, color: '#3f9b4b', label: 'under 3%' }, { max: 5, color: '#a7c63e', label: '3 to 5%' },
  { max: 8, color: '#f2d04a', label: '5 to 8%' }, { max: 12, color: '#ee8a2e', label: '8 to 12%' }, { max: 1e9, color: '#c8321f', label: 'over 12%' },
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const money = (n: number) => Math.round(n).toLocaleString()

export default function TerrainView({ grid, pads, exaggeration = 2, height = 520, preset = 'angle', month = 0, months = 1, phases, withHouses = true, trees = true }: {
  grid: Grid; pads: PadRow[]; exaggeration?: number; height?: number; preset?: Preset; month?: number; months?: number; phases?: Phases; withHouses?: boolean; trees?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef({ month, months, phases })
  live.current = { month, months, phases }
  const api = useRef<{ update: () => void } | null>(null)

  useEffect(() => {
    const el = host.current; if (!el) return
    const w = el.clientWidth || 800, h = height
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h); renderer.setClearColor(0xe9eef0)
    el.innerHTML = ''; el.style.position = 'relative'; el.appendChild(renderer.domElement)
    const labelBox = document.createElement('div'); labelBox.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'; el.appendChild(labelBox)

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, w / h, 1, 6000)
    const S = grid.size, k = S / 320
    let zMin = Infinity, zMax = -Infinity
    for (const v of grid.z) { zMin = Math.min(zMin, v); zMax = Math.max(zMax, v) }
    const range = Math.max(0.5, zMax - zMin)
    const zs = (v: number) => (v - zMin) * exaggeration
    const wx = (x: number) => x - S / 2, wz = (y: number) => y - S / 2

    // ground, finer than the data, coloured by slope in hard bands
    const R = 140
    const geo = new THREE.PlaneGeometry(S, S, R, R); geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const bandCols = SLOPE_BANDS.map(b => new THREE.Color(b.color))
    const wet = new THREE.Color('#3f86c4')
    const slopeAt = (x: number, y: number) => { const e = S / R * 1.5; const dx = (heightAt(grid, x + e, y) - heightAt(grid, x - e, y)) / (2 * e), dy = (heightAt(grid, x, y + e) - heightAt(grid, x, y - e)) / (2 * e); return Math.hypot(dx, dy) * 100 }
    for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) {
      const idx = j * (R + 1) + i, x = (i / R) * S, y = (j / R) * S
      const v = heightAt(grid, x, y)
      pos.setXYZ(idx, wx(x), zs(v), wz(y))
      const sl = slopeAt(x, y)
      const b = SLOPE_BANDS.findIndex(bb => sl < bb.max)
      const c = (v - zMin) / range < 0.07 ? wet : bandCols[b]
      col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals()
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })))
    const slab = new THREE.Mesh(new THREE.BoxGeometry(S, 2, S), new THREE.MeshLambertMaterial({ color: 0xcfd6dc })); slab.position.set(0, -1.2, 0); scene.add(slab)

    // site boundary
    const bp: THREE.Vector3[] = []; const inset = 10 * k
    const edgePt = (x: number, y: number) => new THREE.Vector3(wx(x), zs(heightAt(grid, x, y)) + 0.6, wz(y))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(inset + t * (S - 2 * inset), inset))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(S - inset, inset + t * (S - 2 * inset)))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(S - inset - t * (S - 2 * inset), S - inset))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(inset, S - inset - t * (S - 2 * inset)))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bp), new THREE.LineBasicMaterial({ color: 0xffffff })))

    // pads and houses (grown by the build slider)
    const padMeshes: { slab: THREE.Mesh; house?: THREE.Group; row: PadRow }[] = []
    for (const p of pads) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(p.w, 1.2, p.d), new THREE.MeshLambertMaterial({ color: 0xf4d35e }))
      s.position.set(wx(p.x + p.w / 2), zs(p.level) + 0.3, wz(p.y + p.d / 2)); scene.add(s)
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(s.geometry), new THREE.LineBasicMaterial({ color: 0x8a6a00 })); edge.position.copy(s.position); s.add(edge); edge.position.set(0, 0, 0)
      let house: THREE.Group | undefined
      if (withHouses) {
        house = new THREE.Group()
        const hw = Math.min(p.w * 0.62, 24), hd = Math.min(p.d * 0.5, 14), hh = 7
        const body = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), new THREE.MeshLambertMaterial({ color: 0xf2eee6 })); body.position.y = hh / 2
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(hw, hd) * 0.78, 4.2, 4), new THREE.MeshLambertMaterial({ color: 0x8c8479 })); roof.rotation.y = Math.PI / 4; roof.scale.set(hw / Math.max(hw, hd), 1, hd / Math.max(hw, hd)); roof.position.y = hh + 2.1
        house.add(body, roof); house.position.set(s.position.x, s.position.y + 0.6, s.position.z); scene.add(house)
      }
      padMeshes.push({ slab: s, house, row: p })
    }

    // trees: seeded so they stay put, kept off the pads, steep ground and the creek
    if (trees) {
      let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
      const trunkG = new THREE.CylinderGeometry(0.5 * k, 0.6 * k, 4 * k, 6), crownG = new THREE.IcosahedronGeometry(3.3 * k, 1)
      const trunkM = new THREE.MeshLambertMaterial({ color: 0xb9a98f })
      const nT = 170, trunks = new THREE.InstancedMesh(trunkG, trunkM, nT), crowns = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: 0xffffff }), nT)
      let n = 0; const m4 = new THREE.Matrix4(), cc = new THREE.Color()
      for (let tries = 0; tries < 2000 && n < nT; tries++) {
        const x = rnd() * (S - 2 * inset) + inset, y = rnd() * (S - 2 * inset) + inset, v = heightAt(grid, x, y)
        if ((v - zMin) / range < 0.1 || slopeAt(x, y) > 22) continue
        if (pads.some(p => x > p.x - 8 && x < p.x + p.w + 8 && y > p.y - 8 && y < p.y + p.d + 8)) continue
        const sc = 0.8 + rnd() * 0.7, base = zs(v)
        m4.compose(new THREE.Vector3(wx(x), base + 2 * k * sc, wz(y)), new THREE.Quaternion(), new THREE.Vector3(sc, sc, sc)); trunks.setMatrixAt(n, m4)
        m4.compose(new THREE.Vector3(wx(x), base + 6.2 * k * sc, wz(y)), new THREE.Quaternion(), new THREE.Vector3(sc, sc, sc)); crowns.setMatrixAt(n, m4)
        cc.set(rnd() > 0.45 ? '#9bb84a' : '#5d8a4f'); crowns.setColorAt(n, cc); n++
      }
      trunks.count = n; crowns.count = n; scene.add(trunks, crowns)
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(-S * 0.8, S, S * 0.6); scene.add(sun)

    // callouts
    type L = { el: HTMLDivElement; p: THREE.Vector3 }
    const labels: L[] = []
    const addLabel = (title: string, body: string, p: THREE.Vector3) => {
      const d = document.createElement('div')
      d.style.cssText = 'position:absolute;left:0;top:0;background:rgba(255,253,248,.95);border:1px solid #e3ddcf;border-radius:7px;padding:6px 9px;box-shadow:0 4px 14px rgba(0,0,0,.18);white-space:nowrap'
      d.innerHTML = `<div style="font:600 9px/1.2 'IBM Plex Mono',ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#7a7466">${title}</div><div style="font:500 11px/1.35 'Source Serif 4',Georgia,serif;color:#1e1c18;margin-top:2px">${body}</div>`
      labelBox.appendChild(d); labels.push({ el: d, p })
    }
    padMeshes.filter((_, i) => i === 0 || i === 3 || i === 5).forEach(({ row, slab: s }) => addLabel(row.id, `${(row.w * row.d / 4047).toFixed(2)} ac · EL ${row.level.toFixed(1)} m<br>cut ${money(row.cut)} · fill ${money(row.fill)} m³`, new THREE.Vector3(s.position.x, s.position.y + 22 * k + (withHouses ? 10 : 0), s.position.z)))
    let lo = { x: 0, y: 0, v: Infinity }
    for (let j = 0; j < grid.n; j++) for (let i = 0; i < grid.n; i++) { const v = at(grid, i, j); if (v < lo.v) lo = { x: i * cellSize(grid), y: j * cellSize(grid), v } }
    addLabel('Lowest ground', `EL ${lo.v.toFixed(1)} m · creek or wet ground`, new THREE.Vector3(wx(lo.x), zs(lo.v) + 12, wz(lo.y)))

    const ctrl = new OrbitControls(cam, renderer.domElement); ctrl.enableDamping = true; ctrl.maxPolarAngle = Math.PI / 2.02
    const mid = new THREE.Vector3(0, range * exaggeration * 0.25, 0)
    const padCenter = pads.length ? new THREE.Vector3(wx(pads.reduce((a, p) => a + p.x + p.w / 2, 0) / pads.length), range * exaggeration * 0.3, wz(pads.reduce((a, p) => a + p.y + p.d / 2, 0) / pads.length)) : mid
    const lowPt = new THREE.Vector3(wx(lo.x), zs(lo.v), wz(lo.y))
    if (preset === 'top') { cam.position.set(0, S * 1.45, 0.01); ctrl.target.copy(mid) }
    else if (preset === 'side') { cam.position.set(0, range * exaggeration * 0.7 + 14, S * 0.95); ctrl.target.set(0, range * exaggeration * 0.35, 0) }
    else if (preset === 'pads') { cam.position.set(padCenter.x + S * 0.28, S * 0.38, padCenter.z + S * 0.5); ctrl.target.copy(padCenter) }
    else if (preset === 'creek') { cam.position.set(lowPt.x + S * 0.3, S * 0.3, lowPt.z + S * 0.4); ctrl.target.copy(lowPt) }
    else { cam.position.set(S * 0.72, S * 0.78, S * 1.12); ctrl.target.copy(mid) }
    ctrl.update()

    const v3 = new THREE.Vector3()
    const update = () => {
      const { month: m, months: mm, phases: ph } = live.current
      const p = ph || { approvals: 0, works: 0, buildStart: 0, build: 0, sellStart: 0, sell: 0 }
      const all = m >= mm
      for (const pm of padMeshes) {
        const gp = all || (p.works === 0 && p.approvals === 0) ? 1 : clamp01((m - p.approvals) / Math.max(1, p.works))
        pm.slab.visible = gp > 0.02; pm.slab.scale.y = Math.max(0.05, gp)
        if (pm.house) { const hp = all ? 1 : p.build === 0 ? 0 : clamp01((m - p.buildStart) / Math.max(1, p.build)); pm.house.visible = hp > 0.02; pm.house.scale.set(1, Math.max(0.05, hp), 1) }
      }
    }
    api.current = { update }
    update()

    let raf = 0
    const loop = () => {
      ctrl.update(); renderer.render(scene, cam)
      const cw = renderer.domElement.clientWidth, ch = renderer.domElement.clientHeight
      for (const l of labels) {
        v3.copy(l.p).project(cam)
        const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1
        l.el.style.display = vis ? 'block' : 'none'
        if (vis) { const lx = Math.max(6, Math.min(cw - l.el.offsetWidth - 6, ((v3.x + 1) / 2) * cw - 20)); l.el.style.transform = `translate(${lx}px, ${((1 - v3.y) / 2) * ch - l.el.offsetHeight - 4}px)` }
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    const onResize = () => { const nw = el.clientWidth || w; renderer.setSize(nw, h); cam.aspect = nw / h; cam.updateProjectionMatrix() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ctrl.dispose(); geo.dispose(); renderer.dispose(); el.innerHTML = ''; api.current = null }
  }, [grid, pads, exaggeration, height, preset, withHouses, trees])

  useEffect(() => { api.current?.update() }, [month, months, phases])
  return <div ref={host} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E3DED2', background: '#E9EEF0' }} />
}
