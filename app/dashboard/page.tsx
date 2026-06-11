'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ['properties', 'cleaning', 'maintenance', 'turnovers'],
  growth:       ['properties', 'cleaning', 'maintenance', 'turnovers', 'owners', 'analytics', 'integrations'],
  professional: ['properties', 'cleaning', 'maintenance', 'turnovers', 'owners', 'analytics', 'integrations'],
}

const PLAN_PROPERTY_LIMIT: Record<string, number> = {
  starter: 5,
  growth: 25,
  professional: Infinity,
}

const NAV_ITEMS = [
  { key: 'properties',   label: 'Properties',   href: '/properties',   icon: '🏠' },
  { key: 'cleaning',     label: 'Cleaning',      href: '/cleaning',     icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',   href: '/maintenance',  icon: '🔧' },
  { key: 'turnovers',    label: 'Turnovers',     href: '/turnovers',    icon: '🔄' },
  { key: 'owners',       label: 'Owners Portal', href: '/owners',       icon: '👤', minPlan: 'growth' },
  { key: 'analytics',    label: 'Analytics',     href: '/analytics',    icon: '📊', minPlan: 'growth' },
  { key: 'integrations', label: 'Integrations',  href: '/integrations', icon: '🔌', minPlan: 'growth' },
]

const PLAN_COLOR: Record<string, string> = {
  starter: '#6B7280',
  growth: '#5B7BF8',
  professional: '#1a1a2e',
}

const PLAN_LABEL: Record<string, string> = {
  starter: 'S',
  growth: 'G',
  professional: 'P',
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ properties: 0, cleaning: 0, maintenance: 0, revenue: 0 })
  const [subscription, setSubscription] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
        setSubscription(sub)
      }
      const [{ data: props }, { data: cleaning }, { data: tickets }, { data: bookings }] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('cleaning_tasks').select('*').eq('status', 'pending'),
        supabase.from('maintenance_tickets').select('*').eq('status', 'open'),
        supabase.from('bookings').select('total_amount'),
      ])
      setStats({
        properties: props?.length ?? 0,
        cleaning: cleaning?.length ?? 0,
        maintenance: tickets?.length ?? 0,
        revenue: bookings?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0,
      })
      setProperties(props ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const plan = subscription?.plan ?? 'starter'
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter
  const propertyLimit = PLAN_PROPERTY_LIMIT[plan] ?? 5
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  function LockedBadge({ minPlan }: { minPlan: string }) {
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {minPlan}+
      </span>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid #E5E7EB', minHeight: '100vh', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Opero</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{user?.email}</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 12px' }}>
          {NAV_ITEMS.map(item => {
            const hasAccess = features.includes(item.key)
            return (
              
                key={item.key}
                href={hasAccess ? item.href : '#'}
                onClick={!hasAccess ? (e) => e.preventDefault() : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  fontSize: 14, fontWeight: 500, textDecoration: 'none',
                  color: hasAccess ? '#374151' : '#9CA3AF',
                  cursor: hasAccess ? 'pointer' : 'default',
                  background: 'transparent',
                }}
              >
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {!hasAccess && item.minPlan && <LockedBadge minPlan={item.minPlan} />}
              </a>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Dashboard</h1>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>

          {/* Plan banner */}
          {subscription && (
            <div style={{ background: subscription.status === 'trialing' ? '#EFF6FF' : '#f0fdf4', border: `1px solid ${subscription.status === 'trialing' ? '#BFDBFE' : '#bbf7d0'}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: PLAN_COLOR[plan], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {PLAN_LABEL[plan]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{plan} Plan</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {subscription.billing_period === 'yearly' ? 'Billed yearly' : 'Billed monthly'} · {subscription.status === 'trialing' ? '14-day free trial' : 'Active'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {plan !== 'professional' && (
                  <a href="/landing.html#pricing" style={{ padding: '8px 16px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Upgrade plan</a>
                )}
                <a href="/landing.html#pricing" style={{ padding: '8px 16px', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Manage billing</a>
              </div>
            </div>
          )}

          {/* Property limit warning */}
          {plan === 'starter' && stats.properties >= 4 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 14, color: '#92400E' }}>
                ⚠️ You're using <strong>{stats.properties}/5</strong> properties on the Starter plan.
                {stats.properties >= 5 ? ' Upgrade to add more.' : ' 1 slot remaining.'}
              </div>
              <a href="/landing.html#pricing" style={{ padding: '7px 14px', background: '#F59E0B', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade</a>
            </div>
          )}

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{greeting}! 👋</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Here is what is happening today.</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'PROPERTIES', value: `${stats.properties}${propertyLimit !== Infinity ? `/${propertyLimit}` : ''}`, sub: 'All active', bg: '#fff' },
              { label: 'CLEANING TASKS', value: stats.cleaning, sub: 'Pending', bg: '#fff' },
              { label: 'MAINTENANCE', value: stats.maintenance, sub: 'Open tickets', bg: '#fff' },
              { label: 'REVENUE', value: `£${stats.revenue.toLocaleString()}`, sub: 'This month', bg: '#2563EB', light: true },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: 12, border: (card as any).light ? 'none' : '1px solid #E5E7EB', padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: (card as any).light ? 'rgba(255,255,255,0.7)' : '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: (card as any).light ? '#fff' : '#111827', letterSpacing: '-1px' }}>{loading ? '—' : card.value}</div>
                <div style={{ fontSize: 13, color: (card as any).light ? 'rgba(255,255,255,0.7)' : '#9CA3AF', marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Locked features upsell */}
          {plan === 'starter' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 32 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Unlock more with Growth</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Get owner reporting, photo verification, performance analytics, and calendar integrations.</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['Owner reporting portal', 'Photo verification', 'Performance analytics', 'Calendar integrations', '10 team members'].map(f => (
                  <span key={f} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280' }}>🔒 {f}</span>
                ))}
              </div>
              <a href="/landing.html#pricing" style={{ display: 'inline-block', marginTop: 16, padding: '9px 18px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Upgrade to Growth →</a>
            </div>
          )}

          {/* Properties */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Your Properties</h3>
          {loading ? (
            <div style={{ color: '#9CA3AF', padding: 40, textAlign: 'center' }}>Loading…</div>
          ) : properties.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No properties yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {properties.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 4 }}>{p.name}</div>
                  {p.address && <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>{p.address}{p.city ? `, ${p.city}` : ''}</div>}
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#6B7280', paddingTop: 12, borderTop: '1px solid #F3F4F6', justifyContent: 'space-between' }}>
                    {p.bedrooms != null && <span>🛏 {p.bedrooms} bed</span>}
                    {p.bathrooms != null && <span>🚿 {p.bathrooms} bath</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: p.status === 'active' ? '#10B981' : '#6B7280', background: p.status === 'active' ? '#D1FAE5' : '#F3F4F6' }}>
                      {p.status ?? 'inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
