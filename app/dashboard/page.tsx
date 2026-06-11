'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['properties', 'cleaning', 'maintenance', 'turnovers'],
  growth: ['properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations'],
  professional: ['properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations', 'reports', 'documents', 'statements', 'guest-comms', 'branding', 'api', 'portfolio', 'audit'],
}

const PLAN_PROPERTY_LIMIT: Record<string, number> = {
  starter: 5, growth: 25, professional: Infinity,
}

const PLAN_COLOR: Record<string, string> = {
  starter: '#6B7280', growth: '#5B7BF8', professional: '#1a1a2e',
}

const GROWTH_LOCKED = ['Bookings management', 'Owner reporting portal', 'Photo verification', 'Performance analytics', 'Calendar integrations', '10 team members']
const PRO_LOCKED = ['Advanced reporting & exports', 'Document storage', 'Automated owner statements', 'Guest communication templates', 'Custom branding', 'API access', 'Multi-portfolio view', 'Audit log', 'Priority support', 'Unlimited team members']

export default function DashboardPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [stats, setStats] = useState({ properties: 0, cleaning: 0, maintenance: 0, revenue: 0 })
  const [subscription, setSubscription] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
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
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [{ data: props }, { data: cleaning }, { data: tickets }, { data: bookings }, { data: upcoming }] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('cleaning_tasks').select('*').eq('status', 'pending'),
        supabase.from('maintenance_tickets').select('*').eq('status', 'open'),
        supabase.from('bookings').select('total_amount'),
        supabase.from('bookings').select('*, properties(name)').gte('check_in', today).lte('check_in', nextWeek).order('check_in', { ascending: true }).limit(5),
      ])

      setStats({
        properties: props?.length ?? 0,
        cleaning: cleaning?.length ?? 0,
        maintenance: tickets?.length ?? 0,
        revenue: bookings?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0,
      })
      setProperties(props ?? [])
      setUpcomingBookings(upcoming ?? [])

      // Recent activity from bookings
      const { data: recent } = await supabase.from('bookings').select('*, properties(name)').order('created_at', { ascending: false }).limit(5)
      setRecentActivity(recent ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const plan = subscription?.plan ?? 'starter'
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter
  const propertyLimit = PLAN_PROPERTY_LIMIT[plan] ?? 5
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function nightsBetween(ci: string, co: string) {
    return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: "var(--font, 'Inter', sans-serif)" }}>
      <style>{`
        
        .card { background: #fff; border-radius: 14px; border: 1px solid #E8ECF4; }
        .hover-row:hover { background: #F8FAFF !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF4', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{greeting}, {user?.email?.split('@')[0]} 👋</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>Here's what's happening today</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {subscription && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: '#F1F5FF', border: '1px solid #E0E7FF' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLOR[plan] }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: PLAN_COLOR[plan], textTransform: 'capitalize' }}>{plan}</span>
            </div>
          )}
          {plan !== 'professional' && (
            <a href="/landing.html#pricing" style={{ padding: '7px 16px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>⚡ Upgrade</a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Properties', value: `${stats.properties}${propertyLimit !== Infinity ? `/${propertyLimit}` : ''}`, sub: 'Total active', icon: '🏠', color: '#5B7BF8', bg: '#EEF2FF' },
            { label: 'Cleaning Tasks', value: stats.cleaning, sub: 'Pending today', icon: '🧹', color: '#10B981', bg: '#D1FAE5' },
            { label: 'Maintenance', value: stats.maintenance, sub: 'Open tickets', icon: '🔧', color: '#F59E0B', bg: '#FEF3C7' },
            { label: 'Revenue', value: `£${stats.revenue.toLocaleString()}`, sub: 'This month', icon: '💷', color: '#fff', bg: '#5B7BF8', dark: true },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding: '20px 24px', background: (card as any).dark ? '#5B7BF8' : '#fff', border: (card as any).dark ? 'none' : '1px solid #E8ECF4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: (card as any).dark ? 'rgba(255,255,255,0.7)' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: (card as any).dark ? 'rgba(255,255,255,0.2)' : card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{card.icon}</div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: (card as any).dark ? '#fff' : '#0F172A', letterSpacing: '-1px' }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 12, color: (card as any).dark ? 'rgba(255,255,255,0.6)' : '#94A3B8', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>

          {/* Upcoming check-ins */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Upcoming check-ins</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Next 7 days</div>
              </div>
              <a href="/bookings" style={{ fontSize: 12, color: '#5B7BF8', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
            </div>
            {loading ? (
              <div style={{ color: '#94A3B8', textAlign: 'center', padding: 32, fontSize: 14 }}>Loading…</div>
            ) : upcomingBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>No upcoming check-ins</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Bookings will appear here</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {upcomingBookings.map(b => (
                  <div key={b.id} className="hover-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏠</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{b.guest_name ?? 'Guest'}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{b.properties?.name} · {nightsBetween(b.check_in, b.check_out)} nights</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{formatDate(b.check_in)}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>→ {formatDate(b.check_out)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Activity feed</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Recent bookings & changes</div>
            {loading ? (
              <div style={{ color: '#94A3B8', textAlign: 'center', padding: 32, fontSize: 14 }}>Loading…</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>No activity yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {recentActivity.map(b => (
                  <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📝</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{b.guest_name ?? 'New booking'}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{b.properties?.name} · {b.platform ?? 'Direct'}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatDate(b.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>

          {/* Properties */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Your properties</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{stats.properties} total</div>
              </div>
              <a href="/properties" style={{ fontSize: 12, color: '#5B7BF8', fontWeight: 600, textDecoration: 'none' }}>Manage →</a>
            </div>
            {loading ? (
              <div style={{ color: '#94A3B8', textAlign: 'center', padding: 32, fontSize: 14 }}>Loading…</div>
            ) : properties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏡</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>No properties yet</div>
                <a href="/properties" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>+ Add property</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {properties.slice(0, 5).map(p => (
                  <div key={p.id} className="hover-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: '#F1F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏠'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{[p.city, p.country].filter(Boolean).join(', ') || 'No location set'}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: p.status === 'active' ? '#10B981' : '#6B7280', background: p.status === 'active' ? '#D1FAE5' : '#F3F4F6' }}>
                      {p.status ?? 'inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Portal status + upsell */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Calendar sync status */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Portal status</div>
              {properties.filter(p => p.airbnb_ical_url || p.vrbo_ical_url || p.booking_ical_url).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>No calendars connected yet.</div>
                  <a href="/properties" style={{ fontSize: 12, color: '#5B7BF8', fontWeight: 600, textDecoration: 'none', marginTop: 4, display: 'block' }}>Connect via properties →</a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {properties.map(p => (
                    <div key={p.id}>
                      {p.airbnb_ical_url && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🏠</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Airbnb</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>Synced</span>
                        </div>
                      )}
                      {p.vrbo_ical_url && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🏡</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>VRBO</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>Synced</span>
                        </div>
                      )}
                      {p.booking_ical_url && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🌐</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Booking.com</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>Synced</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upsell */}
            {plan === 'starter' && (
              <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🚀 Unlock Growth</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 16, lineHeight: 1.6 }}>Owner portal, analytics, calendar integrations and more.</div>
                <a href="/landing.html#pricing" style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#fff', color: '#764ba2', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Upgrade to Growth →</a>
              </div>
            )}
            {plan === 'growth' && (
              <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>⚡ Unlock Professional</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 16, lineHeight: 1.6 }}>Advanced reports, document storage, custom branding and API access.</div>
                <a href="/landing.html#pricing" style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Upgrade to Professional →</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
