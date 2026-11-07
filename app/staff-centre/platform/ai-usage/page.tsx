'use client'
// Platform Owner → AI Usage and Costs: what the AI costs per client, so margin stays protected.
// Owner login only. Costs are estimated from tokens used and the model's published price (lib/ai-usage.ts).
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, Stat } from '../../../../components/crm/Page'
import { ownerFetch } from '../../../../lib/platform-fetch'

const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: n < 10 ? 2 : 0, maximumFractionDigits: 2 })
const num = (n: number) => n.toLocaleString('en-GB')

export default function AiUsagePage() {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { setD(null); ownerFetch('/api/platform/ai-usage?days=' + days).then(r => r.ok ? setD(r.data) : setErr(r.data?.error || 'Could not load')) }, [days])
  if (err) return <CrmPage><CrmHeader title="AI Usage and Costs" /><Body><Empty>{err}</Empty></Body></CrmPage>
  if (!d) return <Loading />
  const max = Math.max(0.0001, ...d.clients.map((c: any) => c.cost))
  const dayKeys = Object.keys(d.daily).sort()
  const dmax = Math.max(0.0001, ...Object.values(d.daily) as number[])
  return (
    <CrmPage>
      <CrmHeader theme="blue" title="AI Usage and Costs" subtitle="What the AI costs per client, so you can protect your margin. Only your login can see this."
        actions={<select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid ' + C.border, fontFamily: 'inherit', fontSize: 13 }}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>} />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 18 }}>
          <Stat theme="blue" label={`AI cost, last ${days} days`} value={usd(d.total)} highlight />
          <Stat theme="blue" label="AI calls" value={num(d.calls)} />
          <Stat theme="blue" label="Cost per call" value={d.calls ? usd(d.total / d.calls) : '—'} />
          <Stat theme="blue" label="Clients using AI" value={d.clients.filter((c: any) => c.id).length} />
        </div>
        {d.trackingSince
          ? <div style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>Tracking since {new Date(d.trackingSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Earlier AI use was not recorded.</div>
          : <div style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>Tracking starts with the first AI call after this page went live. Earlier AI use was not recorded.</div>}
        {dayKeys.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Cost per day</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70 }}>
              {dayKeys.map(k => <div key={k} title={`${k}: ${usd(d.daily[k])}`} style={{ flex: 1, minWidth: 3, height: Math.max(2, (d.daily[k] / dmax) * 70), background: '#3B7DD8', borderRadius: 2 }} />)}
            </div>
          </div>
        )}
        {d.clients.length === 0 ? <Empty>No AI calls recorded in this period yet.</Empty> : (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ background: '#F5F6F8', textAlign: 'left', color: C.muted, fontSize: 12 }}>
                {['Client', 'AI cost', '', 'Calls', 'Cost per call', 'Tokens in', 'Tokens out'].map((h, i) => <th key={i} style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>{d.clients.map((c: any) => {
                const k = c.id ?? 'none'
                return (<React.Fragment key={k}>
                  <tr onClick={() => setOpen(open === k ? null : k)} style={{ borderTop: '1px solid ' + C.row, cursor: 'pointer' }}>
                    <td style={{ padding: '10px 14px' }}><div style={{ fontWeight: 600, color: C.ink }}>{c.name}</div><div style={{ fontSize: 12, color: C.faint }}>{c.email}</div></td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{usd(c.cost)}</td>
                    <td style={{ padding: '10px 14px', width: 160 }}><div style={{ height: 8, borderRadius: 4, background: '#EAF3FC' }}><div style={{ height: 8, borderRadius: 4, width: (c.cost / max * 100) + '%', background: '#3B7DD8' }} /></div></td>
                    <td style={{ padding: '10px 14px' }}>{num(c.calls)}</td>
                    <td style={{ padding: '10px 14px' }}>{usd(c.perCall)}</td>
                    <td style={{ padding: '10px 14px' }}>{num(c.input)}</td>
                    <td style={{ padding: '10px 14px' }}>{num(c.output)}</td>
                  </tr>
                  {open === k && <tr><td colSpan={7} style={{ padding: '4px 14px 14px', background: '#FAFBFD' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: '8px 0 6px' }}>Where this client's AI cost comes from</div>
                    {Object.entries(c.bySource as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([s, v]) => <div key={s} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, fontSize: 13, padding: '2px 0' }}><span>{s}</span><span style={{ fontWeight: 600 }}>{usd(v)}</span></div>)}
                  </td></tr>}
                </React.Fragment>)
              })}</tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Costs are in US dollars, estimated from tokens used and each model's published price, plus $0.01 per web search. Voice-to-text and text-to-speech are not included yet. Click a client to see which tool the cost came from.</div>
      </Body>
    </CrmPage>
  )
}
