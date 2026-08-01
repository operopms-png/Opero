'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ReportsPage() {
    const [bookings, setBookings] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'revenue' | 'occupancy'>('revenue')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('properties').select('*').eq('user_id', user?.id)
      const propIds = (p ?? []).map((x: any) => x.id)
      const safeIds = propIds.length ? propIds : ['00000000-0000-0000-0000-000000000000']
      const { data: b } = await supabase.from('bookings').select('*, properties(name)').in('property_id', safeIds).order('check_in', { ascending: false })
      setBookings(b ?? [])
      setProperties(p ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const confirmed = bookings.filter(b => b.status !== 'cancelled')
  const totalRevenue = confirmed.reduce((s, b) => s + (b.total_amount ?? 0), 0)

  function exportCSV() {
    const rows = [['Guest', 'Property', 'Check In', 'Check Out', 'Amount', 'Status']]
    confirmed.forEach(b => rows.push([b.guest_name ?? '', b.properties?.name ?? '', b.check_in ?? '', b.check_out ?? '', String(b.total_amount ?? 0), b.status ?? '']))
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'))
    a.download = 'opero-report.csv'
    a.click()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#101828' }}>Advanced Reports</h1>
          </div>
          <button onClick={exportCSV} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Export CSV</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['revenue', 'occupancy'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? '#3B4AFF' : '#667085', borderBottom: tab === t ? '2px solid #3B4AFF' : '2px solid transparent', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t === 'revenue' ? 'Revenue Report' : 'Occupancy'}</button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3' }}>Loading...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[{ label: 'Total Revenue', value: `£${totalRevenue.toLocaleString()}` }, { label: 'Total Bookings', value: confirmed.length }, { label: 'Properties', value: properties.length }].map(c => (
                <div key={c.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#101828' }}>{c.value}</div>
                </div>
              ))}
            </div>
            {tab === 'revenue' && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 100px 100px', padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                  <span>Guest</span><span>Property</span><span>Check In</span><span>Check Out</span><span>Amount</span><span>Status</span>
                </div>
                {confirmed.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No bookings yet</div> :
                confirmed.map(b => (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 100px 100px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, color: '#344054', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: '#101828' }}>{b.guest_name ?? '—'}</span>
                    <span>{b.properties?.name ?? '—'}</span>
                    <span>{b.check_in ? new Date(b.check_in).toLocaleDateString('en-GB') : '—'}</span>
                    <span>{b.check_out ? new Date(b.check_out).toLocaleDateString('en-GB') : '—'}</span>
                    <span style={{ fontWeight: 600 }}>£{(b.total_amount ?? 0).toLocaleString()}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: b.status === 'confirmed' ? '#D1FAE5' : '#F3F4F6', color: b.status === 'confirmed' ? '#10B981' : '#6B7280', textAlign: 'center' }}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'occupancy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {properties.map(p => {
                  const pb = confirmed.filter(b => b.property_id === p.id)
                  const nights = pb.reduce((s, b) => s + (b.check_in && b.check_out ? Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000) : 0), 0)
                  const occ = Math.min(100, Math.round((nights / 60) * 100))
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, color: '#101828' }}>{p.name}</span>
                        <span style={{ fontSize: 13, color: '#667085' }}>{pb.length} bookings · {nights} nights</span>
                      </div>
                      <div style={{ background: '#F2F4F7', borderRadius: 100, height: 8 }}>
                        <div style={{ background: '#3B4AFF', borderRadius: 100, height: 8, width: `${occ}%` }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>{occ}% occupancy</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
