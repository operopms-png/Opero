'use client'
// AI Command Centre -> Workflows: what each agent does, when it runs and what the last run did.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading, btn } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: C.muted, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid ' + C.border }
const td: React.CSSProperties = { fontSize: 13.5, padding: '10px', borderBottom: '1px solid ' + C.border }

export default function Workflows() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = () => staffApi('/api/ai-workflows').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const run = async () => {
    if (!window.confirm('Run every switched-on agent now? They only add drafts to Approvals. Nothing is sent.')) return
    setBusy(true); setMsg('')
    try { await staffApi('/api/ai-workflows', { action: 'run' }); setMsg('Started. New drafts appear in Approvals in a minute or two, and this page shows the result when it finishes.'); await load() } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  const groups = d ? Array.from(new Set(d.workflows.map((w: any) => w.module))) as string[] : []

  return (
    <CrmPage>
      <CrmHeader title="Workflows" subtitle="What each AI agent does and when. Scheduled agents run at 07:30 UTC and only draft: a person approves everything."
        actions={<button style={btn('gold')} disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run all now'}</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {msg && <div style={{ color: '#0E7C55', marginBottom: 12 }}>{msg}</div>}
        {!d ? (!err && <Loading />) : (
          <>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{d.lastRun ? `Last run ${when(d.lastRun.at)}${d.lastRun.manual ? ' (started by hand)' : ' (scheduled)'}${d.lastRun.ok ? '' : ', it failed'}.` : 'No run recorded yet.'}</div>
            {groups.map(g => (
              <div key={g} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>{g}</div>
                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Agent', 'Runs', 'Status', 'Drafts added last run'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{d.workflows.filter((w: any) => w.module === g).map((w: any) => (
                      <tr key={w.agent}>
                        <td style={{ ...td, fontWeight: 600 }}>{w.label}</td>
                        <td style={td}>{w.schedule}</td>
                        <td style={td}>{w.on ? <span style={{ color: '#0E7C55', fontWeight: 600 }}>On</span> : <Link href="/staff-centre/ai-command-centre/agents" style={{ color: C.muted }}>Off, switch on</Link>}</td>
                        <td style={td}>{w.live ? 'n/a, live' : w.lastQueued == null ? '-' : w.lastQueued}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              </div>))}
            <p style={{ fontSize: 12, color: C.muted }}>Agents marked live answer as each message arrives. Their replies are drafted for approval too, except website chat and voice calls, which answer straight away.</p>
          </>
        )}
      </Body>
    </CrmPage>
  )
}
