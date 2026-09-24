'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const MODULES: { k: string; l: string; color: string }[] = [
  { k: 'str', l: 'Vacation Rentals', color: '#3B4AFF' },
  { k: 'pm', l: 'Property Management', color: '#10B981' },
  { k: 'ea', l: 'Estate Agency', color: '#F59E0B' },
  { k: 'dev', l: 'Developments', color: '#8B5CF6' },
]
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: '#D1FAE5', color: '#059669' },
  pending: { bg: '#FEF3C7', color: '#D97706' },
  completed: { bg: '#F3F4F6', color: '#6B7280' },
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

function moduleInfo(k: string) { return MODULES.find(m => m.k === k) ?? MODULES[3] }

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '40px 48px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Staff Centre</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#101828', letterSpacing: '-0.01em' }}>Investors</h1>
            <div style={{ fontSize: 14, color: '#667085', maxWidth: 640, lineHeight: 1.5 }}>
              Every investor across every module, in one place — what they put in, what we agreed to pay back, and every payment made.
            </div>
          </div>
          <button onClick={() => { setForm({ module: 'dev', status: 'active' }); setEditId(null); setModal('investor') }} style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Investor</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {['All', ...MODULES.map(m => m.k)].map(k => {
            const m = k === 'All' ? null : moduleInfo(k)
            const active = moduleFilter === k
            return (
              <button key={k} onClick={() => setModuleFilter(k)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (active ? (m?.color ?? ACCENT) : '#E4E7EC'), background: active ? (m?.color ?? ACCENT) : '#fff', color: active ? '#fff' : '#344054', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{k === 'All' ? 'All' : m!.l}</button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Investors', value: filtered.length },
            { label: 'Total Investment', value: `£${totalInvestment.toLocaleString()}`, green: true },
            { label: 'Paid Back So Far', value: `£${totalPaidBack.toLocaleString()}` },
            { label: 'Avg Investment', value: `£${filtered.length > 0 ? Math.round(totalInvestment / filtered.length).toLocaleString() : 0}` },
          ].map((c: any) => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.green ? '#10B981' : '#101828' }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC' }}>No investors yet</div> :
          filtered.map(i => {
            const paid = paidBackTo(i.id)
            const invPayments = payments.filter(p => p.investor_id === i.id)
            const open = expanded === i.id
            const mod = moduleInfo(i.module ?? 'dev')
            return (
              <div key={i.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: mod.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: mod.color, flexShrink: 0 }}>{i.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#101828' }}>{i.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: mod.color + '18', color: mod.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{mod.l}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{i.email} {i.phone ? `· ${i.phone}` : ''}</div>
                    <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 2 }}>{projectName(i)} · {paybackLabel(i)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>£{(i.investment_amount ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>£{paid.toLocaleString()} paid back</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: STATUS_COLORS[i.status]?.bg ?? '#F3F4F6', color: STATUS_COLORS[i.status]?.color ?? '#6B7280' }}>{i.status}</span>
                  </div>
                  <button onClick={() => { setForm({ investor_id: i.id }); setEditId(null); setModal('payment') }} style={{ fontSize: 12, color: '#10B981', background: 'none', border: '1px solid #10B981', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Log Payment</button>
                  <button onClick={() => setExpanded(open ? null : i.id)} style={{ fontSize: 12, color: '#667085', background: 'none', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{open ? 'Hide' : `History (${invPayments.length})`}</button>
                  <button onClick={() => { setForm(i); setEditId(i.id); setModal('investor') }} style={{ fontSize: 12, color: '#8B5CF6', background: 'none', border: '1px solid #8B5CF6', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => del('dev_investors', i.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                </div>
                {open && (
                  <div style={{ borderTop: '1px solid #F2F4F7', padding: '12px 20px 16px', background: '#FAFAFB' }}>
                    {invPayments.length === 0 ? <div style={{ fontSize: 12, color: '#98A2B3' }}>No payments logged yet.</div> :
                    invPayments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #F2F4F7' }}>
                        <span style={{ color: '#667085' }}>{p.date}{p.note ? ` · ${p.note}` : ''}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600, color: '#101828' }}>£{Number(p.amount).toLocaleString()}</span>
                          <button onClick={() => del('dev_investor_payments', p.id)} style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 6 }}>Payback terms</div>
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
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => save('dev_investors', form)} disabled={saving || !form.name} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Investor'}</button>
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
            <button onClick={() => { setModal(null); setEditId(null); setForm({}) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => save('dev_investor_payments', form)} disabled={saving || !form.investor_id || !form.amount} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.investor_id || !form.amount ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Log Payment'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
