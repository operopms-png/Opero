'use client'
// Staff Centre → Finance → Overview. Money in and out for a month across every
// business, worked out from bookings, rent, owner payouts, development spend
// and approved expenses (see /api/finance). Totals in GBP at today's rate;
// each source also shows its own currency.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Stat, Loading } from '../../../components/crm/Page'
import { staffApi, money, MODULE_LABEL, MODULE_COL, SYM } from '../../../lib/staff-api'

const IN = '#B08A2E', OUT = '#2F6DB5' // validated pair
const mLabel = (m: string, long = false) => new Date(m + '-15T12:00:00Z').toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined })
const shift = (m: string, n: number) => { const d = new Date(m + '-15T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7) }
const pct = (a: number, b: number) => b ? Math.round((a - b) / Math.abs(b) * 100) : null

export default function FinanceOverview() {
  const [month, setMonth] = useState<string | null>(null)
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { setD(null); staffApi('/api/finance?view=overview' + (month ? '&month=' + month : '')).then(x => { setD(x); if (!month) setMonth(x.month) }).catch(e => setErr(e.message)) }, [month])

  const cur = d?.month || month
  return (
    <CrmPage>
      <CrmHeader title="Finance" subtitle="Money in and out across every business, worked out from bookings, rent, payouts and approved expenses. Totals in £ at today’s rate."
        actions={cur && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setMonth(shift(cur, -1))} style={navBtn} aria-label="Previous month">‹</button>
          <div style={{ minWidth: 130, textAlign: 'center', fontWeight: 700, color: C.brown }}>{mLabel(cur, true)}</div>
          <button onClick={() => setMonth(shift(cur, 1))} disabled={!!d && cur >= d.today.slice(0, 7)} style={{ ...navBtn, opacity: d && cur >= d.today.slice(0, 7) ? .4 : 1 }} aria-label="Next month">›</button>
        </div>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
            <Stat label="Money in" value={money(d.moneyIn)} sub={delta(d.moneyIn, d.prevIn, true)} />
            <Stat label="Money out" value={money(d.moneyOut)} sub={delta(d.moneyOut, d.prevOut, false)} />
            <Stat label="Profit" value={<span style={{ color: d.profit >= 0 ? '#0E7C55' : C.red }}>{money(d.profit)}</span>} sub={d.moneyIn ? `${Math.round(d.profit / d.moneyIn * 100)}% margin` : '—'} highlight />
            <Stat label="Owner payouts still to pay" value={money(d.payoutsDue)} sub={<Link href="/staff-centre/finance/payouts" style={{ color: C.goldDark }}>See payouts →</Link>} />
            <Stat label="Estate Agency rent roll" value={money(d.rentRoll)} sub="Monthly rent on active tenancies" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16, marginTop: 16 }} className="fin-grid">
            <style>{`@media(max-width:1000px){.fin-grid{grid-template-columns:1fr !important}}`}</style>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><div style={h}>Last 6 months</div><div style={sub}>Money in and out, £</div></div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.muted }}><Key c={IN} l="Money in" /><Key c={OUT} l="Money out" /></div>
              </div>
              <Trend trend={d.trend} sel={d.month} onPick={setMonth} />
            </div>
            <div style={card}>
              <div style={h}>Exchange rates used</div><div style={sub}>Today, per £1</div>
              <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 2 }}>{Object.entries(d.rates).filter(([k]) => k !== 'GBP').map(([k, v]: any) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>£1 =</span><b>{SYM[k]}{Number(v).toFixed(k === 'JMD' ? 0 : 2)}</b></div>)}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>Airbnb bookings are counted in US$ when the guest checks in. Estate Agency rent counts when a tenant’s rent is marked Paid. Development spend counts when a budget line’s actual cost is added.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(420px,100%),1fr))', gap: 16, marginTop: 16 }}>
            {[['Money in', d.income, IN], ['Money out', d.costs, OUT]].map(([title, rows, col]: any) => (
              <div key={title} style={card}>
                <div style={h}>{title} · {mLabel(d.month, true)}</div>
                {rows.length === 0 ? <div style={{ fontSize: 13, color: C.muted, padding: '16px 0' }}>Nothing recorded for this month.</div> : rows.map((r: any) => {
                  const k = title + r.source + r.module
                  return (
                    <div key={k} style={{ borderBottom: '1px solid #F2F0EA' }}>
                      <button onClick={() => setOpen(open === k ? null : k)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: MODULE_COL[r.module] || col, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{r.source}</div><div style={{ fontSize: 11.5, color: C.muted }}>{MODULE_LABEL[r.module]} · {r.count} item{r.count === 1 ? '' : 's'} · {Object.entries(r.byCurrency).map(([c, v]: any) => money(v, c)).join(' + ')}</div></div>
                        <b style={{ fontSize: 14, color: C.ink }}>{money(r.gbp)}</b><span style={{ color: C.muted, fontSize: 12 }}>{open === k ? '▴' : '▾'}</span>
                      </button>
                      {open === k && <div style={{ padding: '0 0 10px 19px' }}>{r.items.map((it: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '4px 0', color: C.ink }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span><span>{money(it.amount, it.currency)}</span></div>)}{r.count > r.items.length && <div style={{ fontSize: 12, color: C.muted }}>…and {r.count - r.items.length} more</div>}</div>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>}
      </Body>
    </CrmPage>
  )
}

function delta(now: number, before: number, upIsGood: boolean) {
  const p = pct(now, before); if (p === null) return 'No figures last month'
  const good = upIsGood ? p >= 0 : p <= 0
  return <span style={{ color: good ? '#0E7C55' : C.red, fontWeight: 600 }}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% <span style={{ color: C.muted, fontWeight: 400 }}>on last month</span></span>
}
const Key = ({ c, l }: { c: string; l: string }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}</span>
function Trend({ trend, sel, onPick }: { trend: any[]; sel: string; onPick: (m: string) => void }) {
  const W = 640, H = 230, pl = 52, pb = 26, pt = 18, ch = H - pb - pt
  const mx = Math.max(1, ...trend.flatMap(t => [t.in, t.out]))
  const step = Math.pow(10, Math.floor(Math.log10(mx))), top = Math.ceil(mx / step) * step
  const ticks = [0, top / 2, top], gw = (W - pl) / trend.length, bw = Math.min(26, gw / 3)
  const [hover, setHover] = useState<number | null>(null)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 10, display: 'block' }} role="img" aria-label="Money in and out for the last six months">
      {ticks.map(t => { const y = pt + ch - t / top * ch; return <g key={t}><line x1={pl} x2={W} y1={y} y2={y} stroke="#EEEBE3" /><text x={pl - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8A877F">{money(t, 'GBP', true)}</text></g> })}
      {trend.map((t, i) => {
        const x = pl + i * gw + gw / 2, hi = pt + ch - t.in / top * ch, ho = pt + ch - t.out / top * ch, on = t.month === sel
        return (
          <g key={t.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick(t.month)} style={{ cursor: 'pointer' }}>
            <rect x={pl + i * gw} y={pt} width={gw} height={ch + pb} fill={on ? '#FBF6EA' : hover === i ? '#FAF8F3' : 'transparent'} />
            <rect x={x - bw - 1} y={hi} width={bw} height={Math.max(0, pt + ch - hi)} rx="3" fill={IN} />
            <rect x={x + 1} y={ho} width={bw} height={Math.max(0, pt + ch - ho)} rx="3" fill={OUT} />
            <text x={x} y={H - 7} textAnchor="middle" fontSize="11.5" fontWeight={on ? 700 : 400} fill={on ? '#191815' : '#8A877F'}>{mLabel(t.month)}</text>
            {hover === i && <g><rect x={Math.min(W - 150, Math.max(pl, x - 72))} y={2} width="144" height="40" rx="6" fill="#191815" /><text x={Math.min(W - 150, Math.max(pl, x - 72)) + 10} y={18} fontSize="11.5" fill="#fff">In {money(t.in)}</text><text x={Math.min(W - 150, Math.max(pl, x - 72)) + 10} y={34} fontSize="11.5" fill="#D8D2C4">Out {money(t.out)}</text></g>}
          </g>
        )
      })}
    </svg>
  )
}
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: '18px 20px' }
const h: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, color: C.ink }
const sub: React.CSSProperties = { fontSize: 12, color: C.muted, marginTop: 2 }
const navBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', fontSize: 18, cursor: 'pointer', color: C.ink, fontFamily: 'inherit' }
