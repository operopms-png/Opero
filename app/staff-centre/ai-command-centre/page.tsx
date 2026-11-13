'use client'
// AI Command Centre -> Overview: what needs a person today and how the agents are doing.
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { C, Loading } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'
import DailyBriefing from '../../../components/ai/DailyBriefing'

const BASE = '/staff-centre/ai-command-centre'
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 12, padding: 16 }


// Pages grouped like the other hubs. Each has a plain description.
const GROUPS: { name: string; note: string; pages: { href: string; label: string; text: string; badge?: 'approvals' | 'alerts' }[] }[] = [
  { name: 'Control', note: 'Decide and keep watch', pages: [
    { href: BASE + '/approvals', label: 'Approvals', text: 'Everything the AI drafted that waits for your yes.', badge: 'approvals' },
    { href: BASE + '/alerts', label: 'Alerts', text: 'Things that need a look, such as risks and failures.', badge: 'alerts' },
  ] },
  { name: 'Skills', note: 'What the AI can do', pages: [
    { href: BASE + '/agents', label: 'Skills', text: 'Every skill, switched on or off.' },
    { href: BASE + '/agent-pool', label: 'Agent Pool', text: 'The helpers that work through your records.' },
    { href: BASE + '/ask-grok', label: 'Novourq Cloud AI', text: 'Ask it anything about your portfolio.' },
  ] },
  { name: 'Automation', note: 'Work that runs by itself', pages: [
    { href: BASE + '/workflows', label: 'Workflows', text: 'Run every skill now, or let them run daily.' },
    { href: '/staff-centre/tasks', label: 'Task board', text: 'Jobs for you and your team.' },
    { href: BASE + '/escalation', label: 'Escalation rules', text: 'When the AI hands a case to a person.' },
    { href: BASE + '/pricing', label: 'Pricing', text: 'Rent and nightly rate suggestions.' },
    { href: BASE + '/chief', label: 'Chief of Staff', text: 'Your daily plan, most urgent first.' },
    { href: BASE + '/matching', label: 'Matching', text: 'Match tenants and guests to properties.' },
  ] },
  { name: 'Insight', note: 'What happened and how it is going', pages: [
    { href: BASE + '/results', label: 'Results', text: 'What the AI achieved.' },
    { href: BASE + '/portfolio', label: 'Portfolio', text: 'Your portfolio at a glance.' },
    { href: BASE + '/activity', label: 'Activity log', text: 'Everything the AI did, and when.' },
    { href: BASE + '/snapshot', label: 'Business snapshot', text: 'Key numbers in one page.' },
  ] },
  { name: 'Tools', note: 'Bring things in and test ideas', pages: [
    { href: BASE + '/import', label: 'Import', text: 'Add records from a spreadsheet.' },
    { href: BASE + '/deal-analyser', label: 'Deal Analyser', text: 'Work out whether a deal stacks up.' },
  ] },
]

// Where do I go? Plain tasks that open the right page.
const TASKS: { task: string; pages: [string, string][] }[] = [
  { task: 'Approve what the AI drafted', pages: [[BASE + '/approvals', 'Approvals']] },
  { task: 'See what needs attention', pages: [[BASE + '/alerts', 'Alerts']] },
  { task: 'Switch a skill on or off', pages: [[BASE + '/agents', 'Skills']] },
  { task: 'Ask the AI a question', pages: [[BASE + '/ask-grok', 'Novourq Cloud AI']] },
  { task: 'Run every skill now', pages: [[BASE + '/workflows', 'Workflows']] },
  { task: 'Choose when the AI hands over to you', pages: [[BASE + '/escalation', 'Escalation rules']] },
  { task: 'See what the AI did', pages: [[BASE + '/activity', 'Activity log'], [BASE + '/results', 'Results']] },
  { task: 'Plan my day', pages: [[BASE + '/chief', 'Chief of Staff'], ['/staff-centre/tasks', 'Task board']] },
  { task: 'Match a tenant to a property', pages: [[BASE + '/matching', 'Matching']] },
  { task: 'Add records from a spreadsheet', pages: [[BASE + '/import', 'Import']] },
  { task: 'Check whether a deal stacks up', pages: [[BASE + '/deal-analyser', 'Deal Analyser']] },
  { task: 'See the state of the business', pages: [[BASE + '/snapshot', 'Business snapshot'], [BASE + '/portfolio', 'Portfolio']] },
]

const K = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'
const chip: React.CSSProperties = { background: '#eaf0fd', color: '#2f5bd6', fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 8, textDecoration: 'none' }

export default function Overview() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [cat, setCat] = useState(0)
  const [q, setQ] = useState('')
  const [counts, setCounts] = useState<{ approvals: number; alerts: number }>({ approvals: 0, alerts: 0 })
  useEffect(() => { staffApi('/api/ai-overview').then(setD).catch(e => setErr(e.message)) }, [])
  useEffect(() => { staffApi<{ approvals: number; alerts: number }>('/api/ai-overview?counts=1').then(setCounts).catch(() => {}) }, [])
  const term = q.trim().toLowerCase()
  const groups = useMemo(() => GROUPS.map(g => ({
    ...g,
    pages: !term || g.name.toLowerCase().includes(term) ? g.pages : g.pages.filter(p => p.label.toLowerCase().includes(term) || p.text.toLowerCase().includes(term)),
  })).filter(g => g.pages.length > 0), [term])
  const cur = groups[Math.min(cat, Math.max(groups.length - 1, 0))]

  return (
    <div style={{ padding: '28px 30px 40px', fontFamily: 'inherit', maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: K.ink, letterSpacing: '-0.01em' }}>Novourq Cloud AI</h1>
      <p style={{ margin: '6px 0 18px', fontSize: 14, color: K.muted, maxWidth: 600, lineHeight: 1.5 }}>One assistant with many skills. It drafts the work and you decide.</p>
      {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}

      <div style={{ background: '#fff', border: `1px solid ${K.line}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, boxShadow: shadow }}>
        <b style={{ display: 'block', color: K.ink, fontSize: 16, fontWeight: 700 }}>Where do I go?</b>
        <p style={{ margin: '2px 0 12px', fontSize: 13.5, color: K.muted }}>Pick what you want to do and we open the right page.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
          {TASKS.map(t => (
            <div key={t.task} style={{ border: `1px solid ${K.line}`, borderRadius: 10, padding: '10px 12px' }}>
              <b style={{ display: 'block', color: K.ink, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{t.task}</b>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {t.pages.map(([href, label]) => <Link key={href} href={href} style={chip}>{t.pages.length > 1 ? label : 'Open'}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${K.line}`, borderRadius: 12, padding: '0 14px', height: 46, boxShadow: shadow }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={K.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input value={q} onChange={e => { setQ(e.target.value); setCat(0) }} placeholder="Search any page, such as approvals or workflows" autoComplete="off"
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 14, color: K.ink }} />
      </label>

      {!cur ? (
        <p style={{ marginTop: 22, fontSize: 14, color: K.muted }}>Nothing matches that search.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 240px) 1fr', gap: 16, marginTop: 16, alignItems: 'start' }} className="aicc-hub-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#fff', border: `1px solid ${K.line}`, borderRadius: 14, padding: 8, boxShadow: shadow }}>
            {groups.map((g, i) => {
              const on = groups[Math.min(cat, groups.length - 1)] === g
              return (
                <button key={g.name} type="button" onClick={() => setCat(i)} aria-pressed={on}
                  style={{ display: 'flex', flexDirection: 'column', gap: 2, font: 'inherit', textAlign: 'left', border: 0, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: on ? K.soft : 'transparent', color: on ? K.ink : K.text }}>
                  <span style={{ fontSize: 14, fontWeight: on ? 700 : 500 }}>{g.name}</span>
                  <span style={{ fontSize: 12, color: K.muted }}>{g.pages.length} page{g.pages.length === 1 ? '' : 's'}</span>
                </button>
              )
            })}
          </div>
          <div style={{ background: '#fff', border: `1px solid ${K.line}`, borderRadius: 14, padding: '20px 22px', boxShadow: shadow, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: K.ink }}>{cur.name}</h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: K.muted }}>{cur.note}</p>
            {cur.pages.map(p => {
              const n = p.badge ? counts[p.badge] : 0
              return (
                <div key={p.href} style={{ borderTop: `1px solid ${K.line}`, padding: '14px 0', display: 'grid', gridTemplateColumns: 'minmax(150px, 200px) 1fr', gap: 12 }} className="aicc-hub-row">
                  <Link href={p.href} style={{ fontSize: 14.5, fontWeight: 700, color: K.ink, textDecoration: 'none' }}>
                    {p.label}{n > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', background: p.badge === 'approvals' ? '#FDECEC' : '#FFF4DE', color: p.badge === 'approvals' ? '#B42318' : '#8A5A00' }}>{n}</span>}
                  </Link>
                  <span style={{ fontSize: 13.5, color: K.text, lineHeight: 1.45 }}>{p.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 21, color: K.ink }}>At a glance</h2>
        <p style={{ margin: '3px 0 12px', fontSize: 14, color: K.muted }}>What needs you today. Open any tile for the detail.</p>
        {!d ? (!err && <Loading />) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12, marginBottom: 16 }}>
              {([['Waiting for approval', d.approvals, BASE + '/approvals', 'Need your decision', 'Nothing waiting', true], ['Skills switched on', `${d.agentsOn} of ${d.agentsTotal}`, BASE + '/agents', 'Skills running daily', '', false], ['Sent in 30 days', d.sent30, BASE + '/results', 'Emails and messages', '', false], ['Estimated hours saved', d.hoursSaved, BASE + '/results', 'This month', '', false]] as [string, any, string, string, string, boolean][]).map(([l, v, href, note, none, warn]) => (
                <Link key={l} href={href} style={{ textDecoration: 'none', background: '#fff', border: `1px solid ${K.line}`, borderRadius: 12, padding: '12px 14px', display: 'block' }}>
                  <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2F6DB5', margin: '3px 0 1px' }}>{v}</div>
                  <div style={{ fontSize: 12, color: warn ? (Number(v) ? '#B54708' : '#067647') : '#667085' }}>{warn && !Number(v) ? none : note}</div>
                </Link>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
              <div><DailyBriefing /></div>
              <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                <div style={card}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Skills running</div>
                  {d.agents.length === 0 ? <div style={{ fontSize: 13, color: '#667085' }}>No agents are switched on. <Link href={BASE + '/agents'} style={{ color: '#1B2F6E' }}>Switch some on</Link>.</div>
                    : d.agents.map((a: any) => (
                      <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, padding: '8px 0', borderBottom: '1px solid #F2F4F7' }}>
                        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0E7C55', marginRight: 8 }} />{a.label}</span>
                        <span style={{ color: '#667085', textAlign: 'right' }}>{a.schedule}</span>
                      </div>))}
                </div>
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Latest alerts</div><Link href={BASE + '/alerts'} style={{ fontSize: 12.5, color: '#1B2F6E' }}>All alerts</Link></div>
                  {d.alerts.length === 0 ? <div style={{ fontSize: 13, color: '#667085' }}>No alerts.</div>
                    : d.alerts.map((a: any) => (
                      <Link key={a.id} href={a.link || BASE + '/alerts'} style={{ display: 'block', textDecoration: 'none', color: '#101828', fontSize: 13.5, padding: '8px 0', borderBottom: '1px solid #F2F4F7', fontWeight: a.read ? 400 : 600 }}>
                        {a.title}<div style={{ fontSize: 11.5, color: '#98A2B3', fontWeight: 400 }}>{when(a.created_at)}</div>
                      </Link>))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@media (max-width: 720px){ .aicc-hub-grid{ grid-template-columns: 1fr !important } .aicc-hub-row{ grid-template-columns: 1fr !important } }`}</style>
    </div>
  )
}
