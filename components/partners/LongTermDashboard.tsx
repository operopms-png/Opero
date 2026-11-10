'use client'
// The Long term side of a partner's dashboard: rent collected, on-time rate, rent due against collected, tenancies.
import { money } from '../../lib/partner-schedule'

const INK = '#323338', MUTE = '#667085', LINE = '#E6E9EF', ACCENT = '#89CFF0', DEEP = '#2F6DB5', OK = '#067647'
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: 20 }
const mLabel = (k: string) => new Date(k + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
const day = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export type LongTerm = { split: number; properties: { id: string; name: string; address: string | null; currency: string; status: string | null; rent: number; tenant: string | null; lease_end: string | null }[]; months: { month: string; due: number; collected: number; late: number }[]; maintenance: any[] }

export default function LongTermDashboard({ data }: { data: LongTerm | null }) {
  if (!data) return <div style={{ ...card, fontSize: 13, color: '#98A2B3' }}>Loading…</div>
  if (!data.properties.length) return <div style={card}><div style={{ fontWeight: 700, marginBottom: 4 }}>No long-term properties yet</div><div style={{ fontSize: 13, color: MUTE }}>When we place you in a long-term let, its rent, tenancy and repairs will appear here.</div></div>
  const cur = data.properties[0].currency
  const m = data.months, now = m[m.length - 1]
  const due = m.reduce((s, x) => s + x.due, 0), col = m.reduce((s, x) => s + x.collected, 0), late = m.reduce((s, x) => s + x.late, 0)
  const onTime = due > 0 ? Math.round(((col - late) / due) * 100) : null
  const rentRoll = data.properties.reduce((s, p) => s + p.rent, 0)
  const open = data.maintenance.filter(t => !['resolved', 'completed', 'closed', 'done'].includes(String(t.status).toLowerCase())).length
  const W = 300, H = 120, top = Math.max(1, ...m.map(x => Math.max(x.due, x.collected)))
  const tile = (l: string, v: string, s?: string, dark?: boolean) => (
    <div style={{ background: dark ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', border: `1px solid ${dark ? '#EADBB8' : LINE}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12.5, color: dark ? '#89CFF0' : MUTE, marginBottom: 6 }}>{l}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: dark ? '#89CFF0' : INK }}>{v}</div>
      {s && <div style={{ fontSize: 12, color: dark ? '#89CFF0' : MUTE, marginTop: 2 }}>{s}</div>}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {tile('Monthly rent roll', money(rentRoll, cur), `${data.properties.length} propert${data.properties.length === 1 ? 'y' : 'ies'}`)}
        {tile('Collected this month', money(now?.collected ?? 0, cur), now ? `of ${money(now.due, cur)} due` : 'No rent due yet', true)}
        {tile('Paid on time, 6 months', onTime == null ? '-' : `${onTime}%`, onTime == null ? 'No payments yet' : `${money(col, cur)} collected`)}
        {tile('Open repairs', String(open), open ? 'Being handled by our team' : 'Nothing outstanding')}
      </div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Rent due and collected</div>
        {m.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No rent records in the last 6 months.</div> : (
          <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label="Rent due against rent collected, by month">
            {m.map((x, i) => {
              const bw = Math.min(28, (W - 20) / m.length - 10), gx = 10 + i * ((W - 20) / m.length) + ((W - 20) / m.length - bw) / 2
              return <g key={x.month}>
                <rect x={gx} y={H - (x.due / top) * H} width={bw} height={(x.due / top) * H} rx={3} fill="#E4E7EC" />
                <rect x={gx} y={H - (x.collected / top) * H} width={bw} height={(x.collected / top) * H} rx={3} fill={DEEP} opacity={0.85} />
                <text x={gx + bw / 2} y={H + 13} textAnchor="middle" fontSize="9" fill={MUTE}>{mLabel(x.month)}</text>
              </g>
            })}
          </svg>
        )}
        <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}><span style={{ color: DEEP, fontWeight: 600 }}>Collected</span> · Due</div>
      </div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Your long-term properties</div>
        {data.properties.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: MUTE }}>{p.tenant ? `${p.tenant}${p.lease_end ? ` · lease ends ${day(p.lease_end)}` : ''}` : 'No tenant on record'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{money(p.rent, p.currency)}<span style={{ fontWeight: 400, fontSize: 12, color: MUTE }}> / month</span></div>
              <div style={{ fontSize: 12, color: p.tenant ? OK : MUTE }}>{p.tenant ? 'Let' : p.status || 'Vacant'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
