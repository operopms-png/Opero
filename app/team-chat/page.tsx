'use client'
import { useEffect } from 'react'

// Team Chat has been merged into the Inbox (Staff Centre -> Inbox), so
// all internal conversations live alongside WhatsApp/SMS/other channels
// in one place instead of a separate page. This route is kept only so
// old bookmarks/links still land somewhere useful.
export default function TeamChatRedirect() {
  useEffect(() => { window.location.href = '/staff-centre/inbox' }, [])
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Inter',sans-serif" }}>Team Chat has moved into the Inbox — redirecting…</div>
}
