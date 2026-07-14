'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

const MGMT_FEE = 0.40 // Sangsters takes 40%, owner gets 60%

const NAV = [
  { section: 'OVERVIEW', items: ['Dashboard', 'My Bookings', 'Calendar'] },
  { section: 'REPORTS', items: ['Maintenance', 'Statements', 'ROI Per Owner', 'My Properties', 'Finance & Documents'] },
  { section: 'COMMUNICATION', items: ['Messages', 'Contact & Payment'] },
]

const STAFF_NAV = [
  { section: 'STAFF ONLY', items: ['Staff Panel', 'Manage Owners'] }
]

function StatCard({ label, value, sub, dark }: any) {
  return (
    <div style={{ background: dark ? '#101828' : '#fff', border: `1px solid ${dark ? '#101828' : '#E4E7EC'}`, borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: dark ? '#6B7280' : '#667085', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: dark ? '#fff' : '#101828' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: dark ? '#6B7280' : '#98A2B3', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    confirmed: ['#D1FAE5', '#059669'], cancelled: ['#FEE2E2', '#DC2626'],
    pending: ['#FEF3C7', '#D97706'], resolved: ['#D1FAE5', '#059669'],
    open: ['#FEF3C7', '#92400E'], paid: ['#D1FAE5', '#059669'],
    active: ['#D1FAE5', '#059669'], draft: ['#F3F4F6', '#6B7280'],
  }
  const [bg, color] = colors[status?.toLowerCase()] ?? ['#F3F4F6', '#6B7280']
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: bg, color }}>{status}</span>
}

export default function OwnerPortalPage() {
  const [tab, setTab] = useState('Dashboard')
  const [user, setUser] = useState<any>(null)
  const [ownerProfile, setOwnerProfile] = useState<any>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [financeRecords, setFinanceRecords] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [allOwners, setAllOwners] = useState<any[]>([])
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calMonth, setCalMonth] = useState(new Date())
  const [newMsg, setNewMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Admin edit state
  const [editingOwner, setEditingOwner] = useState<any>(null)
  const [editOwnerForm, setEditOwnerForm] = useState<any>({})
  const [addPaymentOwner, setAddPaymentOwner] = useState<any>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', description: '', property_name: '', period_start: '', period_end: '', status: 'paid' })
  const [addFinanceOwner, setAddFinanceOwner] = useState<any>(null)
  const [financeForm, setFinanceForm] = useState({ amount: '', description: '', category: '', type: 'expense' })
  const [contactForm, setContactForm] = useState<any>({})
  const [bankingForm, setBankingForm] = useState<any>({})

  // Staff "view as owner" state — lets admin browse/edit a specific owner's tabs
  const [viewingOwner, setViewingOwner] = useState<any>(null)
  const [editingProperty, setEditingProperty] = useState<any>(null)
  const [editPropertyForm, setEditPropertyForm] = useState<any>({})
  const [addingBooking, setAddingBooking] = useState(false)
  const [newBookingForm, setNewBookingForm] = useState<any>({ property_id: '', guest_name: '', guest_email: '', check_in: '', check_out: '', total_amount: '', platform: '', status: 'confirmed' })

  // Manage owners form
  const [ownerForm, setOwnerForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      // Check owner profile
      const { data: profile } = await supabase.from('owner_profiles').select('*').eq('user_id', user.id).single()
      if (profile) {
        setOwnerProfile(profile)
        setIsStaff(false)
        await loadOwnerData(profile)
      } else {
        // Staff/admin — can see all owners
        setIsStaff(true)
        await loadStaffData(user.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function loadOwnerData(profile: any) {
    const ids: string[] = profile.property_ids ?? []
    const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
    const [p, b, t, s, f, m, c] = await Promise.all([
      supabase.from('properties').select('*').in('id', safeIds),
      supabase.from('bookings').select('*, properties(name)').in('property_id', safeIds).order('check_in', { ascending: false }),
      supabase.from('maintenance_tickets').select('*, properties(name)').in('property_id', safeIds).order('created_at', { ascending: false }),
      supabase.from('owner_statements').select('*').eq('owner_id', profile.id).order('period_start', { ascending: false }),
      supabase.from('owner_finance').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('owner_messages').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('owner_contact').select('*').eq('owner_id', profile.id).single(),
    ])
    setProperties(p.data ?? [])
    setBookings(b.data ?? [])
    setTickets(t.data ?? [])
    setStatements(s.data ?? [])
    setFinanceRecords(f.data ?? [])
    setMessages(m.data ?? [])
    setContactInfo(c.data ?? null)
  }

  async function loadStaffData(userId: string) {
    const [owners] = await Promise.all([
      supabase.from('owner_profiles').select('*, owner_contact(*), owner_finance(*), properties:property_ids').order('created_at', { ascending: false }),
    ])
    setAllOwners(owners.data ?? [])
    // properties has a user_id column, but bookings/maintenance_tickets don't —
    // they only relate to the business via property_id, so fetch properties
    // first and filter the rest by that.
    const { data: props } = await supabase.from('properties').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    const ids = (props ?? []).map(p => p.id)
    const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
    const [b, t] = await Promise.all([
      supabase.from('bookings').select('*, properties(name)').in('property_id', safeIds).order('check_in', { ascending: false }),
      supabase.from('maintenance_tickets').select('*, properties(name)').in('property_id', safeIds).order('created_at', { ascending: false }),
    ])
    setProperties(props ?? [])
    setBookings(b.data ?? [])
    setTickets(t.data ?? [])
  }

  // Staff clicks "View Portal" on an owner — loads that owner's data into the
  // shared state so the normal tabs (Bookings, Statements, Properties, etc.)
  // show and edit THEIR data, while isStaff stays true so edit controls remain visible.
  async function viewOwnerPortal(owner: any) {
    setLoading(true)
    setOwnerProfile(owner)
    setViewingOwner(owner)
    await loadOwnerData(owner)
    setTab('Dashboard')
    setLoading(false)
  }

  async function exitOwnerView() {
    setLoading(true)
    setViewingOwner(null)
    setOwnerProfile(null)
    await loadStaffData(user.id)
    setTab('Manage Owners')
    setLoading(false)
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    setSaving(true)
    const res = await fetch('/api/admin/update-booking-status', {
      method: 'PATCH',
      headers: await authHeader(),
      body: JSON.stringify({ booking_id: bookingId, status }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not update booking status'); setSaving(false); return }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    setSaving(false)
  }

  async function addBooking() {
    if (!newBookingForm.property_id || !newBookingForm.check_in || !newBookingForm.check_out) {
      alert('Property, check-in and check-out are required'); return
    }
    setSaving(true)
    const res = await fetch('/api/admin/add-booking', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify(newBookingForm),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not add booking'); setSaving(false); return }
    setAddingBooking(false)
    setNewBookingForm({ property_id: '', guest_name: '', guest_email: '', check_in: '', check_out: '', total_amount: '', platform: '', status: 'confirmed' })
    if (viewingOwner) await loadOwnerData(viewingOwner)
    else await loadStaffData(user.id)
    setSaving(false)
  }

  async function savePropertyEdit() {
    if (!editingProperty) return
    setSaving(true)
    const res = await fetch('/api/admin/update-property', {
      method: 'PATCH',
      headers: await authHeader(),
      body: JSON.stringify({
        property_id: editingProperty.id,
        purchase_price: editPropertyForm.purchase_price,
        down_payment: editPropertyForm.down_payment,
        platform: editPropertyForm.platform,
        status: editPropertyForm.status,
        address: editPropertyForm.address,
      }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not save property changes'); setSaving(false); return }
    setProperties(prev => prev.map(p => p.id === editingProperty.id ? { ...p, ...editPropertyForm } : p))
    setEditingProperty(null)
    setSaving(false)
  }

  // Computed values
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0, 7)
  const activeBookings = bookings.filter(b => b.status !== 'cancelled')
  const monthBookings = activeBookings.filter(b => b.check_in?.startsWith(thisMonth))
  const totalRevenue = activeBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
  const monthRevenue = monthBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
  const ownerShare = totalRevenue * (1 - MGMT_FEE)
  const expenses = financeRecords.filter(f => f.amount < 0).reduce((s, f) => s + Math.abs(Number(f.amount) || 0), 0)
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const bookedNights = activeBookings.filter(b => b.check_out >= ninetyAgo).reduce((s, b) => {
    return s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000))
  }, 0)
  const occupancyPct = Math.min(100, Math.round((bookedNights / (90 * Math.max(1, properties.length))) * 100))
  const invested = ownerProfile?.invested ?? 0
  const netProfit = ownerShare - expenses
  const roi = invested > 0 ? ((netProfit / invested) * 100).toFixed(1) : '0.0'

  // Last 6 months of data for dashboard sparklines/charts
  const monthLabels: string[] = []
  const chartData: any[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    const label = d.toLocaleString('en-GB', { month: 'short' })
    monthLabels.push(key)
    const monthActiveBookings = activeBookings.filter(b => b.check_in?.startsWith(key))
    const monthCancelled = bookings.filter(b => b.status === 'cancelled' && b.check_in?.startsWith(key))
    const monthNights = monthActiveBookings.reduce((s, b) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    chartData.push({
      month: label,
      revenue: monthActiveBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0),
      bookings: monthActiveBookings.length,
      cancellations: monthCancelled.length,
      occupancy: Math.min(100, Math.round((monthNights / (daysInMonth * Math.max(1, properties.length))) * 100)),
    })
  }
  const platformBreakdown: Record<string, number> = {}
  activeBookings.forEach(b => { const p = b.platform ?? 'Direct'; platformBreakdown[p] = (platformBreakdown[p] ?? 0) + 1 })
  const platformColors: Record<string, string> = { Direct: '#10B981', Airbnb: '#FF5A5F', 'Booking.com': '#003580', Vrbo: '#3D67FF' }
  const platformPieData = Object.entries(platformBreakdown).map(([name, value]) => ({ name, value, color: platformColors[name] ?? '#98A2B3' }))
  const upcomingBookings = activeBookings.filter(b => b.check_in >= today).sort((a, b) => a.check_in < b.check_in ? -1 : 1).slice(0, 5)

  // Calendar helpers
  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }
  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }
  function isBooked(day: number) {
    const d = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return activeBookings.some(b => b.check_in <= d && b.check_out > d)
  }

  // Finance grouped by month
  const allFinance = [
    ...bookings.filter(b => b.status !== 'cancelled').map(b => ({ ...b, amount: Number(b.total_amount) || 0, type: 'booking', label: `${b.guest_name ?? 'Guest'} — booking revenue`, property: b.properties?.name })),
    ...financeRecords.map(f => ({ ...f, type: 'expense', label: f.description ?? f.category })),
  ].sort((a, b) => (b.created_at ?? b.check_in ?? '') > (a.created_at ?? a.check_in ?? '') ? 1 : -1)
  const recentFinance = allFinance.slice(0, 5)

  const financeByMonth: Record<string, any[]> = {}
  allFinance.forEach(r => {
    const m = (r.created_at ?? r.check_in ?? '').slice(0, 7)
    if (!financeByMonth[m]) financeByMonth[m] = []
    financeByMonth[m].push(r)
  })

  async function sendMessage() {
    if (!newMsg.trim() || !ownerProfile) return
    setSaving(true)
    await supabase.from('owner_messages').insert({ owner_id: ownerProfile.id, sender: 'owner', message: newMsg, created_at: new Date().toISOString() })
    setMessages(prev => [...prev, { owner_id: ownerProfile.id, sender: 'owner', message: newMsg, created_at: new Date().toISOString() }])
    setNewMsg('')
    setSaving(false)
  }

  async function createOwnerAccount() {
    if (ownerForm.password !== ownerForm.confirm_password) { alert('Passwords do not match'); return }
    if (ownerForm.password.length < 6) { alert('Password must be at least 6 characters'); return }
    setSaving(true)

    // Goes through a server API route (service role key) so creating an owner
    // never swaps out the admin's own browser session — client-side signUp()
    // would log the admin out and log them in as the owner just created.
    const res = await fetch('/api/create-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: ownerForm.first_name,
        last_name: ownerForm.last_name,
        email: ownerForm.email,
        phone: ownerForm.phone,
        password: ownerForm.password,
      }),
    })
    const result = await res.json()

    if (!res.ok) { alert(result.error || 'Could not create owner account'); setSaving(false); return }

    alert(`Owner account created for ${ownerForm.email}. They can log in immediately.`)
    setOwnerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' })
    await loadStaffData(user.id)
    setSaving(false)
  }

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
  }

  async function saveOwnerEdit() {
    if (!editingOwner) return
    setSaving(true)
    const res = await fetch('/api/admin/update-owner', {
      method: 'PATCH',
      headers: await authHeader(),
      body: JSON.stringify({
        owner_id: editingOwner.id,
        name: `${editOwnerForm.first_name ?? ''} ${editOwnerForm.last_name ?? ''}`.trim(),
        email: editOwnerForm.email,
        phone: editOwnerForm.phone,
        invested: editOwnerForm.invested,
        split_percentage: editOwnerForm.split_percentage,
        property_ids: editOwnerForm.property_ids,
      }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not save owner changes'); setSaving(false); return }
    setEditingOwner(null)
    await loadStaffData(user.id)
    setSaving(false)
  }

  async function deleteOwner(ownerId: string) {
    if (!confirm('Delete this owner account? This cannot be undone.')) return
    setSaving(true)
    const res = await fetch('/api/admin/delete-owner', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ owner_id: ownerId }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not delete owner'); setSaving(false); return }
    await loadStaffData(user.id)
    setSaving(false)
  }

  async function addPayment() {
    if (!addPaymentOwner || !paymentForm.amount) return
    setSaving(true)
    const res = await fetch('/api/admin/add-payment', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({
        owner_id: addPaymentOwner.id,
        property_name: paymentForm.property_name,
        period_start: paymentForm.period_start,
        period_end: paymentForm.period_end,
        amount: paymentForm.amount,
        description: paymentForm.description,
        status: paymentForm.status,
      }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not add payment'); setSaving(false); return }
    setAddPaymentOwner(null)
    setPaymentForm({ amount: '', description: '', property_name: '', period_start: '', period_end: '', status: 'paid' })
    if (viewingOwner && viewingOwner.id === addPaymentOwner.id) await loadOwnerData(viewingOwner)
    setSaving(false)
  }

  async function addFinanceRecord() {
    if (!addFinanceOwner || !financeForm.amount) return
    setSaving(true)
    const res = await fetch('/api/admin/add-finance', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({
        owner_id: addFinanceOwner.id,
        amount: financeForm.amount,
        description: financeForm.description,
        category: financeForm.category,
        type: financeForm.type,
      }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not add finance record'); setSaving(false); return }
    setAddFinanceOwner(null)
    setFinanceForm({ amount: '', description: '', category: '', type: 'expense' })
    if (viewingOwner && viewingOwner.id === addFinanceOwner.id) await loadOwnerData(viewingOwner)
    setSaving(false)
  }

  async function saveContactInfo() {
    if (!ownerProfile) return
    setSaving(true)
    await supabase.from('owner_profiles').update({
      name: `${contactForm.first_name ?? ''} ${contactForm.last_name ?? ''}`.trim(),
      email: contactForm.email,
      phone: contactForm.phone,
      address: contactForm.address,
    }).eq('id', ownerProfile.id)
    setSaving(false)
    alert('Saved!')
  }

  async function saveBankingInfo() {
    if (!ownerProfile) return
    setSaving(true)
    const existing = contactInfo?.id
    if (existing) {
      await supabase.from('owner_contact').update(bankingForm).eq('id', existing)
    } else {
      await supabase.from('owner_contact').insert({ ...bankingForm, owner_id: ownerProfile.id })
    }
    setSaving(false)
    alert('Banking info saved!')
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    await supabase.from('maintenance_tickets').update({ status }).eq('id', ticketId)
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 14 }}>Loading your portal…</div>

  const card = { background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, padding: '20px 24px' }
  const th = { textAlign: 'left' as const, padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const, borderBottom: '1px solid #EAECF0' }
  const td = { padding: '12px', borderBottom: '1px solid #F2F4F7', fontSize: 13 }

  const allTabs = [
    ...NAV.flatMap(n => n.items),
    ...(isStaff ? STAFF_NAV.flatMap(n => n.items) : [])
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid #EAECF0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #EAECF0', textAlign: 'center' }}>
          <img src="/logo.PNG" alt="Opero" width={44} height={44} style={{ borderRadius: 8, marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Opero</div>
          <div style={{ fontSize: 11, color: '#667085' }}>Owner Portal</div>
        </div>

        {/* User */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5B7CFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {(ownerProfile?.name ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#101828' }}>{ownerProfile?.name ?? user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 10, color: '#667085' }}>{isStaff ? 'Admin / Staff' : 'Owner'}</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '8px 0' }}>
          {[...NAV, ...(isStaff ? STAFF_NAV : [])].map(group => (
            <div key={group.section}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', padding: '12px 16px 4px', letterSpacing: '0.08em' }}>{group.section}</div>
              {group.items.map(item => (
                <button key={item} onClick={() => setTab(item)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 16px', fontSize: 12, fontWeight: tab === item ? 600 : 400, color: tab === item ? '#5B7CFA' : '#667085', background: tab === item ? '#EEF1FF' : 'transparent', border: 'none', cursor: 'pointer', borderLeft: tab === item ? '2px solid #5B7CFA' : '2px solid transparent' }}>
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #EAECF0' }}>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{ width: '100%', padding: '8px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 12, color: '#667085', cursor: 'pointer' }}>← Sign Out</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>

        {isStaff && viewingOwner && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EEF1FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
            <span>👁 Viewing as owner: <strong>{viewingOwner.name}</strong> — all edits save to their account</span>
            <button onClick={exitOwnerView} style={{ padding: '6px 14px', border: '1px solid #5B7CFA', borderRadius: 6, background: '#fff', color: '#5B7CFA', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Exit owner view</button>
          </div>
        )}

        {/* DASHBOARD */}
        {tab === 'Dashboard' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#101828', marginBottom: 20 }}>Command Centre 👋 <span style={{ float: 'right', fontSize: 12, color: '#98A2B3', fontWeight: 400 }}>Last 6 months</span></div>

            {/* Sparkline stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={card}>
                <div style={{ fontSize: 13, color: '#101828', marginBottom: 8 }}>💰 Revenue</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>£{totalRevenue.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>{bookedNights} Nights</div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={chartData}>
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B98122" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: '#101828', marginBottom: 8 }}>📅 Bookings</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{activeBookings.length}</div>
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>{bookedNights} Nights</div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={chartData}>
                    <Area type="monotone" dataKey="bookings" stroke="#5B7CFA" fill="#5B7CFA22" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: '#101828', marginBottom: 8 }}>❌ Cancellations</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{bookings.filter(b => b.status === 'cancelled').length}</div>
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>0 Nights</div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={chartData}>
                    <Area type="monotone" dataKey="cancellations" stroke="#EF4444" fill="#EF444422" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Occupancy gauge + full revenue/occupancy line chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', marginBottom: 12 }}>Occupancy</div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={[{ value: occupancyPct, fill: '#5B7CFA' }]} barSize={22}>
                    <RadialBar background dataKey="value" cornerRadius={11} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ textAlign: 'center', marginTop: -70, fontSize: 32, fontWeight: 800 }}>{occupancyPct}%</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', marginBottom: 12 }}>Occupancy & Revenue</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="occupancy" name="Occupancy" stroke="#5B7CFA" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut breakdowns by platform */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Revenues / Portal', data: platformPieData.map(p => ({ ...p, value: activeBookings.filter(b => (b.platform ?? 'Direct') === p.name).reduce((s, b) => s + (Number(b.total_amount) || 0), 0) })) },
                { label: 'Bookings', data: platformPieData },
                { label: 'Nights / Portal', data: platformPieData.map(p => ({ ...p, value: activeBookings.filter(b => (b.platform ?? 'Direct') === p.name).reduce((s, b) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0) })) },
                { label: 'Cancellations', data: bookings.some(b => b.status === 'cancelled') ? [{ name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: '#EF4444' }] : [{ name: 'None', value: 1, color: '#EAECF0' }] },
              ].map(donut => (
                <div key={donut.label} style={card}>
                  <div style={{ fontSize: 12, color: '#667085', textAlign: 'center', marginBottom: 8 }}>{donut.label}</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={donut.data.length ? donut.data : [{ name: 'None', value: 1, color: '#EAECF0' }]} dataKey="value" innerRadius={35} outerRadius={50} paddingAngle={2}>
                        {(donut.data.length ? donut.data : [{ color: '#EAECF0' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#667085' }}>
                    {donut.data.length ? donut.data.map(d => `● ${d.name} ${Math.round((d.value / Math.max(1, donut.data.reduce((s, x) => s + x.value, 0))) * 100)}%`).join('  ') : '0%'}
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming bookings + recent finance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: 12 }}>Upcoming Bookings</div>
                {upcomingBookings.length === 0
                  ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No upcoming bookings</div>
                  : upcomingBookings.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F4F7', fontSize: 13 }}>
                      <span>{b.guest_name ?? 'Guest'} — {b.properties?.name ?? ''}</span>
                      <span style={{ color: '#667085' }}>{b.check_in}</span>
                    </div>
                  ))}
              </div>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: 12 }}>Recent Finance</div>
                {recentFinance.length === 0
                  ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No finance activity yet</div>
                  : recentFinance.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F4F7', fontSize: 13 }}>
                      <span>{f.label}</span>
                      <span style={{ fontWeight: 700, color: (f.amount ?? 0) < 0 ? '#DC2626' : '#10B981' }}>{(f.amount ?? 0) < 0 ? '−' : '+'}£{Math.abs(Number(f.amount) || 0).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* MY BOOKINGS */}
        {tab === 'My Bookings' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>My Bookings</div>
              {!isStaff && <span style={{ fontSize: 12, color: '#667085' }}>👁 View only — contact your manager to make changes</span>}
              {isStaff && <button onClick={() => setAddingBooking(true)} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Booking</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="This Month" value={monthBookings.length} />
              <StatCard label="Confirmed" value={activeBookings.filter(b => b.status === 'confirmed').length} />
              <StatCard label="Pending" value={bookings.filter(b => b.status === 'pending').length} />
              <StatCard label="Revenue" value={`£${totalRevenue.toLocaleString()}`} dark />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Guest', 'Property', ...(isStaff && !viewingOwner ? ['Owner'] : []), 'Check-in', 'Check-out', 'Nights', 'Revenue', 'Platform', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.length === 0 ? <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#98A2B3', padding: 40 }}>No bookings yet</td></tr>
                  : bookings.map(b => {
                    const nights = b.check_in && b.check_out ? Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000) : 0
                    const bookingOwner = isStaff && !viewingOwner ? allOwners.find(o => (o.property_ids ?? []).includes(b.property_id)) : null
                    return (
                      <tr key={b.id}>
                        <td style={td}>{b.guest_name ?? '—'}</td>
                        <td style={{ ...td, color: '#667085' }}>{b.properties?.name ?? '—'}</td>
                        {isStaff && !viewingOwner && (
                          <td style={{ ...td, color: '#667085' }}>
                            <select
                              value={bookingOwner?.id ?? ''}
                              onChange={async e => {
                                const newOwnerId = e.target.value || null
                                setSaving(true)
                                const res = await fetch('/api/admin/assign-property', {
                                  method: 'POST', headers: await authHeader(),
                                  body: JSON.stringify({ property_id: b.property_id, owner_id: newOwnerId }),
                                })
                                const result = await res.json()
                                if (!res.ok) { alert(result.error || 'Could not assign owner'); setSaving(false); return }
                                await loadStaffData(user.id)
                                setSaving(false)
                              }}
                              style={{ padding: '4px 8px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                            >
                              <option value="">Unassigned</option>
                              {allOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </td>
                        )}
                        <td style={td}>{b.check_in ?? '—'}</td>
                        <td style={td}>{b.check_out ?? '—'}</td>
                        <td style={td}>{nights}</td>
                        <td style={{ ...td, fontWeight: 600, color: '#10B981' }}>£{(Number(b.total_amount) || 0).toLocaleString()}</td>
                        <td style={{ ...td, color: '#667085' }}>{b.platform ?? 'Direct'}</td>
                        <td style={td}>{isStaff
                          ? <select value={b.status ?? 'pending'} onChange={e => updateBookingStatus(b.id, e.target.value)} style={{ padding: '4px 8px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                              <option value="pending">pending</option>
                              <option value="confirmed">confirmed</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          : <Badge status={b.status ?? 'pending'} />
                        }</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* CALENDAR */}
        {tab === 'Calendar' && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Availability Calendar</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} style={{ padding: '6px 14px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} style={{ padding: '6px 14px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Next →</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#EF4444', borderRadius: 2, display: 'inline-block' }} /> Booked</span>
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#10B981', borderRadius: 2, display: 'inline-block' }} /> Available</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#667085', padding: '8px 0' }}>{d}</div>)}
              {Array.from({ length: getFirstDayOfMonth(calMonth) }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: getDaysInMonth(calMonth) }).map((_, i) => {
                const day = i + 1
                const booked = isBooked(day)
                return <div key={day} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 6, background: booked ? '#EF4444' : '#10B981', color: '#fff', fontSize: 13, fontWeight: 600 }}>{day}</div>
              })}
            </div>
          </div>
        )}

        {/* MAINTENANCE */}
        {tab === 'Maintenance' && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Maintenance</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Open" value={tickets.filter(t => t.status === 'open').length} />
              <StatCard label="In Progress" value={tickets.filter(t => t.status === 'in_progress').length} />
              <StatCard label="Resolved" value={tickets.filter(t => t.status === 'resolved').length} />
              <StatCard label="Total Cost" value={`£${tickets.reduce((s, t) => s + (Number(t.cost) || 0), 0).toLocaleString()}`} dark />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Property', 'Issue', 'Category', 'Priority', 'Status', 'Cost', 'Date'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {tickets.length === 0 ? <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#98A2B3', padding: 40 }}>No maintenance tickets</td></tr>
                  : tickets.map(t => (
                    <tr key={t.id}>
                      <td style={td}>{t.properties?.name ?? '—'}</td>
                      <td style={td}>{t.title ?? t.description ?? '—'}</td>
                      <td style={td}>{t.category ?? '—'}</td>
                      <td style={td}>{t.priority ? <Badge status={t.priority} /> : '—'}</td>
                      <td style={td}>{isStaff
                        ? <select value={t.status ?? 'open'} onChange={e => updateTicketStatus(t.id, e.target.value)} style={{ padding: '4px 8px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            <option value="open">open</option>
                            <option value="in_progress">in progress</option>
                            <option value="resolved">resolved</option>
                          </select>
                        : <Badge status={t.status ?? 'open'} />
                      }</td>
                      <td style={td}>{t.cost ? `£${t.cost}` : '—'}</td>
                      <td style={{ ...td, color: '#667085' }}>{t.created_at?.slice(0, 10) ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STATEMENTS */}
        {tab === 'Statements' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Statements</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isStaff && viewingOwner && <button onClick={() => setAddPaymentOwner(viewingOwner)} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Payment</button>}
                <button onClick={() => window.print()} style={{ padding: '6px 14px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>🖨 Print</button>
              </div>
            </div>
            {!isStaff && <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>👁 View only</div>}
            {statements.length === 0
              ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No statements yet. Your manager will generate these monthly.</div>
              : Object.entries(
                statements.reduce((acc: any, s: any) => {
                  const period = s.period_start?.slice(0, 7) ?? 'Unknown'
                  if (!acc[period]) acc[period] = []
                  acc[period].push(s)
                  return acc
                }, {})
              ).map(([period, stmts]: any) => (
                <div key={period} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #EAECF0' }}>
                    <span>{new Date(period + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                    <span style={{ color: '#10B981' }}>£{stmts.reduce((s: number, r: any) => s + (Number(r.owner_amount) || 0), 0).toLocaleString()}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>{['Owner', 'Date', 'Description', 'Property', 'Amount', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {stmts.map((s: any) => (
                        <tr key={s.id}>
                          <td style={td}>{ownerProfile?.name ?? '—'}</td>
                          <td style={td}>{s.period_start}</td>
                          <td style={td}>{s.notes ?? 'Monthly statement'}</td>
                          <td style={td}>{s.property_name ?? '—'}</td>
                          <td style={{ ...td, fontWeight: 600 }}>£{(Number(s.owner_amount) || 0).toLocaleString()}</td>
                          <td style={td}><Badge status={s.status ?? 'draft'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            }
          </div>
        )}

        {/* ROI PER OWNER */}
        {tab === 'ROI Per Owner' && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>ROI Per Owner</div>

            {isStaff && !viewingOwner ? (
              <div style={{ border: '1px solid #EAECF0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', background: '#F9FAFB', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                  <div style={{ padding: '10px 16px' }}>Owner</div>
                  <div style={{ padding: '10px 16px' }}>Invested</div>
                  <div style={{ padding: '10px 16px' }}>Revenue</div>
                  <div style={{ padding: '10px 16px' }}>Net Profit</div>
                  <div style={{ padding: '10px 16px' }}>ROI</div>
                  <div style={{ padding: '10px 16px' }}>Occupancy</div>
                </div>
                {allOwners.length === 0 && <div style={{ padding: 20, fontSize: 13, color: '#98A2B3' }}>No owners yet.</div>}
                {allOwners.map(o => {
                  const ids: string[] = o.property_ids ?? []
                  const ownerBookings = bookings.filter(b => b.status !== 'cancelled' && ids.includes(b.property_id))
                  const ownerRevenue = ownerBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
                  const ownerShareAmt = ownerRevenue * ((o.split_percentage ?? 60) / 100)
                  const ownerInvested = Number(o.invested) || 0
                  const ownerRoi = ownerInvested > 0 ? ((ownerShareAmt / ownerInvested) * 100).toFixed(1) : '0.0'
                  const ownerProps = properties.filter(p => ids.includes(p.id))
                  const ownerNights = ownerBookings.filter(b => b.check_out >= ninetyAgo).reduce((s, b) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
                  const ownerOccupancy = Math.min(100, Math.round((ownerNights / (90 * Math.max(1, ownerProps.length))) * 100))
                  return (
                    <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderTop: '1px solid #EAECF0', alignItems: 'center', fontSize: 13 }}>
                      <div style={{ padding: '12px 16px', fontWeight: 600 }}>{o.name}</div>
                      <div style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          defaultValue={ownerInvested}
                          onBlur={async e => {
                            const val = e.target.value
                            if (Number(val) === ownerInvested) return
                            setSaving(true)
                            const res = await fetch('/api/admin/update-owner', { method: 'PATCH', headers: await authHeader(), body: JSON.stringify({ owner_id: o.id, invested: val }) })
                            const result = await res.json()
                            if (!res.ok) { alert(result.error || 'Could not save'); setSaving(false); return }
                            await loadStaffData(user.id)
                            setSaving(false)
                          }}
                          style={{ width: 90, padding: '5px 8px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 13 }}
                        />
                      </div>
                      <div style={{ padding: '12px 16px' }}>£{ownerRevenue.toLocaleString()}</div>
                      <div style={{ padding: '12px 16px' }}>£{ownerShareAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div style={{ padding: '12px 16px', fontWeight: 700, color: '#5B7CFA' }}>{ownerRoi}%</div>
                      <div style={{ padding: '12px 16px' }}>{ownerOccupancy}%</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ border: '1px solid #EAECF0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5B7CFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                    {(ownerProfile?.name ?? 'O')[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ownerProfile?.name ?? user?.email}</div>
                    <div style={{ fontSize: 12, color: '#667085' }}>{properties[0]?.name ?? 'Properties'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[
                    { label: 'Invested', value: `£${Number(invested).toLocaleString()}` },
                    { label: 'Total Revenue', value: `£${totalRevenue.toLocaleString()}` },
                    { label: 'Net Profit', value: `£${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                    { label: 'ROI', value: `${roi}%` },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '16px 20px', borderRight: '1px solid #EAECF0' }}>
                      <div style={{ fontSize: 11, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.label === 'ROI' ? '#5B7CFA' : '#101828' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #EAECF0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#667085', marginBottom: 4 }}>
                    <span>Occupancy</span><span>{occupancyPct}%</span>
                  </div>
                  <div style={{ height: 8, background: '#F2F4F7', borderRadius: 4 }}>
                    <div style={{ height: 8, width: `${occupancyPct}%`, background: '#5B7CFA', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY PROPERTIES */}
        {tab === 'My Properties' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>My Properties</div>
            {properties.length === 0
              ? <div style={{ ...card, textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No properties linked yet. Contact your manager.</div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {properties.map(p => {
                  const assignedOwner = allOwners.find(o => (o.property_ids ?? []).includes(p.id))
                  return (
                  <div key={p.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                      {isStaff && <button onClick={() => { setEditingProperty(p); setEditPropertyForm({ purchase_price: p.purchase_price ?? 0, down_payment: p.down_payment ?? 0, platform: p.platform ?? '', status: p.status ?? 'active', address: p.address ?? '' }) }} style={{ padding: '3px 10px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Edit</button>}
                    </div>
                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>{p.address ?? p.location ?? 'Jamaica'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667085' }}>Purchase:</span><span style={{ fontWeight: 600 }}>£{(Number(p.purchase_price) || 0).toLocaleString()}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667085' }}>Down payment:</span><span style={{ fontWeight: 600 }}>£{(Number(p.down_payment) || 0).toLocaleString()}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667085' }}>Platform:</span><span style={{ fontWeight: 600 }}>{p.platform ?? 'Wire Transfer'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667085' }}>Status:</span><Badge status={p.status ?? 'active'} /></div>
                      {isStaff && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F2F4F7', paddingTop: 8, marginTop: 4 }}>
                          <span style={{ color: '#667085' }}>Owner:</span>
                          <select
                            value={assignedOwner?.id ?? ''}
                            onChange={async e => {
                              const newOwnerId = e.target.value || null
                              setSaving(true)
                              const res = await fetch('/api/admin/assign-property', {
                                method: 'POST', headers: await authHeader(),
                                body: JSON.stringify({ property_id: p.id, owner_id: newOwnerId }),
                              })
                              const result = await res.json()
                              if (!res.ok) { alert(result.error || 'Could not assign owner'); setSaving(false); return }
                              if (viewingOwner) {
                                const { data: freshProfile } = await supabase.from('owner_profiles').select('*').eq('id', viewingOwner.id).single()
                                if (freshProfile) { setViewingOwner(freshProfile); setOwnerProfile(freshProfile); await loadOwnerData(freshProfile) }
                              } else {
                                await loadStaffData(user.id)
                              }
                              setSaving(false)
                            }}
                            style={{ padding: '4px 8px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            <option value="">Unassigned</option>
                            {allOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            }
          </div>
        )}

        {/* FINANCE & DOCUMENTS */}
        {tab === 'Finance & Documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Finance & Documents</div>
              {isStaff && viewingOwner && <button onClick={() => setAddFinanceOwner(viewingOwner)} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: '#5B7CFA', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Record</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Paid Out" value={`£0`} />
              <StatCard label="Guest Revenue" value={`£${totalRevenue.toLocaleString()}`} />
              <StatCard label="Expenses" value={`£${expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <StatCard label="Net This Month" value={`£${monthRevenue.toLocaleString()}`} dark />
            </div>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💰 Profit Split — After All Expenses</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>GROSS REVENUE</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>£{totalRevenue.toLocaleString()}</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>TOTAL EXPENSES</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>£{expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>NET PROFIT</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>£{netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>OWNER SHARE (60%)</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>£{ownerShare.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 12, color: '#667085' }}>{ownerProfile?.name ?? 'Owner'}</div>
                </div>
                <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>MANAGEMENT FEE (40%)</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>£{(totalRevenue * MGMT_FEE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 12, color: '#667085' }}>Management Fee</div>
                </div>
              </div>
            </div>
            {Object.entries(financeByMonth).map(([month, records]: any) => {
              const mRev = records.filter((r: any) => r.amount > 0).reduce((s: number, r: any) => s + r.amount, 0)
              const mExp = records.filter((r: any) => r.amount < 0).reduce((s: number, r: any) => s + Math.abs(r.amount), 0)
              return (
                <div key={month} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#101828', padding: '10px 0', borderBottom: '1px solid #EAECF0', marginBottom: 8 }}>
                    <span>{new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                    <span style={{ fontSize: 12, color: '#667085' }}>+£{mRev.toLocaleString()} -£{mExp.toLocaleString()} Net: £{(mRev - mExp).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  {records.map((r: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F9FAFB', fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: '#667085' }}>{r.property} · {(r.created_at ?? r.check_in ?? '').slice(0, 10)}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: r.amount > 0 ? '#10B981' : '#EF4444' }}>
                        {r.amount > 0 ? '+' : '-'}£{Math.abs(r.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'Messages' && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Messages</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, maxHeight: 400, overflowY: 'auto' }}>
              {messages.length === 0
                ? <div style={{ textAlign: 'center', padding: 40, color: '#98A2B3', fontSize: 14 }}>No messages yet</div>
                : messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: m.sender === 'owner' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', background: m.sender === 'owner' ? '#5B7CFA' : '#F3F4F6', color: m.sender === 'owner' ? '#fff' : '#101828', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                      <div>{m.message}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{m.created_at?.slice(0, 16)}</div>
                    </div>
                  </div>
                ))
              }
            </div>
            {ownerProfile && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message…" style={{ flex: 1, padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }} />
                <button onClick={sendMessage} disabled={saving} style={{ padding: '10px 20px', background: '#5B7CFA', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Send</button>
              </div>
            )}
          </div>
        )}

        {/* CONTACT & PAYMENT */}
        {tab === 'Contact & Payment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🧑 Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'FIRST NAME', value: ownerProfile?.name?.split(' ')[0] ?? '', key: 'first_name' },
                  { label: 'LAST NAME', value: ownerProfile?.name?.split(' ').slice(1).join(' ') ?? '', key: 'last_name' },
                  { label: 'EMAIL', value: ownerProfile?.email ?? user?.email ?? '', key: 'email' },
                  { label: 'PHONE', value: ownerProfile?.phone ?? '', key: 'phone' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>{f.label}</div>
                    <input defaultValue={f.value} placeholder={f.label.toLowerCase()} style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>ADDRESS</div>
                  <input defaultValue={ownerProfile?.address ?? ''} placeholder="Full address" style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <button onClick={saveContactInfo} disabled={saving} style={{ marginTop: 16, padding: '10px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
            </div>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏦 Banking Details <span style={{ fontSize: 11, fontWeight: 400, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>Secure</span></div>
              <div style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>Your payout account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'BANK NAME', placeholder: 'e.g. Barclays', key: 'bank_name' },
                  { label: 'ACCOUNT NAME', placeholder: 'Name on account', key: 'account_name' },
                  { label: 'ACCOUNT NUMBER', placeholder: 'e.g. 12345678', key: 'account_number' },
                  { label: 'SORT CODE', placeholder: 'e.g. 01-02-03', key: 'sort_code' },
                  { label: 'ROUTING NUMBER', placeholder: 'e.g. 021000021', key: 'routing_number' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>{f.label}</div>
                    <input defaultValue={contactInfo?.[f.key] ?? ''} placeholder={f.placeholder} style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>PAYOUT SCHEDULE</div>
                  <select style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option>Monthly</option><option>Quarterly</option><option>Weekly</option>
                  </select>
                </div>
              </div>
              <button onClick={saveBankingInfo} disabled={saving} style={{ marginTop: 16, padding: '10px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Banking Info</button>
            </div>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>💳 Payment History</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Date', 'Description', 'Property', 'Amount', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {statements.filter(s => s.status === 'paid').length === 0
                    ? <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#98A2B3', padding: 30 }}>No payments yet</td></tr>
                    : statements.filter(s => s.status === 'paid').map(s => (
                      <tr key={s.id}>
                        <td style={td}>{s.period_start}</td>
                        <td style={td}>{s.notes ?? 'Monthly payout'}</td>
                        <td style={td}>{s.property_name ?? '—'}</td>
                        <td style={{ ...td, fontWeight: 600, color: '#10B981' }}>£{(Number(s.owner_amount) || 0).toLocaleString()}</td>
                        <td style={td}><Badge status="paid" /></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STAFF PANEL */}
        {tab === 'Staff Panel' && isStaff && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Staff Panel 🔒 <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, background: '#FEE2E2', padding: '2px 8px', borderRadius: 20 }}>ADMIN ONLY</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20, marginTop: 16 }}>
              {[
                { label: 'ACTIVE OWNERS', value: allOwners.length },
                { label: 'TOTAL PROPERTIES', value: properties.length },
                { label: 'TOTAL REVENUE', value: `£${totalRevenue.toLocaleString()}` },
                { label: 'OPEN MAINTENANCE', value: tickets.filter(t => t.status === 'open').length },
                { label: 'TOTAL BOOKINGS', value: activeBookings.length },
                { label: 'TOTAL PAID OUT', value: '£0' },
              ].map(s => (
                <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#667085', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#101828' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {allOwners.map(owner => (
              <div key={owner.id} style={{ border: '1px solid #EAECF0', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5B7CFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{(owner.name ?? 'O')[0]}</div>
                    <span style={{ fontWeight: 600 }}>{owner.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ padding: '5px 12px', border: '1px solid #5B7CFA', borderRadius: 6, background: '#fff', color: '#5B7CFA', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => viewOwnerPortal(owner)}>View Portal</button>
                    <button style={{ padding: '5px 12px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => { setEditingOwner(owner); setEditOwnerForm({ first_name: owner.name?.split(' ')[0] ?? '', last_name: owner.name?.split(' ').slice(1).join(' ') ?? '', email: owner.email, phone: owner.phone, invested: owner.invested ?? 0, split_percentage: owner.split_percentage ?? 60, property_ids: owner.property_ids ?? [] }) }}>Edit</button>
                    <button style={{ padding: '5px 12px', border: '1px solid #EAECF0', borderRadius: 6, background: '#5B7CFA', color: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => setAddFinanceOwner(owner)}>Finance</button>
                    <button style={{ padding: '5px 12px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => setAddPaymentOwner(owner)}>+ Payment</button>
                  </div>
                </div>
                <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div><div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>Revenue</div><div style={{ fontWeight: 600 }}>—</div></div>
                  <div><div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>Paid Out</div><div style={{ fontWeight: 600 }}>—</div></div>
                  <div><div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>ROI</div><div style={{ fontWeight: 600 }}>—</div></div>
                  <div><div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>Properties</div><div style={{ fontWeight: 600 }}>{(owner.property_ids ?? []).length}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MANAGE OWNERS */}
        {tab === 'Manage Owners' && isStaff && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Manage Owners 🔒 <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, background: '#FEE2E2', padding: '2px 8px', borderRadius: 20 }}>ADMIN ONLY</span></div>
            <div style={{ marginTop: 20, marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>+ Create Owner Account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'FIRST NAME *', key: 'first_name', placeholder: 'First name' },
                  { label: 'LAST NAME *', key: 'last_name', placeholder: 'Last name' },
                  { label: 'EMAIL *', key: 'email', placeholder: 'owner@email.com' },
                  { label: 'PHONE', key: 'phone', placeholder: '+44 7700 000000' },
                  { label: 'PASSWORD *', key: 'password', placeholder: 'Min 6 characters', type: 'password' },
                  { label: 'CONFIRM PASSWORD *', key: 'confirm_password', placeholder: 'Repeat password', type: 'password' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 6, textTransform: 'uppercase' }}>{f.label}</div>
                    <input type={f.type ?? 'text'} value={(ownerForm as any)[f.key]} onChange={e => setOwnerForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <button onClick={createOwnerAccount} disabled={saving} style={{ marginTop: 16, padding: '10px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating…' : 'Create Account'}
              </button>
            </div>
            <div style={{ borderTop: '1px solid #EAECF0', paddingTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: 12 }}>All Registered Owners</div>
              {allOwners.length === 0
                ? <div style={{ color: '#98A2B3', fontSize: 13, padding: 20, textAlign: 'center' }}>No owners yet</div>
                : allOwners.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F2F4F7', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{o.name}</div>
                      <div style={{ fontSize: 11, color: '#667085' }}>— {o.user_id === user?.id ? 'admin' : 'owner'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge status={o.user_id === user?.id ? 'admin' : 'owner'} />
                      {o.user_id !== user?.id && (
                        <>
                          <button style={{ padding: '5px 12px', border: '1px solid #5B7CFA', borderRadius: 6, background: '#fff', color: '#5B7CFA', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => viewOwnerPortal(o)}>View Portal</button>
                          <button style={{ padding: '5px 12px', border: '1px solid #EAECF0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => { setEditingOwner(o); setEditOwnerForm({ first_name: o.name?.split(' ')[0] ?? '', last_name: o.name?.split(' ').slice(1).join(' ') ?? '', email: o.email, phone: o.phone, invested: o.invested ?? 0, split_percentage: o.split_percentage ?? 60, property_ids: o.property_ids ?? [] }) }}>Edit</button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

      </div>

      {/* EDIT OWNER MODAL */}
      {editingOwner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 500, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Owner — {editingOwner.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'First Name', key: 'first_name' }, { label: 'Last Name', key: 'last_name' },
                { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' },
                { label: 'Amount Invested (£)', key: 'invested' }, { label: 'Owner Split %', key: 'split_percentage' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</div>
                  <input value={editOwnerForm[f.key] ?? ''} onChange={e => setEditOwnerForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Assigned Properties</div>
                <div style={{ border: '1px solid #EAECF0', borderRadius: 8, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
                  {properties.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#98A2B3' }}>No properties found on this account.</div>}
                  {properties.map(prop => {
                    const selected: string[] = editOwnerForm.property_ids ?? []
                    const checked = selected.includes(prop.id)
                    return (
                      <label key={prop.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 13, cursor: 'pointer', borderRadius: 6 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEditOwnerForm((p: any) => {
                            const cur: string[] = p.property_ids ?? []
                            return { ...p, property_ids: checked ? cur.filter(id => id !== prop.id) : [...cur, prop.id] }
                          })}
                        />
                        {prop.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => deleteOwner(editingOwner.id)} style={{ padding: '9px 16px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete Owner</button>
              <button onClick={() => setEditingOwner(null)} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveOwnerEdit} disabled={saving} style={{ padding: '9px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROPERTY MODAL */}
      {editingProperty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 460, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Property — {editingProperty.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Address</div>
                <input value={editPropertyForm.address ?? ''} onChange={e => setEditPropertyForm((p: any) => ({ ...p, address: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Purchase Price (£)</div>
                  <input value={editPropertyForm.purchase_price ?? ''} onChange={e => setEditPropertyForm((p: any) => ({ ...p, purchase_price: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Down Payment (£)</div>
                  <input value={editPropertyForm.down_payment ?? ''} onChange={e => setEditPropertyForm((p: any) => ({ ...p, down_payment: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Platform</div>
                  <input value={editPropertyForm.platform ?? ''} onChange={e => setEditPropertyForm((p: any) => ({ ...p, platform: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Status</div>
                  <select value={editPropertyForm.status ?? 'active'} onChange={e => setEditPropertyForm((p: any) => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }}>
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingProperty(null)} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={savePropertyEdit} disabled={saving} style={{ padding: '9px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BOOKING MODAL */}
      {addingBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 500, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Booking</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Property</div>
                <select value={newBookingForm.property_id} onChange={e => setNewBookingForm((p: any) => ({ ...p, property_id: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }}>
                  <option value="">Select a property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Guest Name</div>
                  <input value={newBookingForm.guest_name} onChange={e => setNewBookingForm((p: any) => ({ ...p, guest_name: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Guest Email</div>
                  <input value={newBookingForm.guest_email} onChange={e => setNewBookingForm((p: any) => ({ ...p, guest_email: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Check-in</div>
                  <input type="date" value={newBookingForm.check_in} onChange={e => setNewBookingForm((p: any) => ({ ...p, check_in: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Check-out</div>
                  <input type="date" value={newBookingForm.check_out} onChange={e => setNewBookingForm((p: any) => ({ ...p, check_out: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Revenue (£)</div>
                  <input value={newBookingForm.total_amount} onChange={e => setNewBookingForm((p: any) => ({ ...p, total_amount: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Platform</div>
                  <input value={newBookingForm.platform} onChange={e => setNewBookingForm((p: any) => ({ ...p, platform: e.target.value }))} placeholder="Direct, Airbnb, …" style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Status</div>
                <select value={newBookingForm.status} onChange={e => setNewBookingForm((p: any) => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }}>
                  <option value="confirmed">confirmed</option>
                  <option value="pending">pending</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setAddingBooking(false)} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addBooking} disabled={saving} style={{ padding: '9px 20px', background: '#C9A84C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL */}
      {addPaymentOwner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 460, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Payment — {addPaymentOwner.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Amount (£)', key: 'amount', placeholder: '0.00' },
                { label: 'Description', key: 'description', placeholder: 'Monthly payout' },
                { label: 'Property Name', key: 'property_name', placeholder: 'Sangsters Aurevo' },
                { label: 'Period Start', key: 'period_start', placeholder: '2026-06-01' },
                { label: 'Period End', key: 'period_end', placeholder: '2026-06-30' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</div>
                  <input value={(paymentForm as any)[f.key]} onChange={e => setPaymentForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Status</div>
                <select value={paymentForm.status} onChange={e => setPaymentForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }}>
                  <option value="paid">Paid</option><option value="pending">Pending</option><option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setAddPaymentOwner(null)} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addPayment} disabled={saving} style={{ padding: '9px 20px', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FINANCE RECORD MODAL */}
      {addFinanceOwner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, maxWidth: '90vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Finance Record — {addFinanceOwner.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>Type</div>
                <select value={financeForm.type} onChange={e => setFinanceForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13 }}>
                  <option value="expense">Expense (debit)</option><option value="income">Income (credit)</option>
                </select>
              </div>
              {[
                { label: 'Amount (£)', key: 'amount', placeholder: '0.00' },
                { label: 'Description', key: 'description', placeholder: 'Utility bill payment' },
                { label: 'Category', key: 'category', placeholder: 'Utilities / Maintenance / Rent' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</div>
                  <input value={(financeForm as any)[f.key]} onChange={e => setFinanceForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '9px 12px', border: '1px solid #EAECF0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setAddFinanceOwner(null)} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addFinanceRecord} disabled={saving} style={{ padding: '9px 20px', background: '#5B7CFA', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Record</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
