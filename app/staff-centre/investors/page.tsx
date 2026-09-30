'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { C, MODULE_COLOR, CrmPage, CrmHeader, Body, Stat, Pill, Avatar, Group, Row, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'

const MODULES: { k: string; l: string; color: string }[] = [
  { k: 'str', l: 'Vacation Rentals', color: MODULE_COLOR.str },
  { k: 'pm', l: 'Property Management', color: MODULE_COLOR.pm },
  { k: 'ea', l: 'Estate Agency', color: MODULE_COLOR.ea },
  { k: 'dev', l: 'Developments', color: MODULE_COLOR.dev },
]
const STATUS: Record<string, { l: string; color: string }> = {
  active: { l: 'Active', color: C.green },
  pending: { l: 'Pending', color: C.orange },
  completed: { l: 'Completed', color: C.grey },
}
const STATUS_ORDER = ['active', 'pending', 'completed']

function moduleInfo(k: string) { return MODULES.find(m => m.k === k) ?? MODULES[3] }

export default function StaffCentreInvestorsPage() {
  const [loading, setLoading] = useState(true)
  const [investors, setInvestors] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [devProjects, setDevProjects] = useState<any[]>([])
  const [moduleFilter, setModuleFilter] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal, setModal] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [accountId, setAccountId] = useState<string | undefined>()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = await getAccountId(user)
    setAccountId(uid)
    const [i, p, dp] = await Promise.all([
      supabase.from('dev_investors').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('dev_investor_payments').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('dev_projects').select('id,name').eq('user_id', uid),
    ])
    setInvestors(i.data ?? [])
    setPayments(p.data ?? [])
    setDevProjects(dp.data ?? [])
    setLoading(false)
  }

  function paidBackTo(investorId: string) { return payments.filter(p => p.investor_id === investorId).reduce((s, p) => s + (p.amount ?? 0), 0) }
  function paybackLabel(i: any) {
    if (!i.payback_value) return 'No terms set'
    return i.payback_type === 'fixed' ? `£${Number(i.payback_value).toLocaleString()} fixed fee, ${i.payback_frequency}` : `${i.payback_value}% payback, ${i.payback_frequency}`
  }
  function projectName(i: any) {
    if (i.module === 'dev' && i.project_id) return devProjects.find(p => p.id === i.project_id)?.name ?? '—'
    return i.property_name || '—'
  }

  const filtered = moduleFilter === 'All' ? investors : investors.filter(i => (i.module ?? 'dev') === moduleFilter)
  const totalInvestment = filtered.reduce((s, i) => s + (i.investment_amount ?? 0), 0)
  const totalPaidBack = payments.filter(p => filtered.some(i => i.id === p.investor_id)).reduce((s, p) => s + (p.amount ?? 0), 0)

  async function save(table: string, data: any) {
    const sanitized = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from(table).update(sanitized).eq('id', editId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from(table).insert([{ ...sanitized, user_id: accountId }])
      if (error) { alert(error.message); setSaving(false); return }
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await load()
  }

  async function del(table: string, id: string) {
    if (!confirm('Delete?')) return
    await supabase.from(table).delete().eq('id', id)
    await load()
  }

  async function cycleStatus(i: any) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(i.status) + 1) % STATUS_ORDER.length]
    setInvestors(list => list.map(x => x.id === i.id ? { ...x, status: next } : x))
    const { error } = await supabase.from('dev_investors').update({ status: next }).eq('id', i.id)
    if (error) { alert(error.message); load() }
  }

  if (loading) return <Loading />

  const cols = [
    { k: 'n', l: 'Investor', w: 'minmax(200px,1.4fr)' },
    { k: 'p', l: 'Project / property', w: 160 },
    { k: 'i', l: 'Invested', w: 110 },
    { k: 'b', l: 'Paid back', w: 150 },
    { k: 't', l: 'Payback terms', w: 160 },
    { k: 's', l: 'Status', w: 120 },
    { k: 'a', l: '', w: 290 },
  ]
  const groups = MODULES.filter(m => moduleFilter === 'All' || m.k === moduleFilter).map(m => ({ m, list: filtered.filter(i => (i.module ?? 'dev') === m.k) })).filter(g => g.list.length || moduleFilter !== 'All')

  return (
    <CrmPage>
      <CrmHeader
        title="Investors"
        subtitle="Every investor across every module, in one place — what they put in, what we agreed to pay back, and every payment made."
        actions={<>
          <button onClick={() => { setForm({}); setEditId(null); setModal('payment') }} style={btn('ghost')}>Log payment</button>
          <button onClick={() => { setForm({ module: moduleFilter === 'All' ? 'dev' : moduleFilter, status: 'active' }); setEditId(null); setModal('investor') }} style={btn('gold')}>+ Add investor</button>
        </>}
        tabs={[{ k: 'All', l: 'All', count: investors.length }, ...MODULES.map(m => ({ k: m.k, l: m.l, count: investors.filter(i => (i.module ?? 'dev') === m.k).length }))]}
        tab={moduleFilter} onTab={setModuleFilter}
      />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
          <Stat label="Investors" value={filtered.length} />
          <Stat label="Total investment" value={`£${totalInvestment.toLocaleString()}`} />
          <Stat label="Paid back so far" value={`£${totalPaidBack.toLocaleString()}`} sub={totalInvestment ? `${Math.round(totalPaidBack / totalInvestment * 100)}% of invested` : undefined} />
          <Stat label="Still owed" value={`£${Math.max(0, totalInvestment - totalPaidBack).toLocaleString()}`} highlight />
        </div>

        {filtered.length === 0 && moduleFilter === 'All' ? <Empty>No investors yet. Click “+ Add investor” to add the first one.</Empty> :
        groups.map(({ m, list }) => (
          <Group key={m.k} title={m.l} color={m.color} count={list.length} cols={cols}
            right={<button onClick={() => { setForm({ module: m.k, status: 'active' }); setEditId(null); setModal('investor') }} style={btn('ghost', true)}>+ Add</button>}>
            {list.length === 0 && <Row cells={[<span key="e" style={{ color: C.faint, fontSize: 13 }}>No investors in {m.l} yet</span>, '', '', '', '', '', '']} />}
            {list.map(i => {
              const paid = paidBackTo(i.id)
              const invPayments = payments.filter(p => p.investor_id === i.id)
              const open = expanded === i.id
              const amt = i.investment_amount ?? 0
              const pct = amt ? Math.min(100, Math.round(paid / amt * 100)) : 0
              const st = STATUS[i.status] ?? { l: i.status || '—', color: C.grey }
              return (
                <Row key={i.id} active={open}
                  cells={[
                    <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Avatar name={i.name} color={m.color} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
                        <div style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[i.email, i.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
                      </div>
                    </div>,
                    <span key="p" style={{ fontSize: 13, color: projectName(i) === '—' ? C.faint : C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName(i)}</span>,
                    <span key="i" style={{ fontWeight: 600 }}>£{amt.toLocaleString()}</span>,
                    <div key="b" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 3 }}><span>£{paid.toLocaleString()}</span><span>{pct}%</span></div>
                      <div style={{ height: 6, background: C.row, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: C.green }} /></div>
                    </div>,
                    <span key="t" style={{ fontSize: 13, color: i.payback_value ? C.ink : C.faint }}>{paybackLabel(i)}</span>,
                    <Pill key="s" color={st.color} onClick={() => cycleStatus(i)} title="Click to change status" width={96}>{st.l}</Pill>,
                    <div key="a" style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setForm({ investor_id: i.id }); setEditId(null); setModal('payment') }} style={btn('ghost', true)}>+ Payment</button>
                      <button onClick={() => setExpanded(open ? null : i.id)} style={btn('ghost', true)}>{open ? 'Hide' : `History${invPayments.length ? ` (${invPayments.length})` : ''}`}</button>
                      <button onClick={() => { setForm(i); setEditId(i.id); setModal('investor') }} style={btn('ghost', true)}>Edit</button>
                      <button onClick={() => del('dev_investors', i.id)} title="Delete" style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button>
                    </div>,
                  ]}
                  below={open ? (
                    <div style={{ padding: '10px 16px 12px 52px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Payment history</div>
                      {invPayments.length === 0 ? <div style={{ fontSize: 13, color: C.faint }}>No payments logged yet.</div> :
                      invPayments.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, padding: '6px 0', borderBottom: '1px solid ' + C.row, maxWidth: 560 }}>
                          <span style={{ color: C.muted, width: 90 }}>{p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                          <span style={{ flex: 1, color: C.ink }}>{p.note || '—'}</span>
                          <span style={{ fontWeight: 600 }}>£{Number(p.amount).toLocaleString()}</span>
                          <button onClick={() => del('dev_investor_payments', p.id)} style={{ fontSize: 12, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                        </div>
                      ))}
                    </div>
                  ) : undefined}
                />
              )
            })}
          </Group>
        ))}
      </Body>

      {modal === 'investor' && (
        <Modal title={editId ? 'Edit Investor' : 'Add Investor'} onClose={() => { setModal(null); setEditId(null); setForm({}) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={lbl}>Module *</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.module ?? 'dev'} onChange={e => setForm({ ...form, module: e.target.value, project_id: '' })}>
                {MODULES.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 000000" /></div>
            {form.module === 'dev' ? (
              <div><label style={lbl}>Project</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.project_id ?? ''} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">Select project…</option>
                  {devProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ) : (
              <div><label style={lbl}>Property / Deal</label><input style={inp} value={form.property_name ?? ''} onChange={e => setForm({ ...form, property_name: e.target.value })} placeholder="Which property or deal this relates to" /></div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Investment Amount (£)</label><input type="number" style={inp} value={form.investment_amount ?? ''} onChange={e => setForm({ ...form, investment_amount: parseFloat(e.target.value) })} /></div>
              <div><label style={lbl}>Equity %</label><input type="number" style={inp} value={form.equity_percentage ?? ''} onChange={e => setForm({ ...form, equity_percentage: parseFloat(e.target.value) })} /></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginTop: 6 }}>Payback terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Payback Type</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.payback_type ?? 'percentage'} onChange={e => setForm({ ...form, payback_type: e.target.value })}>
                  <option value="percentage">% of profit/return</option>
                  <option value="fixed">Fixed fee</option>
                </select>
              </div>
              <div><label style={lbl}>{form.payback_type === 'fixed' ? 'Fixed Fee (£)' : 'Percentage (%)'}</label><input type="number" style={inp} value={form.payback_value ?? ''} onChange={e => setForm({ ...form, payback_value: parseFloat(e.target.value) })} placeholder={form.payback_type === 'fixed' ? 'e.g. 500' : 'e.g. 10'} /></div>
            </div>
            <div><label style={lbl}>Frequency</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.payback_frequency ?? 'monthly'} onChange={e => setForm({ ...form, payback_frequency: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="on_exit">On exit / sale</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.status ?? 'active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button onClick={() => save('dev_investors', form)} disabled={saving || !form.name} style={{ ...btn('gold'), flex: 1, justifyContent: 'center', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Investor'}</button>
          </div>
        </Modal>
      )}

      {modal === 'payment' && (
        <Modal title="Log Payment to Investor" onClose={() => { setModal(null); setEditId(null); setForm({}) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={lbl}>Investor *</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.investor_id ?? ''} onChange={e => setForm({ ...form, investor_id: e.target.value })}>
                <option value="">Select investor…</option>
                {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name} · {moduleInfo(inv.module ?? 'dev').l}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Amount (£) *</label><input type="number" style={inp} value={form.amount ?? ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })} placeholder="500" /></div>
              <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.date ?? new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><label style={lbl}>Note (optional)</label><input style={inp} value={form.note ?? ''} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. March payback" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button onClick={() => save('dev_investor_payments', form)} disabled={saving || !form.investor_id || !form.amount} style={{ ...btn('gold'), flex: 1, justifyContent: 'center', opacity: saving || !form.investor_id || !form.amount ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Log Payment'}</button>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}
