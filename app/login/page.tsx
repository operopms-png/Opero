'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) } 
      else { window.location.href = '/dashboard' }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
      if (error) { setError(error.message) } 
      else { setSuccess('Check your email to confirm your account!') }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) { setError(error.message) } 
      else { setSuccess('Password reset email sent — check your inbox!') }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 40, width: '100%', maxWidth: 400, margin: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="Opero" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Opero</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {mode !== 'reset' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          )}

          {error && <div style={{ fontSize: 13, color: '#EF4444', background: '#FEE2E2', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 13, color: '#10B981', background: '#D1FAE5', padding: '10px 12px', borderRadius: 8 }}>{success}</div>}

          <button onClick={handleSubmit} disabled={loading || !email || (mode !== 'reset' && !password)} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'login' && (
            <>
              <div>Don't have an account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Sign up</button></div>
              <div><button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Forgot password?</button></div>
            </>
          )}
          {mode === 'signup' && (
            <div>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Sign in</button></div>
          )}
          {mode === 'reset' && (
            <div><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>← Back to sign in</button></div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/landing.html" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>← Back to homepage</a>
        </div>
      </div>
    </div>
  )
}