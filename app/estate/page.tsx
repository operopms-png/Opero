'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#2D6A4F'
const NAV_BASICS = ['Dashboard','Properties','Units','Buildings','Tenants','Tenancies','Bookings','Inventories','Finance','Rent Collection','Vacancies','Expenses','Banking','Reports','Documents']
const NAV_REST = ['Contacts','Maintenance','Tasks','Notes','Messages','Candidates','Tools','Community']

export default function Page() {
  const [section, setSection] = useState('Dashboard')
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenancies, setTenancies] = useState<any[]>([])
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [showAddTenancy, setShowAddTenancy] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [prop, setProp] = useState({name:'',address:'',type:'Apartment',bedrooms:'1',rent:'',status:'Available'})
  const [ten, setTen] = useState({name:'',email:'',phone:'',dob:''})
  const [tenancy, setTenancy] = useState({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active'})
  const [vacancies, setVacancies] = useState<any[]>([])
  const [showAddVacancy, setShowAddVacancy] = useState(false)
  const [vacForm, setVacForm] = useState({property:'',type:'Apartment',roomType:'Whole Unit',rent:'',available:'',bedrooms:'1',description:''})

  const [rentSchedules, setRentSchedules] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed'})
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBank, setShowAddBank] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [bankForm, setBankForm] = useState({name:'',type:'Current',balance:'',currency:'GBP'})
  const [txForm, setTxForm] = useState({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'})
  const [bankingTab, setBankingTab] = useState('Overview')
  const [reportTab, setReportTab] = useState('P&L')
  const [showAddRent, setShowAddRent] = useState(false)
  const [rentForm, setRentForm] = useState({tenancy:'',tenant:'',amount:'',dueDay:'1',frequency:'Monthly',method:'Bank Transfer'})

  const [news] = useState([
    {title:'New Tenant Verification Regulations for Landlords',tag:'LEGISLATION',body:'The Renters Rights Act has introduced restrictions on upfront rental payments, requiring landlords to adopt alternative affordability checks.'},
    {title:'Mortgage Market Reforms Proposed by FCA',tag:'MORTGAGE',body:'The Financial Conduct Authority is proposing significant changes to the mortgage market aimed at providing more flexibility for lenders.'},
    {title:'UK Housing Market Shows Signs of Stabilization',tag:'RENTING',body:'Data indicates that the property market may be stabilizing, with both buyers and sellers adjusting to the new landscape of higher borrowing costs.'},
  ])

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      setLoading(false)
    })
  },[])

  const addProperty = () => {
    if(!prop.name) return
    if(editItem) { setProperties(properties.map(p=>p.id===editItem.id?{...p,...prop}:p)); setEditItem(null) }
    else setProperties([...properties,{id:Date.now(),...prop}])
    setProp({name:'',address:'',type:'Apartment',bedrooms:'1',rent:'',status:'Available'})
    setShowAddProperty(false)
  }
  const addTenant = () => {
    if(!ten.name) return
    if(editItem) { setTenants(tenants.map(t=>t.id===editItem.id?{...t,...ten}:t)); setEditItem(null) }
    else setTenants([...tenants,{id:Date.now(),...ten}])
    setTen({name:'',email:'',phone:'',dob:''})
    setShowAddTenant(false)
  }
  const addTenancy = () => {
    if(!tenancy.property) return
    if(editItem) { setTenancies(tenancies.map(t=>t.id===editItem.id?{...t,...tenancy}:t)); setEditItem(null) }
    else setTenancies([...tenancies,{id:Date.now(),...tenancy}])
    setTenancy({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active'})
    setShowAddTenancy(false)
  }

  const annualRent = tenancies.filter(t=>t.status==='Active').reduce((s,t)=>s+(parseFloat(t.rent)||0)*12,0)
  const monthlyRent = tenancies.filter(t=>t.status==='Active').reduce((s,t)=>s+(parseFloat(t.rent)||0),0)
  const rentedProps = properties.filter(p=>p.status==='Rented').length
  const months = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const btnStyle = (active:boolean) => ({
    display:'flex' as const,alignItems:'center' as const,gap:8,width:'100%',padding:'8px 12px',borderRadius:6,border:'none',
    background:active?ACCENT+'18':'transparent',color:active?ACCENT:'#344054',fontSize:13,
    fontWeight:active?600:400,cursor:'pointer' as const,fontFamily:'inherit',textAlign:'left' as const,marginBottom:2
  })

  const inputStyle = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' as const}
  const labelStyle = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      {/* Sidebar */}
      <div style={{width:200,background:'#fff',borderRight:'1px solid #E4E7EC',display:'flex',flexDirection:'column',paddingTop:0,flexShrink:0,minHeight:'100vh',overflowY:'auto'}}>
        <div style={{padding:'16px 16px 12px',borderBottom:'1px solid #E4E7EC',display:'flex',alignItems:'center',gap:8,background:ACCENT}}>
          <div style={{width:28,height:28,borderRadius:6,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:14,fontWeight:700}}>E</span></div>
          <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>Estate Agency</span>
        </div>
        <div style={{padding:'8px 10px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>THE BASICS</div>
          {NAV_BASICS.map(s=>(
            <button key={s} onClick={()=>setSection(s)} style={btnStyle(section===s)}>{s}</button>
          ))}
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px',marginTop:8}}>THE REST</div>
          {NAV_REST.map(s=>(
            <button key={s} onClick={()=>setSection(s)} style={btnStyle(section===s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,color:'#667085'}}>Dashboard</span>
            {section!=='Dashboard'&&<><span style={{color:'#D0D5DD'}}>/</span><span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{section}</span></>}
          </div>
          <div style={{display:'flex',gap:8}}>
            {section==='Properties'&&<button onClick={()=>{setEditItem(null);setShowAddProperty(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add property</button>}
            {section==='Tenants'&&<button onClick={()=>{setEditItem(null);setShowAddTenant(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add tenant</button>}
            {section==='Vacancies'&&<button onClick={()=>setShowAddVacancy(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add vacancy</button>}
            {section==='Expenses'&&<button onClick={()=>setShowAddExpense(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Expense</button>}
            {section==='Banking'&&<button onClick={()=>setShowAddBank(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button>}
            {section==='Rent Collection'&&<button onClick={()=>setShowAddRent(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add schedule</button>}
            {section==='Tenancies'&&<button onClick={()=>{setEditItem(null);setShowAddTenancy(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add tenancy</button>}
          </div>
        </div>

        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {section==='Dashboard'&&(<div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,color:'#667085'}}>Sunday, {new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long'})}</div>
              <div style={{fontSize:24,fontWeight:700,color:'#101828'}}>Hello Sangsters !</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[
                {label:'Rented properties',value:rentedProps,total:properties.length,sub:`${properties.filter(p=>p.status==='Available').length} AVAILABLE`,color:ACCENT},
                {label:'Tenants',value:tenants.length,total:tenants.length,sub:'0 ARCHIVED',color:ACCENT},
                {label:'Tenancies',value:tenancies.filter(t=>t.status==='Active').length,total:tenancies.length,sub:'0 ARCHIVED',color:ACCENT},
                {label:'Annual rent',value:'£'+annualRent.toLocaleString(),sub:'£'+monthlyRent.toLocaleString()+' / MONTH',color:ACCENT,big:true},
              ].map(s=>(
                <div key={s.label} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
                  <div style={{fontSize:12,color:'#667085',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span>{s.label}</span>
                  </div>
                  <div style={{fontSize:s.big?28:32,fontWeight:700,color:s.color,marginBottom:4}}>{s.value}{!s.big&&<span style={{fontSize:16,color:'#98A2B3',fontWeight:400}}> / {s.total}</span>}</div>
                  <div style={{fontSize:11,color:'#98A2B3',fontWeight:600}}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Revenues and Expenses</div>
                <div style={{display:'flex',gap:8,marginBottom:16,borderBottom:'1px solid #E4E7EC',paddingBottom:12}}>
                  {['CURRENT MONTH','LAST MONTH','CURRENT YEAR','12 MONTHS'].map((t,i)=>(
                    <button key={t} style={{padding:'4px 10px',borderRadius:4,border:'none',background:i===0?ACCENT:'transparent',color:i===0?'#fff':'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div style={{padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4,textTransform:'uppercase',fontWeight:600}}>Rent paid</div>
                    <div style={{fontSize:28,fontWeight:700,color:ACCENT}}>{tenancies.filter(t=>t.status==='Active').length}</div>
                  </div>
                  <div style={{padding:16,background:'#FEF2F2',borderRadius:8,border:'1px solid #FCA5A5'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4,textTransform:'uppercase',fontWeight:600}}>Late rent</div>
                    <div style={{fontSize:28,fontWeight:700,color:'#EF4444'}}>0</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  <div style={{padding:12,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4}}>GROSS INCOME</div>
                    <div style={{fontSize:18,fontWeight:700,color:ACCENT}}>£{monthlyRent.toLocaleString()}</div>
                  </div>
                  <div style={{padding:12,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4}}>NET PROFIT</div>
                    <div style={{fontSize:18,fontWeight:700,color:ACCENT}}>£{monthlyRent.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{height:80,position:'relative',borderBottom:'1px solid #E4E7EC'}}>
                  <div style={{display:'flex',alignItems:'flex-end',gap:2,height:'100%'}}>
                    {months.map((m,i)=>(
                      <div key={m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <div style={{width:'100%',background:i===months.length-1?ACCENT:ACCENT+'40',borderRadius:'2px 2px 0 0',height:`${20+Math.random()*60}%`}}/>
                        <div style={{fontSize:8,color:'#98A2B3'}}>{m}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Real estate news</div>
                {news.map(n=>(
                  <div key={n.title} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid #F2F4F7'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#101828',flex:1,marginRight:8}}>{n.title}</div>
                      <span style={{fontSize:10,fontWeight:700,background:'#E4E7EC',color:'#344054',padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap' as const}}>{n.tag}</span>
                    </div>
                    <div style={{fontSize:12,color:'#667085',lineHeight:1.5}}>{n.body}</div>
                  </div>
                ))}
                <button style={{width:'100%',padding:'8px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Show all</button>
              </div>
            </div>
          </div>)}

          {section==='Properties'&&(<div>
            {showAddProperty&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit property':'Add property'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property name *</label><input value={prop.name} onChange={e=>setProp({...prop,name:e.target.value})} placeholder="e.g. Sangsters Aurevo C1-12" style={inputStyle}/></div>
                <div><label style={labelStyle}>Address</label><input value={prop.address} onChange={e=>setProp({...prop,address:e.target.value})} placeholder="Full address" style={inputStyle}/></div>
                <div><label style={labelStyle}>Type</label><select value={prop.type} onChange={e=>setProp({...prop,type:e.target.value})} style={inputStyle}>{['Apartment','House','Studio','Commercial','HMO','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Bedrooms</label><select value={prop.bedrooms} onChange={e=>setProp({...prop,bedrooms:e.target.value})} style={inputStyle}>{['Studio','1','2','3','4','5','6+'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Monthly rent (£)</label><input value={prop.rent} onChange={e=>setProp({...prop,rent:e.target.value})} placeholder="0.00" type="number" style={inputStyle}/></div>
                <div><label style={labelStyle}>Status</label><select value={prop.status} onChange={e=>setProp({...prop,status:e.target.value})} style={inputStyle}>{['Available','Rented','Maintenance','Archived'].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addProperty} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add property'}</button>
                <button onClick={()=>{setShowAddProperty(false);setEditItem(null);setProp({name:'',address:'',type:'Apartment',bedrooms:'1',rent:'',status:'Available'})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total',v:properties.length,c:ACCENT},{l:'Available',v:properties.filter(p=>p.status==='Available').length,c:'#10B981'},{l:'Rented',v:rentedProps,c:'#F59E0B'},{l:'Annual rent',v:'£'+annualRent.toLocaleString(),c:ACCENT}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 80px 100px 80px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Name</span><span>Type</span><span>Address</span><span>Beds</span><span>Rent/mo</span><span>Status</span><span></span>
              </div>
              {properties.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🏠</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No properties yet</div><div style={{fontSize:13}}>Add your first property to get started.</div></div>):properties.map(p=>(
                <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 80px 100px 80px 100px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{p.name}</div>
                  <span style={{fontSize:12,color:'#344054'}}>{p.type}</span>
                  <span style={{fontSize:12,color:'#667085',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.address||'—'}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{p.bedrooms}</span>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>{p.rent?'£'+p.rent:'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:p.status==='Rented'?'#FEF3C7':p.status==='Available'?'#ECFDF5':'#F2F4F7',color:p.status==='Rented'?'#F59E0B':p.status==='Available'?'#10B981':'#667085',display:'inline-block'}}>{p.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(p);setProp({name:p.name,address:p.address,type:p.type,bedrooms:p.bedrooms,rent:p.rent,status:p.status});setShowAddProperty(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>setProperties(properties.filter(x=>x.id!==p.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Tenants'&&(<div>
            {showAddTenant&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit tenant':'Add tenant'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Full name *</label><input value={ten.name} onChange={e=>setTen({...ten,name:e.target.value})} placeholder="Jane Smith" style={inputStyle}/></div>
                <div><label style={labelStyle}>Email</label><input value={ten.email} onChange={e=>setTen({...ten,email:e.target.value})} placeholder="jane@example.com" style={inputStyle}/></div>
                <div><label style={labelStyle}>Phone</label><input value={ten.phone} onChange={e=>setTen({...ten,phone:e.target.value})} placeholder="+44 7700 900000" style={inputStyle}/></div>
                <div><label style={labelStyle}>Date of birth</label><input value={ten.dob} onChange={e=>setTen({...ten,dob:e.target.value})} type="date" style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addTenant} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add tenant'}</button>
                <button onClick={()=>{setShowAddTenant(false);setEditItem(null);setTen({name:'',email:'',phone:'',dob:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 140px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Name</span><span>Email</span><span>Phone</span><span>Date of birth</span><span></span>
              </div>
              {tenants.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>👥</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tenants yet</div><div style={{fontSize:13}}>Add your first tenant to get started.</div></div>):tenants.map(t=>(
                <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 140px 100px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:32,height:32,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:ACCENT}}>{t.name.charAt(0)}</div><span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.name}</span></div>
                  <span style={{fontSize:13,color:'#667085'}}>{t.email||'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{t.phone||'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{t.dob||'—'}</span>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(t);setTen({name:t.name,email:t.email,phone:t.phone,dob:t.dob});setShowAddTenant(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>setTenants(tenants.filter(x=>x.id!==t.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Tenancies'&&(<div>
            {showAddTenancy&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit tenancy':'Add tenancy'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property *</label><select value={tenancy.property} onChange={e=>setTenancy({...tenancy,property:e.target.value})} style={inputStyle}><option value="">Select property</option>{properties.map(p=><option key={p.id}>{p.name}</option>)}</select></div>
                <div><label style={labelStyle}>Tenant</label><select value={tenancy.tenant} onChange={e=>setTenancy({...tenancy,tenant:e.target.value})} style={inputStyle}><option value="">Select tenant</option>{tenants.map(t=><option key={t.id}>{t.name}</option>)}</select></div>
                <div><label style={labelStyle}>Start date</label><input value={tenancy.start} onChange={e=>setTenancy({...tenancy,start:e.target.value})} type="date" style={inputStyle}/></div>
                <div><label style={labelStyle}>End date</label><input value={tenancy.end} onChange={e=>setTenancy({...tenancy,end:e.target.value})} type="date" style={inputStyle}/></div>
                <div><label style={labelStyle}>Monthly rent (£)</label><input value={tenancy.rent} onChange={e=>setTenancy({...tenancy,rent:e.target.value})} type="number" placeholder="0.00" style={inputStyle}/></div>
                <div><label style={labelStyle}>Deposit (£)</label><input value={tenancy.deposit} onChange={e=>setTenancy({...tenancy,deposit:e.target.value})} type="number" placeholder="0.00" style={inputStyle}/></div>
                <div><label style={labelStyle}>Status</label><select value={tenancy.status} onChange={e=>setTenancy({...tenancy,status:e.target.value})} style={inputStyle}>{['Active','Pending','Expired','Terminated'].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addTenancy} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add tenancy'}</button>
                <button onClick={()=>{setShowAddTenancy(false);setEditItem(null);setTenancy({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active'})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Property</span><span>Tenant</span><span>Start</span><span>End</span><span>Rent/mo</span><span>Status</span><span></span>
              </div>
              {tenancies.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tenancies yet</div><div style={{fontSize:13}}>Add your first tenancy to get started.</div></div>):tenancies.map(t=>(
                <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.property}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{t.tenant||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.start||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.end||'—'}</span>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>{t.rent?'£'+t.rent:' —'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:t.status==='Active'?'#ECFDF5':t.status==='Pending'?'#FEF3C7':'#FEE2E2',color:t.status==='Active'?'#10B981':t.status==='Pending'?'#F59E0B':'#EF4444',display:'inline-block'}}>{t.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(t);setTenancy({property:t.property,tenant:t.tenant,start:t.start,end:t.end,rent:t.rent,deposit:t.deposit,status:t.status});setShowAddTenancy(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>setTenancies(tenancies.filter(x=>x.id!==t.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Finance'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Monthly income',v:'£'+monthlyRent.toLocaleString(),c:ACCENT},{l:'Annual rent',v:'£'+annualRent.toLocaleString(),c:'#10B981'},{l:'Outstanding',v:'£0',c:'#EF4444'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Revenue by property</div>
              {tenancies.filter(t=>t.status==='Active').length===0?(<div style={{textAlign:'center',padding:40,color:'#98A2B3'}}>No active tenancies yet</div>):tenancies.filter(t=>t.status==='Active').map(t=>(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <div style={{fontSize:13,color:'#344054',width:200,flexShrink:0}}>{t.property}</div>
                  <div style={{flex:1,background:'#F2F4F7',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:monthlyRent?(parseFloat(t.rent)/monthlyRent*100)+'%':'0%',height:'100%',background:ACCENT,borderRadius:4}}/></div>
                  <div style={{fontSize:13,fontWeight:600,color:ACCENT,width:80,textAlign:'right'}}>£{t.rent}/mo</div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Vacancies'&&(<div>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              <div style={{background:'linear-gradient(135deg,'+ACCENT+',#1B4332)',borderRadius:10,padding:20,color:'#fff'}}>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',opacity:0.8,marginBottom:8}}>Untapped potential / month</div>
                <div style={{fontSize:32,fontWeight:700}}>£{vacancies.filter(v=>v.status==='Available').reduce((s,v)=>s+(parseFloat(v.rent)||0),0).toLocaleString()}</div>
                <div style={{fontSize:12,opacity:0.7,marginTop:4}}>If all {vacancies.filter(v=>v.status==='Available').length} vacancies were filled</div>
              </div>
              <div style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:700,color:ACCENT,marginBottom:4}}>{vacancies.filter(v=>v.status==='Available').length}</div>
                <div style={{fontSize:12,color:'#667085'}}>Vacant units</div>
              </div>
              <div style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:700,color:'#F59E0B',marginBottom:4}}>{vacancies.length>0?'£'+(vacancies.reduce((s,v)=>s+(parseFloat(v.rent)||0),0)/vacancies.length).toFixed(0):'£0'}</div>
                <div style={{fontSize:12,color:'#667085'}}>Avg rent / unit</div>
              </div>
            </div>
            {/* Add form */}
            {showAddVacancy&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add vacancy</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property name *</label><select value={vacForm.property} onChange={e=>setVacForm({...vacForm,property:e.target.value})} style={inputStyle}><option value=''>Select property</option>{properties.map(p=><option key={p.id}>{p.name}</option>)}</select></div>
                <div><label style={labelStyle}>Room type</label><select value={vacForm.roomType} onChange={e=>setVacForm({...vacForm,roomType:e.target.value})} style={inputStyle}>{['Whole Unit','Single','Double','Suite','Studio'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Monthly rent (£)</label><input value={vacForm.rent} onChange={e=>setVacForm({...vacForm,rent:e.target.value})} type='number' placeholder='0.00' style={inputStyle}/></div>
                <div><label style={labelStyle}>Bedrooms</label><select value={vacForm.bedrooms} onChange={e=>setVacForm({...vacForm,bedrooms:e.target.value})} style={inputStyle}>{['Studio','1','2','3','4','5','6+'].map(b=><option key={b}>{b}</option>)}</select></div>
                <div><label style={labelStyle}>Available from</label><input value={vacForm.available} onChange={e=>setVacForm({...vacForm,available:e.target.value})} type='date' style={inputStyle}/></div>
                <div><label style={labelStyle}>Type</label><select value={vacForm.type} onChange={e=>setVacForm({...vacForm,type:e.target.value})} style={inputStyle}>{['Apartment','House','Studio','HMO','Commercial'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Description</label><input value={vacForm.description} onChange={e=>setVacForm({...vacForm,description:e.target.value})} placeholder='Brief description of the unit...' style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!vacForm.property)return;setVacancies([...vacancies,{id:Date.now(),...vacForm,status:'Available',created:new Date().toISOString().split('T')[0]}]);setVacForm({property:'',type:'Apartment',roomType:'Whole Unit',rent:'',available:'',bedrooms:'1',description:''});setShowAddVacancy(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add vacancy</button>
                <button onClick={()=>setShowAddVacancy(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {/* Filter pills */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              {['All','Whole Unit','Single','Double','Suite','Studio'].map(t=>(
                <button key={t} style={{padding:'6px 14px',borderRadius:20,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>{t}</button>
              ))}
            </div>
            {/* Cards */}
            {vacancies.length===0?(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:40,marginBottom:12}}>🏠</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No vacancies right now</div>
                <div style={{fontSize:13}}>When a unit becomes vacant it will show here.</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {vacancies.map(v=>(
                  <div key={v.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                    <div style={{background:ACCENT+'15',height:80,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>🏠</div>
                    <div style={{padding:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                        <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{v.property}</div>
                        <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#ECFDF5',color:'#10B981'}}>{v.status}</span>
                      </div>
                      <div style={{fontSize:12,color:'#667085',marginBottom:4}}>{v.roomType} · {v.bedrooms} bed · {v.type}</div>
                      {v.description&&<div style={{fontSize:12,color:'#667085',marginBottom:8}}>{v.description}</div>}
                      <div style={{fontSize:18,fontWeight:700,color:ACCENT,marginBottom:8}}>£{parseFloat(v.rent||0).toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:'#667085'}}>/mo</span></div>
                      {v.available&&<div style={{fontSize:11,color:'#667085',marginBottom:12}}>Available from {v.available}</div>}
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setVacancies(vacancies.map(x=>x.id===v.id?{...x,status:x.status==='Available'?'Let Agreed':'Available'}:x))} style={{flex:1,padding:'7px',borderRadius:6,border:'none',background:v.status==='Available'?ACCENT:'#F2F4F7',color:v.status==='Available'?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{v.status==='Available'?'Mark let':'Re-list'}</button>
                        <button onClick={()=>setVacancies(vacancies.filter(x=>x.id!==v.id))} style={{padding:'7px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}
          {section==='Rent Collection'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Scheduled',v:rentSchedules.length,c:ACCENT},{l:'Collected',v:'£'+rentSchedules.filter(r=>r.status==='Paid').reduce((s,r)=>s+(parseFloat(r.amount)||0),0).toLocaleString(),c:'#10B981'},{l:'Overdue',v:rentSchedules.filter(r=>r.status==='Overdue').length,c:'#EF4444'},{l:'Pending',v:rentSchedules.filter(r=>r.status==='Pending').length,c:'#F59E0B'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showAddRent&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add rent schedule</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Tenancy *</label><select value={rentForm.tenancy} onChange={e=>setRentForm({...rentForm,tenancy:e.target.value})} style={inputStyle}><option value=''>Select tenancy</option>{tenancies.map(t=><option key={t.id}>{t.property} — {t.tenant}</option>)}</select></div>
                <div><label style={labelStyle}>Tenant name</label><input value={rentForm.tenant} onChange={e=>setRentForm({...rentForm,tenant:e.target.value})} placeholder='e.g. Jane Smith' style={inputStyle}/></div>
                <div><label style={labelStyle}>Amount (£)</label><input value={rentForm.amount} onChange={e=>setRentForm({...rentForm,amount:e.target.value})} type='number' placeholder='0.00' style={inputStyle}/></div>
                <div><label style={labelStyle}>Due day</label><select value={rentForm.dueDay} onChange={e=>setRentForm({...rentForm,dueDay:e.target.value})} style={inputStyle}>{Array.from({length:28},(_,i)=>String(i+1)).map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label style={labelStyle}>Frequency</label><select value={rentForm.frequency} onChange={e=>setRentForm({...rentForm,frequency:e.target.value})} style={inputStyle}>{['Monthly','Weekly','Quarterly'].map(f=><option key={f}>{f}</option>)}</select></div>
                <div><label style={labelStyle}>Method</label><select value={rentForm.method} onChange={e=>setRentForm({...rentForm,method:e.target.value})} style={inputStyle}>{['Bank Transfer','Direct Debit','Standing Order','Cash','Cheque'].map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!rentForm.tenancy||!rentForm.amount)return;const today=new Date();const due=new Date(today.getFullYear(),today.getMonth(),parseInt(rentForm.dueDay));setRentSchedules([...rentSchedules,{id:Date.now(),...rentForm,status:due<today?'Overdue':'Pending'}]);setRentForm({tenancy:'',tenant:'',amount:'',dueDay:'1',frequency:'Monthly',method:'Bank Transfer'});setShowAddRent(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add schedule</button>
                <button onClick={()=>setShowAddRent(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 100px 140px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Tenancy</span><span>Tenant</span><span>Amount</span><span>Due</span><span>Frequency</span><span>Status</span><span>Actions</span>
              </div>
              {rentSchedules.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>💷</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No rent schedules yet</div><div style={{fontSize:13}}>Add a schedule to track rent collection.</div></div>):rentSchedules.map(r=>(
                <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 100px 140px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{r.tenancy}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{r.tenant||'—'}</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(r.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{r.dueDay}{['st','nd','rd'][parseInt(r.dueDay)-1]||'th'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{r.frequency}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block',background:r.status==='Paid'?'#ECFDF5':r.status==='Overdue'?'#FEE2E2':'#FEF3C7',color:r.status==='Paid'?'#10B981':r.status==='Overdue'?'#EF4444':'#F59E0B'}}>{r.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    {r.status!=='Paid'&&<button onClick={()=>setRentSchedules(rentSchedules.map(x=>x.id===r.id?{...x,status:'Paid'}:x))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#ECFDF5',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#10B981',fontWeight:600}}>✓ Paid</button>}
                    {r.status==='Paid'&&<button onClick={()=>setRentSchedules(rentSchedules.map(x=>x.id===r.id?{...x,status:'Pending'}:x))} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#667085'}}>Undo</button>}
                    <button onClick={()=>setRentSchedules(rentSchedules.filter(x=>x.id!==r.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Expenses'&&(
            <div>
              <div style={{background:'linear-gradient(135deg,'+ACCENT+',#1B4332)',borderRadius:12,padding:24,marginBottom:20,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.7,marginBottom:6}}>TOTAL SPENT · ALL TIME</div>
                  <div style={{fontSize:36,fontWeight:800}}>£{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                  <div style={{fontSize:13,opacity:0.6,marginTop:4}}>{expenses.length} records</div>
                </div>
                <button onClick={()=>setShowAddExpense(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#fff',color:ACCENT,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
                {['Property','Staff','Overhead'].map(cat=>(
                  <div key={cat} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>{cat}</div>
                    <div style={{fontSize:22,fontWeight:700,color:ACCENT}}>£{expenses.filter((e:any)=>e.category===cat).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {showAddExpense&&(
                <div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
                  <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add expense</h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Description *</label><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder="e.g. Repairs" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Vendor</label><input value={expForm.vendor||''} onChange={e=>setExpForm({...expForm,vendor:e.target.value})} placeholder="e.g. B&Q" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Category</label><select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['Property','Staff','Overhead','Maintenance','Marketing','Insurance','Utilities','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Amount (£)</label><input value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Date</label><input value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['Confirmed','Estimated'].map(s=><option key={s}>{s}</option>)}</select></div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{if(!expForm.description||!expForm.amount)return;setExpenses([...expenses,{id:Date.now(),...expForm}]);setExpForm({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed'});setShowAddExpense(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
                    <button onClick={()=>setShowAddExpense(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                  <span>Description</span><span>Vendor</span><span>Category</span><span>Amount</span><span>Date</span><span>Status</span><span></span>
                </div>
                {expenses.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🧾</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No expenses yet</div></div>):expenses.map((e:any)=>(
                  <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 100px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.description}</span>
                    <span style={{fontSize:12,color:'#344054'}}>{e.vendor||'—'}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054'}}>{e.category}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#EF4444'}}>£{parseFloat(e.amount).toLocaleString()}</span>
                    <span style={{fontSize:12,color:'#667085'}}>{e.date||'—'}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block' as const,background:e.status==='Confirmed'?'#ECFDF5':'#FEF3C7',color:e.status==='Confirmed'?'#10B981':'#F59E0B'}}>{e.status}</span>
                    <button onClick={()=>setExpenses(expenses.filter((x:any)=>x.id!==e.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section==='Banking'&&(
            <div>
              <div style={{display:'flex',gap:4,marginBottom:20,background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:4,width:'fit-content'}}>
                {['Overview','Bank Accounts','Transactions','Reconciliation','Cash Flow'].map(t=>(
                  <button key={t} onClick={()=>setBankingTab(t)} style={{padding:'7px 14px',borderRadius:7,border:'none',background:bankingTab===t?ACCENT:'transparent',color:bankingTab===t?'#fff':'#344054',fontSize:13,fontWeight:bankingTab===t?600:400,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
                ))}
              </div>
              {bankingTab==='Overview'&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>TOTAL CASH BALANCE</div>
                    <div style={{fontSize:32,fontWeight:800,color:ACCENT,marginBottom:4}}>£{bankAccounts.reduce((s:number,a:any)=>s+(parseFloat(a.balance)||0),0).toLocaleString()}</div>
                    <div style={{fontSize:13,color:'#98A2B3'}}>{bankAccounts.length===0?'No connected accounts':bankAccounts.length+' account(s)'}</div>
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Quick Actions</div>
                    {[{l:'Add Bank Account',d:'Manually add an account'},{l:'Add Transaction',d:'Record income or expense'},{l:'Reconcile',d:'Match transactions'}].map(a=>(
                      <div key={a.l} onClick={()=>{if(a.l==='Add Bank Account')setShowAddBank(true);if(a.l==='Add Transaction')setShowAddTx(true);if(a.l==='Reconcile')setBankingTab('Reconciliation')}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #F2F4F7',cursor:'pointer'}}>
                        <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.l}</div><div style={{fontSize:11,color:'#98A2B3'}}>{a.d}</div></div>
                        <span style={{color:'#667085'}}>›</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bankingTab==='Bank Accounts'&&(
                <div>
                  {showAddBank&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add bank account</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Account name *</label><input value={bankForm.name} onChange={e=>setBankForm({...bankForm,name:e.target.value})} placeholder="e.g. Barclays" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Type</label><select value={bankForm.type} onChange={e=>setBankForm({...bankForm,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['Current','Savings','Business','Credit'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Balance (£)</label><input value={bankForm.balance} onChange={e=>setBankForm({...bankForm,balance:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Currency</label><select value={bankForm.currency} onChange={e=>setBankForm({...bankForm,currency:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['GBP','USD','EUR','JMD'].map(c=><option key={c}>{c}</option>)}</select></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!bankForm.name)return;setBankAccounts([...bankAccounts,{id:Date.now(),...bankForm}]);setBankForm({name:'',type:'Current',balance:'',currency:'GBP'});setShowAddBank(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add account</button>
                      <button onClick={()=>setShowAddBank(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>)}
                  {bankAccounts.length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center' as const,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🏦</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16}}>No bank accounts</div><button onClick={()=>setShowAddBank(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button></div>):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                      {bankAccounts.map((a:any)=>(<div key={a.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{a.name}</div><button onClick={()=>setBankAccounts(bankAccounts.filter((x:any)=>x.id!==a.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:16}}>×</button></div><div style={{fontSize:28,fontWeight:800,color:ACCENT,marginBottom:4}}>£{parseFloat(a.balance||0).toLocaleString()}</div><div style={{fontSize:12,color:'#98A2B3'}}>{a.type} · {a.currency}</div></div>))}
                      <div onClick={()=>setShowAddBank(true)} style={{background:'#F9FAFB',borderRadius:12,border:'2px dashed #E4E7EC',padding:24,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#667085',fontSize:13}}>+ Add Account</div>
                    </div>
                  )}
                </div>
              )}
              {bankingTab==='Transactions'&&(
                <div>
                  {showAddTx&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:16}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add transaction</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Description *</label><input value={txForm.description} onChange={e=>setTxForm({...txForm,description:e.target.value})} placeholder="e.g. Rent received" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Amount (£)</label><input value={txForm.amount} onChange={e=>setTxForm({...txForm,amount:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Type</label><select value={txForm.type} onChange={e=>setTxForm({...txForm,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['Income','Expense'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Date</label><input value={txForm.date} onChange={e=>setTxForm({...txForm,date:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!txForm.description||!txForm.amount)return;setTransactions([...transactions,{id:Date.now(),...txForm,status:'Unreconciled'}]);setTxForm({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'});setShowAddTx(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
                      <button onClick={()=>setShowAddTx(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>)}
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #E4E7EC'}}><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{transactions.length} transactions</div><button onClick={()=>setShowAddTx(true)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button></div>
                    {transactions.length===0?<div style={{textAlign:'center' as const,padding:40,color:'#98A2B3',fontSize:13}}>No transactions yet</div>:transactions.map((t:any)=>(
                      <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 120px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                        <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date}</div></div>
                        <span style={{fontSize:13,fontWeight:600,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span>
                        <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:t.type==='Income'?'#ECFDF5':'#FEE2E2',color:t.type==='Income'?'#10B981':'#EF4444',fontWeight:600}}>{t.type}</span>
                        <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block' as const,background:t.status==='Reconciled'?'#ECFDF5':'#FEF3C7',color:t.status==='Reconciled'?'#10B981':'#F59E0B',cursor:'pointer'}} onClick={()=>setTransactions(transactions.map((x:any)=>x.id===t.id?{...x,status:x.status==='Reconciled'?'Unreconciled':'Reconciled'}:x))}>{t.status}</span>
                        <button onClick={()=>setTransactions(transactions.filter((x:any)=>x.id!==t.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bankingTab==='Reconciliation'&&(
                <div>
                  {transactions.filter((t:any)=>t.status==='Unreconciled').length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center' as const}}><div style={{fontSize:32,marginBottom:12}}>✅</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>All caught up</div></div>):transactions.filter((t:any)=>t.status==='Unreconciled').map((t:any)=>(
                    <div key={t.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date}</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:14,fontWeight:700,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span><button onClick={()=>setTransactions(transactions.map((x:any)=>x.id===t.id?{...x,status:'Reconciled'}:x))} style={{padding:'6px 14px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✓ Match</button></div>
                    </div>
                  ))}
                </div>
              )}
              {bankingTab==='Cash Flow'&&(()=>{
                const year = new Date().getFullYear()
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                const cfData = months.map((m:string,i:number)=>{
                  const inflow = transactions.filter((t:any)=>t.type==='Income'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
                  const outflow = transactions.filter((t:any)=>t.type==='Expense'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
                  return {m, inflow, outflow, net: inflow-outflow}
                })
                const maxVal = Math.max(...cfData.map((d:any)=>Math.max(d.inflow,d.outflow,Math.abs(d.net))),1)
                const W=700,H=180,PAD=32
                const x=(i:number)=>PAD+(i/(months.length-1))*(W-PAD*2)
                const y=(v:number)=>H-PAD-(v/maxVal)*(H-PAD*2)
                const line=(arr:number[])=>arr.map((v,i)=>(i===0?'M':'L')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')
                let cumulative=0
                return (
                  <div>
                    <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                        <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Cash Flow ({year})</div>
                        <div style={{display:'flex',gap:16,alignItems:'center'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#10B981',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Inflows</span></div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#EF4444',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Outflows</span></div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#5B7CFA',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Net Cash Flow</span></div>
                        </div>
                      </div>
                      <svg viewBox={'0 0 '+W+' '+H} style={{width:'100%',height:H,overflow:'visible'}}>
                        {[0,0.25,0.5,0.75,1].map((p:number,i:number)=>(<g key={i}><line x1={PAD} y1={y(maxVal*p)} x2={W-PAD} y2={y(maxVal*p)} stroke='#F2F4F7' strokeWidth='1'/><text x={PAD-4} y={y(maxVal*p)+4} textAnchor='end' fontSize='9' fill='#98A2B3'>£{(maxVal*p).toFixed(0)}</text></g>))}
                        {months.map((m:string,i:number)=>(<text key={m} x={x(i)} y={H-4} textAnchor='middle' fontSize='9' fill='#98A2B3'>{m}</text>))}
                        <path d={line(cfData.map((d:any)=>d.inflow))+' L'+x(11)+' '+(H-PAD)+' L'+x(0)+' '+(H-PAD)+' Z'} fill='#10B98115'/>
                        <path d={line(cfData.map((d:any)=>d.inflow))} fill='none' stroke='#10B981' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                        <path d={line(cfData.map((d:any)=>d.outflow))} fill='none' stroke='#EF4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                        <path d={line(cfData.map((d:any)=>d.net))} fill='none' stroke='#5B7CFA' strokeWidth='2' strokeDasharray='4 3' strokeLinecap='round' strokeLinejoin='round'/>
                        {cfData.map((d:any,i:number)=>(<g key={i}><circle cx={x(i)} cy={y(d.inflow)} r='3' fill='#10B981'/><circle cx={x(i)} cy={y(d.outflow)} r='3' fill='#EF4444'/><circle cx={x(i)} cy={y(d.net)} r='3' fill='#5B7CFA'/></g>))}
                      </svg>
                    </div>
                    <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                      <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                        <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
                      </div>
                      {cfData.map((d:any,i:number)=>{
                        cumulative+=d.net
                        return(<div key={d.m} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',gap:8,background:i%2===0?'#fff':'#FAFAFA'}}>
                          <span style={{fontWeight:500,color:'#101828'}}>{d.m} {year}</span>
                          <span style={{color:'#10B981'}}>£{d.inflow.toLocaleString()}</span>
                          <span style={{color:'#EF4444'}}>£{d.outflow.toLocaleString()}</span>
                          <span style={{fontWeight:600,color:d.net>=0?'#10B981':'#EF4444'}}>£{d.net.toLocaleString()}</span>
                          <span>£{cumulative.toLocaleString()}</span>
                        </div>)
                      })}
                      <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'14px 20px',background:'#F9FAFB',fontSize:13,fontWeight:700,color:'#101828',gap:8,borderTop:'2px solid #E4E7EC'}}>
                        <span>TOTAL {year}</span>
                        <span style={{color:'#10B981'}}>£{cfData.reduce((s:number,d:any)=>s+d.inflow,0).toLocaleString()}</span>
                        <span style={{color:'#EF4444'}}>£{cfData.reduce((s:number,d:any)=>s+d.outflow,0).toLocaleString()}</span>
                        <span>£{cfData.reduce((s:number,d:any)=>s+d.net,0).toLocaleString()}</span>
                        <span>—</span>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}

            </div>
          )}

          {section==='Reports'&&(
            <div>
              <div style={{background:'linear-gradient(135deg,'+ACCENT+',#1B4332)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.7,marginBottom:6}}>NET PROFIT · THIS MONTH</div>
                <div style={{fontSize:36,fontWeight:800}}>£{(annualRent/12-expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString()}</div>
                <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£{(annualRent/12).toLocaleString()} income · £{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()} costs</div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:20}}>
                {['P&L','Cash Flow','Forecast'].map(t=>(
                  <button key={t} onClick={()=>setReportTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid '+(reportTab===t?ACCENT:'#E4E7EC'),background:reportTab===t?ACCENT:'#fff',color:reportTab===t?'#fff':'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
                ))}
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const}}>
                  <span>Month</span><span>Income</span><span>Costs</span><span>Expenses</span><span>Net Profit</span>
                </div>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>(
                  <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                    <span>{m} {new Date().getFullYear()}</span><span style={{color:'#10B981'}}>£0</span><span style={{color:'#EF4444'}}>£0</span><span style={{color:'#F59E0B'}}>£0</span><span style={{fontWeight:600}}>£0</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(section==='Maintenance'||section==='Tasks'||section==='Messages'||section==='Documents'||section==='Notes'||section==='Contacts'||section==='Candidates'||section==='Bookings'||section==='Inventories'||section==='Units'||section==='Buildings'||section==='Tools'||section==='Community')&&(
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>🏗️</div>
              <div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>{section}</div>
              <div style={{fontSize:14,color:'#667085',marginBottom:20}}>This section is coming soon. Core modules (Properties, Tenants, Tenancies, Finance) are fully functional.</div>
              <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Request early access</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
