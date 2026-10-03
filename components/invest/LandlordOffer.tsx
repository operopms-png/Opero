'use client'
// Landlord offer — Deal Analyser, Rent to Rent and Rent to HMO.
// The UK guaranteed-rent idea (LHA sits ~20–28% under market rent): offer the
// landlord less than top market rent in return for certainty. Works out:
//   • what the landlord really keeps at market rent (after empty months and repairs)
//   • the most you can pay and still make your target profit
//   • 3 offer levels below market, each with your profit and a rating
//   • the recommended offer (never above the most you can pay) and a ready pitch.
import { useState } from 'react'
import { symOf } from '../../lib/currency'

const C = { gold: '#C9A24A', goldText: '#8E6B1F', cream: '#FAF3E2', creamLine: '#EADBB8', ink: '#191815', ink2: '#55524b', mute: '#8a857a', line: '#ECE8DF', row: '#E6E9EF', border: '#D0D4E4', green: '#1F7A4D', greenBg: '#E7F4EC', amber: '#9A5B00', amberBg: '#FDF1DC', red: '#B3261E', redBg: '#FDECEA' }
const num = (v: any) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0 }

export function landlordOffer(form: any, result: any, market: any) {
  const asking = num(form.askingRent) || num(form.rent)
  const bm = market?.benchmarks?.find((b: any) => b?.key === 'landlord')
  const marketRent = num(form.offerMarketRent) || num(bm?.typical) || asking
  const emptyMonths = form.offerEmptyMonths === undefined || form.offerEmptyMonths === '' ? 1.5 : Math.min(11, Math.max(0, num(form.offerEmptyMonths)))
  const repairsPct = form.offerRepairsPct === undefined || form.offerRepairsPct === '' ? 5 : Math.max(0, num(form.offerRepairsPct))
  const income = num(result?.totalIncome)
  const otherCosts = Math.max(0, num(result?.monthlyExpenses) - num(result?.breakdown?.landlordRent))
  const targetProfit = form.offerTargetProfit === undefined || form.offerTargetProfit === '' ? Math.round(income * 0.2) : Math.max(0, num(form.offerTargetProfit))
  const landlordKeeps = Math.round(marketRent * (12 - emptyMonths) / 12 - marketRent * repairsPct / 100)
  const maxRent = Math.round(income - otherCosts - targetProfit)
  const tiers = [num(form.offerTier1 ?? 10) || 10, num(form.offerTier2 ?? 20) || 20, num(form.offerTier3 ?? 25) || 25]
  const rate = (profit: number) => profit < targetProfit || profit <= 0 ? 'walk' : profit < targetProfit * 1.25 ? 'tight' : 'strong'
  const rows = [
    ...tiers.map((pct, i) => { const offer = Math.round(marketRent * (1 - pct / 100)); const profit = income - otherCosts - offer; return { label: ['Light', 'Medium', 'Firm'][i], pct, offer, profit, rating: rate(profit) } }),
    { label: "Landlord's asking", pct: marketRent ? Math.round((1 - asking / marketRent) * 100) : 0, offer: asking, profit: income - otherCosts - asking, rating: rate(income - otherCosts - asking) },
  ]
  // Highest offer that still works for you AND undercuts what the landlord really keeps
  const ceiling = Math.min(maxRent, landlordKeeps)
  const rec = rows.slice(0, 3).filter(r => r.offer <= ceiling && r.rating !== 'walk').sort((a, b) => b.offer - a.offer)[0] || null
  return { asking, marketRent, fromMarket: !!bm?.typical && !num(form.offerMarketRent), emptyMonths, repairsPct, income, otherCosts, targetProfit, landlordKeeps, maxRent, rows, rec, years: Math.max(1, Math.round((num(form.leaseMonths) || 24) / 12)) }
}

export default function LandlordOffer({ form, setForm, result, market, onUseOffer }: { form: any; setForm: (f: any) => void; result: any; market: any; onUseOffer: (offer: number) => void }) {
  const S = symOf(form)
  const m = (v: number) => (v < 0 ? '−' : '') + S + Math.abs(Math.round(v)).toLocaleString('en-GB')
  const k = (v: number) => S + (Math.abs(v) >= 1000 ? Math.round(v / 1000).toLocaleString('en-GB') + 'k' : Math.round(v))
  const o = landlordOffer(form, result, market)
  const [copied, setCopied] = useState(false)
  const [edit, setEdit] = useState(false)
  const pitch = o.rec
    ? `Chasing ${m(o.marketRent)}, most landlords lose a month or two a year to empty periods and repairs, so they really keep about ${m(o.landlordKeeps)}. We pay you ${m(o.rec.offer)} every month, guaranteed, for ${o.years} year${o.years === 1 ? '' : 's'} — even when it's empty — and you never deal with a tenant.`
    : ''
  const badge = (r: string) => r === 'strong' ? { t: 'Strong', c: C.green, b: C.greenBg } : r === 'tight' ? { t: 'Tight', c: C.amber, b: C.amberBg } : { t: 'Walk away', c: C.red, b: C.redBg }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }
  const set = (key: string, v: string) => setForm({ ...form, [key]: v })

  // range bar
  const pts = [o.rows[2]?.offer, o.rec?.offer, o.maxRent, o.landlordKeeps, o.marketRent, o.asking].filter(v => v > 0)
  const lo = Math.min(...pts) * 0.9, hi = Math.max(...pts) * 1.04
  const pos = (v: number) => `${Math.min(100, Math.max(0, (v - lo) / (hi - lo || 1) * 100))}%`
  const okEnd = Math.min(100, Math.max(0, (o.maxRent - lo) / (hi - lo || 1) * 100))

  if (!o.income) return null
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 20px', borderBottom: '1px solid ' + C.line }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Landlord offer</div>
          <div style={{ fontSize: 12.5, color: C.mute, marginTop: 2 }}>What to offer below market rent, and why the landlord should say yes</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: o.rec ? C.greenBg : C.redBg, color: o.rec ? C.green : C.red }}>{o.rec ? 'Deal works' : 'Walk away at these numbers'}</span>
          <button onClick={() => setEdit(!edit)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>{edit ? 'Done' : 'Adjust'}</button>
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {edit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18, padding: 14, background: '#FCFBF8', border: '1px solid ' + C.line, borderRadius: 8 }}>
            <div><label style={lbl}>Market rent ({S}/month)</label><input type="number" style={inp} value={form.offerMarketRent ?? ''} placeholder={String(Math.round(o.marketRent))} onChange={e => set('offerMarketRent', e.target.value)} /></div>
            <div><label style={lbl}>Landlord's asking ({S})</label><input type="number" style={inp} value={form.askingRent ?? ''} placeholder={String(Math.round(o.asking))} onChange={e => set('askingRent', e.target.value)} /></div>
            <div><label style={lbl}>Empty months a year</label><input type="number" step="0.5" style={inp} value={form.offerEmptyMonths ?? ''} placeholder="1.5" onChange={e => set('offerEmptyMonths', e.target.value)} /></div>
            <div><label style={lbl}>Repairs (% of rent)</label><input type="number" style={inp} value={form.offerRepairsPct ?? ''} placeholder="5" onChange={e => set('offerRepairsPct', e.target.value)} /></div>
            <div><label style={lbl}>Your target profit ({S}/month)</label><input type="number" style={inp} value={form.offerTargetProfit ?? ''} placeholder={String(o.targetProfit)} onChange={e => set('offerTargetProfit', e.target.value)} /></div>
            <div><label style={lbl}>Offers below market (%)</label><div style={{ display: 'flex', gap: 6 }}>{['offerTier1', 'offerTier2', 'offerTier3'].map((key, i) => <input key={key} type="number" style={inp} value={form[key] ?? ''} placeholder={String([10, 20, 25][i])} onChange={e => set(key, e.target.value)} />)}</div></div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {[
            { l: `Market rent${form.bedrooms ? ` (${form.bedrooms}-bed)` : ''}`, v: m(o.marketRent), s: o.fromMarket ? 'From the market check' : num(form.offerMarketRent) ? 'Your figure' : "Landlord's asking — run the market check for a local figure" },
            { l: 'What the landlord really keeps', v: m(o.landlordKeeps), s: `After ${o.emptyMonths} empty month${o.emptyMonths === 1 ? '' : 's'} a year and ${o.repairsPct}% repairs` },
            { l: 'Recommended offer', v: o.rec ? m(o.rec.offer) : '—', s: o.rec ? `${o.rec.pct}% below market · ${o.years} year${o.years === 1 ? '' : 's'}` : 'No offer level works', hl: true },
            { l: 'Most you can pay', v: m(o.maxRent), s: `Keeps your ${m(o.targetProfit)} a month profit` },
          ].map(x => (
            <div key={x.l} style={{ border: '1px solid ' + (x.hl ? C.creamLine : C.line), background: x.hl ? C.cream : '#fff', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: x.hl ? '#8A6B2E' : C.mute }}>{x.l}</div>
              <div style={{ fontSize: 23, fontWeight: 800, color: C.ink, marginTop: 4 }}>{x.v}</div>
              <div style={{ fontSize: 11.5, color: C.ink2, marginTop: 2 }}>{x.s}</div>
            </div>
          ))}
        </div>

        {/* where each figure sits */}
        <div style={{ position: 'relative', height: 70, margin: '22px 8px 8px' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 6, borderRadius: 3, background: '#F6D4D0' }} />
          <div style={{ position: 'absolute', left: 0, width: okEnd + '%', top: 30, height: 6, borderRadius: 3, background: '#CFE8D9' }} />
          {[
            o.rec && { v: o.rec.offer, t: `Offer ${k(o.rec.offer)}`, c: C.ink, up: true },
            { v: o.maxRent, t: `Max ${k(o.maxRent)}`, c: C.green, up: true },
            { v: o.marketRent, t: `Market ${k(o.marketRent)}`, c: C.mute, up: true },
            { v: o.landlordKeeps, t: `Landlord keeps ${k(o.landlordKeeps)}`, c: C.goldText, up: false },
            o.asking !== o.marketRent && { v: o.asking, t: `Asking ${k(o.asking)}`, c: C.red, up: false },
          ].filter(Boolean).map((x: any, i) => (
            <div key={i} style={{ position: 'absolute', left: pos(x.v), top: x.up ? 0 : 30, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11.5, color: x.c, fontWeight: x.up ? 700 : 500 }}>
              {x.up ? <>{x.t}<div style={{ width: 2, height: 22, background: x.c, margin: '3px auto 0' }} /></> : <><div style={{ width: 2, height: 16, background: x.c, margin: '0 auto 3px' }} />{x.t}</>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 14, marginTop: 14, alignItems: 'start' }}>
          <div style={{ border: '1px solid ' + C.line, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#FCFBF8' }}>{['Offer', 'Below market', 'You pay', 'Profit / month', ''].map((h, i) => <th key={i} style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: C.mute, fontWeight: 600, textAlign: i && i < 4 ? 'right' : 'left', padding: '10px 12px', borderBottom: '1px solid ' + C.line, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>{o.rows.map((r, i) => {
                  const isRec = o.rec && r.label === o.rec.label && i < 3
                  const b = badge(r.rating)
                  return (
                    <tr key={i} style={{ background: isRec ? C.cream : '#fff' }}>
                      <td style={{ padding: '11px 12px', borderTop: i ? '1px solid #F2EFE8' : 'none', fontWeight: isRec ? 700 : 400 }}>{isRec ? 'Recommended' : r.label}</td>
                      <td style={{ padding: '11px 12px', borderTop: i ? '1px solid #F2EFE8' : 'none', textAlign: 'right' }}>{r.pct}%</td>
                      <td style={{ padding: '11px 12px', borderTop: i ? '1px solid #F2EFE8' : 'none', textAlign: 'right', fontWeight: isRec ? 700 : 400 }}>{m(r.offer)}</td>
                      <td style={{ padding: '11px 12px', borderTop: i ? '1px solid #F2EFE8' : 'none', textAlign: 'right', fontWeight: isRec ? 700 : 400, color: r.rating === 'walk' ? C.red : C.ink }}>{m(r.profit)}</td>
                      <td style={{ padding: '11px 12px', borderTop: i ? '1px solid #F2EFE8' : 'none' }}><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: b.b, color: b.c, whiteSpace: 'nowrap' }}>{b.t}</span></td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', fontSize: 12, color: C.ink2, borderTop: '1px solid #F2EFE8' }}>
              Your income {m(o.income)}{result?.rooms ? ` (${result.rooms} × ${m(o.income / (result.rooms || 1))})` : ''} · your other costs {m(o.otherCosts)} a month
            </div>
          </div>

          <div>
            {o.rec ? (
              <div style={{ background: C.ink, color: '#fff', borderRadius: 10, padding: '16px 18px', fontSize: 14, lineHeight: 1.6 }}>“{pitch}”</div>
            ) : (
              <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: '14px 16px', fontSize: 13, lineHeight: 1.6 }}>
                Even {o.rows[2].pct}% below market doesn't leave you {m(o.targetProfit)} a month. Raise your room or unit income, cut costs, or only go ahead if the landlord accepts {m(Math.max(0, Math.min(o.maxRent, o.landlordKeeps)))} or less.
              </div>
            )}
            <div style={{ border: '1px solid ' + C.line, borderRadius: 10, padding: '12px 16px', marginTop: 12, fontSize: 13, color: '#3b3833', lineHeight: 1.85 }}>
              <div style={{ fontWeight: 700, color: C.ink, marginBottom: 2 }}>What the landlord gets</div>
              Same rent every month, even when it's empty<br />Fixed {o.years}-year term<br />No tenant-finding or chasing rent<br />Day-to-day repairs handled<br />Property returned in good condition
            </div>
            {o.rec && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => { navigator.clipboard?.writeText(pitch); setCopied(true); setTimeout(() => setCopied(false), 1800) }} style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: C.ink, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied' : 'Copy pitch'}</button>
                {Math.round(num(form.rent)) !== o.rec.offer && <button onClick={() => onUseOffer(o.rec!.offer)} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Run the numbers at {m(o.rec.offer)}</button>}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.mute, marginTop: 14, lineHeight: 1.5 }}>
          The UK version of this is the Local Housing Allowance, which currently sits about 20–28% below market rent. Get the landlord's written permission to sublet, and put it in the lease.
        </div>
      </div>
    </div>
  )
}
