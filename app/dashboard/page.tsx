'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardPage() {
  const [stats, setStats] = useState({ properties: 0, cleaning: 0, maintenance: 0, revenue: 0 })
  const [subscription, setSubscription] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Dashboard</h1>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {subscription && (
          <div style={{background: subscription.status === 'active' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${subscription.status === 'active' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{width: 36, height: 36, borderRadius: 8, background: subscription.plan === 'professional' ? '#1a1a2e' : subscription.plan === 'growth' ? '#5B7BF8' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700}}>
                {subscription.plan === 'professional' ? 'P' : subscription.plan === 'growth' ? 'G' : 'S'}
              </div>
              <div>
                <div style={{fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'capitalize'}}>{subscription.plan} Plan</div>
                <div style={{fontSize: 12, color: '#6b7280'}}>{subscription.billing_period === 'yearly' ? 'Billed yearly' : 'Billed monthly'} · {subscription.status === 'active' ? 'Active' : 'Trial'}</div>
              </div>
            </div>
            <div style={{display: 'flex', gap: 8}}>
              {subscription.plan !== 'professional' && (
                <a href="/landing.html#pricing" style={{padding: '8px 16px', background: '#5B7BF8', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none'}}>Upgrade plan</a>
              )}
              <a href="/landing.html#pricing" style={{padding: '8px 16px', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none'}}>Manage billing</a>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{greeting}! 👋</h2>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Here is what is happening today.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'PROPERTIES', value: stats.properties, sub: 'All active', bg: '#fff' },
            { label: 'CLEANING TASKS', value: stats.cleaning, sub: 'Pending', bg: '#fff' },
            { label: 'MAINTENANCE', value: stats.maintenance, sub: 'Open tickets', bg: '#fff' },
            { label: 'REVENUE', value: `£${stats.revenue.toLocaleString()}`, sub: 'This month', bg: '#2563EB', light: true },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 12, border: card.light ? 'none' : '1px solid #E5E7EB', padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: card.light ? 'rgba(255,255,255,0.7)' : '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: card.light ? '#fff' : '#111827', letterSpacing: '-1px' }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 13, color: card.light ? 'rgba(255,255,255,0.7)' : '#9CA3AF', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>
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
  )
}