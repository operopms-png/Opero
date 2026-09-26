'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// After Stripe: wait for the webhook to activate the account, then send
// the new partner to sign in (email prefilled) → their Partners portal.

const ACCENT = '#3B4AFF'

function Success() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<'waiting' | 'paid' | 'slow'>('waiting')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!sessionId) { setStatus('slow'); return }
    let tries = 0
    const t = setInterval(async () => {
      tries++
      try {
        const res = await fetch(`/api/partner-join/status?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (data.email) setEmail(data.email)
        if (data.status === 'paid') { setStatus('paid'); clearInterval(t) }
        else if (tries >= 20) { setStatus('slow'); clearInterval(t) }
      } catch {
        if (tries >= 20) { setStatus('slow'); clearInterval(t) }
      }
    }, 2000)
    return () => clearInterval(t)
  }, [sessionId])

  const signInHref = `/login?redirect=/staff-centre/partners${email ? `&email=${encodeURIComponent(email)}` : ''}`

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 28, textAlign: 'center' }}>
      {status === 'waiting' && (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Payment received — setting up your account…</div>
          <div style={{ fontSize: 14, color: '#667085' }}>This usually takes a few seconds.</div>
        </>
      )}
      {status === 'paid' && (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ECFDF3', color: '#067647', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Welcome, you’re a partner</div>
          <div style={{ fontSize: 14, color: '#667085', marginBottom: 18 }}>Sign in with the email and password you just chose to open your Partners portal.</div>
          <a href={signInHref} style={{ display: 'inline-block', background: ACCENT, color: '#fff', borderRadius: 9, padding: '12px 22px', fontWeight: 700, textDecoration: 'none' }}>Sign in →</a>
        </>
      )}
      {status === 'slow' && (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Your payment is being confirmed</div>
          <div style={{ fontSize: 14, color: '#667085', marginBottom: 18 }}>Try signing in in a minute. If it still doesn’t work, contact the team who shared your link.</div>
          <a href={signInHref} style={{ display: 'inline-block', background: ACCENT, color: '#fff', borderRadius: 9, padding: '12px 22px', fontWeight: 700, textDecoration: 'none' }}>Go to sign in</a>
        </>
      )}
    </div>
  )
}

export default function JoinSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", color: '#101828', padding: '0 16px' }}>
      <Suspense fallback={null}><Success /></Suspense>
    </div>
  )
}
