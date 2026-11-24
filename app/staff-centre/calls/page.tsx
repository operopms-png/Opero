'use client'
// Staff Centre -> Inbox -> AI Call Line: every call Nova (the Retell voice
// agent) has answered, scoped to this company by business_id (set by the
// webhook from retell_agent_map, see migrations/add-retell-calls-portal.sql).
// List, detail (transcript, recording, extracted fields) and a status the
// team can move from New to Followed up to Closed. Admins connect a Retell
// agent ID or phone number to this company under Connect a number.
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, Body, Stat, Pill, Group, Row, Empty, Modal, btn, input, label } from '@/components/crm/Page'

const STATUS: Record<string, { l: string; c: string }> = {
  new: { l: 'New', c: C.red },
  followed_up: { l: 'Followed up', c: C.orange },
  closed: { l: 'Closed', c: C.green },
}
const STATUS_ORDER = ['new', 'followed_up', 'closed'] as const

function when(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [calls, setCalls] = useState<any[]>([])
  const [filter, setFilter] = useState<'new' | 'followed_up' | 'closed' | 'all'>('new')
  const [openCall, setOpenCall] = useState<any | null>(null)
  const [followups, setFollowups] = useState<any[]>([])
  const [mapOpen, setMapOpen] = useState(false)
  const [mappings, setMappings] = useState<any[]>([])
  const [agentIdInput, setAgentIdInput] = useState('')
  const [numberInput, setNumberInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: biz } = await supabase.rpc('current_business_id')
    const bid = (biz as string) || user.id
    setBusinessId(bid)
    const { data: tm } = await supabase.from('team_members').select('role').eq('user_id', bid).eq('email', user.email ?? '').maybeSingle()
    setIsAdmin(bid === user.id || String(tm?.role ?? '').toLowerCase() === 'admin')
    await loadCalls(bid)
    setLoading(false)
  }

  async function loadCalls(bid: string | null = businessId) {
    if (!bid) return
    const { data } = await supabase.from('phone_calls').select('*').eq('business_id', bid).order('created_at', { ascending: false }).limit(300)
    setCalls(data ?? [])
  }

  async function openDetail(c: any) {
    setOpenCall(c)
    setFollowups([])
    const { data } = await supabase.from('call_followups').select('*').eq('call_id', c.call_id).order('created_at', { ascending: false })
    setFollowups(data ?? [])
  }

  async function setStatus(callId: string, status: string) {
    setCalls(cs => cs.map(c => (c.call_id === callId ? { ...c, status } : c)))
    setOpenCall((o: any) => (o && o.call_id === callId ? { ...o, status } : o))
    await supabase.from('phone_calls').update({ status }).eq('call_id', callId)
  }

  async function loadMappings() {
    if (!businessId) return
    const { data } = await supabase.from('retell_agent_map').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
    setMappings(data ?? [])
  }
  async function openMap() { setNotice(''); await loadMappings(); setMapOpen(true) }
  async function addMapping() {
    if (!businessId) return
    if (!agentIdInput.trim() && !numberInput.trim()) { setNotice('Enter a Retell agent ID or a phone number.'); return }
    setSaving(true)
    const { error } = await supabase.from('retell_agent_map').insert({
      business_id: businessId, agent_id: agentIdInput.trim() || null, to_number: numberInput.trim() || null, label: labelInput.trim() || null,
    })
    setSaving(false)
    if (error) { setNotice(error.message); return }
    setAgentIdInput(''); setNumberInput(''); setLabelInput(''); setNotice('')
    await loadMappings()
  }
  async function removeMapping(id: string) {
    await supabase.from('retell_agent_map').delete().eq('id', id)
    await loadMappings()
  }

  if (loading) return <CrmPage><div style={{ padding: 60, color: C.faint }}>Loading…</div></CrmPage>

  const shown = filter === 'all' ? calls : calls.filter(c => (c.status || 'new') === filter)
  const counts = {
    new: calls.filter(c => (c.status || 'new') === 'new').length,
    followed_up: calls.filter(c => c.status === 'followed_up').length,
    closed: calls.filter(c => c.status === 'closed').length,
  }

  return (
    <CrmPage>
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
          <Stat label="New" value={counts.new} highlight={counts.new > 0} />
          <Stat label="Followed up" value={counts.followed_up} />
          <Stat label="Closed" value={counts.closed} />
          <Stat label="Total calls" value={calls.length} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setFilter('new')} style={btn(filter === 'new' ? 'gold' : 'ghost', true)}>New</button>
          <button onClick={() => setFilter('followed_up')} style={btn(filter === 'followed_up' ? 'gold' : 'ghost', true)}>Followed up</button>
          <button onClick={() => setFilter('closed')} style={btn(filter === 'closed' ? 'gold' : 'ghost', true)}>Closed</button>
          <button onClick={() => setFilter('all')} style={btn(filter === 'all' ? 'gold' : 'ghost', true)}>All</button>
          <div style={{ flex: 1 }} />
          {isAdmin && <button onClick={openMap} style={btn('ghost', true)}>Connect a number</button>}
          <button onClick={() => loadCalls()} style={btn('ghost', true)}>Refresh</button>
        </div>

        {shown.length === 0 ? (
          <Empty>
            {calls.length === 0
              ? 'No calls yet. Once Nova is connected to this company (Connect a number, admins), its calls will appear here.'
              : 'Nothing with this status.'}
          </Empty>
        ) : (
          <Group title="Calls" color={C.gold} count={shown.length} cols={[
            { k: 'w', l: 'Time', w: 128 },
            { k: 'c', l: 'Caller', w: 'minmax(160px,1fr)' },
            { k: 'r', l: 'Reason', w: 'minmax(170px,1.4fr)' },
            { k: 't', l: 'Type', w: 110 },
            { k: 'd', l: 'Duration', w: 86 },
            { k: 's', l: 'Status', w: 130 },
          ]}>
            {shown.map(c => {
              const s = STATUS[c.status as string] ?? STATUS.new
              return (
                <Row key={c.call_id} onClick={() => openDetail(c)} cells={[
                  <span key="w" style={{ fontSize: 13, color: C.muted }}>{when(c.created_at)}</span>,
                  <div key="c" style={{ minWidth: 0, textAlign: 'left', width: '100%' }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.caller_name || c.callback_number || c.from_number || 'Unknown caller'}</div>
                    {c.caller_name && (c.callback_number || c.from_number) && <div style={{ fontSize: 12, color: C.faint }}>{c.callback_number || c.from_number}</div>}
                  </div>,
                  <span key="r" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={c.summary || ''}>{c.reason || c.summary || '—'}</span>,
                  <span key="t" style={{ fontSize: 13 }}>{c.caller_type || '—'}</span>,
                  <span key="d" style={{ fontSize: 13 }}>{fmtDuration(c.duration_seconds)}</span>,
                  <span key="s" onClick={e => e.stopPropagation()}><Pill color={s.c} width={120}>{s.l}</Pill></span>,
                ]} />
              )
            })}
          </Group>
        )}
      </Body>

      {openCall && (
        <Modal title={openCall.caller_name || openCall.callback_number || openCall.from_number || 'Call'} onClose={() => setOpenCall(null)} width={700}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {STATUS_ORDER.map(k => (
              <button key={k} onClick={() => setStatus(openCall.call_id, k)} style={btn((openCall.status || 'new') === k ? 'gold' : 'ghost', true)}>{STATUS[k].l}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Called" value={when(openCall.created_at)} />
            <Stat label="Duration" value={fmtDuration(openCall.duration_seconds)} />
            <Stat label="Direction" value={openCall.direction || '—'} />
            <Stat label="Sentiment" value={openCall.sentiment || '—'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div><div style={label}>Caller name</div><div style={{ fontSize: 14 }}>{openCall.caller_name || '—'}</div></div>
            <div><div style={label}>Callback number</div><div style={{ fontSize: 14 }}>{openCall.callback_number || openCall.from_number || '—'}</div></div>
            <div><div style={label}>Caller type</div><div style={{ fontSize: 14 }}>{openCall.caller_type || '—'}</div></div>
            <div><div style={label}>Reason for calling</div><div style={{ fontSize: 14 }}>{openCall.reason || '—'}</div></div>
          </div>

          {openCall.summary && (
            <div style={{ marginBottom: 18 }}>
              <div style={label}>Summary</div>
              <div style={{ fontSize: 13.5, background: C.cream, border: '1px solid ' + C.creamLine, borderRadius: 6, padding: '10px 12px', lineHeight: 1.5 }}>{openCall.summary}</div>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <div style={label}>Recording</div>
            {openCall.recording_url ? <audio controls src={openCall.recording_url} style={{ width: '100%' }} /> : <div style={{ fontSize: 13.5, color: C.faint }}>No recording for this call.</div>}
          </div>

          <div style={{ marginBottom: followups.length ? 18 : 0 }}>
            <div style={label}>Transcript</div>
            {openCall.transcript ? (
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#FAFBFC', border: '1px solid ' + C.row, borderRadius: 6, padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>{openCall.transcript}</div>
            ) : <div style={{ fontSize: 13.5, color: C.faint }}>No transcript for this call.</div>}
          </div>

          {openCall.disconnection_reason && (
            <div style={{ fontSize: 12.5, color: C.faint, marginBottom: followups.length ? 18 : 0 }}>Ended: {openCall.disconnection_reason.replace(/_/g, ' ')}</div>
          )}

          {followups.length > 0 && (
            <div>
              <div style={label}>Follow-ups</div>
              {followups.map(f => (
                <div key={f.id} style={{ fontSize: 13, border: '1px solid ' + C.row, borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <Pill color={f.kind === 'message' ? C.blue : f.kind === 'task' ? C.purple : C.grey} width={80}>{f.kind}</Pill>
                    <span style={{ color: C.faint, fontSize: 12 }}>{f.status} · {f.created_by || 'Novourq Cloud AI'} · {when(f.created_at)}</span>
                  </div>
                  <div>{f.body}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {mapOpen && isAdmin && (
        <Modal title="Connect a number" onClose={() => setMapOpen(false)} width={520}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Link a Retell agent ID or a phone number Nova answers on to this company, so its calls land here and not with another company. Sangsters/NOVOURQ's own Nova line should be connected the same way, to its own company only.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div><div style={label}>Retell agent ID</div><input style={input} value={agentIdInput} onChange={e => setAgentIdInput(e.target.value)} placeholder="e.g. oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD" /></div>
            <div><div style={label}>Or the phone number Nova answers on</div><input style={input} value={numberInput} onChange={e => setNumberInput(e.target.value)} placeholder="+447700900123" /></div>
            <div><div style={label}>Label (optional)</div><input style={input} value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="e.g. Main line" /></div>
            {notice && <div style={{ fontSize: 12.5, color: C.red }}>{notice}</div>}
            <button onClick={addMapping} disabled={saving} style={{ ...btn('gold'), opacity: saving ? 0.6 : 1, alignSelf: 'flex-start' }}>{saving ? 'Saving…' : 'Connect'}</button>
          </div>
          {mappings.length > 0 && (
            <div style={{ borderTop: '1px solid ' + C.row, paddingTop: 12 }}>
              {mappings.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{m.label || 'Nova'}</div>
                    <div style={{ color: C.faint, fontSize: 12 }}>{[m.agent_id, m.to_number].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <button onClick={() => removeMapping(m.id)} style={btn('danger', true)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </CrmPage>
  )
}
