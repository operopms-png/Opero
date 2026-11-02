'use client'
// AI Command Centre -> Escalation rules: who is told when AI work needs a person.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input, label } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const TRIGGERS: Record<string, { l: string; d: string; hours?: boolean }> = {
  draft_waiting: { l: 'An AI draft is waiting too long', d: 'A draft in Approvals has not been approved or rejected.', hours: true },
  failed_action: { l: 'An approved action failed', d: 'Something you approved did not send, for example an email was refused.' },
  expired_certificate: { l: 'A compliance certificate has expired', d: 'Any expired certificate in Property Management, Estate Agency or Developments.' },
  arrears: { l: 'Rent is more than 14 days overdue', d: 'Any unpaid rent payment older than 14 days.' },
}

export default function Escalation() {
  const [rules, setRules] = useState<any[] | null>(null)
  const [me, setMe] = useState('')
  const [err, setErr] = useState('')
  const [f, setF] = useState({ trigger: 'draft_waiting', after_hours: '24', notify_email: '', notify_name: '' })
  const load = () => staffApi<{ rules: any[]; me: string }>('/api/ai-escalation').then(d => { setRules(d.rules); setMe(d.me); setErr('') }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const act = async (body: any) => { try { await staffApi('/api/ai-escalation', body); await load() } catch (e: any) { setErr(e.message) } }

  return (
    <CrmPage>
      <CrmHeader title="Escalation rules" subtitle="Choose who is told when AI work needs a person. Each rule creates an alert in Alerts and emails the person you name. It is checked every hour, and each problem is reported once a day." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 16, marginBottom: 18, maxWidth: 760 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Add a rule</div>
          <label style={label}>When</label>
          <select style={{ ...input, marginBottom: 6 }} value={f.trigger} onChange={e => setF({ ...f, trigger: e.target.value })}>
            {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>{TRIGGERS[f.trigger].d}</div>
          {TRIGGERS[f.trigger].hours && <><label style={label}>Wait this many hours first</label><input style={{ ...input, width: 120, marginBottom: 10 }} inputMode="numeric" value={f.after_hours} onChange={e => setF({ ...f, after_hours: e.target.value })} /></>}
          <label style={label}>Tell</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
            <input style={input} placeholder="Name" value={f.notify_name} onChange={e => setF({ ...f, notify_name: e.target.value })} />
            <input style={input} placeholder="Email address" value={f.notify_email} onChange={e => setF({ ...f, notify_email: e.target.value })} />
          </div>
          <button style={btn('gold')} onClick={async () => { await act({ action: 'add', ...f }); setF({ ...f, notify_email: '', notify_name: '' }) }}>Add rule</button>
        </div>

        {!rules ? (!err && <Loading />) : rules.length === 0 ? (
          <Empty>
            <div>No rules yet, so nobody is emailed. The AI still shows alerts here.</div>
            <button style={{ ...btn('gold'), marginTop: 12 }} onClick={() => act({ action: 'defaults' })}>Add the standard rules, notifying {me || 'me'}</button>
          </Empty>
        ) : (
          <div style={{ display: 'grid', gap: 8, maxWidth: 760 }}>
            {rules.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 6, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', opacity: r.enabled ? 1 : 0.55 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{TRIGGERS[r.trigger]?.l ?? r.trigger}{TRIGGERS[r.trigger]?.hours ? ` (after ${r.after_hours} h)` : ''}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>Tell {r.notify_name ? `${r.notify_name}, ` : ''}{r.notify_email}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn('ghost', true)} onClick={() => act({ action: 'toggle', id: r.id, enabled: !r.enabled })}>{r.enabled ? 'Pause' : 'Resume'}</button>
                  <button style={btn('danger', true)} onClick={() => window.confirm('Delete this rule?') && act({ action: 'delete', id: r.id })}>Delete</button>
                </div>
              </div>))}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
