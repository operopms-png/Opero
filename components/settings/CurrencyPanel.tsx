'use client'
// Settings -> Currency: the symbol shown on money across Real Estate Intelligence. Amounts are shown as entered.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { CURRENCIES, setCur } from '@/lib/company-currency'

export default function CurrencyPanel() {
  const [symbol, setSymbol] = useState('£')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ symbol: string }>('/api/company-currency').then(d => setSymbol(d.symbol)).catch(() => {}) }, [])
  async function save() {
    setErr(''); setMsg('')
    try { await staffApi('/api/company-currency', { symbol }); setCur(symbol); setMsg('Saved. Money across Real Estate Intelligence now shows this symbol.') }
    catch (e: any) { setErr(e.message) }
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, maxWidth: 560 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Currency</h2>
      <p style={{ fontSize: 13, color: '#667085', margin: '0 0 16px' }}>Choose the symbol shown on rent, income and costs across Real Estate Intelligence. Amounts are shown exactly as you enter them, so this only changes the symbol. It does not convert anything. Each property can still be set to its own currency.</p>
      <select value={symbol} onChange={e => setSymbol(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        {CURRENCIES.map(c => <option key={c.code} value={c.symbol}>{c.label}</option>)}
      </select>
      <button onClick={save} style={{ background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
      {msg && <div style={{ fontSize: 13, color: '#067647', marginTop: 10 }}>{msg}</div>}
      {err && <div style={{ fontSize: 13, color: '#B42318', marginTop: 10 }}>{err}</div>}
    </div>
  )
}
