'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <main style={{minHeight:'100vh',background:'#F9FAFB',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'400px'}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:'800',color:'#0A4FB3',marginBottom:'8px'}}>Opero</h1>
        <p style={{color:'#6B7280',marginBottom:'32px'}}>Sign in to your account</p>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:'500',color:'#374151',marginBottom:'6px'}}>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} required
              style={{width:'100%',padding:'10px 14px',border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'0.95rem',outline:'none'}}
              placeholder='you@example.com'/>
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:'500',color:'#374151',marginBottom:'6px'}}>Password</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} required
              style={{width:'100%',padding:'10px 14px',border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'0.95rem',outline:'none'}}
              placeholder='••••••••'/>
          </div>
          {error && <p style={{color:'#EF4444',fontSize:'0.875rem',marginBottom:'16px'}}>{error}</p>}
          <button type='submit' disabled={loading}
            style={{width:'100%',padding:'12px',background:'#0A4FB3',color:'#fff',border:'none',borderRadius:'8px',fontSize:'0.95rem',fontWeight:'600',cursor:'pointer'}}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}