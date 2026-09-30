'use client'
// Swipeable photo slider for the public lettings listings: arrows, dots,
// "3 / 8" counter, touch swipe, keyboard arrows. Shows a branded placeholder
// when a property has no photos yet.
import { useEffect, useRef, useState } from 'react'

export const BRAND = { gold: '#D0AE4C', gd: '#A8862E', brown: '#624920', cream: '#FBF4E6', ink: '#323338', muted: '#676879', line: '#E6E9EF' }
const HOUSE = (s: number) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>

export function Placeholder({ height, label = 'Photos coming soon' }: { height: number | string; label?: string }) {
  return (
    <div style={{ height, background: 'linear-gradient(135deg,#F3E6C8,#E3CD9C)', color: 'rgba(98,73,32,.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative' }}>
      {HOUSE(typeof height === 'number' && height < 220 ? 48 : 72)}
      <span style={{ fontSize: 12.5, color: 'rgba(98,73,32,.65)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

const navBtn = (side: 'l' | 'r', big: boolean): React.CSSProperties => ({ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side === 'l' ? 'left' : 'right']: big ? 14 : 10, width: big ? 44 : 34, height: big ? 44 : 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.93)', color: BRAND.brown, fontSize: big ? 24 : 19, lineHeight: 1, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 })

export default function PhotoSlider({ photos, height, big = false, index, onIndex, onOpen, children }: {
  photos: { url: string; caption: string }[]; height: number | string; big?: boolean
  index?: number; onIndex?: (i: number) => void; onOpen?: (i: number) => void; children?: React.ReactNode
}) {
  const [own, setOwn] = useState(0)
  const i = index ?? own
  const n = photos.length
  const go = (k: number) => { const next = (k + n) % n; onIndex ? onIndex(next) : setOwn(next) }
  const touch = useRef<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!big) return
    const el = ref.current
    const key = (e: KeyboardEvent) => { if (!el || !document.activeElement || !el.contains(document.activeElement)) return; if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  })

  if (!n) return <div style={{ position: 'relative' }}><Placeholder height={height} />{children}</div>
  const cur = photos[Math.min(i, n - 1)]
  return (
    <div ref={ref} tabIndex={big ? 0 : -1} style={{ position: 'relative', height, background: '#EDE6D8', overflow: 'hidden', outline: 'none', userSelect: 'none' }}
      onTouchStart={e => { touch.current = e.touches[0].clientX }}
      onTouchEnd={e => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1) }}>
      <div style={{ display: 'flex', height: '100%', transform: `translateX(-${i * 100}%)`, transition: 'transform .35s ease' }}>
        {photos.map((p, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={p.url} alt={p.caption || `Photo ${k + 1}`} loading={k === 0 ? 'eager' : 'lazy'} draggable={false}
            onClick={e => { if (onOpen) { e.preventDefault(); e.stopPropagation(); onOpen(k) } }}
            style={{ flex: '0 0 100%', width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: onOpen ? 'zoom-in' : 'inherit' }} />
        ))}
      </div>
      {n > 1 && <>
        <button aria-label="Previous photo" onClick={e => { e.preventDefault(); e.stopPropagation(); go(i - 1) }} style={navBtn('l', big)}>‹</button>
        <button aria-label="Next photo" onClick={e => { e.preventDefault(); e.stopPropagation(); go(i + 1) }} style={navBtn('r', big)}>›</button>
        {n <= 12 && <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 2 }}>
          {photos.map((_, k) => <span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: k === i ? '#fff' : 'rgba(255,255,255,.55)', boxShadow: '0 0 2px rgba(0,0,0,.3)' }} />)}
        </div>}
      </>}
      <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, borderRadius: 6, padding: '3px 8px', zIndex: 2 }}>{i + 1} / {n}</span>
      {big && cur.caption && <span style={{ position: 'absolute', top: 14, left: 14, background: '#fff', borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: BRAND.brown, zIndex: 2 }}>{cur.caption}</span>}
      {children}
    </div>
  )
}

// Full-screen photo viewer
export function Lightbox({ photos, start, onClose }: { photos: { url: string; caption: string }[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const n = photos.length
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') setI(k => (k - 1 + n) % n); if (e.key === 'ArrowRight') setI(k => (k + 1) % n) }
    window.addEventListener('keydown', key); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [n, onClose])
  const touch = useRef<number | null>(null)
  return (
    <div role="dialog" aria-label="Photos" onClick={e => e.target === e.currentTarget && onClose()}
      onTouchStart={e => { touch.current = e.touches[0].clientX }}
      onTouchEnd={e => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 40) setI(k => (k + (dx < 0 ? 1 : -1) + n) % n) }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,6,.94)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 34, cursor: 'pointer', lineHeight: 1 }}>×</button>
      {n > 1 && <button onClick={() => setI((i - 1 + n) % n)} aria-label="Previous photo" style={{ ...navBtn('l', true), background: 'rgba(255,255,255,.15)', color: '#fff' }}>‹</button>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[i].url} alt={photos[i].caption || ''} style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 6 }} />
      {n > 1 && <button onClick={() => setI((i + 1) % n)} aria-label="Next photo" style={{ ...navBtn('r', true), background: 'rgba(255,255,255,.15)', color: '#fff' }}>›</button>}
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14 }}>{photos[i].caption ? `${photos[i].caption} · ` : ''}{i + 1} / {n}</div>
    </div>
  )
}
