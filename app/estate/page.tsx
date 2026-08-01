'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRole, getAllowedTab } from '@/lib/useRole'
const ACCENT = '#2D6A4F'
const NAV_BASICS = ['Dashboard','Properties','Units','Buildings','Tenants','Tenancies','Bookings','Inventories','Maintenance','Cleaning','Finance','Loans & Mortgages','Rent Collection','Vacancies','Expenses','Banking','Reports','Owner Reports','Documents']
const NAV_REST = ['Contacts','Maintenance','Tasks','Notes','Messages','Candidates','Tools','Community']


function CashFlowTab({transactions}:{transactions:any[]}) {
  const year = new Date().getFullYear()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const cfData = months.map((m,i)=>{
    const inflow = transactions.filter(t=>t.type==='Income'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
    const outflow = transactions.filter(t=>t.type==='Expense'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
    return {m, inflow, outflow, net: inflow-outflow}
  })
  const maxVal = Math.max(...cfData.map(d=>Math.max(d.inflow,d.outflow,Math.abs(d.net))),1)
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
          {[0,0.25,0.5,0.75,1].map((p,i)=>(
            <g key={i}>
              <line x1={PAD} y1={y(maxVal*p)} x2={W-PAD} y2={y(maxVal*p)} stroke='#F2F4F7' strokeWidth='1'/>
              <text x={PAD-4} y={y(maxVal*p)+4} textAnchor='end' fontSize='9' fill='#98A2B3'>{'£'}{(maxVal*p).toFixed(0)}</text>
            </g>
          ))}
          {months.map((m,i)=>(
            <text key={m} x={x(i)} y={H-4} textAnchor='middle' fontSize='9' fill='#98A2B3'>{m}</text>
          ))}
          <path d={line(cfData.map(d=>d.inflow))+' L'+x(11)+' '+(H-PAD)+' L'+x(0)+' '+(H-PAD)+' Z'} fill='#10B98115'/>
          <path d={line(cfData.map(d=>d.inflow))} fill='none' stroke='#10B981' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
          <path d={line(cfData.map(d=>d.outflow))} fill='none' stroke='#EF4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
          <path d={line(cfData.map(d=>d.net))} fill='none' stroke='#5B7CFA' strokeWidth='2' strokeDasharray='4 3' strokeLinecap='round' strokeLinejoin='round'/>
          {cfData.map((d,i)=>(
            <g key={i}>
              <circle cx={x(i)} cy={y(d.inflow)} r='3' fill='#10B981'/>
              <circle cx={x(i)} cy={y(d.outflow)} r='3' fill='#EF4444'/>
              <circle cx={x(i)} cy={y(d.net)} r='3' fill='#5B7CFA'/>
            </g>
          ))}
        </svg>
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
          <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
        </div>
        {cfData.map((d,i)=>{
          cumulative+=d.net
          return(
            <div key={d.m} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',gap:8,background:i%2===0?'#fff':'#FAFAFA'}}>
              <span style={{fontWeight:500,color:'#101828'}}>{d.m} {year}</span>
              <span style={{color:'#10B981'}}>£{d.inflow.toLocaleString()}</span>
              <span style={{color:'#EF4444'}}>£{d.outflow.toLocaleString()}</span>
              <span style={{fontWeight:600,color:d.net>=0?'#10B981':'#EF4444'}}>£{d.net.toLocaleString()}</span>
              <span>£{cumulative.toLocaleString()}</span>
            </div>
          )
        })}
        <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'14px 20px',background:'#F9FAFB',fontSize:13,fontWeight:700,color:'#101828',gap:8,borderTop:'2px solid #E4E7EC'}}>
          <span>TOTAL {year}</span>
          <span style={{color:'#10B981'}}>£{cfData.reduce((s,d)=>s+d.inflow,0).toLocaleString()}</span>
          <span style={{color:'#EF4444'}}>£{cfData.reduce((s,d)=>s+d.outflow,0).toLocaleString()}</span>
          <span>£{cfData.reduce((s,d)=>s+d.net,0).toLocaleString()}</span>
          <span>—</span>
        </div>
      </div>
    </div>
  )
}
export default function Page() {
  const [section, setSection] = useState('Dashboard')
  const { role } = useRole()
  const allowedTab = getAllowedTab(role, 'estate')

  useEffect(() => { window.scrollTo(0, 0) }, [section])
  useEffect(() => { if (allowedTab) setSection(allowedTab) }, [allowedTab])
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
  const [mortgages, setMortgages] = useState<any[]>([])
  const [showAddMortgage, setShowAddMortgage] = useState(false)
  const [mortgageForm, setMortgageForm] = useState({property:'',bank:'',amount:'',rate:'',startDate:'',endDate:'',duration:'25',monthlyPayment:'',insurance:'',type:'Repayment'})
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false})
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
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [showAddMaint, setShowAddMaint] = useState(false)
  const [maintForm, setMaintForm] = useState({title:'',property_id:'',description:'',priority:'medium'})
  const [cleaning, setCleaning] = useState<any[]>([])
  const [showAddCleaning, setShowAddCleaning] = useState(false)
  const [cleanForm, setCleanForm] = useState({property_id:'',scheduled_date:'',assigned_to:'',notes:''})

  const [news] = useState([
    {title:'New Tenant Verification Regulations for Landlords',tag:'LEGISLATION',body:'The Renters Rights Act has introduced restrictions on upfront rental payments, requiring landlords to adopt alternative affordability checks.'},
    {title:'Mortgage Market Reforms Proposed by FCA',tag:'MORTGAGE',body:'The Financial Conduct Authority is proposing significant changes to the mortgage market aimed at providing more flexibility for lenders.'},
    {title:'UK Housing Market Shows Signs of Stabilization',tag:'RENTING',body:'Data indicates that the property market may be stabilizing, with both buyers and sellers adjusting to the new landscape of higher borrowing costs.'},
  ])

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      loadAll(user.id)
    })
  },[])

  async function loadAll(uid?: string) {
    let userId = uid
    if (!userId) { const {data:{user}} = await supabase.auth.getUser(); userId = user?.id }
    const [p,t,tn,v,m,e,ba,tx,r,mt,cl] = await Promise.all([
      supabase.from('estate_properties').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_tenants').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_tenancies').select('*,estate_properties(name),estate_tenants(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_vacancies').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_mortgages').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('office_expenses').select('*').eq('user_id',userId).order('date',{ascending:false}),
      supabase.from('estate_bank_accounts').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_transactions').select('*').eq('user_id',userId).order('date',{ascending:false}),
      supabase.from('estate_rent_schedules').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_maintenance').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_cleaning_tasks').select('*,estate_properties(name)').eq('user_id',userId).order('scheduled_date',{ascending:true}),
    ])
    setProperties(p.data??[]); setTenants(t.data??[]); setTenancies(tn.data??[])
    setVacancies(v.data??[]); setMortgages(m.data??[]); setExpenses(e.data??[])
    setBankAccounts(ba.data??[]); setTransactions(tx.data??[]); setRentSchedules(r.data??[])
    setMaintenance(mt.data??[]); setCleaning(cl.data??[])
    setLoading(false)
  }

  async function saveRecord(table: string, data: any, id?: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (id) {
      const { error } = await supabase.from(table).update(data).eq('id', id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from(table).insert([{ ...data, user_id: user?.id }])
      if (error) { alert(error.message); return }
    }
    await loadAll()
  }

  async function delRecord(table: string, id: any) {
    await supabase.from(table).delete().eq('id', id)
    await loadAll()
  }

  async function duplicateExpenseToNextMonth(e: any) {
    const { data: { user } } = await supabase.auth.getUser()
    let nextDate = null
    if (e.date) { const d = new Date(e.date); d.setMonth(d.getMonth()+1); nextDate = d.toISOString().slice(0,10) }
    await supabase.from('office_expenses').insert({
      user_id: user?.id, description: e.description, vendor: e.vendor,
      category: e.category, amount: e.amount, date: nextDate, status: 'Unpaid', is_recurring: true,
    })
    await loadAll()
  }

  const addProperty = async () => {
    if(!prop.name) return
    await saveRecord('estate_properties', prop, editItem?.id)
    setEditItem(null)
    setProp({name:'',address:'',type:'Apartment',bedrooms:'1',rent:'',status:'Available'})
    setShowAddProperty(false)
  }
  const addTenant = async () => {
    if(!ten.name) return
    await saveRecord('estate_tenants', ten, editItem?.id)
    setEditItem(null)
    setTen({name:'',email:'',phone:'',dob:''})
    setShowAddTenant(false)
  }
  const addTenancy = async () => {
    if(!tenancy.property) return
    await saveRecord('estate_tenancies', {property_id:tenancy.property,tenant_id:tenancy.tenant,start_date:tenancy.start,end_date:tenancy.end,rent:tenancy.rent,deposit:tenancy.deposit,status:tenancy.status}, editItem?.id)
    setEditItem(null)
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
          {NAV_BASICS.map(s=>{
            const locked = !!(allowedTab && s !== allowedTab)
            return <button key={s} onClick={()=>!locked && setSection(s)} disabled={locked} title={locked?`Your role only has access to ${allowedTab}`:undefined} style={{...btnStyle(section===s && !locked), color:locked?'#C1C9D2':btnStyle(section===s).color, cursor:locked?'not-allowed':'pointer'}}>{s}{locked&&<span style={{marginLeft:5}}>🔒</span>}</button>
          })}
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
            {section==='Maintenance'&&<button onClick={()=>setShowAddMaint(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New ticket</button>}
            {section==='Cleaning'&&<button onClick={()=>setShowAddCleaning(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Schedule cleaning</button>}
            {section==='Owner Reports'&&<button style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Export Report</button>}
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
                        <div style={{width:'100%',background:i===months.length-1?ACCENT:ACCENT+'40',borderRadius:'2px 2px 0 0',height:'70%'}}/>
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
                    <button onClick={()=>delRecord('estate_properties',p.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
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
                    <button onClick={()=>delRecord('estate_tenants',t.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Tenancies'&&(<div>
            {showAddTenancy&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit tenancy':'Add tenancy'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property *</label><select value={tenancy.property} onChange={e=>setTenancy({...tenancy,property:e.target.value})} style={inputStyle}><option value="">Select property</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label style={labelStyle}>Tenant</label><select value={tenancy.tenant} onChange={e=>setTenancy({...tenancy,tenant:e.target.value})} style={inputStyle}><option value="">Select tenant</option>{tenants.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
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
              {tenancies.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tenancies yet</div><div style={{fontSize:13}}>Add your first tenancy to get started.</div></div>):tenancies.map((t:any)=>(
                <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.estate_properties?.name??'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{t.estate_tenants?.name||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.start_date||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.end_date||'—'}</span>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>{t.rent?'£'+t.rent:' —'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:t.status==='Active'?'#ECFDF5':t.status==='Pending'?'#FEF3C7':'#FEE2E2',color:t.status==='Active'?'#10B981':t.status==='Pending'?'#F59E0B':'#EF4444',display:'inline-block'}}>{t.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(t);setTenancy({property:t.property_id,tenant:t.tenant_id,start:t.start_date,end:t.end_date,rent:t.rent,deposit:t.deposit,status:t.status});setShowAddTenancy(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>delRecord('estate_tenancies',t.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Finance'&&(<div>
            {/* Rent paid progress */}
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:'#101828'}}>Rent Overview</div>
                <div style={{fontSize:12,color:'#667085'}}>{new Date().toLocaleString('default',{month:'long',year:'numeric'})}</div>
              </div>
              <div style={{display:'flex',gap:32,marginBottom:16}}>
                <div><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:4}}>Rent Paid</div><div style={{fontSize:32,fontWeight:800,color:'#10B981'}}>{rentSchedules.filter((r:any)=>r.status==='Paid').length}</div></div>
                <div><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:4}}>Late Rent</div><div style={{fontSize:32,fontWeight:800,color:'#EF4444'}}>{rentSchedules.filter((r:any)=>r.status==='Overdue').length}</div></div>
              </div>
              <div style={{height:10,background:'#F3F4F6',borderRadius:5,overflow:'hidden',marginBottom:8}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#10B981,#059669)',borderRadius:5,width:rentSchedules.length>0?(rentSchedules.filter((r:any)=>r.status==='Paid').length/rentSchedules.length*100)+'%':'0%'}}></div>
              </div>
              <div style={{display:'flex',gap:16,fontSize:12}}>
                <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:'50%',background:'#10B981',display:'inline-block'}}></span> Paid £{rentSchedules.filter((r:any)=>r.status==='Paid').reduce((s:number,r:any)=>s+(parseFloat(r.amount)||0),0).toLocaleString()}</span>
                <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block'}}></span> Overdue £{rentSchedules.filter((r:any)=>r.status==='Overdue').reduce((s:number,r:any)=>s+(parseFloat(r.amount)||0),0).toLocaleString()}</span>
              </div>
            </div>
            {/* Finance cards */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>Gross Income for the Month</div>
                <div style={{fontSize:28,fontWeight:800,color:'#101828'}}>£{monthlyRent.toLocaleString()}</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:8,background:'#ECFDF5',padding:'3px 8px',borderRadius:20}}><span style={{fontSize:11,color:'#10B981',fontWeight:600}}>↑ Active</span></div>
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>Monthly Expenses</div>
                <div style={{fontSize:28,fontWeight:800,color:'#EF4444'}}>£{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:8,background:'#FEE2E2',padding:'3px 8px',borderRadius:20}}><span style={{fontSize:11,color:'#EF4444',fontWeight:600}}>↓ Costs</span></div>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'2px solid '+ACCENT,padding:20,marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>Current Month Net Profit</div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:36,color:ACCENT,fontWeight:300}}>💰</span>
                <div>
                  <div style={{fontSize:36,fontWeight:800,color:ACCENT}}>£{(monthlyRent-expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString()}</div>
                  <div style={{fontSize:12,color:'#667085'}}>vs previous month</div>
                </div>
              </div>
            </div>
            {/* Period tabs */}
            <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid #E4E7EC'}}>
              {['Current Month','Last Month','Current Year','12 Months'].map((t:string)=>(
                <button key={t} style={{padding:'8px 16px',border:'none',background:'transparent',fontSize:12,fontWeight:600,color:t==='Current Month'?ACCENT:'#667085',borderBottom:t==='Current Month'?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>
            {/* Revenue by property */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Revenue by Property</div>
              {tenancies.filter((t:any)=>t.status==='Active').length===0?(<div style={{textAlign:'center' as const,padding:40,color:'#98A2B3'}}>No active tenancies yet</div>):tenancies.filter((t:any)=>t.status==='Active').map((t:any)=>(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <div style={{fontSize:13,color:'#344054',width:180,flexShrink:0}}>{t.property}</div>
                  <div style={{flex:1,background:'#F2F4F7',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:monthlyRent?(parseFloat(t.rent)/monthlyRent*100)+'%':'0%',height:'100%',background:ACCENT,borderRadius:4}}/></div>
                  <div style={{fontSize:13,fontWeight:600,color:ACCENT,width:80,textAlign:'right' as const}}>£{t.rent}/mo</div>
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
                <div><label style={labelStyle}>Property name *</label><select value={vacForm.property} onChange={e=>setVacForm({...vacForm,property:e.target.value})} style={inputStyle}><option value=''>Select property</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label style={labelStyle}>Room type</label><select value={vacForm.roomType} onChange={e=>setVacForm({...vacForm,roomType:e.target.value})} style={inputStyle}>{['Whole Unit','Single','Double','Suite','Studio'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Monthly rent (£)</label><input value={vacForm.rent} onChange={e=>setVacForm({...vacForm,rent:e.target.value})} type='number' placeholder='0.00' style={inputStyle}/></div>
                <div><label style={labelStyle}>Bedrooms</label><select value={vacForm.bedrooms} onChange={e=>setVacForm({...vacForm,bedrooms:e.target.value})} style={inputStyle}>{['Studio','1','2','3','4','5','6+'].map(b=><option key={b}>{b}</option>)}</select></div>
                <div><label style={labelStyle}>Available from</label><input value={vacForm.available} onChange={e=>setVacForm({...vacForm,available:e.target.value})} type='date' style={inputStyle}/></div>
                <div><label style={labelStyle}>Type</label><select value={vacForm.type} onChange={e=>setVacForm({...vacForm,type:e.target.value})} style={inputStyle}>{['Apartment','House','Studio','HMO','Commercial'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Description</label><input value={vacForm.description} onChange={e=>setVacForm({...vacForm,description:e.target.value})} placeholder='Brief description of the unit...' style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!vacForm.property)return;saveRecord('estate_vacancies',{property_id:vacForm.property,type:vacForm.type,room_type:vacForm.roomType,rent:vacForm.rent,available_date:vacForm.available,bedrooms:vacForm.bedrooms,description:vacForm.description});setVacForm({property:'',type:'Apartment',roomType:'Whole Unit',rent:'',available:'',bedrooms:'1',description:''});setShowAddVacancy(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add vacancy</button>
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
                        <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{v.estate_properties?.name??'—'}</div>
                        <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#ECFDF5',color:'#10B981'}}>{v.status}</span>
                      </div>
                      <div style={{fontSize:12,color:'#667085',marginBottom:4}}>{v.room_type} · {v.bedrooms} bed · {v.type}</div>
                      {v.description&&<div style={{fontSize:12,color:'#667085',marginBottom:8}}>{v.description}</div>}
                      <div style={{fontSize:18,fontWeight:700,color:ACCENT,marginBottom:8}}>£{parseFloat(v.rent||0).toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:'#667085'}}>/mo</span></div>
                      {v.available_date&&<div style={{fontSize:11,color:'#667085',marginBottom:12}}>Available from {v.available_date}</div>}
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>saveRecord('estate_vacancies',{status:v.status==='Available'?'Let Agreed':'Available'},v.id)} style={{flex:1,padding:'7px',borderRadius:6,border:'none',background:v.status==='Available'?ACCENT:'#F2F4F7',color:v.status==='Available'?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{v.status==='Available'?'Mark let':'Re-list'}</button>
                        <button onClick={()=>delRecord('estate_vacancies',v.id)} style={{padding:'7px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}

          {section==='Maintenance'&&(<div style={{display:'flex',flexDirection:'column',gap:8}}>
            {showAddMaint&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:12}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>New maintenance ticket</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Title *</div><input value={maintForm.title} onChange={e=>setMaintForm({...maintForm,title:e.target.value})} placeholder="e.g. Boiler not working" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Property</div><select value={maintForm.property_id} onChange={e=>setMaintForm({...maintForm,property_id:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',boxSizing:'border-box'}}><option value="">Select property…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Priority</div><select value={maintForm.priority} onChange={e=>setMaintForm({...maintForm,priority:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',boxSizing:'border-box'}}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Description</div><textarea value={maintForm.description} onChange={e=>setMaintForm({...maintForm,description:e.target.value})} rows={2} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!maintForm.title)return;saveRecord('estate_maintenance',maintForm);setMaintForm({title:'',property_id:'',description:'',priority:'medium'});setShowAddMaint(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create ticket</button>
                <button onClick={()=>setShowAddMaint(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {maintenance.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No maintenance tickets</div>:
            maintenance.map((m:any)=>{
              const priColor=m.priority==='urgent'?'#EF4444':m.priority==='high'?'#F59E0B':ACCENT
              const priBg=m.priority==='urgent'?'#FEE2E2':m.priority==='high'?'#FEF3C7':ACCENT+'18'
              return(
                <div key={m.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto auto auto auto',alignItems:'center',gap:16}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:2}}>{m.title}</div>
                    <div style={{fontSize:12,color:'#667085'}}>{m.estate_properties?.name??'—'}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:priBg,color:priColor,textTransform:'uppercase'}}>{m.priority}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:m.status==='open'?'#DBEAFE':m.status==='resolved'?'#D1FAE5':'#FEF3C7',color:m.status==='open'?'#2563EB':m.status==='resolved'?'#059669':'#D97706'}}>{m.status}</span>
                  <select value={m.status} onChange={e=>saveRecord('estate_maintenance',{status:e.target.value},m.id)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #E4E7EC',fontSize:13,fontFamily:'inherit'}}>
                    <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                  </select>
                  <button onClick={()=>delRecord('estate_maintenance',m.id)} style={{fontSize:18,color:'#D1D5DB',background:'none',border:'none',cursor:'pointer'}}>×</button>
                </div>
              )
            })}
          </div>)}

          {section==='Cleaning'&&(<div style={{display:'flex',flexDirection:'column',gap:8}}>
            {showAddCleaning&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:12}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Schedule cleaning</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Property</div><select value={cleanForm.property_id} onChange={e=>setCleanForm({...cleanForm,property_id:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',boxSizing:'border-box'}}><option value="">Select property…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Scheduled Date</div><input type="date" value={cleanForm.scheduled_date} onChange={e=>setCleanForm({...cleanForm,scheduled_date:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Assigned To</div><input value={cleanForm.assigned_to} onChange={e=>setCleanForm({...cleanForm,assigned_to:e.target.value})} placeholder="Cleaner name" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Notes</div><input value={cleanForm.notes} onChange={e=>setCleanForm({...cleanForm,notes:e.target.value})} placeholder="Optional" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!cleanForm.property_id)return;saveRecord('estate_cleaning_tasks',cleanForm);setCleanForm({property_id:'',scheduled_date:'',assigned_to:'',notes:''});setShowAddCleaning(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Schedule</button>
                <button onClick={()=>setShowAddCleaning(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {cleaning.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No cleaning tasks scheduled</div>:
            cleaning.map((c:any)=>(
              <div key={c.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto auto auto',alignItems:'center',gap:16}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:2}}>{c.estate_properties?.name??'—'}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{c.scheduled_date??'—'}{c.assigned_to?` · ${c.assigned_to}`:''}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:c.status==='completed'?'#D1FAE5':c.status==='in_progress'?'#DBEAFE':'#FEF3C7',color:c.status==='completed'?'#059669':c.status==='in_progress'?'#2563EB':'#D97706',textTransform:'capitalize'}}>{c.status}</span>
                <select value={c.status} onChange={e=>saveRecord('estate_cleaning_tasks',{status:e.target.value},c.id)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #E4E7EC',fontSize:13,fontFamily:'inherit'}}>
                  <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                </select>
                <button onClick={()=>delRecord('estate_cleaning_tasks',c.id)} style={{fontSize:18,color:'#D1D5DB',background:'none',border:'none',cursor:'pointer'}}>×</button>
              </div>
            ))}
          </div>)}

          {section==='Loans & Mortgages'&&(<div>
            {/* Summary stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
              {[
                {l:'Interest Paid',v:'£'+mortgages.reduce((s:number,m:any)=>s+(parseFloat(m.interest_paid||0)),0).toLocaleString(),c:'#667085'},
                {l:'Outstanding Capital',v:'£'+mortgages.reduce((s:number,m:any)=>s+(parseFloat(m.amount||0)-parseFloat(m.repaid_capital||0)),0).toLocaleString(),c:'#EF4444'},
                {l:'Monthly Payments',v:'£'+mortgages.reduce((s:number,m:any)=>s+(parseFloat(m.monthly_payment||0)),0).toLocaleString(),c:ACCENT},
              ].map((s:any)=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>{s.l}</div>
                  <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              {[
                {l:'Monthly Insurance',v:'£'+mortgages.reduce((s:number,m:any)=>s+(parseFloat(m.insurance||0)),0).toLocaleString()},
                {l:'Already Refunded',v:'£0'},
                {l:'Remaining to Pay',v:'£'+mortgages.reduce((s:number,m:any)=>s+(parseFloat(m.amount||0)-parseFloat(m.repaid_capital||0)),0).toLocaleString()},
              ].map((s:any)=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>{s.l}</div>
                  <div style={{fontSize:24,fontWeight:800,color:'#101828'}}>{s.v}</div>
                </div>
              ))}
            </div>
            {/* Add form */}
            {showAddMortgage&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add Loan / Mortgage</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Property *</label><select value={mortgageForm.property} onChange={e=>setMortgageForm({...mortgageForm,property:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}><option value="">Select property</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Bank / Lender</label><input value={mortgageForm.bank} onChange={e=>setMortgageForm({...mortgageForm,bank:e.target.value})} placeholder="e.g. Barclays" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Mortgage Amount (£)</label><input value={mortgageForm.amount} onChange={e=>setMortgageForm({...mortgageForm,amount:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Interest Rate (%)</label><input value={mortgageForm.rate} onChange={e=>setMortgageForm({...mortgageForm,rate:e.target.value})} type="number" placeholder="5.0" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Monthly Payment (£)</label><input value={mortgageForm.monthlyPayment} onChange={e=>setMortgageForm({...mortgageForm,monthlyPayment:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Duration (years)</label><input value={mortgageForm.duration} onChange={e=>setMortgageForm({...mortgageForm,duration:e.target.value})} type="number" placeholder="25" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Start Date</label><input value={mortgageForm.startDate} onChange={e=>setMortgageForm({...mortgageForm,startDate:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>End Date</label><input value={mortgageForm.endDate} onChange={e=>setMortgageForm({...mortgageForm,endDate:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Type</label><select value={mortgageForm.type} onChange={e=>setMortgageForm({...mortgageForm,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Repayment','Interest Only','Buy to Let','Commercial'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}}>Monthly Insurance (£)</label><input value={mortgageForm.insurance} onChange={e=>setMortgageForm({...mortgageForm,insurance:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!mortgageForm.property||!mortgageForm.amount)return;saveRecord('estate_mortgages',{property_id:mortgageForm.property,bank:mortgageForm.bank,amount:mortgageForm.amount,rate:mortgageForm.rate,start_date:mortgageForm.startDate,end_date:mortgageForm.endDate,duration:mortgageForm.duration,monthly_payment:mortgageForm.monthlyPayment,insurance:mortgageForm.insurance,type:mortgageForm.type});setMortgageForm({property:'',bank:'',amount:'',rate:'',startDate:'',endDate:'',duration:'25',monthlyPayment:'',insurance:'',type:'Repayment'});setShowAddMortgage(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add Loan</button>
                <button onClick={()=>setShowAddMortgage(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {/* Table */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 100px 100px 100px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Property</span><span>Bank</span><span>Amount</span><span>Rate</span><span>Monthly</span><span>Start</span><span>End</span><span>Type</span>
              </div>
              {mortgages.length===0?(
                <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>
                  <div style={{fontSize:40,marginBottom:12}}>🏦</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No loans or mortgages yet</div>
                  <div style={{fontSize:13}}>Add your first mortgage or loan to track repayments.</div>
                </div>
              ):mortgages.map((m:any)=>(
                <div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 100px 100px 100px 100px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{m.estate_properties?.name??'—'}</div>
                    <div style={{fontSize:11,color:'#667085'}}>{m.bank||'—'}</div>
                  </div>
                  <span style={{fontSize:12,color:'#344054'}}>{m.bank||'—'}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>£{parseFloat(m.amount||0).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{m.rate||'—'}%</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(m.monthly_payment||0).toLocaleString()}</span>
                  <span style={{fontSize:11,color:'#667085'}}>{m.start_date||'—'}</span>
                  <span style={{fontSize:11,color:'#667085'}}>{m.end_date||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:'#5B7CFA'}}>{m.type}</span>
                </div>
              ))}
            </div>
            {mortgages.length>0&&(
              <div style={{marginTop:12,background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Repayment Progress</div>
                {mortgages.map((m:any)=>{
                  const total = parseFloat(m.amount||0)
                  const repaid = parseFloat(m.repaid_capital||0)
                  const pct = total>0?Math.round(repaid/total*100):0
                  return(
                    <div key={m.id} style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{m.estate_properties?.name??'—'}</span>
                        <span style={{fontSize:12,color:'#667085'}}>{pct}% repaid · £{repaid.toLocaleString()} of £{total.toLocaleString()}</span>
                      </div>
                      <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:ACCENT,borderRadius:4,width:pct+'%'}}></div></div>
                    </div>
                  )
                })}
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
                <div><label style={labelStyle}>Tenancy *</label><select value={rentForm.tenancy} onChange={e=>setRentForm({...rentForm,tenancy:e.target.value})} style={inputStyle}><option value=''>Select tenancy</option>{tenancies.map((t:any)=><option key={t.id} value={t.id}>{t.estate_properties?.name} — {t.estate_tenants?.name}</option>)}</select></div>
                <div><label style={labelStyle}>Tenant name</label><input value={rentForm.tenant} onChange={e=>setRentForm({...rentForm,tenant:e.target.value})} placeholder='e.g. Jane Smith' style={inputStyle}/></div>
                <div><label style={labelStyle}>Amount (£)</label><input value={rentForm.amount} onChange={e=>setRentForm({...rentForm,amount:e.target.value})} type='number' placeholder='0.00' style={inputStyle}/></div>
                <div><label style={labelStyle}>Due day</label><select value={rentForm.dueDay} onChange={e=>setRentForm({...rentForm,dueDay:e.target.value})} style={inputStyle}>{Array.from({length:28},(_,i)=>String(i+1)).map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label style={labelStyle}>Frequency</label><select value={rentForm.frequency} onChange={e=>setRentForm({...rentForm,frequency:e.target.value})} style={inputStyle}>{['Monthly','Weekly','Quarterly'].map(f=><option key={f}>{f}</option>)}</select></div>
                <div><label style={labelStyle}>Method</label><select value={rentForm.method} onChange={e=>setRentForm({...rentForm,method:e.target.value})} style={inputStyle}>{['Bank Transfer','Direct Debit','Standing Order','Cash','Cheque'].map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!rentForm.tenancy||!rentForm.amount)return;const today=new Date();const due=new Date(today.getFullYear(),today.getMonth(),parseInt(rentForm.dueDay));saveRecord('estate_rent_schedules',{tenancy_id:rentForm.tenancy,tenant_id:rentForm.tenant,amount:rentForm.amount,due_day:rentForm.dueDay,frequency:rentForm.frequency,method:rentForm.method,status:due<today?'Overdue':'Pending'});setRentForm({tenancy:'',tenant:'',amount:'',dueDay:'1',frequency:'Monthly',method:'Bank Transfer'});setShowAddRent(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add schedule</button>
                <button onClick={()=>setShowAddRent(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 100px 140px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Tenancy</span><span>Tenant</span><span>Amount</span><span>Due</span><span>Frequency</span><span>Status</span><span>Actions</span>
              </div>
              {rentSchedules.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>💷</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No rent schedules yet</div><div style={{fontSize:13}}>Add a schedule to track rent collection.</div></div>):rentSchedules.map((r:any)=>(
                <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 100px 140px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{r.tenancy_id||'—'}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{r.tenant_id||'—'}</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(r.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{r.due_day}{['st','nd','rd'][parseInt(r.due_day)-1]||'th'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{r.frequency}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block',background:r.status==='Paid'?'#ECFDF5':r.status==='Overdue'?'#FEE2E2':'#FEF3C7',color:r.status==='Paid'?'#10B981':r.status==='Overdue'?'#EF4444':'#F59E0B'}}>{r.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    {r.status!=='Paid'&&<button onClick={()=>saveRecord('estate_rent_schedules',{status:'Paid'},r.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#ECFDF5',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#10B981',fontWeight:600}}>✓ Paid</button>}
                    {r.status==='Paid'&&<button onClick={()=>saveRecord('estate_rent_schedules',{status:'Pending'},r.id)} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#667085'}}>Undo</button>}
                    <button onClick={()=>delRecord('estate_rent_schedules',r.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
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
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {['Property','Utilities','Staff','Overhead'].map(cat=>(
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
                    <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>{['Paid','Unpaid'].map(s=><option key={s}>{s}</option>)}</select></div>
                    <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" id="is_recurring" checked={expForm.is_recurring} onChange={e=>setExpForm({...expForm,is_recurring:e.target.checked})}/><label htmlFor="is_recurring" style={{fontSize:13,color:'#344054',cursor:'pointer'}}>Recurring monthly bill</label></div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{if(!expForm.description||!expForm.amount)return;saveRecord('office_expenses',expForm);setExpForm({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false});setShowAddExpense(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
                    <button onClick={()=>setShowAddExpense(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 130px 110px 90px 90px 90px 70px 30px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                  <span>Description</span><span>Vendor</span><span>Category</span><span>Amount</span><span>Date</span><span>Status</span><span></span><span></span>
                </div>
                {expenses.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🧾</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No expenses yet</div></div>):expenses.map((e:any)=>(
                  <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 130px 110px 90px 90px 90px 70px 30px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.description}{e.is_recurring && <span title="Recurring monthly bill" style={{marginLeft:6,fontSize:11}}>🔁</span>}</span>
                    <span style={{fontSize:12,color:'#344054'}}>{e.vendor||'—'}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054'}}>{e.category}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#EF4444'}}>£{parseFloat(e.amount).toLocaleString()}</span>
                    <span style={{fontSize:12,color:'#667085'}}>{e.date||'—'}</span>
                    <select value={e.status} onChange={ev=>saveRecord('office_expenses',{status:ev.target.value},e.id)} style={{fontSize:11,fontWeight:600,padding:'3px 6px',borderRadius:4,border:'none',cursor:'pointer',background:e.status==='Paid'?'#ECFDF5':'#FEF3C7',color:e.status==='Paid'?'#10B981':'#F59E0B'}}>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                    <button onClick={()=>duplicateExpenseToNextMonth(e)} title="Duplicate to next month" style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Next mo.</button>
                    <button onClick={()=>delRecord('office_expenses',e.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
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
                      <button onClick={()=>{if(!bankForm.name)return;saveRecord('estate_bank_accounts',bankForm);setBankForm({name:'',type:'Current',balance:'',currency:'GBP'});setShowAddBank(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add account</button>
                      <button onClick={()=>setShowAddBank(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>)}
                  {bankAccounts.length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center' as const,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🏦</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16}}>No bank accounts</div><button onClick={()=>setShowAddBank(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button></div>):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                      {bankAccounts.map((a:any)=>(<div key={a.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{a.name}</div><button onClick={()=>delRecord('estate_bank_accounts',a.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:16}}>×</button></div><div style={{fontSize:28,fontWeight:800,color:ACCENT,marginBottom:4}}>£{parseFloat(a.balance||0).toLocaleString()}</div><div style={{fontSize:12,color:'#98A2B3'}}>{a.type} · {a.currency}</div></div>))}
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
                      <button onClick={()=>{if(!txForm.description||!txForm.amount)return;saveRecord('estate_transactions',{account_id:txForm.account,description:txForm.description,amount:txForm.amount,type:txForm.type,date:txForm.date,category:txForm.category,status:'Unreconciled'});setTxForm({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'});setShowAddTx(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
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
                        <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block' as const,background:t.status==='Reconciled'?'#ECFDF5':'#FEF3C7',color:t.status==='Reconciled'?'#10B981':'#F59E0B',cursor:'pointer'}} onClick={()=>saveRecord('estate_transactions',{status:t.status==='Reconciled'?'Unreconciled':'Reconciled'},t.id)}>{t.status}</span>
                        <button onClick={()=>delRecord('estate_transactions',t.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
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
                      <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:14,fontWeight:700,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span><button onClick={()=>saveRecord('estate_transactions',{status:'Reconciled'},t.id)} style={{padding:'6px 14px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✓ Match</button></div>
                    </div>
                  ))}
                </div>
              )}
                          {bankingTab==='Cash Flow'&&(
              <CashFlowTab transactions={transactions} />
            )}

            </div>
          )}

          {section==='Reports'&&(() => {
            const year = new Date().getFullYear()
            const thisMonthIdx = new Date().getMonth()
            const collectedRent = rentSchedules.filter((r:any)=>r.status==='Paid').reduce((s:number,r:any)=>s+(parseFloat(r.amount)||0),0)
            const totalExpenses = expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
            return (
            <div>
              <div style={{background:'linear-gradient(135deg,'+ACCENT+',#1B4332)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.7,marginBottom:6}}>NET PROFIT · THIS MONTH</div>
                <div style={{fontSize:36,fontWeight:800}}>£{(collectedRent-totalExpenses).toLocaleString()}</div>
                <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£{collectedRent.toLocaleString()} income · £{totalExpenses.toLocaleString()} costs</div>
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
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>{
                  const isCurrent = i===thisMonthIdx
                  const income = isCurrent ? collectedRent : 0
                  const costs = isCurrent ? totalExpenses : 0
                  return (
                  <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                    <span>{m} {year}</span><span style={{color:'#10B981'}}>£{income.toLocaleString()}</span><span style={{color:'#EF4444'}}>£{costs.toLocaleString()}</span><span style={{color:'#F59E0B'}}>£{costs.toLocaleString()}</span><span style={{fontWeight:600}}>£{(income-costs).toLocaleString()}</span>
                  </div>
                  )
                })}
              </div>
              <div style={{fontSize:12,color:'#98A2B3',marginTop:8}}>Rent schedules don't yet record which month a payment covers, so historical months show £0 until schedules include payment dates.</div>
            </div>
            )
          })()}


          {section==='Owner Reports'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>💰</span><span style={{fontSize:12,color:'#667085'}}>Annual Rent Roll</span></div>
                  <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>£{annualRent.toLocaleString()}</div>
                  <div style={{fontSize:12,color:'#98A2B3'}}>{tenancies.filter((t:any)=>t.status==='Active').length} active tenancies</div>
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,45 40,38 75,35 110,22 145,18 175,10 195,6" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="195" cy="6" r="3" fill="#10B981"/></svg>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>🏘️</span><span style={{fontSize:12,color:'#667085'}}>Properties</span></div>
                  <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>{properties.length}</div>
                  <div style={{fontSize:12,color:'#98A2B3'}}>{tenants.length} tenants</div>
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,45 40,40 75,42 110,28 145,24 175,14 195,10" fill="none" stroke="#5B7CFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>🏠</span><span style={{fontSize:12,color:'#667085'}}>Vacancies</span></div>
                  <div style={{fontSize:32,fontWeight:800,color:'#F59E0B',marginBottom:4}}>{vacancies.filter((v:any)=>v.status==='Available').length}</div>
                  <div style={{fontSize:12,color:'#98A2B3'}}>units available</div>
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,20 40,22 75,18 110,25 145,20 175,28 195,24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/></svg>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24,display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:20,alignSelf:'flex-start'}}>Occupancy Rate</div>
                  <svg viewBox="0 0 200 120" style={{width:'100%',maxWidth:200}}>
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F3F4F6" strokeWidth="20" strokeLinecap="round"/>
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={ACCENT} strokeWidth="20" strokeLinecap="round"/>
                    <text x="100" y="95" fontSize="22" fontWeight="800" fill="#101828" textAnchor="middle">{properties.length>0?Math.round(tenancies.filter((t:any)=>t.status==='Active').length/Math.max(properties.length,1)*100):0}%</text>
                    <text x="100" y="115" fontSize="10" fill="#98A2B3" textAnchor="middle">occupancy rate</text>
                  </svg>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Owner vs Management Split</div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#667085'}}>Owner (85%)</span><span style={{fontSize:13,fontWeight:600,color:'#10B981'}}>£{Math.round(annualRent*0.85).toLocaleString()}</span></div><div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:'#10B981',borderRadius:4,width:'85%'}}></div></div></div>
                    <div><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#667085'}}>Management (15%)</span><span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{Math.round(annualRent*0.15).toLocaleString()}</span></div><div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:ACCENT,borderRadius:4,width:'15%'}}></div></div></div>
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Active Tenancies</div>
                  {tenancies.filter((t:any)=>t.status==='Active').length===0?(<div style={{color:'#98A2B3',fontSize:13}}>No active tenancies</div>):tenancies.filter((t:any)=>t.status==='Active').slice(0,4).map((t:any)=>(<div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828',fontWeight:500}}>{t.tenant}</span><span style={{color:'#10B981',fontWeight:600}}>£{(parseFloat(t.rent)||0).toLocaleString()}/mo</span></div>))}
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Recent Finance</div>
                  {tenancies.filter((t:any)=>t.status==='Active').slice(0,4).map((t:any)=>(<div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828'}}>{t.tenant} — monthly rent</span><span style={{color:'#10B981',fontWeight:600}}>+£{(parseFloat(t.rent)||0).toLocaleString()}</span></div>))}
                  {tenancies.filter((t:any)=>t.status==='Active').length===0&&<div style={{color:'#98A2B3',fontSize:13}}>No active tenancies</div>}
                </div>
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
