'use client'
// AI Command Centre shell: an inner menu on the left and one focused page on the right.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { staffApi } from '../../../lib/staff-api'

const BASE = '/staff-centre/ai-command-centre'
const NAV: { heading: string; items: { href: string; label: string; badge?: 'approvals' | 'alerts' }[] }[] = [
  { heading: 'Control', items: [
    { href: BASE, label: 'Overview' },
    { href: BASE + '/approvals', label: 'Approvals', badge: 'approvals' },
    { href: BASE + '/alerts', label: 'Alerts', badge: 'alerts' },
  ] },
  { heading: 'Agents', items: [
    { href: BASE + '/agents', label: 'Agents' },
    { href: BASE + '/agent-pool', label: 'Agent Pool' },
    { href: BASE + '/ask-grok', label: 'Ask Novourq AI' },
  ] },
  { heading: 'Automation', items: [
    { href: BASE + '/workflows', label: 'Workflows' },
    { href: '/staff-centre/tasks', label: 'Task board' },
    { href: BASE + '/escalation', label: 'Escalation rules' },
    { href: BASE + '/pricing', label: 'Pricing' },
    { href: BASE + '/chief', label: 'Chief of Staff' },
  ] },
  { heading: 'Insight', items: [
    { href: BASE + '/results', label: 'Results' },
    { href: BASE + '/portfolio', label: 'Portfolio' },
    { href: BASE + '/activity', label: 'Activity log' },
    { href: BASE + '/snapshot', label: 'Business snapshot' },
  ] },
  { heading: 'Tools', items: [{ href: BASE + '/import', label: 'Import' }, { href: BASE + '/deal-analyser', label: 'Deal Analyser' }] },
]

export default function AiCommandCentreLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() || ''
  const [counts, setCounts] = useState<{ approvals: number; alerts: number }>({ approvals: 0, alerts: 0 })
  useEffect(() => { staffApi<{ approvals: number; alerts: number }>('/api/ai-overview?counts=1').then(setCounts).catch(() => {}) }, [path])
  const on = (href: string) => (href === BASE ? path === BASE : path === href || path.startsWith(href + '/'))

  return (
    <div className="aicc-wrap">
      <style>{`
        .aicc-wrap{display:grid;grid-template-columns:224px minmax(0,1fr);min-height:calc(100vh - var(--hub-h,0px));background:#F5F7FB}
        .aicc-nav{background:#fff;border-right:1px solid #D9E2F0;padding:14px 10px;position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto}
        .aicc-nav h6{margin:14px 10px 6px;font-size:10px;letter-spacing:.08em;color:#98A2B3;text-transform:uppercase;font-weight:700}
        .aicc-nav h6:first-child{margin-top:4px}
        .aicc-nav a{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;font-size:13.5px;color:#344054;margin-bottom:2px;text-decoration:none}
        .aicc-nav a:hover{background:#F2F4F7}
        .aicc-nav a.on{background:#E8EDF8;color:#1B2F6E;font-weight:600;box-shadow:inset 3px 0 0 #C9A84C}
        .aicc-main{min-width:0}
        @media(max-width:760px){.aicc-wrap{grid-template-columns:1fr}.aicc-nav{position:static;display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid #D9E2F0;padding:8px;gap:4px;max-height:none}.aicc-nav h6{display:none}.aicc-nav a{white-space:nowrap;margin:0;gap:8px}}
      `}</style>
      <nav className="aicc-nav">
        {NAV.map(g => (
          <React.Fragment key={g.heading}>
            <h6>{g.heading}</h6>
            {g.items.map(i => {
              const n = i.badge ? counts[i.badge] : 0
              return (
                <Link key={i.href} href={i.href} className={on(i.href) ? 'on' : ''}>
                  <span>{i.label}</span>
                  {n > 0 && <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', background: i.badge === 'approvals' ? '#FDECEC' : '#FFF4DE', color: i.badge === 'approvals' ? '#B42318' : '#8A5A00' }}>{n}</span>}
                </Link>
              )
            })}
          </React.Fragment>
        ))}
      </nav>
      <div className="aicc-main">{children}</div>
    </div>
  )
}
