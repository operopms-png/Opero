'use client'
// Floor plan for one flat: upload the plan, let the AI read the rooms (or draw them), then see it in 3D.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { KINDS, type Layout, type Room, type RoomKind } from '@/lib/flat-layout'
import FlatViewer3D from '@/components/FlatViewer3D'

const LINE = '#D9E2F0', MUTED = '#667085', TXT = '#101828', NAVY = '#1B2F6E', BLUE = '#2F6DB5'
const PAL: Record<RoomKind, string> = { bedroom: '#BFD7F2', living: '#F3D9A8', dining: '#F3D9A8', kitchen: '#D5E8D4', bath: '#CFE8EF', hall: '#E6E0D2', balcony: '#C9DDF0', study: '#E4D3EE', storage: '#E3E3E3', other: '#E3E3E3' }
const snap = (n: number) => Math.round(n * 4) / 4

export default function FlatPlanEditor({ source, unit, onSaved, onClose }: { source: 'pm' | 'estate' | 'dev'; unit: { id: string; unit: string; planUrl?: string | null; layout?: any }; onSaved: (p: { planUrl?: string | null; layout?: Layout | null }) => void; onClose: () => void }) {
  const [rooms, setRooms] = useState<Room[]>(unit.layout?.rooms ?? [])
  const [planUrl, setPlanUrl] = useState<string | null>(unit.planUrl ?? null)
  const [W, setW] = useState<number>(Math.max(10, Math.ceil(unit.layout?.w ?? 12)))
  const [D, setD] = useState<number>(Math.max(8, Math.ceil(unit.layout?.d ?? 10)))
  const [sel, setSel] = useState<string | null>(null)
  const [kind, setKind] = useState<RoomKind>('bedroom')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [view, setView] = useState(false)
  const cv = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [imgTick, setImgTick] = useState(0)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const PX = 52 // pixels per metre
  const isPdf = !!planUrl && /\.pdf($|\?)/i.test(planUrl)

  useEffect(() => { img.current = null; if (!planUrl || isPdf) { setImgTick(t => t + 1); return } const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => { img.current = i; setImgTick(t => t + 1) }; i.src = planUrl }, [planUrl, isPdf])

  const draw = (preview?: { x: number; y: number; w: number; h: number }) => {
    const c = cv.current; if (!c) return; const g = c.getContext('2d')!
    g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height)
    if (img.current) { const ar = img.current.height / img.current.width; g.globalAlpha = 0.4; g.drawImage(img.current, 0, 0, W * PX, W * PX * ar); g.globalAlpha = 1 }
    g.strokeStyle = '#EEF1F6'; g.lineWidth = 1
    for (let x = 0; x <= W; x++) { g.beginPath(); g.moveTo(x * PX, 0); g.lineTo(x * PX, D * PX); g.stroke() }
    for (let y = 0; y <= D; y++) { g.beginPath(); g.moveTo(0, y * PX); g.lineTo(W * PX, y * PX); g.stroke() }
    rooms.forEach(r => {
      g.fillStyle = PAL[r.kind] + 'CC'; g.fillRect(r.x * PX, r.y * PX, r.w * PX, r.h * PX)
      g.strokeStyle = sel === r.id ? NAVY : '#5A6B8C'; g.lineWidth = sel === r.id ? 3 : 1.5; g.strokeRect(r.x * PX, r.y * PX, r.w * PX, r.h * PX)
      g.fillStyle = TXT; g.font = '600 12px DM Sans, Arial'; g.textAlign = 'center'; g.fillText(r.name, (r.x + r.w / 2) * PX, (r.y + r.h / 2) * PX); g.font = '11px DM Sans, Arial'; g.fillStyle = MUTED; g.fillText(`${r.w} x ${r.h} m`, (r.x + r.w / 2) * PX, (r.y + r.h / 2) * PX + 14)
    })
    if (preview) { g.strokeStyle = BLUE; g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeRect(preview.x * PX, preview.y * PX, preview.w * PX, preview.h * PX); g.setLineDash([]) }
  }
  useEffect(() => { draw() }) // eslint-disable-line react-hooks/exhaustive-deps

  const pt = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * D } }
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => { const p = pt(e); const hit = [...rooms].reverse().find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); if (hit) { setSel(hit.id); return } setSel(null); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: snap(p.x), y: snap(p.y), cx: snap(p.x), cy: snap(p.y) } }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => { const d = drag.current; if (!d) return; const p = pt(e); d.cx = snap(p.x); d.cy = snap(p.y); draw({ x: Math.min(d.x, d.cx), y: Math.min(d.y, d.cy), w: Math.abs(d.cx - d.x), h: Math.abs(d.cy - d.y) }) }
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return
    const w = Math.abs(d.cx - d.x), h = Math.abs(d.cy - d.y); if (w < 0.8 || h < 0.8) { draw(); return }
    const count = rooms.filter(r => r.kind === kind).length + 1, label = KINDS.find(k => k.kind === kind)!.label
    const room: Room = { id: 'r' + Date.now().toString(36), kind, name: ['bedroom', 'bath', 'balcony', 'study'].includes(kind) && count > 1 ? `${label} ${count}` : label, x: Math.min(d.x, d.cx), y: Math.min(d.y, d.cy), w, h }
    setRooms(rs => [...rs, room]); setSel(room.id)
  }
  const cur = rooms.find(r => r.id === sel) ?? null
  const patch = (p: Partial<Room>) => setRooms(rs => rs.map(r => (r.id === sel ? { ...r, ...p } : r)))
  const layout: Layout | null = useMemo(() => (rooms.length ? { w: Math.max(...rooms.map(r => r.x + r.w)) + 0.5, d: Math.max(...rooms.map(r => r.y + r.h)) + 0.5, rooms } : null), [rooms])

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? ''
  const call = async (url: string, body: any) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) }); return { ok: r.ok, d: await r.json().catch(() => ({})) } }
  const upload = async (f: File) => {
    setBusy('upload'); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const path = `floor-plans/${user?.id ?? 'x'}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('pm-files').upload(path, f, { contentType: f.type || undefined })
    if (error) { setBusy(''); setMsg('Could not upload that file. ' + error.message); return }
    const url = supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
    const r = await call('/api/property-map/unit', { source, unitId: unit.id, planUrl: url })
    setBusy(''); if (!r.ok) { setMsg(r.d.error || 'Could not save the plan'); return }
    setPlanUrl(url); onSaved({ planUrl: url }); setMsg('Plan saved. Now read it with the AI, or draw the rooms.')
  }
  const readAi = async () => {
    if (!planUrl) return; setBusy('ai'); setMsg('')
    const r = await call('/api/property-map/read-plan', { planUrl })
    setBusy(''); if (!r.ok) { setMsg(r.d.error || 'The AI could not read this plan'); return }
    const l: Layout = r.d.layout; setRooms(l.rooms); setW(Math.max(10, Math.ceil(l.w))); setD(Math.max(8, Math.ceil(l.d))); setSel(null); setMsg('The AI drew the rooms. Check the sizes against the plan and fix any that are off, then save.')
  }
  const save = async () => {
    if (!layout) { setMsg('Add at least one room first'); return }
    setBusy('save'); const r = await call('/api/property-map/unit', { source, unitId: unit.id, layout })
    setBusy(''); if (!r.ok) { setMsg(r.d.error || 'Could not save'); return }
    onSaved({ layout }); setMsg('Saved. The 3D view and walk-through of this flat are now on the tower.')
  }
  const btn = (primary = false): React.CSSProperties => ({ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${primary ? NAVY : LINE}`, background: primary ? NAVY : '#EAF3FC', color: primary ? '#fff' : BLUE, cursor: 'pointer' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1900, background: 'rgba(11,27,69,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} role="dialog" aria-label={`Floor plan for flat ${unit.unit}`}>
      <div style={{ background: '#fff', borderRadius: 14, width: 'min(1000px,100%)', maxHeight: '100%', overflow: 'auto' }}>
        <div style={{ background: '#2F6DB5', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>Floor plan, flat {unit.unit}</div><div style={{ fontSize: 12.5, opacity: .9 }}>Upload the plan, let the AI read it, then check the rooms.</div></div>
          <button type="button" onClick={onClose} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.7)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Close</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, alignItems: 'center' }}>
          <label style={{ ...btn(), display: 'inline-block' }}>{busy === 'upload' ? 'Uploading…' : planUrl ? 'Replace plan' : 'Upload plan'}
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} /></label>
          {planUrl && <a href={planUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: 'none' }}>View plan</a>}
          <button type="button" style={btn()} disabled={!planUrl || !!busy} onClick={readAi}>{busy === 'ai' ? 'Reading plan…' : 'Read plan with AI'}</button>
          <span style={{ flex: 1 }} />
          <button type="button" style={btn()} disabled={!layout} onClick={() => setView(true)}>Preview in 3D</button>
          <button type="button" style={btn(true)} disabled={!!busy || !layout} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save rooms'}</button>
        </div>
        {msg && <div style={{ padding: '10px 16px', fontSize: 13, color: TXT, background: '#F4F7FB', borderBottom: `1px solid ${LINE}` }}>{msg}</div>}
        {isPdf && <div style={{ padding: '10px 16px', fontSize: 13, color: MUTED }}>This plan is a PDF. The AI can read it, but it can't show behind the grid. Open it with View plan to compare.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 0 }} className="fpe-grid">
          <div style={{ padding: 12, overflow: 'auto', minWidth: 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: MUTED }}>Pick a room type, then drag on the grid to draw a room. Each square is 1 metre. Click a room to edit it.</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {KINDS.map(k => <button key={k.kind} type="button" onClick={() => setKind(k.kind)} aria-pressed={kind === k.kind} style={{ font: 'inherit', fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 20, border: `1px solid ${kind === k.kind ? NAVY : LINE}`, background: kind === k.kind ? NAVY : '#fff', color: kind === k.kind ? '#fff' : TXT, cursor: 'pointer' }}>{k.label}</button>)}
            </div>
            <canvas ref={cv} width={W * PX} height={D * PX} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} style={{ width: '100%', maxWidth: W * PX, height: 'auto', border: `1px solid ${LINE}`, borderRadius: 8, touchAction: 'none', cursor: 'crosshair', display: 'block' }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: MUTED, alignItems: 'center' }}>Grid
              <label>Width <input type="number" min={6} max={40} value={W} onChange={e => setW(Math.max(6, Math.min(40, Number(e.target.value) || 12)))} style={{ width: 56 }} /> m</label>
              <label>Depth <input type="number" min={6} max={40} value={D} onChange={e => setD(Math.max(6, Math.min(40, Number(e.target.value) || 10)))} style={{ width: 56 }} /> m</label>
            </div>
          </div>
          <div style={{ padding: 16, borderLeft: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', gap: 10 }} className="fpe-side">
            {cur ? (<>
              <b style={{ fontSize: 14, color: TXT }}>Edit room</b>
              <label style={{ fontSize: 13, color: MUTED }}>Name<input value={cur.name} onChange={e => patch({ name: e.target.value.slice(0, 40) })} style={{ width: '100%', padding: 6, marginTop: 4 }} /></label>
              <label style={{ fontSize: 13, color: MUTED }}>Type<select value={cur.kind} onChange={e => patch({ kind: e.target.value as RoomKind })} style={{ width: '100%', padding: 6, marginTop: 4 }}>{KINDS.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['x', 'y', 'w', 'h'] as const).map(f => <label key={f} style={{ fontSize: 12.5, color: MUTED }}>{{ x: 'Left (m)', y: 'Top (m)', w: 'Width (m)', h: 'Height (m)' }[f]}<input type="number" step={0.25} min={f === 'w' || f === 'h' ? 0.8 : 0} value={cur[f]} onChange={e => patch({ [f]: Math.max(0, Number(e.target.value) || 0) } as any)} style={{ width: '100%', padding: 6, marginTop: 4 }} /></label>)}
              </div>
              <button type="button" style={{ ...btn(), color: '#B42318' }} onClick={() => { setRooms(rs => rs.filter(r => r.id !== sel)); setSel(null) }}>Delete room</button>
            </>) : <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{rooms.length ? `${rooms.length} rooms drawn. Rooms next to each other get a door in the walls between them, and open-plan living, dining and kitchen have no wall.` : 'No rooms yet. Upload a plan and press Read plan with AI, or draw the rooms yourself.'}</p>}
          </div>
        </div>
        <style>{`@media (max-width:760px){.fpe-grid{grid-template-columns:minmax(0,1fr)!important}.fpe-side{border-left:0!important;border-top:1px solid ${LINE}}}`}</style>
      </div>
      {view && layout && <FlatViewer3D layout={layout} title={`Flat ${unit.unit}`} onClose={() => setView(false)} />}
    </div>
  )
}
