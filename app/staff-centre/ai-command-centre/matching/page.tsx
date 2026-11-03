'use client'
// Novourq Cloud AI -> Matching. Paste what an enquirer wants; the AI finds the listed properties that fit
// and drafts the reply. The draft waits in Approvals. Nothing is sent until a team member approves it.
import React, { useState } from 'react'
import { C, CrmPage, CrmHeader, Body, btn, input } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: 16, marginBottom: 16 }

export default function Matching() {
  const [enquiry, setEnquiry] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<any>(null)

  const run = async (queue: boolean) => {
    setBusy(true); setErr('')
    try { setRes(await staffApi('/api/ai-matching', { enquiry, name, email, queue })) } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <CrmPage>
      <CrmHeader title="Property matching" subtitle="Paste what a buyer or renter is looking for. The AI finds your listed properties that fit and drafts the reply. It waits in Approvals until a team member approves it." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        <div style={card}>
          <textarea style={{ ...input, minHeight: 100, resize: 'vertical' }} placeholder="For example: Looking for a 2 bed flat in Manchester, up to £1,100 a month, pets allowed, from January." value={enquiry} onChange={e => setEnquiry(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Their name (optional)" value={name} onChange={e => setName(e.target.value)} />
            <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Their email (to queue the reply)" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button style={btn('gold')} disabled={busy || enquiry.trim().length < 8} onClick={() => run(false)}>{busy ? 'Matching…' : 'Find matches'}</button>
            <button style={btn('gold')} disabled={busy || enquiry.trim().length < 8 || !/^\S+@\S+\.\S+$/.test(email)} onClick={() => run(true)}>Find matches and queue the reply</button>
          </div>
        </div>
        {res && (
          <div style={card}>
            {res.note && <div style={{ color: C.muted, fontSize: 14 }}>{res.note}</div>}
            {res.matches?.map((m: any) => (
              <div key={m.id} style={{ borderTop: '1px solid ' + C.border, padding: '10px 0' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}{m.address ? `, ${m.address}` : ''}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{m.bedrooms ?? '?'} bed · {m.rent != null ? m.rent.toLocaleString('en-GB') + ' a month' : 'rent on request'} · {m.reasons.join(', ')}</div>
              </div>
            ))}
            {res.reply && <><div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Draft reply</div><div style={{ whiteSpace: 'pre-wrap', fontSize: 14, background: C.hover, borderRadius: 6, padding: '10px 12px' }}>{res.reply}</div></>}
            {res.queued && <div style={{ marginTop: 10, fontSize: 13 }}>Queued in <a href="/staff-centre/ai-command-centre/approvals" style={{ color: '#1B2F6E' }}>Approvals</a>.</div>}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
