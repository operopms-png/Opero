'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Partners Dashboard
// ------------------
// Every Vacation Rentals owner (owner_profiles) is automatically an investor
// partner — there is no separate sign-up. Owners land here after sign-in,
// see their capital, payback and payouts, and open their Owner Portal for
// the day-to-day property detail. Staff (no owner_profiles row) see every
// investor at once.
//
// Figures deliberately mirror /owner-portal so both pages always agree:
// owner share = 60% of guest revenue (MGMT_FEE 40%), capital returned =
// paid owner_statements, invested = owner_profiles.invested.

const MGMT_FEE = 0.40
const GOLD = '#C9A84C'
const INK = '#1A1A1A'
const CREAM = '#FBF4E6'
const TOTAL_STAGES = 10

type Tab = 'Overview' | 'Investments' | 'Payouts'
const TABS: Tab[] = ['Overview', 'Investments', 'Payouts']

const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

function Stat({ label, value, sub, dark }: { label: string; value: string; sub?: string; dark?: boolean }) {
  return (
    <div style={{ background: dark ? INK : '#fff', border: `1px solid ${dark ? INK : '#E4E7EC'}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: dark ? GOLD : '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: dark ? '#fff' : '#101828' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: dark ? '#98A2B3' : '#98A2B3', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Pill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: ['#D1FAE5', '#059669'], sent: ['#FEF3C7', '#D97706'], draft: ['#F3F4F6', '#6B7280'],
    live: ['#D1FAE5', '#059669'], active: ['#D1FAE5', '#059669'], onboarding: ['#FEF3C7', '#D97706'],
  }
  const [bg, color] = map[(status ?? '').toLowerCase()] ?? ['#F3F4F6', '#6B7280']
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: bg, color, textTransform: 'capitalize' }}>{status || '—'}</span>
}

function PaybackBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 8, background: '#F2F4F7', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: 8, width: `${Math.min(100, pct)}%`, background: GOLD, borderRadius: 4 }} />
    </div>
  )
}

function nightsBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

export default function PartnersPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Overview')
  const [isStaff, setIsStaff] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [finance, setFinance] = useState<any[]>([])
  const [allOwners, setAllOwners] = useState<any[]>([])
  const [allStatements, setAllStatements] = useState<any[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/partners'; return }

      const { data: owner } = await supabase.from('owner_profiles').select('*').eq('user_id', user.id).single()
      if (owner) {
        setProfile(owner)
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
      } else {
        setIsStaff(true)
        const [o, s] = await Promise.all([
          supabase.from('owner_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('owner_statements').select('owner_id, owner_amount, status'),
        ])
        setAllOwners(o.data ?? [])
        setAllStatements(s.data ?? [])
      }
      setLoading(false)
    }
    init()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
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
    const occ = Math.min(100, Math.round((nights / 90) * 100))
    const stage = Number(p.staging_stage) || 0
    return { rev, count: pb.length, occ, stage, share: rev * (1 - MGMT_FEE) }
  }

  // ---------- Staff figures ----------
  function ownerTotals(o: any) {
    const inv = Number(o.invested) || 0
    const ret = allStatements.filter(s => s.owner_id === o.id && s.status === 'paid').reduce((sum, s) => sum + (Number(s.owner_amount) || 0), 0)
    return { inv, ret, out: Math.max(0, inv - ret), pct: inv > 0 ? (ret / inv) * 100 : 0 }
  }
  const staffInvested = allOwners.reduce((s, o) => s + ownerTotals(o).inv, 0)
  const staffReturned = allOwners.reduce((s, o) => s + ownerTotals(o).ret, 0)

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 20 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }
  const btnGold: React.CSSProperties = { background: GOLD, color: INK, border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontFamily: "'Poppins', 'Inter', sans-serif" }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif", color: '#101828' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: INK, padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Partners</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>{isStaff ? 'Investors' : `Welcome, ${profile?.name?.split(' ')[0] ?? 'Partner'}`}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="/owner-portal" style={btnGold}>Owner Portal →</a>
            <button onClick={signOut} style={{ background: 'transparent', color: '#FBF4E6', border: '1px solid #3A3A3A', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* ================= STAFF VIEW ================= */}
        {isStaff && (
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
                  return (
                    <div key={o.id} style={{ border: '1px solid #EAECF0', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{o.name ?? 'Unnamed owner'}</div>
                          <div style={{ fontSize: 12, color: '#667085' }}>{o.email ?? '—'} · {(o.property_ids ?? []).length} propert{(o.property_ids ?? []).length === 1 ? 'y' : 'ies'} · {o.user_id ? 'Can sign in' : 'No login yet'}</div>
                        </div>
                        <a href="/owner-portal" style={{ ...btnGold, padding: '7px 12px', fontSize: 12 }}>Manage in Owner Portal</a>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, marginBottom: 8 }}>
                        <div><div style={{ color: '#667085' }}>Invested</div><div style={{ fontWeight: 700 }}>{gbp(t.inv)}</div></div>
                        <div><div style={{ color: '#667085' }}>Returned</div><div style={{ fontWeight: 700 }}>{gbp(t.ret)}</div></div>
                        <div><div style={{ color: '#667085' }}>Outstanding</div><div style={{ fontWeight: 700 }}>{gbp(t.out)}</div></div>
                      </div>
                      <PaybackBar pct={t.pct} />
                      <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>{t.inv > 0 ? `${t.pct.toFixed(0)}% paid back` : 'Set capital invested in Owner Portal → ROI Per Owner'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ================= INVESTOR VIEW ================= */}
        {!isStaff && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 16px', borderRadius: 20, border: `1px solid ${tab === t ? INK : '#E4E7EC'}`, background: tab === t ? INK : '#fff', color: tab === t ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t}</button>
              ))}
            </div>

            {tab === 'Overview' && (
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
                  <PaybackBar pct={paybackPct} />
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

            {tab === 'Investments' && (
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
                        <Pill status={onboarding ? 'onboarding' : (p.status ?? 'live')} />
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
                          <PaybackBar pct={(s.stage / TOTAL_STAGES) * 100} />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'Payouts' && (
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
          </>
        )}
      </div>
    </div>
  )
}
