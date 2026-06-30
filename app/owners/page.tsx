
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'



const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'statements', label: 'Statements' },
  { id: 'roi', label: 'ROI Per Owner' },
  { id: 'properties', label: 'My Properties' },
  { id: 'finance', label: 'Finance & Documents' },
]

const MANAGEMENT_FEE = 0.20 // 20% management fee

export default function OwnersPage() {
    const [tab, setTab] = useState('dashboard')
  const [properties, setProperties] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedOwner, setSelectedOwner] = useState('all')
  const [loading, setLoading] = useState(true)
  const [addRecord, setAddRecord] = useState(false)
  const [record, setRecord] = useState({ property_id: '', description: '', amount: '', type: 'revenue' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: props }, { data: bkgs }, { data: tix }] = await Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('bookings').select('*, properties(name)'),
      supabase.from('maintenance_tickets').select('*, properties(name)'),
    ])
    if (props) setProperties(props)
    if (bkgs) setBookings(bkgs)
    if (tix) setTickets(tix)
    setLoading(false)
  }

  const totalRevenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total_amount ?? 0), 0)
  const managementFee = totalRevenue * MANAGEMENT_FEE
  const ownerShare = totalRevenue - managementFee
  const ownerPct = Math.round((1 - MANAGEMENT_FEE) * 100)
  const mgmtPct = Math.round(MANAGEMENT_FEE * 100)

  // Group bookings by month
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const byMonth: Record<string, { revenue: number; bookings: any[] }> = {}
  bookings.filter(b => b.status !== 'cancelled').forEach(b => {
    if (!b.check_in) return
    const d = new Date(b.check_in)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (!byMonth[key]) byMonth[key] = { revenue: 0, bookings: [] }
    byMonth[key].revenue += b.total_amount ?? 0
    byMonth[key].bookings.push(b)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "var(--font, 'Inter', sans-serif)" }}>
      <style>{``}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Owner Reports</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
              <option value="all">All Owners</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => setAddRecord(true)}
              style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              + Add Record
            </button>
          </div>
        </div>

        {/* Sub tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              color: tab === t.id ? '#2563EB' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading…</div> : (
          <>
            {/* DASHBOARD TAB */}
            {tab === 'dashboard' && (
              <div>
                {/* KPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'PAID OUT', value: `£${ownerShare.toLocaleString()}` },
                    { label: 'GUEST REVENUE', value: `£${totalRevenue.toLocaleString()}` },
                    { label: 'EXPENSES', value: `£${managementFee.toLocaleString()}` },
                    { label: 'NET THIS MONTH', value: `£${ownerShare.toLocaleString()}` },
                  ].map(card => (
                    <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 6 }}>{card.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Profit Split */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '24px', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Profit Split — After All Expenses</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    {[
                      { label: 'GROSS REVENUE', value: `£${totalRevenue.toLocaleString()}` },
                      { label: 'TOTAL EXPENSES', value: `£${managementFee.toLocaleString()}`, sub: `Management fee ${mgmtPct}%` },
                      { label: 'NET PROFIT', value: `£${ownerShare.toLocaleString()}`, color: ownerShare >= 0 ? '#10B981' : '#EF4444' },
                    ].map(card => (
                      <div key={card.label} style={{ background: '#F8F9FA', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 6 }}>{card.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: card.color ?? '#111827' }}>{card.value}</div>
                        {card.sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{card.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '16px 20px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.5px', marginBottom: 6 }}>OWNER SHARE ({ownerPct}%)</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>£{ownerShare.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '16px 20px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.5px', marginBottom: 6 }}>MANAGEMENT TAKE ({mgmtPct}%)</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#2563EB' }}>£{managementFee.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Management Fee</div>
                    </div>
                  </div>
                </div>

                {/* Monthly breakdown */}
                {Object.entries(byMonth).reverse().map(([month, data]) => (
                  <div key={month} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{month}</span>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                        <span style={{ color: '#10B981' }}>+£{data.revenue.toLocaleString()}</span>
                        <span style={{ color: '#EF4444' }}>-£{Math.round(data.revenue * MANAGEMENT_FEE).toLocaleString()}</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>Net: £{Math.round(data.revenue * (1 - MANAGEMENT_FEE)).toLocaleString()}</span>
                      </div>
                    </div>
                    {data.bookings.map((b: any) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F3F4F6', fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 500, color: '#111827' }}>{b.guest_name ?? 'Guest'} — booking revenue</div>
                          <div style={{ color: '#9CA3AF', marginTop: 2 }}>{b.properties?.name} · {b.check_in}</div>
                        </div>
                        <span style={{ fontWeight: 600, color: '#10B981' }}>+£{(b.total_amount ?? 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* BOOKINGS TAB */}
            {tab === 'bookings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>No bookings yet</div>
                ) : bookings.map(b => (
                  <div key={b.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{b.guest_name ?? 'Guest'}</div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{b.properties?.name} · {b.check_in} → {b.check_out}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>£{(b.total_amount ?? 0).toLocaleString()}</div>
                      <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: b.status === 'confirmed' ? '#D1FAE5' : '#F3F4F6', color: b.status === 'confirmed' ? '#10B981' : '#6B7280', marginTop: 4, display: 'inline-block' }}>{b.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MAINTENANCE TAB */}
            {tab === 'maintenance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>No maintenance tickets</div>
                ) : tickets.map(t => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{t.title}</div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{t.properties?.name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: t.status === 'open' ? '#DBEAFE' : '#D1FAE5', color: t.status === 'open' ? '#2563EB' : '#10B981' }}>{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PROPERTIES TAB */}
            {tab === 'properties' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {properties.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>{p.address}{p.city ? `, ${p.city}` : ''}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#6B7280' }}>
                      {p.bedrooms != null && <span>🛏 {p.bedrooms} bed</span>}
                      {p.bathrooms != null && <span>🚿 {p.bathrooms} bath</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ROI TAB */}
            {tab === 'roi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {properties.map(p => {
                  const propBookings = bookings.filter(b => b.property_id === p.id && b.status !== 'cancelled')
                  const revenue = propBookings.reduce((s, b) => s + (b.total_amount ?? 0), 0)
                  const ownerNet = revenue * (1 - MANAGEMENT_FEE)
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 16 }}>{p.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div style={{ textAlign: 'center', background: '#F8F9FA', borderRadius: 8, padding: '12px' }}>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>GROSS REVENUE</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>£{revenue.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#F0FDF4', borderRadius: 8, padding: '12px' }}>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>OWNER NET ({ownerPct}%)</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>£{Math.round(ownerNet).toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#EFF6FF', borderRadius: 8, padding: '12px' }}>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>BOOKINGS</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#2563EB' }}>{propBookings.length}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* STATEMENTS / FINANCE / CALENDAR — placeholder tabs */}
            {(tab === 'statements' || tab === 'finance' || tab === 'calendar') && (
              <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Coming soon</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>This section is being built</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Record Modal */}
      {addRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setAddRecord(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>Add Record</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Property</label>
                <select value={record.property_id} onChange={e => setRecord({ ...record, property_id: e.target.value })} style={inp}>
                  <option value="">Select…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input type="text" value={record.description} onChange={e => setRecord({ ...record, description: e.target.value })} style={inp} placeholder="e.g. Booking revenue, maintenance cost…" />
              </div>
              <div>
                <label style={lbl}>Amount (£)</label>
                <input type="number" value={record.amount} onChange={e => setRecord({ ...record, amount: e.target.value })} style={inp} placeholder="0" />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={record.type} onChange={e => setRecord({ ...record, type: e.target.value })} style={inp}>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setAddRecord(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => setAddRecord(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
