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


const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
const vnoise = (x: number, y: number) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return hash(xi, yi) * (1 - u) * (1 - v) + hash(xi + 1, yi) * u * (1 - v) + hash(xi, yi + 1) * (1 - u) * v + hash(xi + 1, yi + 1) * u * v }
const fbm = (x: number, y: number) => vnoise(x, y) * 0.55 + vnoise(x * 2.3, y * 2.3) * 0.3 + vnoise(x * 5.1, y * 5.1) * 0.15
const WALLS = [0xf0ebe0, 0xe4dccb, 0xd9d4c8, 0xf5f1ea, 0xcfd6d9], ROOFS = [0x4a4a4f, 0x6b4636, 0x55595e, 0x7a4a3a]

export default function TerrainView({ grid, pads, exaggeration = 2, height = 520, preset = 'angle', month = 0, months = 1, phases, withHouses = true, trees = true, ground = 'natural' }: {
  grid: Grid; pads: PadRow[]; exaggeration?: number; height?: number; preset?: Preset; month?: number; months?: number; phases?: Phases; withHouses?: boolean; trees?: boolean; ground?: 'natural' | 'slope'
}) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef({ month, months, phases })
  live.current = { month, months, phases }
  const api = useRef<{ update: () => void } | null>(null)

  useEffect(() => {
    const el = host.current; if (!el) return
    const natural = ground === 'natural'
    const w = el.clientWidth || 800, h = height
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h); renderer.setClearColor(0xe9eef0)
    if (natural) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05 }
    el.innerHTML = ''; el.style.position = 'relative'; el.appendChild(renderer.domElement)
    const labelBox = document.createElement('div'); labelBox.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'; el.appendChild(labelBox)

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, w / h, 1, 8000)
    const S = grid.size, k = S / 320
    let zMin = Infinity, zMax = -Infinity
    for (const v of grid.z) { zMin = Math.min(zMin, v); zMax = Math.max(zMax, v) }
    const range = Math.max(0.5, zMax - zMin)
    const zs = (v: number) => (v - zMin) * exaggeration
    const wx = (x: number) => x - S / 2, wz = (y: number) => y - S / 2
    const shadow = (m: THREE.Object3D, cast = true, recv = true) => { if (natural) { m.castShadow = cast; m.receiveShadow = recv } return m }

    if (natural) {
      const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256
      const g2 = sky.getContext('2d')!, gr = g2.createLinearGradient(0, 0, 0, 256)
      gr.addColorStop(0, '#6fa3d8'); gr.addColorStop(0.55, '#cfe1ee'); gr.addColorStop(1, '#f1efe6'); g2.fillStyle = gr; g2.fillRect(0, 0, 2, 256)
      const tex = new THREE.CanvasTexture(sky); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex
      scene.fog = new THREE.Fog(0xdfe8ee, S * 1.7, S * 4.5)
    } else scene.background = new THREE.Color(0xe9eef0)

    // ground, finer than the data. Natural: grass, dry patches, rock on steep ground, mud by the creek. Slope: hard colour bands.
    const R = natural ? 200 : 140
    const geo = new THREE.PlaneGeometry(S, S, R, R); geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const bandCols = SLOPE_BANDS.map(b => new THREE.Color(b.color))
    const wet = new THREE.Color('#3f86c4')
    const gA = new THREE.Color('#587f35'), gB = new THREE.Color('#93a84c'), dirt = new THREE.Color('#9a8362'), rock = new THREE.Color('#8b8578'), mud = new THREE.Color('#6b5d44'), tmp = new THREE.Color()
    const slopeAt = (x: number, y: number) => { const e = S / R * 1.5; const dx = (heightAt(grid, x + e, y) - heightAt(grid, x - e, y)) / (2 * e), dy = (heightAt(grid, x, y + e) - heightAt(grid, x, y - e)) / (2 * e); return Math.hypot(dx, dy) * 100 }
    for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) {
      const idx = j * (R + 1) + i, x = (i / R) * S, y = (j / R) * S
      const v = heightAt(grid, x, y)
      pos.setXYZ(idx, wx(x), zs(v), wz(y))
      const sl = slopeAt(x, y)
      let c: THREE.Color
      if (natural) {
        const n1 = fbm((x / S) * 9, (y / S) * 9), n2 = vnoise((x / S) * 60, (y / S) * 60)
        tmp.copy(gA).lerp(gB, Math.min(1, Math.max(0, (n1 - 0.35) * 2.2)))
        tmp.lerp(dirt, Math.min(0.55, Math.max(0, (sl - 7) / 10)))
        tmp.lerp(rock, Math.min(0.8, Math.max(0, (sl - 14) / 14)))
        const lowT = 1 - Math.min(1, Math.max(0, ((v - zMin) / range - 0.04) / 0.1)); tmp.lerp(mud, lowT * 0.85)
        const sp = (n2 - 0.5) * 0.1; tmp.r += sp; tmp.g += sp; tmp.b += sp * 0.6
        c = tmp
      } else {
        const b = SLOPE_BANDS.findIndex(bb => sl < bb.max)
        c = (v - zMin) / range < 0.07 ? wet : bandCols[b]
      }
      col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals()
    const gm = natural ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    scene.add(shadow(new THREE.Mesh(geo, gm), false, true))
    const slab = new THREE.Mesh(new THREE.BoxGeometry(S, 2, S), new THREE.MeshLambertMaterial({ color: natural ? 0x8a6f4e : 0xcfd6dc })); slab.position.set(0, -1.2, 0); scene.add(slab)
    if (natural) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: 0x3b7ea8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }))
      water.rotation.x = -Math.PI / 2; water.position.y = zs(zMin + range * 0.07) + 0.05; scene.add(water)
    }

    // site boundary
    const bp: THREE.Vector3[] = []; const inset = 10 * k
    const edgePt = (x: number, y: number) => new THREE.Vector3(wx(x), zs(heightAt(grid, x, y)) + 0.6, wz(y))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(inset + t * (S - 2 * inset), inset))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(S - inset, inset + t * (S - 2 * inset)))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(S - inset - t * (S - 2 * inset), S - inset))
    for (let t = 0; t <= 1.0001; t += 0.02) bp.push(edgePt(inset, S - inset - t * (S - 2 * inset)))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bp), new THREE.LineBasicMaterial({ color: 0xffffff })))

    // roads and driveways laid on the ground, one road in front of each row of pads
    const ribbon = (pts: { x: number; y: number }[], width: number, color: number, lift: number) => {
      const verts: number[] = [], idxs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
        let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l
        for (const sg of [1, -1]) { const x = pts[i].x + (-dy * width / 2) * sg, y = pts[i].y + (dx * width / 2) * sg; verts.push(wx(x), zs(heightAt(grid, x, y)) + lift, wz(y)) }
      }
      for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idxs); g.computeVertexNormals()
      scene.add(shadow(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), false, true))
    }
    const seg = (x0: number, y0: number, x1: number, y1: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }))
    if (natural && pads.length) {
      const lo2 = (v: number) => Math.min(S - inset, Math.max(inset, v))
      const rowsY = Array.from(new Set(pads.map(p => Math.round(p.y / 5) * 5))).sort((a, b) => a - b)
      const minX = Math.min(...pads.map(p => p.x)), maxX = Math.max(...pads.map(p => p.x + p.w))
      const roadY = new Map<number, number>()
      for (const ry of rowsY) { const rp = pads.filter(p => Math.round(p.y / 5) * 5 === ry); const ty = lo2(Math.min(...rp.map(p => p.y)) - 9 * k); roadY.set(ry, ty); ribbon(seg(lo2(minX - 16 * k), ty, lo2(maxX + 16 * k), ty, 60), 6.5 * k, 0x3b3d40, 0.35) }
      const ys = Array.from(roadY.values()), spineX = lo2(minX - 16 * k)
      if (ys.length > 1) ribbon(seg(spineX, Math.min(...ys), spineX, Math.max(...ys), 40), 6.5 * k, 0x3b3d40, 0.35)
      for (const p of pads) { const ty = roadY.get(Math.round(p.y / 5) * 5)!; ribbon(seg(p.x + p.w * 0.7, ty, p.x + p.w * 0.7, p.y, 8), 4 * k, 0x8d8a84, 0.4) }
    }

    // pads and houses (grown by the build slider)
    const padMeshes: { slab: THREE.Mesh; house?: THREE.Group; row: PadRow }[] = []
    const std = (color: number, roughness = 0.9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    const makeHouse = (hw: number, hd: number, hh: number, wall: number, roofC: number) => {
      const g = new THREE.Group()
      const add = (m: THREE.Mesh) => { shadow(m); g.add(m); return m }
      add(new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), std(wall))).position.y = hh / 2
      const rh = hh * 0.6, ov = 1.1 * k + 0.6
      const sh = new THREE.Shape(); sh.moveTo(-hd / 2 - ov, 0); sh.lineTo(hd / 2 + ov, 0); sh.lineTo(0, rh); sh.closePath()
      const rg = new THREE.ExtrudeGeometry(sh, { depth: hw + ov * 2, bevelEnabled: false }); rg.translate(0, 0, -(hw + ov * 2) / 2); rg.rotateY(Math.PI / 2)
      add(new THREE.Mesh(rg, std(roofC, 0.8))).position.y = hh
      add(new THREE.Mesh(new THREE.BoxGeometry(1.4, rh * 0.9, 1.4), std(0x9a5b46))).position.set(hw * 0.3, hh + rh * 0.55, -hd * 0.1)
      const glass = std(0x2a3a4a, 0.2, 0.3), nW = Math.max(2, Math.floor(hw / 6))
      for (let i = 0; i < nW; i++) { const x = -hw / 2 + ((i + 0.5) * (hw * 0.55)) / nW; add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.3), glass)).position.set(x - hw * 0.05, hh * 0.58, hd / 2 + 0.05) }
      add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.35), std(0x5a3d2b))).position.set(-hw * 0.34 + hw * 0.55 * 0.5 - hw * 0.3, 1.8, hd / 2 + 0.08)
      add(new THREE.Mesh(new THREE.BoxGeometry(Math.min(5.4, hw * 0.28), 3.6, 0.35), std(0xd8d6d0))).position.set(hw * 0.3, 1.8, hd / 2 + 0.08)
      return g
    }
    pads.forEach((p, i) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(p.w, 1.2, p.d), natural ? std(0xb8a782, 1) : new THREE.MeshLambertMaterial({ color: 0xf4d35e })); shadow(s)
      s.position.set(wx(p.x + p.w / 2), zs(p.level) + 0.3, wz(p.y + p.d / 2)); scene.add(s)
      if (!natural) { const edge = new THREE.LineSegments(new THREE.EdgesGeometry(s.geometry), new THREE.LineBasicMaterial({ color: 0x8a6a00 })); s.add(edge) }
      let house: THREE.Group | undefined
      if (withHouses) {
        const hw = Math.min(p.w * 0.62, 24), hd = Math.min(p.d * 0.5, 14), hh = 6.2 + (i % 3) * 0.7
        house = makeHouse(hw, hd, hh, WALLS[i % WALLS.length], ROOFS[(i * 3 + 1) % ROOFS.length])
        house.position.set(s.position.x, s.position.y + 0.6, s.position.z); scene.add(house)
      }
      padMeshes.push({ slab: s, house, row: p })
    })

    // trees: seeded so they stay put, kept off the pads, roads, steep ground and the creek
    if (trees) {
      let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
      const trunkG = new THREE.CylinderGeometry(0.5 * k, 0.6 * k, 4 * k, 6)
      const roundG = new THREE.IcosahedronGeometry(3.3 * k, natural ? 2 : 1), coneG = new THREE.ConeGeometry(2.6 * k, 9 * k, 7)
      const nT = natural ? 260 : 170
      const trunks = new THREE.InstancedMesh(trunkG, natural ? std(0x6b4f36, 1) : new THREE.MeshLambertMaterial({ color: 0xb9a98f }), nT)
      const rounds = new THREE.InstancedMesh(roundG, natural ? std(0xffffff, 1) : new THREE.MeshLambertMaterial({ color: 0xffffff }), nT)
      const cones = new THREE.InstancedMesh(coneG, natural ? std(0xffffff, 1) : new THREE.MeshLambertMaterial({ color: 0xffffff }), nT)
      let n = 0, nr = 0, nc = 0; const m4 = new THREE.Matrix4(), cc = new THREE.Color()
      const roadClear = (x: number, y: number) => pads.some(p => x > p.x - 20 * k && x < p.x + p.w + 20 * k && y > p.y - 14 * k && y < p.y + p.d + 8 * k)
      for (let tries = 0; tries < 4000 && n < nT; tries++) {
        const x = rnd() * (S - 2 * inset) + inset, y = rnd() * (S - 2 * inset) + inset, v = heightAt(grid, x, y)
        if ((v - zMin) / range < 0.1 || slopeAt(x, y) > 22) continue
        if (natural ? roadClear(x, y) : pads.some(p => x > p.x - 8 && x < p.x + p.w + 8 && y > p.y - 8 && y < p.y + p.d + 8)) continue
        const sc = 0.8 + rnd() * 0.7, base = zs(v), conifer = natural && rnd() > 0.7
        m4.compose(new THREE.Vector3(wx(x), base + 2 * k * sc, wz(y)), new THREE.Quaternion(), new THREE.Vector3(sc, sc, sc)); trunks.setMatrixAt(n++, m4)
        if (conifer) { m4.compose(new THREE.Vector3(wx(x), base + 7.5 * k * sc, wz(y)), new THREE.Quaternion(), new THREE.Vector3(sc, sc, sc)); cones.setMatrixAt(nc, m4); cc.set(rnd() > 0.5 ? '#2f5d3a' : '#3a6a42'); cones.setColorAt(nc++, cc) }
        else { m4.compose(new THREE.Vector3(wx(x), base + 6.2 * k * sc, wz(y)), new THREE.Quaternion(), new THREE.Vector3(sc, sc * (natural ? 1.1 : 1), sc)); rounds.setMatrixAt(nr, m4); cc.set(natural ? ['#5c8a3a', '#6f9a45', '#4a7a38', '#86a24e'][Math.floor(rnd() * 4)] : rnd() > 0.45 ? '#9bb84a' : '#5d8a4f'); rounds.setColorAt(nr++, cc) }
      }
      trunks.count = n; rounds.count = nr; cones.count = nc
      for (const m of [trunks, rounds, cones]) { shadow(m); scene.add(m) }
    }

    if (natural) {
      scene.add(new THREE.HemisphereLight(0xdfeaf5, 0x8a7f6a, 0.8))
      const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(-S * 0.7, S * 0.9, S * 0.5); sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -S * 0.75; sc2.right = S * 0.75; sc2.top = S * 0.75; sc2.bottom = -S * 0.75; sc2.near = 1; sc2.far = S * 3
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4; scene.add(sun)
    } else {
      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
      const sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(-S * 0.8, S, S * 0.6); scene.add(sun)
    }

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
  }, [grid, pads, exaggeration, height, preset, withHouses, trees, ground])

  useEffect(() => { api.current?.update() }, [month, months, phases])
  return <div ref={host} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E3DED2', background: '#E9EEF0' }} />
}
