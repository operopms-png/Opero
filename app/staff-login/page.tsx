'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function StaffLoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')

  
  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccessMsg('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = redirect
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setSuccessMsg('Password reset email sent — check your inbox!')
    }
    setLoading(false)
  }

  const GOLD = '#C9A84C'
  const GOLD_HOVER = '#B89940'
  const INK = '#1A1A1A'
  const CREAM = '#F2EEE4'
  const MUTED = '#8A8A85'
  const BORDER = '#DEDAD0'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        fontFamily: "Georgia, 'Times New Roman', serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: '48px 44px',
          width: '100%',
          maxWidth: 420,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 14, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sangsters-logo.jpg"
              alt="Sangsters Group Development"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 400, color: INK, marginBottom: 6 }}>
          Staff Portal
        </div>
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 13,
            color: MUTED,
            marginBottom: 28,
          }}
        >
          Sangsters Group Developments Ltd
        </div>

        <div
          style={{
            display: 'flex',
            background: '#F0EEE6',
            borderRadius: 8,
            padding: 4,
            marginBottom: 28,
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 14,
              padding: '10px 0',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: mode === 'login' ? GOLD : 'transparent',
              color: mode === 'login' ? '#FFFFFF' : MUTED,
              fontWeight: mode === 'login' ? 700 : 400,
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('reset')}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 14,
              padding: '10px 0',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: mode === 'reset' ? GOLD : 'transparent',
              color: mode === 'reset' ? '#FFFFFF' : MUTED,
              fontWeight: mode === 'reset' ? 700 : 400,
            }}
          >
            Reset Password
          </button>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: MUTED,
              marginBottom: 8,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '14px 16px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 15,
              color: INK,
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {mode === 'login' && (
          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: MUTED,
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: '14px 16px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: 15,
                color: INK,
                background: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 13,
              fontFamily: 'Helvetica, Arial, sans-serif',
              color: '#B8483D',
              background: '#FBEAE8',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              fontSize: 13,
              fontFamily: 'Helvetica, Arial, sans-serif',
              color: '#6B8A4E',
              background: '#F1F6EC',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {successMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || (mode === 'login' && !password)}
          style={{
            width: '100%',
            background: GOLD,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            padding: '15px 0',
            cursor: 'pointer',
            opacity: loading || !email || (mode === 'login' && !password) ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.background = GOLD_HOVER
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = GOLD
          }}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Send reset link →'}
        </button>

        {mode === 'reset' && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: 13,
            }}
          >
            <button
              onClick={() => setMode('login')}
              style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense>
      <StaffLoginForm />
    </Suspense>
  )
}
