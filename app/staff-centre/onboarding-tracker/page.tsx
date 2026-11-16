'use client'
// Staff Centre → Onboarding tracker: every landlord, tenant, co-host and investor being onboarded, on one board.
// Shows how far each has got, who has gone quiet for 7 days, and lets staff tick manual steps, email the client their
// private link again, or give an expired link 14 more days. Data: /api/onboarding-tracker (lib/onboarding-tracker.ts).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { CrmPage, CrmHeader, Body, Stat, Pill, Empty, Loading, btn, input as inp, C } from '../../../components/crm/Page'
import type { TrackerRow } from '../../../lib/onboarding-tracker'

async function api(url: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  return { ok: r.ok, data: await r.json().catch(() => ({})) }
}
const RECORD: Record<string, string> = { pm_landlord: '/pm?tab=Landlords', pm_tenant: '/pm?tab=Tenants', ea_landlord: '/estate?section=Landlords', ea_tenant: '/estate?section=Tenants', str_cohost: '/staff-centre/cohosts', dev_investor: '/dev?tab=Investors', str_owner: '/staff-centre/portals' }
const KIND: Record<string, string> = { pm_landlord: 'Landlord', pm_tenant: 'Tenant', ea_landlord: 'Landlord', ea_tenant: 'Tenant', str_cohost: 'Co-host', dev_investor: 'Investor', str_owner: 'Owner' }
const STATUSES = [['all', 'All'], ['stuck', 'Stuck'], ['progress', 'In progress'], ['notstarted', 'Not started'], ['done', 'Finished']] as const
const ago = (iso: string | null) => { if (!iso) return ''; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago` }

export default function OnboardingTracker() {
  const [d, setD] = useState<{ rows: TrackerRow[]; counts: any } | null>(null)
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('')
  const [older, setOlder] = useState(false); const [status, setStatus] = useState<(typeof STATUSES)[number][0]>('all')
  const [kind, setKind] = useState('all'); const [q, setQ] = useState(''); const [open, setOpen] = useState<string | null>(null); const [busy, setBusy] = useState('')

  async function load(o = older) {
    const r = await api('/api/onboarding-tracker' + (o ? '?older=1' : ''))
    if (r.ok) { setD(r.data); setErr('') } else setErr(r.data?.error || 'Could not load the tracker.')
  }
  useEffect(() => { load(older) }, [older]) // eslint-disable-line react-hooks/exhaustive-deps

  const kinds = useMemo(() => [...new Set((d?.rows ?? []).map(r => KIND[r.seg]))], [d])
  const list = useMemo(() => (d?.rows ?? []).filter(r =>
    (kind === 'all' || KIND[r.seg] === kind) &&
    (status === 'all' || (status === 'stuck' ? r.stuck : status === 'done' ? r.complete : status === 'notstarted' ? r.notStarted : !r.complete && !r.notStarted)) &&
    (!q || (r.name + ' ' + (r.email ?? '')).toLowerCase().includes(q.toLowerCase()))), [d, kind, status, q])

  async function act(key: string, body: any, ok: string) {
    setBusy(key); setMsg('')
    const r = await api('/api/onboarding-tracker', body); setBusy('')
    setMsg(r.ok ? ok : (r.data?.error || 'Something went wrong.'))
    if (r.ok) load()
  }
  const toggle = (r: TrackerRow, key: string, done: boolean) => {
    // show the tick straight away, then confirm with the server
    setD(p => p && ({ ...p, rows: p.rows.map(x => x.id !== r.id ? x : { ...x, steps: x.steps.map(s => s.key === key ? { ...s, done } : s), done: x.done + (done ? 1 : -1) }) }))
    act(r.id + key, { action: 'toggle', seg: r.seg, customerId: r.customerId, key, done }, 'Saved.')
  }

  if (!d) return <CrmPage><CrmHeader title="Onboarding tracker" subtitle="" />{err ? <Body><div style={{ color: C.red }}>{err}</div></Body> : <Loading />}</CrmPage>
  const c = d.counts
  return (
    <CrmPage>
      <CrmHeader title="Onboarding tracker" subtitle="Every landlord, tenant, co-host and investor being onboarded, with how far each has got. Stuck means not finished and nothing has moved for 7 days. Clients who have not finished their private link are emailed automatically: first after 2 days, then every 3 days, up to 4 times."
        actions={<button style={btn('ghost')} onClick={() => { window.location.href = '/staff-centre/documents' }}>Send a new client link</button>} />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
          <Stat label="In onboarding" value={c.inProgress} /><Stat label="Stuck" value={c.stuck} highlight={c.stuck > 0} /><Stat label="Link not opened" value={c.notStarted} /><Stat label="Finished" value={c.complete} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {STATUSES.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} style={{ ...btn(status === k ? 'gold' : 'ghost', true) }}>{l}</button>)}
          <span style={{ width: 1, height: 22, background: C.border }} />
          {['all', ...kinds].map(k => <button key={k} onClick={() => setKind(k)} style={{ ...btn(kind === k ? 'gold' : 'ghost', true) }}>{k === 'all' ? 'Everyone' : k + 's'}</button>)}
          <input style={{ ...inp, maxWidth: 240, marginLeft: 'auto' }} placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: C.muted, marginBottom: 12 }}>
          <input type="checkbox" checked={older} onChange={e => setOlder(e.target.checked)} /> Include clients added more than 120 days ago
        </label>
        {msg && <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{msg}</div>}
        {list.length === 0 ? <Empty>{d.rows.length ? 'Nobody matches these filters.' : 'No clients are being onboarded. Send a new client link from Documents and they appear here.'}</Empty> : list.map(r => {
          const pct = r.total ? Math.round(r.done / r.total * 100) : 0, isOpen = open === r.id
          return (
            <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.stuck ? '#F3B8C2' : C.border}`, borderLeft: `4px solid ${r.complete ? C.green : r.stuck ? C.red : C.orange}`, borderRadius: 8, marginBottom: 8 }}>
              <div onClick={() => setOpen(isOpen ? null : r.id)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.6fr) auto', gap: 14, alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>{KIND[r.seg]} · {r.moduleLabel}</div>
                </div>
                <div>
                  <div style={{ height: 8, borderRadius: 4, background: '#EEF0F4', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: r.complete ? C.green : C.blue }} /></div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.notStarted ? 'Link not opened' : `${r.done} of ${r.total} steps`}</div>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, minWidth: 0 }}>
                  {r.complete ? 'Everything done.' : <><span style={{ color: C.ink }}>Next: {r.next}</span><br />{r.idleDays <= 0 ? 'Moved today' : `Nothing moved for ${r.idleDays} day${r.idleDays === 1 ? '' : 's'}`}</>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {r.stuck && <Pill color={C.red} width={70}>Stuck</Pill>}
                  {r.link?.expired && <Pill color={C.orange} width={80}>Link expired</Pill>}
                  {r.complete && <Pill color={C.green} width={70}>Done</Pill>}
                  <span style={{ color: C.faint }}>{isOpen ? '▾' : '▸'}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.row}`, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Steps</div>
                    {r.steps.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>The steps start once they open their link and add their details.</div> : r.steps.map(s => (
                      <label key={s.key} title={s.editable ? 'Tick when done' : 'Ticks itself from a real record'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13.5, cursor: s.editable ? 'pointer' : 'default', color: s.done ? C.ink : C.muted }}>
                        <input type="checkbox" checked={s.done} disabled={!s.editable || busy === r.id + s.key} onChange={e => toggle(r, s.key, e.target.checked)} />
                        <span>{s.label}{!s.editable && <span style={{ color: C.faint, fontSize: 11.5 }}> · automatic</span>}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Contact and link</div>
                    <div>{r.email || 'No email'}{r.phone ? ' · ' + r.phone : ''}</div>
                    <div style={{ color: C.muted, marginTop: 4 }}>Added {ago(r.created_at)}</div>
                    {r.link ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: C.muted }}>Private link: {r.link.status === 'done' ? 'finished' : r.link.expired ? 'expired' : r.link.status === 'started' ? 'started' : 'not opened'}{r.link.status !== 'done' && ` · ${r.link.reminders} reminder${r.link.reminders === 1 ? '' : 's'} sent${r.link.last_reminded_at ? ', last ' + ago(r.link.last_reminded_at) : ''}`}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          <button style={btn('ghost', true)} onClick={() => { navigator.clipboard?.writeText(r.link!.url).then(() => setMsg('Link copied.')).catch(() => setMsg(r.link!.url)) }}>Copy link</button>
                          {r.link.status !== 'done' && !r.link.expired && r.link.sent_to && <button style={btn('gold', true)} disabled={busy === r.id + 'remind'} onClick={() => act(r.id + 'remind', { action: 'remind', linkId: r.link!.id }, `Reminder emailed to ${r.link!.sent_to}.`)}>{busy === r.id + 'remind' ? 'Sending…' : 'Remind now'}</button>}
                          {r.link.status !== 'done' && <button style={btn('ghost', true)} onClick={() => act(r.id + 'extend', { action: 'extend', linkId: r.link!.id }, 'Link extended by 14 days and reminders restarted.')}>Extend 14 days</button>}
                        </div>
                      </div>
                    ) : <div style={{ color: C.muted, marginTop: 8 }}>No private link was sent to this person.</div>}
                    {!r.notStarted && RECORD[r.seg] && <a href={RECORD[r.seg]} style={{ ...btn('ghost', true), marginTop: 10 }}>Open {KIND[r.seg].toLowerCase()} records</a>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </Body>
    </CrmPage>
  )
}
