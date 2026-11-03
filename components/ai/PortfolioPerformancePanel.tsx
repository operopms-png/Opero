'use client'
// Portfolio Performance: money in and out by month, from the Finance records. Used on the Dashboard and the Business snapshot.
import React, { useEffect, useState } from 'react'
import { staffApi, money } from '../../lib/staff-api'

const LINE = '#D9E2F0', BLUE = '#2F6DB5', NAVY = '#1B2F6E', MUTED = '#667085', TXT = '#101828', GREEN = '#12B76A', RED = '#B42318'
type Trend = { month: string; in: number; out: number }

export default function PortfolioPerformancePanel() {
  const [trend, setTrend] = useState<Trend[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ trend: Trend[] }>('/api/finance').then(d => setTrend(d.trend ?? [])).catch(e => setErr(e.message)) }, [])
  const max = Math.max(1, ...(trend ?? []).flatMap(t => [t.in, t.out]))
  const totalIn = (trend ?? []).reduce((a, t) => a + t.in, 0), totalOut = (trend ?? []).reduce((a, t) => a + t.out, 0), net = totalIn - totalOut
  return (
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: TXT }}>Portfolio Performance</div>
        <span style={{ color: MUTED, fontSize: 11 }}>Last {trend?.length || 6} months</span>
      </div>
      {!trend ? <div style={{ color: MUTED, fontSize: 12, padding: '30px 0', textAlign: 'center' }}>{err ? 'Could not load finance' : 'Loading…'}</div> : trend.length === 0 ? (
        <div style={{ color: MUTED, fontSize: 12, padding: '30px 0', textAlign: 'center' }}>No income or costs recorded yet.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
            {[['Money in', totalIn, BLUE], ['Money out', totalOut, MUTED], ['Net', net, net >= 0 ? GREEN : RED]].map(([l, v, c]) => (
              <div key={l as string} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 10px', minWidth: 0 }}>
                <div style={{ fontSize: 11, color: MUTED }}>{l as string}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c as string, fontVariantNumeric: 'tabular-nums' }}>{money(v as number, 'GBP', true)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, borderBottom: `1px solid ${LINE}` }}>
            {trend.map(t => (
              <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                  <div title={`In ${money(t.in, 'GBP')}`} style={{ width: 10, height: `${(t.in / max) * 100}%`, background: BLUE, borderRadius: '3px 3px 0 0' }} />
                  <div title={`Out ${money(t.out, 'GBP')}`} style={{ width: 10, height: `${(t.out / max) * 100}%`, background: LINE, borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{new Date(t.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MUTED, marginTop: 8 }}><span style={{ color: BLUE }}>■ Money in</span><span style={{ color: NAVY }}>■ Money out</span></div>
        </>
      )}
    </div>
  )
}
