'use client'
// Staff Centre → Documents → Automatic rules: send a template by itself when something happens (new tenant, booking confirmed, rent late…).
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input, label } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16 }
const ago = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'

export default function Rules() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [trigger, setTrigger] = useState(''), [tpl, setTpl] = useState('')
  const load = () => staffApi('/api/documents?rules=1').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const act = async (body: any, ok = '') => { setErr(''); setMsg(''); setBusy(true); try { const r = await staffApi('/api/documents', body); if (ok) setMsg(typeof ok === 'string' ? ok : ''); await load(); return r } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const trig = (k: string) => d?.triggers?.[k]
  const tname = (id: string) => d?.templates?.find((t: any) => t.id === id)?.name || 'Deleted template'
  return (
    <CrmPage>
      <CrmHeader title="Automatic rules" subtitle="Send a document by itself when something happens. Staff still see everything it sends under Documents."
        actions={<button style={btn('ghost')} onClick={() => { window.location.href = '/staff-centre/documents' }}>← Documents</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {msg && <div style={{ color: '#067647', marginBottom: 12 }}>{msg}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ ...card, marginBottom: 16, fontSize: 13, color: C.muted }}>A rule only acts on things that happen <b>after you switch it on</b>, and sends each document once. Email must be set up and the person needs an email address. Rules are checked automatically every day; Run now checks straight away. Only admins can change rules.</div>
          {d.rules.length === 0 ? <Empty>No rules yet.{d.isAdmin ? ' Add one below.' : ' An admin adds them.'}</Empty> : d.rules.map((r: any) => (
            <div key={r.id} style={{ ...card, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>When: {trig(r.trigger)?.label || r.trigger}</div>
                <div style={{ fontSize: 13, color: C.muted }}>Send <b>{tname(r.template_id)}</b> to the {String(trig(r.trigger)?.to || '').toLowerCase()} · {trig(r.trigger)?.area}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Sent {r.sent_count || 0} · last checked {ago(r.last_run_at)}</div>
              </div>
              {d.isAdmin && <>
                <button style={btn(r.enabled ? 'ghost' : 'gold', true)} disabled={busy} onClick={() => act({ action: 'rule-save', id: r.id, trigger: r.trigger, template_id: r.template_id, enabled: !r.enabled }, r.enabled ? 'Switched off.' : 'Switched on. It now acts on new events.')}>{r.enabled ? 'Switch off' : 'Switch on'}</button>
                <button style={btn('danger', true)} disabled={busy} onClick={() => { if (window.confirm('Delete this rule? Documents already sent stay.')) act({ action: 'rule-delete', id: r.id }, 'Deleted.') }}>Delete</button>
              </>}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: r.enabled ? '#E7F6EC' : '#F2F4F7', color: r.enabled ? '#067647' : '#667085' }}>{r.enabled ? 'On' : 'Off'}</span>
            </div>))}
          {d.isAdmin && <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Add a rule</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
              <div><label style={label} htmlFor="r-t">When this happens</label><select id="r-t" style={input} value={trigger} onChange={e => setTrigger(e.target.value)}><option value="">Choose…</option>{Object.entries(d.triggers).map(([k, v]: any) => <option key={k} value={k}>{v.label} ({v.area})</option>)}</select></div>
              <div><label style={label} htmlFor="r-d">Send this template</label><select id="r-d" style={input} value={tpl} onChange={e => setTpl(e.target.value)}><option value="">Choose…</option>{d.templates.filter((t: any) => t.active).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn('gold')} disabled={busy || !trigger || !tpl} onClick={async () => { await act({ action: 'rule-save', trigger, template_id: tpl, enabled: false }, 'Rule added, switched off. Switch it on when you are ready.'); setTrigger(''); setTpl('') }}>Add rule</button>
              <button style={btn('ghost')} disabled={busy} onClick={async () => { const r: any = await act({ action: 'run-rules' }); if (r) setMsg('Checked. ' + (typeof r.report === 'object' ? JSON.stringify(r.report) : String(r.report ?? ''))) }}>Run now</button>
            </div>
          </div>}
        </>}
      </Body>
    </CrmPage>
  )
}
