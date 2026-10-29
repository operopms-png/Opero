'use client'
// Staff Centre → Dashboard → AI Command Centre.
// Copies the supplied reference dashboard layout and colours. Figures come from
// the records where they exist; anything not yet connected says so.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '../../../lib/supabase'
import GrokPanel from '../../../components/GrokPanel'
import PropertyLocationsPanel from '../../../components/ai/PropertyLocationsPanel'
import { staffApi, money } from '../../../lib/staff-api'

const BG = '#F5F7FB', PANEL = '#FFFFFF', LINE = '#D9E2F0', CYAN = '#1B2F6E', BLUE = '#2F6DB5'
const GREEN = '#12B76A', PURPLE = '#7A4FB0', MUTED = '#667085', TXT = '#101828'
const panel: React.CSSProperties = { background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, minWidth: 0 }
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
  const [ops, setOps] = useState<any>(null)
  const [fin, setFin] = useState<any>(null)
  const [dash, setDash] = useState<any>(null)
  const [cards, setCards] = useState<any>(null)
  const [cardsErr, setCardsErr] = useState('')
  const [dashErr, setDashErr] = useState('')
  const [finErr, setFinErr] = useState('')
  const [opsErr, setOpsErr] = useState('')
  const [now, setNow] = useState(new Date())
  useEffect(() => { staffApi('/api/command-centre/operations').then(setOps).catch(e => setOpsErr(e.message)) }, [])
  useEffect(() => { staffApi('/api/finance').then(setFin).catch(e => setFinErr(e.message)) }, [])
  useEffect(() => { staffApi('/api/command-centre/cards').then(setCards).catch(e => setCardsErr(e.message)) }, [])
  useEffect(() => { staffApi('/api/staff-dashboard?range=today').then(setDash).catch(e => setDashErr(e.message)) }, [])
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', minHeight: 'calc(100vh - 80px)' }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 10 }}>
            {([
              ['Maintenance', '/staff-centre/maintenance', ops ? `${ops.open} open` : '—', ops ? `${ops.urgent} urgent` : ''],
              ['Cleaning', '/cleaning', ops ? `${ops.pending} pending` : '—', ops ? `${ops.overdue} overdue` : ''],
              ['Turnovers', '/turnovers', ops ? `${ops.upcoming} in next 7 days` : '—', ''],
              ['Compliance', '/staff-centre/compliance', ops ? `${ops.expired} expired` : '—', ops ? `${ops.expiring} expiring in 30 days` : ''],
            ] as [string, string, string, string][]).map(([label, href, big, sub]) => (
              <Link key={label} href={href} style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}>
                <div style={{ color: MUTED, fontSize: 12 }}>{label} →</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{big}</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{opsErr ? 'Could not load' : sub}</div>
              </Link>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Total Properties</div><div style={{ fontSize: 26, fontWeight: 800 }}>{propCount ?? '—'}</div><div style={{ color: MUTED, fontSize: 11 }}>Active properties</div></div>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Active Leads</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cards ? cards.leads.active : '—'}</div><div style={{ color: MUTED, fontSize: 11 }}>{cardsErr ? 'Could not load' : cards ? 'Open leads in the sales pipeline' : 'Loading…'}</div></div>
            <Link href="/staff-centre/finance" style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}><div style={{ color: MUTED, fontSize: 12 }}>Monthly Revenue →</div><div style={{ fontSize: 26, fontWeight: 800 }}>{fin ? money(fin.moneyIn, 'GBP') : '—'}</div><div style={{ color: MUTED, fontSize: 11 }}>{finErr ? 'Could not load' : fin ? `Profit ${money(fin.profit, 'GBP')} this month` : 'Loading…'}</div></Link>
            <div style={panel}><div style={{ color: MUTED, fontSize: 12 }}>Occupancy Rate</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cards?.occupancy?.pct != null ? `${cards.occupancy.pct}%` : '—'}</div><div style={{ color: MUTED, fontSize: 11 }}>{cardsErr ? 'Could not load' : cards ? `${cards.occupancy.occupied} of ${cards.occupancy.units} units occupied` : 'Loading…'}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, alignItems: 'start' }}>
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
              {fin ? (() => {
                const max = Math.max(1, ...fin.trend.flatMap((t: any) => [t.in, t.out]))
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, borderBottom: `1px solid ${LINE}` }}>
                      {fin.trend.map((t: any) => (
                        <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                            <div title={`In ${money(t.in, 'GBP')}`} style={{ width: 10, height: `${(t.in / max) * 100}%`, background: BLUE, borderRadius: '3px 3px 0 0' }} />
                            <div title={`Out ${money(t.out, 'GBP')}`} style={{ width: 10, height: `${(t.out / max) * 100}%`, background: LINE, borderRadius: '3px 3px 0 0' }} />
                          </div>
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{t.month.slice(5)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MUTED, marginTop: 8 }}><span style={{ color: BLUE }}>■ Money in</span><span>■ Money out</span></div>
                  </div>
                )
              })() : <NotConnected text={finErr ? 'Could not load finance' : 'Loading…'} />}
            </div>
            <PropertyLocationsPanel />
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 300px', gap: 10, alignItems: 'start' }}>
            <Link href="/staff-centre/client-properties" style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}>
              <Head t={`Top Property Opportunities${cards ? ` (${cards.opportunities.count})` : ''} →`} />
              {!cards ? <NotConnected text={cardsErr ? 'Could not load' : 'Loading…'} /> : cards.opportunities.top.length === 0 ? <NotConnected text="No property opportunities yet" /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {cards.opportunities.top.map((o: any) => (
                    <div key={o.id} style={{ fontSize: 12, borderTop: `1px solid ${LINE}`, paddingTop: 6 }}>
                      <b>{o.address || 'Property'}</b>{o.area ? <span style={{ color: MUTED }}> · {o.area}</span> : null}
                      <div style={{ color: MUTED }}>{o.price ? `${o.currency || ''} ${Number(o.price).toLocaleString('en-GB')}${o.rent ? ' / month' : ''}` : 'Price not set'}</div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
            <Link href="/staff-centre/tasks" style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}>
              <Head t={`Upcoming Tasks${cards ? ` (${cards.tasks.dueSoon})` : ''} →`} />
              {!cards ? <NotConnected text={cardsErr ? 'Could not load' : 'Loading…'} /> : cards.tasks.next.length === 0 ? <NotConnected text="No upcoming tasks" /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {cards.tasks.next.map((t: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, borderTop: `1px solid ${LINE}`, paddingTop: 6 }}>
                      <b>{t.title}</b><div style={{ color: MUTED }}>Due {new Date(t.due + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                  ))}
                  {cards.tasks.overdue > 0 && <div style={{ fontSize: 12, color: '#B42318' }}>{cards.tasks.overdue} overdue</div>}
                </div>
              )}
            </Link>
            <Link href="/staff-centre/finance" style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}>
              <Head t="Financial Overview →" />
              {fin ? (
                <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Money in</span><b>{money(fin.moneyIn, 'GBP')}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Money out</span><b>{money(fin.moneyOut, 'GBP')}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Owner payouts due</span><b>{money(fin.payoutsDue, 'GBP')}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Rent roll (per month)</span><b>{money(fin.rentRoll, 'GBP')}</b></div>
                </div>
              ) : <div style={{ color: MUTED, fontSize: 12, padding: '26px 0', textAlign: 'center' }}>{finErr ? 'Could not load finance' : 'Loading…'}</div>}
            </Link>
            <Link href="/staff-centre/inbox" style={{ ...panel, textDecoration: 'none', color: TXT, display: 'block' }}>
              <Head t="Recent Conversations →" />
              {!dash ? <NotConnected text={dashErr ? 'Could not load conversations' : 'Loading…'} /> : (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{dash.hero?.messages?.n ?? 0} <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>{dash.hero?.messages?.sub || 'unread'}</span></div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                    {(dash.activity ?? []).filter((a: any) => a.where === 'Website Chats').slice(0, 4).length === 0
                      ? <div style={{ color: MUTED, fontSize: 12 }}>No recent website chats</div>
                      : (dash.activity ?? []).filter((a: any) => a.where === 'Website Chats').slice(0, 4).map((a: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, borderTop: `1px solid ${LINE}`, paddingTop: 6 }}>{a.text}</div>
                      ))}
                  </div>
                </div>
              )}
            </Link>
          </div>

          <div id="ask-grok" style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Ask Grok</div>
            <GrokPanel />
          </div>
          <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>NOVOURQ · Smart Properties. Stronger Returns. · Jamaica · UK</div>
        </div>
      </div>
    </div>
  )
}
