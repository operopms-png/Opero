'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRole, getAllowedTab } from '@/lib/useRole'
import { downloadCsv } from '@/lib/export-csv'
import { BedDouble, Bath } from 'lucide-react'
import CompanyDocsPanel from '@/components/CompanyDocsPanel'
const ACCENT = '#3B4AFF'

async function uploadPropertyImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `estate-properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}

function parsePropertyImages(val: string | null | undefined): string[] {
  if (!val) return []
  try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed.filter(Boolean) } catch {}
  return val.startsWith('http') ? [val] : []
}

function PropertyImagePicker({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  return (
    <div>
      {urls.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          {urls.map((url, i) => (
            <div key={i} style={{ position:'relative' }}>
              <img src={url} alt="" style={{ height:70, width:70, objectFit:'cover', borderRadius:6, display:'block' }} />
              <button onClick={()=>onChange(urls.filter((_,idx)=>idx!==i))} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#DC2626', color:'#fff', border:'2px solid #fff', fontSize:11, lineHeight:'14px', cursor:'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px dashed #D0D5DD', borderRadius:8, cursor:'pointer', fontSize:13, color:'#667085' }}>
        {uploading ? 'Uploading…' : '📎 Add photos'}
        <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e=>{
          const files = Array.from(e.target.files ?? [])
          if (!files.length) return
          setUploading(true)
          const uploaded = await Promise.all(files.map(uploadPropertyImage))
          onChange([...urls, ...uploaded.filter((u): u is string => !!u)])
          setUploading(false)
          e.target.value = ''
        }} />
      </label>
    </div>
  )
}

function PropertyImageSlideshow({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={(e:any)=>e.target===e.currentTarget&&onClose()}>
      <button onClick={onClose} style={{ position:'absolute', top:20, right:24, background:'none', border:'none', color:'#fff', fontSize:28, cursor:'pointer' }}>×</button>
      {urls.length > 1 && <button onClick={()=>setIdx((idx-1+urls.length)%urls.length)} style={{ position:'absolute', left:24, background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:22, width:44, height:44, borderRadius:'50%', cursor:'pointer' }}>‹</button>}
      <img src={urls[idx]} alt="" style={{ maxHeight:'80vh', maxWidth:'80vw', objectFit:'contain', borderRadius:8 }} />
      {urls.length > 1 && <button onClick={()=>setIdx((idx+1)%urls.length)} style={{ position:'absolute', right:24, background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:22, width:44, height:44, borderRadius:'50%', cursor:'pointer' }}>›</button>}
      {urls.length > 1 && <div style={{ position:'absolute', bottom:24, color:'#fff', fontSize:13 }}>{idx+1} / {urls.length}</div>}
    </div>
  )
}

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
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
        {value && <a href={value} target="_blank" rel="noreferrer" style={{ fontSize:12, color:ACCENT, fontWeight:500, textDecoration:'none', whiteSpace:'nowrap' }}>View file</a>}
      </div>
      {value && <div style={{ fontSize:11, color:'#10B981', marginTop:4 }}>✓ File uploaded</div>}
    </div>
  )
}

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
const NAV_GROUPS = [
  { label: 'OVERVIEW', items: ['Dashboard'] },
  { label: 'LETTINGS', items: ['Properties','Units','Buildings','Tenants','Tenancies','Landlords','Vacancies','Viewings'] },
  { label: 'COMPLIANCE', items: ['Compliance','Tenant Checks','Inventories','Documents'] },
  { label: 'COMPANY', items: ['Company SOPs','Contract Templates'] },
  { label: 'OPERATIONS', items: ['Maintenance','Cleaning'] },
  { label: 'FINANCE', items: ['Finance','Rent Collection','Loans & Mortgages','Expenses','Banking'] },
  { label: 'REPORTS', items: ['Reports','Owner Reports','Landlord Statements'] },
]
const STUB_SECTIONS: string[] = []
const DOCUMENT_CATEGORIES = [
  { value:'lease', label:'Lease / Tenancy Agreement' },
  { value:'id', label:'ID Document' },
  { value:'landlord_agreement', label:'Landlord Agreement' },
  { value:'inspection', label:'Inspection Report' },
  { value:'statement', label:'Statement' },
  { value:'other', label:'Other' },
]
const VIEWING_STATUSES = ['Scheduled','Completed','Cancelled','No Show']
const INVENTORY_TYPES = ['Check-in','Check-out','Mid-term Inspection']
const COMPLIANCE_TYPES = ['Gas Safety Certificate','EICR','EPC','Fire Risk Assessment','PAT Testing','Legionella Assessment','HMO Licence','Planning Permission','Building Insurance','Other']
const BUSINESS_COMPLIANCE_TYPES = ['Client Money Protection (CMP)','Redress Scheme Membership (PRS/TPO)','Professional Indemnity Insurance','ICO Data Protection Registration','Anti-Money Laundering (AML) Registration','Business/Trading Licence','Public Liability Insurance','Health & Safety Policy','Other']


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
function complianceStatus(expiryDate?: string) {
  if (!expiryDate) return 'No Expiry'
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Expired'
  if (days <= 60) return 'Expiring Soon'
  return 'Valid'
}
const complianceStatusColor: Record<string,string> = { 'Expired':'#EF4444', 'Expiring Soon':'#F59E0B', 'Valid':'#10B981', 'No Expiry':'#98A2B3' }

export default function Page() {
  const [periodTab, setPeriodTab] = useState<'CURRENT_MONTH'|'LAST_MONTH'|'CURRENT_YEAR'|'12_MONTHS'>('CURRENT_MONTH')
  const [section, setSection] = useState('Dashboard')
  const { role, propertyIds, loading: roleLoading } = useRole()
  const allowedTab = getAllowedTab(role, 'estate')

  useEffect(() => { window.scrollTo(0, 0) }, [section])
  useEffect(() => { if (allowedTab) setSection(allowedTab) }, [allowedTab])
  const [loading, setLoading] = useState(true)
  const [extraBlocks, setExtraBlocks] = useState(0)
  const [isBundle, setIsBundle] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const propertyLimit = isBundle ? Infinity : 2 + extraBlocks * 2
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenancies, setTenancies] = useState<any[]>([])
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [viewingPhotos, setViewingPhotos] = useState<string[]|null>(null)
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [showAddTenancy, setShowAddTenancy] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [prop, setProp] = useState({name:'',address:'',type:'Apartment',bedrooms:'1',bathrooms:'1',rent:'',status:'Available',image_urls:'',owner_id:''})
  const [ten, setTen] = useState({name:'',email:'',phone:'',property_id:'',unit_id:'',id_type:'',id_url:'',status:'active'})
  const [tenancy, setTenancy] = useState({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active',document_url:''})
  const [landlords, setLandlords] = useState<any[]>([])
  const [sendingSignLink, setSendingSignLink] = useState<string|null>(null)
  const [contractTemplates, setContractTemplates] = useState<any[]>([])
  const [showContractPicker, setShowContractPicker] = useState<string|null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [editableContractText, setEditableContractText] = useState('')
  const [landlordPayments, setLandlordPayments] = useState<any[]>([])
  const [rtrChecks, setRtrChecks] = useState<any[]>([])
  const [bankChecks, setBankChecks] = useState<any[]>([])
  const [editingChecksTenancyId, setEditingChecksTenancyId] = useState<string|null>(null)
  const [rtrForm, setRtrForm] = useState({full_name:'',date_of_birth:'',current_address:'',check_type:'Online',document_type:'',share_code:'',ni_number:'',status:'Unlimited',check_date:'',checked_by:'',recheck_date:'',document_url:'',notes:''})
  const [bankCheckForm, setBankCheckForm] = useState({statement_start:'',statement_end:'',declared_income:'',income_regular:false,no_overdraft:false,no_bounced_payments:false,no_gambling_flags:false,status:'Passed',document_url:'',notes:'',checked_by:'',check_date:'',ai_assessment:'',ai_assessment_generated_at:''})
  const [generatingAssessment, setGeneratingAssessment] = useState(false)
  const [sendingAddresses, setSendingAddresses] = useState<any[]>([])
  const [selectedSendFrom, setSelectedSendFrom] = useState('')
  const [showAddSendAddress, setShowAddSendAddress] = useState(false)
  const [newSendAddress, setNewSendAddress] = useState({name:'',email:''})
  const [savingChecks, setSavingChecks] = useState(false)
  const [showAddLandlordPayment, setShowAddLandlordPayment] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string|null>(null)
  const [lpForm, setLpForm] = useState({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''})
  const [showAddLandlord, setShowAddLandlord] = useState(false)
  const [landlordForm, setLandlordForm] = useState({name:'',email:'',phone:'',address:'',bank_name:'',account_name:'',account_number:'',sort_code:'',notes:'',id_type:'',id_url:'',iban:'',swift:''})
  const [portalLandlord, setPortalLandlord] = useState<any>(null)
  const [portalPassword, setPortalPassword] = useState('')
  const [creatingPortal, setCreatingPortal] = useState(false)
  const [portalTenant, setPortalTenant] = useState<any>(null)
  const [tenantPortalPassword, setTenantPortalPassword] = useState('')
  const [creatingTenantPortal, setCreatingTenantPortal] = useState(false)
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
  const [rentForm, setRentForm] = useState({tenancy:'',amount:'',dueDay:'1',frequency:'Monthly',method:'Bank Transfer'})
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [showAddMaint, setShowAddMaint] = useState(false)
  const [maintForm, setMaintForm] = useState({title:'',property_id:'',description:'',priority:'medium',assigned_to:'',photos:[] as string[]})
  const [cleaning, setCleaning] = useState<any[]>([])
  const [showAddCleaning, setShowAddCleaning] = useState(false)
  const [cleanForm, setCleanForm] = useState({property_id:'',unit_id:'',scheduled_date:'',assigned_to:'',notes:''})
  const [complianceRecords, setComplianceRecords] = useState<any[]>([])
  const [showAddCompliance, setShowAddCompliance] = useState(false)
  const [complianceForm, setComplianceForm] = useState({scope:'property',property_id:'',type:COMPLIANCE_TYPES[0],reference:'',issued_date:'',expiry_date:'',notes:''})
  const [complianceScope, setComplianceScope] = useState<'property'|'business'>('property')
  const [buildings, setBuildings] = useState<any[]>([])
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [buildingForm, setBuildingForm] = useState({name:'',address:'',total_units:'',notes:''})
  const [units, setUnits] = useState<any[]>([])
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [unitForm, setUnitForm] = useState({building_id:'',property_id:'',unit_number:'',floor:'',bedrooms:'',bathrooms:'',status:'Vacant',notes:''})
  const [viewings, setViewings] = useState<any[]>([])
  const [showAddViewing, setShowAddViewing] = useState(false)
  const [viewingForm, setViewingForm] = useState({property_id:'',prospect_name:'',prospect_email:'',prospect_phone:'',scheduled_at:'',status:'Scheduled',notes:''})
  const [inventories, setInventories] = useState<any[]>([])
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [inventoryForm, setInventoryForm] = useState({property_id:'',tenancy_id:'',type:INVENTORY_TYPES[0],inspection_date:'',condition_summary:'',document_url:'',status:'Draft'})
  const [documents, setDocuments] = useState<any[]>([])
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [documentForm, setDocumentForm] = useState({property_id:'',landlord_id:'',tenant_id:'',name:'',category:DOCUMENT_CATEGORIES[0].value,file_url:''})
  const [documentLinkType, setDocumentLinkType] = useState('property')
  const [documentFilter, setDocumentFilter] = useState('All')

  const [news, setNews] = useState([
    {title:'New Tenant Verification Regulations for Landlords',tag:'LEGISLATION',body:'The Renters Rights Act has introduced restrictions on upfront rental payments, requiring landlords to adopt alternative affordability checks.',link:null as string|null},
    {title:'Mortgage Market Reforms Proposed by FCA',tag:'MORTGAGE',body:'The Financial Conduct Authority is proposing significant changes to the mortgage market aimed at providing more flexibility for lenders.',link:null as string|null},
    {title:'UK Housing Market Shows Signs of Stabilization',tag:'RENTING',body:'Data indicates that the property market may be stabilizing, with both buyers and sellers adjusting to the new landscape of higher borrowing costs.',link:null as string|null},
  ])
  const [newsLive, setNewsLive] = useState(false)

  useEffect(()=>{
    fetch('/api/estate-news').then(r=>r.json()).then(d=>{
      if (d?.news?.length) { setNews(d.news); setNewsLive(!!d.live) }
    }).catch(()=>{})
  },[])

  useEffect(()=>{
    if (roleLoading) return
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      loadAll(user.id)
    })
  },[roleLoading, propertyIds])

  async function loadAll(uid?: string) {
    let userId = uid
    if (!userId) { const {data:{user}} = await supabase.auth.getUser(); userId = user?.id }
    const [p,sub,t,tn,v,m,e,ba,tx,r,mt,cl,cp,bl,un,bk,inv,doc,ll,lp] = await Promise.all([
      supabase.from('estate_properties').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('subscriptions').select('ea_extra_blocks,plan,modules').eq('user_id',userId).single(),
      supabase.from('estate_tenants').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_tenancies').select('*,estate_properties(name),estate_tenants(name,email)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_vacancies').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_mortgages').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('office_expenses').select('*').eq('user_id',userId).order('date',{ascending:false}),
      supabase.from('estate_bank_accounts').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_transactions').select('*').eq('user_id',userId).order('date',{ascending:false}),
      supabase.from('estate_rent_schedules').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_maintenance').select('*,estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_cleaning_tasks').select('*,estate_properties(name)').eq('user_id',userId).order('scheduled_date',{ascending:true}),
      supabase.from('estate_compliance').select('*,estate_properties(name)').eq('user_id',userId).order('expiry_date',{ascending:true}),
      supabase.from('estate_buildings').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_units').select('*,estate_buildings(name),estate_properties(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_viewings').select('*,estate_properties(name)').eq('user_id',userId).order('scheduled_at',{ascending:true}),
      supabase.from('estate_inventories').select('*,estate_properties(name),estate_tenancies(estate_tenants(name))').eq('user_id',userId).order('inspection_date',{ascending:false}),
      supabase.from('estate_documents').select('*,estate_properties(name),estate_tenants(name),estate_landlords(name)').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_landlords').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('estate_landlord_payments').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
    ])
    let restrictedProps = p.data ?? []
    if (propertyIds.length > 0) restrictedProps = restrictedProps.filter((x: any) => propertyIds.includes(x.id))
    const restrictedIds = restrictedProps.map((x: any) => x.id)
    const maintData = propertyIds.length > 0 ? (mt.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (mt.data ?? [])
    const cleanData = propertyIds.length > 0 ? (cl.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (cl.data ?? [])
    const complianceData = propertyIds.length > 0 ? (cp.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (cp.data ?? [])
    const unitData = propertyIds.length > 0 ? (un.data ?? []).filter((x: any) => !x.property_id || restrictedIds.includes(x.property_id)) : (un.data ?? [])
    const viewingData = propertyIds.length > 0 ? (bk.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (bk.data ?? [])
    const inventoryData = propertyIds.length > 0 ? (inv.data ?? []).filter((x: any) => restrictedIds.includes(x.property_id)) : (inv.data ?? [])
    const documentData = propertyIds.length > 0 ? (doc.data ?? []).filter((x: any) => !x.property_id || restrictedIds.includes(x.property_id)) : (doc.data ?? [])
    setExtraBlocks((sub.data as any)?.ea_extra_blocks ?? 0)
    setIsBundle((sub.data as any)?.plan === 'bundle')
    setProperties(restrictedProps); setTenants(t.data??[]); setTenancies(tn.data??[])
    setVacancies(v.data??[]); setMortgages(m.data??[]); setExpenses(e.data??[])
    setBankAccounts(ba.data??[]); setTransactions(tx.data??[]); setRentSchedules(r.data??[])
    setMaintenance(maintData); setCleaning(cleanData); setComplianceRecords(complianceData)
    setBuildings(bl.data??[]); setUnits(unitData); setViewings(viewingData)
    setInventories(inventoryData); setDocuments(documentData)
    setLandlords(ll.data??[])
    setLandlordPayments(lp.data??[])
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: templates } = await supabase.from('company_documents').select('*').eq('user_id',currentUser.id).eq('category','contract_template').order('created_at',{ascending:false})
      setContractTemplates(templates ?? [])
      const [{ data: rtr }, { data: bank }] = await Promise.all([
        supabase.from('estate_right_to_rent_checks').select('*').eq('user_id',currentUser.id),
        supabase.from('estate_bank_statement_checks').select('*').eq('user_id',currentUser.id),
      ])
      setRtrChecks(rtr ?? [])
      setBankChecks(bank ?? [])
      const { data: addresses } = await supabase.from('sending_addresses').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:true})
      setSendingAddresses(addresses ?? [])
      if (!selectedSendFrom) {
        const def = addresses?.find((a:any)=>a.is_default) ?? addresses?.[0]
        if (def) setSelectedSendFrom(def.id)
      }
    }
    setLoading(false)
  }

  async function saveRecord(table: string, data: any, id?: any) {
    // Postgres rejects an empty string '' for DATE/TIMESTAMPTZ/NUMERIC/
    // UUID columns (must be NULL for "no value"), but a blank
    // <input type="date"> or number field naturally produces ''. Every
    // save in this file goes through here, so sanitizing once at this
    // choke point fixes the whole class of bug everywhere at once,
    // rather than needing every individual form to remember to guard
    // its own optional date/number fields with `|| null`.
    const sanitized = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
    const { data: { user } } = await supabase.auth.getUser()
    if (id) {
      const { error } = await supabase.from(table).update(sanitized).eq('id', id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from(table).insert([{ ...sanitized, user_id: user?.id }])
      if (error) { alert(error.message); return }
      notifyIfRelevant(table, sanitized, user?.id)
    }
    await loadAll()
  }

  async function delRecord(table: string, id: any) {
    await supabase.from(table).delete().eq('id', id)
    await loadAll()
  }

  async function assignPropertiesToLandlord(landlordId: string, selectedPropertyIds: string[]) {
    const toAssign = properties.filter((p:any) => selectedPropertyIds.includes(p.id) && p.owner_id !== landlordId)
    const toUnassign = properties.filter((p:any) => p.owner_id === landlordId && !selectedPropertyIds.includes(p.id))
    await Promise.all([
      ...toAssign.map((p:any) => supabase.from('estate_properties').update({ owner_id: landlordId }).eq('id', p.id)),
      ...toUnassign.map((p:any) => supabase.from('estate_properties').update({ owner_id: null }).eq('id', p.id)),
    ])
    await loadAll()
  }

  // {{tenant_name}}, {{property_name}}, {{start_date}}, {{end_date}},
  // {{rent}}, {{deposit}}, {{today}} -- filled from the real tenancy,
  // simple string replacement rather than a full templating engine so
  // it stays predictable and easy for staff to read/edit afterward.
  function mergeTemplate(templateBody: string, t: any) {
    if (!t) return templateBody
    const fields: Record<string,string> = {
      tenant_name: t.estate_tenants?.name ?? '',
      property_name: t.estate_properties?.name ?? '',
      start_date: t.start_date ?? '',
      end_date: t.end_date ?? '',
      rent: t.rent != null ? String(t.rent) : '',
      deposit: t.deposit != null ? String(t.deposit) : '',
      today: new Date().toISOString().slice(0,10),
    }
    return Object.entries(fields).reduce((text, [key, val]) => text.replaceAll(`{{${key}}}`, val), templateBody)
  }

  function openContractPicker(t: any) {
    setSelectedTemplateId('')
    setEditableContractText(t.contract_text || '')
    setShowContractPicker(t.id)
  }

  function pickTemplate(templateId: string, tenancy: any) {
    setSelectedTemplateId(templateId)
    const template = contractTemplates.find((ct:any)=>ct.id===templateId)
    if (!template) { setEditableContractText(''); return }
    if (template.body) setEditableContractText(mergeTemplate(template.body, tenancy))
    else setEditableContractText('') // file-based template -- no text to edit, document_url is used instead
  }

  async function emailSigningLink(tenancyId: string) {
    setSendingSignLink(tenancyId)
    const template = contractTemplates.find((ct:any)=>ct.id===selectedTemplateId)
    // Save whatever was picked/edited onto the tenancy first -- so it's
    // not just what THIS email references, it becomes the tenancy's
    // real document going forward, the same one the signing page links
    // to / displays.
    const updates: any = {}
    if (template?.body) updates.contract_text = editableContractText
    else if (template?.url) updates.document_url = template.url
    if (Object.keys(updates).length > 0) {
      await supabase.from('estate_tenancies').update(updates).eq('id', tenancyId)
    }
    const { data: { session } } = await supabase.auth.getSession()
    const fromAddress = sendingAddresses.find((a:any)=>a.id===selectedSendFrom)
    const res = await fetch('/api/send-signing-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token??''}` },
      body: JSON.stringify({ tenancy_id: tenancyId, from_email: fromAddress?.email, from_name: fromAddress?.name }),
    })
    const result = await res.json()
    setSendingSignLink(null)
    setShowContractPicker(null)
    setSelectedTemplateId('')
    setEditableContractText('')
    if (!res.ok) { alert(result.error || 'Could not send email'); return }
    if (result.skipped) { alert(result.message); return }
    alert('Signing link emailed to the tenant.')
    await loadAll()
  }

  function openEditChecks(tenancyId: string) {
    const existingRtr = rtrChecks.find((r:any)=>r.tenancy_id===tenancyId)
    const existingBank = bankChecks.find((b:any)=>b.tenancy_id===tenancyId)
    const tenancy = tenancies.find((t:any)=>t.id===tenancyId)
    setRtrForm(existingRtr ? {
      full_name:existingRtr.full_name??'', date_of_birth:existingRtr.date_of_birth??'', current_address:existingRtr.current_address??'',
      check_type:existingRtr.check_type??'Online', document_type:existingRtr.document_type??'', share_code:existingRtr.share_code??'',
      ni_number:existingRtr.ni_number??'', status:existingRtr.status??'Unlimited', check_date:existingRtr.check_date??'',
      checked_by:existingRtr.checked_by??'', recheck_date:existingRtr.recheck_date??'', document_url:existingRtr.document_url??'', notes:existingRtr.notes??'',
    } : {full_name:tenancy?.estate_tenants?.name??'',date_of_birth:'',current_address:'',check_type:'Online',document_type:'',share_code:'',ni_number:'',status:'Unlimited',check_date:'',checked_by:'',recheck_date:'',document_url:'',notes:''})
    setBankCheckForm(existingBank ? {
      statement_start:existingBank.statement_start??'', statement_end:existingBank.statement_end??'', declared_income:existingBank.declared_income!=null?String(existingBank.declared_income):'',
      income_regular:existingBank.income_regular??false, no_overdraft:existingBank.no_overdraft??false, no_bounced_payments:existingBank.no_bounced_payments??false,
      no_gambling_flags:existingBank.no_gambling_flags??false, status:existingBank.status??'Passed', document_url:existingBank.document_url??'', notes:existingBank.notes??'',
      checked_by:existingBank.checked_by??'', check_date:existingBank.check_date??'',
      ai_assessment:existingBank.ai_assessment??'', ai_assessment_generated_at:existingBank.ai_assessment_generated_at??'',
    } : {statement_start:'',statement_end:'',declared_income:'',income_regular:false,no_overdraft:false,no_bounced_payments:false,no_gambling_flags:false,status:'Passed',document_url:'',notes:'',checked_by:'',check_date:'',ai_assessment:'',ai_assessment_generated_at:''})
    setEditingChecksTenancyId(tenancyId)
  }

  async function saveChecks(tenancyId: string) {
    setSavingChecks(true)
    const { data: { user } } = await supabase.auth.getUser()
    const rtrPayload = {
      ...rtrForm,
      date_of_birth: rtrForm.date_of_birth || null,
      check_date: rtrForm.check_date || null,
      recheck_date: rtrForm.recheck_date || null,
      // NI number only ever makes sense for the birth-certificate
      // combination route -- never stored for Manual or Online checks,
      // even if something was typed in before switching check type.
      ni_number: rtrForm.check_type === 'Birth Certificate + NI' ? rtrForm.ni_number || null : null,
      share_code: rtrForm.check_type === 'Online' ? rtrForm.share_code || null : null,
      updated_at: new Date().toISOString(),
    }
    const bankPayload = {
      ...bankCheckForm,
      declared_income: bankCheckForm.declared_income ? parseFloat(bankCheckForm.declared_income) : null,
      statement_start: bankCheckForm.statement_start || null,
      statement_end: bankCheckForm.statement_end || null,
      check_date: bankCheckForm.check_date || null,
      updated_at: new Date().toISOString(),
    }
    const [rtrRes, bankRes] = await Promise.all([
      supabase.from('estate_right_to_rent_checks').upsert({ ...rtrPayload, user_id: user?.id, tenancy_id: tenancyId }, { onConflict: 'tenancy_id' }),
      supabase.from('estate_bank_statement_checks').upsert({ ...bankPayload, user_id: user?.id, tenancy_id: tenancyId }, { onConflict: 'tenancy_id' }),
    ])
    setSavingChecks(false)
    if (rtrRes.error) { alert(rtrRes.error.message); return }
    if (bankRes.error) { alert(bankRes.error.message); return }
    setEditingChecksTenancyId(null)
    await loadAll()
  }

  async function generateAssessment(rent: number) {
    setGeneratingAssessment(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/assess-affordability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token??''}` },
      body: JSON.stringify({
        rent, declared_income: bankCheckForm.declared_income,
        income_regular: bankCheckForm.income_regular, no_overdraft: bankCheckForm.no_overdraft,
        no_bounced_payments: bankCheckForm.no_bounced_payments, no_gambling_flags: bankCheckForm.no_gambling_flags,
        notes: bankCheckForm.notes,
      }),
    })
    const result = await res.json()
    setGeneratingAssessment(false)
    if (!res.ok) { alert(result.error || 'Could not generate assessment'); return }
    setBankCheckForm(prev => ({ ...prev, ai_assessment: result.assessment, ai_assessment_generated_at: result.generated_at }))
  }

  // Standard UK affordability guideline: rent shouldn't exceed roughly
  // 35-40% of net income. Used to color the ratio bar correctly --
  // a ratio ABOVE the guideline is a real affordability concern, not
  // something to show green.
  function rentToIncomeRatio(rent: number, income: number) {
    if (!income) return null
    const pct = Math.round((rent / income) * 100)
    const withinGuideline = pct <= 40
    return { pct, withinGuideline }
  }

  async function saveSendAddress() {
    if (!newSendAddress.name || !newSendAddress.email) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('sending_addresses').insert([{ user_id: user?.id, name: newSendAddress.name, email: newSendAddress.email, is_default: sendingAddresses.length===0 }]).select().single()
    if (error) { alert(error.message); return }
    setSendingAddresses(prev => [...prev, data])
    setSelectedSendFrom(data.id)
    setNewSendAddress({name:'',email:''})
    setShowAddSendAddress(false)
  }

  function notifyIfRelevant(table: string, data: any, userId?: string) {
    if (!userId) return
    const propertyName = properties.find((p:any)=>p.id===data.property_id)?.name
    const configs: Record<string, { type: string; title: string }> = {
      estate_maintenance: { type: 'maintenance', title: `New maintenance ticket: ${data.title || 'Untitled'}` },
      estate_cleaning_tasks: { type: 'cleaning', title: `New cleaning task scheduled` },
    }
    const cfg = configs[table]
    if (!cfg) return
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      user_id: userId, module: 'estate', type: cfg.type, title: cfg.title, property_name: propertyName, property_id: data.property_id, link: '/estate',
    }) }).catch(()=>{})
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
    if(!editItem && !isBundle && properties.length >= propertyLimit) { setShowAddProperty(false); setShowUpgrade(true); return }
    await saveRecord('estate_properties', prop, editItem?.id)
    setEditItem(null)
    setProp({name:'',address:'',type:'Apartment',bedrooms:'1',bathrooms:'1',rent:'',status:'Available',image_urls:'',owner_id:''})
    setShowAddProperty(false)
  }
  async function purchaseBlock() {
    setUpgrading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch('/api/add-property-block', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id, module: 'ea' }),
    })
    const json = await res.json()
    setUpgrading(false)
    if (!res.ok) { alert(json.error || 'Could not add more properties'); return }
    setShowUpgrade(false)
    await loadAll()
  }
  const addTenant = async () => {
    if(!ten.name) return
    await saveRecord('estate_tenants', ten, editItem?.id)
    setEditItem(null)
    setTen({name:'',email:'',phone:'',property_id:'',unit_id:'',id_type:'',id_url:'',status:'active'})
    setShowAddTenant(false)
  }
  const addTenancy = async () => {
    if(!tenancy.property) return
    await saveRecord('estate_tenancies', {property_id:tenancy.property,tenant_id:tenancy.tenant,start_date:tenancy.start||null,end_date:tenancy.end||null,rent:tenancy.rent,deposit:tenancy.deposit,status:tenancy.status,document_url:tenancy.document_url}, editItem?.id)
    setEditItem(null)
    setTenancy({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active',document_url:''})
    setShowAddTenancy(false)
  }

  const annualRent = tenancies.filter(t=>t.status==='Active').reduce((s,t)=>s+(parseFloat(t.rent)||0)*12,0)
  const monthlyRent = tenancies.filter(t=>t.status==='Active').reduce((s,t)=>s+(parseFloat(t.rent)||0),0)
  const rentedProps = properties.filter(p=>p.status==='Rented').length
  const totalExpenses = expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
  const rentPaidCount = rentSchedules.filter((r:any)=>r.status==='Paid').length
  const lateRentCount = rentSchedules.filter((r:any)=>r.status==='Overdue').length
  const complianceExpired = complianceRecords.filter((c:any)=>complianceStatus(c.expiry_date)==='Expired').length
  const complianceExpiringSoon = complianceRecords.filter((c:any)=>complianceStatus(c.expiry_date)==='Expiring Soon').length
  const tenanciesEndingSoon = tenancies.filter((t:any)=>{
    if(t.status!=='Active'||!t.end_date) return false
    const days=(new Date(t.end_date).getTime()-Date.now())/86400000
    return days>=0&&days<=30
  }).length
  const collectedRentTotal = rentSchedules.filter((r:any)=>r.status==='Paid').reduce((s:number,r:any)=>s+(parseFloat(r.amount)||0),0)
  const nowDate = new Date()
  const expensesForPeriod = (() => {
    const inRange = (dateStr?: string) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (periodTab==='CURRENT_MONTH') return d.getFullYear()===nowDate.getFullYear() && d.getMonth()===nowDate.getMonth()
      if (periodTab==='LAST_MONTH') { const lm = new Date(nowDate.getFullYear(), nowDate.getMonth()-1, 1); return d.getFullYear()===lm.getFullYear() && d.getMonth()===lm.getMonth() }
      if (periodTab==='CURRENT_YEAR') return d.getFullYear()===nowDate.getFullYear()
      return (nowDate.getTime() - d.getTime()) <= 365*86400000 // 12_MONTHS
    }
    return expenses.filter((e:any)=>inRange(e.date)).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
  })()
  // Rent schedules don't record which month a payment covers, so (as in the Reports tab)
  // only the current month shows real collected/spent figures; prior months show £0
  // rather than a fabricated trend, until schedules track a payment date.
  const nowIdx = new Date().getMonth()
  const revenueByMonth = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((label,i)=>({
    label,
    collected: i===nowIdx ? collectedRentTotal : 0,
    spent: i===nowIdx ? totalExpenses : 0,
  }))
  const maxMonthRevenue = Math.max(...revenueByMonth.map(m=>m.collected), 1)

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
          {NAV_GROUPS.map(group=>(
            <div key={group.label}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px',marginTop:8}}>{group.label}</div>
              {group.items.map(s=>{
                const locked = !!(allowedTab && s !== allowedTab)
                const badge = s==='Maintenance' ? maintenance.filter((m:any)=>m.status==='open').length
                  : s==='Cleaning' ? cleaning.filter((c:any)=>c.status==='pending').length
                  : s==='Compliance' ? complianceRecords.filter((c:any)=>complianceStatus(c.expiry_date)!=='Valid').length
                  : 0
                return <button key={s} onClick={()=>!locked && setSection(s)} disabled={locked} title={locked?`Your role only has access to ${allowedTab}`:undefined} style={{...btnStyle(section===s && !locked), color:locked?'#C1C9D2':btnStyle(section===s).color, cursor:locked?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'space-between'}}><span>{s}</span>{badge>0&&!locked&&<span style={{background:s==='Maintenance'||s==='Compliance'?'#EF4444':'#F59E0B',color:'#fff',fontSize:10,fontWeight:700,borderRadius:10,padding:'1px 6px'}}>{badge}</span>}{locked&&<span style={{marginLeft:5}}>🔒</span>}</button>
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,color:'#667085'}}>Dashboard</span>
            {section==='Properties'&&<span style={{fontSize:12,color:'#98A2B3',marginLeft:8}}>{properties.length} / {isBundle?'Unlimited':propertyLimit} properties</span>}
            {section!=='Dashboard'&&<><span style={{color:'#D0D5DD'}}>/</span><span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{section}</span></>}
          </div>
          <div style={{display:'flex',gap:8}}>
            {section==='Properties'&&(!isBundle&&properties.length >= propertyLimit
              ? <button onClick={()=>setShowUpgrade(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#5B7CFA',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add more properties</button>
              : <button onClick={()=>{setEditItem(null);setShowAddProperty(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add property</button>)}
            {section==='Tenants'&&<button onClick={()=>{setEditItem(null);setShowAddTenant(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add tenant</button>}
            {section==='Vacancies'&&<button onClick={()=>setShowAddVacancy(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add vacancy</button>}
            {section==='Maintenance'&&<button onClick={()=>setShowAddMaint(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New ticket</button>}
            {section==='Cleaning'&&<button onClick={()=>setShowAddCleaning(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Schedule cleaning</button>}
            {section==='Owner Reports'&&<button style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Export Report</button>}
            {section==='Expenses'&&<button onClick={()=>setShowAddExpense(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Expense</button>}
            {section==='Banking'&&<button onClick={()=>setShowAddBank(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button>}
            {section==='Rent Collection'&&<button onClick={()=>setShowAddRent(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add schedule</button>}
            {section==='Loans & Mortgages'&&<button onClick={()=>{setEditItem(null);setMortgageForm({property:'',bank:'',amount:'',rate:'',startDate:'',endDate:'',duration:'25',monthlyPayment:'',insurance:'',type:'Repayment'});setShowAddMortgage(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Loan</button>}
            {section==='Tenancies'&&<button onClick={()=>{setEditItem(null);setShowAddTenancy(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add tenancy</button>}
            {section==='Landlords'&&<button onClick={()=>{setEditItem(null);setLandlordForm({name:'',email:'',phone:'',address:'',bank_name:'',account_name:'',account_number:'',sort_code:'',notes:'',id_type:'',id_url:'',iban:'',swift:''});setShowAddLandlord(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add landlord</button>}
            {section==='Compliance'&&<button onClick={()=>{setComplianceForm({scope:complianceScope,property_id:'',type:(complianceScope==='property'?COMPLIANCE_TYPES:BUSINESS_COMPLIANCE_TYPES)[0],reference:'',issued_date:'',expiry_date:'',notes:''});setShowAddCompliance(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add record</button>}
            {section==='Buildings'&&<button onClick={()=>{setEditItem(null);setShowAddBuilding(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add building</button>}
            {section==='Units'&&<button onClick={()=>{setEditItem(null);setShowAddUnit(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add unit</button>}
            {section==='Viewings'&&<button onClick={()=>{setEditItem(null);setShowAddViewing(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add viewing</button>}
            {section==='Inventories'&&<button onClick={()=>{setEditItem(null);setShowAddInventory(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add report</button>}
            {section==='Documents'&&<button onClick={()=>{setEditItem(null);setShowAddDocument(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Document</button>}
          </div>
        </div>

        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {section==='Dashboard'&&(<div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,color:'#667085'}}>Sunday, {new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long'})}</div>
              <div style={{fontSize:24,fontWeight:700,color:'#101828'}}>Hello Sangsters !</div>
            </div>
            {(complianceExpired>0||complianceExpiringSoon>0||tenanciesEndingSoon>0||lateRentCount>0)&&(
              <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:20}}>⚠️</span>
                    <span style={{fontSize:14,fontWeight:600,color:'#101828'}}>{complianceExpired+complianceExpiringSoon+tenanciesEndingSoon+lateRentCount} item{(complianceExpired+complianceExpiringSoon+tenanciesEndingSoon+lateRentCount)>1?'s':''} need attention</span>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:`repeat(${[complianceExpired+complianceExpiringSoon>0,tenanciesEndingSoon>0,lateRentCount>0].filter(Boolean).length||1},1fr)`,gap:10}}>
                  {(complianceExpired+complianceExpiringSoon)>0&&(
                    <button onClick={()=>setSection('Compliance')} style={{textAlign:'left' as const,background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #FDE68A',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{fontSize:11,color:'#92400E',fontWeight:600,marginBottom:2}}>🛡️ Compliance</div>
                      <div style={{fontSize:13,color:'#344054'}}>{complianceExpired>0&&`${complianceExpired} expired`}{complianceExpired>0&&complianceExpiringSoon>0&&' · '}{complianceExpiringSoon>0&&`${complianceExpiringSoon} expiring soon`}</div>
                    </button>
                  )}
                  {tenanciesEndingSoon>0&&(
                    <button onClick={()=>setSection('Tenancies')} style={{textAlign:'left' as const,background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #FDE68A',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{fontSize:11,color:'#92400E',fontWeight:600,marginBottom:2}}>📋 Tenancies</div>
                      <div style={{fontSize:13,color:'#344054'}}>{tenanciesEndingSoon} ending within 30 days</div>
                    </button>
                  )}
                  {lateRentCount>0&&(
                    <button onClick={()=>setSection('Rent Collection')} style={{textAlign:'left' as const,background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #FDE68A',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{fontSize:11,color:'#92400E',fontWeight:600,marginBottom:2}}>💷 Rent</div>
                      <div style={{fontSize:13,color:'#344054'}}>{lateRentCount} overdue</div>
                    </button>
                  )}
                </div>
              </div>
            )}
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
                  {[{k:'CURRENT_MONTH',l:'CURRENT MONTH'},{k:'LAST_MONTH',l:'LAST MONTH'},{k:'CURRENT_YEAR',l:'CURRENT YEAR'},{k:'12_MONTHS',l:'12 MONTHS'}].map(t=>(
                    <button key={t.k} onClick={()=>setPeriodTab(t.k as any)} style={{padding:'4px 10px',borderRadius:4,border:'none',background:periodTab===t.k?ACCENT:'transparent',color:periodTab===t.k?'#fff':'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t.l}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div style={{padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4,textTransform:'uppercase',fontWeight:600}}>Rent paid</div>
                    <div style={{fontSize:28,fontWeight:700,color:ACCENT}}>{rentPaidCount}</div>
                  </div>
                  <div style={{padding:16,background:'#FEF2F2',borderRadius:8,border:'1px solid #FCA5A5'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4,textTransform:'uppercase',fontWeight:600}}>Late rent</div>
                    <div style={{fontSize:28,fontWeight:700,color:'#EF4444'}}>{lateRentCount}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  <div style={{padding:12,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4}}>GROSS INCOME</div>
                    <div style={{fontSize:18,fontWeight:700,color:ACCENT}}>£{collectedRentTotal.toLocaleString()}</div>
                  </div>
                  <div style={{padding:12,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:11,color:'#667085',marginBottom:4}}>NET PROFIT</div>
                    <div style={{fontSize:18,fontWeight:700,color:(collectedRentTotal-expensesForPeriod)>=0?ACCENT:'#EF4444'}}>£{(collectedRentTotal-expensesForPeriod).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'#98A2B3',marginBottom:12,marginTop:-8}}>Gross income is total rent marked Paid to date; expenses are filtered to {periodTab==='CURRENT_MONTH'?'the current month':periodTab==='LAST_MONTH'?'last month':periodTab==='CURRENT_YEAR'?'the current year':'the trailing 12 months'}.</div>
                <div style={{height:110,position:'relative'}}>
                  <svg viewBox="0 0 400 110" style={{width:'100%',height:110,overflow:'visible'}}>
                    {[0,0.5,1].map(p=>(
                      <g key={p}>
                        <line x1={28} y1={90-p*70} x2={400} y2={90-p*70} stroke="#F2F4F7" strokeWidth="1"/>
                        <text x={0} y={90-p*70+3} fontSize="8" fill="#98A2B3">£{Math.round(maxMonthRevenue*p).toLocaleString()}</text>
                      </g>
                    ))}
                    {revenueByMonth.map((m,i)=>{
                      const barW = (400-32)/12*0.6
                      const gap = (400-32)/12
                      const x = 32 + i*gap
                      const h = Math.max((m.collected/maxMonthRevenue)*70, 2)
                      return (
                        <g key={m.label+i}>
                          <rect x={x} y={90-h} width={barW} height={h} rx={2} fill={i===nowIdx?ACCENT:ACCENT+'55'}>
                            <title>£{m.collected.toLocaleString()} collected — {m.label}</title>
                          </rect>
                          <text x={x+barW/2} y={102} fontSize="8" fill="#98A2B3" textAnchor="middle">{m.label}</text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div style={{fontSize:11,color:'#98A2B3',marginTop:6}}>Rent schedules don't yet record which month a payment covers, so only the current month shows real figures.</div>
              </div>
              <div style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Real estate news</div>
                  {newsLive&&<span style={{fontSize:9,fontWeight:700,color:'#10B981',background:'#ECFDF5',padding:'2px 6px',borderRadius:10,textTransform:'uppercase' as const}}>● Live</span>}
                </div>
                {news.map(n=>(
                  <div key={n.title} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid #F2F4F7'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      {n.link
                        ? <a href={n.link} target="_blank" rel="noopener noreferrer" style={{fontSize:13,fontWeight:600,color:'#101828',flex:1,marginRight:8,textDecoration:'none'}}>{n.title}</a>
                        : <div style={{fontSize:13,fontWeight:600,color:'#101828',flex:1,marginRight:8}}>{n.title}</div>}
                      <span style={{fontSize:10,fontWeight:700,background:'#E4E7EC',color:'#344054',padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap' as const}}>{n.tag}</span>
                    </div>
                    <div style={{fontSize:12,color:'#667085',lineHeight:1.5}}>{n.body}</div>
                  </div>
                ))}
                <a href="https://propertyindustryeye.com" target="_blank" rel="noopener noreferrer" style={{display:'block',width:'100%',padding:'8px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054',textAlign:'center' as const,textDecoration:'none',boxSizing:'border-box' as const}}>Show all</a>
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
                <div><label style={{...labelStyle,display:'inline-flex',alignItems:'center',gap:4}}><BedDouble size={13} color="#667085"/>Bedrooms</label><select value={prop.bedrooms} onChange={e=>setProp({...prop,bedrooms:e.target.value})} style={inputStyle}>{['Studio','1','2','3','4','5','6+'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={{...labelStyle,display:'inline-flex',alignItems:'center',gap:4}}><Bath size={13} color="#667085"/>Bathrooms</label><select value={prop.bathrooms} onChange={e=>setProp({...prop,bathrooms:e.target.value})} style={inputStyle}>{['1','2','3','4','5','6+'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Monthly rent (£)</label><input value={prop.rent} onChange={e=>setProp({...prop,rent:e.target.value})} placeholder="0.00" type="number" style={inputStyle}/></div>
                <div><label style={labelStyle}>Status</label><select value={prop.status} onChange={e=>setProp({...prop,status:e.target.value})} style={inputStyle}>{['Available','Rented','Maintenance','Archived'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Owner</label><select value={prop.owner_id||''} onChange={e=>setProp({...prop,owner_id:e.target.value})} style={inputStyle}><option value="">No owner linked</option>{landlords.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={labelStyle}>Photos</label>
                <PropertyImagePicker urls={parsePropertyImages(prop.image_urls)} onChange={urls=>setProp({...prop,image_urls:JSON.stringify(urls)})}/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addProperty} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add property'}</button>
                <button onClick={()=>{setShowAddProperty(false);setEditItem(null);setProp({name:'',address:'',type:'Apartment',bedrooms:'1',bathrooms:'1',rent:'',status:'Available',image_urls:'',owner_id:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {showUpgrade&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid #5B7CFA',padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 10px'}}>Add more properties</h3>
              <p style={{fontSize:14,color:'#344054',lineHeight:1.6,marginBottom:16}}>Your Estate Agency plan includes {propertyLimit} properties. Adding 2 more properties is <strong>£12/mo</strong>, billed on your existing subscription with proration for the rest of this cycle.</p>
              <div style={{display:'flex',gap:8}}>
                <button onClick={purchaseBlock} disabled={upgrading} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#5B7CFA',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:upgrading?0.6:1}}>{upgrading?'Adding…':'Add 2 properties — £12/mo'}</button>
                <button onClick={()=>setShowUpgrade(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
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
              <div style={{display:'grid',gridTemplateColumns:'56px 1fr 100px 100px 60px 60px 100px 80px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span></span><span>Name</span><span>Type</span><span>Address</span><span>Beds</span><span>Baths</span><span>Rent/mo</span><span>Status</span><span></span>
              </div>
              {properties.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🏠</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No properties yet</div><div style={{fontSize:13}}>Add your first property to get started.</div></div>):properties.map(p=>{
                const photos = parsePropertyImages(p.image_urls)
                return (
                <div key={p.id} style={{display:'grid',gridTemplateColumns:'56px 1fr 100px 100px 60px 60px 100px 80px 100px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  {photos.length > 0
                    ? <div onClick={()=>setViewingPhotos(photos)} style={{position:'relative',width:40,height:40,cursor:'pointer'}}>
                        <img src={photos[0]} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:6,display:'block'}}/>
                        {photos.length > 1 && <span style={{position:'absolute',bottom:-2,right:-2,background:'rgba(0,0,0,0.7)',color:'#fff',fontSize:9,fontWeight:600,padding:'1px 4px',borderRadius:4}}>+{photos.length-1}</span>}
                      </div>
                    : <div style={{width:40,height:40,borderRadius:6,background:'#F2F4F7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏠</div>}
                  <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{p.name}</div>
                  <span style={{fontSize:12,color:'#344054'}}>{p.type}</span>
                  <span style={{fontSize:12,color:'#667085',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.address||'—'}</span>
                  <span style={{fontSize:12,color:'#344054',display:'inline-flex',alignItems:'center',gap:4}}><BedDouble size={13} color="#667085"/>{p.bedrooms}</span>
                  <span style={{fontSize:12,color:'#344054',display:'inline-flex',alignItems:'center',gap:4}}><Bath size={13} color="#667085"/>{p.bathrooms||'—'}</span>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>{p.rent?'£'+p.rent:'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:p.status==='Rented'?'#FEF3C7':p.status==='Available'?'#ECFDF5':'#F2F4F7',color:p.status==='Rented'?'#F59E0B':p.status==='Available'?'#10B981':'#667085',display:'inline-block'}}>{p.status}</span>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(p);setProp({name:p.name,address:p.address,type:p.type,bedrooms:p.bedrooms,bathrooms:p.bathrooms||'1',rent:p.rent,status:p.status,image_urls:p.image_urls||'',owner_id:p.owner_id||''});setShowAddProperty(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>delRecord('estate_properties',p.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              )})}
            </div>
          </div>)}

          {section==='Tenants'&&(<div>
            {showAddTenant&&(
              <Modal title={editItem?'Edit tenant':'Add tenant'} onClose={()=>{setShowAddTenant(false);setEditItem(null);setTen({name:'',email:'',phone:'',property_id:'',unit_id:'',id_type:'',id_url:'',status:'active'})}}>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div><label style={labelStyle}>Full name *</label><input value={ten.name} onChange={e=>setTen({...ten,name:e.target.value})} placeholder="Jane Smith" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Email</label><input value={ten.email} onChange={e=>setTen({...ten,email:e.target.value})} placeholder="jane@example.com" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Phone</label><input value={ten.phone} onChange={e=>setTen({...ten,phone:e.target.value})} placeholder="+44 7700 900000" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Property</label>
                    <select style={{...inputStyle,cursor:'pointer'}} value={ten.property_id} onChange={e=>setTen({...ten,property_id:e.target.value})}>
                      <option value="">Select property…</option>
                      {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Unit</label>
                    <select style={{...inputStyle,cursor:'pointer'}} value={ten.unit_id} onChange={e=>setTen({...ten,unit_id:e.target.value})}>
                      <option value="">Select unit…</option>
                      {units.filter((u:any)=>!ten.property_id||u.property_id===ten.property_id).map((u:any)=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>ID type</label>
                    <select style={{...inputStyle,cursor:'pointer'}} value={ten.id_type} onChange={e=>setTen({...ten,id_type:e.target.value})}>
                      <option value="">Select…</option>
                      <option value="passport">Passport</option>
                      <option value="driving_licence">Driving licence</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  <FileUpload label="ID document" value={ten.id_url} onChange={url=>setTen({...ten,id_url:url})} folder="estate-tenant-ids" />
                </div>
                <div style={{display:'flex',gap:8,marginTop:24}}>
                  <button onClick={()=>{setShowAddTenant(false);setEditItem(null);setTen({name:'',email:'',phone:'',property_id:'',unit_id:'',id_type:'',id_url:'',status:'active'})}} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                  <button onClick={addTenant} disabled={!ten.name} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:ten.name?1:0.6}}>{editItem?'Save changes':'Add tenant'}</button>
                </div>
              </Modal>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {tenants.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}><div style={{fontSize:40,marginBottom:12}}>👥</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tenants yet</div><div style={{fontSize:13}}>Add your first tenant to get started.</div></div>):tenants.map((t:any)=>(
                <div key={t.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:ACCENT,flexShrink:0}}>{t.name.charAt(0)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'#101828'}}>{t.name}</div>
                    <div style={{fontSize:12,color:'#667085',marginTop:2}}>{[t.email,t.phone].filter(Boolean).join(' · ')||'—'}</div>
                    <div style={{fontSize:12,color:'#98A2B3',marginTop:2}}>{t.estate_properties?.name}{t.unit_id?` — ${units.find((u:any)=>u.id===t.unit_id)?.unit_number??''}`:''}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:t.status==='active'?'#D1FAE5':'#F3F4F6',color:t.status==='active'?'#059669':'#6B7280'}}>{t.status||'active'}</span>
                  {t.portal_user_id?(
                    <>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:'#D1FAE5',color:'#059669'}}>Portal Active</span>
                      <a href={`/estate-tenant-portal?tenant_id=${t.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer',textDecoration:'none'}}>View Portal</a>
                    </>
                  ):(
                    <button onClick={()=>{setPortalTenant(t);setTenantPortalPassword('')}} style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Give Portal Access</button>
                  )}
                  <button onClick={()=>{setEditItem(t);setTen({name:t.name,email:t.email||'',phone:t.phone||'',property_id:t.property_id||'',unit_id:t.unit_id||'',id_type:t.id_type||'',id_url:t.id_url||'',status:t.status||'active'});setShowAddTenant(true)}} style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                  <button onClick={()=>delRecord('estate_tenants',t.id)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Compliance'&&(<div>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {(['property','business'] as const).map(s=>(
                <button key={s} onClick={()=>setComplianceScope(s)} style={{padding:'8px 16px',borderRadius:8,border:complianceScope===s?'1px solid '+ACCENT:'1px solid #D0D5DD',background:complianceScope===s?ACCENT+'18':'#fff',color:complianceScope===s?ACCENT:'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{s==='property'?'Property Compliance (from landlords)':'Business Compliance (to operate)'}</button>
              ))}
            </div>

            {showAddCompliance&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add {complianceForm.scope==='property'?'property':'business'} compliance record</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Scope</label>
                  <select value={complianceForm.scope} onChange={e=>setComplianceForm({...complianceForm,scope:e.target.value,property_id:'',type:(e.target.value==='property'?COMPLIANCE_TYPES:BUSINESS_COMPLIANCE_TYPES)[0]})} style={inputStyle}>
                    <option value="property">Property (from landlord)</option>
                    <option value="business">Business (to operate)</option>
                  </select>
                </div>
                {complianceForm.scope==='property'&&<div><label style={labelStyle}>Property *</label><select value={complianceForm.property_id} onChange={e=>setComplianceForm({...complianceForm,property_id:e.target.value})} style={inputStyle}><option value="">Select property</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
                <div><label style={labelStyle}>Certificate / requirement type *</label><select value={complianceForm.type} onChange={e=>setComplianceForm({...complianceForm,type:e.target.value})} style={inputStyle}>{(complianceForm.scope==='property'?COMPLIANCE_TYPES:BUSINESS_COMPLIANCE_TYPES).map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Reference / provider</label><input value={complianceForm.reference} onChange={e=>setComplianceForm({...complianceForm,reference:e.target.value})} placeholder="e.g. issuing engineer or scheme name" style={inputStyle}/></div>
                <div><label style={labelStyle}>Issued date</label><input value={complianceForm.issued_date} onChange={e=>setComplianceForm({...complianceForm,issued_date:e.target.value})} type="date" style={inputStyle}/></div>
                <div><label style={labelStyle}>Expiry date</label><input value={complianceForm.expiry_date} onChange={e=>setComplianceForm({...complianceForm,expiry_date:e.target.value})} type="date" style={inputStyle}/></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Notes</label><input value={complianceForm.notes} onChange={e=>setComplianceForm({...complianceForm,notes:e.target.value})} style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{
                  if(!complianceForm.type)return
                  if(complianceForm.scope==='property'&&!complianceForm.property_id)return
                  const payload = complianceForm.scope==='business' ? {...complianceForm,property_id:null} : complianceForm
                  await saveRecord('estate_compliance',payload)
                  setComplianceForm({scope:complianceScope,property_id:'',type:(complianceScope==='property'?COMPLIANCE_TYPES:BUSINESS_COMPLIANCE_TYPES)[0],reference:'',issued_date:'',expiry_date:'',notes:''})
                  setShowAddCompliance(false)
                }} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add record</button>
                <button onClick={()=>setShowAddCompliance(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}

            {(()=>{
              const scoped = complianceRecords.filter((c:any)=>(c.scope??'property')===complianceScope)
              return (<>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                  {[
                    {label:'Expired',value:scoped.filter((c:any)=>complianceStatus(c.expiry_date)==='Expired').length,color:'#EF4444',bg:'#FEF2F2',border:'#FCA5A5'},
                    {label:'Expiring within 60 days',value:scoped.filter((c:any)=>complianceStatus(c.expiry_date)==='Expiring Soon').length,color:'#F59E0B',bg:'#FFFBEB',border:'#FDE68A'},
                    {label:'Valid',value:scoped.filter((c:any)=>complianceStatus(c.expiry_date)==='Valid').length,color:'#10B981',bg:'#F0FDF4',border:'#BBF7D0'},
                  ].map(s=>(
                    <div key={s.label} style={{padding:16,background:s.bg,borderRadius:10,border:'1px solid '+s.border}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:complianceScope==='property'?'1fr 1fr 1fr 1fr 100px 60px':'1.5fr 1fr 1fr 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                    {complianceScope==='property'&&<span>Property</span>}
                    <span>Type</span><span>Issued</span><span>Expires</span><span>Status</span><span></span>
                  </div>
                  {scoped.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🛡️</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No {complianceScope} compliance records yet</div><div style={{fontSize:13}}>{complianceScope==='property'?'Track certificates you collect from landlords for each property, with automatic expiry alerts.':'Track what your agency needs to legally operate — CMP, redress scheme, insurance, and more.'}</div></div>):scoped.map((c:any)=>{
                    const status = complianceStatus(c.expiry_date)
                    return (
                    <div key={c.id} style={{display:'grid',gridTemplateColumns:complianceScope==='property'?'1fr 1fr 1fr 1fr 100px 60px':'1.5fr 1fr 1fr 100px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                      {complianceScope==='property'&&<span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.estate_properties?.name??'—'}</span>}
                      <span style={{fontSize:13,color:'#344054'}}>{c.type}</span>
                      <span style={{fontSize:13,color:'#667085'}}>{c.issued_date||'—'}</span>
                      <span style={{fontSize:13,color:'#667085'}}>{c.expiry_date||'—'}</span>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:complianceStatusColor[status]+'18',color:complianceStatusColor[status],textAlign:'center' as const}}>{status}</span>
                      <button onClick={()=>delRecord('estate_compliance',c.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                    </div>
                  )})}
                </div>
              </>)
            })()}
          </div>)}

          {section==='Buildings'&&(<div>
            {showAddBuilding&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit building':'Add building'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Building name *</label><input value={buildingForm.name} onChange={e=>setBuildingForm({...buildingForm,name:e.target.value})} placeholder="e.g. Crown Street Block" style={inputStyle}/></div>
                <div><label style={labelStyle}>Total units</label><input value={buildingForm.total_units} onChange={e=>setBuildingForm({...buildingForm,total_units:e.target.value})} type="number" style={inputStyle}/></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Address</label><input value={buildingForm.address} onChange={e=>setBuildingForm({...buildingForm,address:e.target.value})} style={inputStyle}/></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Notes</label><input value={buildingForm.notes} onChange={e=>setBuildingForm({...buildingForm,notes:e.target.value})} style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{if(!buildingForm.name)return;await saveRecord('estate_buildings',buildingForm,editItem?.id);setEditItem(null);setBuildingForm({name:'',address:'',total_units:'',notes:''});setShowAddBuilding(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add building'}</button>
                <button onClick={()=>{setShowAddBuilding(false);setEditItem(null);setBuildingForm({name:'',address:'',total_units:'',notes:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Name</span><span>Address</span><span>Units</span><span></span>
              </div>
              {buildings.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🏢</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No buildings yet</div><div style={{fontSize:13}}>Add a building to start grouping units.</div></div>):buildings.map((b:any)=>(
                <div key={b.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{b.name}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{b.address||'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{b.total_units||'—'}</span>
                  <button onClick={()=>delRecord('estate_buildings',b.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Units'&&(<div>
            {showAddUnit&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit unit':'Add unit'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Unit number *</label><input value={unitForm.unit_number} onChange={e=>setUnitForm({...unitForm,unit_number:e.target.value})} placeholder="e.g. Flat 3" style={inputStyle}/></div>
                <div><label style={labelStyle}>Building</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={unitForm.building_id} onChange={e=>setUnitForm({...unitForm,building_id:e.target.value})}>
                    <option value="">Select building…</option>
                    {buildings.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Linked property</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={unitForm.property_id} onChange={e=>setUnitForm({...unitForm,property_id:e.target.value})}>
                    <option value="">Select property…</option>
                    {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Status</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={unitForm.status} onChange={e=>setUnitForm({...unitForm,status:e.target.value})}>
                    {['Vacant','Occupied','Maintenance'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Floor</label><input value={unitForm.floor} onChange={e=>setUnitForm({...unitForm,floor:e.target.value})} style={inputStyle}/></div>
                <div><label style={labelStyle}>Bedrooms</label><input value={unitForm.bedrooms} onChange={e=>setUnitForm({...unitForm,bedrooms:e.target.value})} type="number" style={inputStyle}/></div>
                <div><label style={labelStyle}>Bathrooms</label><input value={unitForm.bathrooms} onChange={e=>setUnitForm({...unitForm,bathrooms:e.target.value})} type="number" style={inputStyle}/></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Notes</label><input value={unitForm.notes} onChange={e=>setUnitForm({...unitForm,notes:e.target.value})} style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{if(!unitForm.unit_number)return;await saveRecord('estate_units',unitForm,editItem?.id);setEditItem(null);setUnitForm({building_id:'',property_id:'',unit_number:'',floor:'',bedrooms:'',bathrooms:'',status:'Vacant',notes:''});setShowAddUnit(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add unit'}</button>
                <button onClick={()=>{setShowAddUnit(false);setEditItem(null);setUnitForm({building_id:'',property_id:'',unit_number:'',floor:'',bedrooms:'',bathrooms:'',status:'Vacant',notes:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Unit</span><span>Building</span><span>Property</span><span>Status</span><span></span>
              </div>
              {units.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🚪</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No units yet</div><div style={{fontSize:13}}>Add a unit within a building.</div></div>):units.map((u:any)=>(
                <div key={u.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 100px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{u.unit_number}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{u.estate_buildings?.name||'—'}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{u.estate_properties?.name||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:u.status==='Occupied'?'#D1FAE5':u.status==='Maintenance'?'#FEF3C7':'#F3F4F6',color:u.status==='Occupied'?'#059669':u.status==='Maintenance'?'#D97706':'#6B7280'}}>{u.status}</span>
                  <button onClick={()=>delRecord('estate_units',u.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Viewings'&&(<div>
            {showAddViewing&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit viewing':'Add viewing'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property *</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={viewingForm.property_id} onChange={e=>setViewingForm({...viewingForm,property_id:e.target.value})}>
                    <option value="">Select property…</option>
                    {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Prospect name *</label><input value={viewingForm.prospect_name} onChange={e=>setViewingForm({...viewingForm,prospect_name:e.target.value})} style={inputStyle}/></div>
                <div><label style={labelStyle}>Email</label><input value={viewingForm.prospect_email} onChange={e=>setViewingForm({...viewingForm,prospect_email:e.target.value})} style={inputStyle}/></div>
                <div><label style={labelStyle}>Phone</label><input value={viewingForm.prospect_phone} onChange={e=>setViewingForm({...viewingForm,prospect_phone:e.target.value})} style={inputStyle}/></div>
                <div><label style={labelStyle}>Date and time</label><input value={viewingForm.scheduled_at} onChange={e=>setViewingForm({...viewingForm,scheduled_at:e.target.value})} type="datetime-local" style={inputStyle}/></div>
                <div><label style={labelStyle}>Status</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={viewingForm.status} onChange={e=>setViewingForm({...viewingForm,status:e.target.value})}>
                    {VIEWING_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Notes</label><input value={viewingForm.notes} onChange={e=>setViewingForm({...viewingForm,notes:e.target.value})} style={inputStyle}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async()=>{if(!viewingForm.property_id||!viewingForm.prospect_name)return;await saveRecord('estate_viewings',viewingForm,editItem?.id);setEditItem(null);setViewingForm({property_id:'',prospect_name:'',prospect_email:'',prospect_phone:'',scheduled_at:'',status:'Scheduled',notes:''});setShowAddViewing(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add viewing'}</button>
                <button onClick={()=>{setShowAddViewing(false);setEditItem(null);setViewingForm({property_id:'',prospect_name:'',prospect_email:'',prospect_phone:'',scheduled_at:'',status:'Scheduled',notes:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Prospect</span><span>Property</span><span>When</span><span>Status</span><span></span>
              </div>
              {viewings.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📅</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No viewings yet</div><div style={{fontSize:13}}>Schedule your first viewing.</div></div>):viewings.map((bk:any)=>(
                <div key={bk.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 100px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{bk.prospect_name}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{bk.estate_properties?.name||'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{bk.scheduled_at?new Date(bk.scheduled_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:bk.status==='Completed'?'#D1FAE5':bk.status==='Cancelled'||bk.status==='No Show'?'#FEE2E2':'#DBEAFE',color:bk.status==='Completed'?'#059669':bk.status==='Cancelled'||bk.status==='No Show'?'#DC2626':'#2563EB'}}>{bk.status}</span>
                  <button onClick={()=>delRecord('estate_viewings',bk.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Inventories'&&(<div>
            {showAddInventory&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit report':'Add inventory report'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={labelStyle}>Property *</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={inventoryForm.property_id} onChange={e=>setInventoryForm({...inventoryForm,property_id:e.target.value})}>
                    <option value="">Select property…</option>
                    {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Tenancy</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={inventoryForm.tenancy_id} onChange={e=>setInventoryForm({...inventoryForm,tenancy_id:e.target.value})}>
                    <option value="">Select tenancy…</option>
                    {tenancies.map((t:any)=><option key={t.id} value={t.id}>{t.estate_properties?.name} — {t.estate_tenants?.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Type</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={inventoryForm.type} onChange={e=>setInventoryForm({...inventoryForm,type:e.target.value})}>
                    {INVENTORY_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Inspection date</label><input value={inventoryForm.inspection_date} onChange={e=>setInventoryForm({...inventoryForm,inspection_date:e.target.value})} type="date" style={inputStyle}/></div>
                <div><label style={labelStyle}>Status</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={inventoryForm.status} onChange={e=>setInventoryForm({...inventoryForm,status:e.target.value})}>
                    {['Draft','Completed'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Condition summary</label><input value={inventoryForm.condition_summary} onChange={e=>setInventoryForm({...inventoryForm,condition_summary:e.target.value})} style={inputStyle}/></div>
                <div style={{gridColumn:'span 2'}}><FileUpload label="Report document" value={inventoryForm.document_url} onChange={url=>setInventoryForm({...inventoryForm,document_url:url})} folder="estate-inventories" /></div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={async()=>{if(!inventoryForm.property_id)return;await saveRecord('estate_inventories',inventoryForm,editItem?.id);setEditItem(null);setInventoryForm({property_id:'',tenancy_id:'',type:INVENTORY_TYPES[0],inspection_date:'',condition_summary:'',document_url:'',status:'Draft'});setShowAddInventory(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add report'}</button>
                <button onClick={()=>{setShowAddInventory(false);setEditItem(null);setInventoryForm({property_id:'',tenancy_id:'',type:INVENTORY_TYPES[0],inspection_date:'',condition_summary:'',document_url:'',status:'Draft'})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Property</span><span>Type</span><span>Date</span><span>Status</span><span></span>
              </div>
              {inventories.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📝</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No inventory reports yet</div><div style={{fontSize:13}}>Log a check-in or check-out report.</div></div>):inventories.map((inv:any)=>(
                <div key={inv.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{inv.estate_properties?.name||'—'}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{inv.type}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{inv.inspection_date||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:inv.status==='Completed'?'#D1FAE5':'#F3F4F6',color:inv.status==='Completed'?'#059669':'#6B7280'}}>{inv.status}</span>
                  <button onClick={()=>delRecord('estate_inventories',inv.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Documents'&&(<div>
            {showAddDocument&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editItem?'Edit Document':'Add Document'}</h3>
              <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
                <div><label style={labelStyle}>Document Name *</label><input value={documentForm.name} onChange={e=>setDocumentForm({...documentForm,name:e.target.value})} placeholder="e.g. Passport, Tenancy Agreement" style={inputStyle}/></div>
                <FileUpload label="Upload File (PDF, Image) *" value={documentForm.file_url} onChange={url=>setDocumentForm({...documentForm,file_url:url})} folder="estate-documents" />
                <div><label style={labelStyle}>Type</label>
                  <select style={{...inputStyle,cursor:'pointer'}} value={documentForm.category} onChange={e=>setDocumentForm({...documentForm,category:e.target.value})}>
                    {DOCUMENT_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Linked To</label>
                  <div style={{display:'flex',gap:8,marginBottom:10}}>
                    {[['landlord','Landlord'],['tenant','Tenant'],['property','Property']].map(([key,label])=>(
                      <button key={key} onClick={()=>{setDocumentLinkType(key);setDocumentForm({...documentForm,landlord_id:'',tenant_id:'',property_id:''})}} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid '+(documentLinkType===key?ACCENT:'#E4E7EC'),background:documentLinkType===key?ACCENT+'12':'#fff',color:documentLinkType===key?ACCENT:'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{label}</button>
                    ))}
                  </div>
                  {documentLinkType==='landlord'&&(
                    <select style={{...inputStyle,cursor:'pointer'}} value={documentForm.landlord_id} onChange={e=>setDocumentForm({...documentForm,landlord_id:e.target.value})}>
                      <option value="">Select landlord…</option>
                      {landlords.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                  {documentLinkType==='tenant'&&(
                    <select style={{...inputStyle,cursor:'pointer'}} value={documentForm.tenant_id} onChange={e=>setDocumentForm({...documentForm,tenant_id:e.target.value})}>
                      <option value="">Select tenant…</option>
                      {tenants.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  {documentLinkType==='property'&&(
                    <select style={{...inputStyle,cursor:'pointer'}} value={documentForm.property_id} onChange={e=>setDocumentForm({...documentForm,property_id:e.target.value})}>
                      <option value="">All properties</option>
                      {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:24}}>
                <button onClick={async()=>{if(!documentForm.name||!documentForm.file_url)return;await saveRecord('estate_documents',documentForm,editItem?.id);setEditItem(null);setDocumentForm({property_id:'',landlord_id:'',tenant_id:'',name:'',category:DOCUMENT_CATEGORIES[0].value,file_url:''});setDocumentLinkType('property');setShowAddDocument(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save Changes':'Add Document'}</button>
                <button onClick={()=>{setShowAddDocument(false);setEditItem(null);setDocumentForm({property_id:'',landlord_id:'',tenant_id:'',name:'',category:DOCUMENT_CATEGORIES[0].value,file_url:''});setDocumentLinkType('property')}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}

            <div style={{display:'flex',gap:8,marginBottom:16}}>
              {['All','Landlord Documents','Tenant Documents','Property Documents'].map(f=>(
                <button key={f} onClick={()=>setDocumentFilter(f)} style={{padding:'6px 14px',borderRadius:20,border:documentFilter===f?'1px solid '+ACCENT:'1px solid #E4E7EC',background:documentFilter===f?ACCENT+'12':'#fff',color:documentFilter===f?ACCENT:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{f}</button>
              ))}
            </div>

            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 160px 1fr 110px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Name</span><span>Type</span><span>Linked To</span><span>Uploaded</span><span></span>
              </div>
              {(()=>{
                const filtered = documents.filter((d:any)=>{
                  if(documentFilter==='Landlord Documents') return !!d.landlord_id
                  if(documentFilter==='Tenant Documents') return !!d.tenant_id
                  if(documentFilter==='Property Documents') return !!d.property_id && !d.landlord_id && !d.tenant_id
                  return true
                })
                if(filtered.length===0) return <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📁</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No documents yet</div><div style={{fontSize:13}}>Upload tenancy agreements, certificates and more.</div></div>
                return filtered.map((d:any)=>(
                  <div key={d.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 1fr 110px 60px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{d.file_url?<a href={d.file_url} target="_blank" rel="noreferrer" style={{color:'#101828',textDecoration:'none'}}>{d.name}</a>:d.name}</span>
                    <span style={{fontSize:12,color:'#667085'}}>{DOCUMENT_CATEGORIES.find(c=>c.value===d.category)?.label||d.category}</span>
                    <div>
                      {d.landlord_id?(<><div style={{fontSize:13,color:'#344054'}}>👤 {d.estate_landlords?.name??'—'}</div><div style={{fontSize:11,color:'#98A2B3'}}>Landlord</div></>)
                      :d.tenant_id?(<><div style={{fontSize:13,color:'#344054'}}>🧍 {d.estate_tenants?.name??'—'}</div><div style={{fontSize:11,color:'#98A2B3'}}>Tenant</div></>)
                      :d.property_id?(<><div style={{fontSize:13,color:'#344054'}}>🏠 {d.estate_properties?.name??'—'}</div><div style={{fontSize:11,color:'#98A2B3'}}>Property</div></>)
                      :<span style={{fontSize:13,color:'#98A2B3'}}>—</span>}
                    </div>
                    <span style={{fontSize:12,color:'#667085'}}>{d.created_at?new Date(d.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</span>
                    <button onClick={()=>delRecord('estate_documents',d.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                ))
              })()}
            </div>
          </div>)}

          {section==='Company SOPs'&&<CompanyDocsPanel category="sop" />}
          {section==='Contract Templates'&&<CompanyDocsPanel category="contract_template" />}

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
                <div style={{gridColumn:'span 2'}}><FileUpload label="Tenancy Agreement (PDF)" value={tenancy.document_url||''} onChange={url=>setTenancy({...tenancy,document_url:url})} folder="estate-tenancy-documents" /></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addTenancy} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save changes':'Add tenancy'}</button>
                <button onClick={()=>{setShowAddTenancy(false);setEditItem(null);setTenancy({property:'',tenant:'',start:'',end:'',rent:'',deposit:'',status:'Active',document_url:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px 150px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Property</span><span>Tenant</span><span>Start</span><span>End</span><span>Rent/mo</span><span>Status</span><span>Signature</span><span></span>
              </div>
              {tenancies.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tenancies yet</div><div style={{fontSize:13}}>Add your first tenancy to get started.</div></div>):tenancies.map((t:any)=>{
                const fullySigned=t.tenant_signed_at&&t.landlord_signed_at
                const partiallySigned=t.tenant_signed_at||t.landlord_signed_at
                return(
                <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px 150px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.estate_properties?.name??'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{t.estate_tenants?.name||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.start_date||'—'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.end_date||'—'}</span>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>{t.rent?'£'+t.rent:' —'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:t.status==='Active'?'#ECFDF5':t.status==='Pending'?'#FEF3C7':'#FEE2E2',color:t.status==='Active'?'#10B981':t.status==='Pending'?'#F59E0B':'#EF4444',display:'inline-block'}}>{t.status}</span>
                  {fullySigned?(
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#D1FAE5',color:'#059669',width:'fit-content'}}>Signed</span>
                  ):(
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {partiallySigned&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#FEF3C7',color:'#D97706'}}>Partial</span>}
                      <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/sign/${t.sign_token}`);alert('Signing link copied')}} style={{fontSize:11,fontWeight:600,color:'#2563EB',background:'none',border:'1px solid #2563EB',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>Copy Link</button>
                      <button onClick={()=>openContractPicker(t)} disabled={sendingSignLink===t.id} style={{fontSize:11,fontWeight:600,color:'#fff',background:'#2563EB',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit',opacity:sendingSignLink===t.id?0.6:1,marginLeft:6}}>{sendingSignLink===t.id?'Sending…':'✉ Email to Tenant'}</button>
                    </div>
                  )}
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setEditItem(t);setTenancy({property:t.property_id,tenant:t.tenant_id,start:t.start_date,end:t.end_date,rent:t.rent,deposit:t.deposit,status:t.status,document_url:t.document_url||''});setShowAddTenancy(true)}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>delRecord('estate_tenancies',t.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              )})}
            </div>
          </div>)}

          {section==='Landlords'&&(<div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {landlords.length===0?<div style={{textAlign:'center',padding:80,color:'#98A2B3',fontSize:14}}>No landlords yet</div>:
              landlords.map((l:any)=>(
                <div key={l.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'#EAF3EE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:ACCENT,flexShrink:0}}>{l.name.charAt(0)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'#101828'}}>{l.name}</div>
                    <div style={{fontSize:12,color:'#667085',marginTop:2}}>{[l.email,l.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{fontSize:13,color:'#667085'}}>{properties.filter((p:any)=>p.owner_id===l.id).length} properties</div>
                  {l.portal_user_id?(
                    <>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:'#D1FAE5',color:'#059669'}}>Portal Active</span>
                      <a href={`/estate-owner-portal?landlord_id=${l.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer',textDecoration:'none'}}>View Portal</a>
                    </>
                  ):(
                    <button onClick={()=>{setPortalLandlord(l);setPortalPassword('')}} style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Give Portal Access</button>
                  )}
                  <button onClick={()=>{setEditItem(l);setLandlordForm({name:l.name,email:l.email||'',phone:l.phone||'',address:l.address||'',bank_name:l.bank_name||'',account_name:l.account_name||'',account_number:l.account_number||'',sort_code:l.sort_code||'',notes:l.notes||'',id_type:l.id_type||'',id_url:l.id_url||'',iban:l.iban||'',swift:l.swift||''});setShowAddLandlord(true)}} style={{fontSize:12,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>delRecord('estate_landlords',l.id)} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}>Delete</button>
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
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Assigned To</div><input value={maintForm.assigned_to} onChange={e=>setMaintForm({...maintForm,assigned_to:e.target.value})} placeholder="Contractor name" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Description</div><textarea value={maintForm.description} onChange={e=>setMaintForm({...maintForm,description:e.target.value})} rows={2} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/></div>
                <div style={{gridColumn:'span 2'}}><FileUpload label="Photo / Document" value={maintForm.photos[0]??''} onChange={url=>setMaintForm({...maintForm,photos:[url]})} folder="estate-maintenance-photos" /></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!maintForm.title)return;saveRecord('estate_maintenance',maintForm);setMaintForm({title:'',property_id:'',description:'',priority:'medium',assigned_to:'',photos:[]});setShowAddMaint(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create ticket</button>
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
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Unit</div><select value={cleanForm.unit_id} onChange={e=>setCleanForm({...cleanForm,unit_id:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',boxSizing:'border-box'}}><option value="">Select unit (optional)…</option>{units.filter((u:any)=>u.property_id===cleanForm.property_id).map((u:any)=><option key={u.id} value={u.id}>{u.unit_number}</option>)}</select></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Scheduled Date</div><input type="date" value={cleanForm.scheduled_date} onChange={e=>setCleanForm({...cleanForm,scheduled_date:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Assigned To</div><input value={cleanForm.assigned_to} onChange={e=>setCleanForm({...cleanForm,assigned_to:e.target.value})} placeholder="Cleaner name" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Notes</div><input value={cleanForm.notes} onChange={e=>setCleanForm({...cleanForm,notes:e.target.value})} placeholder="Optional" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!cleanForm.property_id)return;saveRecord('estate_cleaning_tasks',cleanForm);setCleanForm({property_id:'',unit_id:'',scheduled_date:'',assigned_to:'',notes:''});setShowAddCleaning(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Schedule</button>
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
                <button onClick={()=>{if(!mortgageForm.property||!mortgageForm.amount)return;saveRecord('estate_mortgages',{property_id:mortgageForm.property,bank:mortgageForm.bank,amount:mortgageForm.amount,rate:mortgageForm.rate,start_date:mortgageForm.startDate||null,end_date:mortgageForm.endDate||null,duration:mortgageForm.duration,monthly_payment:mortgageForm.monthlyPayment,insurance:mortgageForm.insurance,type:mortgageForm.type},editItem?.id);setEditItem(null);setMortgageForm({property:'',bank:'',amount:'',rate:'',startDate:'',endDate:'',duration:'25',monthlyPayment:'',insurance:'',type:'Repayment'});setShowAddMortgage(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save Changes':'Add Loan'}</button>
                <button onClick={()=>{setEditItem(null);setShowAddMortgage(false);setMortgageForm({property:'',bank:'',amount:'',rate:'',startDate:'',endDate:'',duration:'25',monthlyPayment:'',insurance:'',type:'Repayment'})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {/* Table */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 100px 100px 100px 100px 80px 90px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Property</span><span>Bank</span><span>Amount</span><span>Rate</span><span>Monthly</span><span>Start</span><span>End</span><span>Type</span><span></span>
              </div>
              {mortgages.length===0?(
                <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>
                  <div style={{fontSize:40,marginBottom:12}}>🏦</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No loans or mortgages yet</div>
                  <div style={{fontSize:13}}>Add your first mortgage or loan to track repayments.</div>
                </div>
              ):mortgages.map((m:any)=>(
                <div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 100px 100px 100px 100px 80px 90px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{m.estate_properties?.name??'—'}</div>
                  </div>
                  <span style={{fontSize:12,color:'#344054'}}>{m.bank||'—'}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>£{parseFloat(m.amount||0).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{m.rate||'—'}%</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(m.monthly_payment||0).toLocaleString()}</span>
                  <span style={{fontSize:11,color:'#667085'}}>{m.start_date||'—'}</span>
                  <span style={{fontSize:11,color:'#667085'}}>{m.end_date||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:'#5B7CFA'}}>{m.type}</span>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <button onClick={()=>{setEditItem(m);setMortgageForm({property:m.property_id??'',bank:m.bank??'',amount:m.amount!=null?String(m.amount):'',rate:m.rate??'',startDate:m.start_date??'',endDate:m.end_date??'',duration:m.duration??'25',monthlyPayment:m.monthly_payment!=null?String(m.monthly_payment):'',insurance:m.insurance??'',type:m.type??'Repayment'});setShowAddMortgage(true)}} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                    <button onClick={()=>delRecord('estate_mortgages',m.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
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
                <div><label style={labelStyle}>Amount (£)</label><input value={rentForm.amount} onChange={e=>setRentForm({...rentForm,amount:e.target.value})} type='number' placeholder='0.00' style={inputStyle}/></div>
                <div><label style={labelStyle}>Due day</label><select value={rentForm.dueDay} onChange={e=>setRentForm({...rentForm,dueDay:e.target.value})} style={inputStyle}>{Array.from({length:28},(_,i)=>String(i+1)).map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label style={labelStyle}>Frequency</label><select value={rentForm.frequency} onChange={e=>setRentForm({...rentForm,frequency:e.target.value})} style={inputStyle}>{['Monthly','Weekly','Quarterly'].map(f=><option key={f}>{f}</option>)}</select></div>
                <div><label style={labelStyle}>Method</label><select value={rentForm.method} onChange={e=>setRentForm({...rentForm,method:e.target.value})} style={inputStyle}>{['Bank Transfer','Direct Debit','Standing Order','Cash','Cheque'].map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!rentForm.tenancy||!rentForm.amount)return;const today=new Date();const due=new Date(today.getFullYear(),today.getMonth(),parseInt(rentForm.dueDay));const selectedTenancy=tenancies.find((t:any)=>t.id===rentForm.tenancy);saveRecord('estate_rent_schedules',{tenancy_id:rentForm.tenancy,tenant_id:selectedTenancy?.tenant_id??null,amount:rentForm.amount,due_day:rentForm.dueDay,frequency:rentForm.frequency,method:rentForm.method,status:due<today?'Overdue':'Pending'});setRentForm({tenancy:'',amount:'',dueDay:'1',frequency:'Monthly',method:'Bank Transfer'});setShowAddRent(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add schedule</button>
                <button onClick={()=>setShowAddRent(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 140px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Tenancy</span><span>Tenant</span><span>Amount</span><span>Due</span><span>Frequency</span><span>Status</span><span>Actions</span>
              </div>
              {rentSchedules.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>💷</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No rent schedules yet</div><div style={{fontSize:13}}>Add a schedule to track rent collection.</div></div>):rentSchedules.map((r:any)=>{
                const scheduleTenancy = tenancies.find((t:any)=>t.id===r.tenancy_id)
                return (
                <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 140px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{scheduleTenancy?.estate_properties?.name??'—'}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{scheduleTenancy?.estate_tenants?.name??'—'}</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(r.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#344054'}}>{r.due_day}{['st','nd','rd'][parseInt(r.due_day)-1]||'th'}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{r.frequency}</span>
                  <select value={r.status} onChange={e=>saveRecord('estate_rent_schedules',{status:e.target.value},r.id)} style={{fontSize:11,fontWeight:600,padding:'4px 8px',borderRadius:4,border:'1px solid #E4E7EC',background:r.status==='Paid'?'#ECFDF5':r.status==='Overdue'?'#FEE2E2':'#FEF3C7',color:r.status==='Paid'?'#10B981':r.status==='Overdue'?'#EF4444':'#F59E0B',cursor:'pointer',fontFamily:'inherit'}}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                  <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                    <button onClick={()=>delRecord('estate_rent_schedules',r.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                  </div>
                </div>
                )
              })}
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
            // Unlike rent (no per-payment date exists yet -- see the
            // note below the table), office_expenses DOES have a real
            // date on every record, so these are genuinely bucketed by
            // the month they actually happened in, not lumped together
            // under whichever month is "now".
            function expensesForMonth(monthIdx: number) {
              return expenses.filter((e:any) => {
                if (!e.date) return false
                const d = new Date(e.date)
                return d.getMonth() === monthIdx && d.getFullYear() === year
              }).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
            }
            const thisMonthExpenses = expensesForMonth(thisMonthIdx)
            return (
            <div>
              <div style={{background:'linear-gradient(135deg,'+ACCENT+',#1B4332)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.7,marginBottom:6}}>NET PROFIT · THIS MONTH</div>
                <div style={{fontSize:36,fontWeight:800}}>£{(collectedRent-thisMonthExpenses).toLocaleString()}</div>
                <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£{collectedRent.toLocaleString()} income (all-time collected rent — see note below) · £{thisMonthExpenses.toLocaleString()} costs this month</div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:20,justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:8}}>
                  {['P&L','Cash Flow','Forecast'].map(t=>(
                    <button key={t} onClick={()=>setReportTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid '+(reportTab===t?ACCENT:'#E4E7EC'),background:reportTab===t?ACCENT:'#fff',color:reportTab===t?'#fff':'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
                  ))}
                </div>
                {reportTab==='P&L'&&<button onClick={()=>downloadCsv(`estate-agency-pl-${year}.csv`, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>{
                  const income = i===thisMonthIdx ? collectedRent : 0
                  const costs = expensesForMonth(i)
                  return { Month: `${m} ${year}`, Income: income, Costs: costs, Expenses: costs, 'Net Profit': income-costs }
                }))} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,fontWeight:600,color:'#344054',cursor:'pointer',fontFamily:'inherit'}}>⬇ Export CSV</button>}
              </div>

              {reportTab==='P&L'&&(<>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const}}>
                  <span>Month</span><span>Income</span><span>Costs</span><span>Expenses</span><span>Net Profit</span>
                </div>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>{
                  const isCurrent = i===thisMonthIdx
                  const income = isCurrent ? collectedRent : 0
                  const costs = expensesForMonth(i)
                  return (
                  <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                    <span>{m} {year}</span><span style={{color:'#10B981'}}>£{income.toLocaleString()}</span><span style={{color:'#EF4444'}}>£{costs.toLocaleString()}</span><span style={{color:'#F59E0B'}}>£{costs.toLocaleString()}</span><span style={{fontWeight:600}}>£{(income-costs).toLocaleString()}</span>
                  </div>
                  )
                })}
              </div>
              <div style={{fontSize:12,color:'#98A2B3',marginTop:8}}>Costs/Expenses above are real per-month totals (each expense has its own date). Income only shows for the current month — rent schedules don't yet record which month a specific payment covers, so historical months can't be split out yet.</div>
              </>)}

              {reportTab==='Cash Flow'&&(() => {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                let cumulative = 0
                const cfData = months.map((m,i) => {
                  const monthTx = transactions.filter((t:any) => {
                    if (!t.date) return false
                    const d = new Date(t.date)
                    return d.getMonth() === i && d.getFullYear() === year
                  })
                  const moneyIn = monthTx.filter((t:any)=>t.type==='Income').reduce((s:number,t:any)=>s+(parseFloat(t.amount)||0),0)
                  const moneyOut = monthTx.filter((t:any)=>t.type==='Expense').reduce((s:number,t:any)=>s+(parseFloat(t.amount)||0),0)
                  const net = moneyIn - moneyOut
                  cumulative += net
                  return { m, moneyIn, moneyOut, net, cumulative }
                })
                const maxVal = Math.max(1, ...cfData.map(d=>d.moneyIn))
                return (
                <div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Cash Flow ({year})</div>
                    <div style={{fontSize:11,color:'#98A2B3',marginBottom:16}}>Real money in/out, from Banking transactions dated this year — not the same income figure as the P&L tab, which only has current-month rent to go on.</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:4,alignItems:'flex-end',height:120,marginBottom:8}}>
                      {cfData.map(d=>(
                        <div key={d.m} style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4}}>
                          <div style={{width:'100%',background:ACCENT+'33',borderRadius:'4px 4px 0 0',height:Math.max(4,(d.moneyIn/maxVal)*80),minHeight:4}}/>
                          <div style={{fontSize:10,color:'#98A2B3'}}>{d.m}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const}}>
                      <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
                    </div>
                    {cfData.map(d=>(
                      <div key={d.m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                        <span>{d.m} {year}</span><span style={{color:'#10B981'}}>£{d.moneyIn.toLocaleString()}</span><span style={{color:'#EF4444'}}>£{d.moneyOut.toLocaleString()}</span><span>£{d.net.toLocaleString()}</span><span>£{d.cumulative.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })()}

              {reportTab==='Forecast'&&(
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,textAlign:'center' as const,color:'#98A2B3'}}>
                  <div style={{fontSize:32,marginBottom:12}}>🔮</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>Revenue Forecast</div>
                  <div style={{fontSize:13}}>Add more transaction history to generate a 12-month forecast.</div>
                </div>
              )}
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
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                    const sorted=[...tenancies].filter((t:any)=>t.status==='Active').sort((a:any,b:any)=>(a.created_at||'').localeCompare(b.created_at||''))
                    const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                    const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).reduce((s:number,t:any)=>s+(parseFloat(t.rent)||0)*12,0);return cum})
                    const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${45-(v/max)*39}`).join(' ')
                    const [lastX,lastY]=pts.split(' ').pop()!.split(',')
                    return (<><polyline points={pts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx={lastX} cy={lastY} r="3" fill="#10B981"/></>)
                  })()}</svg>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>🏘️</span><span style={{fontSize:12,color:'#667085'}}>Properties</span></div>
                  <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>{properties.length}</div>
                  <div style={{fontSize:12,color:'#98A2B3'}}>{tenants.length} tenants</div>
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                    const sorted=[...properties].sort((a:any,b:any)=>(a.created_at||'').localeCompare(b.created_at||''))
                    const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                    const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).length;return cum})
                    const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${45-(v/max)*39}`).join(' ')
                    return <polyline points={pts} fill="none" stroke="#5B7CFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  })()}</svg>
                </div>
                <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>🏠</span><span style={{fontSize:12,color:'#667085'}}>Vacancies</span></div>
                  <div style={{fontSize:32,fontWeight:800,color:'#F59E0B',marginBottom:4}}>{vacancies.filter((v:any)=>v.status==='Available').length}</div>
                  <div style={{fontSize:12,color:'#98A2B3'}}>units available</div>
                  <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}>{(()=>{
                    const sorted=[...vacancies].filter((v:any)=>v.status==='Available').sort((a:any,b:any)=>(a.created_at||'').localeCompare(b.created_at||''))
                    const n=7, chunk=Math.max(1,Math.ceil(sorted.length/n)); let cum=0
                    const vals=Array.from({length:n},(_,i)=>{cum+=sorted.slice(i*chunk,(i+1)*chunk).length;return cum})
                    const max=Math.max(1,...vals); const pts=vals.map((v,i)=>`${5+i*31.6},${25-(v/max)*20}`).join(' ')
                    return <polyline points={pts} fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                  })()}</svg>
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

          {section==='Landlord Statements'&&(() => {
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
            // Suggested rent for the selected landlord -- sum of active
            // tenancy rent on properties they own (estate_properties.owner_id).
            // Genuinely computed from real data, but still just a suggestion
            // staff confirm before saving -- the saved record is what's real,
            // same honest pattern as PM's existing Statements tab.
            const selectedLandlord = landlords.find((l:any)=>l.id===lpForm.landlord_id)
            const landlordPropertyIds = properties.filter((p:any)=>p.owner_id===lpForm.landlord_id).map((p:any)=>p.id)
            const suggestedRent = tenancies.filter((t:any)=>t.status==='Active' && landlordPropertyIds.includes(t.property_id)).reduce((s:number,t:any)=>s+(parseFloat(t.rent)||0),0)
            const commissionRate = selectedLandlord?.commission_rate ?? 12
            const suggestedFee = Math.round(suggestedRent * (commissionRate/100) * 100) / 100
            const suggestedNet = suggestedRent - suggestedFee

            return (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}><div style={{fontSize:24,fontWeight:700,color:'#101828'}}>£{totalPaid.toLocaleString()}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Total Paid to Landlords</div></div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}><div style={{fontSize:24,fontWeight:700,color:'#059669'}}>{onTimeCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Paid On Time</div></div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}><div style={{fontSize:24,fontWeight:700,color:'#D97706'}}>{lateCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Paid Late</div></div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #FEE2E2',padding:20,textAlign:'center' as const}}><div style={{fontSize:24,fontWeight:700,color:'#EF4444'}}>{overdueCount}</div><div style={{fontSize:12,color:'#667085',marginTop:4}}>Overdue</div></div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:16}}>
                <button onClick={()=>downloadCsv(`landlord-statements-${today}.csv`, landlordPayments.map((p:any)=>{
                  const l = landlords.find((x:any)=>x.id===p.landlord_id)
                  const prop = properties.find((x:any)=>x.id===p.property_id)
                  return { Landlord: l?.name??'—', Property: prop?.name??'—', Category: p.category, Amount: p.amount, 'Due Date': p.due_date??'', 'Paid Date': p.paid_date??'', Status: statusFor(p).label }
                }))} style={{background:'#fff',border:'1px solid #D0D5DD',color:'#344054',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>⬇ Export CSV</button>
                <button onClick={()=>{setEditingPaymentId(null);setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''});setShowAddLandlordPayment(true)}} style={{background:ACCENT,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Generate Statement</button>
              </div>

              {showAddLandlordPayment&&(
                <div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
                  <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>{editingPaymentId?'Edit Statement Line':'Generate Statement'}</h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={labelStyle}>Landlord</label><select style={inputStyle} value={lpForm.landlord_id} onChange={e=>setLpForm({...lpForm,landlord_id:e.target.value,property_id:''})}><option value="">Select landlord…</option>{landlords.map((l:any)=><option key={l.id} value={l.id}>{l.name} ({l.commission_rate??12}% fee)</option>)}</select></div>
                    <div><label style={labelStyle}>Property</label><select style={inputStyle} value={lpForm.property_id} onChange={e=>setLpForm({...lpForm,property_id:e.target.value})}><option value="">Select property…</option>{properties.filter((p:any)=>!lpForm.landlord_id||p.owner_id===lpForm.landlord_id).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  </div>
                  {lpForm.landlord_id && suggestedRent>0 && (
                    <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'12px 16px',marginBottom:12,fontSize:12,color:'#166534'}}>
                      Suggested from active tenancies: £{suggestedRent.toLocaleString()} rent − £{suggestedFee.toLocaleString()} fee ({commissionRate}%) = <strong>£{suggestedNet.toLocaleString()} net</strong>
                      <button onClick={()=>setLpForm({...lpForm,category:'Rent Share',amount:String(suggestedNet)})} style={{marginLeft:10,fontSize:11,fontWeight:600,color:'#166534',background:'#DCFCE7',border:'none',borderRadius:6,padding:'3px 10px',cursor:'pointer'}}>Use this amount</button>
                    </div>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={labelStyle}>Category</label><select style={inputStyle} value={lpForm.category} onChange={e=>setLpForm({...lpForm,category:e.target.value})}>{['Rent Share','Utility Bill','Maintenance Reimbursement','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                    <div><label style={labelStyle}>Amount (£)</label><input type="number" style={inputStyle} value={lpForm.amount} onChange={e=>setLpForm({...lpForm,amount:e.target.value})} placeholder="0.00"/></div>
                    <div><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={lpForm.due_date} onChange={e=>setLpForm({...lpForm,due_date:e.target.value})}/></div>
                    <div><label style={labelStyle}>Paid Date (leave blank if not yet paid)</label><input type="date" style={inputStyle} value={lpForm.paid_date} onChange={e=>setLpForm({...lpForm,paid_date:e.target.value})}/></div>
                    <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Notes</label><input style={inputStyle} value={lpForm.notes} onChange={e=>setLpForm({...lpForm,notes:e.target.value})} placeholder="Optional"/></div>
                    <div style={{gridColumn:'span 2'}}><FileUpload label="Receipt (photo or PDF)" value={lpForm.receipt_url} onChange={url=>setLpForm({...lpForm,receipt_url:url})} folder="estate-landlord-payment-receipts" /></div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={async ()=>{
                      if(!lpForm.landlord_id||!lpForm.amount)return
                      const {data:{user}}=await supabase.auth.getUser()
                      const payload={...lpForm,amount:parseFloat(lpForm.amount),due_date:lpForm.due_date||null,paid_date:lpForm.paid_date||null,receipt_url:lpForm.receipt_url||null}
                      const {error}=editingPaymentId
                        ? await supabase.from('estate_landlord_payments').update(payload).eq('id',editingPaymentId)
                        : await supabase.from('estate_landlord_payments').insert([{...payload,user_id:user?.id}])
                      if(error){alert(error.message);return}
                      setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''});setEditingPaymentId(null);setShowAddLandlordPayment(false);await loadAll()
                    }} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
                    <button onClick={()=>{setShowAddLandlordPayment(false);setEditingPaymentId(null);setLpForm({landlord_id:'',property_id:'',category:'Rent Share',amount:'',due_date:'',paid_date:'',notes:'',receipt_url:''})}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 100px 110px 110px 110px 90px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                  <span>Landlord</span><span>Property</span><span>Category</span><span>Amount</span><span>Due</span><span>Paid</span><span>Status</span><span></span>
                </div>
                {landlordPayments.length===0?(
                  <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>📄</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No statements yet</div><div style={{fontSize:13}}>Generate your first landlord statement above.</div></div>
                ):landlordPayments.map((p:any)=>{
                  const l = landlords.find((x:any)=>x.id===p.landlord_id)
                  const prop = properties.find((x:any)=>x.id===p.property_id)
                  const st = statusFor(p)
                  return (
                    <div key={p.id} style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 100px 110px 110px 110px 90px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                      <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{l?.name??'—'}</span>
                      <span style={{fontSize:12,color:'#667085'}}>{prop?.name??'—'}</span>
                      <span style={{fontSize:12,color:'#667085'}}>{p.category}</span>
                      <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>£{parseFloat(p.amount).toLocaleString()}</span>
                      <span style={{fontSize:12,color:'#667085'}}>{p.due_date??'—'}</span>
                      <span style={{fontSize:12,color:'#667085'}}>{p.paid_date??'—'}</span>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:st.bg,color:st.color,width:'fit-content'}}>{st.label}</span>
                      <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                        <button onClick={()=>{setEditingPaymentId(p.id);setLpForm({landlord_id:p.landlord_id??'',property_id:p.property_id??'',category:p.category,amount:String(p.amount),due_date:p.due_date??'',paid_date:p.paid_date??'',notes:p.notes??'',receipt_url:p.receipt_url??''});setShowAddLandlordPayment(true)}} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                        <button onClick={()=>delRecord('estate_landlord_payments',p.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )
          })()}

          {section==='Tenant Checks'&&(() => {
            const CHECK_TYPES = ['Manual','Online','Birth Certificate + NI']
            const rtrStatusColor: Record<string,{bg:string,fg:string}> = {'Unlimited':{bg:'#ECFDF5',fg:'#10B981'},'Time-limited':{bg:'#FFFBEB',fg:'#F59E0B'},'No Right to Rent':{bg:'#FEF2F2',fg:'#EF4444'}}
            const bankStatusColor: Record<string,{bg:string,fg:string}> = {'Passed':{bg:'#ECFDF5',fg:'#10B981'},'Flagged':{bg:'#FFFBEB',fg:'#F59E0B'},'Failed':{bg:'#FEF2F2',fg:'#EF4444'}}
            const editingTenancy = tenancies.find((t:any)=>t.id===editingChecksTenancyId)
            const ratio = editingTenancy ? rentToIncomeRatio(parseFloat(editingTenancy.rent)||0, parseFloat(bankCheckForm.declared_income)||0) : null

            return (
            <div>
              <div style={{fontSize:13,color:'#667085',marginBottom:20}}>Right to Rent (Immigration Act 2014) and Bank Statement affordability checks, per tenancy. Bank statement review is a manual record of what staff checked — it doesn't connect to any bank automatically.</div>

              {!editingChecksTenancyId ? (
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 130px 130px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                    <span>Tenant</span><span>Property</span><span>Right to Rent</span><span>Bank Check</span><span></span>
                  </div>
                  {tenancies.length===0?(
                    <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🛂</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No tenancies yet</div></div>
                  ):tenancies.map((t:any)=>{
                    const rtr = rtrChecks.find((r:any)=>r.tenancy_id===t.id)
                    const bank = bankChecks.find((b:any)=>b.tenancy_id===t.id)
                    return (
                      <div key={t.id} style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 130px 130px 100px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.estate_tenants?.name??'—'}</span>
                        <span style={{fontSize:12,color:'#667085'}}>{t.estate_properties?.name??'—'}</span>
                        {rtr ? <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:rtrStatusColor[rtr.status]?.bg,color:rtrStatusColor[rtr.status]?.fg,width:'fit-content'}}>{rtr.status}</span> : <span style={{fontSize:12,color:'#98A2B3'}}>Not checked</span>}
                        {bank ? <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,background:bankStatusColor[bank.status]?.bg,color:bankStatusColor[bank.status]?.fg,width:'fit-content'}}>{bank.status}</span> : <span style={{fontSize:12,color:'#98A2B3'}}>Not checked</span>}
                        <button onClick={()=>openEditChecks(t.id)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>{rtr||bank?'Edit':'Add Checks'}</button>
                      </div>
                    )
                  })}
                </div>
              ) : (
              <div>
                <button onClick={()=>setEditingChecksTenancyId(null)} style={{fontSize:12,color:'#667085',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:14}}>&larr; Back to list</button>
                <div style={{fontSize:15,fontWeight:700,color:'#101828',marginBottom:2}}>Tenant Checks — {editingTenancy?.estate_tenants?.name}</div>
                <div style={{fontSize:12,color:'#98A2B3',marginBottom:20}}>{editingTenancy?.estate_properties?.name}</div>

                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:22,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:16}}>🛂 Right to Rent</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={rtrForm.full_name} onChange={e=>setRtrForm({...rtrForm,full_name:e.target.value})}/></div>
                    <div><label style={labelStyle}>Date of Birth</label><input type="date" style={inputStyle} value={rtrForm.date_of_birth} onChange={e=>setRtrForm({...rtrForm,date_of_birth:e.target.value})}/></div>
                    <div><label style={labelStyle}>Current Address</label><input style={inputStyle} value={rtrForm.current_address} onChange={e=>setRtrForm({...rtrForm,current_address:e.target.value})}/></div>
                    <div><label style={labelStyle}>Check Type</label><select style={inputStyle} value={rtrForm.check_type} onChange={e=>setRtrForm({...rtrForm,check_type:e.target.value})}>{CHECK_TYPES.map(c=><option key={c}>{c}</option>)}</select></div>
                    {rtrForm.check_type==='Manual'&&<div><label style={labelStyle}>Document Type</label><input style={inputStyle} placeholder="e.g. Passport, BRP, Visa" value={rtrForm.document_type} onChange={e=>setRtrForm({...rtrForm,document_type:e.target.value})}/></div>}
                    {rtrForm.check_type==='Online'&&<div><label style={labelStyle}>Share Code</label><input style={inputStyle} placeholder="e.g. W2G 4Q7 R2X" value={rtrForm.share_code} onChange={e=>setRtrForm({...rtrForm,share_code:e.target.value})}/></div>}
                    {rtrForm.check_type==='Birth Certificate + NI'&&<div><label style={labelStyle}>National Insurance Number</label><input style={inputStyle} value={rtrForm.ni_number} onChange={e=>setRtrForm({...rtrForm,ni_number:e.target.value})}/></div>}
                    <div><label style={labelStyle}>Status</label><select style={inputStyle} value={rtrForm.status} onChange={e=>setRtrForm({...rtrForm,status:e.target.value})}><option>Unlimited</option><option>Time-limited</option><option>No Right to Rent</option></select></div>
                    <div><label style={labelStyle}>Check Date</label><input type="date" style={inputStyle} value={rtrForm.check_date} onChange={e=>setRtrForm({...rtrForm,check_date:e.target.value})}/></div>
                    <div><label style={labelStyle}>Checked By</label><input style={inputStyle} value={rtrForm.checked_by} onChange={e=>setRtrForm({...rtrForm,checked_by:e.target.value})}/></div>
                    {rtrForm.status==='Time-limited'&&<div><label style={labelStyle}>Re-check Due Date *</label><input type="date" style={inputStyle} value={rtrForm.recheck_date} onChange={e=>setRtrForm({...rtrForm,recheck_date:e.target.value})}/></div>}
                    <div style={{gridColumn:'span 2'}}><FileUpload label="Document / Check Evidence" value={rtrForm.document_url} onChange={url=>setRtrForm({...rtrForm,document_url:url})} folder="estate-rtr-checks" /></div>
                  </div>
                  {rtrForm.status==='Time-limited'&&!rtrForm.recheck_date&&<div style={{fontSize:12,color:'#F59E0B',marginBottom:8}}>⚠ Time-limited right to rent requires a re-check date before this permission expires.</div>}
                  <div><label style={labelStyle}>Notes</label><textarea style={{...inputStyle,minHeight:60,resize:'vertical' as const}} value={rtrForm.notes} onChange={e=>setRtrForm({...rtrForm,notes:e.target.value})}/></div>
                </div>

                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:22,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:16}}>🏦 Bank Statement Check</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                    <div><label style={labelStyle}>Statement Start</label><input type="date" style={inputStyle} value={bankCheckForm.statement_start} onChange={e=>setBankCheckForm({...bankCheckForm,statement_start:e.target.value})}/></div>
                    <div><label style={labelStyle}>Statement End</label><input type="date" style={inputStyle} value={bankCheckForm.statement_end} onChange={e=>setBankCheckForm({...bankCheckForm,statement_end:e.target.value})}/></div>
                    <div><label style={labelStyle}>Declared Monthly Income (£)</label><input type="number" style={inputStyle} value={bankCheckForm.declared_income} onChange={e=>setBankCheckForm({...bankCheckForm,declared_income:e.target.value})}/></div>
                  </div>

                  {ratio && (
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,color:'#667085'}}>Rent-to-Income Ratio (rent £{editingTenancy?.rent})</span>
                        <span style={{fontSize:12,fontWeight:600,color:ratio.withinGuideline?'#10B981':'#EF4444'}}>{ratio.pct}% — {ratio.withinGuideline?'within guideline (max ~40%)':'above guideline (max ~40%)'}</span>
                      </div>
                      <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:Math.min(ratio.pct,100)+'%',background:ratio.withinGuideline?'#10B981':'#EF4444'}}/></div>
                    </div>
                  )}

                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:8}}>Red Flags Checked</div>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                      {[['income_regular','Income deposits regular and matching declared employer'],['no_overdraft','No unauthorized overdraft usage'],['no_bounced_payments','No bounced payments / returned direct debits'],['no_gambling_flags','No excessive gambling transactions']].map(([key,label])=>(
                        <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#344054',cursor:'pointer'}}>
                          <input type="checkbox" checked={(bankCheckForm as any)[key]} onChange={e=>setBankCheckForm({...bankCheckForm,[key]:e.target.checked})}/>
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{marginBottom:14,background:'#F5F6FF',border:'1px solid #DCE0FF',borderRadius:10,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:bankCheckForm.ai_assessment?10:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#344054'}}>🤖 AI Affordability Opinion <span style={{fontWeight:400,color:'#98A2B3'}}>— advisory only, not a decision</span></div>
                      <button onClick={()=>generateAssessment(parseFloat(editingTenancy?.rent)||0)} disabled={generatingAssessment||!bankCheckForm.declared_income} style={{fontSize:11,fontWeight:600,color:'#fff',background:ACCENT,border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',opacity:generatingAssessment||!bankCheckForm.declared_income?0.6:1}}>{generatingAssessment?'Thinking…':bankCheckForm.ai_assessment?'Regenerate':'Generate Opinion'}</button>
                    </div>
                    {!bankCheckForm.declared_income&&<div style={{fontSize:11,color:'#98A2B3'}}>Add declared monthly income above first.</div>}
                    {bankCheckForm.ai_assessment&&(
                      <div>
                        <div style={{fontSize:12,color:'#344054',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{bankCheckForm.ai_assessment}</div>
                        <div style={{fontSize:10,color:'#98A2B3',marginTop:8}}>Generated {bankCheckForm.ai_assessment_generated_at?new Date(bankCheckForm.ai_assessment_generated_at).toLocaleString():''} — staff makes the final call, this doesn't set Status automatically.</div>
                      </div>
                    )}
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                    <div><label style={labelStyle}>Status</label><select style={inputStyle} value={bankCheckForm.status} onChange={e=>setBankCheckForm({...bankCheckForm,status:e.target.value})}><option>Passed</option><option>Flagged</option><option>Failed</option></select></div>
                    <div><label style={labelStyle}>Check Date</label><input type="date" style={inputStyle} value={bankCheckForm.check_date} onChange={e=>setBankCheckForm({...bankCheckForm,check_date:e.target.value})}/></div>
                    <div><label style={labelStyle}>Checked By</label><input style={inputStyle} value={bankCheckForm.checked_by} onChange={e=>setBankCheckForm({...bankCheckForm,checked_by:e.target.value})}/></div>
                  </div>
                  <div style={{marginBottom:14}}><FileUpload label="Bank Statement" value={bankCheckForm.document_url} onChange={url=>setBankCheckForm({...bankCheckForm,document_url:url})} folder="estate-bank-checks" /></div>
                  <div><label style={labelStyle}>Notes</label><textarea style={{...inputStyle,minHeight:60,resize:'vertical' as const}} value={bankCheckForm.notes} onChange={e=>setBankCheckForm({...bankCheckForm,notes:e.target.value})}/></div>
                </div>

                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>saveChecks(editingChecksTenancyId)} disabled={savingChecks} style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:savingChecks?0.6:1}}>{savingChecks?'Saving…':'Save Checks'}</button>
                  <button onClick={()=>setEditingChecksTenancyId(null)} style={{padding:'10px 24px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
              )}
            </div>
            )
          })()}

          {STUB_SECTIONS.includes(section)&&(
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>🏗️</div>
              <div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>{section}</div>
              <div style={{fontSize:14,color:'#667085',marginBottom:20}}>This section is coming soon. Core modules (Properties, Tenants, Tenancies, Finance) are fully functional.</div>
              <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Request early access</button>
            </div>
          )}

        </div>
      </div>
      {viewingPhotos&&<PropertyImageSlideshow urls={viewingPhotos} onClose={()=>setViewingPhotos(null)}/>}

      {showAddLandlord&&(
        <Modal title={editItem?'Edit Landlord':'Add Landlord'} onClose={()=>{setShowAddLandlord(false);setEditItem(null);setLandlordForm({name:'',email:'',phone:'',address:'',bank_name:'',account_name:'',account_number:'',sort_code:'',notes:'',id_type:'',id_url:'',iban:'',swift:''})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={landlordForm.name} onChange={e=>setLandlordForm({...landlordForm,name:e.target.value})} placeholder="e.g. Marcus Whitfield"/></div>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={landlordForm.email} onChange={e=>setLandlordForm({...landlordForm,email:e.target.value})} placeholder="john@example.com"/></div>
            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={landlordForm.phone} onChange={e=>setLandlordForm({...landlordForm,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            <div><label style={labelStyle}>Address</label><input style={inputStyle} value={landlordForm.address} onChange={e=>setLandlordForm({...landlordForm,address:e.target.value})} placeholder="123 Main Street, London"/></div>
            <div><label style={labelStyle}>Notes</label><textarea style={{...inputStyle,resize:'vertical' as const}} rows={3} value={landlordForm.notes} onChange={e=>setLandlordForm({...landlordForm,notes:e.target.value})}/></div>
            <div><label style={labelStyle}>ID Type</label>
              <select style={{...inputStyle,cursor:'pointer'}} value={landlordForm.id_type} onChange={e=>setLandlordForm({...landlordForm,id_type:e.target.value})}>
                <option value="">Select…</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <FileUpload label="ID Document" value={landlordForm.id_url} onChange={url=>setLandlordForm({...landlordForm,id_url:url})} folder="estate-landlord-ids" />

            {editItem && (
              <div style={{borderTop:'1px solid #F2F4F7',paddingTop:14,marginTop:4}}>
                <div style={{fontSize:13,fontWeight:600,color:'#344054',marginBottom:8}}>Assigned Properties</div>
                <div style={{border:'1px solid #EAECF0',borderRadius:8,maxHeight:160,overflowY:'auto',padding:4}}>
                  {properties.length===0 && <div style={{padding:10,fontSize:12,color:'#98A2B3'}}>No properties on file.</div>}
                  {properties.map((p:any)=>{
                    const checked = p.owner_id === editItem.id
                    return (
                      <label key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',fontSize:13,cursor:'pointer',borderRadius:6}}>
                        <input type="checkbox" checked={checked} onChange={()=>{
                          const currentIds = properties.filter((x:any)=>x.owner_id===editItem.id).map((x:any)=>x.id)
                          const nextIds = checked ? currentIds.filter((id:string)=>id!==p.id) : [...currentIds,p.id]
                          assignPropertiesToLandlord(editItem.id, nextIds)
                        }} />
                        {p.name}{p.owner_id && p.owner_id!==editItem.id ? <span style={{color:'#98A2B3',fontSize:11}}> (assigned to another landlord)</span> : ''}
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
                  <div><label style={labelStyle}>Bank Name</label><input style={inputStyle} value={landlordForm.bank_name} onChange={e=>setLandlordForm({...landlordForm,bank_name:e.target.value})} placeholder="e.g. Barclays"/></div>
                  <div><label style={labelStyle}>Account Name</label><input style={inputStyle} value={landlordForm.account_name} onChange={e=>setLandlordForm({...landlordForm,account_name:e.target.value})} placeholder="Full name on account"/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={landlordForm.account_number} onChange={e=>setLandlordForm({...landlordForm,account_number:e.target.value})} placeholder="12345678"/></div>
                  <div><label style={labelStyle}>Sort Code</label><input style={inputStyle} value={landlordForm.sort_code} onChange={e=>setLandlordForm({...landlordForm,sort_code:e.target.value})} placeholder="00-00-00"/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><label style={labelStyle}>IBAN</label><input style={inputStyle} value={landlordForm.iban} onChange={e=>setLandlordForm({...landlordForm,iban:e.target.value})} placeholder="GB00 XXXX 0000 0000 0000 00"/></div>
                  <div><label style={labelStyle}>SWIFT / BIC</label><input style={inputStyle} value={landlordForm.swift} onChange={e=>setLandlordForm({...landlordForm,swift:e.target.value})} placeholder="BARCGB22"/></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>{setShowAddLandlord(false);setEditItem(null);setLandlordForm({name:'',email:'',phone:'',address:'',bank_name:'',account_name:'',account_number:'',sort_code:'',notes:'',id_type:'',id_url:'',iban:'',swift:''})}} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={async()=>{
              if(!landlordForm.name)return
              await saveRecord('estate_landlords',landlordForm,editItem?.id)
              setEditItem(null);setShowAddLandlord(false)
              setLandlordForm({name:'',email:'',phone:'',address:'',bank_name:'',account_name:'',account_number:'',sort_code:'',notes:'',id_type:'',id_url:'',iban:'',swift:''})
            }} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{editItem?'Save Changes':'Add Landlord'}</button>
          </div>
        </Modal>
      )}

      {portalLandlord&&(
        <Modal title={`Give ${portalLandlord.name} portal access`} onClose={()=>setPortalLandlord(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:13,color:'#667085'}}>This creates a login for {portalLandlord.name} so they can see their own properties, tenancies, and documents. Share the email/password with them yourself.</div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={portalLandlord.email??''} onChange={e=>setPortalLandlord({...portalLandlord,email:e.target.value})} placeholder="landlord@example.com"/></div>
            <div><label style={labelStyle}>Password</label><input style={inputStyle} value={portalPassword} onChange={e=>setPortalPassword(e.target.value)} placeholder="min. 6 characters"/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setPortalLandlord(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={async ()=>{
              if(!portalLandlord.email||!portalPassword)return
              setCreatingPortal(true)
              const {data:{session}}=await supabase.auth.getSession()
              const res=await fetch('/api/create-estate-landlord-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token??''}`},body:JSON.stringify({landlord_id:portalLandlord.id,email:portalLandlord.email,password:portalPassword})})
              const result=await res.json()
              setCreatingPortal(false)
              if(!res.ok){alert(result.error||'Could not create portal access');return}
              alert(`Portal access created. Share these details with ${portalLandlord.name}:\n\nEmail: ${portalLandlord.email}\nPassword: ${portalPassword}\nLogin at: helloopero.com/login`)
              setPortalLandlord(null);await loadAll()
            }} disabled={creatingPortal||!portalLandlord.email||!portalPassword} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:creatingPortal||!portalLandlord.email||!portalPassword?0.6:1}}>{creatingPortal?'Creating…':'Create Portal Access'}</button>
          </div>
        </Modal>
      )}

      {portalTenant&&(
        <Modal title={`Give ${portalTenant.name} portal access`} onClose={()=>setPortalTenant(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:13,color:'#667085'}}>This creates a login for {portalTenant.name} so they can see their tenancy, payment history, and submit maintenance requests. Share the email/password with them yourself.</div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={portalTenant.email??''} onChange={e=>setPortalTenant({...portalTenant,email:e.target.value})} placeholder="tenant@example.com"/></div>
            <div><label style={labelStyle}>Password</label><input style={inputStyle} value={tenantPortalPassword} onChange={e=>setTenantPortalPassword(e.target.value)} placeholder="min. 6 characters"/></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>setPortalTenant(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={async ()=>{
              if(!portalTenant.email||!tenantPortalPassword)return
              setCreatingTenantPortal(true)
              const {data:{session}}=await supabase.auth.getSession()
              const res=await fetch('/api/create-estate-tenant-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token??''}`},body:JSON.stringify({tenant_id:portalTenant.id,email:portalTenant.email,password:tenantPortalPassword})})
              const result=await res.json()
              setCreatingTenantPortal(false)
              if(!res.ok){alert(result.error||'Could not create portal access');return}
              alert(`Portal access created. Share these details with ${portalTenant.name}:\n\nEmail: ${portalTenant.email}\nPassword: ${tenantPortalPassword}\nLogin at: helloopero.com/login`)
              setPortalTenant(null);await loadAll()
            }} disabled={creatingTenantPortal||!portalTenant.email||!tenantPortalPassword} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:creatingTenantPortal||!portalTenant.email||!tenantPortalPassword?0.6:1}}>{creatingTenantPortal?'Creating…':'Create Portal Access'}</button>
          </div>
        </Modal>
      )}

      {showContractPicker&&(() => {
        const pickerTenancy = tenancies.find((t:any)=>t.id===showContractPicker)
        const selectedTemplate = contractTemplates.find((ct:any)=>ct.id===selectedTemplateId)
        return (
        <Modal title="Email Signing Link" onClose={()=>{setShowContractPicker(null);setSelectedTemplateId('');setEditableContractText('')}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:13,color:'#667085'}}>Pick which contract this tenant is signing. This becomes the tenancy's official document — the same one the signing page shows.</div>
            <div>
              <label style={labelStyle}>Contract</label>
              <select style={inputStyle} value={selectedTemplateId} onChange={e=>pickTemplate(e.target.value, pickerTenancy)}>
                <option value="">No document attached (signature only)</option>
                {contractTemplates.map((ct:any)=><option key={ct.id} value={ct.id}>{ct.name}{ct.body?' (editable)':''}</option>)}
              </select>
              {contractTemplates.length===0&&<div style={{fontSize:12,color:'#98A2B3',marginTop:6}}>No contract templates yet — add master versions under Company &gt; Contract Templates.</div>}
            </div>

            <div>
              <label style={labelStyle}>Send From</label>
              {sendingAddresses.length>0 ? (
                <select style={inputStyle} value={selectedSendFrom} onChange={e=>setSelectedSendFrom(e.target.value)}>
                  {sendingAddresses.map((a:any)=><option key={a.id} value={a.id}>{a.name} &lt;{a.email}&gt;</option>)}
                </select>
              ) : (
                <div style={{fontSize:12,color:'#98A2B3'}}>No sending addresses saved yet — will send from Opero's default address.</div>
              )}
              {!showAddSendAddress ? (
                <button onClick={()=>setShowAddSendAddress(true)} style={{fontSize:11,color:ACCENT,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:6,padding:0}}>+ Add a sending address</button>
              ) : (
                <div style={{display:'flex',gap:8,marginTop:8,alignItems:'flex-end'}}>
                  <div style={{flex:1}}><label style={{...labelStyle,fontSize:11}}>Name</label><input style={inputStyle} placeholder="e.g. Lettings Team" value={newSendAddress.name} onChange={e=>setNewSendAddress({...newSendAddress,name:e.target.value})}/></div>
                  <div style={{flex:1}}><label style={{...labelStyle,fontSize:11}}>Email</label><input style={inputStyle} placeholder="lettings@sangstersgroup.com" value={newSendAddress.email} onChange={e=>setNewSendAddress({...newSendAddress,email:e.target.value})}/></div>
                  <button onClick={saveSendAddress} style={{padding:'9px 14px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>Save</button>
                  <button onClick={()=>{setShowAddSendAddress(false);setNewSendAddress({name:'',email:''})}} style={{padding:'9px 12px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>×</button>
                </div>
              )}
            </div>

            {selectedTemplate?.body && (
              <div>
                <label style={labelStyle}>Review &amp; edit before sending</label>
                <textarea
                  value={editableContractText}
                  onChange={e=>setEditableContractText(e.target.value)}
                  style={{...inputStyle,minHeight:260,resize:'vertical' as const,lineHeight:1.6,fontSize:13}}
                />
                <div style={{fontSize:11,color:'#98A2B3',marginTop:6}}>Pre-filled from {pickerTenancy?.estate_tenants?.name}'s real tenancy dates and rent — change anything before sending.</div>
              </div>
            )}
            {selectedTemplate && !selectedTemplate.body && (
              <div style={{fontSize:12,color:'#667085',background:'#F9FAFB',borderRadius:8,padding:'10px 14px'}}>This is an uploaded file, not an editable template — it'll be attached as-is. <a href={selectedTemplate.url} target="_blank" rel="noreferrer" style={{color:ACCENT}}>View file</a></div>
            )}
          </div>
          <div style={{display:'flex',gap:10,marginTop:24}}>
            <button onClick={()=>{setShowContractPicker(null);setSelectedTemplateId('');setEditableContractText('')}} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>emailSigningLink(showContractPicker)} disabled={sendingSignLink===showContractPicker} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:sendingSignLink===showContractPicker?0.6:1}}>{sendingSignLink===showContractPicker?'Sending…':'Send Email'}</button>
          </div>
        </Modal>
        )
      })()}
    </div>
  )
}
