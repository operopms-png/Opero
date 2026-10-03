'use client'
// Staff Centre → Finance → Approvals. Staff ask for sign-off on an expense,
// refund, discount or purchase (with an optional receipt); admins approve or
// reject with a note. Approved amounts show as money out on Finance → Overview.
import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty, Modal, btn, input, label } from '../../../components/crm/Page'
import { staffApi, money, MODULE_LABEL } from '../../../lib/staff-api'

const KINDS = [['expense', 'Expense'], ['purchase', 'Purchase'], ['refund', 'Refund'], ['discount', 'Discount'], ['other', 'Other']]
const ST: Record<string, { l: string; bg: string; c: string }> = { pending: { l: 'Waiting', bg: '#FFF4DE', c: '#9A6400' }, approved: { l: 'Approved', bg: '#E6F7EF', c: '#0E7C55' }, rejected: { l: 'Rejected', bg: '#FDECEC', c: '#B42318' } }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Approvals() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('pending')
  const [asking, setAsking] = useState(false)
  const [deciding, setDeciding] = useState<any>(null)
  const load = () => staffApi('/api/approvals').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const all: any[] = d?.requests || []
  const shown = all.filter(r => tab === 'all' || r.status === tab)
  const pend = all.filter(r => r.status === 'pending')
  return (
    <CrmPage>
      <CrmHeader title="Approvals" subtitle={d?.isAdmin ? 'Things staff need you to sign off. Approved amounts count as money out in Finance.' : 'Ask for sign-off on an expense, purchase, refund or discount. You’ll see the decision here.'}
        actions={<button style={btn('gold')} onClick={() => setAsking(true)}>+ Ask for approval</button>}
        tabs={[{ k: 'pending', l: 'Waiting', count: pend.length }, { k: 'approved', l: 'Approved' }, { k: 'rejected', l: 'Rejected' }, { k: 'all', l: 'All', count: all.length }]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          {d.isAdmin && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Waiting for you" value={<span style={{ color: pend.length ? '#9A6400' : C.ink }}>{pend.length}</span>} highlight />
            <Stat label="Approved this month" value={all.filter(r => r.status === 'approved' && r.decided_at?.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} />
          </div>}
          {shown.length === 0 ? <Empty>{tab === 'pending' ? 'Nothing waiting for approval.' : 'Nothing here yet.'}</Empty> : (
            <div style={{ display: 'grid', gap: 10 }}>
              {shown.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14.5, color: C.ink }}>{r.title}</b>
                      <span style={{ padding: '2px 9px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: ST[r.status].bg, color: ST[r.status].c }}>{ST[r.status].l}</span>
                      <span style={{ fontSize: 11.5, color: C.muted }}>{KINDS.find(k => k[0] === r.kind)?.[1]} · {MODULE_LABEL[r.module] || 'Company'}{r.property ? ` · ${r.property}` : ''}</span>
                    </div>
                    {r.details && <div style={{ fontSize: 13, color: '#3b3833', marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.details}</div>}
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Asked by {r.requested_by} · {when(r.created_at)}{r.receipt_url && <> · <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark, fontWeight: 600 }}>Receipt</a></>}</div>
                    {r.status !== 'pending' && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{ST[r.status].l} by {r.decided_by} · {when(r.decided_at)}{r.decision_note ? ` — “${r.decision_note}”` : ''}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{r.amount != null ? money(r.amount, r.currency) : '—'}</div>
                    {r.status === 'pending' && <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                      {d.isAdmin ? <button style={btn('gold', true)} onClick={() => setDeciding(r)}>Decide</button>
                        : <button style={btn('ghost', true)} onClick={async () => { if (confirm('Cancel this request?')) { await staffApi('/api/approvals', { action: 'cancel', id: r.id }); load() } }}>Cancel</button>}
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}
      </Body>
      {asking && <AskModal onClose={() => setAsking(false)} onDone={() => { setAsking(false); setTab('pending'); load() }} />}
      {deciding && <DecideModal r={deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); load() }} />}
    </CrmPage>
  )
}

function AskModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<any>({ kind: 'expense', currency: 'JMD', module: 'company' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  async function receipt(file?: File) {
    if (!file) return
    const path = `approvals/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await supabase.storage.from('crm-files').upload(path, file, { contentType: file.type })
    if (error) { setErr(error.message); return }
    set('receipt_url', supabase.storage.from('crm-files').getPublicUrl(path).data.publicUrl)
  }
  return (
    <Modal title="Ask for approval" onClose={onClose} width={540}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div><label style={label}>What is it?</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{KINDS.map(([k, l]) => <button key={k} type="button" onClick={() => set('kind', k)} style={{ ...btn(f.kind === k ? 'gold' : 'ghost', true), borderRadius: 20 }}>{l}</button>)}</div></div>
        <div><label style={label}>For *</label><input style={input} value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. New water pump for Trinity Heights" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 10 }}>
          <div><label style={label}>Currency</label><select style={input} value={f.currency} onChange={e => set('currency', e.target.value)}><option>JMD</option><option>GBP</option><option>USD</option></select></div>
          <div><label style={label}>Amount</label><input style={input} type="number" value={f.amount || ''} onChange={e => set('amount', e.target.value)} /></div>
          <div><label style={label}>Business</label><select style={input} value={f.module} onChange={e => set('module', e.target.value)}>{Object.entries(MODULE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div><label style={label}>Property (optional)</label><input style={input} value={f.property || ''} onChange={e => set('property', e.target.value)} /></div>
        <div><label style={label}>Why / details</label><textarea style={{ ...input, resize: 'vertical' }} rows={3} value={f.details || ''} onChange={e => set('details', e.target.value)} /></div>
        <div><label style={label}>Receipt or quote (optional)</label><input type="file" accept="image/*,application/pdf" onChange={e => receipt(e.target.files?.[0])} />{f.receipt_url && <span style={{ fontSize: 12, color: '#0E7C55', marginLeft: 8 }}>Attached</span>}</div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button style={btn('ghost')} onClick={onClose}>Cancel</button><button style={btn('gold')} disabled={busy} onClick={async () => { setBusy(true); setErr(''); try { await staffApi('/api/approvals', { action: 'create', ...f }); onDone() } catch (e: any) { setErr(e.message); setBusy(false) } }}>{busy ? 'Sending…' : 'Send for approval'}</button></div>
      </div>
    </Modal>
  )
}

function DecideModal({ r, onClose, onDone }: { r: any; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const go = async (status: string) => { setBusy(true); try { await staffApi('/api/approvals', { action: 'decide', id: r.id, status, note }); onDone() } catch (e: any) { alert(e.message); setBusy(false) } }
  return (
    <Modal title={r.title} onClose={onClose} width={480}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{r.amount != null ? money(r.amount, r.currency) : 'No amount'}</div>
      <div style={{ fontSize: 13, color: C.muted, margin: '4px 0 12px' }}>Asked by {r.requested_by}{r.property ? ` · ${r.property}` : ''}</div>
      {r.details && <div style={{ fontSize: 13.5, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{r.details}</div>}
      <label style={label}>Note (optional)</label>
      <textarea style={{ ...input, resize: 'vertical' }} rows={2} value={note} onChange={e => setNote(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button style={btn('danger')} disabled={busy} onClick={() => go('rejected')}>Reject</button>
        <button style={btn('gold')} disabled={busy} onClick={() => go('approved')}>Approve</button>
      </div>
    </Modal>
  )
}
