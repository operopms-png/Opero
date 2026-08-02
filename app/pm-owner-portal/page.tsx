'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ACCENT = '#5B7CFA'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

function PMOwnerPortalInner() {
  const searchParams = useSearchParams()
  const viewingLandlordId = searchParams.get('landlord_id')
  const [loading, setLoading] = useState(true)
  const [isStaffView, setIsStaffView] = useState(false)
  const [tab, setTab] = useState('Dashboard')
  const [landlord, setLandlord] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState<any>({})
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [payForm, setPayForm] = useState({property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:''})

  async function loadAll(ll: any) {
    const [{ data: props }, { data: pays }] = await Promise.all([
      supabase.from('pm_properties').select('*').eq('owner_id', ll.id),
      supabase.from('pm_landlord_payments').select('*, pm_properties(name)').eq('landlord_id', ll.id).order('due_date', { ascending: false }),
    ])
    setProperties(props ?? [])
    setPayments(pays ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      let ll: any = null
      if (viewingLandlordId) {
        // Staff previewing/managing a specific landlord's portal — works
        // because staff already has full read/write access to their own
        // business's data via the existing business-owner RLS policies.
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
      setContactForm({ email: ll.email ?? '', phone: ll.phone ?? '', address: ll.address ?? '', bank_name: ll.bank_name ?? '', account_name: ll.account_name ?? '', account_number: ll.account_number ?? '', sort_code: ll.sort_code ?? '', routing_number: ll.routing_number ?? '' })
      await loadAll(ll)
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

  async function saveContact() {
    setSaving(true)
    const { error } = await supabase.from('pm_landlords').update(contactForm).eq('id', landlord.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setLandlord({ ...landlord, ...contactForm })
    alert('Saved!')
  }

  async function addPayment() {
    if (!payForm.amount) return
    setSaving(true)
    const { error } = await supabase.from('pm_landlord_payments').insert([{ ...payForm, landlord_id: landlord.id, amount: parseFloat(payForm.amount), due_date: payForm.due_date || null, paid_date: payForm.paid_date || null, user_id: landlord.user_id }])
    setSaving(false)
    if (error) { alert(error.message); return }
    setPayForm({property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:''})
    setShowAddPayment(false)
    await loadAll(landlord)
  }

  async function updatePaymentStatus(id: string, paid_date: string) {
    const { error } = await supabase.from('pm_landlord_payments').update({ paid_date: paid_date || null }).eq('id', id)
    if (error) { alert(error.message); return }
    await loadAll(landlord)
  }

  async function deletePayment(id: string) {
    await supabase.from('pm_landlord_payments').delete().eq('id', id)
    await loadAll(landlord)
  }

  const TABS = ['Dashboard', 'Properties', 'Statements', 'Contact & Payment']

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      {isStaffView && (
        <div style={{ background: '#EEF1FF', borderBottom: '1px solid #C7D2FE', padding: '8px 28px', fontSize: 13, color: '#3B4AFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👁️ Viewing as {landlord.name} — you can view and manage everything here as staff</span>
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
          <div>
            {isStaffView && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setShowAddPayment(true)} style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Payment</button>
              </div>
            )}
            {showAddPayment && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid '+ACCENT, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={lbl}>Property</label><select style={inp} value={payForm.property_id} onChange={e=>setPayForm({...payForm,property_id:e.target.value})}><option value="">Select…</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label style={lbl}>Category</label><select style={inp} value={payForm.category} onChange={e=>setPayForm({...payForm,category:e.target.value})}>{['Rent Share','Utility Bill','Maintenance Reimbursement','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Amount (£)</label><input type="number" style={inp} value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})}/></div>
                  <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={payForm.due_date} onChange={e=>setPayForm({...payForm,due_date:e.target.value})}/></div>
                  <div><label style={lbl}>Paid Date</label><input type="date" style={inp} value={payForm.paid_date} onChange={e=>setPayForm({...payForm,paid_date:e.target.value})}/></div>
                  <div><label style={lbl}>Notes</label><input style={inp} value={payForm.notes} onChange={e=>setPayForm({...payForm,notes:e.target.value})}/></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addPayment} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{saving?'Saving…':'Save'}</button>
                  <button onClick={()=>setShowAddPayment(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isStaffView ? '1fr 120px 100px 100px 100px 130px 80px 30px' : '1fr 120px 100px 100px 100px 130px 80px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
                <span>Property</span><span>Category</span><span>Amount</span><span>Due</span><span>Paid</span><span>Status</span><span>Receipt</span>{isStaffView && <span></span>}
              </div>
              {payments.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>No statements yet.</div> : payments.map(p => {
                const s = statusFor(p)
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: isStaffView ? '1fr 120px 100px 100px 100px 130px 80px 30px' : '1fr 120px 100px 100px 100px 130px 80px', padding: '13px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#101828' }}>{p.pm_properties?.name ?? '—'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#F2F4F7', color: '#344054' }}>{p.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>£{parseFloat(p.amount).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: '#667085' }}>{p.due_date ?? '—'}</span>
                    {isStaffView ? (
                      <input type="date" defaultValue={p.paid_date ?? ''} onBlur={e => { if (e.target.value !== (p.paid_date ?? '')) updatePaymentStatus(p.id, e.target.value) }} style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #E4E7EC', borderRadius: 6, fontFamily: 'inherit' }} />
                    ) : <span style={{ fontSize: 12, color: '#667085' }}>{p.paid_date ?? '—'}</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: s.bg, color: s.color, display: 'inline-block' }}>{s.label}</span>
                    {p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: ACCENT }}>View</a> : <span style={{ fontSize: 12, color: '#D0D5DD' }}>—</span>}
                    {isStaffView && <button onClick={() => deletePayment(p.id)} style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer', fontSize: 16 }}>×</button>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Contact & Payment' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Contact Details</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>{isStaffView ? "You're editing this on the landlord's behalf." : 'Keep this up to date so we can reach you.'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Email</label><input style={inp} value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})}/></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})}/></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Address</label><input style={inp} value={contactForm.address} onChange={e=>setContactForm({...contactForm,address:e.target.value})}/></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Payment Details</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>Where should rent share/payments be sent?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Bank Name</label><input style={inp} value={contactForm.bank_name} onChange={e=>setContactForm({...contactForm,bank_name:e.target.value})}/></div>
              <div><label style={lbl}>Account Name</label><input style={inp} value={contactForm.account_name} onChange={e=>setContactForm({...contactForm,account_name:e.target.value})}/></div>
              <div><label style={lbl}>Account Number</label><input style={inp} value={contactForm.account_number} onChange={e=>setContactForm({...contactForm,account_number:e.target.value})}/></div>
              <div><label style={lbl}>Sort Code</label><input style={inp} value={contactForm.sort_code} onChange={e=>setContactForm({...contactForm,sort_code:e.target.value})}/></div>
              <div><label style={lbl}>Routing Number (if applicable)</label><input style={inp} value={contactForm.routing_number} onChange={e=>setContactForm({...contactForm,routing_number:e.target.value})}/></div>
            </div>
            <button onClick={saveContact} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving?0.6:1 }}>{saving?'Saving…':'Save Changes'}</button>
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
