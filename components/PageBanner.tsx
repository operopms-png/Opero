'use client'
// Blue banner under the top bar on pages that do not draw their own: the page name and what it does.
// Pages are listed by address in lib/page-banners.ts. Its height is added to --hub-h so full-height pages still fit.
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { bannerFor } from '@/lib/page-banners'

export const BANNER_EVENT = 'novourq:banner-h'

export default function PageBanner() {
  const pathname = usePathname()
  const info = bannerFor(pathname || '')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const set = (h: number) => { window.__bannerH = h; window.dispatchEvent(new Event(BANNER_EVENT)) }
    if (!info || !ref.current) { set(0); return }
    const el = ref.current
    set(el.offsetHeight)
    const ro = new ResizeObserver(() => set(el.offsetHeight))
    ro.observe(el)
    return () => { ro.disconnect(); set(0) }
  }, [info])
  if (!info) return null
  return (
    <div ref={ref} style={{ padding: '18px 28px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid #C9DEF3', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: '#1D4E89', margin: '0 0 2px' }}>{info.title}</div>
      <div style={{ fontSize: 13, color: '#4A6F98', maxWidth: 760, lineHeight: 1.5 }}>{info.text}</div>
    </div>
  )
}

declare global { interface Window { __bannerH?: number } }
