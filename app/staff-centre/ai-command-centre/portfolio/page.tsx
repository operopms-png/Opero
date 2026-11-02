'use client'
// AI Command Centre -> Portfolio: what the managed portfolio earns, costs and is worth, how rent
// has grown, and a forecast from assumptions you set. Rent, costs and loans come from your records.
// Values are estimates from public listings, not formal valuations.
import React, { useEffect, useMemo, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input, label } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: C.muted, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid ' + C.border, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { fontSize: 13.5, padding: '10px', borderBottom: '1px solid ' + C.border, whiteSpace: 'nowrap' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 14 }
const pct = (n: number | null) => (n == null ? '-' : n.toFixed(1) + '%')
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Portfolio() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useState('')
  const [msg, setMsg] = useState('')
  const [fx, setFx] = useState({ rentGrowth: '3', costGrowth: '3', void: '3', valueGrowth: '3', years: '5' })
  const load = () => staffApi('/api/ai-portfolio').then((x: any) => { setD(x); setErr(''); setCur(c => c || [...x.rows.map((r: any) => r.currency)].sort((a: string, b: string) => x.rows.filter((r: any) => r.currency === b).length - x.rows.filter((r: any) => r.currency === a).length)[0] || '') }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const currencies: string[] = d ? Array.from(new Set(d.rows.map((r: any) => r.currency))) as string[] : []
  const rows = useMemo(() => (d?.rows ?? []).filter((r: any) => r.currency === cur), [d, cur])
  const S = SYM[cur] ?? ''
  const m = (n: number) => (n < 0 ? '-' : '') + S + Math.abs(Math.round(n)).toLocaleString('en-GB')
  const tot = useMemo(() => {
    const t = { rent: 0, costs: 0, mort: 0, loan: 0, value: 0, valued: 0, units: 0, occ: 0 }
    for (const r of rows) { t.rent += r.rentIn; t.costs += r.headRent + r.utilities; t.mort += r.mortgage; t.loan += r.loan; t.units += r.units; t.occ += r.occupied; if (r.value) { t.value += r.value.typical; t.valued++ } }
    return t
  }, [rows])
  const valuedRent = rows.filter((r: any) => r.value).reduce((s: number, r: any) => s + r.rentIn * 12, 0)
  const valuedCost = rows.filter((r: any) => r.value).reduce((s: number, r: any) => s + (r.headRent + r.utilities) * 12, 0)

  const months: [string, number][] = useMemo(() => {
    const t = d?.trend?.[cur] ?? {}, out: [string, number][] = [], now = new Date()
    for (let i = 11; i >= 0; i--) { const x = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7); out.push([x, t[x] ?? 0]) }
    return out
  }, [d, cur])
  const maxM = Math.max(1, ...months.map(x => x[1]))

  const years = Math.min(10, Math.max(1, parseInt(fx.years) || 5)), n = (v: string) => (parseFloat(v) || 0) / 100
  const proj = Array.from({ length: years }, (_, i) => {
    const y = i + 1
    const rent = tot.rent * 12 * Math.pow(1 + n(fx.rentGrowth), y) * (1 - n(fx.void))
    const costs = tot.costs * 12 * Math.pow(1 + n(fx.costGrowth), y)
    const cash = rent - costs - tot.mort * 12
    return { y, rent, costs, cash, value: tot.value ? tot.value * Math.pow(1 + n(fx.valueGrowth), y) : null }
  })

  const refresh = async () => {
    setMsg('')
    try { await staffApi('/api/ai-portfolio', { action: 'refresh' }); setMsg('Started. Value estimates take a minute or two. Reload this page after.') } catch (e: any) { setErr(e.message) }
  }

  return (
    <CrmPage>
      <CrmHeader title="Portfolio" subtitle="What your managed portfolio earns, costs and is worth. Rent, costs and loans come from your records. Values are estimates from public listings, not formal valuations."
        actions={<button style={btn('gold')} onClick={refresh}>Refresh value estimates</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {msg && <div style={{ color: '#0E7C55', marginBottom: 12 }}>{msg}</div>}
        {!d ? (!err && <Loading />) : d.rows.length === 0 ? <Empty>No properties yet. Add them in Property Management.</Empty> : (
          <>
            {currencies.length > 1 && <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>{currencies.map(c => <button key={c} style={btn(c === cur ? 'gold' : 'ghost', true)} onClick={() => setCur(c)}>{c}</button>)}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 12, marginBottom: 18 }}>
              {[
                ['Properties', `${rows.length}`, `${tot.occ} of ${tot.units} units let`],
                ['Rent in, per month', m(tot.rent), 'occupied units'],
                ['Cash flow, per month', m(tot.rent - tot.costs - tot.mort), 'after head rent, bills and mortgage'],
                ['Estimated value', tot.valued ? m(tot.value) : '-', tot.valued ? `${tot.valued} of ${rows.length} valued` : 'press Refresh value estimates'],
                ['Gross yield', tot.valued && valuedRent ? pct((valuedRent / tot.value) * 100) : '-', 'rent on estimated value'],
                ['Net yield', tot.valued && valuedRent ? pct(((valuedRent - valuedCost) / tot.value) * 100) : '-', 'after head rent and bills'],
                ['Loans (original)', tot.loan ? m(tot.loan) : '-', tot.valued && tot.loan ? `equity about ${m(tot.value - tot.loan)}` : ''],
              ].map(([l, v, s]) => (
                <div key={l} style={card}><div style={{ fontSize: 12, color: C.muted }}>{l}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{v}</div><div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{s}</div></div>))}
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>Properties</div>
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Property', 'Units let', 'Rent in', 'Head rent + bills', 'Mortgage', 'Cash flow', 'Est. value', 'Gross yield', 'Net yield'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                    <td style={td}>{r.units ? `${r.occupied} of ${r.units}` : '-'}</td>
                    <td style={td}>{m(r.rentIn)}</td><td style={td}>{r.headRent + r.utilities ? m(r.headRent + r.utilities) : '-'}</td><td style={td}>{r.mortgage ? m(r.mortgage) : '-'}</td>
                    <td style={{ ...td, color: r.cashFlow < 0 ? C.red : '#0E7C55', fontWeight: 600 }}>{m(r.cashFlow)}</td>
                    <td style={td} title={r.value ? `${m(r.value.low)} to ${m(r.value.high)}. ${r.value.basis ?? ''} Sources: ${(r.value.sources ?? []).join(', ') || 'n/a'}. Checked ${day(r.value.checked_at)}.` : ''}>
                      {r.value ? <>{m(r.value.typical)} <span style={{ fontSize: 11, color: C.faint }}>{r.value.confidence}</span></> : '-'}</td>
                    <td style={td}>{pct(r.grossYield)}</td><td style={td}>{pct(r.netYield)}</td>
                  </tr>))}</tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginBottom: 20 }}>
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Rent received, last 12 months</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Rent actually paid, by month. This is your portfolio growth in income.</div>
                <svg viewBox="0 0 360 120" style={{ width: '100%' }} role="img" aria-label="Rent received per month">
                  {months.map(([k, v], i) => { const h = (v / maxM) * 90; return <g key={k}><rect x={i * 30 + 4} y={100 - h} width={22} height={h} fill="#1B2F6E" rx={2} /><text x={i * 30 + 15} y={114} fontSize="8" textAnchor="middle" fill="#667085">{k.slice(5)}</text></g> })}
                </svg>
                <div style={{ fontSize: 12, color: C.muted }}>Highest month {m(maxM)}. Last 12 months total {m(months.reduce((s, x) => s + x[1], 0))}.</div>
              </div>

              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Forecast</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>A projection from the assumptions below, starting from today&apos;s figures. It is not a prediction.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 10 }}>
                  {([['rentGrowth', 'Rent growth % a year'], ['costGrowth', 'Cost growth % a year'], ['void', 'Extra void allowance %'], ['valueGrowth', 'Value growth % a year'], ['years', 'Years (1 to 10)']] as const).map(([k, l]) => (
                    <div key={k}><label style={{ ...label, fontSize: 11.5 }}>{l}</label><input style={input} inputMode="decimal" value={fx[k]} onChange={e => setFx({ ...fx, [k]: e.target.value })} /></div>))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Year', 'Rent', 'Costs', 'Cash flow', 'Value'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{proj.map(p => <tr key={p.y}><td style={td}>{p.y}</td><td style={td}>{m(p.rent)}</td><td style={td}>{m(p.costs)}</td><td style={{ ...td, fontWeight: 600, color: p.cash < 0 ? C.red : '#0E7C55' }}>{m(p.cash)}</td><td style={td}>{p.value == null ? '-' : m(p.value)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </div>

            {d.developments.length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Developments</div>
                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Project', 'Status', 'Budget', 'Spent', 'Budget used', 'Target end'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{d.developments.map((p: any) => { const used = p.budget ? (p.spent / p.budget) * 100 : null; return (
                      <tr key={p.id}><td style={{ ...td, fontWeight: 600 }}>{p.name}</td><td style={td}>{p.status ?? '-'}</td><td style={td}>{p.budget ? p.budget.toLocaleString('en-GB') : '-'}</td><td style={td}>{p.spent.toLocaleString('en-GB')}</td>
                        <td style={{ ...td, color: used != null && used > 100 ? C.red : undefined }}>{pct(used)}</td><td style={td}>{p.endDate ? day(p.endDate) : '-'}</td></tr>) })}</tbody>
                  </table>
                </div>
              </>
            )}
            <p style={{ fontSize: 12, color: C.muted, marginTop: 14, maxWidth: 760 }}>Cash flow is rent from let units, less head rent, bills and mortgage payments recorded for each property. Yields use the estimated value and exclude the mortgage. Estimated values come from a web search of recent sales and asking prices and carry a confidence level. They are not formal valuations. Hover a value for its basis and sources.</p>
          </>
        )}
      </Body>
    </CrmPage>
  )
}
