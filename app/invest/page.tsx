'use client'
import { useState } from 'react'

const STRATEGIES = [
  { id:'btl', label:'Buy to Let', icon:'🏠', desc:'Purchase and rent out residential property' },
  { id:'flip', label:'Flip', icon:'🔄', desc:'Buy, refurbish and sell for profit' },
  { id:'brrr', label:'BRRR', icon:'♻️', desc:'Buy, Refurb, Rent, Refinance, Repeat' },
  { id:'hmo', label:'HMO', icon:'🏘️', desc:'House in Multiple Occupation — rent by room' },
  { id:'r2r', label:'Rent to Rent', icon:'🤝', desc:'Sublet a property you rent from a landlord' },
  { id:'social', label:'Social Housing', icon:'🏛️', desc:'Long-term lets to councils or housing associations' },
  { id:'supported', label:'Supported Living', icon:'❤️', desc:'Specialist accommodation for vulnerable adults' },
  { id:'land', label:'Land Purchase', icon:'🌍', desc:'Buy land for development or planning gain' },
]

const SECTIONS = ['Deal Analyser','Saved Deals','Watchlist','Postcode Insights']

function calcBTL(d: any) {
  const price = parseFloat(d.price)||0
  const deposit = parseFloat(d.deposit)||25
  const rent = parseFloat(d.rent)||0
  const mortgage = parseFloat(d.mortgageRate)||5
  const expenses = parseFloat(d.expenses)||20
  const refurb = parseFloat(d.refurb)||0
  const depositAmt = price * deposit / 100
  const loanAmt = price - depositAmt
  const monthlyMortgage = loanAmt * (mortgage/100/12) / (1 - Math.pow(1+mortgage/100/12, -300))
  const monthlyExpenses = rent * expenses / 100
  const monthlyCashflow = rent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (rent*12/price*100) : 0
  const netYield = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, netYield, roi, totalInvested }
}

function calcHMO(d: any) {
  const price = parseFloat(d.price)||0
  const deposit = parseFloat(d.deposit)||25
  const rooms = parseInt(d.rooms)||4
  const rentPerRoom = parseFloat(d.rentPerRoom)||600
  const mortgage = parseFloat(d.mortgageRate)||5.5
  const expenses = parseFloat(d.expenses)||35
  const refurb = parseFloat(d.refurb)||0
  const totalRent = rooms * rentPerRoom
  const depositAmt = price * deposit / 100
  const loanAmt = price - depositAmt
  const monthlyMortgage = loanAmt * (mortgage/100/12) / (1 - Math.pow(1+mortgage/100/12, -300))
  const monthlyExpenses = totalRent * expenses / 100
  const monthlyCashflow = totalRent - monthlyMortgage - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const totalInvested = depositAmt + refurb
  const grossYield = price > 0 ? (totalRent*12/price*100) : 0
  const roi = totalInvested > 0 ? (annualCashflow/totalInvested*100) : 0
  return { depositAmt, loanAmt, monthlyMortgage, monthlyExpenses, monthlyCashflow, annualCashflow, grossYield, roi, totalInvested, totalRent }
}

function calcR2R(d: any) {
  const rent = parseFloat(d.rent)||0
  const subletRent = parseFloat(d.subletRent)||0
  const rooms = parseInt(d.rooms)||1
  const expenses = parseFloat(d.expenses)||15
  const setupCost = parseFloat(d.setupCost)||2000
  const totalIncome = subletRent * rooms
  const monthlyExpenses = totalIncome * expenses / 100
  const monthlyCashflow = totalIncome - rent - monthlyExpenses
  const annualCashflow = monthlyCashflow * 12
  const roi = setupCost > 0 ? (annualCashflow/setupCost*100) : 0
  return { monthlyCashflow, annualCashflow, roi, totalIncome, monthlyExpenses }
}

function calcFlip(d: any) {
  const purchase = parseFloat(d.price)||0
  const refurb = parseFloat(d.refurb)||0
  const salePrice = parseFloat(d.salePrice)||0
  const purchaseCosts = purchase * 0.05
  const saleCosts = salePrice * 0.03
  const totalCost = purchase + refurb + purchaseCosts + saleCosts
  const profit = salePrice - totalCost
  const roi = totalCost > 0 ? (profit/totalCost*100) : 0
  return { totalCost, profit, roi, purchaseCosts, saleCosts }
}

function calcLand(d: any) {
  const purchase = parseFloat(d.price)||0
  const planningCost = parseFloat(d.planningCost)||5000
  const gdv = parseFloat(d.gdv)||0
  const buildCost = parseFloat(d.buildCost)||0
  const totalCost = purchase + planningCost + buildCost
  const profit = gdv - totalCost
  const roi = totalCost > 0 ? (profit/totalCost*100) : 0
  return { totalCost, profit, roi }
}

export default function InvestPage() {
  const [section, setSection] = useState('Deal Analyser')
  const [strategy, setStrategy] = useState<string|null>(null)
  const [form, setForm] = useState<any>({deposit:'25',mortgageRate:'5',expenses:'20',rooms:'4',rentPerRoom:'600'})
  const [result, setResult] = useState<any>(null)
  const [savedDeals, setSavedDeals] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [watchForm, setWatchForm] = useState({address:'',price:'',notes:'',status:'Watching'})
  const [showAddWatch, setShowAddWatch] = useState(false)
  const [postcode, setPostcode] = useState('')

  const inp = {width:'100%',padding:'10px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const}
  const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}
  const BLUE = '#5B7CFA'

  function analyse() {
    if(!strategy||!form.price) return
    let r: any = {}
    if(strategy==='btl'||strategy==='brrr') r = calcBTL(form)
    else if(strategy==='hmo') r = calcHMO(form)
    else if(strategy==='r2r') r = calcR2R(form)
    else if(strategy==='flip') r = calcFlip(form)
    else if(strategy==='land') r = calcLand(form)
    else if(strategy==='social'||strategy==='supported') r = calcBTL({...form, expenses:'10'})
    r.strategy = strategy
    r.address = form.address
    r.price = form.price
    setResult(r)
  }

  function saveDeal() {
    if(!result) return
    setSavedDeals([...savedDeals, {id:Date.now(), ...form, ...result, savedAt: new Date().toLocaleDateString()}])
    alert('Deal saved!')
  }

  const score = result ? (
    result.roi > 15 ? {label:'Excellent',color:'#10B981',bg:'#ECFDF5'} :
    result.roi > 10 ? {label:'Good',color:'#3B82F6',bg:'#EFF6FF'} :
    result.roi > 5  ? {label:'Average',color:'#F59E0B',bg:'#FEF3C7'} :
    {label:'Poor',color:'#EF4444',bg:'#FEE2E2'}
  ) : null

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 32px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:24}}>
          <div style={{fontSize:18,fontWeight:700,color:'#101828'}}>💹 Invest</div>
          <div style={{display:'flex',gap:4}}>
            {SECTIONS.map(s=>(
              <button key={s} onClick={()=>{setSection(s);setResult(null);setStrategy(null)}} style={{padding:'6px 14px',borderRadius:7,border:'none',background:section===s?BLUE:'transparent',color:section===s?'#fff':'#667085',fontSize:13,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:32,maxWidth:1100,margin:'0 auto'}}>

        {/* DEAL ANALYSER */}
        {section==='Deal Analyser'&&(
          <div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:4}}>Deal Analyser</div>
              <div style={{fontSize:14,color:'#667085'}}>Select a strategy and enter the deal details to analyse returns.</div>
            </div>

            {/* Strategy picker */}
            {!strategy&&(
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#344054',marginBottom:12}}>Select your investment strategy</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                  {STRATEGIES.map(s=>(
                    <div key={s.id} onClick={()=>setStrategy(s.id)} style={{background:'#fff',borderRadius:12,border:'2px solid #E4E7EC',padding:20,cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>(e.currentTarget.style.borderColor=BLUE)} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E4E7EC')}>
                      <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                      <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:12,color:'#667085'}}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {strategy&&!result&&(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
                  <button onClick={()=>setStrategy(null)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>← Back</button>
                  <div style={{fontSize:16,fontWeight:600,color:'#101828'}}>{STRATEGIES.find(s=>s.id===strategy)?.icon} {STRATEGIES.find(s=>s.id===strategy)?.label} Analysis</div>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:28}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                    <div><label style={lbl}>Property Address</label><input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="e.g. 12 High Street, London" style={inp}/></div>
                    <div><label style={lbl}>Purchase Price (£) *</label><input value={form.price||''} onChange={e=>setForm({...form,price:e.target.value})} type="number" placeholder="e.g. 150000" style={inp}/></div>

                    {(strategy==='btl'||strategy==='brrr'||strategy==='hmo'||strategy==='social'||strategy==='supported')&&(<>
                      <div><label style={lbl}>Deposit (%)</label><input value={form.deposit||'25'} onChange={e=>setForm({...form,deposit:e.target.value})} type="number" placeholder="25" style={inp}/></div>
                      <div><label style={lbl}>Mortgage Rate (%)</label><input value={form.mortgageRate||'5'} onChange={e=>setForm({...form,mortgageRate:e.target.value})} type="number" placeholder="5.0" style={inp}/></div>
                    </>)}

                    {(strategy==='btl'||strategy==='brrr'||strategy==='social'||strategy==='supported')&&(
                      <div><label style={lbl}>Monthly Rent (£)</label><input value={form.rent||''} onChange={e=>setForm({...form,rent:e.target.value})} type="number" placeholder="e.g. 1200" style={inp}/></div>
                    )}

                    {strategy==='hmo'&&(<>
                      <div><label style={lbl}>Number of Rooms</label><input value={form.rooms||'4'} onChange={e=>setForm({...form,rooms:e.target.value})} type="number" placeholder="4" style={inp}/></div>
                      <div><label style={lbl}>Rent Per Room (£/mo)</label><input value={form.rentPerRoom||''} onChange={e=>setForm({...form,rentPerRoom:e.target.value})} type="number" placeholder="600" style={inp}/></div>
                    </>)}

                    {strategy==='r2r'&&(<>
                      <div><label style={lbl}>Rent You Pay Landlord (£/mo)</label><input value={form.rent||''} onChange={e=>setForm({...form,rent:e.target.value})} type="number" placeholder="1000" style={inp}/></div>
                      <div><label style={lbl}>Number of Rooms/Units</label><input value={form.rooms||'1'} onChange={e=>setForm({...form,rooms:e.target.value})} type="number" placeholder="1" style={inp}/></div>
                      <div><label style={lbl}>Sublet Rent Per Room (£/mo)</label><input value={form.subletRent||''} onChange={e=>setForm({...form,subletRent:e.target.value})} type="number" placeholder="700" style={inp}/></div>
                      <div><label style={lbl}>Setup Cost (£)</label><input value={form.setupCost||''} onChange={e=>setForm({...form,setupCost:e.target.value})} type="number" placeholder="2000" style={inp}/></div>
                    </>)}

                    {(strategy==='flip'||strategy==='brrr')&&(
                      <div><label style={lbl}>Sale / GDV Price (£)</label><input value={form.salePrice||''} onChange={e=>setForm({...form,salePrice:e.target.value})} type="number" placeholder="e.g. 200000" style={inp}/></div>
                    )}

                    {strategy==='land'&&(<>
                      <div><label style={lbl}>Planning Cost (£)</label><input value={form.planningCost||''} onChange={e=>setForm({...form,planningCost:e.target.value})} type="number" placeholder="5000" style={inp}/></div>
                      <div><label style={lbl}>Build Cost (£)</label><input value={form.buildCost||''} onChange={e=>setForm({...form,buildCost:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                      <div><label style={lbl}>Gross Development Value (£)</label><input value={form.gdv||''} onChange={e=>setForm({...form,gdv:e.target.value})} type="number" placeholder="e.g. 300000" style={inp}/></div>
                    </>)}

                    {strategy!=='r2r'&&strategy!=='land'&&(
                      <div><label style={lbl}>Refurb Cost (£)</label><input value={form.refurb||''} onChange={e=>setForm({...form,refurb:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                    )}

                    {strategy!=='r2r'&&strategy!=='land'&&strategy!=='flip'&&(
                      <div><label style={lbl}>Monthly Expenses (% of rent)</label><input value={form.expenses||'20'} onChange={e=>setForm({...form,expenses:e.target.value})} type="number" placeholder="20" style={inp}/></div>
                    )}
                  </div>
                  <button onClick={analyse} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',background:BLUE,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>▶ Start Deal Analysis</button>
                </div>
              </div>
            )}

            {/* Results */}
            {result&&(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
                  <button onClick={()=>setResult(null)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>← New Analysis</button>
                  <div style={{fontSize:16,fontWeight:600,color:'#101828'}}>{STRATEGIES.find(s=>s.id===strategy)?.icon} {STRATEGIES.find(s=>s.id===strategy)?.label} — {form.address||'Analysis Results'}</div>
                  {score&&<span style={{padding:'4px 12px',borderRadius:20,background:score.bg,color:score.color,fontSize:13,fontWeight:700}}>{score.label} Deal</span>}
                </div>

                {/* Key metrics */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                  {result.monthlyCashflow!==undefined&&<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>Monthly Cash Flow</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.monthlyCashflow>=0?'#10B981':'#EF4444'}}>£{Math.abs(result.monthlyCashflow).toFixed(0)}</div>
                    <div style={{fontSize:11,color:'#98A2B3',marginTop:4}}>{result.monthlyCashflow>=0?'positive':'negative'}</div>
                  </div>}
                  {result.annualCashflow!==undefined&&<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>Annual Cash Flow</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.annualCashflow>=0?'#10B981':'#EF4444'}}>£{Math.abs(result.annualCashflow).toFixed(0)}</div>
                  </div>}
                  {result.grossYield!==undefined&&<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>Gross Yield</div>
                    <div style={{fontSize:28,fontWeight:800,color:BLUE}}>{result.grossYield.toFixed(2)}%</div>
                  </div>}
                  {result.roi!==undefined&&<div style={{background:score?.bg||'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>ROI</div>
                    <div style={{fontSize:28,fontWeight:800,color:score?.color||BLUE}}>{result.roi.toFixed(2)}%</div>
                  </div>}
                  {result.profit!==undefined&&<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>Profit</div>
                    <div style={{fontSize:28,fontWeight:800,color:result.profit>=0?'#10B981':'#EF4444'}}>£{Math.abs(result.profit).toFixed(0)}</div>
                  </div>}
                </div>

                {/* Breakdown */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Investment Breakdown</div>
                    {[
                      result.depositAmt!==undefined&&{l:'Deposit',v:'£'+result.depositAmt.toFixed(0)},
                      result.loanAmt!==undefined&&{l:'Mortgage Amount',v:'£'+result.loanAmt.toFixed(0)},
                      form.refurb&&{l:'Refurb Cost',v:'£'+parseFloat(form.refurb).toFixed(0)},
                      result.totalInvested!==undefined&&{l:'Total Invested',v:'£'+result.totalInvested.toFixed(0),bold:true},
                      result.setupCost!==undefined&&{l:'Setup Cost',v:'£'+(form.setupCost||0)},
                      result.purchaseCosts!==undefined&&{l:'Purchase Costs (5%)',v:'£'+result.purchaseCosts.toFixed(0)},
                      result.saleCosts!==undefined&&{l:'Sale Costs (3%)',v:'£'+result.saleCosts.toFixed(0)},
                      result.totalCost!==undefined&&{l:'Total Cost',v:'£'+result.totalCost.toFixed(0),bold:true},
                    ].filter(Boolean).map((item:any,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7'}}>
                        <span style={{fontSize:13,color:'#667085'}}>{item.l}</span>
                        <span style={{fontSize:13,fontWeight:item.bold?700:500,color:'#101828'}}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Monthly P&L</div>
                    {[
                      result.totalRent!==undefined&&{l:'Total Rental Income',v:'£'+(result.totalRent||0).toFixed(0),c:'#10B981'},
                      result.monthlyCashflow!==undefined&&!result.totalRent&&{l:'Monthly Rent',v:'£'+(parseFloat(form.rent)||0).toFixed(0),c:'#10B981'},
                      result.monthlyMortgage!==undefined&&{l:'Mortgage Payment',v:'-£'+result.monthlyMortgage.toFixed(0),c:'#EF4444'},
                      result.monthlyExpenses!==undefined&&{l:'Expenses',v:'-£'+result.monthlyExpenses.toFixed(0),c:'#F59E0B'},
                      result.monthlyCashflow!==undefined&&{l:'Net Cash Flow',v:(result.monthlyCashflow>=0?'+':'-')+'£'+Math.abs(result.monthlyCashflow).toFixed(0),c:result.monthlyCashflow>=0?'#10B981':'#EF4444',bold:true},
                    ].filter(Boolean).map((item:any,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7'}}>
                        <span style={{fontSize:13,color:'#667085'}}>{item.l}</span>
                        <span style={{fontSize:13,fontWeight:item.bold?700:500,color:item.c||'#101828'}}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',gap:12}}>
                  <button onClick={saveDeal} style={{padding:'12px 24px',borderRadius:10,border:'none',background:BLUE,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>💾 Save Deal</button>
                  <button onClick={()=>{setResult(null);setStrategy(null);setForm({deposit:'25',mortgageRate:'5',expenses:'20',rooms:'4',rentPerRoom:'600'})}} style={{padding:'12px 24px',borderRadius:10,border:'1px solid #D0D5DD',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Start New Analysis</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAVED DEALS */}
        {section==='Saved Deals'&&(
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:20}}>Saved Deals</div>
            {savedDeals.length===0?(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:40,marginBottom:12}}>💾</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No saved deals yet</div>
                <div style={{fontSize:13}}>Run an analysis and save deals to compare them here.</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {savedDeals.map(d=>(
                  <div key={d.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{d.address||'Deal #'+d.id}</div>
                      <button onClick={()=>setSavedDeals(savedDeals.filter(x=>x.id!==d.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444'}}>×</button>
                    </div>
                    <div style={{fontSize:12,color:'#667085',marginBottom:12}}>{STRATEGIES.find(s=>s.id===d.strategy)?.label} · £{parseFloat(d.price).toLocaleString()}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {d.monthlyCashflow!==undefined&&<div style={{textAlign:'center',padding:12,background:'#F9FAFB',borderRadius:8}}><div style={{fontSize:16,fontWeight:700,color:d.monthlyCashflow>=0?'#10B981':'#EF4444'}}>£{Math.abs(d.monthlyCashflow).toFixed(0)}/mo</div><div style={{fontSize:10,color:'#98A2B3'}}>CASH FLOW</div></div>}
                      {d.roi!==undefined&&<div style={{textAlign:'center',padding:12,background:'#F9FAFB',borderRadius:8}}><div style={{fontSize:16,fontWeight:700,color:BLUE}}>{d.roi.toFixed(1)}%</div><div style={{fontSize:10,color:'#98A2B3'}}>ROI</div></div>}
                    </div>
                    <div style={{fontSize:11,color:'#98A2B3',marginTop:8}}>Saved {d.savedAt}</div>
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
              <div style={{fontSize:22,fontWeight:700,color:'#101828'}}>Watchlist</div>
              <button onClick={()=>setShowAddWatch(true)} style={{padding:'9px 18px',borderRadius:8,border:'none',background:BLUE,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Property</button>
            </div>
            {showAddWatch&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid '+BLUE,padding:24,marginBottom:20}}>
                <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add to watchlist</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Address *</label><input value={watchForm.address} onChange={e=>setWatchForm({...watchForm,address:e.target.value})} placeholder="e.g. 12 High St" style={inp}/></div>
                  <div><label style={lbl}>Asking Price (£)</label><input value={watchForm.price} onChange={e=>setWatchForm({...watchForm,price:e.target.value})} type="number" placeholder="0" style={inp}/></div>
                  <div><label style={lbl}>Status</label><select value={watchForm.status} onChange={e=>setWatchForm({...watchForm,status:e.target.value})} style={inp}>{['Watching','Offered','Under Offer','Purchased','Passed'].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><label style={lbl}>Notes</label><input value={watchForm.notes} onChange={e=>setWatchForm({...watchForm,notes:e.target.value})} placeholder="Any notes..." style={inp}/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{if(!watchForm.address)return;setWatchlist([...watchlist,{id:Date.now(),...watchForm}]);setWatchForm({address:'',price:'',notes:'',status:'Watching'});setShowAddWatch(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:BLUE,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
                  <button onClick={()=>setShowAddWatch(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
            )}
            {watchlist.length===0?(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:40,marginBottom:12}}>👁️</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No properties on watchlist</div>
                <div style={{fontSize:13}}>Add properties you are tracking.</div>
              </div>
            ):(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 1fr 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                  <span>Address</span><span>Price</span><span>Status</span><span>Notes</span><span></span>
                </div>
                {watchlist.map(w=>(
                  <div key={w.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 1fr 100px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{w.address}</span>
                    <span style={{fontSize:13,fontWeight:600,color:BLUE}}>{w.price?'£'+parseFloat(w.price).toLocaleString():'—'}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block',background:w.status==='Watching'?'#EFF6FF':w.status==='Purchased'?'#ECFDF5':w.status==='Passed'?'#FEE2E2':'#FEF3C7',color:w.status==='Watching'?'#3B82F6':w.status==='Purchased'?'#10B981':w.status==='Passed'?'#EF4444':'#F59E0B'}}>{w.status}</span>
                    <span style={{fontSize:12,color:'#667085'}}>{w.notes||'—'}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setSection('Deal Analyser');setForm({...form,address:w.address,price:w.price})}} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#EFF6FF',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:BLUE,fontWeight:600}}>Analyse</button>
                      <button onClick={()=>setWatchlist(watchlist.filter(x=>x.id!==w.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POSTCODE INSIGHTS */}
        {section==='Postcode Insights'&&(
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:8}}>Postcode Insights</div>
            <div style={{fontSize:14,color:'#667085',marginBottom:24}}>Enter a UK postcode to get average rents, yields and market data.</div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:28,marginBottom:20}}>
              <div style={{display:'flex',gap:12,marginBottom:20}}>
                <input value={postcode} onChange={e=>setPostcode(e.target.value.toUpperCase())} placeholder="e.g. SW1A 1AA" style={{...inp,maxWidth:200}} />
                <button style={{padding:'10px 20px',borderRadius:8,border:'none',background:BLUE,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Explore Area</button>
              </div>
              <div style={{textAlign:'center',padding:40,color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:12}}>📍</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>Enter a postcode above</div>
                <div style={{fontSize:13}}>Market data integration coming soon. For now, use the Deal Analyser with your own research.</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
