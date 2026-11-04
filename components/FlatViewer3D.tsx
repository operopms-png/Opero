'use client'
// 3D model of one flat from its room layout: a furnished top-down plan you can turn, a first-person walk-through
// (drag to look; arrow keys, WASD or the on-screen joystick to move), and a Tour where a person walks through every room
// while the camera follows from above. Built from simple shapes, not photographs.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Layout, RoomKind } from '@/lib/flat-layout'
import { buildExterior, carpetTexture, furnish, makePerson, plasterTexture, skyTexture, swing, tileTexture, woodTexture } from '@/components/flat3d/assets'

const CELL = 0.1, WALL_H = 2.6, WALL_T = 0.12, EYE = 1.6, RADIUS = 0.28
const OPEN: RoomKind[] = ['living', 'dining', 'kitchen']

type Run = { vertical: boolean; at: number; from: number; to: number; a: number; b: number } // in cells

const EX = 500 // the building outside sits far from the flat model, so the two never overlap
export default function FlatViewer3D({ layout, title, building, onClose }: { layout: Layout; title: string; building?: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const api = useRef<{ setMode: (m: 'plan' | 'walk' | 'tour', record?: boolean) => void; joy: { x: number; y: number } } | null>(null)
  const [mode, setModeState] = useState<'plan' | 'walk' | 'tour'>('plan')
  const [recording, setRecording] = useState(false)
  const canRecord = typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined'
  const walk = mode === 'walk'

  useEffect(() => {
    const el = box.current; if (!el) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#EEF3F9')
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.autoClear = false
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45
    el.appendChild(renderer.domElement); renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none'
    const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
    const hemi = new THREE.HemisphereLight('#ffffff', '#cfd8e6', 1.5); scene.add(hemi)
    const sun = new THREE.DirectionalLight('#fff4e2', 1.5); sun.position.set(layout.w * 0.3, 14, layout.d * 0.1); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -25; sc.right = 25; sc.top = 25; sc.bottom = -25
    scene.add(sun); scene.add(sun.target)
    const skyTex = skyTexture(), planBg = new THREE.Color('#EEF3F9'), walkBg = new THREE.Color('#DCE6F2')
    const setSun = (outside: boolean) => { if (outside) { sun.position.set(EX + 50, 80, 40); sun.target.position.set(EX, 0, 0); sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.far = 260 } else { sun.position.set(layout.w * 0.3, 14, layout.d * 0.1); sun.target.position.set(0, 0, 0); sc.left = -25; sc.right = 25; sc.top = 25; sc.bottom = -25; sc.far = 100 } sc.updateProjectionMatrix() }

    // ---- occupancy grid: which room each 10 cm cell belongs to ----
    const NX = Math.ceil(layout.w / CELL) + 2, NY = Math.ceil(layout.d / CELL) + 2
    const grid = new Int16Array(NX * NY).fill(-1)
    const rooms = layout.rooms
    rooms.forEach((r, i) => {
      for (let x = Math.round(r.x / CELL); x < Math.round((r.x + r.w) / CELL); x++) for (let y = Math.round(r.y / CELL); y < Math.round((r.y + r.h) / CELL); y++) if (grid[x * NY + y] === -1) grid[x * NY + y] = i
    })
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= NX || y >= NY ? -1 : grid[x * NY + y])

    // ---- boundary runs between differing cells ----
    const runs: Run[] = []
    for (let line = 0; line <= Math.max(NX, NY); line++) {
      for (const vertical of [true, false]) {
        const len = vertical ? NY : NX; if (line > (vertical ? NX : NY)) continue
        let cur: Run | null = null
        for (let k = 0; k < len; k++) {
          const a = vertical ? at(line - 1, k) : at(k, line - 1), b = vertical ? at(line, k) : at(k, line)
          if (a !== b) {
            if (cur && cur.a === a && cur.b === b && cur.to === k) cur.to = k + 1
            else { if (cur) runs.push(cur); cur = { vertical, at: line, from: k, to: k + 1, a, b } }
          } else if (cur) { runs.push(cur); cur = null }
        }
        if (cur) runs.push(cur)
      }
    }
    const kindOf = (i: number): RoomKind | null => (i < 0 ? null : rooms[i].kind)
    const connected = (ka: RoomKind, kb: RoomKind) => {
      if (OPEN.includes(ka) && OPEN.includes(kb)) return 'open'
      if (ka === 'hall' || kb === 'hall') return 'door'
      const main = (k: RoomKind) => k === 'living' || k === 'dining'
      if ((main(ka) && kb !== 'other') || (main(kb) && ka !== 'other')) return 'door'
      if ((ka === 'bedroom' && kb === 'bath') || (kb === 'bedroom' && ka === 'bath')) return 'door'
      return 'wall'
    }
    // doors: one gap in the middle of each connecting run; every room gets at least one door
    const doorRun = new Map<Run, number>() // run -> gap width in cells
    const hasDoor = new Set<number>()
    const open = new Set<Run>()
    for (const r of runs) {
      if (r.a < 0 || r.b < 0) continue
      if (connected(rooms[r.a].kind, rooms[r.b].kind) === 'open') { open.add(r); hasDoor.add(r.a); hasDoor.add(r.b) }
    }
    for (const r of runs) {
      if (r.a < 0 || r.b < 0 || open.has(r)) continue
      if (connected(rooms[r.a].kind, rooms[r.b].kind) === 'door' && r.to - r.from >= 10) {
        const wide = rooms[r.a].kind === 'balcony' || rooms[r.b].kind === 'balcony' ? 14 : 9
        doorRun.set(r, wide); hasDoor.add(r.a); hasDoor.add(r.b)
      }
    }
    rooms.forEach((_, i) => {
      if (hasDoor.has(i)) return
      let best: Run | null = null
      for (const r of runs) if ((r.a === i || r.b === i) && r.a >= 0 && r.b >= 0 && !open.has(r) && r.to - r.from >= 10 && (!best || r.to - r.from > best.to - best.from)) best = r
      if (best) { doorRun.set(best, 9); hasDoor.add(best.a); hasDoor.add(best.b) }
    })

    // ---- floors (wood, tile or carpet by room) ----
    const group = new THREE.Group(); scene.add(group)
    rooms.forEach(r => {
      const k: RoomKind = r.kind
      const map = k === 'bedroom' ? carpetTexture('#D9C9AE') : k === 'kitchen' || k === 'bath' || k === 'storage' || k === 'other' ? tileTexture(k === 'bath' ? '#DCE8EE' : '#E9ECEF') : woodTexture(k === 'balcony')
      const rep = k === 'bedroom' ? 1.5 : 1.2; map.repeat.set(r.w / rep, r.h / rep)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshStandardMaterial({ map, roughness: k === 'kitchen' || k === 'bath' ? 0.35 : 0.55 }))
      m.rotation.x = -Math.PI / 2; m.position.set(r.x + r.w / 2, 0.001, r.y + r.h / 2); m.receiveShadow = true; group.add(m)
    })

    // ---- walls (and their collision boxes) ----
    const solid: { x0: number; x1: number; z0: number; z1: number }[] = []
    const wallMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: plasterTexture(), roughness: 0.95 }), railMat = new THREE.MeshStandardMaterial({ color: '#A9C9E8', transparent: true, opacity: 0.55 })
    const addWall = (vertical: boolean, at0: number, f: number, t: number, h: number, mat: THREE.Material, collide: boolean) => {
      if (t <= f) return
      const L = (t - f) * CELL, w = vertical ? WALL_T : L, d = vertical ? L : WALL_T
      const cx = vertical ? at0 * CELL : (f + t) / 2 * CELL, cz = vertical ? (f + t) / 2 * CELL : at0 * CELL
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; group.add(m)
      if (collide) solid.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 })
    }
    for (const r of runs) {
      if (open.has(r)) continue
      const outside = r.a < 0 || r.b < 0
      const balconyEdge = outside && (kindOf(r.a) === 'balcony' || kindOf(r.b) === 'balcony')
      const h = balconyEdge ? 1.0 : WALL_H, mat = balconyEdge ? railMat : wallMat
      const gap = doorRun.get(r)
      if (gap) { const mid = Math.round((r.from + r.to) / 2), g0 = mid - Math.floor(gap / 2), g1 = g0 + gap
        addWall(r.vertical, r.at, r.from, g0, WALL_H, mat, true); addWall(r.vertical, r.at, g1, r.to, WALL_H, mat, true)
        addWall(r.vertical, r.at, g0, g1, WALL_H - 2.1, mat, false) // lintel over the door
      } else addWall(r.vertical, r.at, r.from, r.to, h, mat, true)
    }

    // ---- furniture and labels ----
    const labels: THREE.Sprite[] = []
    rooms.forEach(r => {
      furnish(group, r)
      const cx = r.x + r.w / 2, cz = r.y + r.h / 2
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64
      const g = cv.getContext('2d')!; g.fillStyle = 'rgba(11,27,69,.85)'; g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill()
      g.fillStyle = '#fff'; g.font = '700 26px DM Sans, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.name.slice(0, 18), 128, 33)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.scale.set(1.9, 0.48, 1); sp.position.set(cx, 0.4, cz); sp.renderOrder = 5; scene.add(sp); labels.push(sp)
    })
    // roof: shown in walk mode only
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(layout.w, layout.d), new THREE.MeshStandardMaterial({ color: '#FFFFFF', side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(layout.w / 2, WALL_H + 0.02, layout.d / 2); ceil.visible = false; scene.add(ceil)

    // ---- people in the rooms, and the one who walks the tour ----
    const crowd = new THREE.Group(); scene.add(crowd)
    const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z)
    const placeNpc = (kind: RoomKind, fx: number, fy: number, shirt: string, trousers: string, tx?: number, tz?: number) => {
      const r = rooms.find(q => q.kind === kind); if (!r) return
      const p = makePerson(shirt, trousers, '#C58A5A', '#1E1A18'); const x = r.x + r.w * fx, z = r.y + r.h * fy
      p.group.position.set(x, 0, z); p.group.rotation.y = tx === undefined ? face(x, z, r.x + r.w / 2, r.y + r.h / 2) : face(x, z, tx, tz!); crowd.add(p.group)
    }
    placeNpc('living', 0.78, 0.36, '#C97E6E', '#34404F'); placeNpc('kitchen', 0.5, 0.42, '#5E8F6A', '#2B3340')
    { const b = rooms.find(q => q.kind === 'balcony'); if (b) placeNpc('balcony', 0.5, 0.45, '#E0B84F', '#34404F', b.x + b.w / 2, b.y - 5) }
    const hero = makePerson(); hero.group.visible = false; scene.add(hero.group)
    const ext = buildExterior(building || title.split(',')[0] || 'Building'); ext.group.position.x = EX; ext.group.visible = false; scene.add(ext.group)

    // ---- tour route: outside, then every room in turn ----
    const blocked = (x: number, z: number) => solid.some(s => x > s.x0 - RADIUS && x < s.x1 + RADIUS && z > s.z0 - RADIUS && z < s.z1 + RADIUS)
    type Route = { pts: THREE.Vector2[]; len: number[]; total: number }
    const mkRoute = (pts: THREE.Vector2[]): Route => { const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, len, total: len[len.length - 1] } }
    const smooth = (all: THREE.Vector2[], it = 3) => { for (let n = 0; n < it; n++) all = all.map((p, i) => (i === 0 || i === all.length - 1 ? p : new THREE.Vector2((all[i - 1].x + p.x * 2 + all[i + 1].x) / 4, (all[i - 1].y + p.y * 2 + all[i + 1].y) / 4))); return all }
    const outRoute = mkRoute(smooth([new THREE.Vector2(7, 30), new THREE.Vector2(5.5, 24), new THREE.Vector2(3, 17), new THREE.Vector2(1, 12.5), new THREE.Vector2(0.2, 9.4)], 2))
    const start0 = rooms.find(r => r.kind === 'hall') ?? rooms.find(r => r.kind === 'living') ?? rooms[0]
    const buildInRoute = (): Route | null => {
      const S = 0.25, cols = Math.ceil(layout.w / S), rowsN = Math.ceil(layout.d / S)
      const free = (cx: number, cz: number) => { const x = (cx + 0.5) * S, z = (cz + 0.5) * S; return cx >= 0 && cz >= 0 && cx < cols && cz < rowsN && at(Math.floor(x / CELL), Math.floor(z / CELL)) >= 0 && !blocked(x, z) }
      const nearest = (x: number, z: number) => { let best: [number, number] | null = null, bd = 1e9; for (let i = 0; i < cols; i++) for (let j = 0; j < rowsN; j++) { if (!free(i, j)) continue; const d = Math.hypot((i + 0.5) * S - x, (j + 0.5) * S - z); if (d < bd) { bd = d; best = [i, j] } } return best }
      const bfs = (a: [number, number], b: [number, number]) => {
        const prev = new Int32Array(cols * rowsN).fill(-2), q = [a[0] * rowsN + a[1]]; prev[q[0]] = -1
        for (let h = 0; h < q.length; h++) { const c = q[h], ci = Math.floor(c / rowsN), cj = c % rowsN; if (ci === b[0] && cj === b[1]) break
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = ci + di, nj = cj + dj; if (!free(ni, nj) || prev[ni * rowsN + nj] !== -2) continue; if (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue; prev[ni * rowsN + nj] = c; q.push(ni * rowsN + nj) } }
        const out: THREE.Vector2[] = []; let c = b[0] * rowsN + b[1]; if (prev[c] === -2) return out
        while (c >= 0) { out.push(new THREE.Vector2((Math.floor(c / rowsN) + 0.5) * S, (c % rowsN + 0.5) * S)); c = prev[c] }
        return out.reverse()
      }
      const order = ['living', 'kitchen', 'dining', 'study', 'bedroom', 'bath', 'balcony']
      const stops = [start0, ...order.flatMap(k => rooms.filter(r => r.kind === k && r !== start0))]
      let all: THREE.Vector2[] = []; let from = nearest(start0.x + start0.w / 2, start0.y + start0.h / 2)
      for (const r of stops.slice(1)) {
        const to = nearest(r.x + r.w / 2, r.y + r.h / 2 + Math.min(0.8, r.h * 0.2)); if (!from || !to) continue
        const seg = bfs(from, to); if (seg.length) all = all.concat(all.length ? seg.slice(1) : seg); from = to
      }
      return all.length < 2 ? null : mkRoute(smooth(all))
    }
    let inRoute: Route | null = null
    const along = (R: Route, s: number) => { let i = 1; while (i < R.pts.length - 1 && R.len[i] < s) i++; const u = (s - R.len[i - 1]) / Math.max(1e-6, R.len[i] - R.len[i - 1]); return { p: R.pts[i - 1].clone().lerp(R.pts[i], Math.min(1, Math.max(0, u))), dir: R.pts[i].clone().sub(R.pts[i - 1]) } }
    const OUT_SPEED = 2.4, IN_SPEED = 1.25, FADE = 0.7
    const T_OUT = outRoute.total / OUT_SPEED + 0.5
    const sm = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x) }

    // ---- caption layer drawn on top of the picture (so it is in recorded videos too) ----
    const ovScene = new THREE.Scene(), ovCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const ovCanvas = document.createElement('canvas'), ovTex = new THREE.CanvasTexture(ovCanvas); ovTex.colorSpace = THREE.SRGBColorSpace
    ovScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthTest: false })))
    let ovKey = '', capMain = '', capSub = '', fadeA = 0
    const drawOverlay = () => {
      const key = `${capMain}|${capSub}|${Math.round(fadeA * 50)}|${ovCanvas.width}`; if (key === ovKey) return; ovKey = key
      const w = ovCanvas.width, h = ovCanvas.height, g = ovCanvas.getContext('2d')!; g.clearRect(0, 0, w, h)
      if (capMain) { const u = Math.min(w, h * 0.62) / 360; g.fillStyle = 'rgba(11,27,69,.78)'; g.beginPath(); g.roundRect(18 * u, h - 96 * u, Math.min(w - 36 * u, (capMain.length * 15 + 56) * u), 78 * u, 16 * u); g.fill()
        g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.font = `800 ${28 * u}px DM Sans, Arial, sans-serif`; g.fillText(capMain, 36 * u, h - 52 * u); g.font = `500 ${14 * u}px DM Sans, Arial, sans-serif`; g.globalAlpha = 0.85; g.fillText(capSub, 36 * u, h - 30 * u); g.globalAlpha = 1 }
      if (capMain || fadeA > 0) { const u = Math.min(w, h * 0.62) / 360; g.fillStyle = '#1B2F6E'; g.font = `800 ${14 * u}px DM Sans, Arial, sans-serif`; g.fillText('NOVOURQ', 18 * u, 28 * u) }
      if (fadeA > 0) { g.fillStyle = `rgba(11,27,69,${fadeA})`; g.fillRect(0, 0, w, h) }
      ovTex.needsUpdate = true
    }

    // ---- cameras and controls ----
    const centre = new THREE.Vector3(layout.w / 2, 0, layout.d / 2), span = Math.max(layout.w, layout.d)
    cam.position.set(centre.x, span * 1.05, centre.z + span * 0.75)
    const orbit = new OrbitControls(cam, renderer.domElement); orbit.target.copy(centre); orbit.maxPolarAngle = Math.PI / 2.1; orbit.enableDamping = true
    const start = start0
    const me = { x: start.x + start.w / 2, z: start.y + start.h / 2, yaw: 0, pitch: 0 }
    const keys: Record<string, boolean> = {}; const joy = { x: 0, y: 0 }
    let walking = false, touring = false, tourT = 0, heroYaw = 0, curRoom = -2
    // recording
    let rec: MediaRecorder | null = null, chunks: Blob[] = [], wantRecord = false
    const stopRec = () => { if (rec && rec.state !== 'inactive') rec.stop() }
    const startRec = () => {
      try {
        const mimes = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm']; const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || ''
        rec = new MediaRecorder((renderer.domElement as any).captureStream(30), { mimeType: mime || undefined, videoBitsPerSecond: 6_000_000 }); chunks = []
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
        rec.onstop = () => { const blob = new Blob(chunks, { type: rec?.mimeType || 'video/webm' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tour.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); setRecording(false) }
        rec.start(); setRecording(true)
      } catch { setRecording(false) }
    }
    const applyScene = (outside: boolean) => {
      ext.group.visible = outside; group.visible = !outside; crowd.visible = !outside && !walking; labels.forEach(l => (l.visible = !outside && !touring && !walking))
      scene.background = outside ? skyTex : walking ? walkBg : planBg; scene.fog = outside ? new THREE.Fog(0xDCEBF8, 110, 330) : null
      hemi.intensity = outside ? 1.3 : 1.5; setSun(outside)
    }
    const setMode = (m: 'plan' | 'walk' | 'tour', record = false) => {
      stopRec()
      const on = m === 'walk'; walking = on; touring = m === 'tour'; wantRecord = false
      orbit.enabled = m === 'plan'; ceil.visible = on; hero.group.visible = touring
      if (touring) { if (!inRoute) inRoute = buildInRoute(); tourT = 0; curRoom = -2; cam.fov = 48; applyScene(true); if (record) { wantRecord = true; startRec() } }
      else { applyScene(false); capMain = capSub = ''; fadeA = 0; drawOverlay() }
      if (on) {
        me.x = start.x + start.w / 2; me.z = start.y + start.h / 2; cam.fov = 70; me.pitch = 0
        const look = rooms.find(r => r.kind === 'living' && r !== start) ?? rooms.filter(r => r !== start).sort((a, b) => b.w * b.h - a.w * a.h)[0]
        if (look) me.yaw = Math.atan2(-(look.x + look.w / 2 - me.x), -(look.y + look.h / 2 - me.z))
      } else if (!touring) { cam.fov = 50; cam.position.set(centre.x, span * 1.05, centre.z + span * 0.75); orbit.target.copy(centre) }
      cam.updateProjectionMatrix()
    }
    applyScene(false)
    api.current = { setMode, joy }
    let dragging = false, lx = 0, ly = 0
    const dom = renderer.domElement
    const down = (e: PointerEvent) => { if (!walking) return; dragging = true; lx = e.clientX; ly = e.clientY; dom.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!walking || !dragging) return; me.yaw -= (e.clientX - lx) * 0.005; me.pitch = Math.max(-1.1, Math.min(1.1, me.pitch - (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY }
    const up = () => { dragging = false }
    const kd = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }, ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    dom.addEventListener('pointerdown', down); dom.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); const pr = renderer.getPixelRatio(); ovCanvas.width = Math.round(w * pr); ovCanvas.height = Math.round(h * pr); ovKey = ''; drawOverlay() }
    const ro = new ResizeObserver(resize); ro.observe(el); resize()
    let raf = 0, last = performance.now()
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (t - last) / 1000); last = t
      renderer.clear()
      if (walking) {
        const f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0) - joy.y, s = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0) + joy.x
        if (keys['arrowleft']) me.yaw += 1.8 * dt; if (keys['arrowright']) me.yaw -= 1.8 * dt
        const sp = 1.6 * dt, dx = (-Math.sin(me.yaw) * f + Math.cos(me.yaw) * s) * sp, dz = (-Math.cos(me.yaw) * f - Math.sin(me.yaw) * s) * sp
        if (!blocked(me.x + dx, me.z)) me.x += dx; if (!blocked(me.x, me.z + dz)) me.z += dz
        cam.position.set(me.x, EYE, me.z); cam.rotation.set(me.pitch, me.yaw, 0, 'YXZ')
      } else if (touring && inRoute) {
        tourT += dt
        const outside = tourT < T_OUT, inTotal = inRoute.total / IN_SPEED
        if (tourT > T_OUT + inTotal + 1.6) { if (wantRecord) { wantRecord = false; stopRec(); setMode('plan') } else { tourT = 0; curRoom = -2 } }
        const nowOut = tourT < T_OUT
        if (nowOut !== ext.group.visible) { applyScene(nowOut); hero.group.visible = true }
        let p: THREE.Vector2, dir: THREE.Vector2, speed: number
        if (nowOut) { const a = along(outRoute, Math.min(tourT * OUT_SPEED, outRoute.total)); p = a.p; dir = a.dir; speed = tourT * OUT_SPEED < outRoute.total ? OUT_SPEED : 0 }
        else { const ti = tourT - T_OUT; const a = along(inRoute, Math.min(ti * IN_SPEED, inRoute.total)); p = a.p; dir = a.dir; speed = ti * IN_SPEED < inRoute.total ? IN_SPEED : 0 }
        if (dir.lengthSq() > 1e-8 && speed > 0) { const want = Math.atan2(dir.x, dir.y); let d = want - heroYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; heroYaw += d * Math.min(1, dt * 8) }
        const ph = t / 1000 * 3.4 * speed, sw = speed > 0 ? 0.7 : 0, ox = nowOut ? EX : 0
        hero.group.position.set(p.x + ox, Math.abs(Math.sin(ph)) * sw * 0.03, p.y); hero.group.rotation.y = heroYaw; swing(hero, ph, sw)
        crowd.children.forEach((c, i) => { c.position.y = 0; c.rotation.z = Math.sin(t / 900 + i * 2) * 0.02 })
        if (nowOut) {
          const wide = new THREE.Vector3(EX - 32, 12, 52), wl = new THREE.Vector3(EX, 6, 0)
          const fo = new THREE.Vector3(p.x + EX + 5.5, 4.2, p.y + 9.5), fl = new THREE.Vector3(p.x + EX, 1.3, p.y - 2), w = sm((tourT - 1.4) / 2.2)
          cam.position.copy(wide.lerp(fo, w)); cam.lookAt(wl.lerp(fl, w))
          capMain = ext.group.visible ? (building || title.split(',')[0] || 'Building') : ''; capSub = 'Walk up to the entrance'
          fadeA = Math.max(sm(1 - tourT / FADE) * 0.0, sm((tourT - (T_OUT - FADE)) / FADE))
        } else {
          const ti = tourT - T_OUT, k = 0.85 + span / 40
          const aer = new THREE.Vector3(centre.x, span * 1.15 + 3, centre.z + span * 0.95), al = new THREE.Vector3(centre.x, 0, centre.z * 0.9)
          const fo = new THREE.Vector3(p.x + 2.2 * k, 6.2 * k, p.y + 5.6 * k), fl = new THREE.Vector3(p.x, 0.5, p.y - 0.4), w = sm((ti - 1.2) / 2)
          cam.position.copy(aer.lerp(fo, w)); cam.lookAt(al.lerp(fl, w))
          const ri = at(Math.floor(p.x / CELL), Math.floor(p.y / CELL)); if (ri !== curRoom) { curRoom = ri }
          capMain = curRoom >= 0 ? rooms[curRoom].name : 'Your new flat'; capSub = title; fadeA = sm(1 - ti / FADE)
        }
        drawOverlay()
      } else orbit.update()
      renderer.render(scene, cam)
      if (touring) { renderer.render(ovScene, ovCam) }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); stopRec(); ro.disconnect(); orbit.dispose()
      dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt: any = m.material; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x: any) => { x.map?.dispose?.(); x.dispose?.() }) })
      pm.dispose(); renderer.dispose(); dom.remove(); api.current = null
    }
  }, [layout, title, building])

  const toggle = (m: 'plan' | 'walk' | 'tour', record = false) => { setModeState(m); api.current?.setMode(m, record) }
  const stick = (e: React.PointerEvent<HTMLDivElement>, end = false) => {
    const j = api.current?.joy; if (!j) return
    if (end) { j.x = 0; j.y = 0; return }
    const r = e.currentTarget.getBoundingClientRect(); j.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); j.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
  }
  const rooms = layout.rooms.length
  useEffect(() => { if (!recording && mode === 'tour') { /* keep tour running after a recording finishes */ } }, [recording, mode])
  const btn = (on: boolean): React.CSSProperties => ({ font: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.7)', background: on ? '#fff' : 'transparent', color: on ? '#1B2F6E' : '#fff', cursor: 'pointer' })
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(11,27,69,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog" aria-label={`3D view of ${title}`}>
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', width: 'min(1100px, 100%)', height: 'min(760px, 100%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#2F6DB5', color: '#fff', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, opacity: .9 }}>{recording ? 'Recording the tour. It saves a video when it ends.' : `${rooms} rooms. ${mode === 'walk' ? 'Drag to look, keys or stick to walk.' : mode === 'tour' ? 'Outside, then a person walks through every room.' : 'Drag to turn, scroll to zoom.'}`}</div></div>
          {([['plan', 'Plan'], ['walk', 'Walk'], ['tour', 'Tour']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => toggle(m)} aria-pressed={mode === m} style={btn(mode === m)}>{label}</button>))}
          {canRecord && <button type="button" onClick={() => toggle('tour', true)} disabled={recording} style={{ ...btn(false), opacity: recording ? 0.6 : 1 }}>{recording ? 'Recording' : 'Save as video'}</button>}
          <button type="button" onClick={onClose} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.7)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div ref={box} style={{ position: 'absolute', inset: 0 }} />
          {mode === 'walk' && (
            <div onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); stick(e) }} onPointerMove={e => { if (e.buttons) stick(e) }} onPointerUp={e => stick(e, true)} onPointerCancel={e => stick(e, true)}
              style={{ position: 'absolute', left: 20, bottom: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.55)', border: '2px solid rgba(27,47,110,.5)', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2F6E', fontSize: 12, fontWeight: 700 }}>Move</div>)}
        </div>
      </div>
    </div>
  )
}
