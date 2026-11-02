'use client'
// Turns phone/browser notifications on for AI alerts. On iPhone this only works once the portal
// has been added to the Home Screen and opened from there.
import React, { useEffect, useState } from 'react'
import { staffApi } from '../../lib/staff-api'

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const toKey = (b64: string) => { const p = '='.repeat((4 - (b64.length % 4)) % 4), s = (b64 + p).replace(/-/g, '+').replace(/_/g, '/'), r = atob(s); return Uint8Array.from(Array.from(r).map(c => c.charCodeAt(0))) }

export default function PushToggle() {
  const [state, setState] = useState<'checking' | 'unsupported' | 'noconfig' | 'needs-install' | 'off' | 'on' | 'denied'>('checking')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      if (!KEY) return setState('noconfig')
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const standalone = (navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
      if (ios && !standalone) return setState('needs-install')
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported')
      if (Notification.permission === 'denied') return setState('denied')
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      setState(sub ? 'on' : 'off')
    })().catch(() => setState('unsupported'))
  }, [])

  const enable = async () => {
    setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return setState('denied')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(KEY!) })
      await staffApi('/api/push-subscribe', { subscription: sub.toJSON() })
      setState('on'); setMsg('On. Send a test to check it reaches this phone.')
    } catch (e: any) { setMsg(e.message || 'Could not turn notifications on.') }
  }
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js'); const sub = await reg?.pushManager.getSubscription()
    if (sub) { await staffApi('/api/push-subscribe', { action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe() }
    setState('off'); setMsg('')
  }
  const test = async () => { try { await staffApi('/api/push-subscribe', { action: 'test' }); setMsg('Test sent.') } catch (e: any) { setMsg(e.message) } }

  const note: Record<string, string> = {
    checking: '', unsupported: 'This browser cannot show phone notifications.',
    noconfig: 'Phone notifications are not set up on the server yet (VAPID keys missing).',
    'needs-install': 'On iPhone: tap Share, then Add to Home Screen, then open the portal from the Home Screen icon and come back here.',
    denied: 'Notifications are blocked for this site. Allow them in your phone or browser settings, then reload.', off: '', on: '',
  }
  const btn: React.CSSProperties = { padding: '7px 14px', borderRadius: 6, border: '1px solid #1B2F6E', background: '#1B2F6E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const ghost: React.CSSProperties = { ...btn, background: '#fff', color: '#1B2F6E' }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13.5 }}>
      <b>Phone notifications</b>
      {state === 'off' && <button style={btn} onClick={enable}>Turn on for this device</button>}
      {state === 'on' && <><span style={{ color: '#0E7C55', fontWeight: 600 }}>On for this device</span><button style={ghost} onClick={test}>Send a test</button><button style={ghost} onClick={disable}>Turn off</button></>}
      <span style={{ color: '#667085' }}>{note[state]}{msg}</span>
    </div>
  )
}
