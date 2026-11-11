'use client'
// Settings -> Currency: the symbol shown on money across Real Estate Intelligence. Amounts are shown as entered.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { CURRENCIES, setCur } from '@/lib/company-currency'
import { TIMEZONES, DEFAULT_TZ } from '@/lib/company-tz'

export default function CurrencyPanel() {
  const [symbol, setSymbol] = useState('£')
  const [tz, setTz] = useState(DEFAULT_TZ)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ symbol: string; timezone?: string }>('/api/company-currency').then(d => { setSymbol(d.symbol); if (d.timezone) setTz(d.timezone) }).catch(() => {}) }, [])
  async function save() {
    setErr(''); setMsg('')
    try { await staffApi('/api/company-currency', { symbol, timezone: tz }); setCur(symbol); setMsg('Saved. Money shows this symbol and overdue dates follow this time zone.') }
    catch (e: any) { setErr(e.message) }
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, maxWidth: 560 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Currency</h2>
      <p style={{ fontSize: 13, color: '#667085', margin: '0 0 16px' }}>Choose the symbol shown on rent, income and costs across Real Estate Intelligence. Amounts are shown exactly as you enter them, so this only changes the symbol. It does not convert anything. Each property can still be set to its own currency.</p>
      <select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        {CURRENCIES.map(c => <option key={c.code} value={c.symbol}>{c.label}</option>)}
      </select>
      <label style={{ fontSize: 13, color: '#667085', display: 'block', margin: '4px 0 6px' }}>Time zone (decides what today is for overdue dates, due dates and the dashboard)</label>
      <select value={tz} onChange={e => setTz(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        {TIMEZONES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
      </select>
      <button onClick={save} style={{ background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
      {msg && <div style={{ fontSize: 13, color: '#067647', marginTop: 10 }}>{msg}</div>}
      {err && <div style={{ fontSize: 13, color: '#B42318', marginTop: 10 }}>{err}</div>}
    </div>
  )
}
