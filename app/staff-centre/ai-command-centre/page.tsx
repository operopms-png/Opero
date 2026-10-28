'use client'
// Staff Centre → Dashboard → AI Command Centre.
// Shows the AI agents set up in ai_staff (the Grok bots), their status, what
// they do and when they hand over to a person, plus the Ask Grok panel.
// Only real data is shown: anything not yet connected says so instead of a number.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '../../../lib/supabase'
import GrokPanel from '../../../components/GrokPanel'

const C = { ink: '#191815', navy: '#1B2F6E', blue: '#89CFF0', muted: '#667085', line: '#E4E7EC', bg: '#F5F7FB', green: '#067647', greenBg: '#ECFDF3', amber: '#B54708', amberBg: '#FFFAEB', grey: '#667085', greyBg: '#F2F4F7' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 12 }

type Agent = {
  id: string
  name: string
  job_role: string
  responsibilities: string | null
  escalation: string | null
  access: string | null
  status: 'active' | 'not_set_up' | 'paused'
  grok_bot: string | null
  created_at?: string
}

const STATUS: Record<Agent['status'], { label: string; fg: string; bg: string }> = {
  active: { label: 'Active', fg: C.green, bg: C.greenBg },
  paused: { label: 'Paused', fg: C.amber, bg: C.amberBg },
  not_set_up: { label: 'Not set up', fg: C.grey, bg: C.greyBg },
}

const ACTIONS = [
  { href: '/staff-centre/ask-grok', title: 'Ask the AI', desc: 'Instant answers from your records', color: C.navy },
  { href: '/staff-centre/client-properties', title: 'Find Properties', desc: 'Search and review your properties', color: '#2F6DB5' },
  { href: '/invest', title: 'Run a Deal Analysis', desc: 'Check returns, costs and risks', color: '#7A4FB0' },
  { href: '/reports', title: 'Create a Report', desc: 'Financial and operational reports', color: '#138A62' },
]

export default function AICommandCentre() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [agentError, setAgentError] = useState('')
  const [propertyCount, setPropertyCount] = useState<number | null>(null)
  const [propertyError, setPropertyError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.from('ai_staff').select('*').order('created_at', { ascending: true })
      if (cancelled) return
      if (error) setAgentError(error.message)
      setAgents((data ?? []) as Agent[])
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setPropertyError('Not signed in'); return }
        const uid = await getAccountId(user)
        const { count, error: pErr } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', uid)
        if (cancelled) return
        if (pErr) setPropertyError(pErr.message); else setPropertyCount(count ?? 0)
      } catch (e: any) {
        if (!cancelled) setPropertyError(e?.message || 'Could not load properties')
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const activeCount = (agents ?? []).filter(a => a.status === 'active').length
  const online = activeCount > 0

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Figtree, Arial, sans-serif', color: C.ink }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.navy }}>AI Command Centre</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted }}>Your AI-powered real estate operations hub. Get insights, take action and stay in control.</p>
        </div>
        <div style={{ ...card, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: online ? '#12B76A' : '#98A2B3' }} />
          {agents === null ? 'Checking agents…' : online ? `${activeCount} AI agent${activeCount === 1 ? '' : 's'} working in the background` : 'No AI agents active'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
        {ACTIONS.map(a => (
          <Link key={a.title} href={a.href} style={{ ...card, padding: 16, textDecoration: 'none', color: C.ink, borderLeft: `4px solid ${a.color}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: a.color }}>{a.title}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{a.desc}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Total Properties" value={propertyCount} error={propertyError} />
        <Kpi label="Active Leads" value={null} note="Not connected yet" />
        <Kpi label="Monthly Revenue" value={null} note="Not connected yet" />
        <Kpi label="Occupancy Rate" value={null} note="Not connected yet" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>AI Agents</div>
            <Link href="/settings" style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>Manage in Settings</Link>
          </div>
          {agents === null && <div style={{ color: C.muted, fontSize: 14 }}>Loading agents…</div>}
          {agentError && <div style={{ color: '#B42318', fontSize: 14 }}>Could not load agents: {agentError}</div>}
          {agents !== null && !agentError && agents.length === 0 && (
            <div style={{ color: C.muted, fontSize: 14, padding: '18px 0' }}>No AI agents set up yet. Add them under Settings → Team Management.</div>
          )}
          {(agents ?? []).map(a => {
            const s = STATUS[a.status] ?? STATUS.not_set_up
            return (
              <div key={a.id} style={{ border: '1px solid ' + C.line, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name} <span style={{ fontWeight: 400, color: C.muted, fontSize: 13 }}>· {a.job_role}</span></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 10px', borderRadius: 999 }}>{s.label}</span>
                </div>
                {a.responsibilities && <div style={{ fontSize: 13, color: C.ink, marginTop: 8 }}><strong>Does:</strong> {a.responsibilities}</div>}
                {a.escalation && <div style={{ fontSize: 13, color: C.ink, marginTop: 4 }}><strong>Hands over to a person when:</strong> {a.escalation}</div>}
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{a.grok_bot ? `Grok bot: ${a.grok_bot}` : 'No Grok bot linked'}</div>
              </div>
            )
          })}
        </div>

        <div>
          <GrokPanel />
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, note, error }: { label: string; value: number | null; note?: string; error?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: C.navy }}>
        {value !== null ? value.toLocaleString('en-GB') : '—'}
      </div>
      <div style={{ fontSize: 12, color: error ? '#B42318' : C.muted, marginTop: 4 }}>{error ? `Could not load: ${error}` : note ?? ''}</div>
    </div>
  )
}
