'use client'
import { useEffect } from 'react'

// Opero no longer sells modules à la carte -- one plan (monthly or
// one-time) now includes every module, the AI agents and the whole
// Staff Centre. This page is kept as a redirect only in case an old
// link or bookmark still points here.
export default function ModulesPage() {
  useEffect(() => {
    window.location.href = '/settings?section=Billing+%26+Subscriptions'
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      Redirecting…
    </div>
  )
}
