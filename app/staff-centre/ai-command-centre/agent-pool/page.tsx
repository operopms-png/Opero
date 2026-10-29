'use client'
// Staff Centre → Dashboard → AI Command Centre → Agent Pool.
// Layout copied from the reference: a node panel on the left and four metric
// cards on the right, in the light NOVOURQ palette. Each agent (ai_staff) is a
// node. Metric charts show "No task data connected yet" until real figures exist.
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
const METRICS = ['Task Throughput', 'Agent Efficiency', 'Error Rate', 'Collaborative Output']

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
  const rows = Math.max(1, Math.ceil((agents?.length ?? 0) / 3))
  const canvasH = Math.max(380, rows * 150 + 60)

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '20px 24px', fontFamily: 'Figtree, Arial, sans-serif', color: INK }}>
      <style>{`.ao-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
        @media (max-width:800px){.ao-grid{grid-template-columns:minmax(0,1fr)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: NAVY }}>AI Workflow Orchestration</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(([label, href]) => (
            <Link key={label} href={href} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: label === 'Agent Pool' ? NAVY : MUTED, background: label === 'Agent Pool' ? '#E3F4FC' : '#fff', border: `1px solid ${label === 'Agent Pool' ? LIGHT : LINE}` }}>{label}</Link>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: MUTED }}>
          {counts.active} active · {counts.paused} paused · {counts.not_set_up} not set up
        </div>
      </div>

      <div className="ao-grid">
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>AI Task Automation Metrics</div>
          {agents === null && <div style={{ color: MUTED, fontSize: 14 }}>Loading agents…</div>}
          {error && <div style={{ color: '#B42318', fontSize: 14 }}>Could not load agents: {error}</div>}
          {agents !== null && !error && agents.length === 0 && (
            <div style={{ color: MUTED, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No AI agents in the pool yet. Add them under Settings → Team Management.</div>
          )}

          {agents !== null && agents.length > 0 && (
            <div style={{ position: 'relative', height: canvasH, borderRadius: 10, background: 'linear-gradient(180deg,#F8FBFF 0%,#EEF5FC 100%)', backgroundImage: `radial-gradient(${LINE} 1px, transparent 1px)`, backgroundSize: '22px 22px', overflow: 'hidden' }}>
              {agents.map((a, i) => {
                const col = i % 3, row = Math.floor(i / 3)
                const left = `${16 + col * 30 + (row % 2) * 7}%`
                const top = 40 + row * 150
                const s = STATUS[a.status] ?? STATUS.not_set_up
                const selected = a.id === openId
                return (
                  <button key={a.id} onClick={() => setOpenId(selected ? null : a.id)} title={a.job_role}
                    style={{ position: 'absolute', left, top, transform: 'translateX(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', padding: 0 }}>
                    <div style={{ width: 66, height: 66, margin: '0 auto', borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${LIGHT} 70%, ${BLUE} 100%)`, boxShadow: selected ? `0 0 0 4px ${LIGHT}, 0 6px 18px rgba(27,47,110,.25)` : '0 6px 14px rgba(27,47,110,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY, fontWeight: 700, fontSize: 22 }}>
                      {a.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{a.name}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{a.job_role}</div>
                  </button>
                )
              })}
            </div>
          )}

          {open && (
            <div style={{ marginTop: 16, border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, background: BG }}>
              <div style={{ fontWeight: 700 }}>{open.name} <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: STATUS[open.status]?.color ?? MUTED, background: STATUS[open.status]?.bg ?? '#F2F4F7', padding: '2px 9px', borderRadius: 999 }}>{(STATUS[open.status] ?? STATUS.not_set_up).label}</span></div>
              <div style={{ fontSize: 13, marginTop: 6 }}><strong>Does:</strong> {open.responsibilities || 'Not described yet'}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}><strong>Hands over to a person when:</strong> {open.escalation || 'Not described yet'}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{open.grok_bot ? `Grok bot: ${open.grok_bot}` : 'No Grok bot linked'}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          {METRICS.map(t => (
            <div key={t} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t}</div>
                <div style={{ color: MUTED, fontSize: 14, lineHeight: 1 }}>⋮</div>
              </div>
              <div style={{ position: 'relative', height: 110, marginTop: 10, borderLeft: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 27px, ${LINE} 27px, ${LINE} 28px)` }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 12 }}>No task data connected yet</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, marginTop: 4 }}><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
