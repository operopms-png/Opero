'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ACCENT = '#5B7CFA'

function PMOwnerPortalInner() {
  const searchParams = useSearchParams()
  const viewingLandlordId = searchParams.get('landlord_id')
  const [loading, setLoading] = useState(true)
  const [isStaffView, setIsStaffView] = useState(false)
  const [tab, setTab] = useState('Dashboard')
  const [landlord, setLandlord] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      let ll: any = null
      if (viewingLandlordId) {
        // Staff previewing a specific landlord's portal — works because
        // staff already has full read access to their own business's data.
        const { data } = await supabase.from('pm_landlords').select('*').eq('id', viewingLandlordId).single()
        ll = data
        setIsStaffView(true)
      } else {
        // The landlord viewing their own portal
        const { data } = await supabase.from('pm_landlords').select('*').eq('portal_user_id', user.id).single()
        ll = data
      }
      if (!ll) { window.location.href = '/login'; return }
      setLandlord(ll)
      const [{ data: props }, { data: pays }] = await Promise.all([
        supabase.from('pm_properties').select('*').eq('owner_id', ll.id),
        supabase.from('pm_landlord_payments').select('*, pm_properties(name)').eq('landlord_id', ll.id).order('due_date', { ascending: false }),
      ])
      setProperties(props ?? [])
      setPayments(pays ?? [])
      setLoading(false)
    })
  }, [viewingLandlordId])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const today = new Date().toISOString().slice(0,10)
  const totalPaid = payments.filter(p => p.paid_date).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const pendingCount = payments.filter(p => !p.paid_date).length
  const overdueCount = payments.filter(p => !p.paid_date && p.due_date && p.due_date < today).length

  function statusFor(p: any) {
    if (!p.paid_date) return p.due_date && p.due_date < today ? { label: 'Overdue', bg: '#FEE2E2', color: '#EF4444' } : { label: 'Pending', bg: '#FEF3C7', color: '#D97706' }
    if (p.due_date && p.paid_date > p.due_date) return { label: 'Paid Late', bg: '#FEF3C7', color: '#D97706' }
    return { label: 'Paid On Time', bg: '#D1FAE5', color: '#059669' }
  }

  const TABS = ['Dashboard', 'Properties', 'Statements']

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      {isStaffView && (
        <div style={{ background: '#EEF1FF', borderBottom: '1px solid #C7D2FE', padding: '8px 28px', fontSize: 13, color: '#3B4AFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👁️ Viewing as {landlord.name} (staff preview — read only)</span>
          <a href="/pm?tab=Landlords" style={{ color: '#3B4AFF', fontWeight: 600, textDecoration: 'none' }}>Exit preview</a>
        </div>
      )}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Landlord Portal</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#101828' }}>Welcome, {landlord.name}</div>
        </div>
        {!isStaffView && (
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>Sign out</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 0, padding: '0 28px', background: '#fff', borderBottom: '1px solid #E4E7EC' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 16px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? ACCENT : '#667085', borderBottom: tab === t ? `2px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#101828' }}>{properties.length}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Your Properties</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>£{totalPaid.toLocaleString()}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Total Paid to You</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#D97706' }}>{pendingCount}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Pending Payments</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #FEE2E2', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>{overdueCount}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Overdue</div></div>
        </div>

        {tab === 'Dashboard' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 16 }}>Recent Payments</div>
            {payments.length === 0 ? <div style={{ color: '#98A2B3', fontSize: 13, textAlign: 'center', padding: 30 }}>No payments recorded yet.</div> : payments.slice(0, 6).map(p => {
              const s = statusFor(p)
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F2F4F7' }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{p.pm_properties?.name ?? '—'} · {p.category}</div><div style={{ fontSize: 11, color: '#98A2B3' }}>Due {p.due_date ?? '—'}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>£{parseFloat(p.amount).toLocaleString()}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'Properties' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {properties.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>No properties assigned yet.</div> : properties.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '16px 20px' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#101828' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{[p.address, p.city, p.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Statements' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 100px 130px 80px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
              <span>Property</span><span>Category</span><span>Amount</span><span>Due</span><span>Paid</span><span>Status</span><span>Receipt</span>
            </div>
            {payments.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>No statements yet.</div> : payments.map(p => {
              const s = statusFor(p)
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 100px 130px 80px', padding: '13px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#101828' }}>{p.pm_properties?.name ?? '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#F2F4F7', color: '#344054' }}>{p.category}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>£{parseFloat(p.amount).toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: '#667085' }}>{p.due_date ?? '—'}</span>
                  <span style={{ fontSize: 12, color: '#667085' }}>{p.paid_date ?? '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: s.bg, color: s.color, display: 'inline-block' }}>{s.label}</span>
                  {p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: ACCENT }}>View</a> : <span style={{ fontSize: 12, color: '#D0D5DD' }}>—</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PMOwnerPortal() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>}>
      <PMOwnerPortalInner />
    </Suspense>
  )
}
