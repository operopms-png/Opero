'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'



export default function AnalyticsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'monthly' | 'yearly'>('monthly')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalBookings, setTotalBookings] = useState(0)
  const [cancellations, setCancellations] = useState(0)
  const [occupancy, setOccupancy] = useState(0)
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; bookings: number; nights: number }[]>([])
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [selectedProperty, setSelectedProperty] = useState('all')

  useEffect(() => { fetchData() }, [selectedProperty])

  async function fetchData() {
    setLoading(true)

    let query = supabase.from('bookings').select('*')
    if (selectedProperty !== 'all') query = query.eq('property_id', selectedProperty)
    const { data: bookings } = await query
    const { data: props } = await supabase.from('properties').select('id, name')

    if (props) setProperties(props)

    if (bookings) {
      const confirmed = bookings.filter(b => b.status !== 'cancelled')
      const cancelled = bookings.filter(b => b.status === 'cancelled')

      setTotalRevenue(confirmed.reduce((s, b) => s + (b.total_amount ?? 0), 0))
      setTotalBookings(confirmed.length)
      setCancellations(cancelled.length)

      // Occupancy: booked nights / (properties * 30 days)
      const totalNights = confirmed.reduce((s, b) => {
        if (!b.check_in || !b.check_out) return s
        const diff = new Date(b.check_out).getTime() - new Date(b.check_in).getTime()
        return s + Math.round(diff / (1000 * 60 * 60 * 24))
      }, 0)
      const propCount = selectedProperty === 'all' ? (props?.length ?? 1) : 1
      const availableNights = propCount * 60
      setOccupancy(Math.min(100, Math.round((totalNights / availableNights) * 100)))

      // Group by month
      const byMonth: Record<string, { revenue: number; bookings: number; nights: number }> = {}
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`
        byMonth[key] = { revenue: 0, bookings: 0, nights: 0 }
      }

      confirmed.forEach(b => {
        if (!b.check_in) return
        const d = new Date(b.check_in)
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`
        if (byMonth[key]) {
          byMonth[key].revenue += b.total_amount ?? 0
          byMonth[key].bookings += 1
          if (b.check_out) {
            const diff = new Date(b.check_out).getTime() - new Date(b.check_in).getTime()
            byMonth[key].nights += Math.round(diff / (1000 * 60 * 60 * 24))
          }
        }
      })

      setMonthlyData(Object.entries(byMonth).map(([month, v]) => ({ month, ...v })))
    }
    setLoading(false)
  }

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)
  const maxBookings = Math.max(...monthlyData.map(m => m.bookings), 1)

  // Gauge path
  const gaugeAngle = (occupancy / 100) * 180
  const toRad = (deg: number) => (deg - 180) * (Math.PI / 180)
  const gx = 100 + 70 * Math.cos(toRad(gaugeAngle))
  const gy = 80 + 70 * Math.sin(toRad(gaugeAngle))

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "var(--font, 'Inter', sans-serif)" }}>
      <style>{``}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Analytics</h1>
          <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
            <option value="all">All accommodations ({properties.length})</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24, borderTop: '1px solid #F3F4F6' }}>
          {(['monthly', 'yearly'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 500, color: tab === t ? '#2563EB' : '#6B7280',
              borderBottom: tab === t ? '2px solid #2563EB' : '2px solid transparent',
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading analytics…</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { icon: '💰', label: `£${totalRevenue.toLocaleString()} Revenue`, sub: `${totalBookings * 30} Nights` },
                { icon: '📅', label: `${totalBookings} Bookings`, sub: `${totalBookings * 30} Nights` },
                { icon: '❌', label: `${cancellations} Cancellations`, sub: '0 Nights', dim: true },
              ].map((card, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${card.dim ? '#FEE2E2' : '#E5E7EB'}`, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{card.icon}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: card.dim ? '#EF4444' : '#111827' }}>{card.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>{card.sub}</div>
                  {/* Mini sparkline */}
                  <svg viewBox="0 0 200 50" style={{ width: '100%', height: 50, marginTop: 8 }}>
                    <polyline
                      points={monthlyData.map((m, idx) => {
                        const val = i === 0 ? m.revenue : i === 1 ? m.bookings : 0
                        const max = i === 0 ? maxRevenue : i === 1 ? maxBookings : 1
                        const x = (idx / (monthlyData.length - 1)) * 190 + 5
                        const y = 45 - (val / max) * 40
                        return `${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke={card.dim ? '#FCA5A5' : i === 0 ? '#10B981' : '#2563EB'}
                      strokeWidth="2"
                      strokeDasharray={card.dim ? '4 4' : 'none'}
                    />
                    {monthlyData.map((m, idx) => {
                      const val = i === 0 ? m.revenue : i === 1 ? m.bookings : 0
                      const max = i === 0 ? maxRevenue : i === 1 ? maxBookings : 1
                      const x = (idx / (monthlyData.length - 1)) * 190 + 5
                      const y = 45 - (val / max) * 40
                      return <circle key={idx} cx={x} cy={y} r="3" fill={card.dim ? '#FCA5A5' : i === 0 ? '#10B981' : '#2563EB'} />
                    })}
                  </svg>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Occupancy Gauge */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '24px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Occupancy</div>
                <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}>
                  {/* Track */}
                  <path d="M 20 80 A 80 80 0 0 1 180 80" fill="none" stroke="#F3F4F6" strokeWidth="16" strokeLinecap="round" />
                  {/* Fill */}
                  <path d={`M 20 80 A 80 80 0 ${occupancy > 50 ? 1 : 0} 1 ${gx} ${gy}`} fill="none" stroke="#2563EB" strokeWidth="16" strokeLinecap="round" />
                  {/* Labels */}
                  <text x="18" y="98" fontSize="10" fill="#9CA3AF">0%</text>
                  <text x="90" y="18" fontSize="10" fill="#9CA3AF" textAnchor="middle">50%</text>
                  <text x="175" y="98" fontSize="10" fill="#9CA3AF">100%</text>
                  {/* Needle */}
                  <line x1="100" y1="80" x2={gx} y2={gy} stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="100" cy="80" r="5" fill="#111827" />
                  {/* Value */}
                  <text x="100" y="100" fontSize="18" fontWeight="bold" fill="#111827" textAnchor="middle">{occupancy}%</text>
                </svg>
              </div>

              {/* Revenue + Occupancy Chart */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '24px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Occupancy & Revenue</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, background: '#2563EB', display: 'inline-block' }}></span>Revenue</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, background: '#10B981', display: 'inline-block', borderTop: '2px dashed #10B981' }}></span>Occupancy</span>
                </div>
                <svg viewBox="0 0 300 120" style={{ width: '100%' }}>
                  {/* Revenue line */}
                  <polyline
                    points={monthlyData.map((m, i) => {
                      const x = (i / (monthlyData.length - 1)) * 280 + 10
                      const y = 110 - (m.revenue / maxRevenue) * 90
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none" stroke="#2563EB" strokeWidth="2"
                  />
                  {/* Occupancy line (bookings as proxy) */}
                  <polyline
                    points={monthlyData.map((m, i) => {
                      const x = (i / (monthlyData.length - 1)) * 280 + 10
                      const y = 110 - (m.bookings / maxBookings) * 90
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 3"
                  />
                  {/* Month labels */}
                  {monthlyData.map((m, i) => (
                    <text key={i} x={(i / (monthlyData.length - 1)) * 280 + 10} y="118" fontSize="8" fill="#9CA3AF" textAnchor="middle">
                      {m.month.split(' ')[0]}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
