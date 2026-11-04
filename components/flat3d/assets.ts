// Shapes, textures and people for the 3D flat viewer. Everything is built in code: no image files, no photographs.
import * as THREE from 'three'
import type { Room, RoomKind } from '@/lib/flat-layout'

// ---------- procedural textures ----------
function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas'); c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
const speckle = (g: CanvasRenderingContext2D, s: number, amount: number) => {
  const d = g.getImageData(0, 0, s, s)
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * amount; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n }
  g.putImageData(d, 0, 0)
}
export const woodTexture = (dark = false) => canvasTex(512, (g, s) => {
  g.fillStyle = dark ? '#9A7448' : '#C49A66'; g.fillRect(0, 0, s, s)
  const n = 6, pw = s / n
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${50 + Math.random() * 40 | 0},${30 + Math.random() * 25 | 0},12,${0.08 + Math.random() * 0.12})`; g.fillRect(i * pw, 0, pw, s)
    g.fillStyle = 'rgba(55,32,14,.55)'; g.fillRect(i * pw, 0, 2, s)
    const cuts = 2 + (i % 3); for (let k = 0; k < cuts; k++) g.fillRect(i * pw, (s / cuts) * k + (i * 37) % 60, pw, 2)
    for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(80,50,25,${Math.random() * 0.18})`; g.beginPath(); const x = i * pw + Math.random() * pw; g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 5, s); g.stroke() }
  }
})
export const tileTexture = (base = '#E9ECEF') => canvasTex(256, (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, 8)
  g.strokeStyle = 'rgba(120,130,140,.55)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke() }
})
export const carpetTexture = (base = '#D9C9AE') => canvasTex(256, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, 22) })
export const plasterTexture = () => canvasTex(256, (g, s) => { g.fillStyle = '#F2EEE7'; g.fillRect(0, 0, s, s); speckle(g, s, 9) })
export const grassTexture = () => canvasTex(256, (g, s) => { g.fillStyle = '#7FA66E'; g.fillRect(0, 0, s, s); speckle(g, s, 46) })
export const roadTexture = () => canvasTex(256, (g, s) => { g.fillStyle = '#4B4F57'; g.fillRect(0, 0, s, s); speckle(g, s, 26) })
export function facadeTexture(w: number, h: number, floors: number, cols: number, tint = '#F4F1EA') {
  const W = 1024, H = Math.round(1024 * h / w)
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!
  g.fillStyle = tint; g.fillRect(0, 0, W, H)
  const fw = W / cols, fh = H / floors
  for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) {
    const x = i * fw + fw * 0.2, y = f * fh + fh * 0.22, ww = fw * 0.6, hh = fh * 0.56
    g.fillStyle = '#5E87AE'; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, ww * 0.45, hh)
    g.strokeStyle = '#E6E1D6'; g.lineWidth = 6; g.strokeRect(x, y, ww, hh)
  }
  g.fillStyle = '#D8D2C4'; for (let f = 1; f < floors; f++) g.fillRect(0, f * fh - 3, W, 6)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
export function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2F78C8'); gr.addColorStop(0.55, '#8CC4F2'); gr.addColorStop(1, '#E8F2FB'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

// ---------- materials and boxes ----------
export const mat = (color: string | number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o })
/** A box centred on (x, z), standing on y. */
export function blk(g: THREE.Object3D, w: number, h: number, d: number, x: number, z: number, m: THREE.Material | string | number, y = 0, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m instanceof THREE.Material ? m : mat(m)); mesh.position.set(x, y + h / 2, z); mesh.rotation.y = ry; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh
}
function cyl(g: THREE.Object3D, rt: number, rb: number, h: number, x: number, z: number, m: THREE.Material | string | number, y = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), m instanceof THREE.Material ? m : mat(m)); mesh.position.set(x, y + h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh
}
function ball(g: THREE.Object3D, r: number, x: number, y: number, z: number, m: THREE.Material | string | number) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m instanceof THREE.Material ? m : mat(m)); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh
}
const plant = (g: THREE.Object3D, x: number, z: number, s = 1) => { cyl(g, 0.16 * s, 0.12 * s, 0.3 * s, x, z, '#B5654A'); ball(g, 0.3 * s, x, 0.62 * s, z, '#3C8A44'); ball(g, 0.2 * s, x + 0.12 * s, 0.85 * s, z + 0.05 * s, '#4F9A55') }

// ---------- furniture, one room at a time ----------
export function furnish(g: THREE.Object3D, r: Room) {
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2
  const wood = mat('#A77A47'), dark = mat('#2B3340'), white = mat('#F6F4EF'), sofa = mat('#7A8CA3'), cushion = mat('#C9A877')
  const kind: RoomKind = r.kind
  if (kind === 'bedroom') {
    const bw = Math.min(1.7, r.w - 0.8), by = r.y + 0.15 + 1.0
    blk(g, 2.8, 0.01, 2.2, cx, by + 0.1, mat('#D6C7AE', { map: carpetTexture('#E6D9C3') }), 0) // rug
    blk(g, bw + 0.1, 0.3, 2.1, cx, by, wood); blk(g, bw, 0.22, 2.0, cx, by, white, 0.3)
    blk(g, bw + 0.02, 0.12, 1.3, cx, by + 0.4, mat('#7F9BBB'), 0.5)
    blk(g, bw + 0.2, 1.0, 0.1, cx, r.y + 0.12, wood)
    blk(g, 0.55, 0.14, 0.34, cx - bw / 4, r.y + 0.5, '#FFFFFF', 0.52); blk(g, 0.55, 0.14, 0.34, cx + bw / 4, r.y + 0.5, '#FFFFFF', 0.52)
    if (r.w >= 3.4) for (const s of [-1, 1]) { blk(g, 0.4, 0.5, 0.4, cx + s * (bw / 2 + 0.35), r.y + 0.35, wood); cyl(g, 0.09, 0.14, 0.26, cx + s * (bw / 2 + 0.35), r.y + 0.35, '#F4E4B8', 0.5) }
    blk(g, Math.min(2.4, r.w - 0.5), 2.0, 0.55, cx, r.y + r.h - 0.32, white); for (let i = -1; i <= 1; i += 2) blk(g, 0.02, 1.8, 0.02, cx + i * 0.01, r.y + r.h - 0.03, '#C9CDD2', 0.1)
    plant(g, r.x + r.w - 0.4, r.y + r.h - 1.2, 0.8)
  } else if (kind === 'living') {
    const sw = Math.min(2.4, r.w - 0.7), sz = r.y + r.h - 0.65
    blk(g, Math.min(3.4, r.w - 0.4), 0.012, 2.1, cx, cz, mat('#CFC7B6', { map: carpetTexture('#D9D1BF') }))
    blk(g, sw, 0.42, 0.95, cx, sz, sofa); blk(g, sw, 0.5, 0.25, cx, sz + 0.37, sofa, 0.42); blk(g, 0.22, 0.28, 0.95, cx - sw / 2 + 0.11, sz, sofa, 0.42); blk(g, 0.22, 0.28, 0.95, cx + sw / 2 - 0.11, sz, sofa, 0.42)
    for (let i = -1; i <= 1; i++) blk(g, sw / 3 - 0.2, 0.14, 0.7, cx + i * (sw / 3 - 0.1), sz - 0.05, mat('#8498B0'), 0.42)
    blk(g, 0.45, 0.4, 0.14, cx - sw / 2 + 0.5, sz + 0.05, cushion, 0.56, 0.4); blk(g, 0.45, 0.4, 0.14, cx + sw / 2 - 0.5, sz + 0.05, mat('#6E8F7A'), 0.56, -0.4)
    blk(g, 1.1, 0.05, 0.6, cx, cz - 0.1, wood, 0.34); for (const [dx, dz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) blk(g, 0.05, 0.34, 0.05, cx + dx, cz - 0.1 + dz, dark)
    const tw = Math.min(2.0, r.w - 0.8); blk(g, tw, 0.45, 0.4, cx, r.y + 0.3, wood); blk(g, 1.25, 0.7, 0.06, cx, r.y + 0.3, dark, 0.7); blk(g, 1.15, 0.6, 0.02, cx, r.y + 0.34, mat('#1D2B44', { emissive: '#223A66', emissiveIntensity: 0.6 }), 0.75)
    cyl(g, 0.12, 0.12, 0.03, r.x + r.w - 0.45, r.y + r.h - 0.45, dark); cyl(g, 0.02, 0.02, 1.4, r.x + r.w - 0.45, r.y + r.h - 0.45, dark); cyl(g, 0.2, 0.28, 0.3, r.x + r.w - 0.45, r.y + r.h - 0.45, '#F4E4B8', 1.4)
    plant(g, r.x + 0.5, r.y + r.h - 0.5, 1.1)
  } else if (kind === 'dining') {
    const tw = Math.min(1.9, r.w - 1.2)
    blk(g, tw, 0.05, 0.95, cx, cz, wood, 0.72); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) blk(g, 0.07, 0.72, 0.07, cx + dx * (tw / 2 - 0.1), cz + dz * 0.38, dark)
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.75, 0.75]) { blk(g, 0.42, 0.05, 0.42, cx + dx, cz + dz, dark, 0.44); blk(g, 0.42, 0.45, 0.05, cx + dx, cz + dz + Math.sign(dz) * 0.2, dark, 0.46) }
    blk(g, 0.25, 0.01, 0.25, cx, cz, white, 0.77); ball(g, 0.1, cx, 0.88, cz, '#C97E6E')
  } else if (kind === 'kitchen') {
    const run = r.w - 0.3
    blk(g, run, 0.88, 0.62, cx, r.y + r.h - 0.35, white); blk(g, run, 0.05, 0.66, cx, r.y + r.h - 0.35, '#3A3F47', 0.88)
    blk(g, 0.55, 0.01, 0.4, cx - run / 4, r.y + r.h - 0.35, '#B8C0C8', 0.93); blk(g, 0.5, 0.02, 0.45, cx + run / 5, r.y + r.h - 0.35, '#15181D', 0.93)
    for (const dx of [-0.12, 0.12]) for (const dz of [-0.1, 0.1]) cyl(g, 0.07, 0.07, 0.015, cx + run / 5 + dx, r.y + r.h - 0.35 + dz, '#444A52', 0.945)
    blk(g, 0.72, 1.9, 0.7, r.x + 0.5, r.y + 0.45, '#CDD2D8'); blk(g, 0.02, 0.5, 0.02, r.x + 0.88, r.y + 0.82, '#8A9099', 1.2)
    if (r.w >= 3.5 && r.h >= 3.6) { blk(g, Math.min(1.8, r.w - 1.6), 0.9, 0.8, cx, cz - 0.1, mat('#35527F')); blk(g, Math.min(1.8, r.w - 1.6) + 0.1, 0.05, 0.9, cx, cz - 0.1, '#EDEDED', 0.9); for (const dx of [-0.5, 0.5]) { cyl(g, 0.16, 0.16, 0.05, cx + dx, cz + 0.65, dark, 0.62); cyl(g, 0.02, 0.02, 0.6, cx + dx, cz + 0.65, '#8A9099') } }
  } else if (kind === 'bath') {
    blk(g, 1.6, 0.52, 0.76, r.x + r.w - 0.95, r.y + 0.48, white); blk(g, 1.44, 0.04, 0.6, r.x + r.w - 0.95, r.y + 0.48, '#D6E7F2', 0.5)
    blk(g, 0.4, 0.35, 0.65, r.x + 0.4, r.y + r.h - 0.55, white); blk(g, 0.4, 0.5, 0.2, r.x + 0.4, r.y + r.h - 0.3, white, 0.35)
    blk(g, 0.6, 0.8, 0.45, r.x + r.w - 0.45, r.y + r.h - 0.35, wood); blk(g, 0.45, 0.08, 0.35, r.x + r.w - 0.45, r.y + r.h - 0.35, white, 0.8); blk(g, 0.5, 0.7, 0.03, r.x + r.w - 0.45, r.y + r.h - 0.03, '#BFD9EC', 1.1)
  } else if (kind === 'balcony') {
    cyl(g, 0.35, 0.35, 0.04, cx, cz, wood, 0.7); cyl(g, 0.04, 0.04, 0.7, cx, cz, dark)
    for (const dx of [-0.65, 0.65]) { blk(g, 0.4, 0.04, 0.4, cx + dx, cz, wood, 0.43); blk(g, 0.4, 0.4, 0.04, cx + dx, cz + Math.sign(dx) * 0.2 * 0, dark, 0.45) }
    plant(g, r.x + 0.4, r.y + 0.4, 0.9); plant(g, r.x + r.w - 0.4, r.y + 0.4, 0.9)
  } else if (kind === 'study') {
    blk(g, 1.5, 0.05, 0.7, cx, r.y + 0.5, wood, 0.74); blk(g, 0.05, 0.74, 0.6, cx - 0.7, r.y + 0.5, dark); blk(g, 0.05, 0.74, 0.6, cx + 0.7, r.y + 0.5, dark)
    blk(g, 0.4, 0.02, 0.3, cx, r.y + 0.5, '#9BA3AD', 0.79); blk(g, 0.4, 0.28, 0.02, cx, r.y + 0.36, '#2B3340', 0.8)
    blk(g, 0.5, 0.06, 0.5, cx, r.y + 1.15, dark, 0.45); blk(g, 0.5, 0.5, 0.06, cx, r.y + 1.4, dark, 0.45)
    blk(g, 1.2, 1.8, 0.3, r.x + r.w - 0.3, cz, white)
  } else if (kind === 'hall') {
    if (r.w >= 1.3 && r.h >= 2) { blk(g, 0.9, 0.04, 0.3, cx, r.y + r.h - 0.25, wood, 0.8); blk(g, 0.04, 0.8, 0.28, cx - 0.4, r.y + r.h - 0.25, dark); blk(g, 0.04, 0.8, 0.28, cx + 0.4, r.y + r.h - 0.25, dark); ball(g, 0.1, cx, 0.92, r.y + r.h - 0.25, '#C97E6E') }
  }
}

// ---------- people ----------
export type Person = { group: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group }
export function makePerson(shirt = '#2F6DB5', trousers = '#C9A77A', skinTone = '#D9A06B', hairColor = '#2A2420'): Person {
  const group = new THREE.Group()
  const m = (c: string) => mat(c)
  const part = (geo: THREE.BufferGeometry, mm: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) => { const o = new THREE.Mesh(geo, mm); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o }
  part(new THREE.BoxGeometry(0.5, 0.62, 0.28), m(shirt), 0, 1.2, 0)
  part(new THREE.SphereGeometry(0.17, 16, 12), m(skinTone), 0, 1.7, 0)
  part(new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), m(hairColor), 0, 1.74, -0.01)
  const limb = (x: number, y: number, w: number, h: number, mm: THREE.Material) => { const gg = new THREE.Group(); gg.position.set(x, y, 0); group.add(gg); part(new THREE.BoxGeometry(w, h, w * 1.05), mm, 0, -h / 2, 0, gg); return gg }
  return { group, legL: limb(-0.13, 0.88, 0.19, 0.88, m(trousers)), legR: limb(0.13, 0.88, 0.19, 0.88, m(trousers)), armL: limb(-0.34, 1.47, 0.14, 0.6, m(shirt)), armR: limb(0.34, 1.47, 0.14, 0.6, m(shirt)) }
}
export function swing(p: Person, phase: number, amount: number) {
  p.legL.rotation.x = Math.sin(phase) * amount; p.legR.rotation.x = -Math.sin(phase) * amount
  p.armL.rotation.x = -Math.sin(phase) * amount * 0.8; p.armR.rotation.x = Math.sin(phase) * amount * 0.8
}

// ---------- the building outside ----------
export function buildExterior(name: string) {
  const g = new THREE.Group()
  let seed = 11; const rn = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const grass = grassTexture(); grass.repeat.set(60, 60); const road = roadTexture(); road.repeat.set(40, 2)
  blk(g, 240, 0.2, 240, 0, 0, mat('#ffffff', { map: grass, roughness: 1 }), -0.2)
  blk(g, 240, 0.05, 12, 0, 22, mat('#ffffff', { map: road, roughness: 0.95 }))
  for (let x = -110; x < 110; x += 8) blk(g, 4, 0.02, 0.35, x + 2, 22, '#F2E6A0', 0.06)
  blk(g, 240, 0.06, 2, 0, 15, '#C9C6BD')
  const BW = 26, BH = 16, BD = 12
  const fm = new THREE.MeshStandardMaterial({ map: facadeTexture(BW, BH, 5, 8), roughness: 0.8 }), side = mat('#EDE8DD')
  const body = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), [side, side, mat('#F4F1EA'), mat('#B9B2A2'), fm, fm]); body.position.set(0, BH / 2, 0); body.castShadow = body.receiveShadow = true; g.add(body)
  blk(g, BW + 0.6, 0.5, BD + 0.6, 0, 0, '#D8D2C4', BH)
  for (let f = 1; f < 5; f++) for (let i = 0; i < 4; i++) { const x = -BW / 2 + 1.6 + i * 6.4 + 1.6; blk(g, 3.2, 0.2, 1.4, x, BD / 2 + 0.7, '#E4DFD3', f * 3.2 - 0.12); blk(g, 3.2, 0.9, 0.06, x, BD / 2 + 1.4, mat('#BFD9EC', { transparent: true, opacity: 0.55 }), f * 3.2 + 0.08) }
  blk(g, 4.4, 3, 0.1, 0, BD / 2 + 0.05, mat('#1E3350', { metalness: 0.3, roughness: 0.2 })); blk(g, 6, 0.2, 2.4, 0, BD / 2 + 1.2, '#1B2F6E', 3); blk(g, 0.15, 3, 2.4, -3, BD / 2 + 1.2, '#E4DFD3'); blk(g, 0.15, 3, 2.4, 3, BD / 2 + 1.2, '#E4DFD3'); blk(g, 8, 0.05, 5, 0, BD / 2 + 4.4, '#BDB6A6')
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d')!; x.fillStyle = '#1B2F6E'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#fff'; x.font = '700 44px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.toUpperCase().slice(0, 20), 256, 50)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.83), new THREE.MeshBasicMaterial({ map: t })); sg.position.set(0, 3.55, BD / 2 + 2.45); g.add(sg)
  }
  const palm = (x: number, z: number, h: number) => { cyl(g, 0.22, 0.34, h, x, z, '#8A6B49'); for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.2, 4), mat('#2F7A3E')); f.position.set(x, h + 0.2, z); f.rotation.set(1.25, 0, i * Math.PI / 4); f.translateY(1.9); f.castShadow = true; g.add(f) } }
  const tree = (x: number, z: number, s: number) => { cyl(g, 0.2 * s, 0.3 * s, 3 * s, x, z, '#6E5236'); ball(g, 1.9 * s, x, 3.6 * s, z, '#3C8A44'); ball(g, 1.4 * s, x + s, 3.2 * s, z + 0.4 * s, '#3C8A44') }
  for (const x of [-16, -9, 9, 16, -22, 22]) palm(x, BD / 2 + 4 + (Math.abs(x) % 3), 7 + (Math.abs(x) % 3))
  for (const [x, z] of [[-12, -14], [0, -16], [12, -14], [-24, 4], [24, 4]]) tree(x, z, 1.2)
  for (let x = -BW / 2; x < BW / 2; x += 1.4) if (Math.abs(x) > 3.6) blk(g, 0.9, 0.7, 0.9, x, BD / 2 + 1.8, '#4F9A55')
  // neighbourhood
  const FT = [facadeTexture(24, 12, 4, 8), facadeTexture(20, 28, 9, 6), facadeTexture(30, 18, 6, 10), facadeTexture(16, 40, 13, 5)]
  const TINT = ['#ffffff', '#F3E6D2', '#DCE6EE', '#E9DACB', '#E3E8DC']
  const block = (cx: number, cz: number, w: number, h: number, d: number, k: number) => {
    const f = new THREE.MeshStandardMaterial({ map: FT[k % 4], color: TINT[Math.floor(rn() * 5)], roughness: 0.85 }), sd = mat('#E6E0D4')
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sd, sd, mat('#CFC8BA'), mat('#B9B2A2'), f, f]); m.position.set(cx, h / 2, cz); m.castShadow = m.receiveShadow = true; g.add(m)
  }
  for (let i = 0; i < 5; i++) { const x = 30 + i * 17 + rn() * 3; block(x, -1, 15, 8 + rn() * 8, 11, i); block(-x, -1, 15, 8 + rn() * 8, 11, i + 1) }
  for (let i = -5; i <= 5; i++) block(i * 17 + rn() * 3, 84, 15, 10 + rn() * 16, 12, i + 7)
  for (let i = -5; i <= 5; i++) block(i * 20 + rn() * 4, -26 - rn() * 4, 16, 16 + rn() * 22, 13, i + 5)
  for (let i = -4; i <= 4; i++) block(i * 26 + rn() * 5, -62, 18, 30 + rn() * 28, 14, i + 3)
  return { group: g, frontZ: BD / 2 }
}
