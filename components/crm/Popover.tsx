'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Floating panel anchored to an element; closes on outside click / Escape.
export default function Popover({ anchor, onClose, children, width = 260, align = 'center' }: {
  anchor: HTMLElement | null
  onClose: () => void
  children: React.ReactNode
  width?: number
  align?: 'center' | 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const h = ref.current?.offsetHeight ?? 200
      let left = align === 'left' ? r.left : align === 'right' ? r.right - width : r.left + r.width / 2 - width / 2
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      let top = r.bottom + 6
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [anchor, width, align])

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      // clicks inside another popover opened from this one
      if ((t as HTMLElement).closest?.('[data-crm-popover]')) return
      onClose()
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => document.addEventListener('mousedown', down), 0)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [anchor, onClose])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div ref={ref} data-crm-popover style={{
      position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 1000,
      background: '#fff', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', border: '1px solid #E6E9EF',
      fontFamily: 'Figtree, Inter, sans-serif', color: '#323338', maxHeight: '70vh', overflowY: 'auto',
    }}>
      {children}
    </div>,
    document.body,
  )
}

export function Modal({ onClose, children, width = 480 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-crm-popover onMouseDown={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(41,47,76,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', fontFamily: 'Figtree, Inter, sans-serif', color: '#323338' }}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export const menuItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none',
  fontSize: 14, color: '#323338', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderRadius: 4,
}
