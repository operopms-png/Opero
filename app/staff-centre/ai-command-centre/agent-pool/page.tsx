'use client'
// Staff Centre → Dashboard → AI Command Centre → Agent Pool.
// Shows each AI agent (ai_staff) as a node with its status, what it does and
// when it hands over to a person. Charts with no data yet say so.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../lib/supabase'

const NAVY = '#1B2F6E', BLUE = '#2F6DB5', LIGHT = '#89CFF0', INK = '#101828', MUTED = '#667085', LINE = '#D9E2F0', BG = '#F5F7FB'
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#067647', bg: '#ECFDF3' },
  paused: { label: 'Paused', color: '#B54708', bg: '#FFFAEB' },
  not_set_up: { label: 'Not set up', color: MUTED, bg: '#F2F4F7' },
}
type Agent = { id: string; name: string; job_role: string; status: 'active' | 'not_set_up' | 'paused'; responsibilities: string | null; escalation: string | null; grok_bot: string | null }
const TABS = [['Agent Pool', '/staff-centre/ai-command-centre/agent-pool'], ['Dashboard', '/staff-centre/ai-command-centre']]

export default function AgentPool() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('ai_staff').select('id,name,job_role,status,responsibilities,escalation,grok_bot').order('created_at', { ascending: true })
      .then(({ data, error }) => { if (error) setError(error.message); setAgents((data ?? []) as Agent[]) })
  }, [])

  const open = (agents ?? []).find(a => a.id === openId) ?? null
  const counts = { active: 0, paused: 0, not_set_up: 0 }
  ;(agents ?? []).forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1 })

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '20px 24px', fontFamily: 'Figtree, Arial, sans-serif', color: INK }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>AI Workflow Orchestration</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {TABS.map(([label, href]) => (
            <Link key={label} href={href} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: label === 'Agent Pool' ? NAVY : MUTED, background: label === 'Agent Pool' ? '#E3F4FC' : '#fff', border: `1px solid ${LINE}` }}>{label}</Link>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: MUTED }}>
          {counts.active} active · {counts.paused} paused · {counts.not_set_up} not set up
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 14, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, minHeight: 520 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>AI Task Automation Metrics · Agent Pool</div>
          {agents === null && <div style={{ color: MUTED, fontSize: 14 }}>Loading agents…</div>}
          {error && <div style={{ color: '#B42318', fontSize: 14 }}>Could not load agents: {error}</div>}
          {agents !== null && !error && agents.length === 0 && (
            <div style={{ color: MUTED, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No AI agents in the pool yet. Add them under Settings → Team Management.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
            {(agents ?? []).map(a => {
              const s = STATUS[a.status] ?? STATUS.not_set_up
              const selected = a.id === openId
              return (
                <button key={a.id} onClick={() => setOpenId(selected ? null : a.id)} style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: selected ? '#E3F4FC' : '#fff', border: `1px solid ${selected ? BLUE : LINE}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{a.name.slice(0, 1).toUpperCase()}</div>
                  <div style={{ fontWeight: 700, marginTop: 10, fontSize: 14 }}>{a.name}</div>
                  <div style={{ color: MUTED, fontSize: 12 }}>{a.job_role}</div>
                  <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '2px 9px', borderRadius: 999 }}>{s.label}</span>
                </button>
              )
            })}
          </div>

          {open && (
            <div style={{ marginTop: 16, border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, background: BG }}>
              <div style={{ fontWeight: 700 }}>{open.name}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}><strong>Does:</strong> {open.responsibilities || 'Not described yet'}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}><strong>Hands over to a person when:</strong> {open.escalation || 'Not described yet'}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{open.grok_bot ? `Grok bot: ${open.grok_bot}` : 'No Grok bot linked'}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {['Task Throughput', 'Agent Efficiency', 'Error Rate', 'Collaborative Output'].map(t => (
            <div key={t} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t}</div>
              <div style={{ color: MUTED, fontSize: 12, padding: '22px 0', textAlign: 'center' }}>No task data connected yet</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
