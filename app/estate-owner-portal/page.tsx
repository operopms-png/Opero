'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// Mirrors app/pm-owner-portal closely -- same layout, same staff-preview
// pattern via ?landlord_id=. Messages and a payments/statements ledger
// (pm_landlord_messages / pm_landlord_payments equivalents) aren't built
// for Estate Agency yet -- this covers Dashboard, Properties, Tenancies,
// Documents, and Contact & Payment, which is everything estate_landlords/
// estate_properties/estate_tenancies/estate_documents already support.

const ACCENT = '#5B7CFA'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

function EstateOwnerPortalInner() {
  const searchParams = useSearchParams()
  const viewingLandlordId = searchParams.get('landlord_id')
  const [loading, setLoading] = useState(true)
  const [isStaffView, setIsStaffView] = useState(false)
  const [tab, setTab] = useState('Dashboard')
  const [landlord, setLandlord] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [tenancies, setTenancies] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState<any>({})

  async function loadAll(ll: any) {
    const { data: props } = await supabase.from('estate_properties').select('*').eq('owner_id', ll.id)
    const propIds = (props ?? []).map((p: any) => p.id)
    const safeIds = propIds.length ? propIds : ['00000000-0000-0000-0000-000000000000']
    const [{ data: tens }, { data: docs }] = await Promise.all([
      supabase.from('estate_tenancies').select('*, estate_properties(name), estate_tenants(name)').in('property_id', safeIds).order('start_date', { ascending: false }),
      supabase.from('estate_documents').select('*').in('property_id', safeIds).order('expiry_date', { ascending: true }),
    ])
    setProperties(props ?? [])
    setTenancies(tens ?? [])
    setDocuments(docs ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      let ll: any = null
      if (viewingLandlordId) {
        // Staff previewing a specific landlord's portal -- works because
        // staff already has full read/write access to their own
        // business's data via the existing business-owner RLS policies.
        const { data } = await supabase.from('estate_landlords').select('*').eq('id', viewingLandlordId).single()
        ll = data
        setIsStaffView(true)
      } else {
        const { data } = await supabase.from('estate_landlords').select('*').eq('portal_user_id', user.id).single()
        ll = data
      }
      if (!ll) { window.location.href = '/login'; return }
      setLandlord(ll)
      setContactForm({ email: ll.email ?? '', phone: ll.phone ?? '', bank_name: ll.bank_name ?? '', account_name: ll.account_name ?? '', account_number: ll.account_number ?? '', sort_code: ll.sort_code ?? '', notes: ll.notes ?? '' })
      await loadAll(ll)
      setLoading(false)
    })
  }, [viewingLandlordId])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  async function saveContact() {
    setSaving(true)
    const { error } = await supabase.from('estate_landlords').update(contactForm).eq('id', landlord.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setLandlord({ ...landlord, ...contactForm })
    alert('Saved!')
  }

  const today = new Date().toISOString().slice(0,10)
  const activeTenancies = tenancies.filter(t => t.status === 'Active')
  const monthlyRentTotal = activeTenancies.reduce((s, t) => s + (parseFloat(t.rent) || 0), 0)
  const expiringDocs = documents.filter(d => d.expiry_date && d.expiry_date < today).length

  const TABS = ['Dashboard', 'Properties', 'Tenancies', 'Documents', 'Contact & Payment']

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      {isStaffView && (
        <div style={{ background: '#EEF1FF', borderBottom: '1px solid #C7D2FE', padding: '8px 28px', fontSize: 13, color: '#3B4AFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👁️ Viewing as {landlord.name} — you can view everything here as staff</span>
          <a href="/estate?tab=Landlords" style={{ color: '#3B4AFF', fontWeight: 600, textDecoration: 'none' }}>Exit preview</a>
        </div>
      )}
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estate Agency — Owner Portal</div>
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
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{activeTenancies.length}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Active Tenancies</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#101828' }}>£{monthlyRentTotal.toLocaleString()}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Monthly Rent (active)</div></div>
          <div style={{ background: '#fff', borderRadius: 12, border: expiringDocs ? '1px solid #FEE2E2' : '1px solid #E4E7EC', padding: 20, textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: expiringDocs ? '#EF4444' : '#101828' }}>{expiringDocs}</div><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Documents Expired</div></div>
        </div>

        {tab === 'Dashboard' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 16 }}>Recent Tenancies</div>
            {tenancies.length === 0 ? <div style={{ color: '#98A2B3', fontSize: 13, textAlign: 'center', padding: 30 }}>No tenancies yet.</div> : tenancies.slice(0, 6).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F2F4F7' }}>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{t.estate_properties?.name ?? '—'} · {t.estate_tenants?.name ?? '—'}</div><div style={{ fontSize: 11, color: '#98A2B3' }}>{t.start_date ?? '—'} → {t.end_date ?? '—'}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>£{parseFloat(t.rent||0).toLocaleString()}/mo</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: t.status==='Active'?'#D1FAE5':'#F3F4F6', color: t.status==='Active'?'#059669':'#6B7280' }}>{t.status}</span>
                </div>
              </div>
            ))}
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

        {tab === 'Tenancies' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px 90px 90px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
              <span>Property</span><span>Tenant</span><span>Start</span><span>End</span><span>Rent</span><span>Status</span>
            </div>
            {tenancies.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>No tenancies yet.</div> : tenancies.map(t => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px 90px 90px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{t.estate_properties?.name ?? '—'}</span>
                <span style={{ fontSize: 13, color: '#344054' }}>{t.estate_tenants?.name ?? '—'}</span>
                <span style={{ fontSize: 12, color: '#667085' }}>{t.start_date ?? '—'}</span>
                <span style={{ fontSize: 12, color: '#667085' }}>{t.end_date ?? '—'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>{t.rent ? '£'+t.rent : '—'}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: t.status==='Active'?'#ECFDF5':'#FEE2E2', color: t.status==='Active'?'#10B981':'#EF4444', display: 'inline-block' }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Documents' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
              <span>Name</span><span>Category</span><span>Expiry</span>
            </div>
            {documents.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3' }}>No documents yet.</div> : documents.map(d => (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: '#101828', textDecoration: 'none' }}>{d.name}</a> : d.name}</span>
                <span style={{ fontSize: 13, color: '#667085' }}>{d.category}</span>
                <span style={{ fontSize: 13, color: d.expiry_date && d.expiry_date < today ? '#EF4444' : '#344054' }}>{d.expiry_date ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Contact & Payment' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Contact Details</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>{isStaffView ? "You're editing this on the landlord's behalf." : 'Keep this up to date so we can reach you.'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Email</label><input style={inp} value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})}/></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})}/></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Notes</label><input style={inp} value={contactForm.notes} onChange={e=>setContactForm({...contactForm,notes:e.target.value})}/></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Payment Details</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>Where should rent/payments be sent?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>Bank Name</label><input style={inp} value={contactForm.bank_name} onChange={e=>setContactForm({...contactForm,bank_name:e.target.value})}/></div>
              <div><label style={lbl}>Account Name</label><input style={inp} value={contactForm.account_name} onChange={e=>setContactForm({...contactForm,account_name:e.target.value})}/></div>
              <div><label style={lbl}>Account Number</label><input style={inp} value={contactForm.account_number} onChange={e=>setContactForm({...contactForm,account_number:e.target.value})}/></div>
              <div><label style={lbl}>Sort Code</label><input style={inp} value={contactForm.sort_code} onChange={e=>setContactForm({...contactForm,sort_code:e.target.value})}/></div>
            </div>
            <button onClick={saveContact} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving?0.6:1 }}>{saving?'Saving…':'Save Changes'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EstateOwnerPortal() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>}>
      <EstateOwnerPortalInner />
    </Suspense>
  )
}
