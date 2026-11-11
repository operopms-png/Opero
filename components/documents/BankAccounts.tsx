'use client'
// Staff Centre → Documents → Bank accounts: edit once, used in deposit and payment wording in every new document.
import { useEffect, useState } from 'react'
import { C, Modal, btn, input, label } from '../crm/Page'
import { ownerFetch } from '@/lib/platform-fetch'
import { BANK_PURPOSES, bankLine } from '@/lib/bank-accounts'

const blank = { purpose: 'deposit', currency: 'JMD', label: '', bank_name: '', account_name: '', account_number: '', branch_or_sort_code: '', iban: '', swift: '', reference_note: '', active: true }
export default function BankAccounts({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<any[]>([]); const [admin, setAdmin] = useState(false)
  const [f, setF] = useState<any>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => ownerFetch('/api/bank-accounts').then(r => { if (r.ok) { setList(r.data.accounts || []); setAdmin(!!r.data.isAdmin) } })
  useEffect(() => { load() }, [])
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  async function save() {
    setBusy(true); setMsg('')
    const r = await ownerFetch('/api/bank-accounts', { method: 'POST', body: JSON.stringify(f) }); setBusy(false)
    if (!r.ok) { setMsg(r.data?.error || 'Could not save.'); return }
    setF(null); load()
  }
  async function del(id: string) { if (!confirm('Remove this bank account? New documents will stop showing it.')) return; await ownerFetch('/api/bank-accounts?id=' + id, { method: 'DELETE' }); load() }
  const fld = (k: string, l: string, ph = '') => <div><label style={label}>{l}</label><input style={input} placeholder={ph} value={f[k] ?? ''} onChange={e => set(k, e.target.value)} /></div>
  return (
    <Modal title="Bank accounts" onClose={onClose} width={620}>
      <div style={{ padding: 22 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Your bank details live here. Change them once and every <b>new</b> document that uses the blanks <b>Deposit bank details</b> or <b>Payment bank details</b> shows the new account. Documents already sent keep the details they went out with.</div>
        {!f && <>
          {list.length === 0 && <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 10 }}>No bank accounts yet.</div>}
          {list.map(a => <div key={a.id} style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: 12, marginBottom: 8, opacity: a.active ? 1 : .55 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{BANK_PURPOSES[a.purpose] || a.purpose}{a.active ? '' : ' · switched off'}</div>
            <div style={{ fontSize: 13.5, margin: '4px 0 8px' }}>{bankLine(a)}</div>
            {admin && <><button style={btn('ghost', true)} onClick={() => { setF({ ...blank, ...a }); setMsg('') }}>Edit</button> <button style={btn('danger', true)} onClick={() => del(a.id)}>Remove</button></>}
          </div>)}
          {admin ? <button style={btn('gold')} onClick={() => { setF({ ...blank }); setMsg('') }}>Add bank account</button> : <div style={{ fontSize: 12.5, color: C.muted }}>Only an admin can change bank details.</div>}
        </>}
        {f && <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={label}>Used for</label><select style={input} value={f.purpose} onChange={e => set('purpose', e.target.value)}>{Object.entries(BANK_PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            {fld('currency', 'Currency', 'JMD, GBP, USD')}
          </div>
          {fld('bank_name', 'Bank', 'e.g. Metro Bank')}{fld('account_name', 'Account name')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{fld('account_number', 'Account number')}{fld('branch_or_sort_code', 'Branch or sort code')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{fld('iban', 'IBAN (optional)')}{fld('swift', 'SWIFT (optional)')}</div>
          {fld('reference_note', 'Payment reference to use', 'e.g. your name and property')}
          <label style={{ display: 'flex', gap: 8, fontSize: 13.5 }}><input type="checkbox" checked={f.active !== false} onChange={e => set('active', e.target.checked)} />Show this account in new documents</label>
          {msg && <div style={{ color: '#B42318', fontSize: 13 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold')} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button><button style={btn('ghost')} onClick={() => setF(null)}>Cancel</button></div>
        </div>}
      </div>
    </Modal>
  )
}
