'use client'
import { useEffect } from 'react'

// Every module is always on. Kept as a redirect for old links.
export default function ModulesPage() {
  useEffect(() => {
    window.location.href = '/'
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      Redirecting…
    </div>
  )
}
