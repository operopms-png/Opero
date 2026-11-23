'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// The Maintenance tab body for tenants, landlords and partners: every repair at their home(s) with its stages, the fix notes
// and, for partners, the invoices. Read only. Data comes from /api/maintenance-portal, which decides what each person may see.
type Inv = { id: string; file_url: string; file_name: string | null; amount: number | null; currency: string | null; note: string | null; created_at: string }
type Issue = {
  key: string; property_name: string; title: string; description: string | null; priority: string | null; status: 'open' | 'in_progress' | 'resolved'
  created_at: string; in_progress_at: string | null; resolved_at: string | null; resolution_notes: string | null; cost: number | null; currency: string | null
  photos: string[]; before_media: string | null; after_media: string | null; invoices: Inv[]
}
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: 'US$', EUR: '€', CAD: 'CA$', AED: 'AED ' }
const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
const money = (n: number, c?: string | null) => `${SYM[c ?? ''] ?? '£'}${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const BADGE = { open: { t: 'Reported', bg: '#DBEAFE', c: '#2563EB' }, in_progress: { t: 'In progress', bg: '#FEF3C7', c: '#B45309' }, resolved: { t: 'Fixed', bg: '#D1FAE5', c: '#047857' } }

export default function MaintenanceFeed({ role, target, refreshKey }: { role: 'tenant' | 'landlord' | 'partner'; target?: string; refreshKey?: number }) {
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [err, setErr] = useState('')
  const [notices, setNotices] = useState<{ id: string; title: string; body: string; building_name: string | null; created_at: string }[]>([])
  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const q = new URLSearchParams({ role }); if (target) q.set('target', target)
      const r = await fetch('/api/maintenance-portal?' + q, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const j = await r.json().catch(() => ({}))
      if (!live) return
      if (!r.ok) { setErr(j.error || 'Could not load maintenance'); return }
      setIssues(j.issues ?? [])
      // Building notices from staff (gate works, lift out of order…) for these homes.
      fetch('/api/building-notices-portal?' + q, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } }).then(x => x.json()).then(x => { if (live) setNotices(x.notices ?? []) }).catch(() => {})
    })()
    return () => { live = false }
  }, [role, target, refreshKey])

  if (err) return <div style={{ color: '#B42318', fontSize: 13 }}>{err}</div>
  if (!issues) return <div style={{ color: '#98A2B3', fontSize: 13, padding: 24 }}>Loading…</div>

  // The most recent change in the last 7 days, as a notice at the top.
  const stamp = (i: Issue) => i.resolved_at || i.in_progress_at || i.created_at
  const latest = [...issues].sort((a, b) => stamp(b).localeCompare(stamp(a)))[0]
  const fresh = latest && Date.now() - new Date(stamp(latest)).getTime() < 7 * 864e5 ? latest : null
  const notice = fresh && (fresh.status === 'resolved' ? `${fresh.title} has been fixed.` : fresh.status === 'in_progress' ? `${fresh.title} is now in progress.` : `${fresh.title} has been reported.`)
  const byProp = issues.reduce<Record<string, Issue[]>>((a, i) => { (a[i.property_name] ??= []).push(i); return a }, {})
  const showMoney = role !== 'tenant'

  return (
    <div>
      {notices.map(n => (
        <div key={n.id} style={{ background: '#FFF8E6', border: '1px solid #F5DFA0', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92600A', letterSpacing: 0.4, textTransform: 'uppercase' }}>Notice{n.building_name ? ` · ${n.building_name}` : ''} · {day(n.created_at)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#323338', marginTop: 4 }}>{n.title}</div>
          <div style={{ fontSize: 13, color: '#475467', marginTop: 4, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{n.body}</div>
        </div>
      ))}
      {fresh && <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#EAF1FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1B2F6E' }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#2563EB', marginTop: 5, flex: '0 0 8px' }} /><div><b>{role === 'tenant' ? 'Update on your repair' : 'Latest maintenance update'}</b>: {notice}</div></div>}
      {!issues.length && <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>{role === 'partner' ? 'No maintenance issues reported since you were linked to your properties.' : 'No maintenance requests yet'}</div>}
      {Object.entries(byProp).map(([prop, list]) => (
        <div key={prop} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#323338', marginBottom: 8 }}>{prop}</div>
          {list.map(m => {
            const b = BADGE[m.status], step = m.status === 'resolved' ? 3 : m.status === 'in_progress' ? 2 : 1
            const dates = [m.created_at, m.in_progress_at, m.resolved_at]
            return (
              <div key={m.key} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div><div style={{ fontWeight: 600, fontSize: 13.5, color: '#323338' }}>{m.title}</div><div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 2 }}>Reported {day(m.created_at)}{m.priority ? ` · ${m.priority} priority` : ''}</div></div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: b.bg, color: b.c, whiteSpace: 'nowrap' }}>{b.t}</span>
                </div>
                {m.description && <div style={{ fontSize: 12.5, color: '#667085', marginTop: 8, lineHeight: 1.5 }}>{m.description}</div>}
                <div style={{ display: 'flex', marginTop: 14 }}>
                  {['Reported', 'In progress', 'Fixed'].map((s, k) => (
                    <div key={s} style={{ flex: 1, position: 'relative', paddingTop: 14, fontSize: 11, color: '#667085' }}>
                      <div style={{ position: 'absolute', top: 3, left: 0, right: 0, height: 3, background: k < step ? '#1B2F6E' : '#E4E7EC' }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 9, height: 9, borderRadius: 5, background: k < step ? '#1B2F6E' : '#E4E7EC' }} />
                      {s}{k < step && dates[k] ? <><br />{day(dates[k])}</> : null}
                    </div>
                  ))}
                </div>
                {m.status === 'resolved' && (m.resolution_notes || (showMoney && m.cost != null)) && (
                  <div style={{ marginTop: 12, background: '#ECFDF3', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.55, color: '#323338' }}>
                    <b style={{ color: '#047857' }}>Fixed{m.resolved_at ? ' ' + day(m.resolved_at) : ''}.</b> {m.resolution_notes}{showMoney && m.cost != null ? ` Cost: ${money(m.cost, m.currency)}.` : ''}
                  </div>
                )}
                {m.status === 'resolved' && (m.before_media || m.after_media) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {m.before_media && <a href={m.before_media} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1B2F6E' }}>Before photo</a>}
                    {m.after_media && <a href={m.after_media} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1B2F6E' }}>After photo</a>}
                  </div>
                )}
                {m.invoices.map(i => (
                  <a key={i.id} href={i.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, border: '1px solid #E4E7EC', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#323338', textDecoration: 'none' }}>
                    <span>Invoice{i.note ? `: ${i.note}` : i.file_name ? `: ${i.file_name}` : ''} · {day(i.created_at)}</span><b>{i.amount != null ? money(i.amount, i.currency || m.currency) + ' · ' : ''}View</b>
                  </a>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
