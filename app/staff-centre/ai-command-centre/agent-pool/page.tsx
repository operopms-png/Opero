'use client'
// Staff Centre → Dashboard → AI Command Centre → Agent Pool.
// Layout copied from the reference: a node panel on the left and four metric cards on the right,
// in the light NOVOURQ palette. Each agent (ai_staff) is a node. Arrows are drawn only for the
// "Hands over to" links saved in ai_staff_handoffs. Metric charts stay empty until real figures exist.
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase, getAccountId } from '../../../../lib/supabase'

const NAVY = '#1B2F6E', BLUE = '#2F6DB5', LIGHT = '#89CFF0', INK = '#101828', MUTED = '#667085', LINE = '#D9E2F0', BG = '#F5F7FB'
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#067647', bg: '#ECFDF3' },
  paused: { label: 'Paused', color: '#B54708', bg: '#FFFAEB' },
  not_set_up: { label: 'Not set up', color: MUTED, bg: '#F2F4F7' },
}
type Agent = { id: string; name: string; job_role: string; status: 'active' | 'not_set_up' | 'paused'; responsibilities: string | null; escalation: string | null; grok_bot: string | null }
type Handoff = { id: string; from_agent_id: string; to_agent_id: string }
const TABS = [['Agent Pool', '/staff-centre/ai-command-centre/agent-pool'], ['Dashboard', '/staff-centre/ai-command-centre']]
const METRICS = ['Task Throughput', 'Agent Efficiency', 'Error Rate', 'Collaborative Output']
const COLS = 3, NODE_R = 36, ROW_H = 150, TOP = 40

// Node centre in pixels for the given canvas width
const nodePos = (i: number, width: number) => {
  const col = i % COLS, row = Math.floor(i / COLS)
  const x = (16 + col * 30 + (row % 2) * 7) / 100 * width
  const y = TOP + row * ROW_H + 33
  return { x, y }
}

// Which Grok role answers for each agent, by its job role. Anything not listed uses the general assistant.
const ROLE_FOR_JOB: Record<string, string> = {
  'Property Manager': 'property_manager',
  'Finance Director': 'finance_director',
  'Acquisitions': 'acquisitions',
}

// Ask one agent a question. Goes through /api/grok, which answers from the records only
// and cannot change records, send messages or move money.
function AskAgent({ agent }: { agent: Agent }) {
  const [q, setQ] = useState('')
  const [reply, setReply] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const role = ROLE_FOR_JOB[agent.job_role] ?? 'general'

  async function ask() {
    const message = q.trim()
    if (!message || busy) return
    setBusy(true); setErr(''); setReply('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ message, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setErr(data.error ?? 'The agent could not answer.')
      else setReply(data.reply ?? '')
    } catch {
      setErr('The agent could not answer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Ask {agent.name}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder="Ask a question about today's records" maxLength={4000}
          style={{ flex: 1, padding: '8px 10px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={ask} disabled={busy || !q.trim()}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy || !q.trim() ? 0.6 : 1 }}>
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: '#B42318', marginTop: 8 }}>{err}</div>}
      {reply && <div style={{ fontSize: 13, marginTop: 10, whiteSpace: 'pre-wrap', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>{reply}</div>}
    </div>
  )
}

export default function AgentPool() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [width, setWidth] = useState(640)
  const canvasRef = useRef<HTMLDivElement>(null)

  const loadHandoffs = () => supabase.from('ai_staff_handoffs').select('id,from_agent_id,to_agent_id')
    .then(({ data }) => setHandoffs((data ?? []) as Handoff[]))

  useEffect(() => {
    supabase.from('ai_staff').select('id,name,job_role,status,responsibilities,escalation,grok_bot').order('created_at', { ascending: true })
      .then(({ data, error }) => { if (error) setError(error.message); setAgents((data ?? []) as Agent[]) })
    loadHandoffs()
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [agents])

  const open = (agents ?? []).find(a => a.id === openId) ?? null
  const counts = { active: 0, paused: 0, not_set_up: 0 }
  ;(agents ?? []).forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1 })
  const rows = Math.max(1, Math.ceil((agents?.length ?? 0) / COLS))
  const canvasH = Math.max(380, rows * ROW_H + 60)
  const indexOf = (id: string) => (agents ?? []).findIndex(a => a.id === id)

  async function toggleHandoff(toId: string) {
    if (!open) return
    setSaving(true)
    try {
      const existing = handoffs.find(h => h.from_agent_id === open.id && h.to_agent_id === toId)
      if (existing) {
        const { error } = await supabase.from('ai_staff_handoffs').delete().eq('id', existing.id)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not signed in')
        const uid = await getAccountId(user)
        const { error } = await supabase.from('ai_staff_handoffs').insert({ user_id: uid, from_agent_id: open.id, to_agent_id: toId })
        if (error) throw error
      }
      await loadHandoffs()
    } catch (e: any) {
      alert(e.message)
    }
    setSaving(false)
  }

  const outgoing = open ? handoffs.filter(h => h.from_agent_id === open.id) : []

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
            <div ref={canvasRef} style={{ position: 'relative', height: canvasH, borderRadius: 10, background: 'linear-gradient(180deg,#F8FBFF 0%,#EEF5FC 100%)', backgroundImage: `radial-gradient(${LINE} 1px, transparent 1px)`, backgroundSize: '22px 22px', overflow: 'hidden' }}>
              <svg width={width} height={canvasH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <defs>
                  <marker id="ao-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={BLUE} />
                  </marker>
                </defs>
                {handoffs.map(h => {
                  const a = indexOf(h.from_agent_id), b = indexOf(h.to_agent_id)
                  if (a < 0 || b < 0) return null
                  const p = nodePos(a, width), q = nodePos(b, width)
                  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1
                  const ux = dx / len, uy = dy / len
                  return <line key={h.id} x1={p.x + ux * NODE_R} y1={p.y + uy * NODE_R} x2={q.x - ux * (NODE_R + 4)} y2={q.y - uy * (NODE_R + 4)} stroke={BLUE} strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#ao-arrow)" />
                })}
              </svg>
              {agents.map((a, i) => {
                const col = i % COLS, row = Math.floor(i / COLS)
                const left = `${16 + col * 30 + (row % 2) * 7}%`
                const top = TOP + row * ROW_H
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

              <div style={{ fontSize: 13, marginTop: 12, fontWeight: 700 }}>Hands over to another agent</div>
              {(agents ?? []).filter(a => a.id !== open.id).length === 0
                ? <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Add a second agent to link them.</div>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {(agents ?? []).filter(a => a.id !== open.id).map(a => {
                      const on = outgoing.some(h => h.to_agent_id === a.id)
                      return (
                        <button key={a.id} disabled={saving} onClick={() => toggleHandoff(a.id)}
                          style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${on ? BLUE : LINE}`, background: on ? '#E3F4FC' : '#fff', color: on ? NAVY : MUTED }}>
                          {on ? '✓ ' : ''}{a.name}
                        </button>
                      )
                    })}
                  </div>}
              <AskAgent agent={open} />
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
