'use client'
// Developments tabs worked out from existing records: Cash Flow & Profit, Build-to-Rent, Development Reports.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cur } from '@/lib/company-currency'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16, marginBottom: 12 }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #F2F4F7', flexWrap: 'wrap' }
const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: 110 }
const btn: React.CSSProperties = { fontSize: 12, color: '#2F6DB5', background: '#fff', border: '1px solid #2F6DB5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }
const money = (n: number) => `${cur()}${Math.round(n || 0).toLocaleString()}`
const num = (v: any) => Number(v) || 0
const Empty = ({ t }: { t: string }) => <div style={{ textAlign: 'center', padding: 50, color: '#98A2B3', fontSize: 14 }}>{t}</div>
const SOLD = ['Completed', 'Exchanged', 'Reserved']

function useRows(userId: string, tables: string[]) {
  const [d, setD] = useState<any[][] | null>(null)
  const [n, setN] = useState(0)
  useEffect(() => { if (!userId) return; (async () => {
    const res = await Promise.all(tables.map(t => supabase.from(t).select('*').eq('user_id', userId)))
    setD(res.map(r => r.data ?? []))
  })() /* eslint-disable-next-line */ }, [userId, n])
  return [d, () => setN(x => x + 1)] as const
}

// Per-project figures shared by Cash Flow & Profit and Development Reports
function figures(p: any, units: any[], items: any[], funding: any[]) {
  const u = units.filter(x => x.project_id === p.id)
  const b = items.filter(x => x.project_id === p.id)
  const gdv = u.reduce((s, x) => s + num(x.price), 0)
  const soldRev = u.filter(x => x.status === 'Completed').reduce((s, x) => s + num(x.price), 0)
  const secured = u.filter(x => SOLD.includes(x.status)).reduce((s, x) => s + num(x.price), 0)
  const budget = b.length ? b.reduce((s, x) => s + num(x.budgeted), 0) : num(p.total_budget)
  const actual = b.length ? b.reduce((s, x) => s + num(x.actual), 0) : num(p.spent)
  const f = funding.filter(x => x.project_id === p.id)
  return { gdv, soldRev, secured, budget, actual, units: u.length, sold: u.filter(x => x.status === 'Completed').length,
    profit: gdv - budget, margin: gdv ? ((gdv - budget) / gdv) * 100 : 0, cashNow: soldRev - actual,
    facilities: f.reduce((s, x) => s + num(x.amount), 0), drawn: f.reduce((s, x) => s + num(x.drawn), 0) }
}

export function CashFlowProfit({ userId }: { userId: string }) {
  const [d] = useRows(userId, ['dev_projects', 'dev_units', 'dev_budget_items', 'dev_funding'])
  if (!d) return <Empty t="Loading…" />
  const [projects, units, items, funding] = d
  if (!projects.length) return <Empty t="Add a project to see cash flow and profit" />
  const all = projects.map(p => ({ p, f: figures(p, units, items, funding) }))
  const tot = (k: 'gdv' | 'budget' | 'profit' | 'cashNow') => all.reduce((s, x) => s + x.f[k], 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[['Projected sales value', money(tot('gdv'))], ['Total cost budget', money(tot('budget'))], ['Projected profit', money(tot('profit'))], ['Cash position now', money(tot('cashNow'))]].map(([l, v]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '8px 14px' }}>
            <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89' }}>{v}</div>
          </div>))}
      </div>
      {all.map(({ p, f }) => (
        <div key={p.id} style={card}>
          <div style={h}>{p.name}</div>
          {[['Projected sales value (all units)', money(f.gdv)], ['Sales completed', money(f.soldRev)], ['Reserved, exchanged and completed', money(f.secured)], ['Cost budget', money(f.budget)], ['Spent so far', money(f.actual)],
            ['Cash position (completed sales minus spent)', money(f.cashNow)], ['Funding facilities / drawn', `${money(f.facilities)} / ${money(f.drawn)}`], ['Projected profit', money(f.profit)], ['Projected margin', `${f.margin.toFixed(1)}%`]].map(([l, v]) => (
            <div key={l} style={row}><span>{l}</span><b>{v}</b></div>))}
        </div>))}
    </div>
  )
}

export function BuildToRent({ userId, projects }: { userId: string; projects: any[] }) {
  const [d, reload] = useRows(userId, ['dev_btr', 'dev_units'])
  const [f, setF] = useState<any>({ project_id: '', unit_label: '', target_rent: '', operating_cost_monthly: '' })
  const [msg, setMsg] = useState('')
  if (!d) return <Empty t="Loading…" />
  const [rows, units] = d
  async function add() {
    if (!f.project_id || !f.unit_label) { setMsg('Choose a project and enter a unit'); return }
    const { error } = await supabase.from('dev_btr').insert([{ user_id: userId, project_id: f.project_id, unit_label: f.unit_label, target_rent: f.target_rent === '' ? null : Number(f.target_rent), operating_cost_monthly: f.operating_cost_monthly === '' ? null : Number(f.operating_cost_monthly) }])
    if (error) { setMsg(error.message); return }
    setMsg(''); setF({ ...f, unit_label: '', target_rent: '', operating_cost_monthly: '' }); reload()
  }
  async function toggle(r: any, k: string) { await supabase.from('dev_btr').update({ [k]: !r[k] }).eq('id', r.id); reload() }
  async function handOver(r: any) {
    const pname = projects.find(p => p.id === r.project_id)?.name ?? 'Development'
    if (!confirm(`Hand ${r.unit_label} over to Property Management as a new property?`)) return
    const { data, error } = await supabase.from('pm_properties').insert([{ user_id: userId, name: `${pname} - ${r.unit_label}` }]).select('id').single()
    if (error) { setMsg(error.message); return }
    await supabase.from('dev_btr').update({ handed_to_pm: true, pm_property_id: data?.id }).eq('id', r.id)
    setMsg(`${r.unit_label} is now in Property Management`); reload()
  }
  async function del(id: string) { if (!confirm('Delete this unit?')) return; await supabase.from('dev_btr').delete().eq('id', id); reload() }
  const net = rows.reduce((s, r) => s + num(r.target_rent) - num(r.operating_cost_monthly), 0)
  return (
    <div>
      <div style={card}>
        <div style={h}>Add a build-to-rent unit</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ ...inp, width: 170 }} value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value })}>
            <option value="">Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input style={inp} placeholder="Unit" list="btr-units" value={f.unit_label} onChange={e => setF({ ...f, unit_label: e.target.value })} />
          <datalist id="btr-units">{units.filter(u => u.project_id === f.project_id).map(u => <option key={u.id} value={u.unit_number} />)}</datalist>
          <input style={inp} type="number" placeholder="Target rent / mo" value={f.target_rent} onChange={e => setF({ ...f, target_rent: e.target.value })} />
          <input style={inp} type="number" placeholder="Running cost / mo" value={f.operating_cost_monthly} onChange={e => setF({ ...f, operating_cost_monthly: e.target.value })} />
          <button style={{ ...btn, background: '#2F6DB5', color: '#fff' }} onClick={add}>Add</button>
        </div>
        {msg && <div style={{ fontSize: 13, color: '#B54708', marginTop: 8 }}>{msg}</div>}
      </div>
      <div style={card}>
        <div style={h}>Units held for rent — net monthly {money(net)}</div>
        {rows.length === 0 ? <Empty t="No build-to-rent units yet" /> : rows.map(r => (
          <div key={r.id} style={row}>
            <span><b>{r.unit_label}</b> · {projects.find(p => p.id === r.project_id)?.name ?? ''}</span>
            <span>{money(num(r.target_rent))} rent · {money(num(r.operating_cost_monthly))} costs</span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={btn} onClick={() => toggle(r, 'rental_ready')}>{r.rental_ready ? 'Rental ready ✓' : 'Mark rental ready'}</button>
              {r.handed_to_pm ? <span style={{ color: '#067647', fontWeight: 600 }}>In Property Management</span> : <button style={btn} onClick={() => handOver(r)}>Hand over to Property Management</button>}
              <button style={{ ...btn, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => del(r.id)}>Delete</button>
            </span>
          </div>))}
      </div>
    </div>
  )
}

export function DevReports({ userId }: { userId: string }) {
  const [d] = useRows(userId, ['dev_projects', 'dev_units', 'dev_budget_items', 'dev_funding', 'dev_work_packages', 'dev_milestones', 'dev_risks'])
  const [pid, setPid] = useState('')
  if (!d) return <Empty t="Loading…" />
  const [projects, units, items, funding, wps, miles, risks] = d
  if (!projects.length) return <Empty t="Add a project to see development reports" />
  const p = projects.find(x => x.id === pid) ?? projects[0]
  const f = figures(p, units, items, funding)
  const w = wps.filter(x => x.project_id === p.id)
  const progress = w.length ? w.reduce((s, x) => s + num(x.percent_complete), 0) / w.length : 0
  const m = miles.filter(x => x.project_id === p.id)
  const today = new Date().toISOString().slice(0, 10)
  const late = m.filter(x => x.due_date && x.due_date < today && !['Complete', 'Completed', 'Done'].includes(x.status)).length
  const cats: Record<string, { b: number; a: number }> = {}
  items.filter(x => x.project_id === p.id).forEach(x => { const c = x.category || 'Other'; cats[c] = cats[c] ?? { b: 0, a: 0 }; cats[c].b += num(x.budgeted); cats[c].a += num(x.actual) })
  const openRisks = risks.filter(x => x.project_id === p.id && x.status !== 'Closed').length
  const sec = (t: string, lines: [string, string][]) => (
    <div style={card}><div style={h}>{t}</div>{lines.map(([l, v]) => <div key={l} style={row}><span>{l}</span><b>{v}</b></div>)}</div>)
  return (
    <div>
      <select style={{ ...inp, width: 240, marginBottom: 12 }} value={p.id} onChange={e => setPid(e.target.value)}>{projects.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      {sec('Project performance', [['Status', p.status ?? '—'], ['Units sold / total', `${f.sold} / ${f.units}`], ['Open risks', String(openRisks)], ['Projected margin', `${f.margin.toFixed(1)}%`]])}
      {sec('Budget variance', [['Budget', money(f.budget)], ['Actual', money(f.actual)], ['Variance (budget minus actual)', money(f.budget - f.actual)], ['Used', f.budget ? `${((f.actual / f.budget) * 100).toFixed(0)}%` : '—']])}
      {sec('Construction progress', [['Work packages', String(w.length)], ['Average complete', `${progress.toFixed(0)}%`], ['Delayed packages', String(w.filter(x => x.status === 'Delayed').length)]])}
      {sec('Timelines', [['Start', p.start_date ?? '—'], ['End', p.end_date ?? '—'], ['Milestones overdue', String(late)]])}
      {sec('Forecast returns', [['Projected sales value', money(f.gdv)], ['Projected profit', money(f.profit)], ['Return on cost', f.budget ? `${((f.profit / f.budget) * 100).toFixed(1)}%` : '—']])}
      {sec('Funding', [['Facilities', money(f.facilities)], ['Drawn', money(f.drawn)], ['Undrawn', money(f.facilities - f.drawn)]])}
      <div style={card}><div style={h}>Cost analysis by category</div>
        {Object.keys(cats).length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No budget lines yet. Add them in Finance → Budget.</div>
          : Object.entries(cats).map(([c, v]) => <div key={c} style={row}><span>{c}</span><b>{money(v.a)} of {money(v.b)}</b></div>)}
      </div>
    </div>
  )
}

// Tiles at the top of the Developments Dashboard: what needs attention across the new tabs. Each opens its tab.
export function DevGlance({ userId, go }: { userId: string; go: (tab: string) => void }) {
  const [d] = useRows(userId, ['dev_pipeline', 'dev_planning', 'dev_work_packages', 'dev_risks', 'dev_procurement', 'dev_funding', 'dev_handover', 'dev_tenders', 'dev_btr'])
  if (!d) return null
  const [pipe, plan, wps, risks, proc, fund, hand, tend, btr] = d
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const tiles: { label: string; value: string; sub: string; tab: string; warn?: boolean }[] = [
    { label: 'Pipeline', value: String(pipe.filter(x => !['Won', 'Lost'].includes(x.stage)).length), sub: 'open opportunities', tab: 'Pipeline' },
    { label: 'Planning', value: String(plan.filter(x => x.status === 'Submitted').length), sub: 'awaiting a decision', tab: 'Planning & Approvals' },
    { label: 'Construction', value: String(wps.filter(x => x.status === 'Delayed').length), sub: 'delayed work packages', tab: 'Construction Schedule', warn: wps.some(x => x.status === 'Delayed') },
    { label: 'Risks', value: String(risks.filter(x => x.status !== 'Closed' && x.likelihood === 'High' && x.impact === 'High').length), sub: 'high likelihood and impact', tab: 'Risk Register', warn: risks.some(x => x.status !== 'Closed' && x.likelihood === 'High' && x.impact === 'High') },
    { label: 'Procurement', value: String(proc.filter(x => x.approval === 'Pending').length), sub: 'awaiting approval', tab: 'Procurement' },
    { label: 'Deliveries', value: String(proc.filter(x => x.delivery_date && x.delivery_date <= in30 && !['Delivered', 'Cancelled'].includes(x.status)).length), sub: 'due within 30 days or late', tab: 'Procurement', warn: proc.some(x => x.delivery_date && x.delivery_date < today && !['Delivered', 'Cancelled'].includes(x.status)) },
    { label: 'Funding', value: `${money(fund.reduce((s, x) => s + num(x.drawn), 0))}`, sub: `drawn of ${money(fund.reduce((s, x) => s + num(x.amount), 0))}`, tab: 'Project Finance' },
    { label: 'Handover', value: String(hand.filter(x => x.status !== 'Done').length), sub: 'items still to do', tab: 'Handover' },
    { label: 'Tenders', value: String(tend.filter(x => ['Open', 'Evaluating'].includes(x.status)).length), sub: 'open tenders and quotes', tab: 'Tenders & Agreements' },
    { label: 'Build-to-Rent', value: String(btr.filter(x => x.rental_ready && !x.handed_to_pm).length), sub: 'ready to hand to Property Management', tab: 'Build-to-Rent' },
  ]
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Needs attention</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
        {tiles.map(t => (
          <button key={t.label} onClick={() => go(t.tab)} style={{ textAlign: 'left', background: '#fff', border: `1px solid ${t.warn ? '#FDA29B' : '#E4E7EC'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.warn ? '#B42318' : '#1D4E89' }}>{t.value}</div>
            <div style={{ fontSize: 11, color: '#98A2B3' }}>{t.sub}</div>
          </button>))}
      </div>
    </div>
  )
}
