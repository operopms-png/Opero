'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { normalizeRole, ROLE_MODULES } from '../../lib/useRole'
import { BRAND_NAME } from '@/lib/brand'


// Baby blue used for both plans -- Jordan asked for the plan cards to be
// this colour rather than each module having its own accent (that made
// sense back when plans were sold per-module; now there are just two
// tiers of the same one-plan-every-module offer).
const BABY_BLUE = '#89CFF0'

const LIFETIME = {
  id: 'lifetime',
  label: 'Lifetime access',
  price: '£175.50',
  period: ' one-time',
  color: BABY_BLUE,
  features: [
    'Everything in the monthly and annual plans, for life',
    'One payment of £175.50, no monthly or yearly bill, ever',
    '3 properties included, then £12 a month for each extra property',
    'Limited to the first 10 clients',
  ],
}

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '£49',
    period: '/mo',
    color: BABY_BLUE,
    popular: true,
    features: [
      'All 6 modules: Vacation Rentals, Property Management, Estate Agency, Developments, Invest, AI Property Manager',
      '6 AI agents included — guest, maintenance, cleaning, revenue, owner relations, lead qualification',
      'Staff Centre included free — conversations, property portals, CRM & more',
      '3 properties included, then £12 a month for each extra property',
      'One login, one bill',
    ],
  },
  {
    id: 'onetime',
    label: 'Annually',
    price: '£470.40',
    period: '/year',
    color: BABY_BLUE,
    features: [
      'All 6 modules: Vacation Rentals, Property Management, Estate Agency, Developments, Invest, AI Property Manager',
      '6 AI agents included — guest, maintenance, cleaning, revenue, owner relations, lead qualification',
      'Staff Centre included free — conversations, property portals, CRM & more',
      '3 properties included, then £12 a month for each extra property',
      'One login, one bill, 20% off the monthly price',
    ],
  },
]

function LoginForm() {
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan') ?? 'monthly'
  const success = searchParams.get('success') === 'true'
  const explicitRedirect = searchParams.get('redirect')
  const redirect = explicitRedirect ?? '/dashboard'
  // Sign-up is open: /login?signup=1 (or any link carrying a plan) opens it, and the sign-in form offers a free trial.
  const fromPricing = searchParams.get('signup') === '1' || searchParams.get('plan') !== null

  // Anyone with Staff Centre access lands on the Staff Centre Dashboard
  // (renamed from "Oversight") first, not the generic account dashboard --
  // unless the URL explicitly asked for somewhere else via ?redirect=.
  function resolveDestination(role: string, customModules: string[] | null | undefined) {
    if (explicitRedirect) return explicitRedirect
    const modules = customModules?.length ? customModules : (ROLE_MODULES[role] ?? [])
    if (modules.includes('sc')) return '/staff-centre/oversight'
    return redirect
  }

  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(fromPricing && !success ? 'signup' : 'login')
  const [lifetimeLeft, setLifetimeLeft] = useState<number | null>(null)
  useEffect(() => { fetch('/api/lifetime-spots').then(r => r.json()).then(d => { if (typeof d.left === 'number') setLifetimeLeft(d.left) }).catch(() => {}) }, [])
  const [selectedPlan, setSelectedPlan] = useState(fromPricing ? initialPlan : '')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: ownerProfile } = await supabase.from('owner_profiles').select('id').eq('user_id', session.user.id).maybeSingle()
        if (ownerProfile) { window.location.href = '/staff-centre/partners'; return }
        const { data: landlordProfile } = await supabase.from('pm_landlords').select('id').eq('portal_user_id', session.user.id).maybeSingle()
        if (landlordProfile) { window.location.href = '/pm-owner-portal'; return }
        const { data: estateLandlordProfile } = await supabase.from('estate_landlords').select('id').eq('portal_user_id', session.user.id).maybeSingle()
        if (estateLandlordProfile) { window.location.href = '/estate-owner-portal'; return }
        { const { data: cohostProfile } = await supabase.from('cohosts').select('id').eq('portal_user_id', session.user.id).maybeSingle(); if (cohostProfile) { window.location.href = '/cohost-portal'; return } }
        const { data: tenantProfile } = await supabase.from('pm_tenants').select('id').eq('portal_user_id', session.user.id).maybeSingle()
        if (tenantProfile) { window.location.href = '/pm-tenant-portal'; return }
        const { data: estateTenantProfile } = await supabase.from('estate_tenants').select('id').eq('portal_user_id', session.user.id).maybeSingle()
        if (estateTenantProfile) { window.location.href = '/estate-tenant-portal'; return }
        const { data: teamRows } = await supabase.from('team_members').select('role, custom_modules').eq('email', session.user.email).order('created_at', { ascending: false }).limit(1)
        const staffRole = normalizeRole(teamRows?.[0]?.role)
        window.location.href = (staffRole === 'Cleaning Team' || staffRole === 'Maintenance Team') ? '/staff-dashboard' : resolveDestination(staffRole, teamRows?.[0]?.custom_modules)
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        // Owners are investor partners — land them on the Partners dashboard,
        // which links through to their Owner Portal
        const { data: ownerProfile } = await supabase
          .from('owner_profiles')
          .select('id')
          .eq('user_id', data.user?.id)
          .single()
        if (ownerProfile) { window.location.href = '/staff-centre/partners'; return }
        // Check if this user is a PM landlord — if so, send to the landlord portal
        const { data: landlordProfile } = await supabase
          .from('pm_landlords')
          .select('id')
          .eq('portal_user_id', data.user?.id)
          .single()
        if (landlordProfile) { window.location.href = '/pm-owner-portal'; return }
        // Check if this user is an Estate Agency landlord — if so, send
        // to the estate landlord portal
        const { data: estateLandlordProfile } = await supabase
          .from('estate_landlords')
          .select('id')
          .eq('portal_user_id', data.user?.id)
          .single()
        if (estateLandlordProfile) { window.location.href = '/estate-owner-portal'; return }
        { const { data: cohostProfile } = await supabase.from('cohosts').select('id').eq('portal_user_id', data.user?.id).maybeSingle(); if (cohostProfile) { window.location.href = '/cohost-portal'; return } }
        // Check if this user is a tenant with portal access — if so, send
        // to the tenant portal
        const { data: tenantProfile } = await supabase
          .from('pm_tenants')
          .select('id')
          .eq('portal_user_id', data.user?.id)
          .single()
        if (tenantProfile) { window.location.href = '/pm-tenant-portal'; return }
        // Check if this user is an Estate Agency tenant with portal
        // access — if so, send to the EA tenant portal
        const { data: estateTenantProfile } = await supabase
          .from('estate_tenants')
          .select('id')
          .eq('portal_user_id', data.user?.id)
          .single()
        if (estateTenantProfile) { window.location.href = '/estate-tenant-portal'; return }
        // Check if this user is a Cleaner or Maintenance staff member — if
        // so, send them to their focused task dashboard, not the full app
        const { data: teamRows } = await supabase
          .from('team_members')
          .select('role, custom_modules')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
        const staffRole = normalizeRole(teamRows?.[0]?.role)
        window.location.href = (staffRole === 'Cleaning Team' || staffRole === 'Maintenance Team') ? '/staff-dashboard' : resolveDestination(staffRole, teamRows?.[0]?.custom_modules)
      }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${redirect}` } })
      if (error) { setError(error.message) }
      else {
        // Go to Stripe checkout
        const priceId = searchParams.get('priceId')
        const body = priceId && selectedPlan === initialPlan ? { plan: selectedPlan, priceId, email } : { plan: selectedPlan, email }
        try {
          const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          const data = await res.json()
          if (data.url) {
            window.location.href = data.url
          } else {
            // Checkout genuinely failed — never say "success" here. The
            // account exists but has no paid access; make that explicit
            // so nobody assumes they're set up when they aren't.
            setError(data.error || 'Your account was created, but we couldn\'t start checkout. Please try signing in and contact support — do not assume you have access yet.')
          }
        } catch {
          setError('Your account was created, but we couldn\'t reach checkout. Please try signing in and contact support — do not assume you have access yet.')
        }
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
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', flexWrap: 'wrap' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* Left — Plan selector (only on signup) */}
      {mode === 'signup' && (
        <div style={{ width: '100%', maxWidth: 420, flexShrink: 0, boxSizing: 'border-box', background: '#fff', borderRight: '1px solid #E4E7EC', padding: '40px 32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <img src="/novouq-logo.jpg" alt="NOVOURQ" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#323338' }}>NOVOURQ</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#323338', marginBottom: 4 }}>Choose your plan</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 24 }}>{selectedPlan === 'lifetime' ? 'One payment today, no further bills' : '14-day free trial · Card required, you are not charged until the trial ends, cancel anytime'}</div>

          <div style={{ display: 'flex', background: '#F2F4F7', borderRadius: 10, padding: 4, marginBottom: 16 }}>
            {PLANS.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: selectedPlan === plan.id ? '#fff' : 'transparent', color: selectedPlan === plan.id ? '#323338' : '#667085', boxShadow: selectedPlan === plan.id ? '0 1px 2px rgba(16,24,40,0.1)' : 'none' }}
              >
                {plan.label}{plan.id === 'onetime' ? ' · Save 20%' : ''}
              </button>
            ))}
          </div>

          {selectedPlan !== 'lifetime' && (() => {
            const plan = selectedPlan === 'lifetime' ? LIFETIME : (PLANS.find(p => p.id === selectedPlan) || PLANS[0])
            return (
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `2px solid ${plan.color}`, background: plan.color + '08' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#323338' }}>{plan.label}</span>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#323338' }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>{plan.period}</span>
                  </div>
                </div>
                {plan.id === 'onetime' && <div style={{ fontSize: 12, color: '#667085', marginBottom: 10 }}>£588 a year paid monthly, less 20%</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#667085' }}>
                      <svg style={{ flexShrink: 0, marginTop: 2 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {lifetimeLeft !== 0 && (
            <div
              onClick={() => setSelectedPlan('lifetime')}
              style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `2px ${selectedPlan === 'lifetime' ? 'solid' : 'dashed'} ${BABY_BLUE}`, background: selectedPlan === 'lifetime' ? BABY_BLUE + '14' : '#fff' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>Lifetime access</span>
                <span><span style={{ fontSize: 18, fontWeight: 700, color: '#323338' }}>£175.50</span><span style={{ fontSize: 12, color: '#98A2B3' }}> one-time</span></span>
              </div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Pay once, use it for life. First 10 clients only{lifetimeLeft !== null ? `, ${lifetimeLeft} left` : ''}.</div>
              {selectedPlan === 'lifetime' && <div style={{ fontSize: 12, color: '#667085', marginTop: 8 }}>Everything in the monthly and annual plans. No monthly or yearly bill, ever. No free trial, you pay today.</div>}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 12, color: '#98A2B3', textAlign: 'center' }}>
            Switch between monthly (£49) and annual (£470.40, £588 less 20%) at any time before you pay. Cancel anytime.</div>
        </div>
      )}

      {/* Right — Auth form */}
      <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E7EC', padding: 40, width: '100%', maxWidth: 400 }}>

          {/* Success plan banner */}
          {success && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#15803D', marginBottom: 2 }}>{initialPlan === 'lifetime' ? 'Payment successful' : 'Your plan is active'}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{initialPlan === 'lifetime' ? 'Full access to every module is unlocked. ' : 'Your 14-day free trial has started and you have not been charged. '}We have emailed you a link to confirm your address. Click it, then sign in below to open your dashboard.</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {mode !== 'signup' && <img src="/novouq-logo.jpg" alt="NOVOURQ" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }} />}
            <div style={{ fontSize: 20, fontWeight: 700, color: '#323338' }}>
              {mode === 'login' ? 'Sign in to NOVOURQ' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </div>
            {mode === 'signup' && selectedPlan && (
              <div style={{ fontSize: 13, color: '#667085', marginTop: 4 }}>
                {(selectedPlan === 'lifetime' ? LIFETIME : PLANS.find(p => p.id === selectedPlan))?.label} plan · {(selectedPlan === 'lifetime' ? LIFETIME : PLANS.find(p => p.id === selectedPlan))?.price}{(selectedPlan === 'lifetime' ? LIFETIME : PLANS.find(p => p.id === selectedPlan))?.period}
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
            <button onClick={handleSubmit} disabled={loading || !email || (mode !== 'reset' && !password) || (mode === 'signup' && !selectedPlan)} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#1B2F6E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !email || (mode !== 'reset' && !password) || (mode === 'signup' && !selectedPlan) ? 0.6 : 1, marginTop: 4 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? (selectedPlan === 'lifetime' ? 'Get lifetime access →' : 'Start free trial →') : 'Send Reset Email'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#667085', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <>
                <div>New to NOVOURQ? <button onClick={() => { setError(''); setSelectedPlan(initialPlan); setMode('signup') }} style={{ background: 'none', border: 'none', color: '#1B2F6E', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Start your free trial</button>. Joining a team? Ask your manager for an invite.</div>
                <div><button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Forgot password?</button></div>
              </>
            )}
            {mode === 'signup' && <div>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#1B2F6E', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Sign in</button></div>}
            {mode === 'reset' && <div><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#1B2F6E', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back to sign in</button></div>}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="https://www.thenovourq.com" style={{ fontSize: 13, color: '#98A2B3', textDecoration: 'none' }}>← Back to www.thenovourq.com</a>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#98A2B3' }}>
            <a href="/terms" style={{ color: '#98A2B3' }}>Terms</a> · <a href="/privacy" style={{ color: '#98A2B3' }}>Privacy</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
