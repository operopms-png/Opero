'use client'
// Human Intelligence Hub → Team → Work Hours: when each person signed in, how long they were on the portal,
// when they signed out and which pages they used. Admins only.
import React, { useEffect, useMemo, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const hm = (d: string | null) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const dur = (s: number) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m` }
const PAGE: [string, string][] = [['/staff-centre/crm', 'CRM'], ['/staff-centre/email', 'Email'], ['/staff-centre/applications', 'Applications'], ['/staff-centre/oversight', 'Dashboard'], ['/staff-centre/marketing', 'Marketing'], ['/staff-centre/maintenance', 'Maintenance'], ['/staff-centre/hr', 'People & HR'], ['/staff-centre/inbox', 'Inbox'], ['/staff-centre/finance', 'Finance'], ['/staff-centre/tasks', 'Tasks'], ['/staff-centre/landlord-leads', 'Landlord Leads'], ['/staff-centre/listings', 'Listings'], ['/pm', 'Property Management'], ['/settings', 'Settings']]
const pageName = (p: string) => PAGE.find(([k]) => p === k || p.startsWith(k + '/') || p.startsWith(k + '?'))?.[1] ?? (p.replace(/^\/(staff-centre\/)?/, '').split('?')[0].replace(/[-/]/g, ' ') || 'Home')

export default function WorkHours() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 6 * 864e5)))
  const [to, setTo] = useState(iso(new Date()))
  const [who, setWho] = useState('all')
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = () => { setRows(null); setErr(''); staffApi(`/api/work-sessions?from=${from}&to=${to}`).then((d: any) => setRows(d.sessions ?? [])).catch(e => { setErr(e.message); setRows([]) }) }
  useEffect(load, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t) }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const people = useMemo(() => Array.from(new Set((rows ?? []).map(r => r.email))).sort(), [rows])
  const shown = useMemo(() => (rows ?? []).filter(r => who === 'all' || r.email === who), [rows, who])
  const totals = useMemo(() => {
    const m: Record<string, { name: string; secs: number; n: number }> = {}
    for (const r of shown) { const t = (m[r.email] ??= { name: r.name || r.email, secs: 0, n: 0 }); t.secs += r.seconds; t.n++ }
    return Object.entries(m).sort((a, b) => b[1].secs - a[1].secs)
  }, [shown])
  const field: React.CSSProperties = { padding: '7px 11px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', background: '#fff' }
  const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 12.5, color: C.muted, fontWeight: 600, borderBottom: '1px solid ' + C.row, background: '#FAFAFB' }
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13.5, borderBottom: '1px solid ' + C.row }

  const csv = () => {
    const lines = [['Person', 'Email', 'Date', 'Signed in', 'Signed out', 'Time on portal', 'Active time'].join(',')]
    for (const r of shown) lines.push([r.name || '', r.email, new Date(r.started_at).toLocaleDateString('en-GB'), hm(r.started_at), r.live ? 'Still signed in' : hm(r.signed_out), dur(r.seconds), dur(r.active_seconds)].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = `work-hours-${from}-to-${to}.csv`; a.click()
  }

  return (
    <CrmPage>
      <CrmHeader title="Work Hours" subtitle="When each person signed in, how long they were on the portal and when they signed out." />
      <Body>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: C.muted }}>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={field} /></label>
          <label style={{ fontSize: 13, color: C.muted }}>To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={field} /></label>
          <select value={who} onChange={e => setWho(e.target.value)} style={field}><option value="all">Everyone</option>{people.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <button onClick={csv} disabled={!shown.length} style={{ ...field, cursor: 'pointer', marginLeft: 'auto' }}>Download for payroll (CSV)</button>
        </div>
        {rows === null ? <Loading /> : err ? <Empty>{err}</Empty> : !shown.length ? <Empty>No sign-ins recorded for these dates yet. Time starts being recorded from now, when someone signs in.</Empty> : <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {totals.map(([e, t]) => <div key={e} style={{ border: '1px solid ' + C.row, borderRadius: 8, padding: '10px 14px', background: '#fff', minWidth: 170 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0B1F3A' }}>{dur(t.secs)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.n} sign-in{t.n === 1 ? '' : 's'}</div></div>)}
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid ' + C.row, borderRadius: 8, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr>{['Person', 'Date', 'Signed in', 'Signed out', 'Time on portal', 'Active', 'Pages'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{shown.map(r => {
                const pages: { p: string; t: string }[] = r.pages ?? []
                return (
                  <React.Fragment key={r.id}>
                    <tr onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td style={td}><b style={{ fontWeight: 600 }}>{r.name || r.email}</b><div style={{ fontSize: 12, color: C.muted }}>{r.email}</div></td>
                      <td style={td}>{day(r.started_at)}</td>
                      <td style={td}>{hm(r.started_at)}</td>
                      <td style={td}>{r.live ? <span style={{ color: '#037F4C', fontWeight: 600 }}>Signed in now</span> : <>{hm(r.signed_out)}<div style={{ fontSize: 11.5, color: C.muted }}>{r.end_reason ?? ''}</div></>}</td>
                      <td style={td}>{dur(r.seconds)}</td>
                      <td style={td}>{dur(r.active_seconds)}</td>
                      <td style={td}>{pages.length} {open === r.id ? '▾' : '▸'}</td>
                    </tr>
                    {open === r.id && <tr><td colSpan={7} style={{ ...td, background: '#FAFAFB' }}>
                      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 6 }}>Pages opened, in order</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '4px 18px' }}>
                        {pages.map((x, i) => <div key={i} style={{ fontSize: 13 }}><span style={{ color: C.muted }}>{hm(x.t)}</span>  {pageName(x.p)}</div>)}
                      </div></td></tr>}
                  </React.Fragment>
                )
              })}</tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Time on portal runs from sign-in to sign-out. If someone just closes the tab or goes quiet for 15 minutes, it ends at the last time they were seen. Active counts only time the portal was open and in view.</div>
        </>}
      </Body>
    </CrmPage>
  )
}
