'use client'
// Dashboard → "AI at work": how much of the business the AI is running, who is on the team,
// what each area has switched on, and what the AI did most recently. All figures are real:
// /api/ai-overview, /api/ai-workflows, /api/ai-activity and the ai_staff table.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '../../lib/staff-api'
import AiMark from './AiMark'

const K = { ink: '#0f2150', mid: '#34508a', muted: '#5470a8', soft: '#7a8fbd', line: '#e3ecfa', blue: '#2f5bd6', chip: '#eef4ff', chipLine: '#cfe0f7' }
const box: React.CSSProperties = { background: 'rgba(255,255,255,.85)', border: '1px solid rgba(47,91,214,.14)', borderRadius: 16, boxShadow: '0 6px 20px rgba(47,91,214,.08)' }
const head: React.CSSProperties = { margin: '0 0 12px', fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: K.mid, fontWeight: 700 }

function ago(iso?: string | null) {
  if (!iso) return ''
  const m = (Date.now() - new Date(iso).getTime()) / 6e4
  if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`
  const d = Math.round(m / 1440); return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function DashboardAiPanel({ mapSlot, portfolioSlot }: { mapSlot?: React.ReactNode; portfolioSlot?: React.ReactNode }) {
  const [ov, setOv] = useState<any>(null)
  const [wf, setWf] = useState<any[] | null>(null)
  const [act, setAct] = useState<any[] | null>(null)
  const [lb, setLb] = useState<any[] | null>(null)

  useEffect(() => {
    staffApi('/api/ai-overview').then(setOv).catch(() => setOv(false))
    staffApi('/api/ai-workflows').then((d: any) => setWf(d.workflows ?? [])).catch(() => setWf([]))
    staffApi('/api/agent-leaderboard').then((d: any) => setLb(d.agents ?? [])).catch(() => setLb([]))
    staffApi('/api/ai-activity').then((d: any) => setAct((d.items ?? []).slice(0, 6))).catch(() => setAct([]))
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

  const automationBox = (
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
  )

  // Agent leaderboard: the staff view (names and amounts) and what agents see in their portal (first name, initial and a bar).
  const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  const nice = (n: string) => { const p = n.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); return p.length > 1 ? `${p[0]} ${p[p.length - 1].charAt(0)}.` : p[0] }
  const lbTop = lb?.[0]?.total || 0
  const leaderboards = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12, marginTop: 12 }}>
      <div style={{ ...box, padding: 18, minWidth: 0 }}>
        <h3 style={head}>Agent leaderboard (staff view)</h3>
        {lb === null ? <div style={{ fontSize: 13, color: K.soft }}>Loading…</div> : lb.length === 0 ? <div style={{ fontSize: 13, color: K.soft }}>No active agents yet.</div> : lb.map((x, i) => (
          <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${K.line}` : 'none' }}>
            <div style={{ width: 22, fontWeight: 800, color: i === 0 ? '#b7791f' : K.soft }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: K.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</div><div style={{ fontSize: 11.5, color: K.soft }}>{x.referrals} referral{x.referrals === 1 ? '' : 's'}{x.owed ? ` · ${gbp(x.owed)} owed` : ''}</div></div>
            <div style={{ fontWeight: 800, color: K.ink }}>{gbp(x.total)}</div>
          </div>))}
        <Link href="/staff-centre/partners" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, color: K.blue, fontWeight: 600, textDecoration: 'none' }}>Open Partners →</Link>
      </div>
      <div style={{ ...box, padding: 18, minWidth: 0 }}>
        <h3 style={head}>Agent leaderboard (what agents see)</h3>
        {lb === null ? <div style={{ fontSize: 13, color: K.soft }}>Loading…</div> : lb.length === 0 ? <div style={{ fontSize: 13, color: K.soft }}>No active agents yet.</div> : lb.map((x, i) => (
          <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
            <div style={{ width: 22, fontWeight: 800, color: i === 0 ? '#b7791f' : K.soft }}>{i + 1}</div>
            <div style={{ width: 110, fontSize: 13.5, color: K.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nice(x.name)}</div>
            <div style={{ flex: 1, height: 8, background: '#dbe8fa', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${lbTop ? Math.max(Math.round((x.total / lbTop) * 100), x.total ? 4 : 0) : 0}%`, height: '100%', background: 'linear-gradient(90deg,#2f5bd6,#6c9bff)', borderRadius: 999 }} /></div>
          </div>))}
        <div style={{ fontSize: 12, color: K.soft, marginTop: 8 }}>Agents see this in their portal. Others show as first name and initial with a bar, never amounts.</div>
      </div>
    </div>
  )

  return (
    <>
    <div style={{ marginBottom: 18 }}>
      <style>{`.ai-strip{display:grid;grid-template-columns:1.1fr repeat(4,minmax(0,1fr));gap:12px}
        .ai-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:480px;gap:12px;margin-top:12px}.ai-two>*{min-height:0;overflow:auto}.ai-fill>*{height:100%;box-sizing:border-box}
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

      <h2 style={{ ...head, marginTop: 18 }}>Novourq Cloud AI</h2>
      <div style={{ ...box, padding: 18, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <AiMark size={68} bare />
        <span style={{ flex: '1 1 260px', minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 15, color: K.ink }}>One AI running your whole business</b>
          <small style={{ display: 'block', fontSize: 12.5, color: K.muted, marginTop: 2 }}>{ov ? `${on} skills switched on` : 'Loading…'}{act && act[0] ? ` · last action ${ago(act[0].at)}` : ''}. Ask it anything about your portfolio, or message it from your phone.</small>
        </span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Ask Novourq Cloud AI', '/staff-centre/ask-grok'], ['Phone Assistant', '/settings?section=Phone%20Assistant'], ['AI Authority', '/settings?section=AI%20Authority']].map(([l, h]) => (
            <Link key={l} href={h} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${K.chipLine}`, background: K.chip, color: K.blue, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{l}</Link>
          ))}
        </span>
      </div>

      <div className="ai-two">
        <div className="ai-fill">{mapSlot ?? automationBox}</div>
        <div style={{ ...box, padding: 18, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ ...head, marginBottom: 2 }}>NOVOURQ Walk</h3>
          <div style={{ fontSize: 12.5, color: K.muted, marginBottom: 10 }}>Showcasing our new AI technology</div>
          <video src="/novourq-walk.mp4" poster="/novourq-walk-poster.jpg" controls playsInline preload="metadata" style={{ width: '100%', flex: 1, minHeight: 0, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
        </div>
        <div className="ai-fill">{portfolioSlot ?? null}</div>
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
      {mapSlot ? <div style={{ marginTop: 12 }}>{automationBox}</div> : null}
      {leaderboards}
    </div>
    </>
  )
}
