'use client'
// The page a client opens from their email to read and sign a document (/sign/[token]):
// initials and dates at the marked sections, then a drawn or typed signature.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fieldKind, blankLabel } from '@/lib/doc-text'

const BLUE = '#2F6DB5', NAVY = '#0B1B45', LINE = '#C9D6E6'
const FONT = "Manrope, -apple-system, 'Segoe UI', Arial, sans-serif"
const initialsOf = (n: string) => n.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 4)
const today = () => new Date().toISOString().slice(0, 10)

export default function SignDocument({ token, first }: { token: string; first: { doc: any; company: any } }) {
  const [doc, setDoc] = useState<any>(first.doc)
  const company = first.company
  const [vals, setVals] = useState<Record<string, string>>({})
  const [name, setName] = useState(first.doc.recipient_name || '')
  const [agree, setAgree] = useState(false)
  const [mode, setMode] = useState<'typed' | 'drawn'>('drawn')
  const [typed, setTyped] = useState('')
  const [drawn, setDrawn] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [slots, setSlots] = useState<Record<string, HTMLElement>>({})
  const box = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const blanks: { key: string; options?: string[] }[] = doc.blanks ?? []
  const html = useMemo(() => String(doc.body || '').replace(/<span data-field="([a-z0-9_]+)" data-empty="1"[^>]*>[\s\S]*?<\/span>/g, '<span data-slot="$1"></span>'), [doc.body])
  useEffect(() => {
    const m: Record<string, HTMLElement> = {}
    box.current?.querySelectorAll<HTMLElement>('[data-slot]').forEach(el => { m[el.dataset.slot!] = el })
    setSlots(m)
  }, [html])

  // signature pad
  useEffect(() => {
    const c = cv.current; if (mode !== 'drawn' || !c) return
    const ratio = window.devicePixelRatio || 1, w = c.clientWidth, h = 130
    c.width = w * ratio; c.height = h * ratio
    const g = c.getContext('2d')!; g.scale(ratio, ratio); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = NAVY
    const pt = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const down = (e: PointerEvent) => { drawing.current = true; c.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); e.preventDefault() }
    const move = (e: PointerEvent) => { if (!drawing.current) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); setDrawn(true); e.preventDefault() }
    const up = () => { drawing.current = false }
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up)
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up) }
  }, [mode])
  const clear = () => { const c = cv.current; if (!c) return; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setDrawn(false) }

  const set = (k: string, v: string) => setVals(x => ({ ...x, [k]: v }))
  const filled = blanks.filter(b => (vals[b.key] || '').trim()).length
  const sigOk = mode === 'drawn' ? drawn : typed.trim().length > 2
  const total = blanks.length + 1
  const done = filled + (sigOk ? 1 : 0)
  const ready = filled === blanks.length && sigOk && agree && name.trim().length > 2 && /\s/.test(name.trim())
  const goNext = () => { const b = blanks.find(x => !(vals[x.key] || '').trim()); const el = b && slots[b.key]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); else document.getElementById('sigbox')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  const fillInitials = () => blanks.forEach(b => { if (fieldKind(b.key) === 'initials' && !vals[b.key]) set(b.key, initialsOf(name)) })

  async function submit() {
    setBusy(true); setErr('')
    const signature_data = mode === 'drawn' ? cv.current?.toDataURL('image/png') : undefined
    const res = await fetch('/api/public/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, name: mode === 'typed' ? typed.trim() || name : name, agree, fields: vals, method: mode, signature_data }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(j.error || 'That did not go through. Please try again.'); return }
    setDoc(j.doc)
  }

  const inp: React.CSSProperties = { fontFamily: 'inherit', fontSize: 16, padding: '10px 12px', borderRadius: 10, border: `1px solid ${LINE}`, color: NAVY, boxSizing: 'border-box' }
  const signed = doc.status === 'signed'

  const fieldUI = (b: { key: string; options?: string[] }) => {
    const k = fieldKind(b.key), v = vals[b.key] || ''
    const base: React.CSSProperties = { ...inp, fontSize: 14, padding: '4px 8px', margin: '0 3px', borderColor: v ? '#067647' : BLUE, background: v ? '#F0FAF4' : '#F4F9FF', borderStyle: v ? 'solid' : 'dashed', borderWidth: 1.5 }
    if (k === 'initials') return <input aria-label="Your initials" value={v} maxLength={8} placeholder="Initial here" onChange={e => set(b.key, e.target.value.toUpperCase())} style={{ ...base, width: 92, textAlign: 'center', fontWeight: 700, letterSpacing: 1 }} />
    if (k === 'date') return <span style={{ whiteSpace: 'nowrap' }}><input aria-label="Date" type="date" value={v} onChange={e => set(b.key, e.target.value)} style={{ ...base, width: 150 }} /><button type="button" onClick={() => set(b.key, today())} style={{ fontSize: 12, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Today</button></span>
    if (b.options?.length) return <select aria-label={blankLabel(b.key)} value={v} onChange={e => set(b.key, e.target.value)} style={base}><option value="">Choose…</option>{b.options.map(o => <option key={o}>{o}</option>)}</select>
    return <input aria-label={blankLabel(b.key)} value={v} placeholder={blankLabel(b.key)} onChange={e => set(b.key, e.target.value)} style={{ ...base, minWidth: 150 }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEF4FB', fontFamily: FONT, color: NAVY }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', minHeight: '100vh', boxShadow: '0 0 40px rgba(27,42,74,.08)' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '18px 22px' }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', opacity: .7 }}>{signed ? 'SIGNED DOCUMENT' : 'REVIEW AND SIGN'}</div>
          <div style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>{doc.title}</div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 3 }}>{company?.name}{doc.property_label ? ` · ${doc.property_label}` : ''}</div>
        </div>
        {!signed && doc.needs_signature && <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{done} of {total} done</div><div style={{ height: 5, background: '#D5E4F5', borderRadius: 3, marginTop: 5 }}><div style={{ height: 5, width: `${(done / total) * 100}%`, background: BLUE, borderRadius: 3 }} /></div></div>
          {blanks.some(b => fieldKind(b.key) === 'initials') && <button onClick={fillInitials} style={{ fontSize: 12.5, fontWeight: 700, color: BLUE, background: '#fff', border: `1px solid ${BLUE}`, borderRadius: 9, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Fill my initials</button>}
          <button onClick={goNext} style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: BLUE, border: 'none', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
        </div>}
        <div ref={box} className="doc-read" style={{ padding: '22px', fontFamily: 'Georgia, serif', fontSize: 15.5, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: html }} />
        {Object.entries(slots).map(([k, el]) => { const b = blanks.find(x => x.key === k); return b ? createPortal(fieldUI(b), el, k) : null })}
        {signed ? (
          <div style={{ margin: 22, background: '#F0FAF4', border: '1px solid #BFE3CC', borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 800, color: '#067647' }}>Signed by {doc.signed_name}</div>
            <div style={{ fontSize: 13, color: '#475467', marginTop: 4 }}>{doc.signed_at ? new Date(doc.signed_at).toLocaleString('en-GB') : ''}. A signed copy has been emailed to you.</div>
            <a href={`/api/public/document?t=${token}&pdf=1`} style={{ display: 'inline-block', marginTop: 12, background: BLUE, color: '#fff', fontWeight: 700, borderRadius: 10, padding: '10px 16px', textDecoration: 'none', fontSize: 14 }}>Download signed PDF</a>
          </div>
        ) : doc.needs_signature ? (
          <div id="sigbox" style={{ padding: '4px 22px 40px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, margin: '8px 0' }}>Your signature</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inp, width: '100%', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{(['drawn', 'typed'] as const).map(m => <button key={m} onClick={() => setMode(m)} style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 16, border: `1px solid ${BLUE}`, background: mode === m ? BLUE : '#fff', color: mode === m ? '#fff' : BLUE, cursor: 'pointer', fontFamily: 'inherit' }}>{m === 'drawn' ? 'Draw' : 'Type'}</button>)}</div>
            {mode === 'drawn'
              ? <div style={{ position: 'relative', border: `1.5px solid ${BLUE}`, borderRadius: 12, background: '#fff' }}><canvas ref={cv} style={{ display: 'block', width: '100%', height: 130, touchAction: 'none', cursor: 'crosshair' }} />{!drawn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 14, pointerEvents: 'none' }}>Sign here with your finger or mouse</div>}<button onClick={clear} style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 12, color: BLUE, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button></div>
              : <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your full name as your signature" style={{ ...inp, width: '100%', fontFamily: "'Brush Script MT', cursive", fontSize: 26 }} />}
            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14, margin: '14px 0', cursor: 'pointer' }}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} /><span>I have read this document and agree to sign it electronically. My signature, initials, dates, the time and my IP address are recorded.</span></label>
            {err && <div style={{ background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 10 }}>{err}</div>}
            <button disabled={!ready || busy} onClick={submit} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: BLUE, color: '#fff', fontSize: 16, fontWeight: 800, cursor: ready ? 'pointer' : 'default', opacity: ready && !busy ? 1 : .5, fontFamily: 'inherit' }}>{busy ? 'Signing…' : 'Finish and sign'}</button>
            {!ready && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#98A2B3', marginTop: 8 }}>Complete every box above, sign, and tick to agree.</div>}
          </div>
        ) : <div style={{ padding: '4px 22px 40px' }}><a href={`/api/public/document?t=${token}&pdf=1`} style={{ color: BLUE, fontWeight: 700 }}>Download PDF</a></div>}
      </div>
    </div>
  )
}
