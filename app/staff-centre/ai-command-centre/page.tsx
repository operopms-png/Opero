'use client'
// AI Command Centre -> Overview: what needs a person today and how the agents are doing.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'
import DailyBriefing from '../../../components/ai/DailyBriefing'

const BASE = '/staff-centre/ai-command-centre'
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 12, padding: 16 }

export default function Overview() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi('/api/ai-overview').then(setD).catch(e => setErr(e.message)) }, [])

  return (
    <CrmPage>
      <CrmHeader title="Overview" subtitle="What needs a person today, and how your AI agents are doing." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }}>
              {[['Waiting for approval', d.approvals, BASE + '/approvals'], ['Skills switched on', `${d.agentsOn} of ${d.agentsTotal}`, BASE + '/agents'], ['Sent in 30 days', d.sent30, BASE + '/results'], ['Estimated hours saved', d.hoursSaved, BASE + '/results']].map(([l, v, href]) => (
                <Link key={l as string} href={href as string} style={{ ...card, textDecoration: 'none', color: '#101828' }}>
                  <div style={{ fontSize: 12, color: '#667085' }}>{l}</div><div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{v}</div>
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
      </Body>
    </CrmPage>
  )
}
