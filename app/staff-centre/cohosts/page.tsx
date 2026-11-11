'use client'
// Staff Centre → Co-hosts: people who host properties they do not own and have us manage them.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { CrmPage, CrmHeader, Body, Stat, Pill, Empty, Modal, Loading, btn, input as inp, label as lbl, C } from '../../../components/crm/Page'
import LeaseDocuments from '../../../components/pm/LeaseDocuments'
import NewClientLink from '../../../components/documents/NewClientLink'
import { CURRENCIES } from '../../../lib/partner-schedule'

const MODELS: Record<string, string> = { commission: 'We keep a percentage', fee: 'They pay us a fee', contract: 'As per contract' }

export default function CohostsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [props, setProps] = useState<any[]>([])
  const [acct, setAcct] = useState('')
  const [modal, setModal] = useState<null | 'edit' | 'login'>(null)
  const [form, setForm] = useState<any>({})
  const [docs, setDocs] = useState<any>(null)
  const [link, setLink] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = await getAccountId(user); setAcct(uid)
    const [c, p] = await Promise.all([
      supabase.from('cohosts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('properties').select('id,name').eq('user_id', uid).is('ended_at', null).order('name'),
    ])
    setRows(c.data ?? []); setProps(p.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.name?.trim()) { setMsg('Enter a name.'); return }
    setSaving(true); setMsg('')
    const row = { name: form.name.trim(), email: form.email || null, phone: form.phone || null, address: form.address || null, notes: form.notes || null, property_ids: form.property_ids ?? [], payment_model: form.payment_model || 'contract', payment_value: form.payment_value === '' || form.payment_value == null ? null : Number(form.payment_value), payment_note: form.payment_note || null, currency: form.currency || 'JMD', agreement_start: form.agreement_start || null, agreement_end: form.agreement_end || null }
    const { error } = form.id ? await supabase.from('cohosts').update(row).eq('id', form.id) : await supabase.from('cohosts').insert({ ...row, user_id: acct })
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setModal(null); load()
  }
  async function makeLogin() {
    setSaving(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/create-cohost-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ cohost_id: form.id, email: form.email, password: form.password }) })
    const j = await r.json().catch(() => ({})); setSaving(false)
    if (!r.ok) { setMsg(j.error || 'Could not create the login.'); return }
    setModal(null); load()
  }
  async function remove(c: any) {
    if (!confirm(`Delete ${c.name}? Their documents stay in storage but they will leave this list.`)) return
    await supabase.from('cohosts').delete().eq('id', c.id); load()
  }
  const tick = (id: string) => { const cur: string[] = form.property_ids ?? []; setForm({ ...form, property_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }) }

  if (loading) return <Loading />
  return (
    <CrmPage>
      <CrmHeader title="Co-hosts" subtitle="People who host properties they do not own, and we manage them. Add them, link their properties, set how we are paid, and send a link to onboard them."
        actions={<><button style={btn('ghost')} onClick={() => setLink(true)}>New client link</button><button style={btn('gold')} onClick={() => { setForm({ payment_model: 'contract', currency: 'JMD', property_ids: [] }); setMsg(''); setModal('edit') }}>Add co-host</button></>} />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
          <Stat label="Co-hosts" value={rows.length} /><Stat label="Properties managed" value={rows.reduce((s, r) => s + (r.property_ids?.length ?? 0), 0)} /><Stat label="With a portal login" value={rows.filter(r => r.portal_user_id).length} />
        </div>
        {rows.length === 0 ? <Empty>No co-hosts yet. Press Add co-host, or New client link to have them fill in their own details, upload documents and sign.</Empty> : rows.map(c => (
          <div key={c.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 600, color: C.ink }}>{c.name}</div><div style={{ fontSize: 12.5, color: C.muted }}>{[c.email, c.phone].filter(Boolean).join(' · ')}</div></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Pill color={C.blue}>{MODELS[c.payment_model] ?? 'As per contract'}{c.payment_value != null && c.payment_model !== 'contract' ? ` ${c.payment_model === 'fee' ? c.payment_value : c.payment_value + '%'}` : ''}</Pill>
                <Pill color={c.portal_user_id ? C.green : C.grey}>{c.portal_user_id ? 'Portal login' : 'No login'}</Pill>
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.muted, margin: '8px 0' }}>{(c.property_ids ?? []).length ? (c.property_ids as string[]).map(i => props.find(p => p.id === i)?.name).filter(Boolean).join(', ') : 'No properties linked yet'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn('ghost', true)} onClick={() => { setForm({ ...c, property_ids: c.property_ids ?? [] }); setMsg(''); setModal('edit') }}>Edit</button>
              <button style={btn('ghost', true)} onClick={() => setDocs(c)}>Documents</button>
              <a href={`/cohost-portal?id=${c.id}`} target="_blank" rel="noreferrer" style={{ ...btn('ghost', true), textDecoration: 'none', display: 'inline-block' }}>View portal</a>
              {!c.portal_user_id && <button style={btn('ghost', true)} onClick={() => { setForm({ id: c.id, email: c.email ?? '', password: '' }); setMsg(''); setModal('login') }}>Create login</button>}
              <button style={btn('danger', true)} onClick={() => remove(c)}>Delete</button>
            </div>
          </div>))}
      </Body>
      {modal === 'edit' && <Modal title={form.id ? 'Edit co-host' : 'Add co-host'} onClose={() => setModal(null)} width={600}><div style={{ padding: 20, display: 'grid', gap: 10 }}>
        <div><label style={lbl}>Name</label><input style={inp} value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div><label style={lbl}>Email</label><input style={inp} value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div><label style={lbl}>Phone</label><input style={inp} value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
        <div><label style={lbl}>How we are paid (matches their contract)</label><select style={inp} value={form.payment_model ?? 'contract'} onChange={e => setForm({ ...form, payment_model: e.target.value })}>{Object.entries(MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        {form.payment_model !== 'contract' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div><label style={lbl}>{form.payment_model === 'fee' ? 'Fee amount' : 'Our percentage'}</label><input style={inp} type="number" min="0" value={form.payment_value ?? ''} onChange={e => setForm({ ...form, payment_value: e.target.value })} /></div><div><label style={lbl}>Currency</label><select style={inp} value={form.currency ?? 'JMD'} onChange={e => setForm({ ...form, currency: e.target.value })}>{Object.keys(CURRENCIES).map(k => <option key={k}>{k}</option>)}</select></div></div>}
        <div><label style={lbl}>Payment notes</label><input style={inp} placeholder="e.g. paid monthly by the 5th" value={form.payment_note ?? ''} onChange={e => setForm({ ...form, payment_note: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div><label style={lbl}>Agreement starts</label><input style={inp} type="date" value={form.agreement_start ?? ''} onChange={e => setForm({ ...form, agreement_start: e.target.value })} /></div><div><label style={lbl}>Agreement ends</label><input style={inp} type="date" value={form.agreement_end ?? ''} onChange={e => setForm({ ...form, agreement_end: e.target.value })} /></div></div>
        <div><label style={lbl}>Properties we manage for them</label>{props.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>No short-stay properties yet.</div> : props.map(p => <label key={p.id} style={{ display: 'flex', gap: 8, fontSize: 14, padding: '3px 0' }}><input type="checkbox" checked={(form.property_ids ?? []).includes(p.id)} onChange={() => tick(p.id)} />{p.name}</label>)}</div>
        {msg && <div style={{ color: '#B42318', fontSize: 13 }}>{msg}</div>}
        <button style={btn('gold')} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div></Modal>}
      {modal === 'login' && <Modal title="Create portal login" onClose={() => setModal(null)}><div style={{ padding: 20, display: 'grid', gap: 10 }}>
        <div><label style={lbl}>Email</label><input style={inp} value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><label style={lbl}>Password (6 or more characters)</label><input style={inp} type="text" value={form.password ?? ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        {msg && <div style={{ color: '#B42318', fontSize: 13 }}>{msg}</div>}
        <button style={btn('gold')} disabled={saving} onClick={makeLogin}>{saving ? 'Creating…' : 'Create login'}</button>
        <div style={{ fontSize: 12, color: C.muted }}>Send them the email and password. They sign in at the normal login page and land in their co-host portal.</div>
      </div></Modal>}
      {docs && <LeaseDocuments lease={docs} subject="cohost" onClose={() => setDocs(null)} onChanged={load} />}
      {link && <NewClientLink onClose={() => setLink(false)} />}
    </CrmPage>
  )
}
