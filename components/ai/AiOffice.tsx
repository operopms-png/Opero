'use client'
// AI Command Centre → AI Office: a 3D office where each desk is one part of your AI team. Bubbles and badges come from the
// company's own AI activity log and approvals queue (/api/ai-office).
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { staffApi } from '../../lib/staff-api'

const BASE = '/staff-centre/ai-command-centre'
type Item = { at: string; agent: string; text: string }
type Data = { items: Item[]; waiting: Item[]; done30: number; agentsOn: number; agentsTotal: number }

type Desk = { f?: boolean; k: string; n: string; r: string; sk: number; hair: number; x: number; z: number; match: (a: string) => boolean }
const DESKS: Desk[] = [
  { f: true, k: 'ava', n: 'Ava', r: 'Chief assistant', sk: 0xb98568, hair: 0x1b1512, x: -3.6, z: -1.6, match: a => /^(chief|onboarding|ops_intel|goal|meetings|templates|building)/.test(a) },
  { f: true, k: 'pm', n: 'Property management', r: 'Tenancies, repairs, compliance', sk: 0x8a5a40, hair: 0x120d0a, x: -1.2, z: -1.6, match: a => /^(pm_|rent_match|doc_|maint|weekly|tenant)/.test(a) },
  { f: true, k: 'vr', n: 'Vacation rentals', r: 'Guests, cleaning, pricing', sk: 0x5e3b2c, hair: 0x0c0907, x: 1.2, z: -1.6, match: a => /^(guest|cleaning|maintenance|revenue|owner|leads)/.test(a) },
  { f: true, k: 'ea', n: 'Estate agency and sales', r: 'Viewings, listings, follow-ups', sk: 0xd7a98a, hair: 0x3a2417, x: 3.6, z: -1.6, match: a => /^(ea_|sales)/.test(a) },
  { k: 'inv', n: 'Investments', r: 'Deals, portfolio, forecasts', sk: 0xe0b894, hair: 0x15110e, x: -3.6, z: 2.4, match: a => /^(market|portfolio|deal)/.test(a) },
  { k: 'fin', n: 'Finance', r: 'Cash flow, month-end, checks', sk: 0x7a4b33, hair: 0x0d0a08, x: -1.2, z: 2.4, match: a => /^(accounting|unusual|cashflow)/.test(a) },
  { f: true, k: 'mkt', n: 'Marketing', r: 'Social posts', sk: 0x8f5d44, hair: 0x120d0a, x: 1.2, z: 2.4, match: a => /^marketing/.test(a) },
  { k: 'dev', n: 'Developments', r: 'Feasibility, investor updates', sk: 0xc79574, hair: 0x1b1512, x: 3.6, z: 2.4, match: a => /^dev_/.test(a) },
]
const SHORT: Record<string, string> = { pm: 'Property', vr: 'Rentals', ea: 'Agency' }
const deskOf = (agent: string) => (DESKS.find(d => d.match(agent)) ?? DESKS[0]).k
const ago = (d: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return m < 2 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago' }
const initials = (n: string) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function AiOffice() {
  const [data, setData] = useState<Data | null>(null), [err, setErr] = useState(''), [sel, setSel] = useState<string | null>(null), [noGl, setNoGl] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const tagRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => { const load = () => staffApi<Data>('/api/ai-office').then(setData).catch(e => setErr(e.message)); load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  const byDesk = useMemo(() => {
    const m: Record<string, { log: Item[]; waiting: Item[] }> = {}
    DESKS.forEach(d => { m[d.k] = { log: [], waiting: [] } })
    ;(data?.items ?? []).forEach(i => m[deskOf(i.agent)].log.push(i))
    ;(data?.waiting ?? []).forEach(i => m[deskOf(i.agent)].waiting.push(i))
    return m
  }, [data])
  const byDeskRef = useRef(byDesk)
  useEffect(() => { byDeskRef.current = byDesk }, [byDesk])

  useEffect(() => {
    const stage = stageRef.current; if (!stage) return
    let ren: THREE.WebGLRenderer
    try { ren = new THREE.WebGLRenderer({ antialias: true }) } catch { queueMicrotask(() => setNoGl(true)); return }
    const P = Math.PI
    const disposables: { dispose: () => void }[] = []
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xEEF3FB); scene.fog = new THREE.Fog(0xEEF3FB, 16, 34)
    const cam = new THREE.PerspectiveCamera(42, 1, .1, 100)
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2)); ren.outputColorSpace = THREE.SRGBColorSpace; ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap
    stage.insertBefore(ren.domElement, stage.firstChild)
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a2548, .95 * P))
    const sun = new THREE.DirectionalLight(0xffffff, .85 * P); sun.position.set(-5, 11, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 }); scene.add(sun)
    const M = (c: number, o: THREE.MeshStandardMaterialParameters = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: .7, metalness: .05, ...o }); disposables.push(m); return m }
    const add = <T extends THREE.Mesh>(m: T, parent: THREE.Object3D = scene) => { disposables.push(m.geometry); parent.add(m); return m }
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, cast = true) => { const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; return b }
    const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t }

    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(30, 24), M(0xE3EAF6, { roughness: .9 }))); floor.rotation.x = -P / 2; floor.receiveShadow = true
    box(12.4, .04, 9.2, M(0xC9D6EE, { roughness: .95 }), 0, .02, .4, false)
    const grid = new THREE.GridHelper(30, 30, 0xD3DDEE, 0xDCE5F3); grid.position.y = .01; scene.add(grid)
    box(14, 4.2, .3, M(0xD5DFF1), 0, 2.1, -5.4, false)
    const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 256; const lx = lc.getContext('2d')!
    lx.fillStyle = '#D5DFF1'; lx.fillRect(0, 0, 1024, 256); lx.fillStyle = '#1B2F6E'; lx.font = '700 96px Inter,Arial,sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle'
    lx.fillText('N O V O U R Q', 512, 112); lx.fillStyle = '#2F6DB5'; lx.font = '500 34px Inter,Arial,sans-serif'; lx.fillText('AI OFFICE', 512, 196)
    const lm = new THREE.MeshBasicMaterial({ map: tex(lc) }); disposables.push(lm)
    const logo = add(new THREE.Mesh(new THREE.PlaneGeometry(8, 2), lm)); logo.position.set(0, 2.5, -5.22)
    const screenTex = (seed: number) => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d')!; x.fillStyle = '#0a1a3d'; x.fillRect(0, 0, 256, 160)
      for (let i = 0; i < 9; i++) { const h = 20 + ((seed * 37 + i * 53) % 90); x.fillStyle = i % 3 ? '#5b9bff' : '#43d6a0'; x.fillRect(14 + i * 26, 140 - h, 16, h) }
      x.fillStyle = '#22305c'; for (let i = 0; i < 3; i++) x.fillRect(14, 12 + i * 8, 120 - i * 20, 3); return tex(c) }

    const figs: { g: THREE.Group; head: THREE.Mesh; arms: THREE.Mesh[]; i: number; d: Desk; mon: THREE.MeshBasicMaterial }[] = []
    DESKS.forEach((d, i) => {
      const g = new THREE.Group(); g.position.set(d.x, 0, d.z); scene.add(g)
      const desk = add(new THREE.Mesh(new THREE.BoxGeometry(2, .09, 1), M(0xe9eef9, { roughness: .5 })), g); desk.position.set(0, .78, 1); desk.castShadow = desk.receiveShadow = true
      ;[-.9, .9].forEach(lx2 => { const l = add(new THREE.Mesh(new THREE.BoxGeometry(.08, .76, .9), M(0x2a3a6b)), g); l.position.set(lx2, .38, 1); l.castShadow = true })
      const mon = add(new THREE.Mesh(new THREE.BoxGeometry(.95, .58, .05), M(0x0a1228)), g); mon.position.set(0, 1.3, 1.18); mon.castShadow = true
      const sm = new THREE.MeshBasicMaterial({ map: screenTex(i + 1) }); disposables.push(sm)
      const scr = add(new THREE.Mesh(new THREE.PlaneGeometry(.88, .52), sm), g); scr.position.set(0, 1.3, 1.15); scr.rotation.y = P
      const st = add(new THREE.Mesh(new THREE.BoxGeometry(.08, .3, .06), M(0x2a3a6b)), g); st.position.set(0, .97, 1.17)
      const ch = add(new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .08, 24), M(0x2a3a6b)), g); ch.position.set(0, .5, -.1); ch.castShadow = true
      const cb = add(new THREE.Mesh(new THREE.BoxGeometry(.6, .7, .08), M(0x2a3a6b)), g); cb.position.set(0, .9, -.45); cb.castShadow = true
      const top = d.f ? 0x2F6DB5 : 0x14234a
      const body = add(new THREE.Mesh(new THREE.CylinderGeometry(d.f ? .24 : .27, d.f ? .29 : .31, .7, 24), M(top, { roughness: .8 })), g); body.position.set(0, 1.02, .05); body.castShadow = true
      const arms = [-1, 1].map(s => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(d.f ? .06 : .075, d.f ? .06 : .075, .62, 12), M(top)), g); m.position.set(s * (d.f ? .32 : .36), .98, .28); m.rotation.x = 1.15; m.castShadow = true; return m })
      const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .12, 12), M(d.sk)), g); neck.position.set(0, 1.42, .05)
      const head = add(new THREE.Mesh(new THREE.SphereGeometry(.24, 32, 24), M(d.sk, { roughness: .55 })), g); head.position.set(0, 1.62, .06); head.castShadow = true
      const hair = add(new THREE.Mesh(new THREE.SphereGeometry(.255, 32, 24, 0, P * 2, 0, P * .52), M(d.hair, { roughness: .9 })), g); hair.position.set(0, 1.64, .04); hair.rotation.x = -.25
      ;[-1, 1].forEach(s => { const e = add(new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), M(0x111111)), g); e.position.set(s * .085, 1.64, .28) })
      if (d.f) {
        const back = add(new THREE.Mesh(new THREE.SphereGeometry(.27, 24, 18), M(d.hair, { roughness: .9 })), g); back.scale.set(1, 1.75, .8); back.position.set(0, 1.4, -.07)
        ;[-1, 1].forEach(s => {
          const lock = add(new THREE.Mesh(new THREE.CylinderGeometry(.055, .045, .5, 12), M(d.hair, { roughness: .9 })), g); lock.position.set(s * .225, 1.42, .08)
          const lash = add(new THREE.Mesh(new THREE.BoxGeometry(.075, .012, .012), M(0x0a0a0a)), g); lash.position.set(s * .085, 1.675, .272)
          const ear = add(new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), M(0xe8c15a, { metalness: .6, roughness: .3 })), g); ear.position.set(s * .235, 1.55, .06)
        })
        const lips = add(new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), M(0xc2415a, { roughness: .4 })), g); lips.scale.set(1.5, .5, .5); lips.position.set(0, 1.545, .228)
      }
      figs.push({ g, head, arms, i, d, mon: sm })
    })
    box(2.6, .03, 2.6, M(0xB7C6E6, { roughness: .95 }), 7, .02, -1.5, false)
    const tb = add(new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .08, 32), M(0xe9eef9, { roughness: .5 }))); tb.position.set(7, .78, -1.5); tb.castShadow = tb.receiveShadow = true
    const tl = add(new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .76, 16), M(0x2a3a6b))); tl.position.set(7, .38, -1.5)
    ;[[-6.2, -4.4], [6.4, -4.4], [6.4, 4.2]].forEach(([x, z]) => { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(.22, .18, .4, 16), M(0x2a3a6b))); p.position.set(x, .2, z); const l = add(new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 1), M(0x2f8f6b, { roughness: .9 }))); l.position.set(x, .8, z); l.castShadow = true })

    const rad = 15.5; let az = 0, el = .72; const tx = 0, ty = .9, tz = .2
    let drag: { x: number; y: number; az: number; el: number } | null = null, auto = true, resume: ReturnType<typeof setTimeout> | undefined, raf = 0, speak = 0, speakAt = 0
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, az, el }; auto = false; stage.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!drag) return; az = drag.az - (e.clientX - drag.x) * .006; el = Math.max(.35, Math.min(1.25, drag.el + (e.clientY - drag.y) * .005)) }
    const up = () => { drag = null; clearTimeout(resume); resume = setTimeout(() => { if (!drag) auto = true }, 6000) }
    stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', up)
    const size = () => { const w = stage.clientWidth, h = stage.clientHeight; ren.setSize(w, h); cam.aspect = w / h; cam.fov = w < 520 ? 58 : 42; cam.updateProjectionMatrix() }
    window.addEventListener('resize', size); size()
    const v = new THREE.Vector3()
    const loop = (t: number) => {
      if (auto) az += Math.sin(t / 6000) * .0012
      cam.position.set(tx + rad * Math.sin(az) * Math.cos(el), ty + rad * Math.sin(el), tz + rad * Math.cos(az) * Math.cos(el)); cam.lookAt(tx, ty, tz)
      figs.forEach(f => { const w = Math.sin(t / 420 + f.i * 1.7); f.arms[0].rotation.x = 1.15 + w * .08; f.arms[1].rotation.x = 1.15 - w * .08; f.head.rotation.y = Math.sin(t / 1700 + f.i) * .25; f.head.position.y = 1.62 + Math.sin(t / 900 + f.i) * .006 })
      // Rotate the speech bubble between people who have something to say.
      if (t - speakAt > 3200) {
        speakAt = t
        const talkers = DESKS.filter(d => byDeskRef.current[d.k].log.length || byDeskRef.current[d.k].waiting.length)
        DESKS.forEach(d => { const el2 = tagRefs.current[d.k]; if (el2) el2.dataset.on = '0' })
        if (talkers.length) { const d = talkers[speak % talkers.length]; const el2 = tagRefs.current[d.k]; if (el2) el2.dataset.on = '1'; speak++ }
      }
      const w = stage.clientWidth, h = stage.clientHeight
      figs.forEach(f => { const b = tagRefs.current[f.d.k]; if (!b) return; v.set(f.d.x, 1.95, f.d.z + .06).project(cam); b.style.left = ((v.x * .5 + .5) * w) + 'px'; b.style.top = ((-v.y * .5 + .5) * h) + 'px'; b.style.zIndex = String(Math.round(1000 - v.z * 400)) })
      ren.render(scene, cam); raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resume)
      stage.removeEventListener('pointerdown', down); stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerup', up); window.removeEventListener('resize', size)
      disposables.forEach(d => d.dispose()); ren.dispose(); ren.domElement.remove()
    }
  }, [])

  const waitingTotal = data?.waiting.length ?? 0
  const d = DESKS.find(x => x.k === sel) ?? null
  const dd = d ? byDesk[d.k] : null
  const said = (k: string) => { const e = byDesk[k]; return e.waiting[0] ? `Waiting for you: ${e.waiting[0].text}` : e.log[0] ? e.log[0].text : '' }

  return (
    <div className="aio">
      <style>{`
        .aio{--bg:#F5F7FB;--panel:#fff;--line:#D9E2F0;--fg:#1B2F6E;--mut:#667085;--acc:#2F6DB5;--ok:#12B76A;--warn:#F79009;--soft:#EEF3FB;background:var(--bg);color:var(--fg);min-height:calc(100vh - var(--hub-h,0px));padding:18px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));box-sizing:border-box}
        .aio *{box-sizing:border-box}
        .aio-wrap{max-width:1180px;margin:0 auto}
        .aio h1{font-size:22px;margin:0 0 4px;font-weight:700}
        .aio .sub{font-size:13.5px;color:var(--mut);margin:0 0 14px;max-width:70ch}
        .aio-grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px}
        @media(max-width:900px){.aio-grid{grid-template-columns:minmax(0,1fr)}}
        .aio-stage{position:relative;height:min(64vh,560px);min-height:360px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--soft);touch-action:none;cursor:grab}
        .aio-stage canvas{display:block;width:100%;height:100%}
        .aio-hud{position:absolute;left:12px;top:12px;display:flex;gap:8px;flex-wrap:wrap;pointer-events:none;z-index:2000}
        .aio-chip{background:rgba(255,255,255,.92);border:1px solid var(--line);border-radius:999px;padding:5px 11px;font-size:12px}
        .aio-chip b{color:var(--warn)}
        .aio-hint{position:absolute;left:12px;bottom:10px;font-size:11.5px;color:var(--mut);pointer-events:none;z-index:2000}
        .aio-nt{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:0;background:none;padding:0;font-family:inherit;color:var(--fg)}
        .aio-av{position:relative;width:34px;height:34px;border-radius:50%;border:2px solid var(--acc);background:#fff;color:var(--fg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
        .aio-nt[data-on="1"] .aio-av,.aio-nt.sel .aio-av{border-color:var(--ok);box-shadow:0 0 0 4px rgba(67,214,160,.25)}
        .aio-badge{position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;border-radius:9px;background:var(--warn);color:#2a1a00;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
        .aio-nm{font-size:11px;font-weight:600;background:rgba(255,255,255,.92);border:1px solid var(--line);border-radius:999px;padding:1px 8px;white-space:nowrap}
        .aio-bub{position:absolute;bottom:62px;left:50%;transform:translateX(-50%);width:max-content;max-width:170px;background:var(--fg);color:#fff;border-radius:10px;padding:6px 9px;font-size:11.5px;line-height:1.35;text-align:left;font-weight:500;opacity:0;transition:opacity .25s;pointer-events:none}
        .aio-nt[data-on="1"] .aio-bub,.aio-nt.sel .aio-bub{opacity:1}
        .aio-side{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;min-width:0}
        .aio-side h2{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--mut);margin:0 0 10px;font-weight:600}
        .aio-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
        .aio-st{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 10px}
        .aio-st b{display:block;font-size:20px}.aio-st span{font-size:11.5px;color:var(--mut)}
        .aio-who{display:flex;gap:10px;align-items:center;margin-bottom:8px}
        .aio-who .aio-av{width:44px;height:44px;font-size:14px;flex:none}
        .aio-who b{display:block;font-size:15px}.aio-who span{font-size:12.5px;color:var(--mut)}
        .aio-feed{list-style:none;margin:8px 0 12px;padding:0;display:flex;flex-direction:column;gap:7px}
        .aio-feed li{font-size:13px;line-height:1.4;background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:8px 10px;overflow-wrap:anywhere}
        .aio-feed li.w{border-color:#F5C77E}
        .aio-feed time{display:block;font-size:11px;color:var(--mut);margin-top:2px}
        .aio-act{display:block;text-align:center;background:var(--acc);color:#fff;border-radius:9px;padding:10px;font-weight:700;font-size:13.5px;text-decoration:none;margin-top:6px}
        .aio-empty{font-size:13px;color:var(--mut);padding:6px 0 12px}
        .aio-note{font-size:12px;color:var(--mut);margin-top:12px;line-height:1.5}
      `}</style>
      <div className="aio-wrap">
        <h1>AI Office</h1>
        <p className="sub">Your AI team at work. Each desk is one part of your business. The bubble shows what it last did, and the orange badge is what is waiting for your yes.</p>
        {err && <div style={{ color: '#ff8a8a', marginBottom: 10, fontSize: 13 }}>{err}</div>}
        <div className="aio-grid">
          <div className="aio-stage" ref={stageRef}>
            <div className="aio-hud"><span className="aio-chip">Waiting for you: <b>{waitingTotal}</b></span><span className="aio-chip">{data ? `${data.agentsOn} of ${data.agentsTotal} skills on` : 'Loading…'}</span></div>
            <div className="aio-hint">Drag to look around · tap a desk</div>
            {noGl && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--mut)' }}>This device cannot show the 3D office. Pick a desk from the list on the right instead.</div>}
            {DESKS.map(x => (
              <button key={x.k} ref={el => { tagRefs.current[x.k] = el }} className={'aio-nt' + (sel === x.k ? ' sel' : '')} aria-label={`${x.n}, ${byDesk[x.k].waiting.length} waiting`} onClick={e => { e.stopPropagation(); setSel(x.k) }} style={{ left: '-100px', top: '-100px' }}>
                <span className="aio-av">{initials(x.n)}{byDesk[x.k].waiting.length > 0 && <span className="aio-badge">{byDesk[x.k].waiting.length}</span>}</span>
                <span className="aio-nm">{SHORT[x.k] ?? x.n}</span>
                {said(x.k) && <span className="aio-bub">{said(x.k)}</span>}
              </button>
            ))}
          </div>
          <aside className="aio-side">
            <h2>Last 30 days</h2>
            <div className="aio-stats">
              <div className="aio-st"><b>{data?.done30 ?? '–'}</b><span>Jobs approved and done</span></div>
              <div className="aio-st"><b>{waitingTotal}</b><span>For your approval</span></div>
            </div>
            <h2>Selected</h2>
            {!d || !dd ? <div className="aio-empty">Tap a desk in the office (or pick one below) to see what it is working on.</div> : <>
              <div className="aio-who"><span className="aio-av">{initials(d.n)}</span><div><b>{d.n}</b><span>{d.r}</span></div></div>
              <ul className="aio-feed">
                {dd.waiting.slice(0, 3).map((i, n) => <li key={'w' + n} className="w">Waiting for you: {i.text}<time>{ago(i.at)}</time></li>)}
                {dd.log.slice(0, 5).map((i, n) => <li key={n}>{i.text}<time>{ago(i.at)}</time></li>)}
                {!dd.log.length && !dd.waiting.length && <li>Nothing logged here yet.</li>}
              </ul>
              <Link className="aio-act" href={dd.waiting.length ? BASE + '/approvals' : BASE + '/activity'}>{dd.waiting.length ? 'Open approvals' : 'Open activity log'}</Link>
            </>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {DESKS.map(x => <button key={x.k} onClick={() => setSel(x.k)} style={{ background: sel === x.k ? '#E8EDF8' : '#fff', color: 'inherit', border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{x.n}{byDesk[x.k].waiting.length ? ` (${byDesk[x.k].waiting.length})` : ''}</button>)}
            </div>
            <p className="aio-note">Refreshes every minute from your own AI activity log and approvals. Desks only show work your own company AI has actually done.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
