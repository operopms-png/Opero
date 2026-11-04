'use client'
// Real Estate Intelligence → Map: every property and found deal on one street map.
import Link from 'next/link'
import PropertyMap from '@/components/PropertyMap'

export default function MapPage() {
  return (
    <div style={{ background: '#f6f8fc', minHeight: '100vh', padding: '24px 32px 56px', fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link href="/property" style={{ fontSize: 13, fontWeight: 600, color: '#2F6DB5', textDecoration: 'none' }}>&larr; Real Estate Intelligence</Link>
        <PropertyMap />
      </div>
    </div>
  )
}
