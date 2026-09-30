'use client'
// The AI Property Manager now lives inside the AI Assistant page.
import { useEffect } from 'react'

export default function Page() {
  useEffect(() => { window.location.replace('/staff-centre/receptionist?tab=agents') }, [])
  return <div style={{ padding: 40, color: '#9699A6', fontFamily: 'Figtree, sans-serif' }}>Opening AI Assistant…</div>
}
