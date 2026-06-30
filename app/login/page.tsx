'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const PLANS = [
  {
    id: 'aipm',
    label: 'AI Property Manager',
    price: '£9.99',
    period: '/mo',
    color: '#5B7CFA',
    features: ['Guest comms', 'Maintenance coordination', 'Cleaning scheduling', 'Dynamic pricing', 'Owner reporting', 'Lead qualification'],
  },
  {
    id: 'invest',
    label: 'Invest',
    price: '£19',
    period: '/mo',
    color: '#5B7CFA',
    features: ['8 investment strategies', 'Deal analyser', 'Watchlist', 'Saved deals', 'ROI calculator'],
  },
  {
    id: 'str',
    label: 'Vacation Rentals (STR)',
    price: '£29',
    period: '/mo',
    color: '#3B4AFF',
    popular: true,
    features: ['Bookings & CRM', 'Cleaning & maintenance', 'Banking & reports', 'Guest comms', 'Contractor portal', 'iCal sync'],
  },
  {
    id: 'pm',
    label: 'Property Management',
    price: '£39',
    period: '/mo',
    color: '#5B7CFA',
    features: ['Tenants & leases', 'Rent collection', 'Inspections', 'Banking & reports', 'Owner portal'],
  },
  {
    id: 'dev',
    label: 'Developments',
    price: '£49',
    period: '/mo',
    color: '#5B7CFA',
    features: ['Projects & budgets', 'Investors', 'Milestones', 'Contractor management', 'Documents'],
  },
  {
    id: 'ea',
    label: 'Estate Agency',
    price: '£59',
    period: '/mo',
    color: '#5B7CFA',
    features: ['Vacancy management', 'Rent collection', 'Landlord portal', 'CRM', 'Banking & reports'],
  },
  {
    id: 'bundle',
    label: 'All Modules Bundle',
    price: '£175.50',
    period: '/mo',
    color: '#1a1a2e',
    features: ['Every module included', '10% off vs buying separately', 'Unlimited properties', 'Priority support'],
  },
]

function LoginForm() {
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan') ?? 'str'
  const success = searchParams.get('success') === 'true'
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const fromPricing = searchParams.get('mode') === 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(fromPricing ? 'signup' : 'login')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = redirect
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccessMsg('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = redirect
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${redirect}` } })
      if (error) { setError(error.message) }
      else {
        // Go to Stripe checkout
        const priceId = searchParams.get('priceId')
        const body = priceId && selectedPlan === initialPlan ? { plan: selectedPlan, priceId } : { plan: selectedPlan }
        const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else setSuccessMsg('Account created! Check your email to confirm.')
      }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) setError(error.message)
      else setSuccessMsg('Password reset email sent — check your inbox!')
    }
    setLoading(false)
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif", color: '#98A2B3', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* Left — Plan selector (only on signup) */}
      {mode === 'signup' && (
        <div style={{ width: 420, background: '#fff', borderRight: '1px solid #E4E7EC', padding: '40px 32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <img src="/logo.PNG" alt="Opero" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>Opero</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#101828', marginBottom: 4 }}>Choose your plan</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 24 }}>14-day free trial · No credit card required</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLANS.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  padding: '16px 18px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${selectedPlan === plan.id ? plan.color : '#E4E7EC'}`,
                  background: selectedPlan === plan.id ? plan.color + '08' : '#fff',
                  position: 'relative', transition: 'all 0.15s',
                }}
              >
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -10, left: 16, background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most popular</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${plan.color}`, background: selectedPlan === plan.id ? plan.color : 'transparent', transition: 'all 0.15s' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>{plan.label}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: plan.color }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>{plan.period}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.features.slice(0, 3).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#667085' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                  {plan.features.length > 3 && <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>+{plan.features.length - 3} more features</div>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 12, color: '#98A2B3', textAlign: 'center' }}>
            All plans include a 14-day free trial. Cancel anytime.
          </div>
        </div>
      )}

      {/* Right — Auth form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E7EC', padding: 40, width: '100%', maxWidth: 400 }}>

          {/* Success plan banner */}
          {success && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#15803D', marginBottom: 2 }}>✅ Plan selected!</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>14-day free trial active · No credit card charged yet</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {mode !== 'signup' && <img src="/logo.PNG" alt="Opero" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }} />}
            <div style={{ fontSize: 20, fontWeight: 700, color: '#101828' }}>
              {mode === 'login' ? 'Sign in to Opero' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </div>
            {mode === 'signup' && selectedPlan && (
              <div style={{ fontSize: 13, color: '#667085', marginTop: 4 }}>
                {PLANS.find(p => p.id === selectedPlan)?.label} plan · {PLANS.find(p => p.id === selectedPlan)?.price}/mo
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            {mode !== 'reset' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}
            {error && <div style={{ fontSize: 13, color: '#F04438', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}
            {successMsg && <div style={{ fontSize: 13, color: '#12B76A', background: '#F6FEF9', padding: '10px 12px', borderRadius: 8 }}>{successMsg}</div>}
            <button onClick={handleSubmit} disabled={loading || !email || (mode !== 'reset' && !password) || (mode === 'signup' && !selectedPlan)} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#3B4AFF', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !email || (mode !== 'reset' && !password) || (mode === 'signup' && !selectedPlan) ? 0.6 : 1, marginTop: 4 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? `Start free trial →` : 'Send Reset Email'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#667085', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <>
                <div>Don't have an account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#3B4AFF', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Sign up</button></div>
                <div><button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Forgot password?</button></div>
              </>
            )}
            {mode === 'signup' && <div>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#3B4AFF', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Sign in</button></div>}
            {mode === 'reset' && <div><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#3B4AFF', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back to sign in</button></div>}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/landing.html" style={{ fontSize: 13, color: '#98A2B3', textDecoration: 'none' }}>← Back to homepage</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
