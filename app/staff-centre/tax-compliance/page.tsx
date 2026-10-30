'use client'
// Staff Centre → Tax and Compliance (Phase 1). Three separate legal entities, each with its own
// obligations, Xero status and audit history. Group view shows counts only and never combines
// the companies' tax liabilities. Placeholders are labelled until an accountant verifies them.
import React, { useEffect, useState } from 'react'
import { CrmPage, CrmHeader, Body, Loading, btn, input, label } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  placeholder: { l: 'Placeholder, not verified', bg: '#FEF0C7', c: '#B54708' },
  verified: { l: 'Verified', bg: '#E6F4FC', c: '#1B2F6E' },
  complete: { l: 'Complete', bg: '#E6F7EF', c: '#0E7C55' },
}
const XERO_LABEL: Record<string, string> = { not_connected: 'Not connected', pending_authorisation: 'Awaiting your authorisation', connected: 'Connected', error: 'Error' }
const when = (d: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
const day = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not confirmed'

export default function TaxCompliance() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('group')
  const [editing, setEditing] = useState<any>(null)
  const [approving, setApproving] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const load = () => staffApi('/api/tax').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const run = async (body: any, close?: () => void) => {
    setBusy(true); setErr('')
    try { await staffApi('/api/tax', body); close?.(); await load() } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const tabs = [{ k: 'group', l: 'Group overview' }, ...(d?.entities ?? []).map((e: any) => ({ k: e.id, l: e.name })), { k: 'agent', l: 'Remick Vincent' }, { k: 'audit', l: 'Audit trail' }]
  const ent = (d?.entities ?? []).find((e: any) => e.id === tab)

  return (
    <CrmPage>
      <CrmHeader title="Tax and Compliance" subtitle="Each company is kept separate. Placeholder deadlines stay labelled until an accountant verifies them. Nothing is submitted or paid from here."
        tabs={tabs.map(t => ({ k: t.k, l: t.l }))} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          {tab === 'group' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                <Card t="Companies monitored" v={d.entities.length} />
                <Card t="Obligations" v={d.entities.reduce((n: number, e: any) => n + e.obligations.length, 0)} />
                <Card t="Verified or complete" v={d.entities.reduce((n: number, e: any) => n + e.obligations.filter((o: any) => o.status !== 'placeholder').length, 0)} />
                <Card t="Waiting for your approval" v={d.approvals.length} />
              </div>
              <Panel t="Xero connection status">
                {d.entities.map((e: any) => <Row key={e.id} a={e.name} b={XERO_LABEL[e.xero_status] || e.xero_status} />)}
              </Panel>
              <Panel t="Tax calendar (all companies, each kept separate)">
                {d.entities.map((e: any) => e.obligations.map((o: any) => <Row key={e.id + o.id} a={`${e.name}: ${o.tax_type}`} b={o.due_date ? `Due ${day(o.due_date)}` : 'Date not confirmed'} />))}
              </Panel>
              <Panel t="Items waiting for your approval">
                {d.approvals.length === 0 ? <div style={{ color: '#667085' }}>Nothing waiting.</div> : d.approvals.map((a: any) => <Row key={a.id} a={a.title} b={`${a.requested_by} · ${when(a.created_at)}`} />)}
              </Panel>
            </div>
          )}

          {ent && (
            <div style={{ display: 'grid', gap: 14 }}>
              <Panel t={`${ent.name} · ${ent.country === 'JM' ? 'Jamaica' : 'UK'} · ${ent.currency}`}>
                <div style={{ color: '#667085', fontSize: 13, marginBottom: 10 }}>{ent.role}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13 }}>Xero: <b>{XERO_LABEL[ent.xero_status]}</b>{ent.last_sync_at ? ` · last sync ${when(ent.last_sync_at)}` : ' · no sync yet'}</span>
                  <button style={btn('ghost', true)} onClick={() => run({ action: 'xero-save', entity_id: ent.id, xero_status: ent.xero_status === 'pending_authorisation' ? 'not_connected' : 'pending_authorisation' })} disabled={busy}>
                    {ent.xero_status === 'pending_authorisation' ? 'Mark as not connected' : 'Mark as awaiting authorisation'}</button>
                  <button style={btn('ghost', true)} onClick={() => setApproving({ entity: ent, title: '', details: '' })}>Request approval</button>
                </div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 8 }}>Connecting Xero is done by you, in Xero, for this company only. Once connected, its bank feed is kept to this company.</div>
              </Panel>
              <Panel t="Obligations">
                {ent.obligations.map((o: any) => (
                  <div key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #EEF2F7' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <b style={{ fontSize: 14 }}>{o.tax_type}</b>
                      <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Filing: {day(o.due_date)} · Payment: {day(o.payment_due_date)}{o.source_ref ? ` · Source: ${o.source_ref}` : ' · No source yet'}</div>
                    </div>
                    <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 10, background: STATUS[o.status].bg, color: STATUS[o.status].c, fontWeight: 700 }}>{STATUS[o.status].l}</span>
                    <button style={btn('ghost', true)} onClick={() => setEditing({ ...o, entity_id: ent.id })}>Edit</button>
                  </div>
                ))}
              </Panel>
              <Panel t="Supporting documents and evidence">
                <div style={{ color: '#667085', fontSize: 13 }}>Documents for this company are stored with its records once Phase 2 (document and invoice intake) is built. Nothing is attached yet.</div>
              </Panel>
            </div>
          )}

          {tab === 'agent' && (
            <Panel t="Remick Vincent · Finance and Tax Director (AI agent)">
              <div style={{ color: '#667085', fontSize: 13, marginBottom: 10 }}>He can only do what you switch on here. Banking, payments and sensitive financial details are not available to him through this page.</div>
              {d.agent.scopes.map((s: any) => (
                <div key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #EEF2F7' }}>
                  <div style={{ flex: 1 }}>{s.label}</div>
                  <button style={btn(s.granted ? 'ghost' : 'ghost', true)} disabled={busy} onClick={() => run({ action: 'agent-grant', scope: s.key, granted: !s.granted })}>{s.granted ? 'Switch off' : 'Switch on'}</button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: '#667085', marginTop: 10 }}>Not available: bank access, payments, and submitting returns. These need your separate approval.</div>
            </Panel>
          )}

          {tab === 'audit' && (
            <Panel t="Audit trail (latest 40)">
              {d.audit.length === 0 ? <div style={{ color: '#667085' }}>No changes yet.</div> : d.audit.map((a: any) => <Row key={a.id} a={`${a.actor}: ${a.action}`} b={when(a.created_at)} />)}
            </Panel>
          )}
        </>}

        {editing && (
          <Modal t={`Edit: ${editing.tax_type}`} onClose={() => setEditing(null)}>
            <Field l="Filing due date"><input type="date" style={input} value={editing.due_date ?? ''} onChange={e => setEditing({ ...editing, due_date: e.target.value })} /></Field>
            <Field l="Payment due date"><input type="date" style={input} value={editing.payment_due_date ?? ''} onChange={e => setEditing({ ...editing, payment_due_date: e.target.value })} /></Field>
            <Field l="Frequency"><input style={input} value={editing.frequency ?? ''} onChange={e => setEditing({ ...editing, frequency: e.target.value })} placeholder="e.g. Annual" /></Field>
            <Field l="Official source and date"><input style={input} value={editing.source_ref ?? ''} onChange={e => setEditing({ ...editing, source_ref: e.target.value })} placeholder="e.g. HMRC, checked 30 Oct 2026" /></Field>
            <Field l="Status"><select style={input} value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
              <option value="placeholder">Placeholder, not verified</option><option value="verified">Verified</option><option value="complete">Complete</option></select></Field>
            <Field l="Notes"><input style={input} value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 8 }}>Verified or complete needs an official source and date. Only an accountant should mark something verified.</div>
            <button style={btn('gold')} disabled={busy} onClick={() => run({ action: 'obligation-save', id: editing.id, due_date: editing.due_date, payment_due_date: editing.payment_due_date, frequency: editing.frequency, source_ref: editing.source_ref, status: editing.status, notes: editing.notes }, () => setEditing(null))}>Save</button>
          </Modal>
        )}

        {approving && (
          <Modal t={`Request approval: ${approving.entity.name}`} onClose={() => setApproving(null)}>
            <Field l="What needs approving"><input style={input} value={approving.title} onChange={e => setApproving({ ...approving, title: e.target.value })} /></Field>
            <Field l="Details"><input style={input} value={approving.details} onChange={e => setApproving({ ...approving, details: e.target.value })} /></Field>
            <button style={btn('gold')} disabled={busy} onClick={() => run({ action: 'request-approval', entity_id: approving.entity.id, title: approving.title, details: approving.details }, () => setApproving(null))}>Send for approval</button>
          </Modal>
        )}
      </Body>
    </CrmPage>
  )
}

function Card({ t, v }: { t: string; v: any }) {
  return <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 14 }}><div style={{ fontSize: 12, color: '#667085' }}>{t}</div><div style={{ fontSize: 22, fontWeight: 800, color: '#1B2F6E', marginTop: 4 }}>{v}</div></div>
}
function Panel({ t, children }: { t: string; children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 16 }}><div style={{ fontWeight: 700, color: '#1B2F6E', marginBottom: 8 }}>{t}</div>{children}</div>
}
function Row({ a, b }: { a: string; b: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid #EEF2F7', fontSize: 13 }}><span>{a}</span><span style={{ color: '#667085' }}>{b}</span></div>
}
function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><span style={label}>{l}</span>{children}</div>
}
function Modal({ t, children, onClose }: { t: string; children: React.ReactNode; onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 20, width: 'min(520px,100%)' }}>
      <div style={{ fontWeight: 700, color: '#1B2F6E', marginBottom: 12 }}>{t}</div>{children}</div></div>
}
