'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ACCENT = '#5B7CFA'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

async function uploadAttachment(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}

function PMTenantPortalInner() {
  const searchParams = useSearchParams()
  const viewingTenantId = searchParams.get('tenant_id')
  const [loading, setLoading] = useState(true)
  const [isStaffView, setIsStaffView] = useState(false)
  const [tab, setTab] = useState('My Lease')
  const [tenant, setTenant] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
  const [lease, setLease] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'medium', photo: '' })
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function loadAll(t: any) {
    const [{ data: leases }, { data: pays }, { data: maint }] = await Promise.all([
      supabase.from('pm_leases').select('*').eq('tenant_id', t.id).order('start_date', { ascending: false }).limit(1),
      supabase.from('pm_rent_payments').select('*').eq('tenant_id', t.id).order('due_date', { ascending: false }),
      supabase.from('pm_maintenance').select('*').eq('property_id', t.property_id).order('created_at', { ascending: false }),
    ])
    setLease(leases?.[0] ?? null)
    setPayments(pays ?? [])
    setMaintenance(maint ?? [])

    if (t.property_id) {
      const { data: prop } = await supabase.from('pm_properties').select('*').eq('id', t.property_id).single()
      setProperty(prop)
    }
    if (t.unit_id) {
      const { data: u } = await supabase.from('pm_units').select('*').eq('id', t.unit_id).single()
      setUnit(u)
    }
  }

  async function submitTicket() {
    if (!ticketForm.title.trim() || !tenant?.property_id) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('pm_maintenance').insert({
      title: ticketForm.title,
      description: ticketForm.description,
      priority: ticketForm.priority,
      property_id: tenant.property_id,
      user_id: property?.user_id,
      status: 'open',
      photos: ticketForm.photo ? [ticketForm.photo] : [],
    })
    setSubmitting(false)
    if (error) { alert(error.message); return }
    setShowNewTicket(false)
    setTicketForm({ title: '', description: '', priority: 'medium', photo: '' })
    await loadAll(tenant)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      let t: any = null
      if (viewingTenantId) {
        // Staff previewing a specific tenant's portal
        const { data } = await supabase.from('pm_tenants').select('*').eq('id', viewingTenantId).single()
        t = data
        setIsStaffView(true)
      } else {
        const { data } = await supabase.from('pm_tenants').select('*').eq('portal_user_id', user.id).single()
        t = data
      }
      if (!t) { window.location.href = '/login'; return }
      setTenant(t)
      await loadAll(t)
      setLoading(false)
    })
  }, [viewingTenantId])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: ACCENT, color: '#fff', padding: '20px 28px' }}>
        {isStaffView && <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '2px 10px', borderRadius: 20, marginBottom: 8 }}>Staff preview</div>}
        <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant Portal</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome, {tenant?.name?.split(' ')[0] ?? 'there'}</div>
      </div>

      <div style={{ display: 'flex', gap: 0, padding: '0 28px', background: '#fff', borderBottom: '1px solid #E4E7EC' }}>
        {['My Lease', 'Payments', 'Maintenance'].map(s => (
          <button key={s} onClick={() => setTab(s)} style={{ padding: '12px 16px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === s ? 600 : 400, color: tab === s ? ACCENT : '#667085', borderBottom: tab === s ? '2px solid ' + ACCENT : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 700 }}>
        {tab === 'My Lease' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Property</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginTop: 4 }}>{property?.name ?? '—'}{unit?.unit_number ? `, Unit ${unit.unit_number}` : ''}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>{[property?.address, property?.city].filter(Boolean).join(', ')}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Monthly Rent</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', marginTop: 4 }}>£{(lease?.monthly_rent ?? 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Lease Start</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginTop: 4 }}>{lease?.start_date ?? '—'}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Lease End</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginTop: 4 }}>{lease?.end_date ?? '—'}</div>
              </div>
            </div>
            {lease?.document_url && (
              <a href={lease.document_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '9px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, fontWeight: 500, color: '#344054', textDecoration: 'none' }}>View Lease Document</a>
            )}
            {!lease && <div style={{ color: '#98A2B3', fontSize: 13 }}>No lease on file yet.</div>}
          </div>
        )}

        {tab === 'Payments' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
              <span>Amount</span><span>Due Date</span><span>Method</span><span>Status</span>
            </div>
            {payments.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>No payment history yet</div> :
            payments.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, color: '#344054', alignItems: 'center' }}>
                <span>£{(p.amount ?? 0).toLocaleString()}</span>
                <span>{p.due_date ?? '—'}</span>
                <span style={{ textTransform: 'capitalize' }}>{(p.method ?? '').replace('_', ' ')}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: p.status === 'paid' ? '#D1FAE5' : p.status === 'overdue' ? '#FEE2E2' : '#FEF3C7', color: p.status === 'paid' ? '#059669' : p.status === 'overdue' ? '#DC2626' : '#D97706', width: 'fit-content' }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Maintenance' && (
          <div>
            <button onClick={() => setShowNewTicket(true)} style={{ marginBottom: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Submit Maintenance Request</button>

            {showNewTicket && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={lbl}>What's wrong? *</label><input style={inp} value={ticketForm.title} onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })} placeholder="e.g. Boiler not working" /></div>
                  <div><label style={lbl}>Details</label><textarea style={{ ...inp, resize: 'vertical' } as React.CSSProperties} rows={3} value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} /></div>
                  <div><label style={lbl}>Urgency</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={ticketForm.priority} onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}>
                      <option value="low">Low — no rush</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent — needs attention today</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Photo (optional)</label>
                    {ticketForm.photo && <img src={ticketForm.photo} alt="" style={{ height: 70, width: 70, objectFit: 'cover', borderRadius: 6, display: 'block', marginBottom: 8 }} />}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px dashed #D0D5DD', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#667085' }}>
                      {uploadingPhoto ? 'Uploading…' : '📎 Add photo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingPhoto(true)
                        const url = await uploadAttachment(file, 'tenant-maintenance')
                        if (url) setTicketForm(prev => ({ ...prev, photo: url }))
                        setUploadingPhoto(false)
                        e.target.value = ''
                      }} />
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setShowNewTicket(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={submitTicket} disabled={submitting || !ticketForm.title.trim()} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: submitting || !ticketForm.title.trim() ? 0.6 : 1 }}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {maintenance.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>No maintenance requests yet</div> :
              maintenance.map(m => (
                <div key={m.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#101828' }}>{m.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: m.status === 'open' ? '#DBEAFE' : m.status === 'resolved' ? '#D1FAE5' : '#FEF3C7', color: m.status === 'open' ? '#2563EB' : m.status === 'resolved' ? '#059669' : '#D97706', textTransform: 'capitalize' }}>{m.status}</span>
                  </div>
                  {m.description && <div style={{ fontSize: 12, color: '#667085' }}>{m.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PMTenantPortal() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>}>
      <PMTenantPortalInner />
    </Suspense>
  )
}
