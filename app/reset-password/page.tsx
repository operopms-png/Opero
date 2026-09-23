'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '../../lib/supabase'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  // The recovery link Supabase emails takes a moment to exchange its
  // token for a session on load -- until that finishes, submitting
  // would just fail with "Auth session missing".
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Set a new password</h1>
          <p style={{ fontSize: 13, color: '#667085', margin: '0 0 24px' }}>Choose a new password for your Opero account.</p>

          {done ? (
            <div>
              <div style={{ fontSize: 13, color: '#067647', background: '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                Password updated. You can now sign in.
              </div>
              <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#3B4AFF', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Go to sign in</a>
            </div>
          ) : !ready ? (
            <div style={{ fontSize: 13, color: '#98A2B3' }}>Verifying your reset link…</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ fontSize: 13, color: '#B42318', background: '#FEF3F2', border: '1px solid #FDA29B', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }} />
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '10px', background: '#3B4AFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/login" style={{ fontSize: 13, color: '#98A2B3', textDecoration: 'none' }}>← Back to sign in</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}
