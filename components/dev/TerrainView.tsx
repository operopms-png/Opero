'use client'
// 3D view of the ground and the pads. Drag to turn, scroll to zoom. Heights can be exaggerated to see the slope.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { type Grid, type Pad, at, cellSize } from '@/lib/dev-terrain'

type PadRow = Pad & { level: number }

export default function TerrainView({ grid, pads, exaggeration = 2, height = 420, view = 'angle' }: { grid: Grid; pads: PadRow[]; exaggeration?: number; height?: number; view?: 'angle' | 'top' }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current; if (!el) return
    const w = el.clientWidth || 800, h = height
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h)
    renderer.setClearColor(0xeef4fb)
    el.innerHTML = ''; el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, w / h, 1, 5000)
    const S = grid.size, c = cellSize(grid)
    let zMin = Infinity, zMax = -Infinity
    for (const v of grid.z) { zMin = Math.min(zMin, v); zMax = Math.max(zMax, v) }
    const range = Math.max(0.5, zMax - zMin)
    const zs = (v: number) => (v - zMin) * exaggeration

    // ground: one vertex per grid point, coloured by height, low ground tinted blue (creek, wet ground)
    const geo = new THREE.PlaneGeometry(S, S, grid.n - 1, grid.n - 1)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const lo = new THREE.Color('#2e7d4f'), mid = new THREE.Color('#b9c46a'), hi = new THREE.Color('#d9a05b'), wet = new THREE.Color('#4a90c8')
    for (let j = 0; j < grid.n; j++) for (let i = 0; i < grid.n; i++) {
      const idx = j * grid.n + i
      const vi = idx
      const v = at(grid, i, j), t = (v - zMin) / range
      pos.setXYZ(vi, i * c - S / 2, zs(v), j * c - S / 2 - 0)
      const color = new THREE.Color()
      if (t < 0.1) color.copy(wet).lerp(lo, t / 0.1)
      else if (t < 0.55) color.copy(lo).lerp(mid, (t - 0.1) / 0.45)
      else color.copy(mid).lerp(hi, (t - 0.55) / 0.45)
      col[vi * 3] = color.r; col[vi * 3 + 1] = color.g; col[vi * 3 + 2] = color.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.computeVertexNormals()
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))
    scene.add(ground)

    // a base under the ground so the edge reads as a slab
    const base = new THREE.Mesh(new THREE.BoxGeometry(S, 2, S), new THREE.MeshLambertMaterial({ color: 0xcfd8e3 }))
    base.position.set(0, -1.2, 0); scene.add(base)

    // pads: flat yellow slabs at their level, with a thin outline
    for (const p of pads) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(p.w, 1.2, p.d), new THREE.MeshLambertMaterial({ color: 0xf2c230 }))
      slab.position.set(p.x + p.w / 2 - S / 2, zs(p.level) + 0.2, p.y + p.d / 2 - S / 2)
      scene.add(slab)
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: 0x8a6a00 }))
      edge.position.copy(slab.position); scene.add(edge)
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-S, S, S * 0.6); scene.add(sun)
    const ctrl = new OrbitControls(cam, renderer.domElement)
    ctrl.enableDamping = true; ctrl.maxPolarAngle = Math.PI / 2.05
    if (view === 'top') { cam.position.set(0, S * 1.5, 0.01) } else { cam.position.set(S * 0.72, S * 0.78, S * 1.12) }
    ctrl.target.set(0, range * exaggeration * 0.25, 0); ctrl.update()
    let raf = 0
    const loop = () => { ctrl.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop) }
    loop()
    const onResize = () => { const nw = el.clientWidth || w; renderer.setSize(nw, h); cam.aspect = nw / h; cam.updateProjectionMatrix() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ctrl.dispose(); geo.dispose(); renderer.dispose(); el.innerHTML = '' }
  }, [grid, pads, exaggeration, height, view])
  return <div ref={host} style={{ width: '100%', height, borderRadius: 10, overflow: 'hidden', border: '1px solid #E4E7EC', background: '#EEF4FB' }} />
}
