'use client'
// AI Command Centre -> Alerts: everything the AI needs a person to know about.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'
import PushToggle from '../../../../components/ai/PushToggle'

const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Alerts() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const load = () => staffApi<{ alerts: any[] }>('/api/ai-alerts').then(d => { setRows(d.alerts); setErr('') }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', link: '' })
  const post = async () => { try { await staffApi('/api/ai-alerts', { action: 'create', ...form }); setForm({ title: '', message: '', link: '' }); setAdding(false); await load() } catch (e: any) { setErr(e.message) } }
  const unread = (rows ?? []).filter(r => !r.read).length
  const mark = async (body: any) => { try { await staffApi('/api/ai-alerts', body); await load() } catch (e: any) { setErr(e.message) } }

  return (
    <CrmPage>
      <CrmHeader title="Alerts" subtitle="Things the AI needs a person to know about: failed actions, waiting drafts, expired certificates and new messages. Set who is emailed under Escalation rules."
        actions={<div style={{ display: 'flex', gap: 8 }}><button style={btn('gold')} onClick={() => setAdding(a => !a)}>+ Post an alert</button>{unread > 0 && <button style={btn('ghost')} onClick={() => mark({ action: 'read_all' })}>Mark all read</button>}</div>} />
      <Body>
        <PushToggle />
        {adding && (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 14, marginBottom: 12, display: 'grid', gap: 8 }}>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title, for example Legal: contract query from …" style={{ padding: '9px 11px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="What needs to be known (optional)" rows={3} style={{ padding: '9px 11px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
            <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="Page to open, for example /staff-centre/email (optional)" style={{ padding: '9px 11px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8 }}><button style={{ ...btn('gold'), opacity: form.title.trim() ? 1 : 0.6 }} disabled={!form.title.trim()} onClick={post}>Post alert</button><button style={btn('ghost')} onClick={() => setAdding(false)}>Cancel</button></div>
          </div>)}
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!rows ? (!err && <Loading />) : rows.length === 0 ? <Empty>No alerts.</Empty> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid ' + C.border, borderLeft: '3px solid ' + (r.read ? C.border : '#C9A84C'), borderRadius: 6, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: r.read ? 500 : 700, fontSize: 14.5 }}>{r.title}</div>
                  {r.message && <div style={{ fontSize: 13, color: C.muted, marginTop: 2, whiteSpace: 'pre-wrap' }}>{r.message}</div>}
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{when(r.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.link && <Link href={r.link} onClick={() => !r.read && mark({ action: 'read', id: r.id })} style={{ ...btn('gold', true), textDecoration: 'none' }}>Open</Link>}
                  {!r.read && <button style={btn('ghost', true)} onClick={() => mark({ action: 'read', id: r.id })}>Mark read</button>}
                </div>
              </div>))}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
