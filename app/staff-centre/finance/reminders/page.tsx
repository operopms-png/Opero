'use client'
// Staff Centre → Finance → Reminders: rent reminders by email and tenant portal. The daily AI job sends them itself;
// anything drafted by hand here waits until an admin or co-founder approves it. Anyone with Finance can generate and
// edit drafts; only an admin or co-founder can approve (send) or skip them.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi, money, MODULE_LABEL, MODULE_COL } from '../../../../lib/staff-api'

const STAGE: Record<string, string> = { before7: 'Early reminder', before: 'Friendly reminder', due: 'Due today', late1: 'Missed payment', late3: 'Second reminder', late7: 'Final notice', late14: 'Overdue two weeks', late21: 'Overdue three weeks' }
const fmt = (iso?: string | null) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

export default function Reminders() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const load = () => staffApi('/api/finance/reminders').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  async function generate() {
    setBusy('gen'); setErr(''); setNote('')
    try {
      const r = await staffApi('/api/finance/reminders', { action: 'generate' })
      setNote(r.created ? `${r.created} new draft${r.created === 1 ? '' : 's'} added.` : 'No new drafts — nothing is due soon or late that isn’t already drafted.')
      if (r.skippedNoPhone) setNote(n => `${n} ${r.skippedNoPhone} skipped because the tenant has no email or portal.`)
      await load()
    } catch (e: any) { setErr(e.message) }
    setBusy(null)
  }
  async function act(id: string, action: 'edit' | 'approve' | 'skip', message?: string) {
    if (action === 'approve' && !confirm('Send this reminder to the tenant now by email and portal?')) return
    setBusy(id); setErr(''); setNote('')
    try {
      if (action === 'approve' && edits[id] !== undefined) await staffApi('/api/finance/reminders', { action: 'edit', id, message: edits[id] })
      const r = await staffApi('/api/finance/reminders', { action, id, message })
      if (r.notSent) setNote(r.notSent)
      else if (action === 'approve') setNote('Reminder sent by email and portal.')
      else if (action === 'edit') setNote('Changes saved.')
      if (action !== 'edit') setEdits(e => { const n = { ...e }; delete n[id]; return n })
      await load()
    } catch (e: any) { setErr(e.message) }
    setBusy(null)
  }

  const pending: any[] = d?.pending || []
  const recent: any[] = d?.recent || []
  const btn = (dark: boolean): React.CSSProperties => ({ padding: '7px 14px', borderRadius: 8, border: dark ? 'none' : '1px solid #D0D4E4', background: dark ? '#191815' : '#fff', color: dark ? '#fff' : '#191815', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' })

  return (
    <CrmPage>
      <CrmHeader title="Rent reminders" subtitle="Reminders for rent due soon or late, sent to the tenant by email and portal. The daily AI job sends them automatically; drafts made by hand wait for approval." actions={<button onClick={generate} disabled={busy === 'gen'} style={btn(true)}>{busy === 'gen' ? 'Checking…' : 'Generate drafts'}</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {note && <div style={{ color: C.muted, marginBottom: 12, fontSize: 13.5 }}>{note}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Waiting" value={pending.length} sub={d.canApprove ? 'You can approve these' : 'An admin or co-founder approves these'} highlight />
            <Stat label="Missed payments" value={pending.filter(r => r.stage.startsWith('late')).length} sub="Late rent drafts" />
            <Stat label="Due soon" value={pending.filter(r => !r.stage.startsWith('late')).length} sub="Friendly reminders" />
          </div>
          {pending.length === 0 ? <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 18, marginBottom: 18 }}><Empty>No drafts waiting. Use Generate drafts to check for rent that is due soon or late.</Empty></div> : (
            <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
              {pending.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.tenant}</div>
                      <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COL[r.module], display: 'inline-block' }} />{MODULE_LABEL[r.module]}{r.property ? ` · ${r.property}` : ''}{r.phone ? ` · ${r.phone}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{money(r.amount, r.currency)}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{STAGE[r.stage] || r.stage} · due {fmt(r.due_date)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Drafted by {r.drafted_by || 'staff'}</div>
                  <textarea value={edits[r.id] ?? r.message} onChange={e => setEdits(x => ({ ...x, [r.id]: e.target.value }))} rows={4} style={{ width: '100%', padding: '10px 11px', border: '1px solid #D0D4E4', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5, resize: 'vertical' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {edits[r.id] !== undefined && <button disabled={busy === r.id} onClick={() => act(r.id, 'edit', edits[r.id])} style={btn(false)}>Save changes</button>}
                    {d.canApprove ? <>
                      <button disabled={busy === r.id} onClick={() => act(r.id, 'skip')} style={btn(false)}>Skip</button>
                      <button disabled={busy === r.id} onClick={() => act(r.id, 'approve')} style={btn(true)}>{busy === r.id ? '…' : 'Approve and send'}</button>
                    </> : <span style={{ fontSize: 12.5, color: C.muted, alignSelf: 'center' }}>Waiting for an admin or co-founder</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {recent.length > 0 && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Recently dealt with</div>
            <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden' }}>
              {recent.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: '1px solid #F0F1F4', fontSize: 13.5 }}>
                  <div><b>{r.tenant}</b> <span style={{ color: C.muted }}>· {STAGE[r.stage] || r.stage}</span>{r.error && <div style={{ fontSize: 12, color: C.muted }}>{r.error}</div>}</div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap', color: r.status === 'sent' ? C.ink : C.muted }}>{r.status === 'sent' ? 'Sent' : 'Skipped'} {fmt(r.decided_at)}{r.decided_by ? ` · ${r.decided_by}` : ''}</div>
                </div>
              ))}
            </div>
          </>}
        </>}
      </Body>
    </CrmPage>
  )
}
