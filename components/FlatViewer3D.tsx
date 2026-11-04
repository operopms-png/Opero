'use client'
// 3D model of one flat from its room layout: a furnished top-down plan you can turn, and a first-person walk-through
// (drag to look; arrow keys, WASD or the on-screen joystick to move). Built from simple shapes, not photographs.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Layout, Room, RoomKind } from '@/lib/flat-layout'

const FLOOR: Record<RoomKind, string> = { bedroom: '#D9C3A3', living: '#C99B62', dining: '#C99B62', kitchen: '#E9ECEF', bath: '#DCE8EE', hall: '#E7DCC8', balcony: '#B58B5A', study: '#D9C3A3', storage: '#E3E3E3', other: '#E3E3E3' }
const CELL = 0.1, WALL_H = 2.6, WALL_T = 0.12, EYE = 1.6, RADIUS = 0.28
const OPEN: RoomKind[] = ['living', 'dining', 'kitchen']

type Run = { vertical: boolean; at: number; from: number; to: number; a: number; b: number } // in cells

export default function FlatViewer3D({ layout, title, onClose }: { layout: Layout; title: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const api = useRef<{ setWalk: (on: boolean) => void; joy: { x: number; y: number } } | null>(null)
  const [walk, setWalk] = useState(false)

  useEffect(() => {
    const el = box.current; if (!el) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#EEF3F9')
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement); renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none'
    const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
    scene.add(new THREE.HemisphereLight('#ffffff', '#cfd8e6', 2.1))
    const sun = new THREE.DirectionalLight('#ffffff', 1.0); sun.position.set(layout.w * 0.3, 14, layout.d * 0.1); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -25; sc.right = 25; sc.top = 25; sc.bottom = -25
    scene.add(sun)

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

    // ---- floors ----
    const group = new THREE.Group(); scene.add(group)
    rooms.forEach(r => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshStandardMaterial({ color: FLOOR[r.kind], roughness: 0.9 }))
      m.rotation.x = -Math.PI / 2; m.position.set(r.x + r.w / 2, 0.001, r.y + r.h / 2); m.receiveShadow = true; group.add(m)
    })

    // ---- walls (and their collision boxes) ----
    const solid: { x0: number; x1: number; z0: number; z1: number }[] = []
    const wallMat = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.95 }), railMat = new THREE.MeshStandardMaterial({ color: '#A9C9E8', transparent: true, opacity: 0.55 })
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
    const box3 = (w: number, h: number, d: number, x: number, z: number, color: string, y = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 })); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; group.add(m)
    }
    const labels: THREE.Sprite[] = []
    rooms.forEach(r => {
      const cx = r.x + r.w / 2, cz = r.y + r.h / 2
      if (r.kind === 'bedroom') { box3(1.6, 0.5, 2.0, cx, r.y + 1.15, '#8FA6C4'); box3(1.4, 0.15, 0.5, cx, r.y + 0.45, '#F4F1EA', 0.5); box3(Math.min(1.8, r.w - 0.4), 2.0, 0.55, cx, r.y + r.h - 0.35, '#B08B5E') }
      else if (r.kind === 'living') { box3(Math.min(2.2, r.w - 0.5), 0.8, 0.9, cx, r.y + r.h - 0.7, '#7A8CA3'); box3(1.0, 0.4, 0.6, cx, cz, '#C9A877'); box3(Math.min(1.8, r.w - 0.5), 0.5, 0.35, cx, r.y + 0.35, '#3B3F46') }
      else if (r.kind === 'dining') { box3(1.6, 0.75, 0.9, cx, cz, '#B08B5E'); for (const [dx, dz] of [[-0.5, -0.65], [0.5, -0.65], [-0.5, 0.65], [0.5, 0.65]]) box3(0.4, 0.45, 0.4, cx + dx, cz + dz, '#8C6B47') }
      else if (r.kind === 'kitchen') { box3(r.w - 0.3, 0.9, 0.6, cx, r.y + r.h - 0.4, '#F7F7F7'); box3(0.7, 1.9, 0.7, r.x + 0.5, r.y + 0.5, '#C9CDD2') }
      else if (r.kind === 'bath') { box3(1.6, 0.5, 0.75, r.x + r.w - 0.95, r.y + 0.5, '#FFFFFF'); box3(0.4, 0.4, 0.6, r.x + 0.4, r.y + r.h - 0.5, '#FFFFFF') }
      else if (r.kind === 'balcony') { box3(0.7, 0.7, 0.7, cx, cz, '#8C6B47'); box3(0.4, 0.45, 0.4, cx - 0.7, cz, '#8C6B47'); box3(0.4, 0.45, 0.4, cx + 0.7, cz, '#8C6B47') }
      else if (r.kind === 'study') { box3(1.4, 0.75, 0.7, cx, r.y + 0.6, '#B08B5E') }
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64
      const g = cv.getContext('2d')!; g.fillStyle = 'rgba(11,27,69,.85)'; g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill()
      g.fillStyle = '#fff'; g.font = '700 26px DM Sans, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.name.slice(0, 18), 128, 33)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.scale.set(1.9, 0.48, 1); sp.position.set(cx, 0.4, cz); sp.renderOrder = 5; scene.add(sp); labels.push(sp)
    })
    // roof: shown in walk mode only
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(layout.w, layout.d), new THREE.MeshStandardMaterial({ color: '#FFFFFF', side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(layout.w / 2, WALL_H + 0.02, layout.d / 2); ceil.visible = false; scene.add(ceil)

    // ---- cameras and controls ----
    const centre = new THREE.Vector3(layout.w / 2, 0, layout.d / 2), span = Math.max(layout.w, layout.d)
    cam.position.set(centre.x, span * 1.05, centre.z + span * 0.75)
    const orbit = new OrbitControls(cam, renderer.domElement); orbit.target.copy(centre); orbit.maxPolarAngle = Math.PI / 2.1; orbit.enableDamping = true
    // walk state
    const start = rooms.find(r => r.kind === 'hall') ?? rooms.find(r => r.kind === 'living') ?? rooms[0]
    const me = { x: start.x + start.w / 2, z: start.y + start.h / 2, yaw: 0, pitch: 0 }
    const keys: Record<string, boolean> = {}; const joy = { x: 0, y: 0 }
    let walking = false
    const setWalk = (on: boolean) => {
      walking = on; orbit.enabled = !on; ceil.visible = on; labels.forEach(l => (l.visible = !on)); scene.background = new THREE.Color(on ? '#DCE6F2' : '#EEF3F9')
      if (on) {
        me.x = start.x + start.w / 2; me.z = start.y + start.h / 2; cam.fov = 70; me.pitch = 0
        // face the living room (or the biggest other room) when you step in
        const look = rooms.find(r => r.kind === 'living' && r !== start) ?? rooms.filter(r => r !== start).sort((a, b) => b.w * b.h - a.w * a.h)[0]
        if (look) me.yaw = Math.atan2(-(look.x + look.w / 2 - me.x), -(look.y + look.h / 2 - me.z))
      } else { cam.fov = 50; cam.position.set(centre.x, span * 1.05, centre.z + span * 0.75); orbit.target.copy(centre) }
      cam.updateProjectionMatrix()
    }
    api.current = { setWalk, joy }
    let dragging = false, lx = 0, ly = 0
    const dom = renderer.domElement
    const down = (e: PointerEvent) => { if (!walking) return; dragging = true; lx = e.clientX; ly = e.clientY; dom.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!walking || !dragging) return; me.yaw -= (e.clientX - lx) * 0.005; me.pitch = Math.max(-1.1, Math.min(1.1, me.pitch - (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY }
    const up = () => { dragging = false }
    const kd = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }, ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    dom.addEventListener('pointerdown', down); dom.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    const blocked = (x: number, z: number) => solid.some(s => x > s.x0 - RADIUS && x < s.x1 + RADIUS && z > s.z0 - RADIUS && z < s.z1 + RADIUS)

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
    const ro = new ResizeObserver(resize); ro.observe(el); resize()
    let raf = 0, last = performance.now()
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (t - last) / 1000); last = t
      if (walking) {
        const f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0) - joy.y, s = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0) + joy.x
        if (keys['arrowleft']) me.yaw += 1.8 * dt; if (keys['arrowright']) me.yaw -= 1.8 * dt
        const sp = 1.6 * dt, dx = (-Math.sin(me.yaw) * f + Math.cos(me.yaw) * s) * sp, dz = (-Math.cos(me.yaw) * f - Math.sin(me.yaw) * s) * sp
        if (!blocked(me.x + dx, me.z)) me.x += dx; if (!blocked(me.x, me.z + dz)) me.z += dz
        cam.position.set(me.x, EYE, me.z); cam.rotation.set(me.pitch, me.yaw, 0, 'YXZ')
      } else orbit.update()
      renderer.render(scene, cam)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); orbit.dispose()
      dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt: any = m.material; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x: any) => { x.map?.dispose?.(); x.dispose?.() }) })
      renderer.dispose(); dom.remove(); api.current = null
    }
  }, [layout])

  const toggle = (on: boolean) => { setWalk(on); api.current?.setWalk(on) }
  const stick = (e: React.PointerEvent<HTMLDivElement>, end = false) => {
    const j = api.current?.joy; if (!j) return
    if (end) { j.x = 0; j.y = 0; return }
    const r = e.currentTarget.getBoundingClientRect(); j.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); j.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
  }
  const rooms = layout.rooms.length
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(11,27,69,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog" aria-label={`3D view of ${title}`}>
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', width: 'min(1100px, 100%)', height: 'min(760px, 100%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#2F6DB5', color: '#fff', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, opacity: .9 }}>{rooms} rooms. {walk ? 'Drag to look, keys or stick to walk.' : 'Drag to turn, scroll to zoom.'}</div></div>
          {([false, true] as const).map(w => (
            <button key={String(w)} type="button" onClick={() => toggle(w)} aria-pressed={walk === w} style={{ font: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.7)', background: walk === w ? '#fff' : 'transparent', color: walk === w ? '#1B2F6E' : '#fff', cursor: 'pointer' }}>{w ? 'Walk' : 'Plan'}</button>))}
          <button type="button" onClick={onClose} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.7)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div ref={box} style={{ position: 'absolute', inset: 0 }} />
          {walk && (
            <div onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); stick(e) }} onPointerMove={e => { if (e.buttons) stick(e) }} onPointerUp={e => stick(e, true)} onPointerCancel={e => stick(e, true)}
              style={{ position: 'absolute', left: 20, bottom: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.55)', border: '2px solid rgba(27,47,110,.5)', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2F6E', fontSize: 12, fontWeight: 700 }}>Move</div>)}
        </div>
      </div>
    </div>
  )
}
