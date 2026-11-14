'use client'
// Records when staff are signed in and using the portal (for the Work Hours page). Sends a quiet
// heartbeat every minute while the tab is open and visible; sign-out is recorded by endWorkSession().
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

async function beat(path: string, end = false) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/work-sessions', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ path, end }) })
  } catch { /* tracking must never get in the way */ }
}
export const endWorkSession = () => beat(typeof location !== 'undefined' ? location.pathname : '', true)

export default function SessionTracker() {
  const path = usePathname()
  useEffect(() => { if (document.visibilityState === 'visible') beat(path || '') }, [path])
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') beat(location.pathname) }, 60000)
    const v = () => { if (document.visibilityState === 'visible') beat(location.pathname) }
    document.addEventListener('visibilitychange', v)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v) }
  }, [])
  return null
}
