'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ACCENT = '#3B4AFF'

const MODULES = [
  { id: 'aipm', label: 'AI Property Manager', price: '£9.99', icon: '✨', features: ['Guest comms', 'Maintenance', 'Cleaning', 'Pricing', 'Owner reporting', 'Lead qualification'] },
  { id: 'invest', label: 'Invest', price: '£19', icon: '📈', features: ['8 strategies', 'Deal analyser', 'Watchlist', 'Saved deals', 'ROI calculator'] },
  { id: 'str', label: 'Vacation Rentals', price: '£29', icon: '🏠', features: ['Bookings', 'CRM', 'Cleaning', 'Maintenance', 'Banking', 'Reports', 'Guest comms'] },
  { id: 'pm', label: 'Property Management', price: '£39', icon: '🏢', features: ['Tenants', 'Leases', 'Rent collection', 'Inspections', 'Banking', 'Reports'] },
  { id: 'dev', label: 'Developments', price: '£49', icon: '🏗️', features: ['Projects', 'Budgets', 'Investors', 'Milestones', 'Contractor management'] },
  { id: 'ea', label: 'Estate Agency', price: '£59', icon: '🗂️', features: ['Vacancies', 'Rent collection', 'Landlord portal', 'CRM', 'Banking'] },
]

export default function ModulesPage() {
  const [email, setEmail] = useState('')
  const [ownedModules, setOwnedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email ?? '')
      const { data: sub } = await supabase.from('subscriptions').select('modules').eq('user_id', user.id).single()
      setOwnedModules((sub as any)?.modules ?? [])
      setLoading(false)
    })
  }, [])

  async function buy(plan: string) {
    setBuying(plan)
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, email, returnTo: '/dashboard?upgraded=true' }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert(data.error || 'Could not start checkout — please try again or contact support.')
      setBuying(null)
    }
  }

  const allOwned = MODULES.every(m => ownedModules.includes(m.id))

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Inter', -apple-system, sans-serif" }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/dashboard" style={{ fontSize: 13, color: '#667085', textDecoration: 'none' }}>← Back to dashboard</a>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#101828', marginTop: 16, marginBottom: 6 }}>Add modules</h1>
        <p style={{ fontSize: 14, color: '#667085', marginBottom: 32 }}>Pay only for what you use. Add modules any time as your business grows.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          {MODULES.map(m => {
            const owned = ownedModules.includes(m.id)
            return (
              <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, marginBottom: 10 }}>{m.price}<span style={{ fontSize: 13, fontWeight: 500, color: '#98A2B3' }}>/mo</span></div>
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 16, lineHeight: 1.6 }}>{m.features.join(' · ')}</div>
                {owned ? (
                  <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#15803D', background: '#F0FDF4', borderRadius: 8, padding: '9px' }}>✓ Active</div>
                ) : (
                  <button onClick={() => buy(m.id)} disabled={buying === m.id} style={{ marginTop: 'auto', width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: buying === m.id ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {buying === m.id ? 'Redirecting…' : `Add ${m.label} →`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {!allOwned && (
          <div style={{ background: '#101828', borderRadius: 12, padding: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Best value</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>All Modules Bundle</div>
              <div style={{ fontSize: 13, color: '#CBD5E1' }}>Every module included · 10% off vs buying separately · one-time payment</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through' }}>£195</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>£175.50</div>
              </div>
              <button onClick={() => buy('bundle')} disabled={buying === 'bundle'} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#fff', color: '#101828', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: buying === 'bundle' ? 0.6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {buying === 'bundle' ? 'Redirecting…' : 'Get the bundle →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
