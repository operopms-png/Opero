'use client'
// Jamaica real estate charges — Deal Analyser. For a property or land purchase in Jamaica, shows the
// purchaser's fees (or the vendor's) worked out from the purchase price. Every rate can be changed for
// this deal (kept on the deal) and an admin can save the company's own default rates.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { curOf, symOf } from '../../lib/currency'
import { isJamaicaDeal, purchaserCosts, vendorCosts, type Rates } from '../../lib/jamaica-costs'

const C = { ink: '#323338', muted: '#676879', row: '#E6E9EF', border: '#D0D4E4', blue: '#2563EB' }
const smallInp = { width: 84, padding: '5px 8px', border: '1px solid #D0D4E4', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', textAlign: 'right' as const, boxSizing: 'border-box' as const }

export default function JamaicaCosts({ strategy, form, setForm }: { strategy: string; form: any; setForm: (f: any) => void }) {
  const [side, setSide] = useState<'buyer' | 'seller'>('buyer')
  const [company, setCompany] = useState<Rates>({})
  const [canEdit, setCanEdit] = useState(false)
  const [msg, setMsg] = useState('')
  const show = strategy !== 'r2r' && strategy !== 'r2hmo' && isJamaicaDeal(form)

  async function headers() {
    const { data } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session?.access_token || '') }
  }
  useEffect(() => {
    if (!show) return
    let live = true
    ;(async () => {
      try {
        const r = await fetch('/api/jamaica-costs', { headers: await headers() })
        const d = await r.json()
        if (live && r.ok) { setCompany(d.rates || {}); setCanEdit(!!d.canEdit) }
      } catch {}
    })()
    return () => { live = false }
  }, [show])
  if (!show) return null

  const cur = curOf(form), S = symOf(form)
  const price = parseFloat(form.price) || 0
  const mortgage = (form.financeType || 'mortgage') === 'mortgage' && strategy !== 'land'
  const surveyor = parseFloat(form.surveyorFee) || 0
  const deal: Rates = form.jmRates || {}
  const res = side === 'buyer' ? purchaserCosts(price, cur, { mortgage, surveyor, company, deal }) : vendorCosts(price, cur, { company, deal })
  const money = (v: number) => S + Math.round(v).toLocaleString('en-GB')
  const dealChanged = Object.keys(deal).length > 0

  const setRate = (key: string, v: string) => {
    const next = { ...deal }
    if (v === '' || isNaN(Number(v))) delete next[key]; else next[key] = Math.max(0, Number(v))
    setForm({ ...form, jmRates: next })
  }
  async function saveDefaults() {
    const merged: Rates = { ...company, ...deal }
    try {
      const r = await fetch('/api/jamaica-costs', { method: 'POST', headers: await headers(), body: JSON.stringify({ rates: merged }) })
      const d = await r.json()
      if (!r.ok) return setMsg(d.error || 'Could not save')
      setCompany(d.rates || {}); setForm({ ...form, jmRates: {} }); setMsg('Saved as your company rates')
    } catch { setMsg('Could not save') }
  }
  async function resetCompany() {
    try {
      const r = await fetch('/api/jamaica-costs', { method: 'POST', headers: await headers(), body: JSON.stringify({ rates: {} }) })
      const d = await r.json()
      if (!r.ok) return setMsg(d.error || 'Could not reset')
      setCompany({}); setForm({ ...form, jmRates: {} }); setMsg('Back to the standard rates')
    } catch { setMsg('Could not reset') }
  }

  const tab = (k: 'buyer' | 'seller', l: string) => (
    <button type="button" onClick={() => setSide(k)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (side === k ? '#191815' : C.border), background: side === k ? '#191815' : '#fff', color: side === k ? '#fff' : '#344054', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
  )
  const link = { background: 'none', border: 'none', color: C.blue, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' } as const

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 24, margin: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Jamaica real estate charges</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{tab('buyer', 'Purchaser pays')}{tab('seller', 'Vendor pays')}</div>
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
        {price > 0 ? `Approximate costs on a purchase price of ${money(price)}. Change any rate to suit this deal.` : 'Enter a purchase price to see the amounts. Change any rate to suit this deal.'}
      </div>
      <div>
        {res.lines.map(l => (
          <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid ' + C.row, fontSize: 14, color: C.ink }}>
            <span>{l.label}{l.changed && <span style={{ color: C.blue, fontSize: 11.5, marginLeft: 6 }}>changed</span>}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {l.key === 'surveyor'
                ? <input value={form.surveyorFee || ''} onChange={e => setForm({ ...form, surveyorFee: e.target.value })} type="number" placeholder={`${S} quote`} style={{ ...smallInp, width: 104 }} />
                : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {l.kind === 'flat' && <span style={{ fontSize: 12, color: C.muted }}>J$</span>}
                    <input value={deal[l.key] ?? l.rate} onChange={e => setRate(l.key, e.target.value)} type="number" step="any" style={smallInp} />
                    {l.kind === 'pct' && <span style={{ fontSize: 12, color: C.muted }}>%</span>}
                  </span>}
              <span style={{ minWidth: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(l.amount)}</span>
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0 0', fontSize: 15, fontWeight: 700, color: C.ink }}>
          <span>Approximate total cost</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <span style={{ textAlign: 'right' }}>{price > 0 ? res.totalPct.toFixed(2) + '%' : ''}</span>
            <span style={{ minWidth: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(res.total)}</span>
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
        {dealChanged && <button type="button" style={link} onClick={() => setForm({ ...form, jmRates: {} })}>Reset this deal to company rates</button>}
        {canEdit && dealChanged && <button type="button" style={link} onClick={saveDefaults}>Save my changes as company rates</button>}
        {canEdit && Object.keys(company).length > 0 && <button type="button" style={{ ...link, color: C.muted }} onClick={resetCompany}>Reset company rates to standard</button>}
        {msg && <span style={{ fontSize: 12.5, color: C.muted }}>{msg}</span>}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
        {side === 'buyer'
          ? 'The mortgage line (6.00%) only appears when you are buying with a mortgage. Flat fees are in J$ and shown here at a rough exchange rate. Only admins can save company rates; everyone can change them on a single deal.'
          : 'These come out of the seller\'s proceeds, not your cost, but they help you judge what the seller will accept.'}
      </div>
    </div>
  )
}
