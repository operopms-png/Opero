'use client'
import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell as RCell } from 'recharts'
import { BRAND } from '@/lib/crm-board'
import { BOARDS, MODULES, boardByKey, money, fmtDate } from '@/lib/marketing-boards'
import type { Mk } from './useMarketing'

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${BRAND.rowBorder}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
const head: React.CSSProperties = { padding: '14px 20px', fontSize: 16, fontWeight: 500, borderBottom: `1px solid ${BRAND.rowBorder}` }
const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0

export default function MkDashboard({ mk, onOpen }: { mk: Mk; onOpen: (board: string, id: string) => void }) {
  const [mod, setMod] = useState<string>('all')
  const f = (list: any[]) => mod === 'all' ? list : list.filter(r => r.module === mod)
  const campaigns = f(mk.rows.campaigns), emails = f(mk.rows.emails), social = f(mk.rows.social), ads = f(mk.rows.ads)
  const sent = emails.filter(e => e.status === 'Sent')
  const st = sent.map(e => mk.stats[e.id]).filter(Boolean)
  const delivered = st.filter(s => s.delivered).length
  const opened = st.filter(s => s.opened > 0).length
  const clicked = st.filter(s => s.clicked > 0).length
  const replied = st.filter(s => s.replies > 0).length
  const bounced = st.filter(s => s.bounced).length
  const spend = ads.reduce((a, r) => a + (Number(r.budget) || 0), 0)
  const clicks = ads.reduce((a, r) => a + (Number(r.clicks) || 0), 0)
  const impressions = ads.reduce((a, r) => a + (Number(r.impressions) || 0), 0)

  const tiles = [
    { l: 'Active campaigns', v: campaigns.filter(c => c.status === 'Active').length, hl: true },
    { l: 'Emails sent', v: sent.length },
    { l: 'Open rate', v: pct(opened, delivered || sent.length) + '%' },
    { l: 'Posts scheduled', v: social.filter(s => s.status === 'Scheduled').length },
    { l: 'Live ads', v: ads.filter(a => a.status === 'Active').length },
    { l: 'Ad budget', v: money(spend) || '£0' },
  ]

  // activity by month (last 6 months), counted by created date
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d })
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
  const monthly = months.map(m => {
    const k = key(m)
    const c = (list: any[]) => list.filter(r => { const d = new Date(r.created_at); return key(d) === k }).length
    return { m: m.toLocaleDateString('en-GB', { month: 'short' }), Campaigns: c(campaigns), Emails: c(emails), Posts: c(social), Ads: c(ads) }
  })

  const statusData = (boardKey: 'campaigns' | 'ads' | 'social', list: any[]) => (boardByKey(boardKey)!.cols.find(c => c.key === 'status')!.options ?? []).map(o => ({ name: o.value, n: list.filter(r => r.status === o.value).length, color: o.color }))
  const platform = (boardKey: 'ads' | 'social', list: any[], val: (r: any) => number) => (boardByKey(boardKey)!.cols.find(c => c.key === 'platform')!.options ?? []).map(o => ({ name: o.value, v: list.filter(r => r.platform === o.value).reduce((a, r) => a + val(r), 0), color: o.color })).filter(x => x.v > 0)

  const devices: Record<string, { Opened: number; Clicked: number }> = {}
  for (const ev of mk.events) {
    if (!ev.device_type || !(ev.type === 'opened' || ev.type === 'clicked')) continue
    if (!emails.some(e => e.id === ev.marketing_email_id)) continue
    devices[ev.device_type] ??= { Opened: 0, Clicked: 0 }
    devices[ev.device_type][ev.type === 'opened' ? 'Opened' : 'Clicked']++
  }

  const upcoming = [
    ...campaigns.filter(c => c.start_date).map(c => ({ b: 'campaigns', id: c.id, name: c.name, d: c.start_date, what: 'Campaign starts' })),
    ...emails.filter(e => e.status !== 'Sent' && e.scheduled_at).map(e => ({ b: 'emails', id: e.id, name: e.subject, d: e.scheduled_at, what: 'Email due' })),
    ...social.filter(s => s.status !== 'Published' && s.scheduled_at).map(s => ({ b: 'social', id: s.id, name: s.caption, d: s.scheduled_at, what: 'Post scheduled' })),
    ...ads.filter(a => a.start_date).map(a => ({ b: 'ads', id: a.id, name: a.name, d: a.start_date, what: 'Ad starts' })),
  ].filter(x => new Date(x.d).getTime() >= Date.now() - 86400000).sort((a, b) => new Date(a.d).getTime() - new Date(b.d).getTime()).slice(0, 8)

  const empty = (t: string) => <div style={{ padding: 30, textAlign: 'center', color: BRAND.muted, fontSize: 13.5 }}>{t}</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {[{ value: 'all', label: 'All modules' }, ...MODULES].map(m => (
          <button key={m.value} onClick={() => setMod(m.value)} style={{ height: 30, padding: '0 12px', borderRadius: 15, border: mod === m.value ? `1px solid ${BRAND.goldDark}` : `1px solid ${BRAND.border}`, background: mod === m.value ? BRAND.selected : '#fff', color: mod === m.value ? BRAND.brown : BRAND.ink, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: mod === m.value ? 600 : 400 }}>{m.label}</button>
        ))}
      </div>
      <div className="mk-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
        {tiles.map(t => (
          <div key={t.l} style={{ ...card, padding: 16, background: t.hl ? 'linear-gradient(135deg,#FBF4E6,#F3E6C8)' : '#fff', borderColor: t.hl ? '#EADBB8' : BRAND.rowBorder }}>
            <div style={{ fontSize: 12.5, color: t.hl ? '#8A6B2E' : BRAND.muted }}>{t.l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: t.hl ? BRAND.brown : BRAND.ink }}>{t.v}</div>
          </div>
        ))}
      </div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={head}>Activity by month</div>
          <div style={{ height: 260, padding: '12px 12px 4px' }}>
            <ResponsiveContainer><BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} /><XAxis dataKey="m" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Campaigns" stackId="a" fill="#A8862E" /><Bar dataKey="Emails" stackId="a" fill="#D0AE4C" /><Bar dataKey="Posts" stackId="a" fill="#E8D29A" /><Bar dataKey="Ads" stackId="a" fill="#624920" radius={[3, 3, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </div>
        <div style={card}>
          <div style={head}>Email engagement</div>
          {sent.length === 0 ? empty('No emails sent yet.') : (
            <div style={{ padding: '14px 20px' }}>
              {[['Sent', sent.length], ['Delivered', delivered], ['Opened', opened], ['Clicked', clicked], ['Replied', replied], ['Bounced', bounced]].map(([l, n]) => (
                <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 0', fontSize: 13.5 }}>
                  <span style={{ width: 76 }}>{l}</span>
                  <div style={{ flex: 1, background: '#F1F2F6', borderRadius: 4, height: 12, overflow: 'hidden' }}><div style={{ width: `${pct(n as number, sent.length)}%`, height: '100%', background: l === 'Bounced' ? '#DF2F4A' : '#D0AE4C' }} /></div>
                  <span style={{ width: 70, textAlign: 'right', color: BRAND.muted }}>{n} · {pct(n as number, sent.length)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
        {([['Campaigns by status', statusData('campaigns', campaigns)], ['Ads by status', statusData('ads', ads)], ['Posts by status', statusData('social', social)]] as const).map(([t, data]) => (
          <div key={t} style={card}>
            <div style={head}>{t}</div>
            {data.every(d => !d.n) ? empty('Nothing yet.') : (
              <div style={{ height: 200, padding: '12px 12px 4px' }}>
                <ResponsiveContainer><BarChart data={data}>
                  <XAxis dataKey="name" tick={{ fontSize: 11.5 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={24} /><Tooltip />
                  <Bar dataKey="n" name="Count" radius={[3, 3, 0, 0]}>{data.map(d => <RCell key={d.name} fill={d.color} />)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={head}>Ad budget by platform</div>
          {(() => { const d = platform('ads', ads, r => Number(r.budget) || 0); return !d.length ? empty('No ad budgets yet.') : (
            <div style={{ padding: '10px 20px' }}>
              {d.map(x => <div key={x.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BRAND.rowBorder}`, fontSize: 13.5 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: x.color }} />{x.name}</span><b>{money(x.v)}</b></div>)}
              <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 10 }}>{clicks.toLocaleString('en-GB')} clicks · {impressions.toLocaleString('en-GB')} impressions · CTR {impressions ? ((clicks / impressions) * 100).toFixed(1) : 0}%</div>
            </div>) })()}
        </div>
        <div style={card}>
          <div style={head}>Posts by platform</div>
          {(() => { const d = platform('social', social, () => 1); return !d.length ? empty('No posts yet.') : (
            <div style={{ padding: '10px 20px' }}>
              {d.map(x => <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', fontSize: 13.5 }}><span style={{ width: 80 }}>{x.name}</span><div style={{ flex: 1, background: '#F1F2F6', borderRadius: 4, height: 10 }}><div style={{ width: `${pct(x.v, social.length)}%`, height: '100%', background: x.color, borderRadius: 4 }} /></div><span style={{ width: 20, textAlign: 'right' }}>{x.v}</span></div>)}
            </div>) })()}
        </div>
        <div style={card}>
          <div style={head}>Email opens by device</div>
          {!Object.keys(devices).length ? empty('No device data yet.') : (
            <div style={{ height: 200, padding: '12px 12px 4px' }}>
              <ResponsiveContainer><BarChart data={Object.entries(devices).map(([name, v]) => ({ name, ...v }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={24} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Opened" fill="#D0AE4C" radius={[3, 3, 0, 0]} /><Bar dataKey="Clicked" fill="#00C875" radius={[3, 3, 0, 0]} />
              </BarChart></ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="crm-dash-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={card}>
          <div style={head}>Coming up</div>
          {!upcoming.length ? empty('Nothing scheduled — add dates to campaigns, emails, posts or ads.') : upcoming.map(u => (
            <div key={u.b + u.id} onClick={() => onOpen(u.b, u.id)} className="crm-nav" style={{ display: 'flex', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${BRAND.rowBorder}`, cursor: 'pointer', fontSize: 13.5 }}>
              <span style={{ width: 100, flexShrink: 0, color: BRAND.muted }}>{fmtDate(u.d)}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
              <span style={{ color: BRAND.muted, fontSize: 12.5 }}>{u.what}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={head}>By module</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead><tr style={{ color: BRAND.muted }}>{['Module', ...BOARDS.filter(b => b.key !== 'templates').map(b => b.title)].map(h => <th key={h} style={{ textAlign: h === 'Module' ? 'left' : 'center', fontWeight: 500, padding: '10px 14px', borderBottom: `1px solid ${BRAND.rowBorder}` }}>{h}</th>)}</tr></thead>
            <tbody>{MODULES.map(m => (
              <tr key={m.value}><td style={{ padding: '10px 14px', borderBottom: `1px solid ${BRAND.rowBorder}` }}>{m.label}</td>
                {BOARDS.filter(b => b.key !== 'templates').map(b => <td key={b.key} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: `1px solid ${BRAND.rowBorder}` }}>{mk.rows[b.key].filter(r => r.module === m.value).length}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
