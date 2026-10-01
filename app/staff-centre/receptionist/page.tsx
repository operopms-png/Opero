'use client'
// AI Receptionist: one assistant across phone, email, the tenant & landlord
// portals and website chat. Shared knowledge + opening hours, a switch for
// each channel, a "try it" chat, and a log of everything it handled.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import PropertyManagerAgents from '../../../components/ai/PropertyManagerAgents'
import AskChat from '../../../components/ai/AskChat'
import { C, CrmPage, CrmHeader, Body, Stat, Pill, Group, Row, Empty, btn, input, label } from '../../../components/crm/Page'

async function api(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/receptionist', { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Something went wrong')
  return d
}

const CH: Record<string, { l: string; c: string }> = { phone: { l: 'Phone', c: '#DF2F4A' }, email: { l: 'Email', c: '#579BFC' }, portal: { l: 'Tenant / landlord', c: '#9D50DD' }, website: { l: 'Website chat', c: '#00C875' } }
const ACT: Record<string, { l: string; c: string }> = {
  replied: { l: 'Answered', c: '#00C875' }, drafted: { l: 'Draft ready', c: '#D0AE4C' }, message_taken: { l: 'Message taken', c: '#FDAB3D' },
  viewing_requested: { l: 'Viewing request', c: '#9D50DD' }, transferred: { l: 'Put through', c: '#579BFC' }, maintenance_created: { l: 'Repair logged', c: '#FF7575' },
  escalated: { l: 'Passed to staff', c: '#DF2F4A' }, skipped: { l: 'No action', c: '#C4C4C4' },
}
const DAYS: [string, string][] = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']]
const VOICES = [{ v: 'Polly.Amy-Neural', l: 'Amy — British, female' }, { v: 'Polly.Brian-Neural', l: 'Brian — British, male' }, { v: 'Polly.Emma-Neural', l: 'Emma — British, female' }, { v: 'Polly.Arthur-Neural', l: 'Arthur — British, male' }]
const TZ = [{ v: 'Europe/London', l: 'UK (London)' }, { v: 'America/Jamaica', l: 'Jamaica' }, { v: 'Asia/Dubai', l: 'UAE (Dubai)' }]
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function ModePicker({ value, options, onChange, disabled }: { value: string; options: { v: string; l: string; c: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid ' + C.border, borderRadius: 4, overflow: 'hidden', opacity: disabled ? 0.6 : 1 }}>
      {options.map((o, i) => {
        const on = o.v === value
        return <button key={o.v} disabled={disabled} onClick={() => onChange(o.v)} style={{ padding: '7px 12px', border: 'none', borderLeft: i ? '1px solid ' + C.border : 'none', background: on ? o.c : '#fff', color: on ? '#fff' : C.ink, fontSize: 13, fontWeight: on ? 600 : 400, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
      })}
    </div>
  )
}

function Card({ title, color, status, children }: { title: string; color: string; status: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid ' + C.row, borderLeft: '6px solid ' + color, borderRadius: 6, background: '#fff', padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color }}>{title}</span>
        <div style={{ flex: 1 }} />
        {status}
      </div>
      {children}
    </div>
  )
}

// Calling is built but hidden until a phone number is set up.
const SHOW_PHONE = false

export default function ReceptionistPage() {
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<any>(null)
  const [tab, setTab] = useState('ask')
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t) setTab(t) }, [])
  const [s, setS] = useState<any>(null)          // editable copy of settings
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState<'all' | 'follow'>('follow')
  const [open, setOpen] = useState<string | null>(null)
  const [testCh, setTestCh] = useState(SHOW_PHONE ? 'phone' : 'email')
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string; note?: string }[]>([])
  const [typing, setTyping] = useState('')
  const [thinking, setThinking] = useState(false)

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 4000) }
  async function load() { const r = await api(); setD(r); setS(r.settings); setDirty(false); return r }
  useEffect(() => { load().catch(e => flash(e.message)).finally(() => setLoading(false)) }, [])

  const set = (k: string, v: any) => { setS((x: any) => ({ ...x, [k]: v })); setDirty(true) }
  async function save(extra?: any) {
    setSaving(true)
    try { await api({ action: 'save', ...s, ...(extra ?? {}) }); await load(); flash('Saved') } catch (e: any) { flash(e.message) }
    setSaving(false)
  }
  async function quick(patch: any) { setS((x: any) => ({ ...x, ...patch })); try { await api({ action: 'save', ...patch }); await load(); flash('Saved') } catch (e: any) { flash(e.message) } }

  const log: any[] = d?.log ?? []
  const today = new Date().toDateString()
  const stats = useMemo(() => ({
    today: log.filter(l => new Date(l.created_at).toDateString() === today && l.action !== 'skipped').length,
    messages: log.filter(l => ['message_taken', 'viewing_requested'].includes(l.action) && !l.resolved).length,
    follow: log.filter(l => l.needs_staff && !l.resolved).length,
    repairs: log.filter(l => l.action === 'maintenance_created').length,
  }), [log])

  if (loading || !s) return <CrmPage><div style={{ padding: 60, color: C.faint }}>Loading…</div></CrmPage>
  const admin = d.isAdmin
  const on = (m: string) => m && m !== 'off'
  const liveChannels = [SHOW_PHONE && on(s.phone_mode) && d.phones.length > 0 && 'Phone', d.mailboxes.some((m: any) => m.ai_mode !== 'off') && 'Email', on(s.portal_mode) && 'Tenants & landlords', d.websiteChat?.enabled && 'Website chat'].filter(Boolean)

  const shown = log.filter(l => l.action !== 'skipped' && (filter === 'all' || (l.needs_staff && !l.resolved)))
  const groups = Object.keys(CH).map(k => ({ k, rows: shown.filter(l => l.channel === k) })).filter(g => g.rows.length)
  const cols = [{ k: 'w', l: 'When', w: 130 }, { k: 'c', l: 'From', w: 'minmax(200px,1fr)' }, { k: 's', l: 'What happened', w: 'minmax(260px,2fr)' }, { k: 'a', l: 'Result', w: 140 }, { k: 'f', l: 'Follow-up', w: 130 }]

  async function send() {
    const text = typing.trim()
    if (!text) return
    const next = [...chat, { role: 'user' as const, text }]
    setChat(next); setTyping(''); setThinking(true)
    try {
      const r = await api({ action: 'test', channel: testCh, messages: next.map(m => ({ role: m.role, text: m.text })) })
      setChat([...next, { role: 'ai', text: r.reply, note: r.would_do }])
    } catch (e: any) { setChat([...next, { role: 'ai', text: '⚠ ' + e.message }]) }
    setThinking(false)
  }

  return (
    <CrmPage>
      <CrmHeader
        title="AI Assistant"
        subtitle={<>The receptionist ({s.assistant_name}) answers {SHOW_PHONE ? 'calls, ' : ''}emails, tenant &amp; landlord messages and website chat using your company knowledge; the property manager agents help with guests, maintenance, cleaning, pricing, owner reports and leads. {liveChannels.length ? <>Live on: <b style={{ color: C.brown }}>{liveChannels.join(', ')}</b>.</> : 'Not switched on for any channel yet.'} Office is <b style={{ color: C.brown }}>{d.open ? 'open' : 'closed'}</b> now.</>}
        actions={!d.aiReady ? <Pill color={C.red} width={0}>AI key missing on server</Pill> : undefined}
        tabs={[{ k: 'ask', l: 'Ask AI' }, { k: 'activity', l: 'Activity', count: stats.follow || undefined }, { k: 'channels', l: 'Channels' }, { k: 'knowledge', l: 'Knowledge & hours' }, { k: 'try', l: 'Try it' }, { k: 'agents', l: 'Property manager' }]}
        tab={tab} onTab={setTab}
      />
      <Body>
        {tab === 'ask' && (
          <div style={{ height: 'calc(100vh - 200px)', minHeight: 520, display: 'flex' }}>
            <AskChat showHistory suggestions={['Which properties are available and what’s the rent?', 'Which leases end in the next 60 days?', 'Summarise the interested Airbnb hosts', 'Market rent for a 2-bed in Mandeville']} />
          </div>
        )}
        {tab === 'activity' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
              <Stat label="Handled today" value={stats.today} />
              <Stat label="Messages & viewing requests" value={stats.messages} sub="not yet dealt with" />
              <Stat label="Repairs logged" value={stats.repairs} />
              <Stat label="Need follow-up" value={stats.follow} highlight />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setFilter('follow')} style={btn(filter === 'follow' ? 'gold' : 'ghost', true)}>Needs follow-up</button>
              <button onClick={() => setFilter('all')} style={btn(filter === 'all' ? 'gold' : 'ghost', true)}>Everything</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => load()} style={btn('ghost', true)}>↻ Refresh</button>
            </div>
            {groups.length === 0 ? <Empty>{filter === 'follow' ? 'Nothing waiting for staff. ' : 'Nothing handled yet. '}{liveChannels.length ? '' : 'Switch the receptionist on in Channels.'}</Empty> :
              groups.map(g => (
                <Group key={g.k} title={CH[g.k].l} color={CH[g.k].c} count={g.rows.length} cols={cols}>
                  {g.rows.map(l => {
                    const a = ACT[l.action] ?? { l: l.action, c: C.grey }
                    const det = l.details ?? {}
                    return (
                      <Row key={l.id} active={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}
                        cells={[
                          <span key="w" style={{ fontSize: 13, color: C.muted }}>{when(l.created_at)}</span>,
                          <div key="c" style={{ minWidth: 0 }}><div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.contact_name || l.contact || 'Unknown'}</div>{l.contact_name && l.contact && <div style={{ fontSize: 12, color: C.faint }}>{l.contact}</div>}</div>,
                          <span key="s" style={{ fontSize: 13, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.summary || l.subject || '—'}</span>,
                          <Pill key="a" color={a.c} width={120}>{a.l}</Pill>,
                          l.needs_staff
                            ? <span key="f" onClick={e => e.stopPropagation()}><Pill color={l.resolved ? C.green : C.red} width={110} onClick={async () => { await api({ action: 'resolve', id: l.id, resolved: !l.resolved }).catch(() => {}); load() }} title="Click when dealt with">{l.resolved ? 'Done' : 'To do'}</Pill></span>
                            : <span key="f" style={{ color: C.faint, fontSize: 12 }}>—</span>,
                        ]}
                        below={open === l.id ? (
                          <div style={{ padding: '12px 16px 14px 16px', fontSize: 13, lineHeight: 1.55 }}>
                            {det.message && <div style={{ marginBottom: 8 }}><b>Message:</b> {det.message.reason} — {det.message.name} {det.message.phone}{det.message.urgent ? ' (urgent)' : ''}</div>}
                            {det.viewing && <div style={{ marginBottom: 8 }}><b>Viewing:</b> {det.viewing.property} · {det.viewing.preferred_times} — {det.viewing.name} {det.viewing.phone}</div>}
                            {det.maintenance && <div style={{ marginBottom: 8 }}><b>Repair logged:</b> {det.maintenance.title} ({det.maintenance.priority})</div>}
                            {det.category && <div style={{ marginBottom: 8 }}><b>Type:</b> {det.category}{det.mailbox ? ` · ${det.mailbox}` : ''}</div>}
                            {det.transcript && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#fff', border: '1px solid ' + C.row, borderRadius: 4, padding: 10, maxHeight: 260, overflowY: 'auto', margin: '4px 0 8px' }}>{det.transcript}</pre>}
                            {l.link && <a href={l.link} style={{ color: C.goldDark }}>Open {l.channel === 'email' ? 'Email' : l.channel === 'portal' ? 'Conversations' : 'details'} →</a>}
                          </div>
                        ) : undefined}
                      />
                    )
                  })}
                </Group>
              ))}
          </>
        )}

        {tab === 'channels' && (
          <div style={{ maxWidth: 980 }}>
            {!admin && <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Only admins can change these settings.</div>}
            {SHOW_PHONE && <Card title="Phone calls" color={CH.phone.c} status={<Pill width={0} color={!on(s.phone_mode) ? C.grey : d.phones.length ? C.green : C.orange}>{!on(s.phone_mode) ? 'Off' : d.phones.length ? 'On' : 'Waiting for a phone number'}</Pill>}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Answers your business line, handles questions, takes messages, notes viewing requests and puts callers through to staff. Every call is written up with a transcript.</div>
              <ModePicker disabled={!admin} value={s.phone_mode} onChange={v => quick({ phone_mode: v })} options={[{ v: 'off', l: 'Off', c: C.grey }, { v: 'no_answer', l: 'When nobody answers', c: C.gold }, { v: 'out_of_hours', l: 'Out of hours', c: C.purple }, { v: 'always', l: 'Every call', c: C.green }]} />
              {d.phones.length === 0 ? (
                <div style={{ marginTop: 14, background: '#FFF4E0', border: '1px solid #F8D49B', borderRadius: 4, padding: '10px 14px', fontSize: 13, lineHeight: 1.55 }}>
                  <b>No phone number connected yet.</b> Add a Twilio number to the portal, then either forward <b>020 7164 0329</b> to it from your virtual landline provider, or move the number to Twilio. Until then the phone receptionist can’t take calls — you can still test it in “Try it”.
                </div>
              ) : <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}>Answering: {d.phones.map((p: any) => p.phone_number).join(', ')}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={label}>Greeting (leave blank for the standard one)</label><input disabled={!admin} value={s.phone_greeting ?? ''} onChange={e => set('phone_greeting', e.target.value)} placeholder={`Hello, thank you for calling ${s.company_name || 'us'}. I'm ${s.assistant_name}, the virtual receptionist. How can I help you today?`} style={input} /></div>
                <div><label style={label}>Voice</label><select disabled={!admin} value={s.phone_voice} onChange={e => set('phone_voice', e.target.value)} style={{ ...input, cursor: 'pointer' }}>{VOICES.map(v => <option key={v.v} value={v.v}>{v.l}</option>)}</select></div>
                <div><label style={label}>Put callers through to (a phone number)</label><input disabled={!admin} value={s.phone_transfer_number ?? ''} onChange={e => set('phone_transfer_number', e.target.value)} placeholder="+44 7…  (blank = take a message instead)" style={input} /></div>
                <div><label style={label}>“When nobody answers”: ring staff for (seconds)</label><input disabled={!admin} type="number" value={s.phone_ring_seconds} onChange={e => set('phone_ring_seconds', e.target.value)} style={input} /></div>
              </div>
              {admin && dirty && <div style={{ marginTop: 12 }}><button onClick={() => save()} disabled={saving} style={btn('gold', true)}>{saving ? 'Saving…' : 'Save phone settings'}</button></div>}
            </Card>}

            <Card title="Email" color={CH.email.c} status={<Pill width={0} color={d.mailboxes.some((m: any) => m.ai_mode !== 'off') ? C.green : C.grey}>{d.mailboxes.filter((m: any) => m.ai_mode !== 'off').length} of {d.mailboxes.length} mailboxes</Pill>}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}><b>Drafts:</b> the AI writes a reply for each new email and staff send it with one click. <b>Auto-reply:</b> it sends the reply itself when it’s confident, and leaves a draft when a person needs to decide. Newsletters, receipts and no-reply emails are ignored.</div>
              <div style={{ border: '1px solid ' + C.row, borderRadius: 4 }}>
                {d.mailboxes.map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid ' + C.row }}>
                    <span style={{ flex: 1, fontSize: 14 }}>{m.email}{m.status !== 'connected' && <span style={{ fontSize: 12, color: C.faint }}> · not connected</span>}</span>
                    <ModePicker disabled={!admin} value={m.ai_mode || 'off'} onChange={async v => { try { await api({ action: 'mailbox_mode', id: m.id, ai_mode: v }); await load() } catch (e: any) { flash(e.message) } }} options={[{ v: 'off', l: 'Off', c: C.grey }, { v: 'draft', l: 'Drafts', c: C.gold }, { v: 'auto', l: 'Auto-reply', c: C.green }]} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Tenant & landlord messages" color={CH.portal.c} status={<Pill width={0} color={on(s.portal_mode) ? C.green : C.grey}>{on(s.portal_mode) ? 'On' : 'Off'}</Pill>}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Replies to messages sent from the tenant and landlord portals (Property Management and Estate Agency). Staff see every reply in Conversations, marked as the AI, and can jump in at any time.</div>
              <ModePicker disabled={!admin} value={s.portal_mode} onChange={v => quick({ portal_mode: v })} options={[{ v: 'off', l: 'Off', c: C.grey }, { v: 'out_of_hours', l: 'Out of hours', c: C.purple }, { v: 'always', l: 'Always', c: C.green }]} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: admin ? 'pointer' : 'default' }}>
                <input type="checkbox" disabled={!admin} checked={!!s.portal_create_maintenance} onChange={e => quick({ portal_create_maintenance: e.target.checked })} style={{ accentColor: C.goldDark }} />
                When a tenant reports a problem, log a repair ticket in Maintenance automatically
              </label>
            </Card>

            <Card title="Website chat" color={CH.website.c} status={<Pill width={0} color={d.websiteChat?.enabled ? C.green : C.grey}>{d.websiteChat?.enabled ? 'On' : 'Off'}</Pill>}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>The chat box on your website. It {s.sync_website_chat ? 'uses the same knowledge as the receptionist' : 'has its own knowledge'} and captures leads into the CRM.</div>
              <a href="/staff-centre/website-chats" style={btn('ghost', true)}>Open Website Chats →</a>
            </Card>
          </div>
        )}

        {tab === 'knowledge' && (
          <div style={{ maxWidth: 980 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={label}>Receptionist name</label><input disabled={!admin} value={s.assistant_name} onChange={e => set('assistant_name', e.target.value)} style={input} /></div>
              <div><label style={label}>Company name (as said to callers)</label><input disabled={!admin} value={s.company_name ?? ''} onChange={e => set('company_name', e.target.value)} style={input} /></div>
              <div><label style={label}>Email alerts go to</label><input disabled={!admin} value={s.alert_email ?? ''} onChange={e => set('alert_email', e.target.value)} placeholder="admin@sangstersgroup.com" style={input} /></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={label}>What the receptionist knows — services, areas, fees, how viewings work, office address, FAQs</label>
              <textarea disabled={!admin} value={s.knowledge ?? ''} onChange={e => set('knowledge', e.target.value)} style={{ ...input, minHeight: 320, resize: 'vertical', fontSize: 13.5, lineHeight: 1.55 }} placeholder="e.g. We manage properties in Kingston, Montego Bay and London. Viewings are arranged Monday–Saturday. Our management fee is…" />
              <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>It will only state facts written here (plus the caller’s own property details for tenants and landlords). Anything else, it says the team will get back to them.</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14 }}>
                <input type="checkbox" disabled={!admin} checked={!!s.sync_website_chat} onChange={e => set('sync_website_chat', e.target.checked)} style={{ accentColor: C.goldDark }} />
                Use the same knowledge and name for the website chat
              </label>
            </div>
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 24, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Office hours</div>
                <div style={{ border: '1px solid ' + C.row, borderRadius: 4 }}>
                  {DAYS.map(([k, name]) => {
                    const slot = s.hours?.[k]
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 12px', borderBottom: '1px solid ' + C.row }}>
                        <label style={{ width: 130, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                          <input type="checkbox" disabled={!admin} checked={!!slot} onChange={e => set('hours', { ...s.hours, [k]: e.target.checked ? ['09:00', '17:30'] : null })} style={{ accentColor: C.goldDark }} />{name}
                        </label>
                        {slot ? <>
                          <input type="time" disabled={!admin} value={slot[0]} onChange={e => set('hours', { ...s.hours, [k]: [e.target.value, slot[1]] })} style={{ ...input, width: 120, padding: '5px 8px' }} />
                          <span style={{ color: C.faint }}>to</span>
                          <input type="time" disabled={!admin} value={slot[1]} onChange={e => set('hours', { ...s.hours, [k]: [slot[0], e.target.value] })} style={{ ...input, width: 120, padding: '5px 8px' }} />
                        </> : <span style={{ fontSize: 13, color: C.faint }}>Closed</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div><label style={label}>Time zone</label><select disabled={!admin} value={s.timezone} onChange={e => set('timezone', e.target.value)} style={{ ...input, cursor: 'pointer' }}>{TZ.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>“Out of hours” modes use these hours.</div></div>
            </div>
            {admin && <div style={{ marginTop: 20, display: 'flex', gap: 8 }}><button onClick={() => save()} disabled={saving || !dirty} style={{ ...btn('gold'), opacity: saving || !dirty ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>{dirty && <button onClick={() => { setS(d.settings); setDirty(false) }} style={btn('ghost')}>Undo changes</button>}</div>}
          </div>
        )}

        {tab === 'try' && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Pretend to be a</span>
              <ModePicker value={testCh} onChange={v => { setTestCh(v); setChat([]) }} options={[...(SHOW_PHONE ? [{ v: 'phone', l: 'Caller', c: CH.phone.c }] : []), { v: 'email', l: 'Email sender', c: CH.email.c }, { v: 'portal', l: 'Tenant / landlord', c: CH.portal.c }, { v: 'website', l: 'Website visitor', c: CH.website.c }]} />
              <div style={{ flex: 1 }} />
              {chat.length > 0 && <button onClick={() => setChat([])} style={btn('ghost', true)}>Start again</button>}
            </div>
            <div style={{ border: '1px solid ' + C.row, borderRadius: 6, background: '#FAFBFC', padding: 16, minHeight: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chat.length === 0 && <div style={{ color: C.faint, fontSize: 14, textAlign: 'center', margin: 'auto' }}>Type what a customer might say, e.g. “Hi, I’m interested in a 2 bed in Montego Bay — can I view it Saturday?”</div>}
              {chat.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                  <div style={{ background: m.role === 'user' ? C.goldDark : '#fff', color: m.role === 'user' ? '#fff' : C.ink, border: m.role === 'user' ? 'none' : '1px solid ' + C.row, borderRadius: 8, padding: '9px 12px', fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  {m.note && <div style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>Would: {m.note}</div>}
                </div>
              ))}
              {thinking && <div style={{ color: C.faint, fontSize: 13 }}>{s.assistant_name} is typing…</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={typing} onChange={e => setTyping(e.target.value)} onKeyDown={e => e.key === 'Enter' && !thinking && send()} placeholder="Say something…" style={input} />
              <button onClick={send} disabled={thinking || !typing.trim()} style={{ ...btn('gold'), opacity: thinking || !typing.trim() ? 0.6 : 1 }}>Send</button>
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Uses your saved knowledge — save changes in “Knowledge &amp; hours” first. Nothing here is sent to anyone.</div>
          </div>
        )}
        {tab === 'agents' && <PropertyManagerAgents />}
      </Body>
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13.5, zIndex: 80 }}>{toast}</div>}
    </CrmPage>
  )
}
