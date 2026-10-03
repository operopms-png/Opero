'use client'
// Staff Centre → Team → Announcements: a notice board for the team. Admins post
// (pinned ones show on everyone's dashboard until they press "Got it");
// everyone can read the full list here.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, Modal, btn, input, label } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const when = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Announcements() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [writing, setWriting] = useState(false)
  const load = () => staffApi('/api/announcements').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const list: any[] = d?.announcements || []
  return (
    <CrmPage>
      <CrmHeader title="Announcements" subtitle="Notices for the whole team. Pinned announcements appear on everyone’s dashboard until they’ve read them."
        actions={d?.isAdmin && <button style={btn('gold')} onClick={() => setWriting(true)}>+ New announcement</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : list.length === 0 ? <Empty>No announcements yet.{d.isAdmin ? ' Post one to let the whole team know about a change, a deadline or good news.' : ''}</Empty> : (
          <div style={{ display: 'grid', gap: 12, maxWidth: 820 }}>
            {list.map(a => (
              <div key={a.id} style={{ background: '#fff', border: '1px solid ' + C.row, borderLeft: `4px solid ${a.pinned && !a.expired ? C.goldDark : C.row}`, borderRadius: 8, padding: '16px 18px', opacity: a.expired ? .65 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 15.5, color: C.ink }}>{a.title}</b>
                      {a.pinned && !a.expired && <span style={{ fontSize: 11, fontWeight: 700, color: C.goldDark, letterSpacing: '.06em' }}>PINNED</span>}
                      {!a.read && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: C.red, borderRadius: 10, padding: '1px 7px' }}>New</span>}
                      {a.expired && <span style={{ fontSize: 11.5, color: C.muted }}>Ended {new Date(a.expires_on + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                    {a.body && <div style={{ fontSize: 13.5, color: '#3b3833', marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{a.body}</div>}
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{a.author} · {when(a.created_at)}{a.expires_on && !a.expired ? ` · shows until ${new Date(a.expires_on + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!a.read && <button style={btn('ghost', true)} onClick={async () => { await staffApi('/api/announcements', { action: 'read', id: a.id }); load() }}>Got it</button>}
                    {d.isAdmin && <button style={btn('danger', true)} onClick={async () => { if (confirm('Delete this announcement?')) { await staffApi('/api/announcements', { action: 'delete', id: a.id }); load() } }}>Delete</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Body>
      {writing && <Write onClose={() => setWriting(false)} onDone={() => { setWriting(false); load() }} />}
    </CrmPage>
  )
}

function Write({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<any>({ pinned: true })
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  return (
    <Modal title="New announcement" onClose={onClose} width={540}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div><label style={label}>Headline *</label><input style={input} value={f.title || ''} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Gas safety visits at Trinity Heights next week" /></div>
        <div><label style={label}>Message</label><textarea style={{ ...input, resize: 'vertical' }} rows={5} value={f.body || ''} onChange={e => setF({ ...f, body: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}><input type="checkbox" checked={f.pinned} onChange={e => setF({ ...f, pinned: e.target.checked })} />Show on everyone’s dashboard</label>
          <div><label style={label}>Stop showing after (optional)</label><input style={{ ...input, width: 170 }} type="date" value={f.expires_on || ''} onChange={e => setF({ ...f, expires_on: e.target.value })} /></div>
        </div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button style={btn('ghost')} onClick={onClose}>Cancel</button><button style={btn('gold')} disabled={busy || !(f.title || '').trim()} onClick={async () => { setBusy(true); try { await staffApi('/api/announcements', { action: 'create', ...f }); onDone() } catch (e: any) { setErr(e.message); setBusy(false) } }}>{busy ? 'Posting…' : 'Post'}</button></div>
      </div>
    </Modal>
  )
}
