'use client'
// Co-host portal: the properties we manage for them, bookings, earnings and maintenance, plus their documents.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PortalDocuments from '@/components/portal/PortalDocuments'
import { money } from '@/lib/partner-schedule'

const A = '#2F6DB5', INK = '#10234d', MUTED = '#667085', LINE = '#E4E7EC'
const TABS = ['Overview', 'Bookings', 'Maintenance', 'Agreement', 'Documents']
const MODEL: Record<string, string> = { commission: 'We keep a percentage of each booking', percentage: 'We keep a percentage of each booking', fee: 'You pay us a fee', contract: 'As set out in your agreement' }
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }
const fd = (d?: string | null) => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const stat = (s: string) => ['resolved', 'closed', 'completed'].includes(s) ? ['Solved', '#E7F6EC', '#067647'] : s === 'in_progress' ? ['In progress', '#FFF4E0', '#B54708'] : ['Reported', '#EAF3FC', '#1D4E89']

function Inner() {
  const sp = useSearchParams(), id = sp.get('id')
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [tab, setTab] = useState('Overview')
  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const r = await fetch('/api/cohost-portal' + (id ? '?id=' + id : ''), { headers: { Authorization: `Bearer ${session.access_token}` } })
    const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'Could not load your portal.'); else setD(j)
  })() }, [id])
  if (err) return <div style={{ padding: 40, color: '#B42318' }}>{err}</div>
  if (!d) return <div style={{ padding: 40, color: MUTED }}>Loading…</div>
  const c = d.cohost, cur = c.currency || 'JMD', pn = (pid: string) => d.properties.find((p: any) => p.id === pid)?.name ?? ''
  const open = d.maintenance.filter((m: any) => !['resolved', 'closed', 'completed'].includes(m.status)).length
  return (
    <div style={{ background: '#F6F8FC', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: INK }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${LINE}`, padding: '16px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: A }}>{d.company.toUpperCase()}</div><div style={{ fontSize: 20, fontWeight: 700 }}>Welcome, {c.name}</div></div>
          {!d.preview && <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{ border: `1px solid ${LINE}`, background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>}
        </div>
        <div style={{ maxWidth: 900, margin: '12px auto 0', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ border: 'none', background: tab === t ? '#EAF3FC' : 'none', color: tab === t ? A : MUTED, fontWeight: 600, fontSize: 14, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t}{t === 'Maintenance' && open > 0 ? ` (${open})` : ''}</button>)}
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, display: 'grid', gap: 14 }}>
        {tab === 'Overview' && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
            <div style={card}><div style={{ fontSize: 12, color: MUTED }}>Properties we manage</div><div style={{ fontSize: 26, fontWeight: 700 }}>{d.properties.length}</div></div>
            <div style={card}><div style={{ fontSize: 12, color: MUTED }}>Bookings</div><div style={{ fontSize: 26, fontWeight: 700 }}>{d.totals.bookings}</div></div>
            <div style={card}><div style={{ fontSize: 12, color: MUTED }}>Booking revenue</div><div style={{ fontSize: 26, fontWeight: 700 }}>{money(d.totals.gross, cur)}</div></div>
            {d.totals.your_share != null && <div style={card}><div style={{ fontSize: 12, color: MUTED }}>Your share ({100 - Number(c.payment_value)}%)</div><div style={{ fontSize: 26, fontWeight: 700 }}>{money(d.totals.your_share, cur)}</div></div>}
          </div>
          <div style={card}><div style={{ fontWeight: 700, marginBottom: 8 }}>Your properties</div>
            {d.properties.length === 0 ? <div style={{ color: MUTED, fontSize: 14 }}>Your properties will show here once we have added them.</div> : d.properties.map((p: any) => <div key={p.id} style={{ padding: '9px 0', borderTop: `1px solid ${LINE}`, fontSize: 14 }}><b>{p.name}</b> <span style={{ color: MUTED }}>{[p.address, p.city].filter(Boolean).join(', ')}</span></div>)}
          </div>
        </>}
        {tab === 'Bookings' && <div style={card}>{d.bookings.length === 0 ? <div style={{ color: MUTED }}>No bookings yet.</div> : d.bookings.map((b: any) => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: `1px solid ${LINE}`, fontSize: 14, flexWrap: 'wrap' }}><span><b>{b.guest_name || 'Guest'}</b> <span style={{ color: MUTED }}>· {pn(b.property_id)} · {fd(b.check_in)} to {fd(b.check_out)}{b.platform ? ` · ${b.platform}` : ''}</span></span><b>{money(Number(b.total_amount) || 0, cur)}</b></div>)}</div>}
        {tab === 'Maintenance' && <div style={card}>{d.maintenance.length === 0 ? <div style={{ color: MUTED }}>Nothing reported. When an issue is reported at one of your properties you can follow it here from Reported to Solved.</div> : d.maintenance.map((m: any) => { const s = stat(m.status); return <div key={m.id} style={{ padding: '10px 0', borderTop: `1px solid ${LINE}` }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 14 }}>{m.title || m.description}</b><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: s[1], color: s[2] }}>{s[0]}</span></div><div style={{ fontSize: 12.5, color: MUTED }}>{pn(m.property_id)} · reported {fd(m.created_at)}{m.resolved_at ? ` · solved ${fd(m.resolved_at)}` : ''}</div>{m.resolution_notes && <div style={{ fontSize: 13, marginTop: 4 }}>{m.resolution_notes}</div>}</div> })}</div>}
        {tab === 'Agreement' && <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>How we are paid</div>
          <div style={{ fontSize: 14 }}>{MODEL[c.payment_model] || MODEL.contract}{c.payment_value != null && c.payment_model !== 'contract' ? ` (${c.payment_model === 'fee' ? money(Number(c.payment_value), cur) : c.payment_value + '%'})` : ''}</div>
          {c.payment_note && <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{c.payment_note}</div>}
          {(c.agreement_start || c.agreement_end) && <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Agreement {c.agreement_start ? 'from ' + fd(c.agreement_start) : ''}{c.agreement_end ? ' to ' + fd(c.agreement_end) : ''}</div>}
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Your signed co-hosting agreement is in Documents.</div>
        </div>}
        {tab === 'Documents' && <PortalDocuments kind="cohost" id={id ?? undefined} />}
      </div>
    </div>
  )
}
export default function CohostPortal() { return <Suspense fallback={null}><Inner /></Suspense> }
