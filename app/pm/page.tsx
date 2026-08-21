'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WeatherWidget from '@/components/WeatherWidget'
import { supabase } from '../../lib/supabase'
import { useRole, getAllowedTab } from '@/lib/useRole'

const TABS = ['Dashboard','Properties','Units','Landlords','Tenants','Leases','Rent','Maintenance','Cleaning','Inspections','Documents','Expenses','Banking','Reports','Owner Reports','Statements','Messages']

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)$/i.test(url)
}

// attachment_url is stored as either a plain URL (legacy/single) or a
// JSON-encoded array of URLs (multi-attachment). This normalizes both.
function parseAttachments(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {
    // not JSON — treat as a single legacy URL
  }
  return val.startsWith('http') ? [val] : []
}

function FileUpload({ label, value, onChange, folder }: { label: string; value: string; onChange: (url: string) => void; folder: string }) {
  const [uploading, setUploading] = useState(false)
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFile(file, folder)
    if (url) onChange(url)
    setUploading(false)
  }
  return (
    <div>
      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }}>{label}</label>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <label style={{ flex:1, padding:'10px 12px', borderRadius:8, border:'2px dashed #D0D5DD', fontSize:13, color:'#667085', cursor:'pointer', display:'flex', alignItems:'center', gap:8, background:'#F9FAFB' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {uploading ? 'Uploading…' : value ? 'Replace file' : 'Upload file (PDF, JPG, PNG)'}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handle} style={{ display:'none' }} />
        </label>
        {value && <a href={value} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#3B4AFF', fontWeight:500, textDecoration:'none', whiteSpace:'nowrap' }}>View file</a>}
      </div>
      {value && <div style={{ fontSize:11, color:'#10B981', marginTop:4 }}>✓ File uploaded</div>}
    </div>
  )
}
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:500, margin:'0 16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}


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
function PMPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState('Dashboard')
  const { role, propertyIds, loading: roleLoading } = useRole()
  const allowedTab = getAllowedTab(role, 'pm')

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && TABS.includes(t)) setTab(t)
  }, [searchParams])
  useEffect(() => { if (allowedTab) setTab(allowedTab) }, [allowedTab])
  const [hasModule, setHasModule] = useState<boolean|null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [landlords, setLandlords] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [cleaning, setCleaning] = useState<any[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [extraBlocks, setExtraBlocks] = useState(0)
  const [isBundle, setIsBundle] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const propertyLimit = isBundle ? Infinity : 2 + extraBlocks * 2
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false,notes:''})
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBank, setShowAddBank] = useState(false)
  const [landlordPayments, setLandlordPayments] = useState<any[]>([])
  const [showAddLandlordPayment, setShowAddLandlordPayment] = useState(false)
  const [lpForm, setLpForm] = useState({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''})
  const [editingPaymentId, setEditingPaymentId] = useState<string|null>(null)
  const [msgLandlord, setMsgLandlord] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgAttachments, setMsgAttachments] = useState<string[]>([])
  const [uploadingMsg, setUploadingMsg] = useState(false)
  const [portalLandlord, setPortalLandlord] = useState<any>(null)
  const [portalPassword, setPortalPassword] = useState('')
  const [creatingPortal, setCreatingPortal] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [bankForm, setBankForm] = useState({name:'',type:'Current',balance:'',currency:'GBP'})
  const [txForm, setTxForm] = useState({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'})
  const [bankingTab, setBankingTab] = useState('Overview')
  const [reportTab, setReportTab] = useState('P&L')
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  // Poll for new landlord messages every 4s while the Messages tab is
  // open, mirroring the same pattern used on the Vacation Rentals
  // owner portal (owner_messages).
  useEffect(() => {
    if (tab !== 'Messages' || !msgLandlord?.id) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('pm_landlord_messages').select('*').eq('landlord_id', msgLandlord.id).order('created_at', { ascending: true })
      if (data) setMessages(data)
    }, 4000)
    return () => clearInterval(interval)
  }, [tab, msgLandlord?.id])

  useEffect(() => {
    if (roleLoading) return
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: sub } = await supabase.from('subscriptions').select('modules, pm_extra_blocks, plan').eq('user_id', user.id).single()
      const mods = (sub as any)?.modules ?? []
      setHasModule(mods.includes('pm') || mods.includes('dev'))
      setExtraBlocks((sub as any)?.pm_extra_blocks ?? 0)
      setIsBundle((sub as any)?.plan === 'bundle')
      await loadAll(user.id)
      setLoading(false)
    }
    init()
  }, [roleLoading, propertyIds])

  async function loadAll(uid?: string) {
    let userId = uid
    if (!userId) { const {data:{user}} = await supabase.auth.getUser(); userId = user?.id }
    const [p,u,l,t,le,pay,m,ins,docs,ex,cl,lp] = await Promise.all([
      supabase.from('pm_properties').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_units').select('*,pm_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_landlords').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_tenants').select('*,pm_properties(name),pm_units(unit_number)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_leases').select('*,pm_tenants(name),pm_units(unit_number),pm_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_rent_payments').select('*,pm_tenants(name),pm_properties(name)').eq('user_id',userId).order('due_date',{ascending:false}),
      supabase.from('pm_maintenance').select('*,pm_properties(name),pm_units(unit_number)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('pm_inspections').select('*,pm_properties(name),pm_units(unit_number)').eq('user_id',userId).order('scheduled_date',{ascending:true}),
      supabase.from('pm_documents').select('*,pm_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('office_expenses').select('*').eq('user_id',userId).order('date',{ascending:false}),
      supabase.from('pm_cleaning_tasks').select('*,pm_properties(name),pm_units(unit_number)').eq('user_id',userId).order('scheduled_date',{ascending:true}),
      supabase.from('pm_landlord_payments').select('*,pm_landlords(name),pm_properties(name)').eq('user_id',userId).order('due_date',{ascending:false}),
    ])
    let restrictedProps = p.data ?? []
    if (propertyIds.length > 0) restrictedProps = restrictedProps.filter((x: any) => propertyIds.includes(x.id))
    const restrictedIds = restrictedProps.map((x: any) => x.id)
    const maintData = propertyIds.length > 0 ? (m.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (m.data ?? [])
    const cleanData = propertyIds.length > 0 ? (cl.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (cl.data ?? [])
    setProperties(restrictedProps); setUnits(u.data??[]); setLandlords(l.data??[])
    setTenants(t.data??[]); setLeases(le.data??[]); setPayments(pay.data??[])
    setMaintenance(maintData); setInspections(ins.data??[]); setDocuments(docs.data??[])
    setExpenses(ex.data??[]); setCleaning(cleanData); setLandlordPayments(lp.data??[])
  }

  async function addExpense() {
    if (!expForm.description || !expForm.amount) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('office_expenses').insert({ ...expForm, amount: parseFloat(expForm.amount), user_id: user?.id })
    if (error) { alert(error.message); return }
    await loadAll()
    setExpForm({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false,notes:''})
    setShowAddExpense(false)
  }

  async function deleteExpense(id: string) {
    await supabase.from('office_expenses').delete().eq('id', id)
    setExpenses(expenses.filter((x:any)=>x.id!==id))
  }

  async function toggleExpensePaid(id: string, status: string) {
    await supabase.from('office_expenses').update({ status }).eq('id', id)
    setExpenses(expenses.map((x:any)=>x.id===id?{...x,status}:x))
  }

  async function sendLandlordMessage() {
    if((!newMsg.trim()&&msgAttachments.length===0)||!msgLandlord?.id)return
    setSendingMsg(true)
    const text=newMsg.trim()
    const attachmentJson=msgAttachments.length?JSON.stringify(msgAttachments):''
    setNewMsg('');setMsgAttachments([])
    const {data:{session}}=await supabase.auth.getSession()
    const res=await fetch('/api/admin/send-landlord-message',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token??''}`},
      body:JSON.stringify({landlord_id:msgLandlord.id,message:text,attachment_url:attachmentJson})
    })
    const result=await res.json()
    setSendingMsg(false)
    if(!res.ok){alert(result.error||'Could not send message');return}
    setMessages(prev=>[...prev,{landlord_id:msgLandlord.id,sender:'staff',message:text,attachment_url:attachmentJson,created_at:new Date().toISOString()}])
  }

  async function duplicateToNextMonth(e: any) {
    const { data: { user } } = await supabase.auth.getUser()
    let nextDate = null
    if (e.date) { const d = new Date(e.date); d.setMonth(d.getMonth()+1); nextDate = d.toISOString().slice(0,10) }
    const { error } = await supabase.from('office_expenses').insert({
      user_id: user?.id, description: e.description, vendor: e.vendor,
      category: e.category, amount: e.amount, date: nextDate, status: 'Unpaid', is_recurring: true, notes: e.notes,
    })
    if (error) { alert(error.message); return }
    await loadAll()
  }

  async function purchaseBlock() {
    setUpgrading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch('/api/add-property-block', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id, module: 'pm' }),
    })
    const json = await res.json()
    setUpgrading(false)
    if (!res.ok) { alert(json.error || 'Could not add more properties'); return }
    setShowUpgrade(false)
    await loadAll()
  }

  async function save(table: string, data: any) {
    if (table === 'pm_properties' && !editId && !isBundle && properties.length >= propertyLimit) {
      setModal(null); setShowUpgrade(true); return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) {
      const { error } = await supabase.from(table).update({ ...data }).eq('id', editId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from(table).insert([{ ...data, user_id: user?.id }])
      if (error) { alert(error.message); setSaving(false); return }
      notifyIfRelevant(table, data, user?.id)
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await loadAll()
  }

  function notifyIfRelevant(table: string, data: any, userId?: string) {
    if (!userId) return
    const propertyName = properties.find((p:any)=>p.id===data.property_id)?.name
    const configs: Record<string, { type: string; title: string }> = {
      pm_maintenance: { type: 'maintenance', title: `New maintenance ticket: ${data.title || 'Untitled'}` },
      pm_cleaning_tasks: { type: 'cleaning', title: `New cleaning task scheduled` },
    }
    const cfg = configs[table]
    if (!cfg) return
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      user_id: userId, module: 'pm', type: cfg.type, title: cfg.title, property_name: propertyName, property_id: data.property_id, link: '/pm',
    }) }).catch(()=>{})
  }

  function openEdit(modalName: string, record: any) {
    setForm(record)
    setEditId(record.id)
    setModal(modalName)
  }

  async function assignPropertiesToLandlord(landlordId: string, selectedPropertyIds: string[]) {
    setSaving(true)
    const toAssign = properties.filter(p => selectedPropertyIds.includes(p.id) && p.owner_id !== landlordId)
    const toUnassign = properties.filter(p => p.owner_id === landlordId && !selectedPropertyIds.includes(p.id))
    await Promise.all([
      ...toAssign.map(p => supabase.from('pm_properties').update({ owner_id: landlordId }).eq('id', p.id)),
      ...toUnassign.map(p => supabase.from('pm_properties').update({ owner_id: null }).eq('id', p.id)),
    ])
    await loadAll()
    setSaving(false)
  }

  async function del(table: string, id: string, setter: any) {
    if (!confirm('Delete?')) return
    await supabase.from(table).delete().eq('id', id)
    setter((prev: any[]) => prev.filter(x => x.id !== id))
  }

  const totalCollected = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount??0),0)
  const totalDue = payments.filter(p=>p.status==='pending').reduce((s,p)=>s+(p.amount??0),0)
  const arrears = payments.filter(p=>p.status==='overdue').reduce((s,p)=>s+(p.amount??0),0)
  const occupiedUnits = units.filter(u=>u.status==='occupied').length
  const occupancyRate = units.length ? Math.round((occupiedUnits/units.length)*100) : 0
  const in60 = new Date(Date.now()+60*24*60*60*1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  const expiringLeases = leases.filter(l=>l.end_date&&l.end_date<=in60&&l.status==='active')
  const openMaintenance = maintenance.filter(m=>m.status==='open'||m.status==='in_progress')

  if (hasModule===null||loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',sans-serif",color:'#98A2B3'}}>Loading...</div>

  if (!hasModule) return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{width:64,height:64,background:'#D1FAE5',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        <h2 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:8}}>Property Management</h2>
        <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:24}}>This module requires the Property Management add-on at £99/month.</p>
        <a href="/modules" style={{display:'inline-block',background:'#101828',color:'#fff',borderRadius:8,padding:'11px 24px',fontSize:14,fontWeight:600,textDecoration:'none'}}>Unlock Module →</a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 32px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,background:'#10B981',borderRadius:'50%'}}/>
            <h1 style={{fontSize:18,fontWeight:600,margin:0,color:'#101828'}}>Property Management</h1>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {tab==='Properties'&&<span style={{fontSize:12,color:'#98A2B3'}}>{properties.length} / {isBundle?'Unlimited':propertyLimit} properties</span>}
            {tab==='Properties'&&(!isBundle&&properties.length >= propertyLimit
              ? <button onClick={()=>setShowUpgrade(true)} style={{background:'#5B7CFA',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>Add more properties</button>
              : <button onClick={()=>{setModal('property');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Property</button>)}
            {tab==='Landlords'&&<button onClick={()=>{setModal('landlord');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Landlord</button>}
            {tab==='Tenants'&&<button onClick={()=>{setModal('tenant');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Tenant</button>}
            {tab==='Units'&&<button onClick={()=>{setModal('unit');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Unit</button>}
            {tab==='Leases'&&<button onClick={()=>{setModal('lease');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Lease</button>}
            {tab==='Rent'&&<button onClick={()=>{setModal('payment');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Record Payment</button>}
            {tab==='Maintenance'&&<button onClick={()=>{setModal('maintenance');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ New Ticket</button>}
            {tab==='Cleaning'&&<button onClick={()=>{setModal('cleaning');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Schedule Cleaning</button>}
            {tab==='Inspections'&&<button onClick={()=>{setModal('inspection');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Schedule</button>}
            {tab==='Documents'&&<button onClick={()=>{setModal('document');setForm({})}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Document</button>}
            {tab==='Expenses'&&<button onClick={()=>setShowAddExpense(true)} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Expense</button>}
            {tab==='Banking'&&<button onClick={()=>setShowAddBank(true)} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Bank Account</button>}
          </div>
        </div>
        <div style={{display:'flex',gap:2,overflowX:'auto'}}>
          {TABS.map(t=>{
            const locked = !!(allowedTab && t !== allowedTab)
            const badge = t==='Maintenance' ? maintenance.filter((m:any)=>m.status==='open').length : t==='Cleaning' ? cleaning.filter((c:any)=>c.status==='pending').length : 0
            return <button key={t} onClick={()=>!locked && setTab(t)} disabled={locked} title={locked?`Your role only has access to ${allowedTab}`:undefined} style={{padding:'10px 14px',background:'none',border:'none',cursor:locked?'not-allowed':'pointer',fontSize:13,fontWeight:500,color:locked?'#C1C9D2':tab===t?'#3B4AFF':'#667085',borderBottom:tab===t&&!locked?'2px solid #3B4AFF':'2px solid transparent',fontFamily:'inherit',whiteSpace:'nowrap'}}>{t}{badge>0&&!locked&&<span style={{marginLeft:6,background:t==='Maintenance'?'#EF4444':'#F59E0B',color:'#fff',fontSize:10,fontWeight:700,borderRadius:10,padding:'1px 6px'}}>{badge}</span>}{locked&&<span style={{marginLeft:5}}>🔒</span>}</button>
          })}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px'}}>

        {tab==='Dashboard'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
              {[
                {label:'Total Properties',value:properties.length,sub:`${units.length} units total`},
                {label:'Occupied Units',value:occupiedUnits,sub:`${occupancyRate}% occupancy`,green:true},
                {label:'Rent Collected',value:`£${totalCollected.toLocaleString()}`,sub:'This month',green:true},
                {label:'Arrears',value:`£${arrears.toLocaleString()}`,sub:`${payments.filter(p=>p.status==='overdue').length} overdue`,red:true},
              ].map((c:any)=>(
                <div key={c.label} style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'20px 24px'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:c.green?'#10B981':c.red?'#EF4444':'#101828',letterSpacing:'-0.02em'}}>{c.value}</div>
                  <div style={{fontSize:12,color:'#98A2B3',marginTop:4}}>{c.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
              {[
                {label:'Monthly Rent Due',value:`£${totalDue.toLocaleString()}`,dark:true},
                {label:'Expiring Leases',value:expiringLeases.length,sub:'Next 60 days',amber:true},
                {label:'Open Maintenance',value:openMaintenance.length,sub:`${maintenance.filter(m=>m.priority==='urgent').length} urgent`},
                {label:'Inspections Scheduled',value:inspections.filter(i=>i.status==='scheduled').length},
              ].map((c:any)=>(
                <div key={c.label} style={{background:c.dark?'#101828':'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'20px 24px'}}>
                  <div style={{fontSize:11,fontWeight:600,color:c.dark?'#6B7280':'#667085',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:c.amber?'#F59E0B':c.dark?'#fff':'#101828',letterSpacing:'-0.02em'}}>{c.value}</div>
                  <div style={{fontSize:12,color:c.dark?'#6B7280':'#98A2B3',marginTop:4}}>{c.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Rent Collection Trends</div>
                <div style={{display:'flex',gap:16,fontSize:11,color:'#667085',marginBottom:12}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:2,background:'#10B981',display:'inline-block',borderRadius:2}}></span>Collected</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:2,background:'#E4E7EC',display:'inline-block',borderRadius:2}}></span>Due</span>
                </div>
                <svg viewBox="0 0 300 80" style={{width:'100%'}}>
                  {(() => {
                    const year = new Date().getFullYear()
                    let cumRent = 0, cumExpense = 0
                    const monthly = Array.from({length:7},(_,i)=>{
                      const monthKey = `${year}-${String(i+1).padStart(2,'0')}`
                      cumRent += payments.filter((p:any)=>p.status==='paid' && p.due_date?.startsWith(monthKey)).reduce((s:number,p:any)=>s+(parseFloat(p.amount)||0),0)
                      cumExpense += expenses.filter((e:any)=>e.date?.startsWith(monthKey)).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
                      return { cumRent, cumExpense }
                    })
                    const maxVal = Math.max(1, ...monthly.map(m=>m.cumRent), ...monthly.map(m=>m.cumExpense))
                    const toY = (v:number) => 78 - (v/maxVal)*68
                    const rentPts = monthly.map((m,i)=>`${10+i*47},${toY(m.cumRent).toFixed(1)}`).join(' ')
                    const expPts = monthly.map((m,i)=>`${10+i*47},${toY(m.cumExpense).toFixed(1)}`).join(' ')
                    return (<>
                      <polyline points={rentPts} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points={expPts} fill="none" stroke="#E4E7EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                    </>)
                  })()}
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*56)} y={78} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Occupancy Trends</div>
                <div style={{display:'flex',gap:16,fontSize:11,color:'#667085',marginBottom:12}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#EEF0FF',display:'inline-block',borderRadius:2}}></span>Previous</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#3B4AFF',display:'inline-block',borderRadius:2}}></span>Current</span>
                </div>
                <svg viewBox="0 0 300 80" style={{width:'100%'}}>
                  {([{x:10,h:40,p:true},{x:55,h:45,p:true},{x:100,h:35,p:true},{x:145,h:55,p:false},{x:190,h:58,p:false},{x:235,h:62,p:false}] as any[]).map((b,i)=>(<rect key={i} x={b.x} y={75-b.h} width={30} height={b.h} rx="3" fill={b.p?'#EEF0FF':'#3B4AFF'}/>))}
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={15+(i*45)} y={79} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
            </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:14}}>Upcoming Lease Expiries</div>
                {expiringLeases.length===0?<div style={{color:'#98A2B3',fontSize:13}}>No expiring leases in next 60 days</div>:
                expiringLeases.slice(0,5).map(l=>{
                  const days=Math.round((new Date(l.end_date).getTime()-Date.now())/86400000)
                  return(
                    <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F2F4F7'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{l.pm_tenants?.name??'—'}</div>
                        <div style={{fontSize:11,color:'#667085'}}>{l.pm_properties?.name} {l.pm_units?.unit_number?`— ${l.pm_units.unit_number}`:''}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:days<=14?'#FEE2E2':'#FEF3C7',color:days<=14?'#DC2626':'#D97706'}}>{days}d</span>
                    </div>
                  )
                })}
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:14}}>Rent Arrears</div>
                {payments.filter(p=>p.status==='overdue').length===0?<div style={{color:'#98A2B3',fontSize:13}}>No outstanding arrears</div>:
                payments.filter(p=>p.status==='overdue').slice(0,5).map(p=>(
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F2F4F7'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{p.pm_tenants?.name??'—'}</div>
                      <div style={{fontSize:11,color:'#667085'}}>{p.pm_properties?.name}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:'#EF4444'}}>£{(p.amount??0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
              <WeatherWidget />
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:14}}>Quick Stats</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#667085'}}>Total Properties</span><span style={{fontWeight:600,color:'#101828'}}>{properties.length}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#667085'}}>Total Tenants</span><span style={{fontWeight:600,color:'#101828'}}>{tenants.length}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#667085'}}>Active Leases</span><span style={{fontWeight:600,color:'#10B981'}}>{leases.filter((l:any)=>l.status==='active').length}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#667085'}}>Open Maintenance</span><span style={{fontWeight:600,color:'#F59E0B'}}>{maintenance.filter((m:any)=>m.status==='open').length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='Properties'&&(
          <div>
            {properties.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No properties yet. Click + Add Property to get started.</div>:
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
              {properties.map(p=>(
                <div key={p.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div style={{fontWeight:600,fontSize:15,color:'#101828'}}>{p.name}</div>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:p.status==='active'?'#D1FAE5':'#F3F4F6',color:p.status==='active'?'#059669':'#6B7280'}}>{p.status}</span>
                  </div>
                  <div style={{fontSize:13,color:'#667085',marginBottom:12}}>{[p.address,p.city,p.country].filter(Boolean).join(', ')}</div>
                  <div style={{display:'flex',gap:16,fontSize:13,color:'#344054'}}>
                    <span>{units.filter(u=>u.property_id===p.id).length} units</span>
                    <span>£{(p.monthly_income??0).toLocaleString()}/mo</span>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={()=>openEdit('property',p)} style={{fontSize:12,color:'#3B4AFF',background:'none',border:'1px solid #3B4AFF',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>del('pm_properties',p.id,setProperties)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer',padding:0}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )}

        {tab==='Units'&&(
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 90px 80px 70px',padding:'12px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:12,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
              <span>Unit</span><span>Property</span><span>Tenant</span><span>Rent/mo</span><span>Lease End</span><span>Status</span><span></span>
            </div>
            {units.length===0?<div style={{textAlign:'center',padding:60,color:'#98A2B3',fontSize:14}}>No units yet</div>:
            units.map(u=>(
              <div key={u.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 90px 80px 70px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',alignItems:'center'}}>
                <span style={{fontWeight:500,color:'#101828'}}>{u.unit_number}</span>
                <span>{u.pm_properties?.name??'—'}</span>
                <span>{tenants.find(t=>t.unit_id===u.id)?.name??'—'}</span>
                <span>£{(u.monthly_rent??0).toLocaleString()}</span>
                <span>{u.lease_end??'—'}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:u.status==='occupied'?'#D1FAE5':'#F3F4F6',color:u.status==='occupied'?'#059669':'#6B7280'}}>{u.status}</span>
                <button onClick={()=>del('pm_units',u.id,setUnits)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {tab==='Landlords'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {landlords.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No landlords yet</div>:
            landlords.map(l=>(
              <div key={l.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'#EEF0FF',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:'#3B4AFF',flexShrink:0}}>{l.name.charAt(0)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828'}}>{l.name}</div>
                  <div style={{fontSize:12,color:'#667085',marginTop:2}}>{[l.email,l.phone].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{fontSize:13,color:'#667085'}}>{properties.filter(p=>p.owner_id===l.id).length} properties</div>
                {l.portal_user_id?(
                  <>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:'#D1FAE5',color:'#059669'}}>Portal Active</span>
                    <a href={`/pm-owner-portal?landlord_id=${l.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#5B7CFA',background:'none',border:'1px solid #5B7CFA',borderRadius:6,padding:'4px 10px',cursor:'pointer',textDecoration:'none'}}>View Portal</a>
                  </>
                ):(
                  <button onClick={()=>{setPortalLandlord(l);setPortalPassword('')}} style={{fontSize:12,color:'#5B7CFA',background:'none',border:'1px solid #5B7CFA',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Give Portal Access</button>
                )}
                <button onClick={()=>openEdit('landlord',l)} style={{fontSize:12,color:'#3B4AFF',background:'none',border:'1px solid #3B4AFF',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Edit</button>
                <button onClick={()=>del('pm_landlords',l.id,setLandlords)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {tab==='Tenants'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {tenants.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No tenants yet</div>:
            tenants.map(t=>(
              <div key={t.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:'#059669',flexShrink:0}}>{t.name.charAt(0)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828'}}>{t.name}</div>
                  <div style={{fontSize:12,color:'#667085',marginTop:2}}>{[t.email,t.phone].filter(Boolean).join(' · ')}</div>
                  <div style={{fontSize:12,color:'#98A2B3',marginTop:2}}>{t.pm_properties?.name}{t.pm_units?.unit_number?` — Unit ${t.pm_units.unit_number}`:''}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:t.status==='active'?'#D1FAE5':'#F3F4F6',color:t.status==='active'?'#059669':'#6B7280'}}>{t.status}</span>
                <button onClick={()=>openEdit('tenant',t)} style={{fontSize:12,color:'#3B4AFF',background:'none',border:'1px solid #3B4AFF',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Edit</button>
                <button onClick={()=>del('pm_tenants',t.id,setTenants)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {tab==='Leases'&&(
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 90px 80px 90px',padding:'12px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:12,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
              <span>Tenant</span><span>Property</span><span>Unit</span><span>Start</span><span>End</span><span>Rent</span><span>Status</span>
            </div>
            {leases.length===0?<div style={{textAlign:'center',padding:60,color:'#98A2B3',fontSize:14}}>No leases yet</div>:
            leases.map(l=>{
              const daysLeft=l.end_date?Math.round((new Date(l.end_date).getTime()-Date.now())/86400000):null
              return(
                <div key={l.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 90px 80px 90px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',alignItems:'center'}}>
                  <span style={{fontWeight:500,color:'#101828'}}>{l.pm_tenants?.name??'—'}</span>
                  <span>{l.pm_properties?.name??'—'}</span>
                  <span>{l.pm_units?.unit_number??'—'}</span>
                  <span>{l.start_date??'—'}</span>
                  <span style={{color:daysLeft!==null&&daysLeft<=30?'#EF4444':'inherit'}}>{l.end_date??'—'}</span>
                  <span>£{(l.monthly_rent??0).toLocaleString()}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:l.status==='active'?'#D1FAE5':'#FEE2E2',color:l.status==='active'?'#059669':'#DC2626'}}>{l.status}</span>
                </div>
              )
            })}
          </div>
        )}

        {tab==='Rent'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
              {[{label:'Collected',value:`£${totalCollected.toLocaleString()}`,color:'#10B981'},{label:'Pending',value:`£${totalDue.toLocaleString()}`,color:'#F59E0B'},{label:'Overdue',value:`£${arrears.toLocaleString()}`,color:'#EF4444'}].map(c=>(
                <div key={c.label} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'20px 24px'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:c.color}}>{c.value}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 90px 90px 100px 90px 80px',padding:'12px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:12,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
                <span>Tenant</span><span>Property</span><span>Amount</span><span>Due Date</span><span>Method</span><span>Status</span><span></span>
              </div>
              {payments.length===0?<div style={{textAlign:'center',padding:60,color:'#98A2B3',fontSize:14}}>No payments recorded</div>:
              payments.map(p=>(
                <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 90px 90px 100px 90px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',alignItems:'center'}}>
                  <span style={{fontWeight:500,color:'#101828'}}>{p.pm_tenants?.name??'—'}</span>
                  <span>{p.pm_properties?.name??'—'}</span>
                  <span>£{(p.amount??0).toLocaleString()}</span>
                  <span>{p.due_date??'—'}</span>
                  <span style={{textTransform:'capitalize'}}>{(p.method??'').replace('_',' ')}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:p.status==='paid'?'#D1FAE5':p.status==='overdue'?'#FEE2E2':'#FEF3C7',color:p.status==='paid'?'#059669':p.status==='overdue'?'#DC2626':'#D97706'}}>{p.status}</span>
                  {p.status!=='paid'&&<button onClick={async()=>{await supabase.from('pm_rent_payments').update({status:'paid',paid_date:today}).eq('id',p.id);loadAll()}} style={{fontSize:11,fontWeight:600,color:'#10B981',background:'none',border:'1px solid #10B981',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Mark Paid</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='Maintenance'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {maintenance.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No maintenance tickets</div>:
            maintenance.map(m=>{
              const priColor=m.priority==='urgent'?'#EF4444':m.priority==='high'?'#F59E0B':'#3B4AFF'
              const priBg=m.priority==='urgent'?'#FEE2E2':m.priority==='high'?'#FEF3C7':'#EEF0FF'
              return(
                <div key={m.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto auto auto auto',alignItems:'center',gap:16}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:2}}>{m.title}</div>
                    <div style={{fontSize:12,color:'#667085'}}>{m.pm_properties?.name}{m.assigned_to?` · ${m.assigned_to}`:''}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:priBg,color:priColor,textTransform:'uppercase'}}>{m.priority}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:m.status==='open'?'#DBEAFE':m.status==='resolved'?'#D1FAE5':'#FEF3C7',color:m.status==='open'?'#2563EB':m.status==='resolved'?'#059669':'#D97706'}}>{m.status}</span>
                  <select value={m.status} onChange={async e=>{await supabase.from('pm_maintenance').update({status:e.target.value}).eq('id',m.id);loadAll()}} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #E4E7EC',fontSize:13,fontFamily:'inherit'}}>
                    <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                  </select>
                  <button onClick={()=>del('pm_maintenance',m.id,setMaintenance)} style={{fontSize:18,color:'#D1D5DB',background:'none',border:'none',cursor:'pointer'}}>×</button>
                </div>
              )
            })}
          </div>
        )}

        {tab==='Cleaning'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {cleaning.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No cleaning tasks scheduled</div>:
            cleaning.map(c=>(
              <div key={c.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto auto auto',alignItems:'center',gap:16}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:2}}>{c.pm_properties?.name??'—'}{c.pm_units?.unit_number?` — Unit ${c.pm_units.unit_number}`:''}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{c.scheduled_date??'—'}{c.notes?` · ${c.notes}`:''}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:c.status==='completed'?'#D1FAE5':c.status==='in_progress'?'#DBEAFE':'#FEF3C7',color:c.status==='completed'?'#059669':c.status==='in_progress'?'#2563EB':'#D97706',textTransform:'capitalize'}}>{c.status}</span>
                <select value={c.status} onChange={async e=>{await supabase.from('pm_cleaning_tasks').update({status:e.target.value}).eq('id',c.id);loadAll()}} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #E4E7EC',fontSize:13,fontFamily:'inherit'}}>
                  <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                </select>
                <button onClick={()=>del('pm_cleaning_tasks',c.id,setCleaning)} style={{fontSize:18,color:'#D1D5DB',background:'none',border:'none',cursor:'pointer'}}>×</button>
              </div>
            ))}
          </div>
        )}

        {tab==='Inspections'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {inspections.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No inspections scheduled</div>:
            inspections.map(i=>(
              <div key={i.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto auto auto',alignItems:'center',gap:16}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:2}}>{i.pm_properties?.name??'—'}{i.pm_units?.unit_number?` — Unit ${i.pm_units.unit_number}`:''}</div>
                  <div style={{fontSize:12,color:'#667085',textTransform:'capitalize'}}>{i.type} · {i.scheduled_date??'—'}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:i.status==='completed'?'#D1FAE5':i.status==='scheduled'?'#DBEAFE':'#FEF3C7',color:i.status==='completed'?'#059669':i.status==='scheduled'?'#2563EB':'#D97706',textTransform:'capitalize'}}>{i.status}</span>
                <select value={i.status} onChange={async e=>{await supabase.from('pm_inspections').update({status:e.target.value}).eq('id',i.id);loadAll()}} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #E4E7EC',fontSize:13,fontFamily:'inherit'}}>
                  <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                </select>
                <button onClick={()=>del('pm_inspections',i.id,setInspections)} style={{fontSize:18,color:'#D1D5DB',background:'none',border:'none',cursor:'pointer'}}>×</button>
              </div>
            ))}
          </div>
        )}

        {tab==='Documents'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {documents.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No documents yet</div>:
            documents.map(d=>(
              <div key={d.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:'#F2F4F7',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:'#101828'}}>{d.name}</div>
                  <div style={{fontSize:12,color:'#667085',textTransform:'capitalize',marginTop:2}}>{d.type}{d.pm_properties?` · ${d.pm_properties.name}`:''}</div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" style={{padding:'7px 14px',borderRadius:8,border:'1px solid #D0D5DD',fontSize:13,fontWeight:500,textDecoration:'none',color:'#344054'}}>View</a>
                <button onClick={()=>del('pm_documents',d.id,setDocuments)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #FEE2E2',background:'#FFF5F5',color:'#EF4444',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
              </div>
            ))}
          </div>
        )}


        {tab==='Expenses'&&(
          <div>
            <div style={{background:'linear-gradient(135deg,#101828,#1D2939)',borderRadius:12,padding:24,marginBottom:20,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.6,marginBottom:6}}>TOTAL SPENT · ALL TIME</div>
                <div style={{fontSize:36,fontWeight:800}}>£{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                <div style={{fontSize:13,opacity:0.6,marginTop:4}}>{expenses.length} records</div>
              </div>
              <button onClick={()=>setShowAddExpense(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#fff',color:'#101828',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {['Property','Utilities','Staff','Overhead'].map(cat=>(
                <div key={cat} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>{cat}</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#101828'}}>£{expenses.filter((e:any)=>e.category===cat).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {showAddExpense&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:20}}>
                <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add expense</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Description *</label><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder="e.g. Cleaning supplies" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Vendor</label><input value={expForm.vendor} onChange={e=>setExpForm({...expForm,vendor:e.target.value})} placeholder="e.g. Amazon" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Category</label><select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Property','Staff','Overhead','Maintenance','Marketing','Insurance','Utilities','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Amount (£)</label><input value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Date</label><input value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Paid','Unpaid'].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" id="is_recurring" checked={expForm.is_recurring} onChange={e=>setExpForm({...expForm,is_recurring:e.target.checked})}/><label htmlFor="is_recurring" style={{fontSize:13,color:'#344054',cursor:'pointer'}}>Recurring monthly bill</label></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={addExpense} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
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
                  <select value={e.status} onChange={ev=>toggleExpensePaid(e.id, ev.target.value)} style={{fontSize:11,fontWeight:600,padding:'3px 6px',borderRadius:4,border:'none',cursor:'pointer',background:e.status==='Paid'?'#ECFDF5':'#FEF3C7',color:e.status==='Paid'?'#10B981':'#F59E0B'}}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                  <button onClick={()=>duplicateToNextMonth(e)} title="Duplicate to next month" style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Next mo.</button>
                  <button onClick={()=>deleteExpense(e.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='Banking'&&(
          <div>
            <div style={{display:'flex',gap:4,marginBottom:20,background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:4,width:'fit-content'}}>
              {['Overview','Bank Accounts','Transactions','Reconciliation','Cash Flow'].map(t=>(
                <button key={t} onClick={()=>setBankingTab(t)} style={{padding:'7px 14px',borderRadius:7,border:'none',background:bankingTab===t?'#101828':'transparent',color:bankingTab===t?'#fff':'#344054',fontSize:13,fontWeight:bankingTab===t?600:400,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>
            {bankingTab==='Overview'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>TOTAL CASH BALANCE</div>
                  <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>£{bankAccounts.reduce((s:number,a:any)=>s+(parseFloat(a.balance)||0),0).toLocaleString()}</div>
                  <div style={{fontSize:13,color:'#98A2B3'}}>{bankAccounts.length===0?'No connected accounts':bankAccounts.length+' account(s)'}</div>
                </div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Quick Actions</div>
                  {[{l:'Add Bank Account',d:'Connect or manually add'},{l:'Add Transaction',d:'Record income or expense'},{l:'Reconcile',d:'Match transactions'}].map(a=>(
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
                {showAddBank&&(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:20}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add bank account</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Account name *</label><input value={bankForm.name} onChange={e=>setBankForm({...bankForm,name:e.target.value})} placeholder="e.g. Barclays Business" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Type</label><select value={bankForm.type} onChange={e=>setBankForm({...bankForm,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Current','Savings','Business','Credit'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Balance (£)</label><input value={bankForm.balance} onChange={e=>setBankForm({...bankForm,balance:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Currency</label><select value={bankForm.currency} onChange={e=>setBankForm({...bankForm,currency:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['GBP','USD','EUR','JMD'].map(c=><option key={c}>{c}</option>)}</select></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!bankForm.name)return;setBankAccounts([...bankAccounts,{id:Date.now(),...bankForm}]);setBankForm({name:'',type:'Current',balance:'',currency:'GBP'});setShowAddBank(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add account</button>
                      <button onClick={()=>setShowAddBank(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>
                )}
                {bankAccounts.length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center' as const,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🏦</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16}}>No bank accounts</div><button onClick={()=>setShowAddBank(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button></div>):(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                    {bankAccounts.map((a:any)=>(<div key={a.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{a.name}</div><button onClick={()=>setBankAccounts(bankAccounts.filter((x:any)=>x.id!==a.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:16}}>×</button></div><div style={{fontSize:28,fontWeight:800,color:'#101828',marginBottom:4}}>£{parseFloat(a.balance||0).toLocaleString()}</div><div style={{fontSize:12,color:'#98A2B3'}}>{a.type} · {a.currency}</div></div>))}
                    <div onClick={()=>setShowAddBank(true)} style={{background:'#F9FAFB',borderRadius:12,border:'2px dashed #E4E7EC',padding:24,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#667085',fontSize:13}}>+ Add Account</div>
                  </div>
                )}
              </div>
            )}
            {bankingTab==='Transactions'&&(
              <div>
                {showAddTx&&(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:16}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add transaction</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Description *</label><input value={txForm.description} onChange={e=>setTxForm({...txForm,description:e.target.value})} placeholder="e.g. Rent payment" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Amount (£)</label><input value={txForm.amount} onChange={e=>setTxForm({...txForm,amount:e.target.value})} type="number" placeholder="0.00" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Type</label><select value={txForm.type} onChange={e=>setTxForm({...txForm,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Income','Expense'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Date</label><input value={txForm.date} onChange={e=>setTxForm({...txForm,date:e.target.value})} type="date" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!txForm.description||!txForm.amount)return;setTransactions([...transactions,{id:Date.now(),...txForm,status:'Unreconciled'}]);setTxForm({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'});setShowAddTx(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
                      <button onClick={()=>setShowAddTx(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #E4E7EC'}}><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{transactions.length} transactions</div><button onClick={()=>setShowAddTx(true)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button></div>
                  {transactions.length===0?<div style={{textAlign:'center' as const,padding:40,color:'#98A2B3',fontSize:13}}>No transactions yet</div>:transactions.map((t:any)=>(
                    <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 100px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
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
                {transactions.filter((t:any)=>t.status==='Unreconciled').length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center' as const,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>✅</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>All caught up</div><div style={{fontSize:13}}>No transactions waiting for review.</div></div>):transactions.filter((t:any)=>t.status==='Unreconciled').map((t:any)=>(
                  <div key={t.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:14,fontWeight:700,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span><button onClick={()=>setTransactions(transactions.map((x:any)=>x.id===t.id?{...x,status:'Reconciled'}:x))} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'#101828',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✓ Match</button></div>
                  </div>
                ))}
              </div>
            )}
                        {bankingTab==='Cash Flow'&&(
              <CashFlowTab transactions={transactions} />
            )}

          </div>
        )}

        {tab==='Reports'&&(() => {
          const year = new Date().getFullYear()
          const thisMonthKey = new Date().toISOString().slice(0,7)
          const pnlByMonth = Array.from({length:12},(_,i)=>{
            const monthKey = `${year}-${String(i+1).padStart(2,'0')}`
            const income = payments.filter((p:any)=>p.status==='paid' && p.due_date?.startsWith(monthKey)).reduce((s:number,p:any)=>s+(parseFloat(p.amount)||0),0)
            const costs = expenses.filter((e:any)=>e.date?.startsWith(monthKey)).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
            return { month: monthKey, income, costs, net: income-costs }
          })
          const thisMonth = pnlByMonth.find(m=>m.month===thisMonthKey) ?? { income:0, costs:0, net:0 }
          return (
          <div>
            <div style={{background:'linear-gradient(135deg,#101828,#1D2939)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.6,marginBottom:6}}>NET PROFIT · THIS MONTH</div>
              <div style={{fontSize:36,fontWeight:800}}>£{thisMonth.net.toLocaleString()}</div>
              <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£{thisMonth.income.toLocaleString()} income · £{thisMonth.costs.toLocaleString()} costs</div>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {['P&L','Cash Flow','Forecast'].map(t=>(
                <button key={t} onClick={()=>setReportTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid '+(reportTab===t?'#101828':'#E4E7EC'),background:reportTab===t?'#101828':'#fff',color:reportTab===t?'#fff':'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const}}>
                <span>Month</span><span>Income</span><span>Costs</span><span>Expenses</span><span>Net Profit</span>
              </div>
              {pnlByMonth.map((row,i)=>(
                <div key={row.month} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                  <span>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]} {year}</span>
                  <span style={{color:'#10B981'}}>£{row.income.toLocaleString()}</span>
                  <span style={{color:'#EF4444'}}>£{row.costs.toLocaleString()}</span>
                  <span style={{color:'#F59E0B'}}>£{row.costs.toLocaleString()}</span>
                  <span style={{fontWeight:600}}>£{row.net.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          )
        })()}


        {tab==='Owner Reports'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>💰</span><span style={{fontSize:12,color:'#667085'}}>Rent Collected</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>£{totalCollected.toLocaleString()}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>{payments.filter((p:any)=>p.status==='paid').length} payments</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                  const sorted=[...payments].filter((p:any)=>p.status==='paid').sort((a:any,b:any)=>(a.due_date||'').localeCompare(b.due_date||''))
                  const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                  const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).reduce((s:number,p:any)=>s+(parseFloat(p.amount)||0),0);return cum})
                  const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${45-(v/max)*39}`).join(' ')
                  const [lastX,lastY]=pts.split(' ').pop()!.split(',')
                  return (<><polyline points={pts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx={lastX} cy={lastY} r="3" fill="#10B981"/></>)
                })()}</svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>🏠</span><span style={{fontSize:12,color:'#667085'}}>Properties</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>{properties.length}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>{units.length} units</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                  const sorted=[...properties].sort((a:any,b:any)=>(a.created_at||'').localeCompare(b.created_at||''))
                  const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                  const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).length;return cum})
                  const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${45-(v/max)*39}`).join(' ')
                  return <polyline points={pts} fill="none" stroke="#5B7CFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                })()}</svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #FEE2E2',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>⚠️</span><span style={{fontSize:12,color:'#667085'}}>Arrears</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#EF4444',marginBottom:4}}>£{arrears.toLocaleString()}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>{payments.filter((p:any)=>p.status==='overdue').length} overdue</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                  const sorted=[...payments].filter((p:any)=>p.status==='overdue').sort((a:any,b:any)=>(a.due_date||'').localeCompare(b.due_date||''))
                  const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                  const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).reduce((s:number,p:any)=>s+(parseFloat(p.amount)||0),0);return cum})
                  const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${25-(v/max)*20}`).join(' ')
                  return <polyline points={pts} fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                })()}</svg>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:20,alignSelf:'flex-start'}}>Collection Rate</div>
                <svg viewBox="0 0 200 120" style={{width:'100%',maxWidth:200}}>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F3F4F6" strokeWidth="20" strokeLinecap="round"/>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#10B981" strokeWidth="20" strokeLinecap="round"/>
                  <text x="100" y="95" fontSize="22" fontWeight="800" fill="#101828" textAnchor="middle">{payments.length>0?Math.round(payments.filter((p:any)=>p.status==='paid').length/payments.length*100):0}%</text>
                  <text x="100" y="115" fontSize="10" fill="#98A2B3" textAnchor="middle">collection rate</text>
                </svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Owner vs Management Split</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#667085'}}>Owner (80%)</span><span style={{fontSize:13,fontWeight:600,color:'#10B981'}}>£{Math.round(totalCollected*0.8).toLocaleString()}</span></div><div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:'#10B981',borderRadius:4,width:'80%'}}></div></div></div>
                  <div><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#667085'}}>Management (20%)</span><span style={{fontSize:13,fontWeight:600,color:'#5B7CFA'}}>£{Math.round(totalCollected*0.2).toLocaleString()}</span></div><div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:'#5B7CFA',borderRadius:4,width:'20%'}}></div></div></div>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Upcoming Payments Due</div>
                {payments.filter((p:any)=>p.status==='pending').length===0?(<div style={{color:'#98A2B3',fontSize:13}}>No pending payments</div>):payments.filter((p:any)=>p.status==='pending').slice(0,4).map((p:any)=>(<div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828',fontWeight:500}}>{p.pm_tenants?.name??'Tenant'}</span><span style={{color:'#F59E0B',fontWeight:600}}>£{(p.amount??0).toLocaleString()}</span></div>))}
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Recent Finance</div>
                {payments.filter((p:any)=>p.status==='paid').slice(0,4).map((p:any)=>(<div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828'}}>{p.pm_tenants?.name??'Tenant'} — rent</span><span style={{color:'#10B981',fontWeight:600}}>+£{(p.amount??0).toLocaleString()}</span></div>))}
                {payments.filter((p:any)=>p.status==='paid').length===0&&<div style={{color:'#98A2B3',fontSize:13}}>No recent payments</div>}
              </div>
            </div>
          </div>
        )}

        {tab==='Statements'&&(() => {
          const today = new Date().toISOString().slice(0,10)
          const totalPaid = landlordPayments.filter((p:any)=>p.paid_date).reduce((s:number,p:any)=>s+(parseFloat(p.amount)||0),0)
          const overdueCount = landlordPayments.filter((p:any)=>!p.paid_date && p.due_date && p.due_date < today).length
          const onTimeCount = landlordPayments.filter((p:any)=>p.paid_date && p.due_date && p.paid_date <= p.due_date).length
          const lateCount = landlordPayments.filter((p:any)=>p.paid_date && p.due_date && p.paid_date > p.due_date).length
          function statusFor(p:any) {
            if (!p.paid_date) return p.due_date && p.due_date < today ? {label:'Overdue',bg:'#FEE2E2',color:'#EF4444'} : {label:'Pending',bg:'#FEF3C7',color:'#D97706'}
            if (p.due_date && p.paid_date > p.due_date) return {label:'Paid Late',bg:'#FEF3C7',color:'#D97706'}
            return {label:'Paid On Time',bg:'#D1FAE5',color:'#059669'}
          }
          return (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}><div style={{fontSize:24,fontWeight:700,color:'#101828'}}>£{totalPaid.toLocaleString()}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Total Paid to Landlords</div></div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}><div style={{fontSize:24,fontWeight:700,color:'#059669'}}>{onTimeCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Paid On Time</div></div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}><div style={{fontSize:24,fontWeight:700,color:'#D97706'}}>{lateCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Paid Late</div></div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #FEE2E2',padding:20,textAlign:'center'}}><div style={{fontSize:24,fontWeight:700,color:'#EF4444'}}>{overdueCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Overdue</div></div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button onClick={()=>{setEditingPaymentId(null);setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''});setShowAddLandlordPayment(true)}} style={{background:'#101828',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add Payment to Landlord</button>
            </div>

            {showAddLandlordPayment&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:20}}>
                <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editingPaymentId?'Edit Payment':'Add Payment to Landlord'}</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Landlord</label><select style={inp} value={lpForm.landlord_id} onChange={e=>setLpForm({...lpForm,landlord_id:e.target.value})}><option value="">Select landlord…</option>{landlords.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div><label style={lbl}>Property</label><select style={inp} value={lpForm.property_id} onChange={e=>setLpForm({...lpForm,property_id:e.target.value})}><option value="">Select property…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label style={lbl}>Category</label><select style={inp} value={lpForm.category} onChange={e=>setLpForm({...lpForm,category:e.target.value})}>{['Rent Share','Utility Bill','Maintenance Reimbursement','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Amount (£)</label><input type="number" style={inp} value={lpForm.amount} onChange={e=>setLpForm({...lpForm,amount:e.target.value})} placeholder="0.00"/></div>
                  <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={lpForm.due_date} onChange={e=>setLpForm({...lpForm,due_date:e.target.value})}/></div>
                  <div><label style={lbl}>Paid Date (leave blank if not yet paid)</label><input type="date" style={inp} value={lpForm.paid_date} onChange={e=>setLpForm({...lpForm,paid_date:e.target.value})}/></div>
                  <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><input style={inp} value={lpForm.notes} onChange={e=>setLpForm({...lpForm,notes:e.target.value})} placeholder="Optional"/></div>
                  <div style={{gridColumn:'span 2'}}><FileUpload label="Receipt (photo or PDF)" value={lpForm.receipt_url} onChange={url=>setLpForm({...lpForm,receipt_url:url})} folder="landlord-payment-receipts" /></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={async ()=>{
                    if(!lpForm.landlord_id||!lpForm.amount)return
                    const {data:{user}}=await supabase.auth.getUser()
                    const payload={...lpForm,amount:parseFloat(lpForm.amount),due_date:lpForm.due_date||null,paid_date:lpForm.paid_date||null,receipt_url:lpForm.receipt_url||null}
                    const {error}=editingPaymentId
                      ? await supabase.from('pm_landlord_payments').update(payload).eq('id',editingPaymentId)
                      : await supabase.from('pm_landlord_payments').insert([{...payload,user_id:user?.id}])
                    if(error){alert(error.message);return}
                    setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''});setEditingPaymentId(null);setShowAddLandlordPayment(false);await loadAll()
                  }} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
                  <button onClick={()=>{setShowAddLandlordPayment(false);setEditingPaymentId(null);setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 110px 90px 90px 90px 120px 60px 90px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Landlord</span><span>Property</span><span>Category</span><span>Amount</span><span>Due</span><span>Paid</span><span>Status</span><span>Receipt</span><span></span>
              </div>
              {landlordPayments.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>💷</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No landlord payments logged yet</div><div style={{fontSize:13}}>Track rent shares and bills you pay to each landlord.</div></div>):landlordPayments.map((p:any)=>{
                const s=statusFor(p)
                return (
                <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 110px 90px 90px 90px 120px 60px 90px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{p.pm_landlords?.name??'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{p.pm_properties?.name??'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054'}}>{p.category}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>£{parseFloat(p.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{p.due_date??'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{p.paid_date??'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:s.bg,color:s.color,display:'inline-block'}}>{s.label}</span>
                  {p.receipt_url?(
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer">
                      <img src={p.receipt_url} alt="Receipt" style={{width:32,height:32,objectFit:'cover',borderRadius:6,border:'1px solid #E4E7EC'}} onError={(e:any)=>{e.target.style.display='none';e.target.nextSibling.style.display='inline'}}/>
                      <span style={{display:'none',fontSize:11,color:'#5B7CFA',textDecoration:'underline'}}>View</span>
                    </a>
                  ):<span style={{fontSize:11,color:'#D0D5DD'}}>—</span>}
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{
                      setLpForm({landlord_id:p.landlord_id??'',property_id:p.property_id??'',category:p.category??'Rent Share',amount:String(p.amount??''),due_date:p.due_date??'',paid_date:p.paid_date??'',notes:p.notes??'',receipt_url:p.receipt_url??''})
                      setEditingPaymentId(p.id)
                      setShowAddLandlordPayment(true)
                    }} style={{fontSize:11,color:'#3B4AFF',background:'none',border:'1px solid #3B4AFF',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                    <button onClick={async ()=>{await supabase.from('pm_landlord_payments').delete().eq('id',p.id);await loadAll()}} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {tab==='Messages'&&(
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,maxWidth:700}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>Messages</div>
            <div style={{marginBottom:16}}>
              <select
                value={msgLandlord?.id??''}
                onChange={async e=>{
                  const ll=landlords.find((l:any)=>l.id===e.target.value)
                  setMsgLandlord(ll??null)
                  if(!ll){setMessages([]);return}
                  const {data}=await supabase.from('pm_landlord_messages').select('*').eq('landlord_id',ll.id).order('created_at',{ascending:true})
                  setMessages(data??[])
                }}
                style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit'}}
              >
                <option value="">Select a landlord to message…</option>
                {landlords.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20,maxHeight:400,overflowY:'auto'}}>
              {!msgLandlord
                ? <div style={{textAlign:'center',padding:40,color:'#98A2B3',fontSize:14}}>Pick a landlord above to see the conversation</div>
                : messages.length===0
                ? <div style={{textAlign:'center',padding:40,color:'#98A2B3',fontSize:14}}>No messages yet</div>
                : messages.map((m:any,i:number)=>{
                  const isMine = m.sender==='staff'
                  return (
                  <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',justifyContent:isMine?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'70%',background:isMine?'#3B4AFF':'#F3F4F6',color:isMine?'#fff':'#101828',borderRadius:10,padding:'10px 14px',fontSize:13}}>
                      <div style={{fontSize:10,opacity:0.7,marginBottom:3,textTransform:'uppercase'}}>{isMine?'You':(msgLandlord?.name??'Landlord')}</div>
                      {parseAttachments(m.attachment_url).length>0&&(
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:m.message?8:4}}>
                          {parseAttachments(m.attachment_url).map((url:string,ai:number)=>(
                            isVideoUrl(url)
                              ? <video key={ai} src={url} controls style={{width:220,maxWidth:'100%',borderRadius:8,display:'block'}}/>
                              : <img key={ai} src={url} alt="attachment" style={{width:220,maxWidth:'100%',borderRadius:8,display:'block',cursor:'pointer',objectFit:'cover'}} onClick={()=>window.open(url,'_blank')}/>
                          ))}
                        </div>
                      )}
                      {m.message&&<div>{m.message}</div>}
                      <div style={{fontSize:11,opacity:0.7,marginTop:4}}>{m.created_at?.slice(0,16)}</div>
                    </div>
                  </div>
                  )
                })
              }
            </div>
            {msgLandlord&&(
              <div>
                {msgAttachments.length>0&&(
                  <div style={{marginBottom:8,display:'flex',flexWrap:'wrap',gap:10}}>
                    {msgAttachments.map((url,ai)=>(
                      <div key={ai} style={{position:'relative'}}>
                        {isVideoUrl(url)
                          ? <video src={url} style={{height:90,width:90,objectFit:'cover',borderRadius:6,display:'block'}}/>
                          : <img src={url} alt="preview" style={{height:90,width:90,objectFit:'cover',borderRadius:6,display:'block'}}/>
                        }
                        <button onClick={()=>setMsgAttachments(prev=>prev.filter((_,idx)=>idx!==ai))} style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'2px solid #fff',fontSize:12,lineHeight:'16px',cursor:'pointer'}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',gap:8}}>
                  <label style={{display:'flex',alignItems:'center',justifyContent:'center',width:42,border:'1px solid #D0D5DD',borderRadius:8,cursor:'pointer',fontSize:16}}>
                    {uploadingMsg?'…':'📎'}
                    <input type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={async e=>{
                      const files=Array.from(e.target.files??[])
                      if(!files.length)return
                      setUploadingMsg(true)
                      const urls=await Promise.all(files.map(f=>uploadFile(f,'landlord-messages')))
                      setMsgAttachments(prev=>[...prev,...urls.filter((u):u is string=>!!u)])
                      setUploadingMsg(false)
                      e.target.value=''
                    }}/>
                  </label>
                  <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendLandlordMessage()}} placeholder="Type a message…" style={{flex:1,padding:'10px 14px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
                  <button onClick={sendLandlordMessage} disabled={sendingMsg||uploadingMsg} style={{padding:'10px 20px',background:'#3B4AFF',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:sendingMsg||uploadingMsg?0.6:1}}>Send</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modal==='property'&&(
        <Modal title={editId?"Edit Property":"Add Property"} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Property Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Harbour View Apartments"/></div>
            <div><label style={lbl}>Address</label><input style={inp} value={form.address??''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="123 Main Street"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>City</label><input style={inp} value={form.city??''} onChange={e=>setForm({...form,city:e.target.value})} placeholder="London"/></div>
              <div><label style={lbl}>Country</label><input style={inp} value={form.country??'United Kingdom'} onChange={e=>setForm({...form,country:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Monthly Income (£)</label><input type="number" style={inp} value={form.monthly_income??''} onChange={e=>setForm({...form,monthly_income:parseFloat(e.target.value)})} placeholder="0"/></div>
            <div><label style={lbl}>Landlord / Owner</label>
              <select style={{...inp,cursor:'pointer'}} value={form.owner_id??''} onChange={e=>setForm({...form,owner_id:e.target.value||null})}>
                <option value="">Unassigned</option>
                {landlords.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_properties',form)} disabled={saving||!form.name} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.name?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add Property'}</button>
          </div>
        </Modal>
      )}

      {showUpgrade && (
        <Modal title="Add more properties" onClose={()=>setShowUpgrade(false)}>
          <div style={{fontSize:14,color:'#344054',lineHeight:1.6,marginBottom:20}}>
            Your Property Management plan includes {propertyLimit} properties. Adding 2 more properties is <strong>£12/mo</strong>, billed on your existing subscription with proration for the rest of this cycle.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowUpgrade(false)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={purchaseBlock} disabled={upgrading} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#5B7CFA',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:upgrading?0.6:1}}>{upgrading?'Adding…':'Add 2 properties — £12/mo'}</button>
          </div>
        </Modal>
      )}

      {modal==='landlord'&&(
        <Modal title={editId?"Edit Landlord":"Add Landlord"} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John Smith"/></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="john@example.com"/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            <div><label style={lbl}>Address</label><input style={inp} value={form.address??''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="123 Main Street, London"/></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            <div><label style={lbl}>ID Type</label>
              <select style={{...inp,cursor:'pointer'}} value={form.id_type??''} onChange={e=>setForm({...form,id_type:e.target.value})}>
                <option value="">Select…</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <FileUpload label="ID Document" value={form.id_url??''} onChange={url=>setForm({...form,id_url:url})} folder="landlord-ids" />
            {editId && (
              <div style={{borderTop:'1px solid #F2F4F7',paddingTop:14,marginTop:4}}>
                <div style={{fontSize:13,fontWeight:600,color:'#344054',marginBottom:8}}>Assigned Properties</div>
                <div style={{border:'1px solid #EAECF0',borderRadius:8,maxHeight:160,overflowY:'auto',padding:4}}>
                  {properties.length===0 && <div style={{padding:10,fontSize:12,color:'#98A2B3'}}>No properties on file.</div>}
                  {properties.map(p=>{
                    const checked = p.owner_id === editId
                    return (
                      <label key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',fontSize:13,cursor:'pointer',borderRadius:6}}>
                        <input type="checkbox" checked={checked} onChange={()=>{
                          const currentIds = properties.filter(x=>x.owner_id===editId).map(x=>x.id)
                          const nextIds = checked ? currentIds.filter(id=>id!==p.id) : [...currentIds,p.id]
                          assignPropertiesToLandlord(editId, nextIds)
                        }} />
                        {p.name}{p.owner_id && p.owner_id!==editId ? <span style={{color:'#98A2B3',fontSize:11}}> (assigned to another landlord)</span> : ''}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{borderTop:'1px solid #F2F4F7',paddingTop:14,marginTop:4}}>
              <div style={{fontSize:13,fontWeight:600,color:'#344054',marginBottom:12}}>Bank Details</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><label style={lbl}>Bank Name</label><input style={inp} value={form.bank_name??''} onChange={e=>setForm({...form,bank_name:e.target.value})} placeholder="e.g. Barclays" /></div>
                  <div><label style={lbl}>Account Name</label><input style={inp} value={form.account_name??''} onChange={e=>setForm({...form,account_name:e.target.value})} placeholder="Full name on account" /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><label style={lbl}>Account Number</label><input style={inp} value={form.account_number??''} onChange={e=>setForm({...form,account_number:e.target.value})} placeholder="12345678" /></div>
                  <div><label style={lbl}>Sort Code</label><input style={inp} value={form.sort_code??''} onChange={e=>setForm({...form,sort_code:e.target.value})} placeholder="00-00-00" /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><label style={lbl}>IBAN</label><input style={inp} value={form.iban??''} onChange={e=>setForm({...form,iban:e.target.value})} placeholder="GB00 XXXX 0000 0000 0000 00" /></div>
                  <div><label style={lbl}>SWIFT / BIC</label><input style={inp} value={form.swift??''} onChange={e=>setForm({...form,swift:e.target.value})} placeholder="BARCGB22" /></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_landlords',form)} disabled={saving||!form.name} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.name?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add Landlord'}</button>
          </div>
        </Modal>
      )}

      {modal==='tenant'&&(
        <Modal title={editId?"Edit Tenant":"Add Tenant"} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Doe"/></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@example.com"/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit</label>
              <select style={{...inp,cursor:'pointer'}} value={form.unit_id??''} onChange={e=>setForm({...form,unit_id:e.target.value})}>
                <option value="">Select unit…</option>
                {units.filter(u=>!form.property_id||u.property_id===form.property_id).map(u=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
            <div><label style={lbl}>ID Type</label>
              <select style={{...inp,cursor:'pointer'}} value={form.id_type??''} onChange={e=>setForm({...form,id_type:e.target.value})}>
                <option value="">Select…</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <FileUpload label="ID Document" value={form.id_url??''} onChange={url=>setForm({...form,id_url:url})} folder="tenant-ids" />
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_tenants',form)} disabled={saving||!form.name} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.name?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add Tenant'}</button>
          </div>
        </Modal>
      )}

      {modal==='unit'&&(
        <Modal title={editId?"Edit Unit":"Add Unit"} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Property *</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit Number *</label><input style={inp} value={form.unit_number??''} onChange={e=>setForm({...form,unit_number:e.target.value})} placeholder="e.g. 1A, Unit 4, Flat 2"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Monthly Rent (£)</label><input type="number" style={inp} value={form.monthly_rent??''} onChange={e=>setForm({...form,monthly_rent:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Deposit (£)</label><input type="number" style={inp} value={form.deposit??''} onChange={e=>setForm({...form,deposit:parseFloat(e.target.value)})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Lease Start</label><input type="date" style={inp} value={form.lease_start??''} onChange={e=>setForm({...form,lease_start:e.target.value})}/></div>
              <div><label style={lbl}>Lease End</label><input type="date" style={inp} value={form.lease_end??''} onChange={e=>setForm({...form,lease_end:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={{...inp,cursor:'pointer'}} value={form.status??'vacant'} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="vacant">Vacant</option><option value="occupied">Occupied</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_units',form)} disabled={saving||!form.unit_number||!form.property_id} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.unit_number||!form.property_id?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add Unit'}</button>
          </div>
        </Modal>
      )}

      {modal==='lease'&&(
        <Modal title={editId?"Edit Lease":"Add Lease"} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Tenant *</label>
              <select style={{...inp,cursor:'pointer'}} value={form.tenant_id??''} onChange={e=>setForm({...form,tenant_id:e.target.value})}>
                <option value="">Select tenant…</option>
                {tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit</label>
              <select style={{...inp,cursor:'pointer'}} value={form.unit_id??''} onChange={e=>setForm({...form,unit_id:e.target.value})}>
                <option value="">Select unit…</option>
                {units.map(u=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={form.start_date??''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
              <div><label style={lbl}>End Date</label><input type="date" style={inp} value={form.end_date??''} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Monthly Rent (£)</label><input type="number" style={inp} value={form.monthly_rent??''} onChange={e=>setForm({...form,monthly_rent:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Deposit (£)</label><input type="number" style={inp} value={form.deposit??''} onChange={e=>setForm({...form,deposit:parseFloat(e.target.value)})}/></div>
            </div>
            <div><label style={lbl}>Document URL</label><input type="url" style={inp} value={form.document_url??''} onChange={e=>setForm({...form,document_url:e.target.value})} placeholder="https://..."/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_leases',form)} disabled={saving||!form.tenant_id} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.tenant_id?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add Lease'}</button>
          </div>
        </Modal>
      )}

      {modal==='payment'&&(
        <Modal title="Record Payment" onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Tenant *</label>
              <select style={{...inp,cursor:'pointer'}} value={form.tenant_id??''} onChange={e=>setForm({...form,tenant_id:e.target.value})}>
                <option value="">Select tenant…</option>
                {tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Amount (£) *</label><input type="number" style={inp} value={form.amount??''} onChange={e=>setForm({...form,amount:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.due_date??''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Method</label>
                <select style={{...inp,cursor:'pointer'}} value={form.method??'bank_transfer'} onChange={e=>setForm({...form,method:e.target.value})}>
                  <option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="cash">Cash</option><option value="standing_order">Standing Order</option>
                </select>
              </div>
              <div><label style={lbl}>Status</label>
                <select style={{...inp,cursor:'pointer'}} value={form.status??'pending'} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_rent_payments',form)} disabled={saving||!form.tenant_id||!form.amount} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.tenant_id||!form.amount?0.6:1}}>{saving?'Saving…':'Record Payment'}</button>
          </div>
        </Modal>
      )}

      {modal==='maintenance'&&(
        <Modal title="New Maintenance Ticket" onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Boiler not working"/></div>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Priority</label>
                <select style={{...inp,cursor:'pointer'}} value={form.priority??'medium'} onChange={e=>setForm({...form,priority:e.target.value})}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div><label style={lbl}>Assigned To</label><input style={inp} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})} placeholder="Contractor name"/></div>
            </div>
            <FileUpload label="Photo / Document" value={form.photo??''} onChange={url=>setForm({...form,photos:[url]})} folder="maintenance-photos" />
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_maintenance',form)} disabled={saving||!form.title} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.title?0.6:1}}>{saving?'Saving…':'Create Ticket'}</button>
          </div>
        </Modal>
      )}

      {modal==='cleaning'&&(
        <Modal title="Schedule Cleaning" onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit</label>
              <select style={{...inp,cursor:'pointer'}} value={form.unit_id??''} onChange={e=>setForm({...form,unit_id:e.target.value})}>
                <option value="">Select unit (optional)…</option>
                {units.filter(u=>u.property_id===form.property_id).map(u=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Scheduled Date</label><input type="date" style={inp} value={form.scheduled_date??''} onChange={e=>setForm({...form,scheduled_date:e.target.value})}/></div>
              <div><label style={lbl}>Assigned To</label><input style={inp} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})} placeholder="Cleaner name"/></div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_cleaning_tasks',form)} disabled={saving||!form.property_id} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.property_id?0.6:1}}>{saving?'Saving…':'Schedule'}</button>
          </div>
        </Modal>
      )}

      {modal==='inspection'&&(
        <Modal title="Schedule Inspection" onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Property *</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">Select property…</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Unit</label>
              <select style={{...inp,cursor:'pointer'}} value={form.unit_id??''} onChange={e=>setForm({...form,unit_id:e.target.value})}>
                <option value="">Select unit…</option>
                {units.map(u=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={lbl}>Type</label>
                <select style={{...inp,cursor:'pointer'}} value={form.type??'routine'} onChange={e=>setForm({...form,type:e.target.value})}>
                  <option value="routine">Routine</option><option value="move_in">Move In</option><option value="move_out">Move Out</option>
                </select>
              </div>
              <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.scheduled_date??''} onChange={e=>setForm({...form,scheduled_date:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            <FileUpload label="Photos / Report" value={form.photo??''} onChange={url=>setForm({...form,photos:[url]})} folder="inspection-photos" />
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_inspections',form)} disabled={saving||!form.property_id} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.property_id?0.6:1}}>{saving?'Saving…':'Schedule'}</button>
          </div>
        </Modal>
      )}

      {modal==='document'&&(
        <Modal title="Add Document" onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Document Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Tenancy Agreement"/></div>
            <FileUpload label="Upload File (PDF, Image) *" value={form.url??''} onChange={url=>setForm({...form,url:url})} folder="pm-documents" />
            <div><label style={lbl}>Type</label>
              <select style={{...inp,cursor:'pointer'}} value={form.type??'other'} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="lease">Lease</option><option value="id">ID Document</option><option value="inspection">Inspection Report</option><option value="statement">Statement</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={lbl}>Property</label>
              <select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}>
                <option value="">All properties</option>
                {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>save('pm_documents',form)} disabled={saving||!form.name||!form.url} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.name||!form.url?0.6:1}}>{saving?'Saving…':'Add Document'}</button>
          </div>
        </Modal>
      )}

      {portalLandlord&&(
        <Modal title={`Give ${portalLandlord.name} portal access`} onClose={()=>setPortalLandlord(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:13,color:'#667085'}}>This creates a login for {portalLandlord.name} so they can see their own properties and payments (with receipts). Share the email/password with them yourself.</div>
            <div><label style={lbl}>Email</label><input style={inp} value={portalLandlord.email??''} onChange={e=>setPortalLandlord({...portalLandlord,email:e.target.value})} placeholder="landlord@example.com"/></div>
            <div><label style={lbl}>Password</label><input style={inp} value={portalPassword} onChange={e=>setPortalPassword(e.target.value)} placeholder="min. 6 characters"/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setPortalLandlord(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={async ()=>{
              if(!portalLandlord.email||!portalPassword)return
              setCreatingPortal(true)
              const {data:{session}}=await supabase.auth.getSession()
              const res=await fetch('/api/create-landlord-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token??''}`},body:JSON.stringify({landlord_id:portalLandlord.id,email:portalLandlord.email,password:portalPassword})})
              const result=await res.json()
              setCreatingPortal(false)
              if(!res.ok){alert(result.error||'Could not create portal access');return}
              alert(`Portal access created. Share these details with ${portalLandlord.name}:\n\nEmail: ${portalLandlord.email}\nPassword: ${portalPassword}\nLogin at: helloopero.com/login`)
              setPortalLandlord(null);await loadAll()
            }} disabled={creatingPortal||!portalLandlord.email||!portalPassword} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:creatingPortal||!portalLandlord.email||!portalPassword?0.6:1}}>{creatingPortal?'Creating…':'Create Portal Access'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function PMPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>}>
      <PMPageInner />
    </Suspense>
  )
}
