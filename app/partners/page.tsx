'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PartnerBroadcast from '../../components/PartnerBroadcast'
import { STAFF_CENTRE_TABS, PARTNER_GRANTABLE_MODULES } from '../../lib/useRole'
import InvestPage from '../invest/page'

// Partners
// --------
// Staff see four tabs: Dashboard (investors + agents at a glance),
// Agent Programme (commission agents and the guests/tenants they log),
// Investors (every Vacation Rentals owner, added automatically) and
// Broadcast (group chat with partners for opportunities and updates).
//
// Owners (owner_profiles) sign in here as investor partners and see their
// own Dashboard, Investments, Payouts and Broadcast, with a link into their Owner Portal.
// Investor figures mirror /owner-portal: owner share = 60% of guest revenue,
// capital returned = paid owner_statements, invested = owner_profiles.invested.

const MGMT_FEE = 0.40
// Matches the Staff Centre dashboard: Inter, #F7F8FA page, white #E4E7EC cards, #3B4AFF accent
const ACCENT = '#3B4AFF'
const ACCENT_SOFT = '#EEF0FF'
const TEXT = '#101828'
const PAGE_BG = '#F7F8FA'
const TOTAL_STAGES = 10

type StaffTab = 'Dashboard' | 'Agent Programme' | 'Investors' | 'Broadcast'
type InvestorTab = 'Dashboard' | 'Investments' | 'Payouts' | 'Deal Analyser' | 'Broadcast'
const STAFF_TABS: StaffTab[] = ['Dashboard', 'Agent Programme', 'Investors', 'Broadcast']
const INVESTOR_TABS: InvestorTab[] = ['Dashboard', 'Investments', 'Payouts', 'Deal Analyser', 'Broadcast']
const PARTNER_FEE = '£75'

const REFERRAL_STATUSES = ['logged', 'screening', 'approved', 'rejected', 'completed', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  logged: 'Logged', screening: 'Screening', approved: 'Approved', rejected: 'Rejected',
  completed: 'Stayed / Moved in', cancelled: 'Cancelled',
}
const COMMISSION_LABEL: Record<string, string> = {
  none: 'No commission', pending: 'Pending', payable: 'Payable', paid: 'Paid', clawed_back: 'Clawed back',
}
const CHANNEL_LABEL: Record<string, string> = { direct: 'Direct', airbnb: 'Airbnb', booking_com: 'Booking.com', other: 'Other' }

const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
const normPhone = (p?: string | null) => (p ?? '').replace(/\D/g, '')

function Stat({ label, value, sub, dark }: { label: string; value: string; sub?: string; dark?: boolean }) {
  // Same tile as the Staff Centre dashboard; `dark` marks the key figure in the accent colour
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#667085', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: dark ? ACCENT : TEXT }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Pill({ status, label }: { status: string; label?: string }) {
  const map: Record<string, [string, string]> = {
    paid: ['#D1FAE5', '#059669'], sent: ['#FEF3C7', '#D97706'], draft: ['#F3F4F6', '#6B7280'],
    live: ['#D1FAE5', '#059669'], active: ['#D1FAE5', '#059669'], onboarding: ['#FEF3C7', '#D97706'],
    logged: ['#EEF2FF', '#4F46E5'], screening: ['#FEF3C7', '#D97706'], approved: ['#DBEAFE', '#2563EB'],
    rejected: ['#FEE2E2', '#DC2626'], completed: ['#D1FAE5', '#059669'], cancelled: ['#F3F4F6', '#6B7280'],
    pending: ['#FEF3C7', '#D97706'], payable: ['#DBEAFE', '#2563EB'], clawed_back: ['#FEE2E2', '#DC2626'],
    none: ['#F3F4F6', '#6B7280'], paused: ['#F3F4F6', '#6B7280'], duplicate: ['#FEE2E2', '#DC2626'],
  }
  const [bg, color] = map[(status ?? '').toLowerCase()] ?? ['#F3F4F6', '#6B7280']
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: bg, color, whiteSpace: 'nowrap' }}>{label ?? status ?? '—'}</span>
}

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 8, background: '#F2F4F7', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: 8, width: `${Math.max(0, Math.min(100, pct))}%`, background: ACCENT, borderRadius: 4 }} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  )
}

function nightsBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function calcCommission(agent: any, ref: any): number {
  if (!agent) return 0
  const st = ref.referral_type === 'short_term'
  const type = st ? agent.st_rate_type : agent.lt_rate_type
  const rate = Number(st ? agent.st_rate : agent.lt_rate) || 0
  if (type === 'flat') return rate
  return ((Number(ref.value) || 0) * rate) / 100
}

const EMPTY_AGENT = { name: '', email: '', phone: '', country: '', code: '', st_rate_type: 'percent', st_rate: '10', lt_rate_type: 'percent', lt_rate: '50', payout_method: 'bank', payout_details: '', notes: '' }
const EMPTY_REFERRAL = { agent_id: '', referral_type: 'short_term', channel: 'direct', person_name: '', person_email: '', person_phone: '', property_id: '', property_label: '', start_date: '', end_date: '', value: '', notes: '' }

export default function PartnersPage() {
  const [loading, setLoading] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [staffTab, setStaffTab] = useState<StaffTab>('Dashboard')
  const [investorTab, setInvestorTab] = useState<InvestorTab>('Dashboard')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [saving, setSaving] = useState(false)

  // Investor (owner) data
  const [profile, setProfile] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [finance, setFinance] = useState<any[]>([])

  // Staff data
  const [allOwners, setAllOwners] = useState<any[]>([])
  const [allStatements, setAllStatements] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [bizProperties, setBizProperties] = useState<any[]>([])
  const [agentsMissing, setAgentsMissing] = useState(false)

  // Agent Programme UI
  const [apView, setApView] = useState<'Referrals' | 'Agents'>('Referrals')
  const [refFilter, setRefFilter] = useState<'all' | 'short_term' | 'long_term'>('all')
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [agentForm, setAgentForm] = useState<any>(EMPTY_AGENT)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [showRefForm, setShowRefForm] = useState(false)
  const [refForm, setRefForm] = useState<any>(EMPTY_REFERRAL)
  const [paying, setPaying] = useState(false)
  const [paidReturn, setPaidReturn] = useState(false)

  // Investor access (what a partner can see beyond Partners)
  const [accessOwnerId, setAccessOwnerId] = useState<string | null>(null)
  const [accessForm, setAccessForm] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/partners'; return }
      setUserId(user.id)

      const { data: owner } = await supabase.from('owner_profiles').select('*').eq('user_id', user.id).single()
      if (owner) {
        setProfile(owner)
        setAuthorName(owner.name || user.email || 'Partner')
        const ids: string[] = owner.property_ids ?? []
        const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
        const [p, b, s, f] = await Promise.all([
          supabase.from('properties').select('*').in('id', safeIds),
          supabase.from('bookings').select('*').in('property_id', safeIds),
          supabase.from('owner_statements').select('*').eq('owner_id', owner.id).order('period_start', { ascending: false }),
          supabase.from('owner_finance').select('*').eq('owner_id', owner.id),
        ])
        setProperties(p.data ?? [])
        setBookings(b.data ?? [])
        setStatements(s.data ?? [])
        setFinance(f.data ?? [])
        // An investor's broadcast is the business that created them (fallback: owner of their linked properties)
        setBusinessId(owner.business_id ?? (p.data ?? [])[0]?.user_id ?? null)
        setLoading(false)
        return
      }

      // Staff — resolve the business owner's id the same way Sidebar/portals do
      setIsStaff(true)
      const { data: rows } = await supabase.from('team_members').select('user_id, name').eq('email', user.email).order('created_at', { ascending: false }).limit(1)
      const biz = rows?.[0]?.user_id ?? user.id
      const meta = user.user_metadata ?? {}
      setAuthorName(rows?.[0]?.name || [meta.first_name, meta.last_name].filter(Boolean).join(' ') || user.email || 'Team')
      setBusinessId(biz)
      await loadStaff(biz)
      setLoading(false)
    }
    init()
  }, [])

  // Back from Stripe checkout: wait for the webhook to mark the membership paid
  useEffect(() => {
    if (!profile || profile.partner_paid_at) return
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('paid') !== 'true') return
    setPaidReturn(true)
    let tries = 0
    const t = setInterval(async () => {
      tries++
      const { data } = await supabase.from('owner_profiles').select('partner_paid_at').eq('id', profile.id).single()
      if (data?.partner_paid_at) {
        clearInterval(t)
        setProfile({ ...profile, partner_paid_at: data.partner_paid_at })
        window.history.replaceState(null, '', window.location.pathname)
      } else if (tries >= 20) {
        clearInterval(t)
        setPaidReturn(false)
        alert('Your payment is still being confirmed. Please refresh in a minute, or contact the team if it doesn’t unlock.')
      }
    }, 3000)
    return () => clearInterval(t)
  }, [profile?.id, profile?.partner_paid_at])

  async function loadStaff(biz: string) {
    const [o, s, a, r, p] = await Promise.all([
      supabase.from('owner_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('owner_statements').select('owner_id, owner_amount, status'),
      supabase.from('partner_agents').select('*').eq('user_id', biz).order('created_at', { ascending: false }),
      supabase.from('agent_referrals').select('*').eq('user_id', biz).order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').eq('user_id', biz).order('name'),
    ])
    setAllOwners(o.data ?? [])
    setAllStatements(s.data ?? [])
    setAgentsMissing(!!a.error)
    setAgents(a.data ?? [])
    setReferrals(r.data ?? [])
    setBizProperties(p.data ?? [])
  }

  // ---------- Agent Programme actions ----------
  async function saveAgent() {
    if (!businessId || !agentForm.name.trim()) { alert('Agent name is required'); return }
    setSaving(true)
    const code = (agentForm.code || agentForm.name.replace(/[^a-zA-Z]/g, '').slice(0, 4) + Math.floor(100 + Math.random() * 900)).toUpperCase()
    const payload = {
      user_id: businessId,
      name: agentForm.name.trim(),
      email: agentForm.email || null,
      phone: agentForm.phone || null,
      country: agentForm.country || null,
      code,
      st_rate_type: agentForm.st_rate_type,
      st_rate: Number(agentForm.st_rate) || 0,
      lt_rate_type: agentForm.lt_rate_type,
      lt_rate: Number(agentForm.lt_rate) || 0,
      payout_method: agentForm.payout_method || null,
      payout_details: agentForm.payout_details || null,
      notes: agentForm.notes || null,
    }
    const { error } = editingAgentId
      ? await supabase.from('partner_agents').update(payload).eq('id', editingAgentId)
      : await supabase.from('partner_agents').insert(payload)
    setSaving(false)
    if (error) { alert(error.message.includes('idx_partner_agents_code') ? 'That agent code is already in use' : error.message); return }
    setShowAgentForm(false); setEditingAgentId(null); setAgentForm(EMPTY_AGENT)
    await loadStaff(businessId)
  }

  function editAgent(a: any) {
    setAgentForm({ ...EMPTY_AGENT, ...a, st_rate: String(a.st_rate ?? ''), lt_rate: String(a.lt_rate ?? ''), email: a.email ?? '', phone: a.phone ?? '', country: a.country ?? '', payout_details: a.payout_details ?? '', notes: a.notes ?? '' })
    setEditingAgentId(a.id)
    setShowAgentForm(true)
  }

  async function toggleAgentStatus(a: any) {
    if (!businessId) return
    await supabase.from('partner_agents').update({ status: a.status === 'active' ? 'paused' : 'active' }).eq('id', a.id)
    await loadStaff(businessId)
  }

  async function saveReferral() {
    if (!businessId) return
    if (!refForm.agent_id || !refForm.person_name.trim()) { alert('Agent and guest/tenant name are required'); return }
    setSaving(true)
    const prop = bizProperties.find(p => p.id === refForm.property_id)
    const { error } = await supabase.from('agent_referrals').insert({
      user_id: businessId,
      agent_id: refForm.agent_id,
      referral_type: refForm.referral_type,
      channel: refForm.referral_type === 'short_term' ? refForm.channel : null,
      person_name: refForm.person_name.trim(),
      person_email: refForm.person_email || null,
      person_phone: refForm.person_phone || null,
      property_id: refForm.property_id || null,
      property_label: prop?.name ?? (refForm.property_label || null),
      start_date: refForm.start_date || null,
      end_date: refForm.referral_type === 'short_term' ? (refForm.end_date || null) : null,
      value: refForm.value === '' ? null : Number(refForm.value),
      notes: refForm.notes || null,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    setShowRefForm(false); setRefForm(EMPTY_REFERRAL)
    await loadStaff(businessId)
  }

  async function setReferralStatus(ref: any, status: string) {
    if (!businessId) return
    const agent = agents.find(a => a.id === ref.agent_id)
    const update: any = { status }
    if (status === 'approved') {
      update.commission_amount = ref.commission_amount ?? calcCommission(agent, ref)
      if (ref.commission_status !== 'paid') update.commission_status = 'pending'
    }
    if (status === 'completed') {
      update.commission_amount = ref.commission_amount ?? calcCommission(agent, ref)
      if (ref.commission_status !== 'paid') update.commission_status = 'payable'
    }
    if (status === 'rejected' || status === 'cancelled') {
      update.commission_status = ref.commission_status === 'paid' ? 'clawed_back' : 'none'
    }
    if (status === 'logged' || status === 'screening') {
      if (ref.commission_status !== 'paid') update.commission_status = 'none'
    }
    const { error } = await supabase.from('agent_referrals').update(update).eq('id', ref.id)
    if (error) { alert(error.message); return }
    await loadStaff(businessId)
  }

  async function updateReferralField(ref: any, field: string, value: any) {
    if (!businessId) return
    const { error } = await supabase.from('agent_referrals').update({ [field]: value }).eq('id', ref.id)
    if (error) { alert(error.message); return }
    await loadStaff(businessId)
  }

  async function markPaid(ref: any) {
    if (!businessId) return
    const reference = prompt('Payout reference (bank/Stripe/Wise reference):') ?? ''
    const { error } = await supabase.from('agent_referrals').update({ commission_status: 'paid', paid_at: new Date().toISOString(), payout_reference: reference || null }).eq('id', ref.id)
    if (error) { alert(error.message); return }
    await loadStaff(businessId)
  }

  // ---------- Partner access ----------
  function openAccess(o: any) {
    setAccessOwnerId(accessOwnerId === o.id ? null : o.id)
    setAccessForm(o.custom_modules ?? [])
  }

  function toggleAccess(key: string) {
    setAccessForm(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function saveAccess(o: any) {
    if (!businessId) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/partner-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ owner_id: o.id, custom_modules: accessForm }),
    })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) { alert(result.error || 'Could not save access'); return }
    setAccessOwnerId(null)
    await loadStaff(businessId)
  }

  function accessSummary(o: any) {
    const cm: string[] = o.custom_modules ?? []
    const mods = PARTNER_GRANTABLE_MODULES.filter(m => cm.includes(m.k)).map(m => m.l)
    const tabs = STAFF_CENTRE_TABS.filter(t => t.k !== 'partners' && cm.includes(`sc:${t.k}`)).map(t => t.l)
    const extra = [...mods, ...tabs]
    return extra.length ? `Partners + ${extra.join(', ')}` : 'Partners only'
  }

  // A referral is a likely duplicate if an EARLIER live referral has the same email or phone — first claim wins.
  function isDuplicate(ref: any) {
    const email = (ref.person_email ?? '').toLowerCase().trim()
    const phone = normPhone(ref.person_phone)
    if (!email && !phone) return false
    return referrals.some(r => r.id !== ref.id
      && !['rejected', 'cancelled'].includes(r.status)
      && new Date(r.created_at) < new Date(ref.created_at)
      && ((email && (r.person_email ?? '').toLowerCase().trim() === email) || (phone && normPhone(r.person_phone) === phone)))
  }

  // ---------- Investor figures ----------
  const active = bookings.filter(b => b.status !== 'cancelled')
  const revenue = active.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
  const ownerShare = revenue * (1 - MGMT_FEE)
  const expenses = finance.filter(f => Number(f.amount) < 0).reduce((s, f) => s + Math.abs(Number(f.amount) || 0), 0)
  const netProfit = ownerShare - expenses
  const invested = Number(profile?.invested) || 0
  const returned = statements.filter(s => s.status === 'paid').reduce((sum, s) => sum + (Number(s.owner_amount) || 0), 0)
  const upcoming = statements.filter(s => s.status === 'sent').reduce((sum, s) => sum + (Number(s.owner_amount) || 0), 0)
  const outstanding = Math.max(0, invested - returned)
  const paybackPct = invested > 0 ? (returned / invested) * 100 : 0
  const roi = invested > 0 ? (netProfit / invested) * 100 : 0
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  function propertyStats(p: any) {
    const pb = active.filter(b => b.property_id === p.id)
    const rev = pb.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
    const nights = pb.filter(b => b.check_out >= ninetyAgo).reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0)
    return { rev, count: pb.length, occ: Math.min(100, Math.round((nights / 90) * 100)), stage: Number(p.staging_stage) || 0, share: rev * (1 - MGMT_FEE) }
  }

  // ---------- Staff figures ----------
  function ownerTotals(o: any) {
    const inv = Number(o.invested) || 0
    const ret = allStatements.filter(s => s.owner_id === o.id && s.status === 'paid').reduce((sum, s) => sum + (Number(s.owner_amount) || 0), 0)
    return { inv, ret, out: Math.max(0, inv - ret), pct: inv > 0 ? (ret / inv) * 100 : 0 }
  }
  const staffInvested = allOwners.reduce((s, o) => s + ownerTotals(o).inv, 0)
  const staffReturned = allOwners.reduce((s, o) => s + ownerTotals(o).ret, 0)
  const activeAgents = agents.filter(a => a.status === 'active').length
  const openReferrals = referrals.filter(r => ['logged', 'screening', 'approved'].includes(r.status)).length
  const inScreening = referrals.filter(r => r.status === 'screening').length
  const commissionPayable = referrals.filter(r => r.commission_status === 'payable').reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
  const commissionPending = referrals.filter(r => r.commission_status === 'pending').reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
  const commissionPaid = referrals.filter(r => r.commission_status === 'paid').reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
  const agentName = (id: string) => agents.find(a => a.id === id)?.name ?? '—'
  const filteredReferrals = referrals.filter(r => refFilter === 'all' || r.referral_type === refFilter)

  // ---------- Partners membership (one-time fee) ----------
  const locked = !isStaff && !!profile && !profile.partner_paid_at
  const inv = !isStaff && !locked

  async function payPartnerFee() {
    setPaying(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/partner-fee', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } })
    const result = await res.json()
    if (result.url) { window.location.href = result.url; return }
    setPaying(false)
    alert(result.error || 'Could not start payment')
  }

  async function setPartnerPaid(o: any, paid: boolean) {
    if (!businessId) return
    if (!confirm(paid ? `Mark ${o.name ?? 'this partner'}'s ${PARTNER_FEE} membership as paid (or waived)?` : `Remove ${o.name ?? 'this partner'}'s paid membership? They'll be asked to pay again.`)) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/update-owner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ owner_id: o.id, partner_paid: paid }),
    })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) { alert(result.error || 'Could not update'); return }
    await loadStaff(businessId)
  }

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 20 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }
  const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
  const btnGold: React.CSSProperties = { background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', fontFamily: 'inherit' }
  const btnGhost: React.CSSProperties = { background: '#fff', color: '#344054', border: '1px solid #D0D5DD', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
  const chip = (on: boolean): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 8, border: `1px solid ${on ? '#D7E0FF' : '#E4E7EC'}`, background: on ? '#D7E0FF' : '#fff', color: on ? ACCENT : '#344054', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' })

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Inter', sans-serif" }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', sans-serif", color: TEXT, padding: '24px 28px' }}>

      {/* Header — same as the Staff Centre dashboard */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>{isStaff ? 'Partners' : `Welcome, ${profile?.name?.split(' ')[0] ?? 'Partner'}`}</h1>
          <div style={{ fontSize: 13, color: '#667085' }}>
            {isStaff ? 'Investors, the Agent Programme and the partners broadcast — all in one place.' : 'Your investment, payouts and partner updates.'}
          </div>
        </div>
        <a href="/owner-portal" style={btnGold}>Owner Portal →</a>
      </div>

      <div>

        {/* Membership paywall — investors pay once before the portal unlocks */}
        {locked && (
          <div style={{ ...card, maxWidth: 560, padding: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Unlock your Partners portal</div>
            <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.6, marginBottom: 16 }}>
              A one-time membership of <b style={{ color: TEXT }}>{PARTNER_FEE}</b> gives you full access to your investment dashboard, payouts, the Deal Analyser and the partners broadcast for new opportunities.
            </div>
            {paidReturn ? (
              <div style={{ fontSize: 13, color: '#067647', background: '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: 8, padding: 12 }}>Payment received — unlocking your portal…</div>
            ) : (
              <button onClick={payPartnerFee} disabled={paying} style={{ ...btnGold, opacity: paying ? 0.6 : 1 }}>{paying ? 'Opening payment…' : `Pay ${PARTNER_FEE} one-time`}</button>
            )}
            <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 12 }}>Secure card payment. Your Owner Portal stays available either way.</div>
          </div>
        )}

        {/* Tabs */}
        {!locked && <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
          {isStaff
            ? STAFF_TABS.map(t => <button key={t} onClick={() => setStaffTab(t)} style={chip(staffTab === t)}>{t}</button>)
            : INVESTOR_TABS.map(t => <button key={t} onClick={() => setInvestorTab(t)} style={chip(investorTab === t)}>{t}</button>)}
        </div>}

        {/* ======================= STAFF ======================= */}

        {isStaff && staffTab === 'Dashboard' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Investors</div>
            <div style={{ ...grid, marginBottom: 24 }}>
              <Stat label="Investors" value={String(allOwners.length)} />
              <Stat label="Capital In" value={gbp(staffInvested)} />
              <Stat label="Capital Returned" value={gbp(staffReturned)} />
              <Stat label="Outstanding" value={gbp(Math.max(0, staffInvested - staffReturned))} dark />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Agent Programme</div>
            <div style={{ ...grid, marginBottom: 24 }}>
              <Stat label="Active Agents" value={String(activeAgents)} />
              <Stat label="Open Referrals" value={String(openReferrals)} sub={`${inScreening} in screening`} />
              <Stat label="Commission Pending" value={gbp(commissionPending)} />
              <Stat label="Commission Payable" value={gbp(commissionPayable)} dark />
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Recent referrals</div>
                <button onClick={() => setStaffTab('Agent Programme')} style={btnGhost}>View all</button>
              </div>
              {referrals.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>No referrals logged yet.</div>}
              {referrals.slice(0, 6).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F2F4F7', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.person_name}</div>
                    <div style={{ fontSize: 12, color: '#667085' }}>{r.referral_type === 'short_term' ? 'Guest' : 'Tenant'} · {agentName(r.agent_id)} · {r.property_label ?? '—'}</div>
                  </div>
                  <Pill status={r.status} label={STATUS_LABEL[r.status]} />
                </div>
              ))}
            </div>
          </>
        )}

        {isStaff && staffTab === 'Agent Programme' && (
          <>
            {agentsMissing && (
              <div style={{ ...card, marginBottom: 16, borderColor: '#FDB022', background: '#FFFAEB', fontSize: 13 }}>
                The Agent Programme tables aren't in the database yet. Run <b>migrations/add-partners-agent-programme.sql</b> in the Supabase SQL Editor.
              </div>
            )}
            <div style={{ ...grid, marginBottom: 16 }}>
              <Stat label="Active Agents" value={String(activeAgents)} />
              <Stat label="Open Referrals" value={String(openReferrals)} />
              <Stat label="Payable Now" value={gbp(commissionPayable)} />
              <Stat label="Paid to Agents" value={gbp(commissionPaid)} dark />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Referrals', 'Agents'] as const).map(v => <button key={v} onClick={() => setApView(v)} style={chip(apView === v)}>{v}</button>)}
              </div>
              {apView === 'Referrals'
                ? <button onClick={() => { setShowRefForm(!showRefForm); setRefForm(EMPTY_REFERRAL) }} style={btnGold} disabled={agents.length === 0}>{showRefForm ? 'Close' : '+ Log guest / tenant'}</button>
                : <button onClick={() => { setShowAgentForm(!showAgentForm); setEditingAgentId(null); setAgentForm(EMPTY_AGENT) }} style={btnGold}>{showAgentForm ? 'Close' : '+ Add agent'}</button>}
            </div>

            {/* ---- Agents ---- */}
            {apView === 'Agents' && (
              <>
                {showAgentForm && (
                  <div style={{ ...card, marginBottom: 16, borderColor: ACCENT }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{editingAgentId ? 'Edit agent' : 'New agent'}</div>
                    <div style={{ ...formGrid, marginBottom: 12 }}>
                      <Field label="Name *"><input style={input} value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} /></Field>
                      <Field label="Email"><input style={input} value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} /></Field>
                      <Field label="Phone"><input style={input} value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })} /></Field>
                      <Field label="Country"><input style={input} value={agentForm.country} onChange={e => setAgentForm({ ...agentForm, country: e.target.value })} placeholder="Jamaica / UK / UAE" /></Field>
                      <Field label="Agent code (auto if blank)"><input style={input} value={agentForm.code} onChange={e => setAgentForm({ ...agentForm, code: e.target.value.toUpperCase() })} /></Field>
                    </div>
                    <div style={{ ...formGrid, marginBottom: 12 }}>
                      <Field label="Short-term commission">
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select style={{ ...input, width: 110 }} value={agentForm.st_rate_type} onChange={e => setAgentForm({ ...agentForm, st_rate_type: e.target.value })}><option value="percent">% of booking</option><option value="flat">Flat £</option></select>
                          <input style={input} type="number" value={agentForm.st_rate} onChange={e => setAgentForm({ ...agentForm, st_rate: e.target.value })} />
                        </div>
                      </Field>
                      <Field label="Long-term commission">
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select style={{ ...input, width: 110 }} value={agentForm.lt_rate_type} onChange={e => setAgentForm({ ...agentForm, lt_rate_type: e.target.value })}><option value="percent">% of month's rent</option><option value="flat">Flat £</option></select>
                          <input style={input} type="number" value={agentForm.lt_rate} onChange={e => setAgentForm({ ...agentForm, lt_rate: e.target.value })} />
                        </div>
                      </Field>
                      <Field label="Payout method">
                        <select style={input} value={agentForm.payout_method} onChange={e => setAgentForm({ ...agentForm, payout_method: e.target.value })}>
                          <option value="bank">Bank transfer</option><option value="wise">Wise</option><option value="stripe">Stripe</option><option value="other">Other</option>
                        </select>
                      </Field>
                      <Field label="Payout details"><input style={input} value={agentForm.payout_details} onChange={e => setAgentForm({ ...agentForm, payout_details: e.target.value })} placeholder="Account name / reference" /></Field>
                    </div>
                    <Field label="Notes"><textarea style={{ ...input, minHeight: 60 }} value={agentForm.notes} onChange={e => setAgentForm({ ...agentForm, notes: e.target.value })} /></Field>
                    <div style={{ marginTop: 14 }}><button onClick={saveAgent} disabled={saving} style={btnGold}>{saving ? 'Saving…' : 'Save agent'}</button></div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {agents.length === 0 && <div style={{ ...card, fontSize: 13, color: '#98A2B3' }}>No agents yet. Add your first agent to start logging guests and tenants.</div>}
                  {agents.map(a => {
                    const mine = referrals.filter(r => r.agent_id === a.id)
                    const earned = mine.filter(r => r.commission_status === 'paid').reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
                    const owed = mine.filter(r => r.commission_status === 'payable').reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
                    return (
                      <div key={a.id} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{a.name} <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginLeft: 6 }}>{a.code}</span></div>
                            <div style={{ fontSize: 12, color: '#667085' }}>{[a.email, a.phone, a.country].filter(Boolean).join(' · ') || '—'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Pill status={a.status} label={a.status === 'active' ? 'Active' : 'Paused'} />
                            <button onClick={() => editAgent(a)} style={btnGhost}>Edit</button>
                            <button onClick={() => toggleAgentStatus(a)} style={btnGhost}>{a.status === 'active' ? 'Pause' : 'Activate'}</button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: 12 }}>
                          <div><div style={{ color: '#667085' }}>Short-term rate</div><div style={{ fontWeight: 700 }}>{a.st_rate_type === 'flat' ? gbp(a.st_rate) : `${a.st_rate}% of booking`}</div></div>
                          <div><div style={{ color: '#667085' }}>Long-term rate</div><div style={{ fontWeight: 700 }}>{a.lt_rate_type === 'flat' ? gbp(a.lt_rate) : `${a.lt_rate}% of 1 month`}</div></div>
                          <div><div style={{ color: '#667085' }}>Referrals</div><div style={{ fontWeight: 700 }}>{mine.length}</div></div>
                          <div><div style={{ color: '#667085' }}>Owed</div><div style={{ fontWeight: 700 }}>{gbp(owed)}</div></div>
                          <div><div style={{ color: '#667085' }}>Paid</div><div style={{ fontWeight: 700 }}>{gbp(earned)}</div></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ---- Referrals ---- */}
            {apView === 'Referrals' && (
              <>
                {agents.length === 0 && !agentsMissing && <div style={{ ...card, marginBottom: 12, fontSize: 13, color: '#667085' }}>Add an agent first (Agents tab), then log their guests and tenants here.</div>}
                {showRefForm && (
                  <div style={{ ...card, marginBottom: 16, borderColor: ACCENT }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Log a guest or tenant</div>
                    <div style={{ ...formGrid, marginBottom: 12 }}>
                      <Field label="Agent *">
                        <select style={input} value={refForm.agent_id} onChange={e => setRefForm({ ...refForm, agent_id: e.target.value })}>
                          <option value="">Select agent</option>
                          {agents.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                        </select>
                      </Field>
                      <Field label="Type *">
                        <select style={input} value={refForm.referral_type} onChange={e => setRefForm({ ...refForm, referral_type: e.target.value })}>
                          <option value="short_term">Short-term guest</option><option value="long_term">Long-term tenant</option>
                        </select>
                      </Field>
                      {refForm.referral_type === 'short_term' && (
                        <Field label="Booking channel">
                          <select style={input} value={refForm.channel} onChange={e => setRefForm({ ...refForm, channel: e.target.value })}>
                            {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </Field>
                      )}
                      <Field label={refForm.referral_type === 'short_term' ? 'Guest name *' : 'Tenant name *'}><input style={input} value={refForm.person_name} onChange={e => setRefForm({ ...refForm, person_name: e.target.value })} /></Field>
                      <Field label="Email"><input style={input} value={refForm.person_email} onChange={e => setRefForm({ ...refForm, person_email: e.target.value })} /></Field>
                      <Field label="Phone"><input style={input} value={refForm.person_phone} onChange={e => setRefForm({ ...refForm, person_phone: e.target.value })} /></Field>
                      <Field label="Property">
                        <select style={input} value={refForm.property_id} onChange={e => setRefForm({ ...refForm, property_id: e.target.value })}>
                          <option value="">Select property</option>
                          {bizProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </Field>
                      <Field label={refForm.referral_type === 'short_term' ? 'Check-in' : 'Move-in date'}><input style={input} type="date" value={refForm.start_date} onChange={e => setRefForm({ ...refForm, start_date: e.target.value })} /></Field>
                      {refForm.referral_type === 'short_term' && <Field label="Check-out"><input style={input} type="date" value={refForm.end_date} onChange={e => setRefForm({ ...refForm, end_date: e.target.value })} /></Field>}
                      <Field label={refForm.referral_type === 'short_term' ? 'Booking value (£)' : 'Monthly rent (£)'}><input style={input} type="number" value={refForm.value} onChange={e => setRefForm({ ...refForm, value: e.target.value })} /></Field>
                    </div>
                    <Field label="Notes"><textarea style={{ ...input, minHeight: 60 }} value={refForm.notes} onChange={e => setRefForm({ ...refForm, notes: e.target.value })} /></Field>
                    <div style={{ marginTop: 14 }}><button onClick={saveReferral} disabled={saving} style={btnGold}>{saving ? 'Saving…' : 'Log referral'}</button></div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {([['all', 'All'], ['short_term', 'Short-term'], ['long_term', 'Long-term']] as const).map(([k, v]) => (
                    <button key={k} onClick={() => setRefFilter(k)} style={{ ...btnGhost, background: refFilter === k ? ACCENT_SOFT : '#fff', borderColor: refFilter === k ? ACCENT : '#D0D5DD', color: refFilter === k ? ACCENT : '#344054' }}>{v}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredReferrals.length === 0 && <div style={{ ...card, fontSize: 13, color: '#98A2B3' }}>No referrals yet.</div>}
                  {filteredReferrals.map(r => {
                    const dup = isDuplicate(r)
                    const st = r.referral_type === 'short_term'
                    return (
                      <div key={r.id} style={{ ...card, borderColor: dup ? '#FDA29B' : '#E4E7EC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{r.person_name}</div>
                            <div style={{ fontSize: 12, color: '#667085' }}>
                              {st ? `Guest · ${CHANNEL_LABEL[r.channel] ?? 'Direct'}` : 'Tenant'} · Agent: {agentName(r.agent_id)} · Logged {new Date(r.created_at).toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ fontSize: 12, color: '#667085' }}>{[r.person_email, r.person_phone].filter(Boolean).join(' · ')}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {dup && <Pill status="duplicate" label="Possible duplicate" />}
                            <Pill status={r.status} label={STATUS_LABEL[r.status]} />
                            <Pill status={r.commission_status} label={COMMISSION_LABEL[r.commission_status]} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: 12, marginBottom: 12 }}>
                          <div><div style={{ color: '#667085' }}>Property</div><div style={{ fontWeight: 700 }}>{r.property_label ?? '—'}</div></div>
                          <div><div style={{ color: '#667085' }}>{st ? 'Stay' : 'Move-in'}</div><div style={{ fontWeight: 700 }}>{r.start_date ? new Date(r.start_date).toLocaleDateString('en-GB') : '—'}{st && r.end_date ? ` – ${new Date(r.end_date).toLocaleDateString('en-GB')}` : ''}</div></div>
                          <div><div style={{ color: '#667085' }}>{st ? 'Booking value' : 'Monthly rent'}</div><div style={{ fontWeight: 700 }}>{r.value != null ? gbp(Number(r.value)) : '—'}</div></div>
                          <div>
                            <div style={{ color: '#667085' }}>Commission</div>
                            <input type="number" defaultValue={r.commission_amount ?? ''} placeholder={gbp(calcCommission(agents.find(a => a.id === r.agent_id), r))}
                              onBlur={e => { const v = e.target.value; if (String(r.commission_amount ?? '') !== v) updateReferralField(r, 'commission_amount', v === '' ? null : Number(v)) }}
                              style={{ ...input, padding: '5px 8px', width: 110 }} disabled={r.commission_status === 'paid'} />
                          </div>
                        </div>
                        {!st && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>Screening notes (ID, income, references, credit, guarantor)</div>
                            <textarea defaultValue={r.screening_notes ?? ''} onBlur={e => { if ((r.screening_notes ?? '') !== e.target.value) updateReferralField(r, 'screening_notes', e.target.value || null) }} style={{ ...input, minHeight: 50 }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={r.status} onChange={e => setReferralStatus(r, e.target.value)} style={{ ...input, width: 190 }}>
                            {REFERRAL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </select>
                          {r.commission_status === 'payable' && <button onClick={() => markPaid(r)} style={btnGold}>Mark commission paid</button>}
                          {r.commission_status === 'paid' && <span style={{ fontSize: 12, color: '#059669' }}>Paid {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-GB') : ''}{r.payout_reference ? ` · Ref ${r.payout_reference}` : ''}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {isStaff && staffTab === 'Investors' && (
          <>
            <div style={{ ...grid, marginBottom: 20 }}>
              <Stat label="Investors" value={String(allOwners.length)} sub="All Vacation Rentals owners" />
              <Stat label="Capital In" value={gbp(staffInvested)} />
              <Stat label="Capital Returned" value={gbp(staffReturned)} />
              <Stat label="Outstanding" value={gbp(Math.max(0, staffInvested - staffReturned))} dark />
            </div>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Investor accounts</div>
              {allOwners.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>No owners yet. Owners created in Vacation Rentals appear here automatically.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allOwners.map(o => {
                  const t = ownerTotals(o)
                  const n = (o.property_ids ?? []).length
                  return (
                    <div key={o.id} style={{ border: '1px solid #EAECF0', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{o.name ?? 'Unnamed owner'}</div>
                          <div style={{ fontSize: 12, color: '#667085' }}>{o.email ?? '—'} · {n} propert{n === 1 ? 'y' : 'ies'} · {o.user_id ? 'Can sign in' : 'No login yet'}</div>
                          <div style={{ fontSize: 12, color: '#667085' }}>Access: <b style={{ color: '#344054' }}>{accessSummary(o)}</b></div>
                          <div style={{ fontSize: 12, color: '#667085', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            Membership ({PARTNER_FEE}): {o.partner_paid_at
                              ? <><Pill status="paid" label={`Paid ${new Date(o.partner_paid_at).toLocaleDateString('en-GB')}`} /><button onClick={() => setPartnerPaid(o, false)} style={{ background: 'none', border: 'none', color: '#98A2B3', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Undo</button></>
                              : <><Pill status="pending" label="Unpaid" /><button onClick={() => setPartnerPaid(o, true)} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Mark paid / waive</button></>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openAccess(o)} style={btnGhost}>{accessOwnerId === o.id ? 'Close' : 'Access'}</button>
                          <a href="/owner-portal" style={{ ...btnGold, padding: '7px 12px', fontSize: 12 }}>Manage in Owner Portal</a>
                        </div>
                      </div>
                      {accessOwnerId === o.id && (
                        <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>What can {o.name?.split(' ')[0] ?? 'this partner'} see?</div>
                          <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>Partners is always on. Tick anything else they should have.</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Modules</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 12 }}>
                            {PARTNER_GRANTABLE_MODULES.map(m => (
                              <label key={m.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={accessForm.includes(m.k)} onChange={() => toggleAccess(m.k)} />{m.l}
                              </label>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Staff Centre</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 14 }}>
                            {STAFF_CENTRE_TABS.map(t => t.k === 'partners' ? (
                              <label key={t.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#98A2B3' }}>
                                <input type="checkbox" checked disabled />{t.l} (always)
                              </label>
                            ) : (
                              <label key={t.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={accessForm.includes(`sc:${t.k}`)} onChange={() => toggleAccess(`sc:${t.k}`)} />{t.l}
                              </label>
                            ))}
                          </div>
                          <button onClick={() => saveAccess(o)} disabled={saving} style={btnGold}>{saving ? 'Saving…' : 'Save access'}</button>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, marginBottom: 8 }}>
                        <div><div style={{ color: '#667085' }}>Invested</div><div style={{ fontWeight: 700 }}>{gbp(t.inv)}</div></div>
                        <div><div style={{ color: '#667085' }}>Returned</div><div style={{ fontWeight: 700 }}>{gbp(t.ret)}</div></div>
                        <div><div style={{ color: '#667085' }}>Outstanding</div><div style={{ fontWeight: 700 }}>{gbp(t.out)}</div></div>
                      </div>
                      <Bar pct={t.pct} />
                      <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>{t.inv > 0 ? `${t.pct.toFixed(0)}% paid back` : 'Set capital invested in Owner Portal → ROI Per Owner'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {isStaff && staffTab === 'Broadcast' && (
          <PartnerBroadcast businessId={businessId} userId={userId} authorName={authorName} authorRole="staff" isStaff />
        )}

        {/* ======================= INVESTOR ======================= */}

        {inv && investorTab === 'Deal Analyser' && (
          <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'hidden' }}>
            <InvestPage />
          </div>
        )}

        {inv && investorTab === 'Broadcast' && (
          <PartnerBroadcast businessId={businessId} userId={userId} authorName={authorName} authorRole="investor" isStaff={false} />
        )}

        {inv && investorTab === 'Dashboard' && (
          <>
            <div style={{ ...grid, marginBottom: 16 }}>
              <Stat label="Capital Invested" value={gbp(invested)} />
              <Stat label="Capital Returned" value={gbp(returned)} sub={`${paybackPct.toFixed(0)}% paid back`} />
              <Stat label="Outstanding" value={gbp(outstanding)} />
              <Stat label="ROI to date" value={`${roi.toFixed(1)}%`} sub="Net profit ÷ capital" dark />
            </div>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                <span>Payback progress</span><span>{gbp(returned)} of {gbp(invested)}</span>
              </div>
              <Bar pct={paybackPct} />
              {upcoming > 0 && <div style={{ fontSize: 12, color: '#D97706', marginTop: 8 }}>{gbp(upcoming)} in statements sent and awaiting payment</div>}
            </div>
            <div style={{ ...grid, marginBottom: 16 }}>
              <Stat label="Guest Revenue" value={gbp(revenue)} />
              <Stat label="Your Share (60%)" value={gbp(ownerShare)} />
              <Stat label="Expenses" value={gbp(expenses)} />
              <Stat label="Net Profit" value={gbp(netProfit)} />
            </div>
            <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Full property detail</div>
                <div style={{ fontSize: 13, color: '#667085' }}>Bookings, calendar, maintenance, statements and messages.</div>
              </div>
              <a href="/owner-portal" style={btnGold}>Open Owner Portal →</a>
            </div>
          </>
        )}

        {inv && investorTab === 'Investments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {properties.length === 0 && <div style={{ ...card, fontSize: 13, color: '#98A2B3' }}>No properties linked to your account yet.</div>}
            {properties.map(p => {
              const s = propertyStats(p)
              const onboarding = s.stage < TOTAL_STAGES
              return (
                <div key={p.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#667085' }}>{p.address ?? ''}</div>
                    </div>
                    <Pill status={onboarding ? 'onboarding' : 'live'} label={onboarding ? 'Onboarding' : 'Live'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, fontSize: 12, marginBottom: 12 }}>
                    <div><div style={{ color: '#667085' }}>Guest revenue</div><div style={{ fontWeight: 700, fontSize: 14 }}>{gbp(s.rev)}</div></div>
                    <div><div style={{ color: '#667085' }}>Your share</div><div style={{ fontWeight: 700, fontSize: 14 }}>{gbp(s.share)}</div></div>
                    <div><div style={{ color: '#667085' }}>Bookings</div><div style={{ fontWeight: 700, fontSize: 14 }}>{s.count}</div></div>
                    <div><div style={{ color: '#667085' }}>Occupancy (90d)</div><div style={{ fontWeight: 700, fontSize: 14 }}>{s.occ}%</div></div>
                  </div>
                  {onboarding && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#667085', marginBottom: 4 }}>
                        <span>Onboarding</span><span>{s.stage} of {TOTAL_STAGES} steps</span>
                      </div>
                      <Bar pct={(s.stage / TOTAL_STAGES) * 100} />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {inv && investorTab === 'Payouts' && (
          <div style={card}>
            <div style={{ ...grid, marginBottom: 16 }}>
              <Stat label="Paid to you" value={gbp(returned)} />
              <Stat label="Awaiting payment" value={gbp(upcoming)} />
            </div>
            {statements.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>No statements yet.</div>}
            {statements.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #F2F4F7', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.property_name ?? 'Statement'}</div>
                  <div style={{ fontSize: 12, color: '#667085' }}>
                    {new Date(s.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(s.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}Gross {gbp(Number(s.gross_revenue) || 0)} · Fee {gbp(Number(s.management_fee) || 0)} · Expenses {gbp(Number(s.expenses) || 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800 }}>{gbp(Number(s.owner_amount) || 0)}</div>
                  <Pill status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
