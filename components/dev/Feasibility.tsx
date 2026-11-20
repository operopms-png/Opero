'use client'
// Developments → Feasibility. For one site: what each way out earns (land as is, paper lots, finished pads, homes built),
// with Downside / Base / Upside, live cost sliders, comparable sales, site facts and the ground.
import { Fragment, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ReferenceLine } from 'recharts'
import TerrainView from '@/components/dev/TerrainView'
import { DEFAULTS, DEFAULT_SHIFT, WAYS, runAll, short, type Inputs, type Case, type Way, type CaseShift } from '@/lib/dev-feasibility'
import { sampleGrid, samplePads, padEarthworks, totalMoved, gridFromPoints, type Grid, type Pad } from '@/lib/dev-terrain'

const C = { ink: '#1B2A4A', mute: '#667085', line: '#E4E7EC', soft: '#F6F8FB', blue: '#2F6DB5', navy: '#0B1F3A', green: '#067647', red: '#B42318', amber: '#B54708' }
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '18px 20px' }
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.mute, margin: '0 0 12px' }
const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }

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

export default function Feasibility({ symbol = '£', initial, onSave, saving, isExample = true, loadGround }: {
  symbol?: string; initial?: Saved; onSave?: (s: Saved) => void; saving?: boolean; isExample?: boolean
  loadGround?: (lat: number, lng: number, size: number) => Promise<{ n: number; size: number; z: number[] }>
}) {
  const [s, setS] = useState<Saved>(initial || newSaved())
  const [cas, setCas] = useState<Case>('base')
  const [way, setWay] = useState<Way>('homes')
  const [grid, setGrid] = useState<Grid>(() => sampleGrid())
  const [ex, setEx] = useState(2)
  const [view, setView] = useState<'angle' | 'top'>('angle')
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

  const compAvg = s.comps.length ? s.comps.reduce((a, c) => a + c.price, 0) / s.comps.length : 0
  const compPpu = s.comps.length ? s.comps.reduce((a, c) => a + c.price / Math.max(1, c.size), 0) / s.comps.length : 0

  const slider = (label: string, k: keyof Inputs, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.ink }}><span>{label}</span><b>{fmt(s.inputs[k])}</b></div>
      <input type="range" min={min} max={max} step={step} value={s.inputs[k]} onChange={e => set(k, Number(e.target.value))} style={{ width: '100%', accentColor: C.blue }} />
    </label>
  )
  const num = (label: string, k: keyof Inputs, step = 1) => (
    <label style={{ display: 'block' }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>{label}</div>
      <input type="number" step={step} value={s.inputs[k]} onChange={e => set(k, Number(e.target.value))} style={inp} /></label>
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

  const caseBtn = (k: Case, label: string) => (
    <button key={k} onClick={() => setCas(k)} style={{ padding: '8px 16px', fontSize: 13.5, fontWeight: 700, border: `1px solid ${cas === k ? C.navy : C.line}`, background: cas === k ? C.navy : '#fff', color: cas === k ? '#fff' : C.ink, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
  )
  const stat = (label: string, value: string, tone?: string) => (
    <div style={{ background: C.soft, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone || C.ink }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>{label}</div>
    </div>
  )
  const tone = (v: number) => (v < 0 ? C.red : C.green)

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16, fontFamily: 'Figtree, Segoe UI, Arial, sans-serif', color: C.ink }}>
      {isExample && <div style={{ background: '#FFF8E6', border: '1px solid #F0D99A', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#7A5A00' }}>Example figures for an invented 24.3-acre, 45-lot site. Change any number to use your own. Nothing here is advice, it is arithmetic on the figures you enter.</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <input value={s.siteName} onChange={e => setS(p => ({ ...p, siteName: e.target.value }))} style={{ ...inp, width: 340, fontWeight: 700, fontSize: 15 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {caseBtn('downside', 'Downside')}{caseBtn('base', 'Base')}{caseBtn('upside', 'Upside')}
          {onSave && <button onClick={() => onSave(s)} disabled={saving} style={{ padding: '8px 18px', fontSize: 13.5, fontWeight: 700, border: 'none', background: C.blue, color: '#fff', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save'}</button>}
        </div>
      </div>

      {/* headline for the chosen way */}
      <div style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {results.map(r => (
            <button key={r.way} onClick={() => setWay(r.way)} style={{ padding: '8px 14px', textAlign: 'left', border: `1px solid ${way === r.way ? C.navy : C.line}`, background: way === r.way ? C.navy : '#fff', color: way === r.way ? '#fff' : C.ink, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.label}</div><div style={{ fontSize: 11, opacity: .75 }}>{r.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.mute }}>PROFIT</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: tone(sel.profit), lineHeight: 1 }}>{sel.profit >= 0 ? '+' : ''}{m(sel.profit)}</div>
          <div style={{ fontSize: 13, color: C.mute }}>{m(sel.sales)} in sales over {sel.months} months</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          {stat('Margin on cost', `${sel.marginOnCost.toFixed(1)}%`, tone(sel.marginOnCost))}
          {stat('Peak cash needed', m(sel.peakCash))}
          {stat('Return a year', `${sel.returnPerYear.toFixed(1)}%`, tone(sel.returnPerYear))}
          {stat('Profit per lot', m(sel.perLot), tone(sel.perLot))}
          {stat('Loan at peak', m(sel.loanAtPeak))}
          {stat('Your own money at peak', m(sel.peakEquity))}
          {stat('Equity multiple', `${sel.equityMultiple.toFixed(2)}x`)}
        </div>
      </div>

      {/* four ways out */}
      <div style={card}>
        <h3 style={h3}>Four ways out · profit · {cas}</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {results.map(r => (
            <div key={r.way} onClick={() => setWay(r.way)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{r.label} <span style={{ fontWeight: 400, color: C.mute }}>· {r.months} mo · peak cash {m(r.peakCash)} · {r.returnPerYear.toFixed(0)}% a year</span></span>
                <b style={{ color: tone(r.profit) }}>{r.profit >= 0 ? '+' : ''}{m(r.profit)}</b>
              </div>
              <div style={{ height: 9, background: '#EEF1F6', borderRadius: 6 }}><div style={{ height: 9, width: `${Math.max(2, (Math.abs(r.profit) / best) * 100)}%`, background: r.profit < 0 ? C.red : r.way === way ? C.navy : C.blue, borderRadius: 6, opacity: r.way === way ? 1 : .6 }} /></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: C.mute, marginTop: 12 }}>Each step adds profit but also cash, time and market risk. Try Downside.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
        {/* sliders */}
        <div style={card}>
          <h3 style={h3}>Costs and prices · move them and watch profit change</h3>
          {slider('Commission', 'commissionPct', 0, 8, 0.25, v => `${v}%`)}
          {slider('Closing costs and concessions', 'closingPct', 0, 8, 0.25, v => `${v}%`)}
          {slider('Marketing', 'marketingPct', 0, 5, 0.25, v => `${v}%`)}
          {slider('Warranty reserve', 'warrantyPct', 0, 3, 0.25, v => `${v}%`)}
          {slider('Company overhead (G&A)', 'adminPct', 0, 10, 0.25, v => `${v}%`)}
          {slider('Contingency on building and site works', 'contingencyPct', 0, 25, 1, v => `${v}%`)}
          {slider('Loan share of spending', 'loanPct', 0, 90, 5, v => `${v}%`)}
          {slider('Interest a year', 'interestPct', 0, 20, 0.25, v => `${v}%`)}
          {slider('Developer subsidy to the HOA, per lot a month', 'hoaPerLotMonth', 0, 100, 1, v => `${symbol}${v}`)}
        </div>

        {/* inputs */}
        <div style={card}>
          <h3 style={h3}>The site and each way out</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {num('Acres', 'acres', 0.1)}{num('Lots', 'lots')}
            {num('Land price paid', 'landPrice', 1000)}{num('Purchase costs %', 'purchaseCostsPct', 0.5)}
            {num('Land as is: sale price', 'landAsIsPrice', 1000)}{num('Land as is: months held', 'landAsIsMonths')}
            {num('Hold cost a month', 'holdCostPerMonth', 100)}{num('Approvals cost', 'approvalsCost', 1000)}
            {num('Approvals months', 'approvalsMonths')}{num('Paper lot price', 'paperLotPrice', 500)}
            {num('Site works (roads, services)', 'sitework', 10000)}{num('Site works months', 'siteworkMonths')}
            {num('Finished pad price', 'padLotPrice', 500)}{num('Build cost per home', 'buildCostPerHome', 1000)}
            {num('Build months', 'buildMonths')}{num('Home sale price', 'homePrice', 1000)}
            {num('Months to sell out', 'salesMonths')}
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 10 }}>Earthworks from the ground view below are added to site works automatically: {m(earthCost)}.</div>
          <h3 style={{ ...h3, marginTop: 16 }}>What Downside and Upside change</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(3,1fr)', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
            <span />{['Prices %', 'Costs %', 'Months %'].map(x => <span key={x} style={{ color: C.mute }}>{x}</span>)}
            {(['downside', 'upside'] as Case[]).map(k => (<Fragment key={k}>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{k}</span>
              {(['price', 'cost', 'months'] as const).map(f => <input key={k + f} type="number" value={s.shift[k][f]} onChange={e => setS(p => ({ ...p, shift: { ...p.shift, [k]: { ...p.shift[k], [f]: Number(e.target.value) || 0 } } }))} style={inp} />)}
            </Fragment>))}
          </div>
        </div>
      </div>

      {/* cash over time */}
      <div style={card}>
        <h3 style={h3}>Cash over time · {sel.label} · {cas}</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sel.timeline} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid stroke="#EEF1F6" /><XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'month', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => short(v as number)} width={56} /><Tooltip formatter={(v) => [short(Number(v), symbol), 'Net cash so far']} labelFormatter={l => `Month ${l}`} />
              <ReferenceLine y={0} stroke="#98A2B3" /><Line type="monotone" dataKey="cumulative" stroke={C.navy} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 12.5, color: C.mute }}>Below the line you are out of pocket. The lowest point is the most cash the project needs at once.</div>
      </div>

      {/* comps */}
      <div style={card}>
        <h3 style={h3}>Comparable sales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid stroke="#EEF1F6" /><XAxis type="number" dataKey="size" name="Size" tick={{ fontSize: 11 }} domain={['dataMin - 100', 'dataMax + 100']} label={{ value: 'size (sq ft)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis type="number" dataKey="price" name="Price" tick={{ fontSize: 11 }} tickFormatter={v => short(v as number)} width={56} domain={['dataMin - 20000', 'dataMax + 20000']} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [n === 'Price' ? short(Number(v), symbol) : v, n]} />
                <Scatter data={s.comps} fill={C.blue} />
                <Scatter data={[{ size: 2300, price: s.inputs.homePrice }]} fill={C.red} shape="diamond" />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11.5, color: C.mute }}>Blue = recent sales you entered. Red diamond = your planned home price at 2,300 sq ft.</div>
          </div>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ color: C.mute, textAlign: 'left' }}><th>Sale</th><th>Size</th><th>Sold for</th><th /></tr></thead>
              <tbody>{s.comps.map(c => (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td><input value={c.label} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, label: e.target.value } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px' }} /></td>
                  <td><input type="number" value={c.size} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, size: Number(e.target.value) || 0 } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px', width: 70 }} /></td>
                  <td><input type="number" value={c.price} onChange={e => setS(p => ({ ...p, comps: p.comps.map(x => x.id === c.id ? { ...x, price: Number(e.target.value) || 0 } : x) }))} style={{ ...inp, border: 'none', padding: '5px 2px', width: 90 }} /></td>
                  <td><button onClick={() => setS(p => ({ ...p, comps: p.comps.filter(x => x.id !== c.id) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button></td>
                </tr>))}</tbody>
            </table>
            <button onClick={() => setS(p => ({ ...p, comps: [...p.comps, { id: 'c' + Date.now(), label: 'New sale', size: 2000, price: 400000 }] }))} style={{ marginTop: 8, padding: '6px 12px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>+ Add a sale</button>
            <div style={{ fontSize: 13, marginTop: 10 }}>Average sold price <b>{m(compAvg)}</b> · average per sq ft <b>{symbol}{compPpu.toFixed(0)}</b>. Your planned price is <b style={{ color: s.inputs.homePrice > compAvg * 1.05 ? C.amber : C.green }}>{compAvg ? `${(((s.inputs.homePrice - compAvg) / compAvg) * 100).toFixed(1)}% ${s.inputs.homePrice >= compAvg ? 'above' : 'below'}` : '—'}</b> the average.</div>
          </div>
        </div>
      </div>

      {/* site facts */}
      <div style={card}>
        <h3 style={h3}>Site facts and where they came from</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {s.facts.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1fr) 2fr minmax(120px,1fr) auto', gap: 8 }}>
              <input value={f.k} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, k: e.target.value } : x) }))} style={{ ...inp, fontWeight: 700 }} />
              <input value={f.v} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, v: e.target.value } : x) }))} style={inp} />
              <input placeholder="Source" value={f.src} onChange={e => setS(p => ({ ...p, facts: p.facts.map((x, j) => j === i ? { ...x, src: e.target.value } : x) }))} style={inp} />
              <button onClick={() => setS(p => ({ ...p, facts: p.facts.filter((_, j) => j !== i) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button>
            </div>))}
        </div>
        <button onClick={() => setS(p => ({ ...p, facts: [...p.facts, { k: '', v: '', src: '' }] }))} style={{ marginTop: 10, padding: '6px 12px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>+ Add a fact</button>
      </div>

      {/* ground */}
      <div style={card}>
        <h3 style={h3}>Ground, pads and earthworks · {grid.source === 'sample' ? 'example ground' : grid.source === 'survey' ? 'your survey' : 'ground levels from NASA SRTM (rough)'}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {([1, 2, 3] as const).map(x => <button key={x} onClick={() => setEx(x)} style={{ padding: '6px 12px', fontSize: 13, border: `1px solid ${ex === x ? C.navy : C.line}`, background: ex === x ? C.navy : '#fff', color: ex === x ? '#fff' : C.ink, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>{x}x height</button>)}
          {(['angle', 'top'] as const).map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', fontSize: 13, border: `1px solid ${view === v ? C.navy : C.line}`, background: view === v ? C.navy : '#fff', color: view === v ? '#fff' : C.ink, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>{v === 'top' ? 'Top down' : 'Angle'}</button>)}
        </div>
        <TerrainView grid={grid} pads={earth} exaggeration={ex} view={view} />
        <div style={{ fontSize: 12, color: C.mute, margin: '6px 0 12px' }}>Drag to turn, scroll to zoom. Green low, tan high, blue the lowest ground (creek or wet). Yellow slabs are pads at the level that balances cut and fill.</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
            <thead><tr style={{ color: C.mute, textAlign: 'left' }}><th>Pad</th><th>East (m)</th><th>North (m)</th><th>Width</th><th>Depth</th><th>Level (m)</th><th>Cut (m³)</th><th>Fill (m³)</th><th /></tr></thead>
            <tbody>{earth.map(p => {
              const up = (k: 'x' | 'y' | 'w' | 'd', v: number) => setS(q => ({ ...q, pads: q.pads.map(x => x.id === p.id ? { ...x, [k]: Math.max(0, v || 0) } : x) }))
              const ci = { ...inp, padding: '4px 5px', width: 64 }
              return (<tr key={p.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td>{p.id}</td>
                <td><input type="number" value={p.x} onChange={e => up('x', Number(e.target.value))} style={ci} /></td>
                <td><input type="number" value={p.y} onChange={e => up('y', Number(e.target.value))} style={ci} /></td>
                <td><input type="number" value={p.w} onChange={e => up('w', Number(e.target.value))} style={ci} /></td>
                <td><input type="number" value={p.d} onChange={e => up('d', Number(e.target.value))} style={ci} /></td>
                <td>{p.level.toFixed(1)}</td><td>{Math.round(p.cut).toLocaleString()}</td><td>{Math.round(p.fill).toLocaleString()}</td>
                <td><button onClick={() => setS(q => ({ ...q, pads: q.pads.filter(x => x.id !== p.id) }))} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer' }}>×</button></td>
              </tr>)
            })}
              <tr style={{ borderTop: `2px solid ${C.line}`, fontWeight: 700 }}><td>Total</td><td colSpan={5} /><td>{Math.round(moved.cut).toLocaleString()}</td><td>{Math.round(moved.fill).toLocaleString()}</td><td /></tr></tbody>
          </table>
        </div>
        <button onClick={() => setS(q => ({ ...q, pads: [...q.pads, { id: `Pad ${q.pads.length + 1}`, x: 20, y: 20, w: 38, d: 30 }] }))} style={{ marginTop: 8, padding: '6px 12px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>+ Add a pad</button>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end', margin: '12px 0' }}>
          <label style={{ width: 200 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Cost to move 1 m³ ({symbol})</div><input type="number" value={s.moveRate} onChange={e => setS(p => ({ ...p, moveRate: Number(e.target.value) || 0 }))} style={inp} /></label>
          <div style={{ fontSize: 14 }}>Earthworks estimate <b>{m(earthCost)}</b>, added to site works in the profit figures above.</div>
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ width: 150 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Site latitude</div><input value={s.location.lat} placeholder="18.0179" onChange={e => setS(p => ({ ...p, location: { ...p.location, lat: e.target.value } }))} style={inp} /></label>
            <label style={{ width: 150 }}><div style={{ fontSize: 11.5, color: C.mute, marginBottom: 3 }}>Site longitude</div><input value={s.location.lng} placeholder="-77.2" onChange={e => setS(p => ({ ...p, location: { ...p.location, lng: e.target.value } }))} style={inp} /></label>
            <button onClick={pullGround} disabled={busy} style={{ padding: '8px 14px', border: 'none', background: C.blue, color: '#fff', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>{busy ? 'Loading…' : 'Load ground levels for this location'}</button>
            <button onClick={() => { setGrid(sampleGrid()); setMsg('Example ground restored.') }} style={{ padding: '8px 14px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Use example ground</button>
          </div>
          <textarea value={surveyText} onChange={e => setSurveyText(e.target.value)} placeholder={'Or paste survey points, one per line: x, y, height (metres)\n0, 0, 101.2\n50, 0, 101.9\n0, 50, 103.0\n50, 50, 104.4'} rows={4} style={{ ...inp, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }} />
          <div><button onClick={useSurvey} style={{ padding: '8px 14px', border: `1px solid ${C.line}`, background: '#fff', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Use these survey points</button></div>
          {msg && <div style={{ fontSize: 13, color: C.mute }}>{msg}</div>}
          <div style={{ fontSize: 12, color: C.mute }}>The free ground-level service gives about one height every 30 m, so it shows the lie of the land but not detailed lidar. For earthworks you rely on, paste a survey. Pad positions are in metres from the south-west corner of the ground square.</div>
        </div>
      </div>
    </div>
  )
}
