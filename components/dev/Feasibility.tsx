'use client'
// Developments → Feasibility. For one site: what each way out earns (land as is, paper lots, finished pads, homes built),
// with Downside / Base / Upside, live cost sliders, a 3D site you can watch being built, sources and uses,
// comparable sales and site facts. Arithmetic on the figures the user enters, not advice.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ReferenceLine } from 'recharts'
import TerrainView, { SLOPE_BANDS, type Preset } from '@/components/dev/TerrainView'
import { DEFAULTS, DEFAULT_SHIFT, runAll, short, type Inputs, type Case, type Way, type CaseShift } from '@/lib/dev-feasibility'
import { sampleGrid, samplePads, padEarthworks, totalMoved, gridFromPoints, type Grid, type Pad } from '@/lib/dev-terrain'

const SANS = "Inter, 'Segoe UI', Arial, sans-serif", SERIF = "'Source Serif 4', Georgia, serif", MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace"
const C = { ink: '#1E1C18', mute: '#7A7466', line: '#E6E1D5', paper: '#F3F0E9', card: '#FFFEFB', soft: '#F5F2EB', navy: '#14110D', green: '#12604A', red: '#B42318', amber: '#B54708', blue: '#2F6DB5' }
const WAYCOL: Record<Way, string> = { land: '#9AA5B1', paper: '#E39B2D', pads: '#2F9E6A', homes: '#2F6DB5' }
const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 2px rgba(30,28,24,.04)' }
const cap: React.CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '.09em', textTransform: 'uppercase', color: C.mute }
const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13.5, fontFamily: SANS, boxSizing: 'border-box', background: '#fff' }
const ghost: React.CSSProperties = { padding: '7px 13px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 8, cursor: 'pointer', fontFamily: SANS, fontSize: 13 }

export type Saved = { inputs: Inputs; shift: Record<Case, CaseShift>; comps: Comp[]; facts: Fact[]; pads: Pad[]; siteName: string; moveRate: number; location: { lat: string; lng: string } }
type Comp = { id: string; label: string; size: number; price: number }
type Fact = { k: string; v: string; src: string }

const SAMPLE_COMPS: Comp[] = [
  { id: 'c1', label: 'Allen Park', size: 2150, price: 452000 }, { id: 'c2', label: 'Watkins Grove', size: 2480, price: 489000 },
  { id: 'c3', label: 'Haywood Glen', size: 2290, price: 470000 }, { id: 'c4', label: 'Everlee', size: 2010, price: 431000 },
  { id: 'c5', label: 'Hunters Pointe', size: 2760, price: 520000 }, { id: 'c6', label: 'Milburnie Ridge', size: 2390, price: 478000 },
  { id: 'c7', label: 'Peace River', size: 1890, price: 418000 }, { id: 'c8', label: 'Allen Park', size: 2630, price: 505000 },
]
const SAMPLE_FACTS: Fact[] = [
  { k: 'Parcel / title no.', v: 'Example only: enter yours', src: '' }, { k: 'Zoning', v: 'R-4 residential', src: 'Local planning office' },
  { k: 'Planning status', v: 'Subdivision approved in principle', src: 'Planning decision notice' }, { k: 'Utilities at the boundary', v: 'Water and electricity, no sewer', src: 'Utility letters' },
  { k: 'Flood / creek', v: 'Creek crosses the north land, 30 ft buffer each side', src: 'Survey' }, { k: 'Last sold', v: 'Example only', src: '' },
]

export const newSaved = (): Saved => ({ inputs: { ...DEFAULTS }, shift: JSON.parse(JSON.stringify(DEFAULT_SHIFT)), comps: SAMPLE_COMPS, facts: SAMPLE_FACTS, pads: samplePads(), siteName: 'Sample site (example figures)', moveRate: 9, location: { lat: '', lng: '' } })

const WAYTITLE: Record<Way, string> = { land: 'Hold the land', paper: 'Sell approved lots', pads: 'Finish the pads', homes: 'Build homes' }
const WAYTAB: Record<Way, string> = { land: 'Land as is', paper: 'Paper lots', pads: 'Pads finished', homes: 'Homes built' }

export default function Feasibility({ symbol = '£', initial, onSave, saving, isExample = true, loadGround }: {
  symbol?: string; initial?: Saved; onSave?: (s: Saved) => void; saving?: boolean; isExample?: boolean
  loadGround?: (lat: number, lng: number, size: number) => Promise<{ n: number; size: number; z: number[] }>
}) {
  const [s, setS] = useState<Saved>(initial || newSaved())
  const [cas, setCas] = useState<Case>('base')
  const [way, setWay] = useState<Way>('homes')
  const [grid, setGrid] = useState<Grid>(() => sampleGrid())
  const [ex, setEx] = useState(2)
  const [preset, setPreset] = useState<Preset>('angle')
  const [month, setMonth] = useState(9999); const [playing, setPlaying] = useState(false)
  const [surveyText, setSurveyText] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: keyof Inputs, v: number) => setS(p => ({ ...p, inputs: { ...p.inputs, [k]: Number.isFinite(v) ? v : 0 } }))

  const earth = useMemo(() => padEarthworks(grid, s.pads), [grid, s.pads])
  const moved = totalMoved(earth)
  const earthCost = (moved.cut + moved.fill) * s.moveRate
  const inputs = useMemo(() => ({ ...s.inputs, earthworks: earthCost }), [s.inputs, earthCost])
  const results = useMemo(() => runAll(inputs, s.shift[cas]), [inputs, s.shift, cas])
  const sel = results.find(r => r.way === way)!
  const best = Math.max(1, ...results.map(r => Math.abs(r.profit)))
  const m = (n: number) => short(n, symbol)
  const monthNow = Math.min(month, sel.months)
  const finished = monthNow >= sel.months
  const cashNow = finished ? sel.timeline[sel.timeline.length - 1]?.cumulative ?? 0 : sel.timeline[Math.max(0, Math.floor(monthNow) - 1)]?.cumulative ?? 0

  // play the build from month 0 to the end
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!playing) return
    let cur = finished ? 0 : monthNow, last = performance.now()
    const tick = (t: number) => { cur += ((t - last) / 1000) * (sel.months / 9); last = t; if (cur >= sel.months) { setMonth(9999); setPlaying(false); return } setMonth(cur); raf.current = requestAnimationFrame(tick) }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const compAvg = s.comps.length ? s.comps.reduce((a, c) => a + c.price, 0) / s.comps.length : 0
  const compPpu = s.comps.length ? s.comps.reduce((a, c) => a + c.price / Math.max(1, c.size), 0) / s.comps.length : 0
  const tone = (v: number) => (v < 0 ? C.red : C.green)

  const slider = (label: string, k: keyof Inputs, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.ink }}><span>{label}</span><b style={{ fontFamily: MONO, fontWeight: 600 }}>{fmt(s.inputs[k])}</b></div>
      <input type="range" min={min} max={max} step={step} value={s.inputs[k]} onChange={e => set(k, Number(e.target.value))} style={{ width: '100%', accentColor: C.navy }} />
    </label>
  )
  const num = (label: string, k: keyof Inputs, step = 1) => (
    <label style={{ display: 'block' }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>{label}</div>
      <input type="number" step={step} value={s.inputs[k]} onChange={e => set(k, Number(e.target.value))} style={inp} /></label>
  )
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '9px 6px', fontSize: 13.5, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: SANS, background: on ? C.navy : 'transparent', color: on ? '#fff' : C.ink })
  const chip = (on: boolean): React.CSSProperties => ({ padding: '6px 8px', fontSize: 10.5, fontFamily: MONO, letterSpacing: '.07em', textTransform: 'uppercase', border: 'none', borderRadius: 7, cursor: 'pointer', background: on ? '#fff' : 'transparent', color: C.ink, fontWeight: on ? 600 : 500, boxShadow: on ? '0 1px 3px rgba(0,0,0,.18)' : 'none' })
  const stat = (label: string, value: string, color?: string) => (
    <div style={{ background: C.soft, borderRadius: 11, padding: '12px 13px' }}>
      <div style={{ fontSize: 21, fontWeight: 700, color: color || C.ink, letterSpacing: '-.01em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>{label}</div>
    </div>
  )

  async function pullGround() {
    const lat = Number(s.location.lat), lng = Number(s.location.lng)
    if (!loadGround) { setMsg('Ground levels need the live portal. They are not available in this preview.'); return }
    setBusy(true); setMsg('Fetching ground levels. This takes about ten seconds.')
    try { const d = await loadGround(lat, lng, grid.size); setGrid({ n: d.n, size: d.size, z: d.z, source: 'service' }); setMsg('Ground levels loaded (about 30 m between points, so rough).') }
    catch (e: any) { setMsg(e?.message || 'Could not load ground levels.') }
    setBusy(false)
  }
  function useSurvey() {
    const g = gridFromPoints(surveyText)
    if (!g) { setMsg('Paste at least four lines of x, y, height in metres, for example 12.5, 40, 101.3'); return }
    setGrid(g); setMsg('Survey ground loaded.')
  }

  const equityShare = sel.costs > 0 ? Math.round((sel.peakEquity / sel.costs) * 100) : 0
  const lots = Math.max(1, s.inputs.lots)

  return (
    <div style={{ padding: 24, display: 'grid', gap: 18, fontFamily: SANS, color: C.ink, background: C.paper }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:wght@400;500;600&display=swap" />
      {isExample && <div style={{ background: '#FFF8E6', border: '1px solid #F0D99A', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#7A5A00' }}>Example figures for an invented site. Change any number to use your own. This is arithmetic on the figures you enter, not advice.</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <input value={s.siteName} onChange={e => setS(p => ({ ...p, siteName: e.target.value }))} style={{ ...inp, width: 360, fontFamily: SERIF, fontWeight: 600, fontSize: 17, background: 'transparent', border: `1px dashed ${C.line}` }} />
        {onSave && <button onClick={() => onSave(s)} disabled={saving} style={{ padding: '9px 20px', fontSize: 13.5, fontWeight: 700, border: 'none', background: C.navy, color: '#fff', borderRadius: 9, cursor: 'pointer', fontFamily: SANS }}>{saving ? 'Saving…' : 'Save'}</button>}
      </div>

      {/* panel + site */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18, alignItems: 'start' }}>
        <div style={{ ...card, maxWidth: 470 }}>
          <div style={cap}>{s.siteName.replace(/\s*\(example figures\)/i, '')} · {s.inputs.acres} ac · {s.inputs.lots} lots · NOVOURQ</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 14px' }}>{WAYTITLE[way]}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: C.soft, borderRadius: 12, padding: 4, marginBottom: 8 }}>
            {results.map(r => <button key={r.way} onClick={() => { setWay(r.way); setMonth(9999) }} style={{ ...seg(way === r.way), flex: '1 1 40%' }}>{WAYTAB[r.way]}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 4, background: C.soft, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {(['downside', 'base', 'upside'] as Case[]).map(k => <button key={k} onClick={() => setCas(k)} style={{ ...seg(cas === k), textTransform: 'capitalize' }}>{k}</button>)}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div><div style={cap}>Profit</div><div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.025em', color: tone(sel.profit), lineHeight: 1.05 }}>{sel.profit >= 0 ? '+' : '-'}{symbol}{(Math.abs(sel.profit) / 1e6).toFixed(2)}M</div></div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: C.mute, lineHeight: 1.45 }}>{symbol}{(sel.sales / 1e6).toFixed(2)}M sales<br />{sel.months} months</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {stat('Margin on cost', `${sel.marginOnCost.toFixed(1)}%`, tone(sel.marginOnCost))}
            {stat('Peak cash in', m(sel.peakCash))}
            {stat('Return a year', `${sel.returnPerYear.toFixed(1)}%`, tone(sel.returnPerYear))}
            {stat('Per lot', m(sel.perLot), tone(sel.perLot))}
            {stat('Loan at peak', m(sel.loanAtPeak))}
            {stat('Equity multiple', `${sel.equityMultiple.toFixed(2)}x`)}
          </div>

          <div style={{ ...cap, marginBottom: 10 }}>Four ways out · profit</div>
          <div style={{ display: 'grid', gap: 11 }}>
            {results.map(r => (
              <div key={r.way} onClick={() => { setWay(r.way); setMonth(9999) }} style={{ cursor: 'pointer', opacity: r.way === way ? 1 : .8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{WAYTAB[r.way]} <span style={{ fontWeight: 400, color: C.mute, fontFamily: MONO, fontSize: 11.5 }}>{r.way === 'land' ? `hold, ${m(s.inputs.landPrice)}` : `${r.returnPerYear.toFixed(1)}% · ${r.months} mo · peak ${m(r.peakCash)}`}</span></span>
                  <b style={{ fontSize: 14, color: tone(r.profit) }}>{r.profit >= 0 ? '' : '-'}{m(Math.abs(r.profit))}</b>
                </div>
                <div style={{ height: 6, background: '#ECE8DD', borderRadius: 4, marginTop: 5 }}><div style={{ height: 6, width: `${Math.max(2, (Math.abs(r.profit) / best) * 100)}%`, background: r.profit < 0 ? C.red : WAYCOL[r.way], borderRadius: 4 }} /></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: C.mute, marginTop: 14, lineHeight: 1.5 }}>Each step adds profit, but also cash, time and market risk. Try Downside.</div>
        </div>

        {/* the site */}
        <div style={{ ...card, padding: 14, minWidth: 0 }}>
          <div style={{ position: 'relative' }}>
            <TerrainView grid={grid} pads={earth} exaggeration={ex} preset={preset} month={monthNow} months={sel.months} phases={sel.phases} withHouses={way === 'homes'} height={560} />
            <div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(255,254,251,.94)', border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 10px' }}>
              <div style={{ ...cap, fontSize: 9.5, marginBottom: 4 }}>Slope</div>
              {SLOPE_BANDS.map(b => <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: MONO, lineHeight: 1.5 }}><i style={{ width: 11, height: 11, background: b.color, borderRadius: 2, display: 'inline-block' }} />{b.label}</div>)}
            </div>
            <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,254,251,.96)', border: `1px solid ${C.line}`, borderRadius: 11, padding: 3, flexWrap: 'nowrap', whiteSpace: 'nowrap', justifyContent: 'center', maxWidth: '98%', overflowX: 'auto' }}>
              {([['pads', 'Pads'], ['creek', 'Creek'], ['angle', 'Angle'], ['top', 'Top down'], ['side', 'Side cut']] as [Preset, string][]).map(([k, l]) => <button key={k} onClick={() => setPreset(k)} style={chip(preset === k)}>{l}</button>)}
              <span style={{ ...cap, padding: '0 6px 0 10px', fontSize: 10 }}>Vert</span>
              {([1, 2, 3] as const).map(x => <button key={x} onClick={() => setEx(x)} style={chip(ex === x)}>{x}x</button>)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 6px 2px', flexWrap: 'wrap' }}>
            <button onClick={() => setPlaying(p => !p)} style={{ ...ghost, fontWeight: 700, minWidth: 64 }}>{playing ? 'Pause' : 'Play'}</button>
            <b style={{ fontSize: 13 }}>{finished ? 'Finished' : `Month ${Math.round(monthNow)} of ${sel.months}`}</b>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.mute }}>Profit <b style={{ color: tone(sel.profit) }}>{m(sel.profit)}</b> · Peak cash <b style={{ color: C.ink }}>{m(sel.peakCash)}</b> · Cash so far <b style={{ color: tone(cashNow) }}>{m(cashNow)}</b></span>
            <span style={{ fontSize: 12, color: C.mute, marginLeft: 'auto' }}>Drag to watch it build</span>
          </div>
          <input type="range" min={0} max={sel.months} step={0.25} value={monthNow} onChange={e => { setPlaying(false); setMonth(Number(e.target.value)) }} style={{ width: '100%', accentColor: C.navy }} />
        </div>
      </div>

      {/* sources and uses + sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 18 }}>
        <style>{'.su td,.su th{padding:9px 0 9px 16px}.su td:first-child,.su th:first-child{padding-left:0}.su td:last-child{white-space:normal;min-width:150px}'}</style>
        <div style={{ ...card, minWidth: 0, overflowX: 'auto' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, margin: '0 0 10px' }}>Sources and uses</h2>
          <table className="su" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SERIF, fontSize: 15, minWidth: 640 }}>
            <thead><tr style={{ ...cap, textAlign: 'right' }}><th style={{ textAlign: 'left', padding: '6px 0' }}>Use</th><th>Total</th><th>Per lot</th><th style={{ textAlign: 'left', paddingLeft: 14 }} /></tr></thead>
            <tbody>
              {sel.uses.map(u => (
                <tr key={u.label} style={{ borderTop: `1px solid ${C.line}`, textAlign: 'right' }}>
                  <td style={{ textAlign: 'left', padding: '9px 0' }}>{u.label}</td><td>{symbol}{Math.round(u.total).toLocaleString()}</td><td>{symbol}{Math.round(u.total / lots).toLocaleString()}</td>
                  <td style={{ textAlign: 'left', paddingLeft: 14, fontFamily: MONO, fontSize: 11.5, color: C.mute }}>{u.note}</td>
                </tr>))}
              <tr style={{ borderTop: `2px solid ${C.ink}`, textAlign: 'right', fontWeight: 700 }}><td style={{ textAlign: 'left', padding: '9px 0' }}>All-in cost</td><td>{symbol}{Math.round(sel.costs).toLocaleString()}</td><td>{symbol}{Math.round(sel.costs / lots).toLocaleString()}</td><td /></tr>
              <tr style={{ borderTop: `1px solid ${C.line}`, textAlign: 'right' }}><td style={{ textAlign: 'left', padding: '9px 0' }}>Funded by equity</td><td>{symbol}{Math.round(sel.peakEquity).toLocaleString()}</td><td /><td style={{ textAlign: 'left', paddingLeft: 14, fontFamily: MONO, fontSize: 11.5, color: C.mute }}>Equity goes in first, {equityShare}% of cost</td></tr>
              <tr style={{ borderTop: `1px solid ${C.line}`, textAlign: 'right' }}><td style={{ textAlign: 'left', padding: '9px 0' }}>Loan, at its highest</td><td>{symbol}{Math.round(sel.loanAtPeak).toLocaleString()}</td><td /><td style={{ textAlign: 'left', paddingLeft: 14, fontFamily: MONO, fontSize: 11.5, color: C.mute }}>{s.inputs.loanPct}% of spending, {s.inputs.interestPct}% a year</td></tr>
              <tr style={{ borderTop: `1px solid ${C.line}`, textAlign: 'right', fontWeight: 600 }}><td style={{ textAlign: 'left', padding: '9px 0' }}>Revenue</td><td>{symbol}{Math.round(sel.sales).toLocaleString()}</td><td>{symbol}{Math.round(sel.sales / lots).toLocaleString()}</td><td /></tr>
              <tr style={{ borderTop: `1px solid ${C.line}`, textAlign: 'right', fontWeight: 700, color: tone(sel.profit) }}><td style={{ textAlign: 'left', padding: '9px 0' }}>Levered profit</td><td>{sel.profit < 0 ? '-' : ''}{symbol}{Math.round(Math.abs(sel.profit)).toLocaleString()}</td><td>{sel.profit < 0 ? '-' : ''}{symbol}{Math.round(Math.abs(sel.profit) / lots).toLocaleString()}</td><td /></tr>
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={{ ...cap, marginBottom: 12 }}>Costs and prices · move them and watch profit change</div>
          {slider('Commission', 'commissionPct', 0, 8, 0.25, v => `${v}%`)}
          {slider('Closing costs and concessions', 'closingPct', 0, 8, 0.25, v => `${v}%`)}
          {slider('Marketing', 'marketingPct', 0, 5, 0.25, v => `${v}%`)}
          {slider('Warranty reserve', 'warrantyPct', 0, 3, 0.25, v => `${v}%`)}
          {slider('Company overhead (G&A)', 'adminPct', 0, 10, 0.25, v => `${v}%`)}
          {slider('Contingency on building and site works', 'contingencyPct', 0, 25, 1, v => `${v}%`)}
          {slider('Loan share of spending', 'loanPct', 0, 90, 5, v => `${v}%`)}
          {slider('Interest a year', 'interestPct', 0, 20, 0.25, v => `${v}%`)}
          {slider('Developer subsidy to the HOA, per lot a month', 'hoaPerLotMonth', 0, 100, 1, v => `${symbol}${v}`)}
          {slider('City fees and permits, per lot', 'cityFeesPerLot', 0, 30000, 500, v => `${symbol}${v.toLocaleString()}`)}
        </div>
      </div>

      {/* inputs */}
      <div style={card}>
        <div style={{ ...cap, marginBottom: 12 }}>The site and each way out</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
          {num('Acres', 'acres', 0.1)}{num('Lots', 'lots')}{num('Land price paid', 'landPrice', 1000)}{num('Purchase costs %', 'purchaseCostsPct', 0.5)}
          {num('Land as is: sale price', 'landAsIsPrice', 1000)}{num('Land as is: months held', 'landAsIsMonths')}{num('Hold cost a month', 'holdCostPerMonth', 100)}
          {num('Approvals cost', 'approvalsCost', 1000)}{num('Approvals months', 'approvalsMonths')}{num('Paper lot price', 'paperLotPrice', 500)}
          {num('Site works (roads, services)', 'sitework', 10000)}{num('Site works months', 'siteworkMonths')}{num('Finished pad price', 'padLotPrice', 500)}
          {num('Build cost per home', 'buildCostPerHome', 1000)}{num('Build months', 'buildMonths')}{num('Home sale price', 'homePrice', 1000)}{num('Months to sell out', 'salesMonths')}
        </div>
        <div style={{ fontSize: 12.5, color: C.mute, marginTop: 10 }}>Earthworks from the ground view are added to site works automatically: {m(earthCost)}.</div>
        <div style={{ ...cap, margin: '16px 0 8px' }}>What Downside and Upside change</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(3,minmax(70px,140px))', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
          <span />{['Prices %', 'Costs %', 'Months %'].map(x => <span key={x} style={{ color: C.mute }}>{x}</span>)}
          {(['downside', 'upside'] as Case[]).map(k => (<Fragment key={k}>
            <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{k}</span>
            {(['price', 'cost', 'months'] as const).map(f => <input key={k + f} type="number" value={s.shift[k][f]} onChange={e => setS(p => ({ ...p, shift: { ...p.shift, [k]: { ...p.shift[k], [f]: Number(e.target.value) || 0 } } }))} style={inp} />)}
          </Fragment>))}
        </div>
      </div>

      {/* cash over time */}
      <div style={card}>
        <div style={{ ...cap, marginBottom: 10 }}>Cash over time · {WAYTAB[way]} · {cas}</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sel.timeline} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid stroke="#EEEAE0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => short(v as number)} width={56} />
              <Tooltip formatter={(v) => [short(Number(v), symbol), 'Net cash so far']} labelFormatter={l => `Month ${l}`} />
              <ReferenceLine y={0} stroke="#98A2B3" /><Line type="monotone" dataKey="cumulative" stroke={C.navy} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 12.5, color: C.mute }}>Below the line you are out of pocket. The lowest point is the most cash the project needs at once.</div>
      </div>

      {/* comps */}
      <div style={card}>
        <div style={{ ...cap, marginBottom: 10 }}>Comparable sales</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid stroke="#EEEAE0" /><XAxis type="number" dataKey="size" name="Size" tick={{ fontSize: 11 }} domain={['dataMin - 100', 'dataMax + 100']} />
                <YAxis type="number" dataKey="price" name="Price" tick={{ fontSize: 11 }} tickFormatter={v => short(v as number)} width={56} domain={['dataMin - 20000', 'dataMax + 20000']} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [n === 'Price' ? short(Number(v), symbol) : v, n]} />
                <Scatter data={s.comps} fill={C.blue} /><Scatter data={[{ size: 2300, price: s.inputs.homePrice }]} fill={C.red} shape="diamond" />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11.5, color: C.mute }}>Blue = recent sales you entered, by size (sq ft). Red diamond = your planned home price at 2,300 sq ft.</div>
          </div>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ color: C.mute, textAlign: 'left' }}><th>Sale</th><th>Size</th><th>Sold for</th><th /></tr></thead>
              <tbody>{s.comps.map(c => (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td><input value={c.label} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, label: e.target.value } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px', background: 'transparent' }} /></td>
                  <td><input type="number" value={c.size} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, size: Number(e.target.value) || 0 } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px', width: 70, background: 'transparent' }} /></td>
                  <td><input type="number" value={c.price} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, price: Number(e.target.value) || 0 } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px', width: 90, background: 'transparent' }} /></td>
                  <td><button onClick={() => setS(p => ({ ...p, comps: p.comps.filter(x => x.id !== c.id) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button></td>
                </tr>))}</tbody>
            </table>
            <button onClick={() => setS(p => ({ ...p, comps: [...p.comps, { id: 'c' + Date.now(), label: 'New sale', size: 2000, price: 400000 }] }))} style={{ ...ghost, marginTop: 8 }}>+ Add a sale</button>
            <div style={{ fontSize: 13, marginTop: 10 }}>Average sold price <b>{m(compAvg)}</b> · average per sq ft <b>{symbol}{compPpu.toFixed(0)}</b>. Your planned price is <b style={{ color: s.inputs.homePrice > compAvg * 1.05 ? C.amber : C.green }}>{compAvg ? `${Math.abs(((s.inputs.homePrice - compAvg) / compAvg) * 100).toFixed(1)}% ${s.inputs.homePrice >= compAvg ? 'above' : 'below'}` : '—'}</b> the average.</div>
          </div>
        </div>
      </div>

      {/* site facts */}
      <div style={card}>
        <div style={{ ...cap, marginBottom: 10 }}>Site facts and where they came from</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {s.facts.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1fr) 2fr minmax(120px,1fr) auto', gap: 8 }}>
              <input value={f.k} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, k: e.target.value } : x) }))} style={{ ...inp, fontWeight: 700 }} />
              <input value={f.v} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, v: e.target.value } : x) }))} style={inp} />
              <input placeholder="Source" value={f.src} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, src: e.target.value } : x) }))} style={inp} />
              <button onClick={() => setS(p => ({ ...p, facts: p.facts.filter((_, j) => j !== i) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button>
            </div>))}
        </div>
        <button onClick={() => setS(p => ({ ...p, facts: [...p.facts, { k: '', v: '', src: '' }] }))} style={{ ...ghost, marginTop: 10 }}>+ Add a fact</button>
      </div>

      {/* pads and ground */}
      <div style={card}>
        <div style={{ ...cap, marginBottom: 10 }}>Pads, earthworks and ground data · {grid.source === 'sample' ? 'example ground' : grid.source === 'survey' ? 'your survey' : 'ground levels from NASA SRTM (rough)'}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
            <thead><tr style={{ color: C.mute, textAlign: 'left' }}><th>Pad</th><th>East (m)</th><th>North (m)</th><th>Width</th><th>Depth</th><th>Level (m)</th><th>Cut (m³)</th><th>Fill (m³)</th><th /></tr></thead>
            <tbody>{earth.map(p => {
              const up = (k: 'x' | 'y' | 'w' | 'd', v: number) => setS(q => ({ ...q, pads: q.pads.map(x => x.id === p.id ? { ...x, [k]: Math.max(0, v || 0) } : x) }))
              const ci = { ...inp, padding: '4px 5px', width: 64 }
              return (<tr key={p.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td>{p.id}</td>
                {(['x', 'y', 'w', 'd'] as const).map(k => <td key={k}><input type="number" value={p[k]} onChange={e => up(k, Number(e.target.value))} style={ci} /></td>)}
                <td>{p.level.toFixed(1)}</td><td>{Math.round(p.cut).toLocaleString()}</td><td>{Math.round(p.fill).toLocaleString()}</td>
                <td><button onClick={() => setS(q => ({ ...q, pads: q.pads.filter(x => x.id !== p.id) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button></td>
              </tr>)
            })}
              <tr style={{ borderTop: `2px solid ${C.line}`, fontWeight: 700 }}><td>Total</td><td colSpan={5} /><td>{Math.round(moved.cut).toLocaleString()}</td><td>{Math.round(moved.fill).toLocaleString()}</td><td /></tr></tbody>
          </table>
        </div>
        <button onClick={() => setS(q => ({ ...q, pads: [...q.pads, { id: `Pad ${q.pads.length + 1}`, x: 20, y: 20, w: 38, d: 30 }] }))} style={{ ...ghost, marginTop: 8 }}>+ Add a pad</button>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end', margin: '12px 0' }}>
          <label style={{ width: 200 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Cost to move 1 m³ ({symbol})</div><input type="number" value={s.moveRate} onChange={e => setS(p => ({ ...p, moveRate: Number(e.target.value) || 0 }))} style={inp} /></label>
          <div style={{ fontSize: 14 }}>Earthworks estimate <b>{m(earthCost)}</b>, added to site works in the profit figures.</div>
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ width: 150 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Site latitude</div><input value={s.location.lat} placeholder="18.0179" onChange={e => setS(p => ({ ...p, location: { ...p.location, lat: e.target.value } }))} style={inp} /></label>
            <label style={{ width: 150 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Site longitude</div><input value={s.location.lng} placeholder="-77.2" onChange={e => setS(p => ({ ...p, location: { ...p.location, lng: e.target.value } }))} style={inp} /></label>
            <button onClick={pullGround} disabled={busy} style={{ ...ghost, background: C.navy, color: '#fff', border: 'none', fontWeight: 700 }}>{busy ? 'Loading…' : 'Load ground levels for this location'}</button>
            <button onClick={() => { setGrid(sampleGrid()); setMsg('Example ground restored.') }} style={ghost}>Use example ground</button>
          </div>
          <textarea value={surveyText} onChange={e => setSurveyText(e.target.value)} placeholder={'Or paste survey points, one per line: x, y, height (metres)\n0, 0, 101.2\n50, 0, 101.9\n0, 50, 103.0\n50, 50, 104.4'} rows={4} style={{ ...inp, fontFamily: MONO, fontSize: 12.5 }} />
          <div><button onClick={useSurvey} style={ghost}>Use these survey points</button></div>
          {msg && <div style={{ fontSize: 13, color: C.mute }}>{msg}</div>}
          <div style={{ fontSize: 12, color: C.mute }}>The free ground-level service gives about one height every 30 m, so it shows the lie of the land but is not detailed lidar. For earthworks you rely on, paste a survey. Pad positions are in metres from the south-west corner of the ground square. Houses and trees on the map are drawn for illustration.</div>
        </div>
      </div>
    </div>
  )
}
