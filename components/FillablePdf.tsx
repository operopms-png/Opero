'use client'
// Shows a fillable PDF on the public services link: the pages are drawn, each form field is a real
// input on top, and Submit sends the filled copy back to the company (no email, no download).
import { useEffect, useRef, useState } from 'react'

const NAVY = '#182D5E'
type F = { key: string; page: number; x: number; y: number; w: number; h: number; kind: 'text' | 'multi' | 'check' | 'radio' | 'choice'; value?: string; options?: { v: string; d: string }[]; multiline?: boolean }
const importer = new Function('u', 'return import(u)') as (u: string) => Promise<any>

export default function FillablePdf({ url, token, docId, title }: { url: string; token: string; docId: string; title: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<{ w: number; h: number; img: string }[]>([])
  const [fields, setFields] = useState<F[]>([])
  const [vals, setVals] = useState<Record<string, string | boolean>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [name, setName] = useState(''), [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [done, setDone] = useState(false)
  const [need, setNeed] = useState<{ key: string; label: string; hint: string }[]>([]), [sent, setSent] = useState<Record<string, string>>({}), [upBusy, setUpBusy] = useState(''), [upMsg, setUpMsg] = useState('')

  useEffect(() => {
    let dead = false
    setStatus('loading'); setPages([]); setFields([]); setVals({}); setDone(false); setMsg(''); setNeed([]); setSent({})
    ;(async () => {
      try {
        const pdfjs = await importer('/pdfjs/pdf.min.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
        const pdf = await pdfjs.getDocument({ url }).promise
        const width = Math.min(wrap.current?.clientWidth || 800, 900)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const pg: { w: number; h: number; img: string }[] = [], fl: F[] = [], init: Record<string, string | boolean> = {}
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const vp = page.getViewport({ scale: width / base.width })
          const cv = document.createElement('canvas')
          cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr)
          await page.render({ canvasContext: cv.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined, annotationMode: 0 }).promise
          pg.push({ w: vp.width, h: vp.height, img: cv.toDataURL('image/jpeg', 0.85) })
          const anns = await page.getAnnotations({ intent: 'display' })
          for (const a of anns) {
            if (a.subtype !== 'Widget' || a.readOnly || a.pushButton || !a.fieldName) continue
            const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect)
            const f: F = { key: a.fieldName, page: i - 1, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), kind: 'text' }
            if (a.fieldType === 'Tx') { f.kind = a.multiLine ? 'multi' : 'text'; if (init[a.fieldName] === undefined) init[a.fieldName] = typeof a.fieldValue === 'string' ? a.fieldValue : '' }
            else if (a.fieldType === 'Btn' && a.radioButton) { f.kind = 'radio'; f.value = String(a.buttonValue); if (init[a.fieldName] === undefined) init[a.fieldName] = '' ; if (a.fieldValue === a.buttonValue) init[a.fieldName] = String(a.buttonValue) }
            else if (a.fieldType === 'Btn') { f.kind = 'check'; if (init[a.fieldName] === undefined) init[a.fieldName] = !!(a.fieldValue && a.fieldValue !== 'Off') }
            else if (a.fieldType === 'Ch') { f.kind = 'choice'; f.options = (a.options || []).map((o: any) => ({ v: String(o.exportValue), d: String(o.displayValue) })); init[a.fieldName] = Array.isArray(a.fieldValue) ? a.fieldValue[0] || '' : a.fieldValue || '' }
            else continue
            fl.push(f)
          }
        }
        if (dead) return
        setPages(pg); setFields(fl); setVals(init); setStatus('ready')
      } catch { if (!dead) setStatus('error') }
    })()
    return () => { dead = true }
  }, [url])

  const set = (k: string, v: string | boolean) => setVals(p => ({ ...p, [k]: v }))
  const submit = async () => {
    if (!name.trim()) { setMsg('Enter your name first.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg('Enter your email address so we can reach you.'); return }
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/public/services/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, doc: docId, name, email, values: vals }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setMsg(j.error || 'Could not send. Try again.'); else { setNeed(j.upload || []); setDone(true) }
    } catch { setMsg('Could not send. Check your connection and try again.') }
    setBusy(false)
  }

  const upload = async (key: string, file: File | undefined) => {
    if (!file) return
    setUpBusy(key); setUpMsg('')
    const fd = new FormData(); fd.append('t', token); fd.append('email', email.trim()); fd.append('category', key); fd.append('file', file)
    try {
      const r = await fetch('/api/public/services/upload', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}))
      if (!r.ok) setUpMsg(j.error || 'Upload failed. Try again.'); else setSent(p => ({ ...p, [key]: file.name }))
    } catch { setUpMsg('Upload failed. Check your connection and try again.') }
    setUpBusy('')
  }
  const inp: React.CSSProperties = { position: 'absolute', boxSizing: 'border-box', background: 'rgba(214,228,255,.55)', border: '1px solid #8aa4d6', borderRadius: 2, padding: '0 3px', margin: 0, font: 'inherit', color: '#0f2150', outline: 'none' }
  if (status === 'error') return <div><iframe src={url} title={title} style={{ width: '100%', height: '78vh', border: '1px solid #D5DCEA', borderRadius: 4 }} /><div style={{ fontSize: 12.5, color: '#B42318', marginTop: 8 }}>This document can’t be filled in here on this device. Press Open / download PDF.</div></div>
  return (
    <div ref={wrap}>
      {status === 'loading' && <div style={{ padding: 30, textAlign: 'center', color: '#98A2B3' }}>Opening the document…</div>}
      {status === 'ready' && (done ? (
        <div style={{ padding: 30, textAlign: 'center', background: '#EAF7F0', border: '1px solid #B7E3CB', borderRadius: 8, color: '#0F5132' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Sent. Thank you.</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>We have your completed {title}.{need.length ? ' Next, please upload your documents below.' : ' You can close this page.'}</div>
          {need.length > 0 && (
            <div style={{ marginTop: 18, textAlign: 'left', background: '#fff', border: '1px solid #B7E3CB', borderRadius: 8, padding: 14, color: '#18223a' }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: 8 }}>Upload your documents</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {need.map(n => (
                  <div key={n.key} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 200, flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}{sent[n.key] ? ' ✓' : ''}</div><div style={{ fontSize: 12.5, color: '#667085' }}>{sent[n.key] ? `Sent: ${sent[n.key]}` : n.hint}</div></div>
                    <label style={{ background: sent[n.key] ? '#fff' : NAVY, color: sent[n.key] ? NAVY : '#fff', border: `1px solid ${NAVY}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: upBusy === n.key ? .6 : 1 }}>
                      {upBusy === n.key ? 'Uploading…' : sent[n.key] ? 'Replace' : 'Choose file'}
                      <input type="file" accept="application/pdf,image/*" capture={undefined} style={{ display: 'none' }} disabled={!!upBusy} onChange={e => { upload(n.key, e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                  </div>
                ))}
              </div>
              {upMsg && <div style={{ fontSize: 13, color: '#B42318', marginTop: 8 }}>{upMsg}</div>}
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 10 }}>PDF or photo, up to 15 MB each. Upload what you have now.</div>
            </div>
          )}
        </div>
      ) : (<>
        <div style={{ fontSize: 13.5, color: '#344054', marginBottom: 10, lineHeight: 1.5 }}>Click any shaded box to type, or tick a box. When you have finished, enter your name and email below and press Submit. It goes straight to us.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {pages.map((p, pi) => (
            <div key={pi} style={{ position: 'relative', width: p.w, height: p.h, maxWidth: '100%', boxShadow: '0 1px 6px rgba(15,33,80,.18)', background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" width={p.w} height={p.h} style={{ display: 'block', width: p.w, height: p.h }} draggable={false} />
              {fields.map((f, fi) => f.page !== pi ? null : f.kind === 'check' ? (
                <input key={fi} type="checkbox" aria-label={f.key} checked={!!vals[f.key]} onChange={e => set(f.key, e.target.checked)} style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h, margin: 0, accentColor: NAVY, cursor: 'pointer' }} />
              ) : f.kind === 'radio' ? (
                <input key={fi} type="radio" aria-label={f.key} name={f.key} checked={vals[f.key] === f.value} onChange={() => set(f.key, f.value || '')} style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h, margin: 0, accentColor: NAVY, cursor: 'pointer' }} />
              ) : f.kind === 'choice' ? (
                <select key={fi} aria-label={f.key} value={String(vals[f.key] ?? '')} onChange={e => set(f.key, e.target.value)} style={{ ...inp, left: f.x, top: f.y, width: f.w, height: f.h, fontSize: Math.min(f.h * 0.7, 14) }}>
                  <option value="" />{(f.options || []).map(o => <option key={o.v} value={o.v}>{o.d}</option>)}
                </select>
              ) : f.kind === 'multi' ? (
                <textarea key={fi} aria-label={f.key} value={String(vals[f.key] ?? '')} onChange={e => set(f.key, e.target.value)} style={{ ...inp, left: f.x, top: f.y, width: f.w, height: f.h, fontSize: 12, resize: 'none', paddingTop: 2 }} />
              ) : (
                <input key={fi} aria-label={f.key} value={String(vals[f.key] ?? '')} onChange={e => set(f.key, e.target.value)} style={{ ...inp, left: f.x, top: f.y, width: f.w, height: f.h, fontSize: Math.max(9, Math.min(f.h * 0.72, 14)) }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: 16, background: '#F3F6FB', border: '1px solid #D5DCEA', borderRadius: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ flex: '1 1 200px', padding: '10px 12px', border: '1px solid #C5CFE3', borderRadius: 6, font: 'inherit' }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" type="email" style={{ flex: '1 1 200px', padding: '10px 12px', border: '1px solid #C5CFE3', borderRadius: 6, font: 'inherit' }} />
          <button onClick={submit} disabled={busy} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 6, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: busy ? .6 : 1 }}>{busy ? 'Sending…' : 'Submit to NOVOURQ'}</button>
          {msg && <div style={{ flexBasis: '100%', fontSize: 13, color: '#B42318' }}>{msg}</div>}
        </div>
      </>))}
    </div>
  )
}
