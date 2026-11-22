'use client'
// Estate Agency reports for the sales side: sales results, lead conversion and agent performance.
// Everything is worked out from the Buyers, Offers, Sales Progression and Commissions records.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'

const ACCENT = '#2F6DB5'
const PERIODS: [string, number | null][] = [['All time', null], ['Last 12 months', 365], ['Last 90 days', 90], ['Last 30 days', 30]]
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }

export default function SalesReportsSection({ properties }: { properties: any[] }) {
  const [d, setD] = useState<any>(null)
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const uid = await getAccountId(user)
      const [sales, offers, contacts, comms] = await Promise.all([
        supabase.from('estate_sales').select('*').eq('user_id', uid),
        supabase.from('estate_offers').select('*').eq('user_id', uid),
        supabase.from('estate_contacts').select('*').eq('user_id', uid),
        supabase.from('estate_commissions').select('*').eq('user_id', uid),
      ])
      setD({ sales: sales.data ?? [], offers: offers.data ?? [], contacts: contacts.data ?? [], comms: comms.data ?? [] })
    })()
  }, [])

  if (!d) return <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : ''
  const inRange = (r: any) => !since || (r.created_at ?? '') >= since
  const sales = d.sales.filter(inRange), offers = d.offers.filter(inRange), buyers = d.contacts.filter((c: any) => c.kind === 'buyer' && inRange(c)), comms = d.comms.filter(inRange)
  const cur = (pid: string) => properties.find(p => p.id === pid)?.currency || 'JMD'
  const sym = (c: string) => (CURRENCIES[c] ?? CURRENCIES.JMD).symbol
  // money is never added across currencies: one total per currency
  const byCur = (rows: any[], pidKey: string, val: (r: any) => number) => {
    const m: Record<string, number> = {}
    rows.forEach(r => { const c = cur(r[pidKey]); m[c] = (m[c] || 0) + val(r) })
    return Object.entries(m).map(([c, v]) => `${sym(c)}${Math.round(v).toLocaleString()}`).join(' + ') || '—'
  }
  const completed = sales.filter((s: any) => s.status === 'Completed')
  const fell = sales.filter((s: any) => s.status === 'Fell through').length
  const active = sales.filter((s: any) => !['Completed', 'Fell through'].includes(s.status))
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '—')
  const accepted = offers.filter((o: any) => o.status === 'Accepted').length
  const withOffer = new Set(offers.map((o: any) => o.contact_id).filter(Boolean)).size
  const funnel: [string, number][] = [
    ['Buyers', buyers.length],
    ['Reached viewing or later', buyers.filter((b: any) => ['Viewing', 'Offer made', 'Closed'].includes(b.status)).length],
    ['Made an offer', Math.max(withOffer, buyers.filter((b: any) => ['Offer made', 'Closed'].includes(b.status)).length)],
    ['Sales agreed', sales.length],
    ['Completed', completed.length],
  ]
  const max = Math.max(1, ...funnel.map(f => f[1]))
  const agents: Record<string, { n: number; due: number; paid: number }> = {}
  comms.filter((c: any) => c.kind === 'Staff commission' && c.agent_name).forEach((c: any) => {
    const a = (agents[c.agent_name] ||= { n: 0, due: 0, paid: 0 })
    a.n++; if (c.status === 'Paid') a.paid += Number(c.amount); else a.due += Number(c.amount)
  })
  const earned = (kinds: string[]) => comms.filter((c: any) => kinds.includes(c.kind) && c.status === 'Paid')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14 }}>
        {PERIODS.map(([l, v]) => (
          <button key={l} onClick={() => setDays(v)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: days === v ? '1px solid ' + ACCENT : '1px solid #E4E7EC', background: days === v ? '#DCE9F8' : '#F7F8FA', color: days === v ? '#1D4E89' : '#344054' }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Sales in progress', String(active.length)],
          ['Completed sales', String(completed.length)],
          ['Completed value', byCur(completed, 'property_id', (s: any) => Number(s.agreed_price || 0))],
          ['Fell through', String(fell)],
          ['Offers accepted', pct(accepted, offers.length)],
          ['Commission paid', byCur(earned(['Sales commission', 'Agency fee', 'Lettings fee']), 'property_id', (c: any) => Number(c.amount || 0))],
        ].map(([l, v]) => (
          <div key={l} style={card}><div style={{ fontSize: 11, color: '#667085', letterSpacing: '.4px', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={h}>Lead conversion</div>
        {funnel.map(([l, n], i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
            <div style={{ width: 170, fontSize: 13, color: '#344054' }}>{l}</div>
            <div style={{ flex: 1, background: '#F2F4F7', borderRadius: 4, height: 18 }}><div style={{ width: (n / max) * 100 + '%', background: ACCENT, height: 18, borderRadius: 4, minWidth: n ? 4 : 0 }} /></div>
            <div style={{ width: 90, fontSize: 13, textAlign: 'right' }}>{n}{i > 0 && funnel[0][1] ? ` · ${pct(n, funnel[0][1])}` : ''}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={h}>Agent performance</div>
        {Object.keys(agents).length === 0
          ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No staff commission recorded yet. Add entries of type Staff commission with the agent's name in Finance, Commissions.</div>
          : <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: '#667085' }}><th style={{ padding: '4px 0' }}>Agent</th><th>Entries</th><th>Due</th><th>Paid</th></tr></thead>
            <tbody>{Object.entries(agents).map(([n, a]) => (
              <tr key={n} style={{ borderTop: '1px solid #F2F4F7' }}><td style={{ padding: '6px 0', fontWeight: 600 }}>{n}</td><td>{a.n}</td><td>{Math.round(a.due).toLocaleString()}</td><td>{Math.round(a.paid).toLocaleString()}</td></tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  )
}
