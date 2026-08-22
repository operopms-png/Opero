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
  const [payingId, setPayingId] = useState<string | null>(null)
  const [showMakePayment, setShowMakePayment] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payCategory, setPayCategory] = useState('Rent')
  const [makingPayment, setMakingPayment] = useState(false)

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showRenewalForm, setShowRenewalForm] = useState(false)
  const [renewalChoice, setRenewalChoice] = useState('renewal_requested')
  const [renewalNotes, setRenewalNotes] = useState('')
  const [submittingRenewal, setSubmittingRenewal] = useState(false)
  const [profileForm, setProfileForm] = useState({ phone: '', email: '', emergency_contact_name: '', emergency_contact_phone: '', notify_email: true, notify_sms: false })
  const [savingProfile, setSavingProfile] = useState(false)

  async function payNow(paymentId: string) {
    setPayingId(paymentId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pay-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error(`Server returned an unexpected response (status ${res.status}).`) }
      if (!res.ok) throw new Error(data.error || 'Could not start payment.')
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message || 'Could not start payment.')
    } finally {
      setPayingId(null)
    }
  }

  async function makePayment() {
    if (!payAmount || parseFloat(payAmount) <= 0) return
    setMakingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pay-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ amount: payAmount, category: payCategory }),
      })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error(`Server returned an unexpected response (status ${res.status}).`) }
      if (!res.ok) throw new Error(data.error || 'Could not start payment.')
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message || 'Could not start payment.')
    } finally {
      setMakingPayment(false)
    }
  }

  async function loadAll(t: any) {
    const [{ data: leases }, { data: pays }, { data: maint }, { data: msgs }, { data: docs }, { data: ann }] = await Promise.all([
      supabase.from('pm_leases').select('*').eq('tenant_id', t.id).order('start_date', { ascending: false }).limit(1),
      supabase.from('pm_rent_payments').select('*').eq('tenant_id', t.id).order('due_date', { ascending: false }),
      supabase.from('pm_maintenance').select('*').eq('property_id', t.property_id).order('created_at', { ascending: false }),
      supabase.from('pm_tenant_messages').select('*').eq('tenant_id', t.id).order('created_at', { ascending: true }),
      supabase.from('pm_documents').select('*').eq('tenant_id', t.id).order('created_at', { ascending: false }),
      supabase.from('system_messages').select('*').eq('published', true).order('created_at', { ascending: false }).limit(10),
    ])
    setLease(leases?.[0] ?? null)
    setPayments(pays ?? [])
    setMaintenance(maint ?? [])
    setMessages(msgs ?? [])
    setDocuments(docs ?? [])
    setAnnouncements(ann ?? [])
    setProfileForm({
      phone: t.phone ?? '',
      email: t.email ?? '',
      emergency_contact_name: t.emergency_contact_name ?? '',
      emergency_contact_phone: t.emergency_contact_phone ?? '',
      notify_email: t.notify_email ?? true,
      notify_sms: t.notify_sms ?? false,
    })

    if (t.property_id) {
      const { data: prop } = await supabase.from('pm_properties').select('*').eq('id', t.property_id).single()
      setProperty(prop)
    }
    if (t.unit_id) {
      const { data: u } = await supabase.from('pm_units').select('*').eq('id', t.unit_id).single()
      setUnit(u)
    }
  }

  async function sendTenantMessage() {
    if (!newMessage.trim() || !tenant?.id) return
    setSendingMessage(true)
    const { error } = await supabase.from('pm_tenant_messages').insert({
      tenant_id: tenant.id,
      sender: 'tenant',
      message: newMessage.trim(),
    })
    setSendingMessage(false)
    if (error) { alert(error.message); return }
    setNewMessage('')
    const { data: msgs } = await supabase.from('pm_tenant_messages').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: true })
    setMessages(msgs ?? [])
  }

  async function submitRenewalRequest() {
    if (!lease?.id) return
    setSubmittingRenewal(true)
    const { error } = await supabase.from('pm_leases').update({
      renewal_status: renewalChoice,
      renewal_notes: renewalNotes.trim() || null,
      renewal_requested_at: new Date().toISOString(),
    }).eq('id', lease.id)
    setSubmittingRenewal(false)
    if (error) { alert(error.message); return }
    setShowRenewalForm(false)
    setRenewalNotes('')
    await loadAll(tenant)
  }

  async function saveProfile() {
    if (!tenant?.id) return
    setSavingProfile(true)
    const { error } = await supabase.from('pm_tenants').update(profileForm).eq('id', tenant.id)
    setSavingProfile(false)
    if (error) { alert(error.message); return }
    setTenant({ ...tenant, ...profileForm })
    alert('Profile updated.')
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
        {['My Lease', 'Payments', 'Maintenance', 'Documents', 'Messages', 'Announcements', 'Renewal', 'Amenities', 'Profile'].map(s => (
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
          <div>
            <button onClick={() => setShowMakePayment(true)} style={{ marginBottom: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Make a Payment</button>

            {showMakePayment && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 20, maxWidth: 400 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 14 }}>Make a payment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={lbl}>What's this for?</label>
                    <select style={inp} value={payCategory} onChange={e => setPayCategory(e.target.value)}>
                      <option value="Rent">Rent</option><option value="Utilities">Utilities</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div><label style={lbl}>Amount (£) *</label><input type="number" style={inp} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 950" /></div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setShowMakePayment(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={makePayment} disabled={makingPayment || !payAmount || parseFloat(payAmount) <= 0} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: makingPayment || !payAmount || parseFloat(payAmount) <= 0 ? 0.6 : 1 }}>{makingPayment ? 'Redirecting…' : 'Continue to Payment'}</button>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 100px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
              <span>Type</span><span>Amount</span><span>Due Date</span><span>Method</span><span>Status</span><span></span>
            </div>
            {payments.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>No payment history yet</div> :
            payments.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 100px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, color: '#344054', alignItems: 'center' }}>
                <span>{p.category ?? 'Rent'}</span>
                <span>£{(p.amount ?? 0).toLocaleString()}</span>
                <span>{p.due_date ?? '—'}</span>
                <span style={{ textTransform: 'capitalize' }}>{(p.method ?? '').replace('_', ' ')}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: p.status === 'paid' ? '#D1FAE5' : p.status === 'overdue' ? '#FEE2E2' : '#FEF3C7', color: p.status === 'paid' ? '#059669' : p.status === 'overdue' ? '#DC2626' : '#D97706', width: 'fit-content' }}>{p.status}</span>
                {p.status !== 'paid' && (
                  <button onClick={() => payNow(p.id)} disabled={payingId === p.id} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: ACCENT, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', opacity: payingId === p.id ? 0.6 : 1 }}>{payingId === p.id ? 'Redirecting…' : 'Pay Now'}</button>
                )}
              </div>
            ))}
            </div>
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

        {tab === 'Documents' && (
          <div>
            {documents.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>No documents shared yet</div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map(d => (
                <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#101828' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{d.category}{d.expiry_date ? ` · Expires ${d.expiry_date}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>View →</span>
                </a>
              ))}
            </div>}
          </div>
        )}

        {tab === 'Messages' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 16, marginBottom: 12, maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#98A2B3', fontSize: 13 }}>No messages yet — say hello to your property manager</div> :
              messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.sender === 'tenant' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={{ background: m.sender === 'tenant' ? ACCENT : '#F2F4F7', color: m.sender === 'tenant' ? '#fff' : '#101828', borderRadius: 12, padding: '8px 12px', fontSize: 13 }}>{m.message}</div>
                  <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 2, textAlign: m.sender === 'tenant' ? 'right' : 'left' }}>{m.sender === 'tenant' ? 'You' : 'Property Manager'}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message…" onKeyDown={e => e.key === 'Enter' && sendTenantMessage()} />
              <button onClick={sendTenantMessage} disabled={sendingMessage || !newMessage.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: sendingMessage || !newMessage.trim() ? 0.6 : 1 }}>Send</button>
            </div>
          </div>
        )}

        {tab === 'Announcements' && (
          <div>
            {announcements.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>No announcements right now</div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {announcements.map((a: any) => (
                <div key={a.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#101828', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#667085' }}>{a.body}</div>
                  <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 6 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>}
          </div>
        )}

        {tab === 'Renewal' && (
          <div>
            {lease?.renewal_status && lease.renewal_status !== 'none' ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, maxWidth: 460 }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', marginBottom: 6 }}>Request status</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', textTransform: 'capitalize', marginBottom: 8 }}>{lease.renewal_status.replace(/_/g, ' ')}</div>
                {lease.renewal_notes && <div style={{ fontSize: 13, color: '#667085' }}>{lease.renewal_notes}</div>}
              </div>
            ) : !showRenewalForm ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setRenewalChoice('renewal_requested'); setShowRenewalForm(true) }} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>I'd like to renew</button>
                <button onClick={() => { setRenewalChoice('move_out_requested'); setShowRenewalForm(true) }} style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>I'm planning to move out</button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, maxWidth: 460 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 14 }}>{renewalChoice === 'renewal_requested' ? 'Request a renewal' : 'Give notice to move out'}</div>
                <label style={lbl}>Anything we should know? (optional)</label>
                <textarea style={{ ...inp, resize: 'vertical' } as React.CSSProperties} rows={3} value={renewalNotes} onChange={e => setRenewalNotes(e.target.value)} placeholder={renewalChoice === 'renewal_requested' ? 'e.g. preferred new term length' : 'e.g. planned move-out date'} />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setShowRenewalForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={submitRenewalRequest} disabled={submittingRenewal} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: submittingRenewal ? 0.6 : 1 }}>{submittingRenewal ? 'Submitting…' : 'Submit Request'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Amenities' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
              <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>WiFi Network</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginTop: 4 }}>{property?.wifi_ssid ?? '—'}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16 }}>
              <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>WiFi Password</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginTop: 4 }}>{property?.wifi_password ?? '—'}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Bin Collection</div>
              <div style={{ fontSize: 13, color: '#344054', marginTop: 4 }}>{property?.bin_collection_notes ?? 'Not set yet — check with your property manager.'}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: 16, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>Parking</div>
              <div style={{ fontSize: 13, color: '#344054', marginTop: 4 }}>{property?.parking_notes ?? 'Not set yet — check with your property manager.'}</div>
            </div>
            {property?.house_rules_url && (
              <a href={property.house_rules_url} target="_blank" rel="noreferrer" style={{ gridColumn: '1 / -1', display: 'inline-block', padding: '9px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, fontWeight: 500, color: '#344054', textDecoration: 'none', width: 'fit-content' }}>View House Rules PDF</a>
            )}
          </div>
        )}

        {tab === 'Profile' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, maxWidth: 460 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Phone</label><input style={inp} value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
              <div><label style={lbl}>Email</label><input style={inp} value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
              <div><label style={lbl}>Emergency Contact Name</label><input style={inp} value={profileForm.emergency_contact_name} onChange={e => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })} /></div>
              <div><label style={lbl}>Emergency Contact Phone</label><input style={inp} value={profileForm.emergency_contact_phone} onChange={e => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#344054' }}>
                <input type="checkbox" checked={profileForm.notify_email} onChange={e => setProfileForm({ ...profileForm, notify_email: e.target.checked })} /> Email notifications
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#344054' }}>
                <input type="checkbox" checked={profileForm.notify_sms} onChange={e => setProfileForm({ ...profileForm, notify_sms: e.target.checked })} /> SMS notifications
              </label>
            </div>
            <button onClick={saveProfile} disabled={savingProfile} style={{ marginTop: 18, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: savingProfile ? 0.6 : 1 }}>{savingProfile ? 'Saving…' : 'Save Profile'}</button>
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
