'use client'
// Staff Centre → Dashboard → AI Command Centre.
// Copies the supplied reference dashboard layout and colours. Figures come from
// the records where they exist; anything not yet connected says so.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '../../../lib/supabase'
import GrokPanel from '../../../components/GrokPanel'

const BG = '#F5F7FB', PANEL = '#FFFFFF', LINE = '#D9E2F0', CYAN = '#1B2F6E', BLUE = '#2F6DB5'
const GREEN = '#12B76A', PURPLE = '#7A4FB0', MUTED = '#667085', TXT = '#101828'
const panel: React.CSSProperties = { background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, minWidth: 0 }
const NAV = [
  ['Dashboard', '/staff-centre/oversight'], ['Properties', '/staff-centre/client-properties'], ['Leads & Acquisitions', '/staff-centre/crm'],
  ['Landlords', '/staff-centre/landlord-leads'], ['Tenants & Bookings', '/staff-centre/receptionist'], ['Maintenance', '/staff-centre/maintenance'],
  ['Finances', '/staff-centre/finance'], ['Reports', '/reports'], ['AI Command Centre', '/staff-centre/ai-command-centre'],
  ['Messages', '/staff-centre/inbox'], ['Calendar', '/staff-centre/calendar'], ['Settings', '/settings'],
]
const ACTIONS = [
  ['Ask the AI', 'Get instant answers or run an analysis', '#ask-grok', CYAN],
  ['Find Properties', 'Search and qualify new opportunities', '/staff-centre/client-properties', GREEN],
  ['Run a Deal Analysis', 'Check returns, costs and risks', '/invest', PURPLE],
  ['Create a Report', 'Financial, operational or custom', '/reports', BLUE],
]
type Agent = { id: string; name: string; job_role: string; status: 'active' | 'not_set_up' | 'paused'; responsibilities: string | null }

function Head({ t, right }: { t: string; right?: React.ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontWeight: 700, fontSize: 14, color: TXT }}>{t}</div>{right}</div>
}
function NotConnected({ text = 'Not connected yet' }: { text?: string }) {
  return <div style={{ color: MUTED, fontSize: 12, padding: '26px 0', textAlign: 'center' }}>{text}</div>
}

export default function AICommandCentre() {
  const [userName, setUserName] = useState('')
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [propCount, setPropCount] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())
  const [q, setQ] = useState('')

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!live) return
      if (user) setUserName((user.user_metadata?.full_name as string) || user.email || '')
      const { data } = await supabase.from('ai_staff').select('id,name,job_role,status,responsibilities').order('created_at', { ascending: true })
      if (live) setAgents((data ?? []) as Agent[])
      if (user) {
        const uid = await getAccountId(user)
        const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', uid)
        if (live) setPropCount(count ?? 0)
      }
    })()
    return () => { live = false }
  }, [])

  const online = (agents ?? []).some(a => a.status === 'active')
  const dt = now.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: BG, color: TXT, minHeight: '100vh', fontFamily: 'Figtree, Arial, sans-serif', fontSize: 13 }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 210 }}>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: .5, color: TXT }}>NOVOURQ</div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1 }}>REAL ESTATE · JAMAICA & UK</div>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search properties, landlords, tenants, deals, or ask the AI..."
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) window.location.href = `/staff-centre/ask-grok` }}
          style={{ flex: 1, maxWidth: 620, padding: '9px 14px', borderRadius: 8, border: `1px solid ${LINE}`, background: PANEL, color: TXT, fontSize: 13, fontFamily: 'inherit' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</span>
          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{userName || 'Signed in'}</div><div style={{ color: MUTED, fontSize: 11 }}>Staff</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 18px', fontSize: 11, color: MUTED }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: online ? GREEN : '#667085' }} />
        AI Command Centre {online ? 'Online' : 'Offline'}
        <span style={{ marginLeft: 'auto' }}>{dt}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', minHeight: 'calc(100vh - 80px)' }}>
        {/* sidebar */}
        <nav style={{ borderRight: `1px solid ${LINE}`, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(([label, href]) => {
            const active = label === 'AI Command Centre'
            return (
              <Link key={label} href={href} style={{ padding: '9px 12px', borderRadius: 8, color: active ? CYAN : MUTED, background: active ? '#E3F4FC' : 'transparent', textDecoration: 'none', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                {label}
                {label === 'AI Command Centre' && <span style={{ fontSize: 10, background: GREEN, color: '#fff', borderRadius: 999, padding: '1px 7px' }}>New</span>}
              </Link>
            )
          })}
          <div style={{ marginTop: 'auto', borderRadius: 12, padding: 16, background: 'linear-gradient(160deg,#1B2F6E,#2F6DB5)', textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
            Build Wealth<br />Through Property
            <div style={{ fontSize: 11, marginTop: 8, letterSpacing: 2 }}>NOVOURQ</div>
          </div>
        </nav>

        {/* main */}
        <div style={{ padding: 16, display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>AI Command Centre</div>
              <div style={{ color: MUTED, fontSize: 12 }}>Your AI-powered real estate operations hub. Get insights, take action and stay in control.</div>
            </div>
            <div style={{ color: MUTED, fontSize: 12, maxWidth: 260 }}>Your AI agents are working behind the scenes to keep your business moving forward.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            {ACTIONS.map(([t, d, href, c]) => (
              <Link key={t} href={href} style={{ ...panel, textDecoration: 'none', color: TXT, borderColor: c }}>
                <div style={{ fontWeight: 700, color: c }}>{t}</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{d}</div>
              </Link>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Total Properties</div><div style={{ fontSize: 26, fontWeight: 800 }}>{propCount ?? '—'}</div><div style={{ color: MUTED, fontSize: 11 }}>Active properties</div></div>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Active Leads</div><div style={{ fontSize: 26, fontWeight: 800 }}>—</div><div style={{ color: MUTED, fontSize: 11 }}>Not connected yet</div></div>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Monthly Revenue</div><div style={{ fontSize: 26, fontWeight: 800 }}>—</div><div style={{ color: MUTED, fontSize: 11 }}>Not connected yet</div></div>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Occupancy Rate</div><div style={{ fontSize: 26, fontWeight: 800 }}>—</div><div style={{ color: MUTED, fontSize: 11 }}>Not connected yet</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 300px', gap: 10, alignItems: 'start' }}>
            <div style={panel}>
              <Head t="AI Agent Activity" right={<Link href="/settings" style={{ color: CYAN, fontSize: 11 }}>View all</Link>} />
              {agents === null && <NotConnected text="Loading agents…" />}
              {agents !== null && agents.length === 0 && <NotConnected text="No AI agents set up yet" />}
              {(agents ?? []).map(a => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ color: CYAN, fontWeight: 600 }}>{a.name} <span style={{ color: a.status === 'active' ? GREEN : MUTED, fontSize: 11 }}>· {a.status === 'active' ? 'Live' : a.status === 'paused' ? 'Paused' : 'Not set up'}</span></div>
                  <div style={{ color: MUTED, fontSize: 11 }}>{a.responsibilities ?? a.job_role}</div>
                </div>
              ))}
            </div>
            <div style={panel}>
              <Head t="Portfolio Performance" right={<span style={{ color: MUTED, fontSize: 11 }}>Last 30 days</span>} />
              <NotConnected text="No revenue or expense data connected yet" />
            </div>
            <div style={panel}>
              <Head t="Property Locations" right={<span style={{ color: MUTED, fontSize: 11 }}>Jamaica · UK</span>} />
              <svg viewBox="0 0 200 110" style={{ width: '100%', height: 120 }}>
                <path d="M10 60 Q40 40 80 48 Q120 36 160 50 Q190 58 186 66 Q160 78 120 74 Q80 84 40 76 Q14 74 10 60Z" fill="#DCEBFA" stroke={BLUE} strokeOpacity=".6" />
              </svg>
              <NotConnected text="No property locations to show" />
            </div>
            <div id="ask-grok" style={{ minWidth: 0 }}>
              <GrokPanel />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 300px', gap: 10, alignItems: 'start' }}>
            <div style={panel}><Head t="Top Property Opportunities" /><NotConnected text="No property opportunities yet" /></div>
            <div style={panel}><Head t="Upcoming Tasks" /><NotConnected text="No upcoming tasks" /></div>
            <div style={panel}><Head t="Financial Overview" /><NotConnected text="No financial data connected yet" /></div>
            <div style={panel}><Head t="Recent Conversations" /><NotConnected text="No recent conversations" /></div>
          </div>

          <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>NOVOURQ · Smart Properties. Stronger Returns. · Jamaica · UK</div>
        </div>
      </div>
    </div>
  )
}
