'use client'
// Staff Centre → Landlord Leads. Landlords who used the "What could your
// property earn?" checker on sangstersgroup.com or app.sangstersgroup.com/earnings.
// Each lead shows their property, the market estimate they were sent and a
// status the team moves along: New → Contacted → Valuation → Meeting → Signed / Lost.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Body, Stat, Pill, Group, Row, Empty, Modal, Loading, btn, input, label } from '../../../components/crm/Page'

const STATUS: Record<string, { l: string; c: string }> = {
  new: { l: 'New', c: C.blue }, contacted: { l: 'Contacted', c: C.orange }, valuation: { l: 'Valuation sent', c: C.purple },
  meeting: { l: 'Meeting booked', c: C.goldDark }, signed: { l: 'Signed', c: C.green }, lost: { l: 'Lost', c: C.grey },
}
const ORDER = ['new', 'contacted', 'valuation', 'meeting', 'signed', 'lost']
const SYM: Record<string, string> = { USD: '$', JMD: 'J$', GBP: '£' }
const money = (n: any, c: string) => n == null ? '—' : (SYM[c] || '') + Math.round(Number(n)).toLocaleString('en-GB')
const LINK = 'https://app.sangstersgroup.com/earnings'
const EMBED = '<div data-sg-earnings></div>\n<script src="https://app.sangstersgroup.com/sg-earnings.js" defer></script>'

async function api(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/landlord-estimates', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}

export default function LandlordLeads() {
  const [leads, setLeads] = useState<any[] | null>(null)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<any>(null)
  const [share, setShare] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { api().then(d => setLeads(d.leads)).catch(e => setErr(e.message)) }, [])
  const put = (l: any) => { setLeads(ls => (ls || []).map(x => x.id === l.id ? l : x)); setOpen((o: any) => o && o.id === l.id ? l : o) }

  const counts = useMemo(() => { const m: Record<string, number> = {}; (leads || []).forEach(l => { m[l.status] = (m[l.status] || 0) + 1 }); return m }, [leads])
  const shown = (leads || []).filter(l => (tab === 'all' || l.status === tab) && (!q || [l.name, l.email, l.location, l.phone].join(' ').toLowerCase().includes(q.toLowerCase())))
  const month = (leads || []).filter(l => new Date(l.created_at) > new Date(Date.now() - 30 * 864e5)).length
  const signed = counts.signed || 0, total = (leads || []).length

  return (
    <CrmPage>
      <CrmHeader title="Landlord Leads" subtitle="Landlords who checked what their property could earn on your website."
        actions={<><button style={btn('ghost')} onClick={() => setShare(true)}>Link &amp; embed code</button><a style={btn('gold')} href={LINK} target="_blank" rel="noreferrer">Open the checker</a></>}
        tabs={[{ k: 'all', l: 'All', count: total }, ...ORDER.map(k => ({ k, l: STATUS[k].l, count: counts[k] || undefined }))]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!leads ? <Loading /> : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
            <Stat label="Leads, last 30 days" value={month} highlight />
            <Stat label="New, not yet contacted" value={counts.new || 0} />
            <Stat label="Meetings booked" value={counts.meeting || 0} />
            <Stat label="Signed" value={signed} sub={total ? `${Math.round(signed / total * 100)}% of all leads` : undefined} />
          </div>
          <input placeholder="Search name, email, phone or area" value={q} onChange={e => setQ(e.target.value)} style={{ ...input, maxWidth: 360, marginBottom: 18 }} />
          {shown.length === 0 ? <Empty>{total === 0 ? <>No landlord leads yet. Share <b>{LINK}</b> in your ads, letters and with realtors, or put the form on your website.</> : 'No leads match.'}</Empty> : (
            <Group title={tab === 'all' ? 'All leads' : STATUS[tab].l} color={tab === 'all' ? C.goldDark : STATUS[tab].c} count={shown.length}
              cols={[{ k: 'n', l: 'Landlord', w: 'minmax(200px,1.3fr)' }, { k: 'p', l: 'Property', w: 'minmax(200px,1.4fr)' }, { k: 'h', l: 'Holiday let / mo', w: 130 }, { k: 'l', l: 'Long let / mo', w: 130 }, { k: 'g', l: 'Wants', w: 150 }, { k: 'w', l: 'Lives in', w: 120 }, { k: 's', l: 'Status', w: 140 }, { k: 'd', l: 'Date', w: 100 }]}>
              {shown.map(l => (
                <Row key={l.id} onClick={() => setOpen(l)} active={open?.id === l.id} cells={[
                  <div key="n" style={{ minWidth: 0 }}><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div><div style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</div></div>,
                  <div key="p" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.bedrooms === 0 ? 'Studio' : l.bedrooms ? `${l.bedrooms}-bed` : ''} {(l.property_type || '').toLowerCase()} · {l.location}</div>,
                  <span key="h" style={{ fontWeight: 600 }}>{money(l.estimate?.short_let?.monthly_typical, l.currency)}</span>,
                  <span key="l" style={{ fontWeight: 600 }}>{money(l.estimate?.long_let?.monthly_typical, l.currency)}</span>,
                  <span key="g" style={{ fontSize: 12.5 }}>{l.goal || '—'}</span>,
                  <span key="w" style={{ fontSize: 12.5 }}>{l.lives_in || '—'}</span>,
                  <Pill key="s" color={STATUS[l.status]?.c || C.grey} width={120}>{STATUS[l.status]?.l || l.status}</Pill>,
                  <span key="d" style={{ fontSize: 12.5, color: C.muted }}>{new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>,
                ]} />
              ))}
            </Group>
          )}
        </>}
      </Body>
      {open && <LeadModal lead={open} onClose={() => setOpen(null)} onSaved={put} />}
      {share && (
        <Modal title="Share the earnings checker" onClose={() => setShare(false)} width={600}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div><div style={label}>Link for ads, letters, emails and realtors</div><Copy text={LINK} /><div style={{ fontSize: 12.5, color: C.faint, marginTop: 6 }}>Add <b>?src=</b> to see where a lead came from, e.g. <b>{LINK}?src=facebook-uk</b> or <b>?src=realtor-jones</b>.</div></div>
            <div><div style={label}>Website embed (Elementor → HTML widget)</div><Copy text={EMBED} multi /></div>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}

function Copy({ text, multi }: { text: string; multi?: boolean }) {
  const [ok, setOk] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <pre style={{ flex: 1, margin: 0, padding: '9px 11px', background: '#F7F8FA', border: '1px solid ' + C.row, borderRadius: 4, fontSize: 12.5, whiteSpace: multi ? 'pre-wrap' : 'nowrap', overflow: 'auto', fontFamily: 'ui-monospace, Menlo, monospace' }}>{text}</pre>
      <button style={btn('ghost', true)} onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}>{ok ? 'Copied' : 'Copy'}</button>
    </div>
  )
}

function LeadModal({ lead, onClose, onSaved }: { lead: any; onClose: () => void; onSaved: (l: any) => void }) {
  const [notes, setNotes] = useState(lead.staff_notes || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const e = lead.estimate, c = lead.currency
  const run = async (body: any, key: string) => { setBusy(key); setErr(''); try { const d = await api({ id: lead.id, ...body }); onSaved(d.lead) } catch (x: any) { setErr(x.message) } setBusy('') }
  const card = (title: string, main: string, sub: string, dark?: boolean) => (
    <div style={{ border: '1px solid ' + (dark ? '#191815' : C.row), background: dark ? '#191815' : '#fff', color: dark ? '#fff' : C.ink, borderRadius: 6, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: dark ? '#D9B866' : C.muted }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 2px' }}>{main}</div>
      <div style={{ fontSize: 12.5, color: dark ? '#CFC9BC' : C.muted }}>{sub}</div>
    </div>
  )
  return (
    <Modal title={lead.name} onClose={onClose} width={680}>
      <div style={{ display: 'grid', gap: 16, maxHeight: '72vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13.5 }}>
          <a href={`mailto:${lead.email}`} style={btn('ghost', true)}>{lead.email}</a>
          {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} style={btn('ghost', true)}>{lead.phone}</a>}
          {lead.crm_contact_id && <a href="/staff-centre/crm" style={btn('ghost', true)}>Open in CRM</a>}
        </div>
        <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.7, background: '#F7F8FA', borderRadius: 6, padding: '10px 14px' }}>
          <b>{lead.bedrooms === 0 ? 'Studio' : lead.bedrooms ? `${lead.bedrooms}-bed` : ''} {(lead.property_type || 'property').toLowerCase()}</b> in {lead.location}{lead.country ? `, ${lead.country}` : ''}
          {lead.bathrooms ? ` · ${lead.bathrooms} bath` : ''}{lead.furnished ? ` · furnished: ${lead.furnished}` : ''}<br />
          Wants: <b>{lead.goal || '—'}</b> · Lives in: <b>{lead.lives_in || '—'}</b> · Came from: {lead.source || '—'} · {new Date(lead.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
        {e ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {e.short_let?.monthly_typical ? card('Holiday let / month', money(e.short_let.monthly_typical, c), `${money(e.short_let.monthly_low, c)} – ${money(e.short_let.monthly_high, c)} · ${money(e.short_let.nightly_typical, c)}/night at ${e.short_let.occupancy_pct ?? '—'}%`, true) : <div />}
              {e.long_let?.monthly_typical ? card('Long let / month', money(e.long_let.monthly_typical, c), `${money(e.long_let.monthly_low, c)} – ${money(e.long_let.monthly_high, c)}`) : <div />}
            </div>
            {[['Similar holiday lets', e.short_let?.comparables], ['Similar homes to rent', e.long_let?.comparables]].map(([t, list]: any) => list?.length ? (
              <div key={t} style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t}</div>
                {list.map((x: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid ' + C.row }}>{x.url ? <a href={x.url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>{x.title}</a> : <span>{x.title}</span>}<span style={{ color: C.muted, whiteSpace: 'nowrap' }}>{x.price_text}</span></div>)}
              </div>
            ) : null)}
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>Sent to the landlord {new Date(e.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Figures in {c}.</div>
          </div>
        ) : <div style={{ fontSize: 13, color: C.orange }}>No estimate yet{lead.estimate_error ? ` (${lead.estimate_error})` : ''} — the landlord was told the team will send one within 24 hours.</div>}
        <button style={{ ...btn('ghost', true), justifySelf: 'start' }} disabled={!!busy} onClick={() => run({ action: 'rerun' }, 'rerun')}>{busy === 'rerun' ? 'Checking the market… (about 40s)' : e ? 'Re-check the market' : 'Run the estimate now'}</button>
        <div>
          <div style={label}>Status</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ORDER.map(k => <button key={k} disabled={!!busy} onClick={() => run({ action: 'update', status: k }, 's')} style={{ ...btn(lead.status === k ? 'gold' : 'ghost', true), ...(lead.status === k ? { background: STATUS[k].c, borderColor: STATUS[k].c } : {}) }}>{STATUS[k].l}</button>)}
          </div>
        </div>
        <div>
          <div style={label}>Team notes</div>
          <textarea value={notes} onChange={x => setNotes(x.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} placeholder="Called, owner in London, wants valuation next week…" />
          <button style={{ ...btn('gold', true), marginTop: 8 }} disabled={!!busy || notes === (lead.staff_notes || '')} onClick={() => run({ action: 'update', staff_notes: notes }, 'n')}>{busy === 'n' ? 'Saving…' : 'Save notes'}</button>
        </div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      </div>
    </Modal>
  )
}
