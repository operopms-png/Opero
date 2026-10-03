'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { calcBTL, calcHMO, calcR2R, calcFlip, calcLand, getStressScenarios, applyStress } from '../../lib/dealCalculators'
import AskChat from '../../components/ai/AskChat'
import MarketCheck from '../../components/invest/MarketCheck'
import LandlordOffer, { landlordOffer } from '../../components/invest/LandlordOffer'
import { ListingImportBox, ListingCard, propertyTypeFor, type Listing } from '../../components/invest/ListingImport'
import { CURRENCIES, curOf, symOf, type Cur } from '../../lib/currency'

const STRATEGY_ICONS: Record<string,React.ReactElement> = {
  btl:       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  flip:      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  brrr:      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  hmo:       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 22V9l7-7 7 7v13"/><path d="M15 22V13h4v9"/><path d="M19 6l4 3"/></svg>,
  r2hmo:     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V10l9-7 9 7v11"/><path d="M8 21v-6h3v6M13 21v-6h3v6"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>,
  r2r:       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  social:    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  supported: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
  land:      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
}
const STRATEGIES = [
  { id:'btl', label:'Buy to Let', desc:'Purchase and rent out residential property' },
  { id:'flip', label:'Flip', desc:'Buy, refurbish and sell for profit' },
  { id:'brrr', label:'BRRR', desc:'Buy, Refurb, Rent, Refinance, Repeat' },
  { id:'hmo', label:'HMO', desc:'House in Multiple Occupation — rent by room' },
  { id:'r2r', label:'Rent to Rent', desc:'Sublet a property you rent from a landlord' },
  { id:'r2hmo', label:'Rent to HMO', desc:'Rent a whole property and let it room by room' },
  { id:'social', label:'Social Housing', desc:'Long-term lets to councils or housing associations' },
  { id:'supported', label:'Supported Living', desc:'Specialist accommodation for vulnerable adults' },
  { id:'land', label:'Land Purchase', desc:'Buy land for development or planning gain' },
]

const SECTIONS = ['Deal Analyser','Saved Deals','Watchlist']

// Money fields converted when you switch currency
const MONEY_FIELDS = ['price','rent','rentPerRoom','subletRent','landlordDeposit','advanceRent','wifiCost','utilitiesCost','managementCost','insuranceCost','propertyTaxCost','cleaningCost','maintenanceCost','marketingCost','vacancyCost','setupCost','conversionCost','salePrice','planningCost','buildCost','gdv','refurb']

const VERDICT_COLORS: Record<string,{color:string;bg:string;border:string}> = {
  PASS:   { color:'#10B981', bg:'#ECFDF5', border:'#A7F3D0' },
  REVIEW: { color:'#F59E0B', bg:'#FEF3C7', border:'#FDE68A' },
  REJECT: { color:'#EF4444', bg:'#FEE2E2', border:'#FDA29B' },
}
const RULE_STATUS_COLORS: Record<string,string> = {
  PASS:'#10B981', FAIL:'#EF4444', REVIEW:'#F59E0B', MISSING:'#9699A6',
}
const CONFIDENCE_COLORS: Record<string,{color:string;bg:string}> = {
  VERIFIED:     { color:'#10B981', bg:'#ECFDF5' },
  USER_PROVIDED:{ color:'#A8862E', bg:'#FBF4E6' },
  ESTIMATED:    { color:'#F59E0B', bg:'#FEF3C7' },
  MISSING:      { color:'#9699A6', bg:'#E6E9EF' },
}

export default function InvestPage() {
  const [section, setSection] = useState('Deal Analyser')
  useEffect(() => {
    const read = () => { const q = new URLSearchParams(window.location.search).get('section'); const want = q && SECTIONS.includes(q) ? q : 'Deal Analyser'; setSection(cur => { if (cur !== want) { setResult(null); setStrategy(null) } return want }) }
    read(); window.addEventListener('popstate', read); window.addEventListener('opero:nav', read)
    return () => { window.removeEventListener('popstate', read); window.removeEventListener('opero:nav', read) }
  }, [])
  const goSection = (s: string) => {
    setSection(s); setResult(null); setStrategy(null)
    const url = s === 'Deal Analyser' ? '/invest' : '/invest?section=' + encodeURIComponent(s)
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, '', url)
  }
  const [strategy, setStrategy] = useState<string|null>(null)
  // Rent to HMO = Rent to Rent maths, counted per room (bills usually included)
  const isR2R = strategy==='r2r' || strategy==='r2hmo'
  const isR2HMO = strategy==='r2hmo'
  const [fx, setFx] = useState<Record<Cur, number> | null>(null)
  useEffect(() => { fetch('/api/fx').then(r => r.json()).then(d => d?.rates && setFx(d.rates)).catch(() => {}) }, [])
  const [form, setForm] = useState<any>({deposit:'25',mortgageRate:'5',expenses:'20',rooms:'4',rentPerRoom:'600'})
  const S = symOf(form)
  const n0 = (v: any) => Math.round(Number(v) || 0).toLocaleString('en-GB')
  const [result, setResult] = useState<any>(null)
  const [marketEstimate, setMarketEstimate] = useState<string|null>(null)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string|null>(null)
  const [savedDeals, setSavedDeals] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [watchForm, setWatchForm] = useState({address:'',price:'',notes:'',status:'Watching'})
  const [showAddWatch, setShowAddWatch] = useState(false)
  const [userId, setUserId] = useState<string|null>(null)
  const [loadingData, setLoadingData] = useState(true)

  // Deal Decision Engine state
  const [savedDealId, setSavedDealId] = useState<string|null>(null)
  const [verdict, setVerdict] = useState<any>(null)
  const [market, setMarket] = useState<any>(null)
  const [verdictLoading, setVerdictLoading] = useState(false)
  const [verdictError, setVerdictError] = useState<string|null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState<string|null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)
      const [dealsRes, watchRes] = await Promise.all([
        supabase.from('investment_deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('investment_watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setSavedDeals((dealsRes.data ?? []).map((d: any) => ({ id: d.id, strategy: d.strategy, address: d.address, savedAt: new Date(d.created_at).toLocaleDateString(), ...d.data })))
      setWatchlist((watchRes.data ?? []).map((w: any) => ({ id: w.id, address: w.address, price: w.price, notes: w.notes, status: w.status })))
      setLoadingData(false)
    })
  }, [])

  const inp = {width:'100%',padding:'10px 12px',border:'1px solid #D0D4E4',borderRadius:8,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const}
  const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}
  const BLUE = '#A8862E'
  const WATCH_COLOR: Record<string,string> = { Watching:'#579BFC', Offered:'#FDAB3D', 'Under Offer':'#9D50DD', Purchased:'#00C875', Passed:'#DF2F4A' }

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function estimateMarketRent() {
    if (!form.address?.trim()) { setEstimateError('Enter a property address/location first.'); return }
    setEstimating(true)
    setEstimateError(null)
    setMarketEstimate(null)
    try {
      const res = await fetch('/api/market-rent-estimate', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          location: form.address,
          propertyType: form.propertyType || 'Apartment',
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          furnished: true,
          termType: form.termType || 'long',
          currency: curOf(form),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEstimateError(data.error || 'Could not get an estimate.'); setEstimating(false); return }
      setMarketEstimate(data.estimate)
    } catch {
      setEstimateError('Could not reach the estimate service — check your connection.')
    }
    setEstimating(false)
  }

  // Switch currency: converts every figure you've entered at today's rate
  function switchCurrency(to: Cur) {
    const from = curOf(form)
    if (to === from) return
    const rates = fx || { GBP: 1, USD: 1.34, JMD: 210 }
    const k = rates[to] / rates[from]
    const f: any = { ...form, currency: to }
    for (const m of MONEY_FIELDS) { const v = parseFloat(form[m]); if (form[m] !== undefined && form[m] !== '' && Number.isFinite(v)) f[m] = String(Math.round(v * k * 100) / 100) }
    setForm(f); setMarket(null); setMarketEstimate(null)
    if (result) analyse(f)
  }

  // Imported listing: switch the deal to the listing's currency (converting
  // anything already entered), then fill address, price, beds, baths, type.
  function applyListing(l: Listing) {
    const from = curOf(form)
    const to = (l.currency && l.currency in CURRENCIES ? l.currency : from) as Cur
    const rates = fx || { GBP: 1, USD: 1.34, JMD: 210 }
    const k = rates[to] / rates[from]
    const f: any = { ...form, currency: to, listing: l }
    if (to !== from) for (const m of MONEY_FIELDS) { const v = parseFloat(form[m]); if (form[m] !== undefined && form[m] !== '' && Number.isFinite(v)) f[m] = String(Math.round(v * k * 100) / 100) }
    f.address = [l.address, l.subarea, l.area].filter(Boolean).join(', ')
    if (l.bedrooms) { f.bedrooms = String(l.bedrooms); if (isR2HMO) f.currentRooms = String(l.bedrooms) }
    if (l.bathrooms) f.bathrooms = String(l.bathrooms)
    const t = propertyTypeFor(l.style); if (t) f.propertyType = t
    if (l.price && !/rent/i.test(l.saleOrRent || '')) f.price = String(l.price)
    const rent = l.rentalPrice ? parseFloat(l.rentalPrice.replace(/[^0-9.]/g, '')) : (/rent/i.test(l.saleOrRent || '') ? l.price : null)
    if (rent && isR2R) f.rent = String(rent)
    setForm(f); setMarket(null); setMarketEstimate(null)
  }
  const removeListing = () => { const f = { ...form }; delete f.listing; setForm(f) }

  const CurrencySwitch = () => {
    const cur = curOf(form)
    return (
      <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
        <div style={{display:'inline-flex',border:'1px solid #D0D4E4',borderRadius:8,overflow:'hidden'}}>
          {(Object.keys(CURRENCIES) as Cur[]).map(c=>(
            <button key={c} onClick={()=>switchCurrency(c)} style={{padding:'6px 12px',border:'none',borderLeft:c==='GBP'?'none':'1px solid #D0D4E4',background:cur===c?BLUE:'#fff',color:cur===c?'#fff':'#344054',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{CURRENCIES[c].label}</button>
          ))}
        </div>
        {fx&&cur!=='GBP'&&<span style={{fontSize:11.5,color:'#9699A6'}}>£1 = {CURRENCIES[cur].sym}{fx[cur].toFixed(cur==='JMD'?0:2)}</span>}
      </div>
    )
  }

  function analyse(F0?: any) {
    let F = F0 || form
    if(!strategy) return
    if(isR2R ? !F.rent : !F.price) return
    // Use the figures shown in the boxes, including their defaults
    if (isR2R) {
      const f = { ...F, rooms: F.rooms || (isR2HMO ? '5' : '1'), leaseMonths: F.leaseMonths || '24',
        landlordDeposit: F.landlordDeposit || F.rent, advanceRent: F.advanceRent || F.rent }
      if (f.rooms!==F.rooms||f.leaseMonths!==F.leaseMonths||f.landlordDeposit!==F.landlordDeposit||f.advanceRent!==F.advanceRent) { setForm(f); F = f }
    }
    let r: any = {}
    if(strategy==='btl'||strategy==='brrr') r = calcBTL(F)
    else if(strategy==='hmo') r = calcHMO(F)
    else if(isR2R) r = calcR2R(isR2HMO ? {...F, currentRooms: F.bedrooms} : {...F, currentRooms: '', conversionCost: '', conversionMonths: ''})
    else if(strategy==='flip') r = calcFlip(F)
    else if(strategy==='land') r = calcLand(F)
    else if(strategy==='social'||strategy==='supported') r = calcBTL({...F, expenses:'10'})
    r.strategy = strategy
    r.address = F.address
    r.price = F.price
    setResult(r)
    setSavedDealId(null)
    setVerdict(null)
    setVerdictError(null)
  }

  async function gotMarket(m: any) {
    setMarket(m)
    if (savedDealId) await supabase.from('investment_deals').update({ market_check: m }).eq('id', savedDealId)
  }

  async function saveDeal() {
    if(!result || !userId) return
    const dealData = { ...form, ...result, savedAt: new Date().toLocaleDateString() }
    const { data, error } = await supabase.from('investment_deals').insert({
      user_id: userId, strategy: result.strategy, address: form.address || null, data: dealData, market_check: market,
    }).select().single()
    if (error) { alert(error.message); return }
    setSavedDeals([{ id: data.id, strategy: data.strategy, address: data.address, savedAt: new Date(data.created_at).toLocaleDateString(), ...dealData }, ...savedDeals])
    setSavedDealId(data.id)
    alert('Deal saved!')
  }

  async function getVerdict() {
    if (!savedDealId) return
    setVerdictLoading(true)
    setVerdictError(null)
    try {
      const res = await fetch('/api/deal-decision-engine', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ dealId: savedDealId }),
      })
      const data = await res.json()
      if (!res.ok) { setVerdictError(data.error || 'Could not run the AI verdict.'); setVerdictLoading(false); return }
      setVerdict(data)
    } catch {
      setVerdictError('Could not reach the AI verdict service — check your connection.')
    }
    setVerdictLoading(false)
  }

  async function submitOverride(overrideStatus: 'APPROVED'|'DUE_DILIGENCE'|'REJECTED') {
    if (!verdict?.id) return
    setOverrideSaving(overrideStatus)
    try {
      const res = await fetch('/api/deal-decision-engine/override', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ analysisId: verdict.id, overrideStatus, overrideReason: overrideReason || null }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Could not save the decision.'); setOverrideSaving(null); return }
      setVerdict(data)
    } catch {
      alert('Could not reach the server — check your connection.')
    }
    setOverrideSaving(null)
  }

  async function deleteDeal(id: string) {
    await supabase.from('investment_deals').delete().eq('id', id)
    setSavedDeals(savedDeals.filter(x=>x.id!==id))
  }

  async function addToWatchlist() {
    if(!watchForm.address || !userId) return
    const { data, error } = await supabase.from('investment_watchlist').insert({
      user_id: userId, address: watchForm.address, price: watchForm.price, notes: watchForm.notes, status: watchForm.status,
    }).select().single()
    if (error) { alert(error.message); return }
    setWatchlist([{ id: data.id, address: data.address, price: data.price, notes: data.notes, status: data.status }, ...watchlist])
    setWatchForm({address:'',price:'',notes:'',status:'Watching'})
    setShowAddWatch(false)
  }

  async function deleteWatch(id: string) {
    await supabase.from('investment_watchlist').delete().eq('id', id)
    setWatchlist(watchlist.filter(x=>x.id!==id))
  }

  const score = result ? (
    result.roi > 15 ? {label:'Excellent',color:'#10B981',bg:'#ECFDF5'} :
    result.roi > 10 ? {label:'Good',color:'#A8862E',bg:'#FBF4E6'} :
    result.roi > 5  ? {label:'Average',color:'#F59E0B',bg:'#FEF3C7'} :
    {label:'Poor',color:'#EF4444',bg:'#FEE2E2'}
  ) : null

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Figtree',sans-serif",color:'#323338'}}>
      {/* Header */}
      <div style={{padding:'22px 28px 0',background:'linear-gradient(135deg,#FBF4E6,#F3E6C8)',borderBottom:'1px solid #EADBB8'}}>
        <h1 style={{fontSize:26,fontWeight:500,color:'#624920',margin:'0 0 2px'}}>Invest</h1>
        <div style={{fontSize:13,color:'#8A7248',marginBottom:12}}>Analyse deals, keep the ones worth comparing and track properties you are watching.</div>
        <div style={{display:'flex',gap:22}}>
          {SECTIONS.map(s=>(
            <button key={s} onClick={()=>goSection(s)} style={{padding:'8px 2px',marginBottom:-1,border:'none',borderBottom:'2px solid '+(section===s?BLUE:'transparent'),background:'none',color:section===s?'#323338':'#676879',fontSize:14,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit'}}>{s}{s==='Saved Deals'&&savedDeals.length>0?` (${savedDeals.length})`:''}{s==='Watchlist'&&watchlist.length>0?` (${watchlist.length})`:''}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'24px 28px 40px',maxWidth:1200}}>

        {/* DEAL ANALYSER */}
        {section==='Deal Analyser'&&(
          <div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:18,fontWeight:600,color:'#323338',marginBottom:4}}>Deal Analyser</div>
              <div style={{fontSize:14,color:'#676879'}}>Select a strategy and enter the deal details to analyse returns.</div>
            </div>

            {/* Strategy picker */}
            {!strategy&&(
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#344054',marginBottom:12}}>Select your investment strategy</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                  {STRATEGIES.map(s=>(
                    <div key={s.id} onClick={()=>setStrategy(s.id)} style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#D0AE4C';e.currentTarget.style.background='#FFFCF5'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#E6E9EF';e.currentTarget.style.background='#fff'}}>
                      <div style={{marginBottom:12,color:BLUE}}>{STRATEGY_ICONS[s.id]}</div>
                      <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:12,color:'#676879'}}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {strategy&&!result&&(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
                  <button onClick={()=>setStrategy(null)} style={{padding:'6px 12px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>← Back</button>
                  <div style={{fontSize:16,fontWeight:600,color:'#323338'}}>{STRATEGIES.find(s=>s.id===strategy)?.label} Analysis</div>
                  <CurrencySwitch/>
                </div>
                {form.listing ? <ListingCard listing={form.listing} onRemove={removeListing} authHeaders={authHeaders} onImport={applyListing}/> : <ListingImportBox authHeaders={authHeaders} onImport={applyListing}/>}
                <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:28}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                    <div><label style={lbl}>Property Address</label><input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Street, town or postcode — used for the local market check" style={inp}/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.4fr',gap:10}}>
                      <div><label style={lbl}>{isR2HMO?'Bedrooms now (as rented)':'Bedrooms'}</label><input value={form.bedrooms||''} onChange={e=>setForm({...form,bedrooms:e.target.value,...(isR2HMO?{currentRooms:e.target.value}:{})})} type="number" placeholder="e.g. 3" style={inp}/></div>
                      <div><label style={lbl}>Bathrooms</label><input value={form.bathrooms||''} onChange={e=>setForm({...form,bathrooms:e.target.value})} type="number" step="0.5" placeholder="e.g. 2" style={inp}/></div>
                      <div><label style={lbl}>Property Type</label><select value={form.propertyType||''} onChange={e=>setForm({...form,propertyType:e.target.value})} style={inp}><option value="">Any</option>{['House','Terraced house','Semi-detached house','Detached house','Flat / apartment','Bungalow','Townhouse','Villa','Land'].map(t=><option key={t}>{t}</option>)}</select></div>
                    </div>
                    {!isR2R&&<div><label style={lbl}>Purchase Price ({S}) *</label><input value={form.price||''} onChange={e=>setForm({...form,price:e.target.value})} type="number" placeholder="e.g. 150000" style={inp}/></div>}

                    {(strategy==='btl'||strategy==='brrr'||strategy==='hmo'||strategy==='social'||strategy==='supported')&&(<>
                      <div><label style={lbl}>Deposit (%)</label><input value={form.deposit||'25'} onChange={e=>setForm({...form,deposit:e.target.value})} type="number" placeholder="25" style={inp}/></div>
                      <div><label style={lbl}>Mortgage Rate (%)</label><input value={form.mortgageRate||'5'} onChange={e=>setForm({...form,mortgageRate:e.target.value})} type="number" placeholder="5.0" style={inp}/></div>
                    </>)}

                    {(strategy==='btl'||strategy==='brrr'||strategy==='social'||strategy==='supported')&&(
                      <div><label style={lbl}>Monthly Rent ({S})</label><input value={form.rent||''} onChange={e=>setForm({...form,rent:e.target.value})} type="number" placeholder="e.g. 1200" style={inp}/></div>
                    )}

                    {strategy==='hmo'&&(<>
                      <div><label style={lbl}>Number of Rooms</label><input value={form.rooms||'4'} onChange={e=>setForm({...form,rooms:e.target.value})} type="number" placeholder="4" style={inp}/></div>
                      <div><label style={lbl}>Rent Per Room ({S}/mo)</label><input value={form.rentPerRoom||''} onChange={e=>setForm({...form,rentPerRoom:e.target.value})} type="number" placeholder="600" style={inp}/></div>
                    </>)}

                    {isR2R&&(<>
                      <div><label style={lbl}>Rent You Pay Landlord ({S}/mo) *</label><input value={form.rent||''} onChange={e=>setForm({...form,rent:e.target.value})} type="number" placeholder="e.g. 480" style={inp}/></div>
                      <div><label style={lbl}>{isR2HMO?'Rooms after conversion (rooms you let)':'Number of Units'}</label><input value={form.rooms||(isR2HMO?'5':'1')} onChange={e=>setForm({...form,rooms:e.target.value})} type="number" placeholder="1" style={inp}/></div>
                      <div>
                        <label style={lbl}>{isR2HMO?'Rent Per Room ('+S+'/mo, bills included)':'Resident Rent ('+S+'/mo, per unit)'}</label>
                        <input value={form.subletRent||''} onChange={e=>setForm({...form,subletRent:e.target.value})} type="number" placeholder="e.g. 950" style={inp}/>
                        <button onClick={estimateMarketRent} disabled={estimating} style={{marginTop:6,padding:'6px 12px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054',opacity:estimating?0.6:1}}>{estimating?'Searching…':'🔍 Estimate market rent'}</button>
                        {estimateError&&<div style={{fontSize:12,color:'#EF4444',marginTop:6}}>{estimateError}</div>}
                        {marketEstimate&&(
                          <div style={{marginTop:8,padding:'12px 14px',borderRadius:8,background:'#F7F8FA',border:'1px solid #E6E9EF',fontSize:12,color:'#344054',whiteSpace:'pre-wrap',lineHeight:1.6}}>
                            {marketEstimate}
                            <div style={{fontSize:11,color:'#9699A6',marginTop:8,fontStyle:'italic'}}>AI-assisted estimate based on a live web search — verify against current listings before offering a lease.</div>
                          </div>
                        )}
                      </div>
                      <div><label style={lbl}>Lease Term (months)</label><input value={form.leaseMonths||'24'} onChange={e=>setForm({...form,leaseMonths:e.target.value})} type="number" placeholder="24" style={inp}/></div>
                      <div><label style={lbl}>Deposit to Landlord ({S})</label><input value={form.landlordDeposit??''} onChange={e=>setForm({...form,landlordDeposit:e.target.value})} type="number" placeholder={form.rent?`${form.rent} (1 month’s rent)`:'1 month’s rent'} style={inp}/></div>
                      <div><label style={lbl}>Rent Paid in Advance ({S})</label><input value={form.advanceRent??''} onChange={e=>setForm({...form,advanceRent:e.target.value})} type="number" placeholder={form.rent?`${form.rent} (1 month’s rent)`:'1 month’s rent'} style={inp}/></div>
                      <div><label style={lbl}>Letting Type</label><select value={form.termType||'long'} onChange={e=>setForm({...form,termType:e.target.value})} style={inp}><option value="long">Long-term residential</option><option value="short">Short-term / serviced accommodation</option><option value="airbnb">Airbnb / short-let (nightly)</option></select></div>
                      <div><label style={lbl}>Wi-Fi/Internet ({S}/mo)</label><input value={form.wifiCost||''} onChange={e=>setForm({...form,wifiCost:e.target.value})} type="number" placeholder="e.g. 35" style={inp}/></div>
                      <div><label style={lbl}>Utilities Allowance ({S}/mo)</label><input value={form.utilitiesCost||''} onChange={e=>setForm({...form,utilitiesCost:e.target.value})} type="number" placeholder="e.g. 80" style={inp}/></div>
                      <div><label style={lbl}>Management/Operations ({S}/mo)</label><input value={form.managementCost||''} onChange={e=>setForm({...form,managementCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>Insurance ({S}/mo)</label><input value={form.insuranceCost||''} onChange={e=>setForm({...form,insuranceCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>{isR2HMO?'Council Tax / Property Fees ('+S+'/mo)':'Property Tax/Fees ('+S+'/mo)'}</label><input value={form.propertyTaxCost||''} onChange={e=>setForm({...form,propertyTaxCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>Cleaning/Operations ({S}/mo)</label><input value={form.cleaningCost||''} onChange={e=>setForm({...form,cleaningCost:e.target.value})} type="number" placeholder="e.g. 35" style={inp}/></div>
                      <div><label style={lbl}>Maintenance Reserve ({S}/mo)</label><input value={form.maintenanceCost||''} onChange={e=>setForm({...form,maintenanceCost:e.target.value})} type="number" placeholder="e.g. 40" style={inp}/></div>
                      <div><label style={lbl}>Platform/Marketing ({S}/mo)</label><input value={form.marketingCost||''} onChange={e=>setForm({...form,marketingCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>Vacancy Allowance ({S}/mo)</label><input value={form.vacancyCost||''} onChange={e=>setForm({...form,vacancyCost:e.target.value})} type="number" placeholder="e.g. 80" style={inp}/></div>
                      <div><label style={lbl}>{isR2HMO?'Setup Costs — furniture, HMO licence, fire safety ('+S+')':'Furniture Investment ('+S+')'}</label><input value={form.setupCost||''} onChange={e=>setForm({...form,setupCost:e.target.value})} type="number" placeholder="e.g. 3500" style={inp}/></div>
                      {isR2HMO&&<>
                        <div><label style={lbl}>Conversion Cost — walls, doors, fire doors, extra bathrooms ({S})</label><input value={form.conversionCost||''} onChange={e=>setForm({...form,conversionCost:e.target.value})} type="number" placeholder="0 if no conversion" style={inp}/></div>
                        <div><label style={lbl}>Months to Convert (no rent coming in)</label><input value={form.conversionMonths||''} onChange={e=>setForm({...form,conversionMonths:e.target.value})} type="number" placeholder="e.g. 2" style={inp}/></div>
                      </>}
                    </>)}

                    {(strategy==='flip'||strategy==='brrr')&&(
                      <div><label style={lbl}>Sale / GDV Price ({S})</label><input value={form.salePrice||''} onChange={e=>setForm({...form,salePrice:e.target.value})} type="number" placeholder="e.g. 200000" style={inp}/></div>
                    )}

                    {strategy==='land'&&(<>
                      <div><label style={lbl}>Planning Cost ({S})</label><input value={form.planningCost||''} onChange={e=>setForm({...form,planningCost:e.target.value})} type="number" placeholder="5000" style={inp}/></div>
                      <div><label style={lbl}>Build Cost ({S})</label><input value={form.buildCost||''} onChange={e=>setForm({...form,buildCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>Gross Development Value ({S})</label><input value={form.gdv||''} onChange={e=>setForm({...form,gdv:e.target.value})} type="number" placeholder="e.g. 300000" style={inp}/></div>
                    </>)}

                    {!isR2R&&strategy!=='land'&&(
                      <div><label style={lbl}>Refurb Cost ({S})</label><input value={form.refurb||''} onChange={e=>setForm({...form,refurb:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                    )}

                    {!isR2R&&strategy!=='land'&&strategy!=='flip'&&(
                      <div><label style={lbl}>Monthly Expenses (% of rent)</label><input value={form.expenses||'20'} onChange={e=>setForm({...form,expenses:e.target.value})} type="number" placeholder="20" style={inp}/></div>
                    )}
                  </div>
                  <button onClick={()=>analyse()} style={{width:'100%',padding:'14px',borderRadius:4,border:'none',background:BLUE,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>▶ Start Deal Analysis</button>
                </div>
              </div>
            )}

            {/* Results */}
            {result&&(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
                  <button onClick={()=>{setResult(null);setSavedDealId(null);setVerdict(null);setVerdictError(null);setMarket(null)}} style={{padding:'6px 12px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>← New Analysis</button>
                  <div style={{fontSize:16,fontWeight:600,color:'#323338'}}>{STRATEGIES.find(s=>s.id===strategy)?.label} — {form.address||'Analysis Results'}</div>
                  {score&&<span style={{padding:'4px 12px',borderRadius:20,background:score.bg,color:score.color,fontSize:13,fontWeight:700}}>{score.label} Deal</span>}
                  <CurrencySwitch/>
                </div>

                {form.listing&&<ListingCard listing={form.listing}/>}
                {isR2R&&!result.furnitureCost&&!result.conversionCost&&<div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:'#FFF8EC',border:'1px solid #F5DFB0',fontSize:12.5,color:'#7A5A12'}}>⚠ No setup or conversion costs entered, so ROI is based only on the {S}{n0((result.totalUpfront||0))} deposit and first month’s rent to the landlord. Add furniture, licence and safety costs for a realistic ROI.</div>}
                {/* Key metrics */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                  {result.monthlyCashflow!==undefined&&<div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase',marginBottom:8}}>Monthly Cash Flow</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.monthlyCashflow>=0?'#10B981':'#EF4444'}}>{S}{n0(Math.abs(result.monthlyCashflow))}</div>
                    <div style={{fontSize:11,color:'#9699A6',marginTop:4}}>{result.monthlyCashflow>=0?'positive':'negative'}</div>
                  </div>}
                  {result.annualCashflow!==undefined&&<div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase',marginBottom:8}}>Annual Cash Flow</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.annualCashflow>=0?'#10B981':'#EF4444'}}>{S}{n0(Math.abs(result.annualCashflow))}</div>
                  </div>}
                  {result.grossYield!==undefined&&<div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase',marginBottom:8}}>Gross Yield</div>
                    <div style={{fontSize:28,fontWeight:800,color:BLUE}}>{result.grossYield.toFixed(2)}%</div>
                  </div>}
                  {result.roi!==undefined&&<div style={{background:score?.bg||'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase',marginBottom:8}}>ROI</div>
                    <div style={{fontSize:28,fontWeight:800,color:score?.color||BLUE}}>{result.roi.toFixed(2)}%</div>
                  </div>}
                  {result.profit!==undefined&&<div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase',marginBottom:8}}>Profit</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.profit>=0?'#10B981':'#EF4444'}}>{S}{n0(Math.abs(result.profit))}</div>
                  </div>}
                </div>

                {isR2HMO&&result.asIs&&(()=>{
                  const a=result.asIs, gbp=(v:number|null|undefined)=>v==null?'—':(v<0?'-':'')+S+Math.abs(Math.round(v)).toLocaleString('en-GB')
                  const rows:[string,string,string,boolean?][]=[
                    ['Rooms let', String(a.rooms), String(result.rooms)],
                    ['Room income / month', gbp(a.totalIncome), gbp(result.totalIncome)],
                    ['Costs / month', gbp(result.monthlyExpenses), gbp(result.monthlyExpenses)],
                    ['Profit / month', gbp(a.monthlyCashflow), gbp(result.monthlyCashflow), true],
                    ['Profit / year', gbp(a.annualCashflow), gbp(result.annualCashflow), true],
                    ['Upfront cash', gbp(a.upfront), gbp(result.totalUpfront)],
                    ['Payback', a.paybackMonths!=null?a.paybackMonths.toFixed(1)+' months':'Never', result.paybackMonths!=null?result.paybackMonths.toFixed(1)+' months':'Never'],
                    ['Profit over the '+result.leaseMonths+'-month lease', gbp(a.leaseProfit), gbp(result.leaseProfit), true],
                  ]
                  const better = result.leaseProfit > a.leaseProfit
                  return (
                    <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,marginBottom:24}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4}}>
                        <div style={{fontSize:16,fontWeight:700,color:'#323338'}}>🔨 As is vs converted</div>
                        <span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:12,background:better?'#E6F7EF':'#FDECEC',color:better?'#0E7C55':'#EF4444'}}>{better?'Converting pays':'Converting doesn’t pay'}</span>
                      </div>
                      <div style={{fontSize:12.5,color:'#676879',marginBottom:14}}>The {a.rooms}-bed as you rent it, against converting it to {result.rooms} rooms at {S}{parseFloat(form.subletRent)||0} a room.</div>
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5,minWidth:460}}>
                          <thead><tr><th style={{textAlign:'left',padding:'8px 10px',fontSize:12,color:'#676879',fontWeight:600,borderBottom:'1px solid #E6E9EF'}}></th><th style={{textAlign:'right',padding:'8px 10px',fontSize:12,color:'#676879',fontWeight:600,borderBottom:'1px solid #E6E9EF'}}>As is ({a.rooms} rooms)</th><th style={{textAlign:'right',padding:'8px 10px',fontSize:12,color:'#624920',fontWeight:700,borderBottom:'1px solid #E6E9EF',background:'#FBF4E6'}}>Converted ({result.rooms} rooms)</th></tr></thead>
                          <tbody>{rows.map(([l,x,y,money],i)=>(
                            <tr key={i}><td style={{padding:'8px 10px',color:'#676879',borderBottom:'1px solid #F0F1F5'}}>{l}</td>
                              <td style={{padding:'8px 10px',textAlign:'right',fontWeight:600,color:money?(x.startsWith('-')?'#EF4444':'#10B981'):'#323338',borderBottom:'1px solid #F0F1F5'}}>{x}</td>
                              <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:money?(y.startsWith('-')?'#EF4444':'#10B981'):'#323338',borderBottom:'1px solid #F0F1F5',background:'#FFFCF5'}}>{y}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginTop:14}}>
                        <div style={{background:'#F7F8FA',borderRadius:8,padding:'10px 14px'}}><div style={{fontSize:11.5,color:'#676879'}}>Extra profit from converting</div><div style={{fontSize:20,fontWeight:800,color:(result.extraMonthly||0)>=0?'#10B981':'#EF4444'}}>{gbp(result.extraMonthly)}<span style={{fontSize:12,fontWeight:600,color:'#9699A6'}}> /month</span></div></div>
                        <div style={{background:'#F7F8FA',borderRadius:8,padding:'10px 14px'}}><div style={{fontSize:11.5,color:'#676879'}}>Conversion pays for itself in</div><div style={{fontSize:20,fontWeight:800,color:'#323338'}}>{result.conversionPayback!=null?result.conversionPayback.toFixed(1)+' months':'—'}</div>{result.conversionPayback!=null&&<div style={{fontSize:11.5,color:result.conversionPayback<=result.leaseMonths?'#0E7C55':'#EF4444',fontWeight:600}}>{result.conversionPayback<=result.leaseMonths?'✓ within your lease':'⚠ longer than your lease'}</div>}</div>
                        <div style={{background:'#F7F8FA',borderRadius:8,padding:'10px 14px'}}><div style={{fontSize:11.5,color:'#676879'}}>Extra profit over the lease</div><div style={{fontSize:20,fontWeight:800,color:result.leaseProfit-a.leaseProfit>=0?'#10B981':'#EF4444'}}>{gbp(result.leaseProfit-a.leaseProfit)}</div></div>
                      </div>
                      {result.rooms>a.rooms&&<div style={{marginTop:14,padding:'10px 14px',borderRadius:8,background:'#FFF8EC',fontSize:12.5,color:'#7A5A12',lineHeight:1.6}}>
                        <b>Before converting:</b> get the landlord’s written consent to the works and to letting by the room; check the HMO licence for {result.rooms} occupants{result.rooms>=7?' and planning — 7+ unrelated sharers usually needs planning permission in the UK (sui generis)':''}; check minimum room sizes, fire doors, alarms and enough bathrooms and kitchen space for {result.rooms} people. In Jamaica, check with the parish council on use and building approval.
                      </div>}
                      {(!result.conversionCost||!result.furnitureCost)&&result.rooms>a.rooms&&<div style={{marginTop:8,fontSize:12,color:'#9A6400'}}>No {[!result.furnitureCost&&'setup (furniture, licence, safety)',!result.conversionCost&&'conversion'].filter(Boolean).join(' or ')} cost entered — upfront cash only includes the landlord deposit and first month’s rent, so ROI and payback will look better than they really are.</div>}
                    </div>
                  )
                })()}

                <MarketCheck strategy={strategy!} strategyLabel={STRATEGIES.find(s=>s.id===strategy)?.label} form={form} setForm={setForm} market={market} onMarket={gotMarket} />

                {isR2R&&<LandlordOffer form={form} setForm={setForm} result={result} market={market} onUseOffer={offer=>{
                  const was = String(form.rent||'')
                  const f = { ...form, askingRent: form.askingRent || was, rent: String(offer),
                    landlordDeposit: !form.landlordDeposit || form.landlordDeposit===was ? String(offer) : form.landlordDeposit,
                    advanceRent: !form.advanceRent || form.advanceRent===was ? String(offer) : form.advanceRent }
                  setForm(f); analyse(f)
                }} />}

                {/* Stress Test */}
                {getStressScenarios(strategy!)&&(
                  <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24,marginBottom:20}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:4}}>Stress Test</div>
                    <div style={{fontSize:12,color:'#9699A6',marginBottom:16}}>How this deal holds up if interest rates rise or rent falls — the same checks a lender runs before funding.</div>
                    <div style={{overflowX:'auto'}}>
                      <div style={{display:'grid',gridTemplateColumns:'140px repeat('+getStressScenarios(strategy!)!.length+',1fr)',minWidth:560,gap:8}}>
                        <div></div>
                        {getStressScenarios(strategy!)!.map(sc=>(
                          <div key={sc.key} style={{fontSize:11,fontWeight:700,color:sc.key==='worst'?'#EF4444':sc.key==='base'?'#323338':'#F59E0B',textAlign:'center',padding:'6px 4px',background:sc.key==='worst'?'#FEE2E2':sc.key==='base'?'#F9FAFB':'#FEF3C7',borderRadius:6}}>{sc.label}</div>
                        ))}

                        <div style={{fontSize:12,color:'#676879',display:'flex',alignItems:'center'}}>Monthly Cash Flow</div>
                        {getStressScenarios(strategy!)!.map(sc=>{
                          const r:any = applyStress(strategy!, form, sc)
                          const v = r.monthlyCashflow
                          return <div key={sc.key} style={{textAlign:'center',padding:'10px 4px',fontSize:14,fontWeight:700,color:v>=0?'#10B981':'#EF4444'}}>{v!==undefined?(v>=0?'+':'-')+S+n0(Math.abs(v)):'—'}</div>
                        })}

                        <div style={{fontSize:12,color:'#676879',display:'flex',alignItems:'center'}}>Annual Cash Flow</div>
                        {getStressScenarios(strategy!)!.map(sc=>{
                          const r:any = applyStress(strategy!, form, sc)
                          const v = r.annualCashflow
                          return <div key={sc.key} style={{textAlign:'center',padding:'10px 4px',fontSize:13,fontWeight:600,color:v>=0?'#10B981':'#EF4444'}}>{v!==undefined?(v>=0?'+':'-')+S+n0(Math.abs(v)):'—'}</div>
                        })}

                        <div style={{fontSize:12,color:'#676879',display:'flex',alignItems:'center'}}>ROI</div>
                        {getStressScenarios(strategy!)!.map(sc=>{
                          const r:any = applyStress(strategy!, form, sc)
                          const v = r.roi
                          return <div key={sc.key} style={{textAlign:'center',padding:'10px 4px 14px',fontSize:13,fontWeight:600,color:'#323338'}}>{v!==undefined?v.toFixed(1)+'%':'—'}</div>
                        })}
                      </div>
                    </div>
                    {isR2R&&<div style={{fontSize:10.5,color:'#9699A6',marginTop:10}}>Void scenario is approximated as an equivalent income reduction, not a literal empty month.</div>}
                  </div>
                )}

                {/* Breakdown */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                  <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:16}}>Investment Breakdown</div>
                    {[
                      result.depositAmt!==undefined&&{l:'Deposit',v:S+n0(result.depositAmt)},
                      result.loanAmt!==undefined&&{l:'Mortgage Amount',v:S+n0(result.loanAmt)},
                      form.refurb&&{l:'Refurb Cost',v:S+n0(parseFloat(form.refurb))},
                      result.totalInvested!==undefined&&{l:'Total Invested',v:S+n0(result.totalInvested),bold:true},
                      result.setupCost!==undefined&&{l:'Setup Cost',v:S+(form.setupCost||0)},
                      result.furnitureCost!==undefined&&{l:isR2HMO?'Setup Costs (furniture, licence, safety)':'Furniture Investment',v:S+n0(result.furnitureCost)},
                      result.landlordDeposit>0&&{l:'Deposit to landlord (returned at the end)',v:S+n0(result.landlordDeposit)},
                      result.advanceRent>0&&{l:'Rent in advance',v:S+n0(result.advanceRent)},
                      result.conversionCost>0&&{l:'Conversion Cost',v:S+n0(result.conversionCost)},
                      result.holdingCost>0&&{l:`Rent & bills while converting (${result.conversionMonths} mo)`,v:S+n0(result.holdingCost)},
                      result.totalUpfront!==undefined&&{l:'Total Upfront Cash',v:S+n0(result.totalUpfront),bold:true},
                      result.purchaseCosts!==undefined&&{l:'Purchase Costs (5%)',v:S+n0(result.purchaseCosts)},
                      result.saleCosts!==undefined&&{l:'Sale Costs (3%)',v:S+n0(result.saleCosts)},
                      result.totalCost!==undefined&&{l:'Total Cost',v:S+n0(result.totalCost),bold:true},
                    ].filter(Boolean).map((item:any,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #E6E9EF'}}>
                        <span style={{fontSize:13,color:'#676879'}}>{item.l}</span>
                        <span style={{fontSize:13,fontWeight:item.bold?700:500,color:'#323338'}}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:16}}>Monthly P&L</div>
                    {[
                      result.totalRent!==undefined&&{l:'Total Rental Income',v:S+n0((result.totalRent||0)),c:'#10B981'},
                      result.totalIncome!==undefined&&{l:isR2HMO?`Room Rent Income (${form.rooms||'?'} rooms)`:'Resident Rent Income',v:S+n0((result.totalIncome||0)),c:'#10B981'},
                      result.monthlyCashflow!==undefined&&!result.totalRent&&!result.totalIncome&&{l:'Monthly Rent',v:S+n0((parseFloat(form.rent)||0)),c:'#10B981'},
                      result.monthlyMortgage!==undefined&&{l:'Mortgage Payment',v:('-'+S)+result.monthlyMortgage.toFixed(0),c:'#EF4444'},
                      result.monthlyExpenses!==undefined&&{l:isR2R?'Total Fixed Costs':'Expenses',v:('-'+S)+result.monthlyExpenses.toFixed(0),c:'#F59E0B'},
                      result.monthlyCashflow!==undefined&&{l:isR2R?'Net Operating Profit':'Net Cash Flow',v:(result.monthlyCashflow>=0?'+':'-')+S+n0(Math.abs(result.monthlyCashflow)),c:result.monthlyCashflow>=0?'#10B981':'#EF4444',bold:true},
                    ].filter(Boolean).map((item:any,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #E6E9EF'}}>
                        <span style={{fontSize:13,color:'#676879'}}>{item.l}</span>
                        <span style={{fontSize:13,fontWeight:item.bold?700:500,color:item.c||'#323338'}}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isR2R&&result.breakdown&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:16}}>Fixed Cost Breakdown</div>
                      {[
                        {l:'Landlord Rent',v:result.breakdown.landlordRent},
                        {l:'Wi-Fi/Internet',v:result.breakdown.wifi},
                        {l:'Utilities Allowance',v:result.breakdown.utilities},
                        {l:'Management/Operations',v:result.breakdown.management},
                        {l:'Insurance',v:result.breakdown.insurance},
                        {l:isR2HMO?'Council Tax / Fees':'Property Tax/Fees',v:result.breakdown.propertyTax},
                        {l:'Cleaning/Operations',v:result.breakdown.cleaning},
                        {l:'Maintenance Reserve',v:result.breakdown.maintenance},
                        {l:'Platform/Marketing',v:result.breakdown.marketing},
                        {l:'Vacancy Allowance',v:result.breakdown.vacancy},
                      ].filter(item=>item.v>0).map((item,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #E6E9EF'}}>
                          <span style={{fontSize:13,color:'#676879'}}>{item.l}</span>
                          <span style={{fontSize:13,fontWeight:500,color:'#EF4444'}}>-{S}{n0(item.v)}</span>
                        </div>
                      ))}
                      <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#323338'}}>Total Fixed Costs</span>
                        <span style={{fontSize:13,fontWeight:700,color:'#EF4444'}}>-{S}{n0(result.monthlyExpenses)}</span>
                      </div>
                    </div>
                    <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#323338',marginBottom:16}}>{isR2R?'Upfront Cash Payback':'Furniture Payback'}</div>
                      {(result.paybackBase??result.furnitureCost)>0?(
                        result.paybackMonths!==null?(<>
                          <div style={{textAlign:'center',padding:'12px 0 20px'}}>
                            <div style={{fontSize:32,fontWeight:800,color:'#323338'}}>{result.paybackMonths.toFixed(1)}<span style={{fontSize:16,fontWeight:600,color:'#9699A6'}}> months</span></div>
                            <div style={{fontSize:12,color:'#676879',marginTop:4}}>to get back {S}{n0((result.paybackBase??result.furnitureCost))} you put in{result.landlordDeposit>0?' (deposit'+(result.furnitureCost>0?', setup':'')+(result.conversionCost>0?', conversion':'')+')':''}{result.conversionMonths>0?` (includes ${result.conversionMonths} months converting)`:''}</div>
                          </div>
                          <div style={{padding:'12px 14px',borderRadius:8,background:result.withinLeaseTerm?'#ECFDF5':'#FEF3F2',border:'1px solid '+(result.withinLeaseTerm?'#A7F3D0':'#FDA29B')}}>
                            <div style={{fontSize:13,fontWeight:600,color:result.withinLeaseTerm?'#10B981':'#EF4444',marginBottom:4}}>{result.withinLeaseTerm?'✓ Payback fits within your lease term':'⚠ Payback exceeds your lease term'}</div>
                            <div style={{fontSize:12,color:'#676879'}}>Your {result.leaseMonths}-month lease leaves {Math.max(0,result.leaseMonths-result.paybackMonths).toFixed(1)} months of profit after {isR2R?'your upfront cash is':'furniture is'} paid back{result.leaseProfit!==undefined?` — about ${S}${Math.round(result.leaseProfit).toLocaleString('en-GB')} profit over the whole lease`:''}.{!result.withinLeaseTerm&&' Negotiate a longer lease (24–36 months) or lower the upfront costs before going ahead.'}</div>
                          </div>
                        </>):(
                          <div style={{padding:'12px 14px',borderRadius:8,background:'#FEF3F2',border:'1px solid #FDA29B',fontSize:13,color:'#EF4444'}}>Monthly profit is {S}0 or negative — upfront cash will never be recovered at these numbers.</div>
                        )
                      ):(
                        <div style={{fontSize:13,color:'#9699A6'}}>Enter a furniture investment amount to see payback period.</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{display:'flex',gap:12,marginBottom:24}}>
                  <button onClick={saveDeal} style={{padding:'12px 24px',borderRadius:4,border:'none',background:BLUE,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>💾 Save Deal</button>
                  <button onClick={getVerdict} disabled={!savedDealId||verdictLoading} style={{padding:'12px 24px',borderRadius:4,border:'1px solid '+(savedDealId?BLUE:'#D0D4E4'),background:'#fff',color:savedDealId?BLUE:'#9699A6',fontSize:14,fontWeight:600,cursor:savedDealId&&!verdictLoading?'pointer':'not-allowed',fontFamily:'inherit',opacity:verdictLoading?0.6:1}}>{verdictLoading?'Analysing…':'🤖 Get AI Verdict'}</button>
                  <button onClick={()=>{setResult(null);setStrategy(null);setForm({deposit:'25',mortgageRate:'5',expenses:'20',rooms:'4',rentPerRoom:'600'});setSavedDealId(null);setVerdict(null);setVerdictError(null);setMarket(null)}} style={{padding:'12px 24px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Start New Analysis</button>
                </div>
                {!savedDealId&&<div style={{fontSize:12,color:'#9699A6',marginTop:-16,marginBottom:20}}>Save the deal first to unlock the AI verdict.</div>}
                {verdictError&&<div style={{fontSize:13,color:'#EF4444',marginBottom:20}}>{verdictError}</div>}

                {/* AI Deal Decision Engine verdict panel */}
                {verdict&&(()=>{
                  const vc = VERDICT_COLORS[verdict.status] || VERDICT_COLORS.REVIEW
                  return (
                  <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:28,marginBottom:24}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                      <span style={{padding:'6px 16px',borderRadius:20,background:vc.bg,color:vc.color,border:'1px solid '+vc.border,fontSize:14,fontWeight:800,letterSpacing:0.5}}>{verdict.status}</span>
                      <div style={{fontSize:16,fontWeight:700,color:'#323338'}}>AI Deal Verdict</div>
                      {verdict.override_status&&(
                        <span style={{marginLeft:'auto',fontSize:12,fontWeight:600,color:'#676879'}}>Human decision: <b style={{color:'#323338'}}>{verdict.override_status.replace('_',' ')}</b></span>
                      )}
                    </div>

                    {verdict.ai_summary&&(
                      <div style={{padding:'14px 16px',borderRadius:8,background:'#F7F8FA',border:'1px solid #E6E9EF',fontSize:13,color:'#344054',whiteSpace:'pre-wrap',lineHeight:1.7,marginBottom:20}}>{verdict.ai_summary}</div>
                    )}
                    {verdict.ai_error&&<div style={{fontSize:12,color:'#F59E0B',marginBottom:16}}>AI narration unavailable ({verdict.ai_error}) — the deterministic result below is still valid.</div>}

                    {/* Rule-by-rule table */}
                    <div style={{fontSize:13,fontWeight:700,color:'#323338',marginBottom:10}}>Rule Checks</div>
                    <div style={{border:'1px solid #E6E9EF',borderRadius:8,overflow:'hidden',marginBottom:20}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 90px 100px 140px',padding:'8px 14px',background:'#F7F8FA',fontSize:11,fontWeight:700,color:'#676879',textTransform:'uppercase'}}>
                        <span>Rule</span><span>Result</span><span>Value</span><span>Threshold</span>
                      </div>
                      {(verdict.rule_results||[]).map((r:any,i:number)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 100px 140px',padding:'10px 14px',borderTop:'1px solid #E6E9EF',fontSize:12.5,alignItems:'center'}}>
                          <span style={{color:'#344054'}}>{r.rule}</span>
                          <span style={{fontWeight:700,color:RULE_STATUS_COLORS[r.result]||'#667085'}}>{r.result}</span>
                          <span style={{color:'#323338'}}>{r.value}</span>
                          <span style={{color:'#9699A6'}}>{r.threshold}</span>
                        </div>
                      ))}
                    </div>

                    {/* Break-even occupancy */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                      <div style={{background:'#F7F8FA',borderRadius:4,border:'1px solid #E6E9EF',padding:18}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#676879',textTransform:'uppercase',marginBottom:6}}>Break-even Occupancy</div>
                        <div style={{fontSize:22,fontWeight:800,color:'#323338'}}>{verdict.break_even!==null&&verdict.break_even!==undefined?verdict.break_even+'%':'N/A'}</div>
                      </div>
                      <div style={{background:'#F7F8FA',borderRadius:4,border:'1px solid #E6E9EF',padding:18}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#676879',textTransform:'uppercase',marginBottom:6}}>Missing Fields</div>
                        <div style={{fontSize:22,fontWeight:800,color:(verdict.missing_fields||[]).length>0?'#F59E0B':'#10B981'}}>{(verdict.missing_fields||[]).length}</div>
                      </div>
                    </div>

                    {/* Data confidence tags */}
                    <div style={{fontSize:13,fontWeight:700,color:'#323338',marginBottom:10}}>Data Confidence</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
                      {(verdict.inputs_confidence||[]).map((f:any,i:number)=>{
                        const cc = CONFIDENCE_COLORS[f.confidence]||CONFIDENCE_COLORS.MISSING
                        return (
                          <span key={i} title={f.note||''} style={{padding:'5px 10px',borderRadius:6,background:cc.bg,color:cc.color,fontSize:11.5,fontWeight:600}}>{f.field}: {f.value} · {f.confidence}</span>
                        )
                      })}
                    </div>

                    {/* Risk flags */}
                    {(verdict.risk_flags||[]).length>0&&(
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#323338',marginBottom:10}}>Risk Flags</div>
                        {(verdict.risk_flags||[]).map((r:string,i:number)=>(
                          <div key={i} style={{padding:'10px 14px',borderRadius:8,background:'#FEF3C7',border:'1px solid #FDE68A',fontSize:12.5,color:'#92400E',marginBottom:6}}>⚠ {r}</div>
                        ))}
                      </div>
                    )}

                    {/* Due-diligence checklist */}
                    <div style={{fontSize:13,fontWeight:700,color:'#323338',marginBottom:10}}>Due-Diligence Checklist</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                      {Object.entries(verdict.checklist||{}).map(([group,items]:any)=>(
                        <div key={group} style={{background:'#F7F8FA',borderRadius:4,border:'1px solid #E6E9EF',padding:16}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#676879',textTransform:'uppercase',marginBottom:10}}>{group}</div>
                          {items.map((it:any,i:number)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',fontSize:12.5,color:'#344054'}}>
                              <span style={{width:14,height:14,borderRadius:3,border:'1.5px solid #D0D4E4',flexShrink:0}}></span>
                              {it.item}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Human override */}
                    <div style={{borderTop:'1px solid #E6E9EF',paddingTop:20}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#323338',marginBottom:10}}>Human Decision</div>
                      <textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="Optional reason for your decision..." style={{...inp,minHeight:60,marginBottom:12,resize:'vertical' as const}}/>
                      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                        <button onClick={()=>submitOverride('APPROVED')} disabled={!!overrideSaving} style={{padding:'10px 18px',borderRadius:4,border:'none',background:'#10B981',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:overrideSaving?0.6:1}}>{overrideSaving==='APPROVED'?'Saving…':'✓ Approve for Next Stage'}</button>
                        <button onClick={()=>submitOverride('DUE_DILIGENCE')} disabled={!!overrideSaving} style={{padding:'10px 18px',borderRadius:4,border:'none',background:'#F59E0B',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:overrideSaving?0.6:1}}>{overrideSaving==='DUE_DILIGENCE'?'Saving…':'🔍 Send to Due Diligence'}</button>
                        <button onClick={()=>submitOverride('REJECTED')} disabled={!!overrideSaving} style={{padding:'10px 18px',borderRadius:4,border:'none',background:'#EF4444',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:overrideSaving?0.6:1}}>{overrideSaving==='REJECTED'?'Saving…':'✕ Reject'}</button>
                        <button onClick={()=>setResult(null)} style={{padding:'10px 18px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',color:'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✎ Edit Assumptions</button>
                        <button onClick={getVerdict} disabled={verdictLoading} style={{padding:'10px 18px',borderRadius:4,border:'1px solid '+BLUE,background:'#fff',color:BLUE,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:verdictLoading?0.6:1}}>{verdictLoading?'Re-running…':'↻ Re-run Analysis'}</button>
                      </div>
                    </div>
                  </div>
                  )
                })()}

                {/* Talk to AI about this deal */}
                <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:20,marginTop:24}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#323338',marginBottom:2}}>💬 Talk to AI about this deal</div>
                  <div style={{fontSize:12.5,color:'#676879',marginBottom:12}}>Ask what it thinks, what could go wrong or what to negotiate. It sees these figures, the stress tests{market?', the local market check':''}{verdict?' and the AI Verdict above':''}, and can check the web for local rents and prices.</div>
                  <AskChat key={(savedDealId||'new')+':'+JSON.stringify(result).length} kind="deal" compact refId={savedDealId}
                    deal={{
                      strategy: STRATEGIES.find(s=>s.id===strategy)?.label || strategy,
                      currency: CURRENCIES[curOf(form)].label,
                      inputs: form,
                      results: result,
                      stress: (getStressScenarios(strategy!)||[]).map(sc=>{ const r:any = applyStress(strategy!, form, sc); return { scenario: sc.label, monthlyCashflow: r?.monthlyCashflow, annualCashflow: r?.annualCashflow } }),
                      importedListing: form.listing ? (()=>{ const { photos, ...rest } = form.listing; return { ...rest, photoCount: (photos||[]).length } })() : null,
                      localMarket: market ? { location: market.location, confidence: market.confidence, area: market.area, benchmarks: market.benchmarks, comparables: (market.comparables||[]).map((c:any)=>({type:c.type,title:c.title,location:c.location,beds:c.beds,price:c.price,unit:c.unit,source:c.source,url:c.url})), demand: market.demand, watchOuts: market.watch_outs } : null,
                      landlordOffer: isR2R ? (()=>{ const o = landlordOffer(form, result, market); return { marketRent: o.marketRent, landlordAsking: o.asking, landlordReallyKeeps: o.landlordKeeps, mostYouCanPay: o.maxRent, targetProfit: o.targetProfit, recommendedOffer: o.rec?.offer ?? null, options: o.rows } })() : null,
                      aiVerdict: verdict ? { status: verdict.status, summary: verdict.ai_summary, override: verdict.override_status, risks: verdict.risk_flags, breakEven: verdict.break_even } : null,
                    }}
                    suggestions={['What do you think of this deal?','What are the biggest risks?','What should I negotiate on?','Do you agree with the AI Verdict?']} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAVED DEALS */}
        {section==='Saved Deals'&&(
          <div>
            <div style={{fontSize:18,fontWeight:600,color:'#323338',marginBottom:16}}>Saved Deals</div>
            {savedDeals.length===0?(
              <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:60,textAlign:'center',color:'#9699A6'}}>
                                <div style={{fontSize:15,fontWeight:600,color:'#323338',marginBottom:6}}>No saved deals yet</div>
                <div style={{fontSize:13}}>Run an analysis and save deals to compare them here.</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {savedDeals.map(d=>(
                  <div key={d.id} style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:24,overflow:'hidden'}}>
                    {d.listing?.photos?.[0]&&<img src={d.listing.photos[0]} alt="" style={{display:'block',width:'calc(100% + 48px)',height:150,objectFit:'cover',margin:'-24px -24px 16px'}}/>}
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#323338'}}>{d.address||'Deal #'+d.id}</div>
                      <button onClick={()=>deleteDeal(d.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444'}}>×</button>
                    </div>
                    <div style={{fontSize:12,color:'#676879',marginBottom:12}}>{STRATEGIES.find(s=>s.id===d.strategy)?.label} · {symOf(d)}{parseFloat(d.price).toLocaleString()}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {d.monthlyCashflow!==undefined&&<div style={{textAlign:'center',padding:12,background:'#F7F8FA',borderRadius:8}}><div style={{fontSize:16,fontWeight:700,color:d.monthlyCashflow>=0?'#10B981':'#EF4444'}}>{symOf(d)}{Math.abs(d.monthlyCashflow).toFixed(0)}/mo</div><div style={{fontSize:10,color:'#9699A6'}}>CASH FLOW</div></div>}
                      {d.roi!==undefined&&<div style={{textAlign:'center',padding:12,background:'#F7F8FA',borderRadius:8}}><div style={{fontSize:16,fontWeight:700,color:BLUE}}>{d.roi.toFixed(1)}%</div><div style={{fontSize:10,color:'#9699A6'}}>ROI</div></div>}
                    </div>
                    <div style={{fontSize:11,color:'#9699A6',marginTop:8}}>Saved {d.savedAt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WATCHLIST */}
        {section==='Watchlist'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:18,fontWeight:600,color:'#323338'}}>Watchlist</div>
              <button onClick={()=>setShowAddWatch(true)} style={{padding:'9px 18px',borderRadius:4,border:'none',background:BLUE,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Property</button>
            </div>
            {showAddWatch&&(
              <div style={{background:'#fff',borderRadius:8,border:'1px solid '+BLUE,padding:24,marginBottom:20}}>
                <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add to watchlist</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Address *</label><input value={watchForm.address} onChange={e=>setWatchForm({...watchForm,address:e.target.value})} placeholder="e.g. 12 High St" style={inp}/></div>
                  <div><label style={lbl}>Asking Price (£)</label><input value={watchForm.price} onChange={e=>setWatchForm({...watchForm,price:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                  <div><label style={lbl}>Status</label><select value={watchForm.status} onChange={e=>setWatchForm({...watchForm,status:e.target.value})} style={inp}>{['Watching','Offered','Under Offer','Purchased','Passed'].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><label style={lbl}>Notes</label><input value={watchForm.notes} onChange={e=>setWatchForm({...watchForm,notes:e.target.value})} placeholder="Any notes..." style={inp}/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={addToWatchlist} style={{padding:'9px 20px',borderRadius:4,border:'none',background:BLUE,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
                  <button onClick={()=>setShowAddWatch(false)} style={{padding:'9px 20px',borderRadius:4,border:'1px solid #D0D4E4',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
            )}
            {watchlist.length===0?(
              <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',padding:60,textAlign:'center',color:'#9699A6'}}>
                                <div style={{fontSize:15,fontWeight:600,color:'#323338',marginBottom:6}}>No properties on watchlist</div>
                <div style={{fontSize:13}}>Add properties you are tracking.</div>
              </div>
            ):(
              <div style={{background:'#fff',borderRadius:8,border:'1px solid #E6E9EF',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px 130px 1fr 110px',padding:'9px 16px',background:'#fff',borderBottom:'1px solid #E6E9EF',borderLeft:'4px solid #D0AE4C',fontSize:12.5,fontWeight:500,color:'#676879',gap:8}}>
                  <span>Address</span><span>Price</span><span>Status</span><span>Notes</span><span></span>
                </div>
                {watchlist.map(w=>(
                  <div key={w.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 130px 1fr 110px',padding:'8px 16px',borderBottom:'1px solid #E6E9EF',borderLeft:'4px solid #D0AE4C',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'#323338'}}>{w.address}</span>
                    <span style={{fontSize:13,fontWeight:500,color:'#323338'}}>{w.price?'£'+parseFloat(w.price).toLocaleString():'—'}</span>
                    <span style={{fontSize:12,fontWeight:500,padding:'5px 8px',borderRadius:4,textAlign:'center',color:'#fff',background:WATCH_COLOR[w.status]||'#C4C4C4'}}>{w.status}</span>
                    <span style={{fontSize:12,color:'#676879'}}>{w.notes||'—'}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setSection('Deal Analyser');setForm({...form,address:w.address,price:w.price})}} style={{padding:'4px 8px',borderRadius:4,border:'none',background:'#FBF4E6',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:BLUE,fontWeight:600}}>Analyse</button>
                      <button onClick={()=>deleteWatch(w.id)} style={{padding:'4px 8px',borderRadius:4,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
