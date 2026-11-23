'use client'
// The pack as an investor sees it. Used for the live preview in Pack Builder and on the public page (/p/…).
import React, { useState } from 'react'
import { calcExample, calcPack, gbp, jmd, type PackData } from '@/lib/pack-calc'

const NAVY = '#14264A'
const INK = '#101828', MUTED = '#667085', LINE = '#E4E7EC'
const sec: React.CSSProperties = { padding: '20px 22px', borderBottom: `1px solid ${LINE}` }
const td: React.CSSProperties = { padding: '10px 0', fontSize: 14.5, borderBottom: `1px solid #F2F4F7`, verticalAlign: 'middle' }
const sm: React.CSSProperties = { display: 'block', fontSize: 12, color: MUTED, fontWeight: 400 }
const Sub = ({ children }: { children: React.ReactNode }) => <span style={sm}>{children}</span>

function Heading({ n, children }: { n: number; children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: NAVY, color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
    <span style={{ fontSize: 17, fontWeight: 600, color: INK }}>{children}</span>
  </div>
}

function Row({ k, v, sub, bold }: { k: string; v: string; sub?: string; bold?: boolean }) {
  return <tr><td style={{ ...td, color: bold ? INK : MUTED, fontWeight: bold ? 600 : 400 }}>{k}</td><td style={{ ...td, textAlign: 'right', fontWeight: bold ? 600 : 400, color: INK }}>{v}{sub && <Sub>{sub}</Sub>}</td></tr>
}

function Price({ label, value, sub, side }: { label: string; value: string; sub: string; side: string }) {
  return <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
    <div><div style={{ fontSize: 12, color: MUTED }}>{label}</div><div style={{ fontSize: 22, fontWeight: 600, color: INK }}>{value}</div></div>
    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13.5, color: MUTED }}>{sub}</div><div style={{ fontSize: 12, color: MUTED }}>{side}</div></div>
  </div>
}

function Gallery({ photos, credit }: { photos: string[]; credit?: string }) {
  const [cur, setCur] = useState(0)
  if (!photos.length) return null
  const i = Math.min(cur, photos.length - 1)
  return <div style={{ marginBottom: 12 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photos[i]} alt={`Photo ${i + 1} of ${photos.length}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10, display: 'block', background: '#F2F4F7' }} />
    {photos.length > 1 && <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      {photos.map((u, k) => <button key={u + k} type="button" aria-label={`Show photo ${k + 1}`} onClick={() => setCur(k)} style={{ width: 62, height: 46, padding: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: k === i ? `2px solid ${NAVY}` : `1px solid ${LINE}`, background: '#F2F4F7' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </button>)}
    </div>}
    {credit && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>{credit}</div>}
  </div>
}

const RATING: Record<string, { bg: string; fg: string }> = { Strong: { bg: '#E3F5EC', fg: '#067647' }, Tight: { bg: '#FFF4DE', fg: '#93560B' }, 'Walk away': { bg: '#FDECEC', fg: '#B42318' } }

// The worked landlord-offer example: how we decide what rent to offer a landlord, with one set of illustrative figures.
function Example({ d, n }: { d: PackData; n: number }) {
  const e = d.example, x = calcExample(e)
  const tile = (label: string, value: string, sub: string, hi?: boolean) => <div style={{ flex: '1 1 130px', border: `1px solid ${hi ? NAVY : LINE}`, background: hi ? '#F0F4FB' : '#fff', borderRadius: 10, padding: '10px 12px' }}>
    <div style={{ fontSize: 12, color: MUTED }}>{label}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div><div style={{ fontSize: 11.5, color: MUTED }}>{sub}</div>
  </div>
  // The recommended level replaces its own row, as in the Deal Analyser.
  const rows = [...x.rows.map(r => x.recRow && r.pct === x.recRow.pct ? x.recRow : r), ...(x.ask ? [x.ask] : [])]
  return <div style={sec}>
    <Heading n={n}>{e.title}</Heading>
    <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>{e.intro}</div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      {tile('Market rent', gbp(e.market_gbp), 'What the home could let for')}
      {tile('What the landlord really keeps', gbp(e.keeps_gbp), 'After empty months and repairs')}
      {x.rec ? tile('Our offer', gbp(x.rec.pay), `${x.rec.l}% below market, ${e.term_years} years`, true) : tile('Our offer', 'Walk away', 'No level works', true)}
      {tile('Most we can pay', gbp(x.maxPay), `Keeps our ${gbp(x.target)} a month profit`)}
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Offer', 'Below market', 'We pay', 'Profit a month'].map((h, i) => <th key={h} style={{ textAlign: i ? 'right' : 'left', fontSize: 12, color: MUTED, fontWeight: 400, padding: '6px 0', borderBottom: `1px solid ${LINE}` }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.label}>
        <td style={{ ...td, fontWeight: r.label === 'Recommended' ? 600 : 400 }}>{r.label}</td>
        <td style={{ ...td, textAlign: 'right' }}>{r.pct}%</td>
        <td style={{ ...td, textAlign: 'right', fontWeight: r.label === 'Recommended' ? 600 : 400 }}>{gbp(r.pay)}</td>
        <td style={{ ...td, textAlign: 'right' }}>{gbp(r.profit)} <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: RATING[r.rating].bg, color: RATING[r.rating].fg }}>{r.rating}</span></td>
      </tr>)}</tbody>
    </table>
    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>Income {gbp(e.income_gbp)} a month, other costs {gbp(e.costs_gbp)} a month, target profit {e.target_pct}% of income. Strong means profit at least 25% above target; Tight means it meets the target by less than 25%.</div>
    {x.rec && <div style={{ background: NAVY, color: '#fff', borderRadius: 10, padding: '14px 16px', marginTop: 14, fontSize: 14, lineHeight: 1.6 }}>
      Chasing {gbp(e.market_gbp)}, most landlords lose a month or two a year to empty periods and repairs, so they really keep about {gbp(e.keeps_gbp)}. We pay you {gbp(x.rec.pay)} every month, guaranteed, for {e.term_years} {e.term_years === 1 ? 'year' : 'years'}, even when it is empty, and you never deal with a tenant.
    </div>}
    <div style={{ fontSize: 14, fontWeight: 600, margin: '14px 0 4px' }}>What the landlord gets</div>
    <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>Same rent every month, even when it is empty<br />Fixed {e.term_years}-year term<br />No tenant-finding or chasing rent<br />Day-to-day repairs handled<br />Property returned in good condition</div>
  </div>
}

export default function PackView({ data: d, name, company }: { data: PackData; name: string; company: string }) {
  const c = calcPack(d)
  const g = (j: number) => gbp(c.toGbp(j))
  const full = d.kind !== 'property'
  let n = 0 // section numbers follow what is shown
  return (
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden', fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: INK }}>
      <div style={{ background: NAVY, color: '#fff', padding: '22px' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 14 }}>{(company || 'NOVOURQ').toUpperCase()}</div>
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 16 }}>{name || 'Investment pack'}</div>
        {d.prepared_for && <div style={{ fontSize: 14, color: '#C5CFE6', marginTop: 4 }}>Prepared for {d.prepared_for}</div>}
        <div style={{ fontSize: 13, color: '#C5CFE6', marginTop: 12 }}>{c.inv === 1 ? 'One investor' : `${c.inv} investors, equal shares`}. Rate used: J${Math.round(c.rate * 100) / 100} = £1.</div>
      </div>

      {d.about && <div style={sec}>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>About us</div>
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>{d.about}</div>
      </div>}

      <div style={{ ...sec, background: '#F6F8FB' }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>{c.inv === 1 ? 'You put in' : 'Each investor puts in'}</div>
        <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.2 }}>{gbp(c.eachGbp)}</div>
        <div style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 1.7 }}>{!full ? 'Upfront for the property' : <>Car deposit share: {jmd(c.depositEach)} ({g(c.depositEach)})<br />Property share</>}: {gbp(c.homeEach)} ({jmd(c.homeEach * c.rate)})</div>
      </div>

      {full && <div style={sec}>
        <Heading n={++n}>The car: {d.car.title}</Heading>
        <Price label="Purchase price" value={jmd(d.car.price_jmd)} sub={g(d.car.price_jmd)} side="" />
        {d.car.note && <div style={{ fontSize: 13, color: MUTED, margin: '-4px 0 12px' }}>{d.car.note}</div>}
        <Gallery photos={d.car.photos} credit={d.car.credit} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <Row k={`Deposit (${d.car.deposit_pct}%), paid by investors`} v={jmd(c.deposit)} sub={g(c.deposit)} />
          <Row bold k={c.inv === 1 ? 'Your deposit' : "Each investor's share"} v={jmd(c.depositEach)} sub={g(c.depositEach)} />
          <Row k="Car earns each week (target)" v={jmd(d.car.weekly_jmd)} sub={g(d.car.weekly_jmd)} />
          {c.inv > 1 && <Row bold k="Each investor's part" v={jmd(c.weeklyEach)} sub={g(c.weeklyEach)} />}
        </tbody></table>
        {c.depositWeeks > 0 && <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>The deposit is earned back in about {Math.round(c.depositWeeks)} weeks of car earnings, before costs.</div>}
      </div>}

      <div style={sec}>
        <Heading n={++n}>The property: {d.home.title}</Heading>
        <Price label="Listed price" value={`${gbp(d.home.rent_gbp)} a month`} sub={jmd(c.homeJmd)} side="Rent" />
        <Gallery photos={d.home.photos} />
        {d.home.details && <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '0 0 8px' }}>{d.home.details}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {d.home.rent_months > 0 && <Row k={d.home.rent_months === 1 ? "First month's rent" : `Rent paid up front (${d.home.rent_months} months)`} v={gbp(d.home.rent_gbp * d.home.rent_months)} />}
          {d.home.deposit_months > 0 && <Row k={`Security deposit (${d.home.deposit_months} ${d.home.deposit_months === 1 ? 'month' : 'months'})`} v={gbp(d.home.rent_gbp * d.home.deposit_months)} />}
          <Row bold k="Total to start" v={gbp(c.homeUpfront)} />
          {c.inv > 1 && <Row bold k="Each investor's share" v={gbp(c.homeEach)} />}
        </tbody></table>
        {c.sublet.length > 0 && <>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 2px' }}>If we sublet it furnished</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Sublet rent', 'Left each month', c.inv > 1 ? 'Each investor' : 'To you'].map((h, i) => <th key={h} style={{ textAlign: i ? 'right' : 'left', fontSize: 12, color: MUTED, fontWeight: 400, padding: '6px 0', borderBottom: `1px solid ${LINE}` }}>{h}</th>)}</tr></thead>
            <tbody>{c.sublet.map(s => <tr key={s.rent}><td style={td}>{gbp(s.rent)}</td><td style={{ ...td, textAlign: 'right', color: s.left < 0 ? '#B42318' : INK }}>{gbp(s.left)}</td><td style={{ ...td, textAlign: 'right', color: s.left < 0 ? '#B42318' : INK }}>{gbp(s.each)}</td></tr>)}</tbody>
          </table>
        </>}
        {d.home.deposit_months > 0 && <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>The security deposit is refundable under the lease.</div>}
      </div>

      {full && c.cover.length > 0 && <div style={sec}>
        <Heading n={++n}>Can the car pay for the property?</Heading>
        <div style={{ fontSize: 14, color: MUTED, marginBottom: 10 }}>If the property is empty, the car income pays the rent and the car finance.</div>
        <div style={{ background: '#F6F8FB', borderRadius: 10, padding: '12px 14px', marginBottom: 8, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: MUTED }}>Property rent</span><span style={{ fontWeight: 600 }}>{jmd(d.cover.rent_jmd)} a month <span style={{ color: MUTED, fontWeight: 400 }}>({g(d.cover.rent_jmd)})</span></span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6 }}><span style={{ color: MUTED }}>Car finance</span><span style={{ fontWeight: 600 }}>{jmd(d.cover.finance_jmd)} a month <span style={{ color: MUTED, fontWeight: 400 }}>({g(d.cover.finance_jmd)})</span></span></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Car earns a week', 'Rent and finance', 'Each month'].map((h, i) => <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left', fontSize: 12, color: MUTED, fontWeight: 400, padding: '6px 0', borderBottom: `1px solid ${LINE}` }}>{h}</th>)}</tr></thead>
          <tbody>{c.cover.map(r => <tr key={r.weekly}>
            <td style={td}>{jmd(r.weekly)}<Sub>{g(r.weekly)}</Sub></td>
            <td style={td}><span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: r.covered ? '#E3F5EC' : '#FDECEC', color: r.covered ? '#067647' : '#B42318' }}>{r.covered ? 'Covered' : 'Not covered'}</span></td>
            <td style={{ ...td, textAlign: 'right' }}>{jmd(Math.abs(r.left))} {r.covered ? 'spare' : 'short'}<Sub>{g(Math.abs(r.left))}</Sub></td>
          </tr>)}</tbody>
        </table>
        <div style={{ marginTop: 12, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12.5, color: MUTED }}>The car needs to earn about</div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>{jmd(Math.round(c.breakEvenWeekly / 100) * 100)} a week <span style={{ fontSize: 15, color: MUTED, fontWeight: 400 }}>({g(Math.round(c.breakEvenWeekly / 100) * 100)})</span></div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>to cover the rent and the finance.{c.inv > 1 ? ' Anything above is shared equally between the investors.' : ''}</div>
        </div>
      </div>}

      {d.example.on && <Example d={d} n={++n} />}

      {d.footer && <div style={{ padding: '14px 22px', background: '#F6F8FB', fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{d.footer}</div>}
    </div>
  )
}
