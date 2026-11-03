'use client'
// Dashboard → "AI at work": how much of the business the AI is running, who is on the team,
// what each area has switched on, and what the AI did most recently. All figures are real:
// /api/ai-overview, /api/ai-workflows, /api/ai-activity and the ai_staff table.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { staffApi } from '../../lib/staff-api'

const K = { ink: '#0f2150', mid: '#34508a', muted: '#5470a8', soft: '#7a8fbd', line: '#e3ecfa', blue: '#2f5bd6', chip: '#eef4ff', chipLine: '#cfe0f7' }
const box: React.CSSProperties = { background: 'rgba(255,255,255,.85)', border: '1px solid rgba(47,91,214,.14)', borderRadius: 16, boxShadow: '0 6px 20px rgba(47,91,214,.08)' }
const head: React.CSSProperties = { margin: '0 0 12px', fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: K.mid, fontWeight: 700 }

function ago(iso?: string | null) {
  if (!iso) return ''
  const m = (Date.now() - new Date(iso).getTime()) / 6e4
  if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`
  const d = Math.round(m / 1440); return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'AI'

export default function DashboardAiPanel() {
  const [ov, setOv] = useState<any>(null)
  const [wf, setWf] = useState<any[] | null>(null)
  const [act, setAct] = useState<any[] | null>(null)
  const [team, setTeam] = useState<any[] | null>(null)

  useEffect(() => {
    staffApi('/api/ai-overview').then(setOv).catch(() => setOv(false))
    staffApi('/api/ai-workflows').then((d: any) => setWf(d.workflows ?? [])).catch(() => setWf([]))
    staffApi('/api/ai-activity').then((d: any) => setAct((d.items ?? []).slice(0, 6))).catch(() => setAct([]))
    supabase.from('ai_staff').select('id,name,job_role,status,last_used_at').order('created_at', { ascending: true })
      .then(({ data }) => setTeam(((data ?? []) as any[]).filter(a => !(a.name === a.job_role)))).then(undefined, () => setTeam([]))
  }, [])

  if (ov === false) return null
  const total = ov?.agentsTotal ?? 0, on = ov?.agentsOn ?? 0
  const pct = total ? Math.round((on / total) * 100) : 0

  // Group the workflows by area for the "Automation by area" box.
  const areas: Record<string, { on: number; n: number; items: any[] }> = {}
  for (const w of wf ?? []) { const a = (areas[w.module] ??= { on: 0, n: 0, items: [] }); a.n++; if (w.on) a.on++; a.items.push(w) }

  const stat = (label: string, value: React.ReactNode, sub: string, href?: string) => {
    const inner = (<><div style={{ fontSize: 12, color: K.muted }}>{label}</div><div style={{ fontSize: 28, fontWeight: 800, color: K.ink, margin: '4px 0 2px', letterSpacing: '-.02em' }}>{value}</div><div style={{ fontSize: 12, color: K.soft }}>{sub}</div></>)
    return href ? <Link href={href} style={{ ...box, padding: 16, textDecoration: 'none', display: 'block' }}>{inner}</Link> : <div style={{ ...box, padding: 16 }}>{inner}</div>
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <style>{`.ai-strip{display:grid;grid-template-columns:1.1fr repeat(4,minmax(0,1fr));gap:12px}
        .ai-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
        .ai-team{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:12px}
        @media(max-width:1000px){.ai-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.ai-strip>:first-child{grid-column:1/-1}}
        @media(max-width:820px){.ai-two{grid-template-columns:1fr}}`}</style>
      <h2 style={{ ...head, color: '#34508a', fontSize: 13 }}>Novourq Cloud AI at work</h2>
      <div className="ai-strip">
        <div style={{ background: 'linear-gradient(135deg,#2f5bd6,#4f7fe8)', color: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 10px 28px rgba(47,91,214,.3)' }}>
          <div style={{ fontSize: 12, color: '#d6e3ff' }}>Novourq Cloud AI skills on</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 8px', letterSpacing: '-.02em' }}>{ov ? `${on} of ${total}` : '…'}</div>
          <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,.28)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: '#fff', borderRadius: 7 }} /></div>
          <div style={{ fontSize: 12, color: '#d6e3ff', marginTop: 8 }}>{ov ? (on < total ? 'skills switched on. Switch on the rest so it works across every area.' : 'skills switched on. Novourq Cloud AI is working across every area.') : ''}</div>
        </div>
        {stat('Waiting for approval', ov ? ov.approvals : '…', ov?.approvals ? 'drafts need a decision' : 'nothing in the queue', '/staff-centre/ai-command-centre/approvals')}
        {stat('Approved and sent', ov ? ov.sent30 : '…', 'in the last 30 days', '/staff-centre/ai-command-centre/results')}
        {stat('Hours saved', ov ? ov.hoursSaved : '…', 'estimated, last 30 days', '/staff-centre/ai-command-centre/results')}
        {stat('AI alerts', ov ? ov.alerts?.length ?? 0 : '…', 'unread from Novourq Cloud AI', '/staff-centre/ai-command-centre/alerts')}
      </div>

      {team && team.length > 0 && (
        <>
          <h2 style={{ ...head, marginTop: 18 }}>How Novourq Cloud AI is set up</h2>
          <div className="ai-team" style={{ marginTop: 0 }}>
            {team.map(a => {
              const live = a.status === 'active'
              return (
                <Link key={a.id} href="/staff-centre/ai-command-centre/agent-pool" style={{ ...box, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none', minWidth: 0 }}>
                  <span style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#dbe9ff,#bcd3fb)', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>
                    {initials(a.name)}
                    <i style={{ position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: 11, background: live ? '#16a34a' : '#94a3b8', border: '2px solid #fff' }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 14, color: K.ink }}>{a.name}</b>
                    <small style={{ display: 'block', fontSize: 12, color: K.muted }}>{a.job_role}</small>
                    <em style={{ display: 'block', fontStyle: 'normal', fontSize: 12, color: K.mid, marginTop: 4 }}>{a.status === 'paused' ? 'Paused' : a.status === 'not_set_up' ? 'Not set up yet' : a.last_used_at ? `Last asked ${ago(a.last_used_at)}` : 'Ready'}</em>
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <div className="ai-two">
        <div style={{ ...box, padding: 18, minWidth: 0 }}>
          <h3 style={head}>Automation by area</h3>
          {wf === null ? <div style={{ fontSize: 13, color: K.soft }}>Loading…</div> : Object.keys(areas).length === 0 ? <div style={{ fontSize: 13, color: K.soft }}>No automations yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(areas).map(([name, a]) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: K.ink, marginBottom: 6, fontWeight: 600 }}><span>{name}</span><span style={{ color: K.blue, fontWeight: 700 }}>{a.on} of {a.n} on</span></div>
                  <div style={{ height: 7, borderRadius: 7, background: '#dbe8fa', overflow: 'hidden' }}><div style={{ width: `${(a.on / a.n) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#2f5bd6,#6c9bff)', borderRadius: 7 }} /></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {a.items.map(w => <span key={w.agent} style={{ fontSize: 11.5, color: w.on ? K.mid : '#8a9bc0', background: w.on ? K.chip : '#f5f7fb', border: `1px ${w.on ? 'solid' : 'dashed'} ${K.chipLine}`, borderRadius: 999, padding: '3px 9px' }}>{w.label.replace(/ \(.*\)$/, '')}</span>)}
                  </div>
                </div>
              ))}
              <Link href="/staff-centre/ai-command-centre/agents" style={{ fontSize: 12.5, color: K.blue, fontWeight: 600, textDecoration: 'none' }}>Manage skills →</Link>
            </div>
          )}
        </div>
        <div style={{ ...box, padding: 18, minWidth: 0 }}>
          <h3 style={head}>What Novourq Cloud AI did</h3>
          {act === null ? <div style={{ fontSize: 13, color: K.soft }}>Loading…</div> : act.length === 0 ? <div style={{ fontSize: 13, color: K.soft }}>No activity yet. Switch on a skill and its work will show here.</div> : act.map((x, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${K.line}` : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 70, flex: 'none', fontSize: 11.5, color: K.soft, paddingTop: 2 }}>{ago(x.at)}</div>
              <div style={{ minWidth: 0, fontSize: 13.5, color: K.ink }}>{x.text}{x.note ? <small style={{ display: 'block', color: '#6b7fae', fontSize: 12 }}>{x.note}</small> : null}</div>
            </div>
          ))}
          <Link href="/staff-centre/ai-command-centre/activity" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, color: K.blue, fontWeight: 600, textDecoration: 'none' }}>Open the activity log →</Link>
        </div>
      </div>
    </div>
  )
}
