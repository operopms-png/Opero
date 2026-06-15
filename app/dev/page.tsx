'use client'
import { useEffect, useState } from 'react'
import WeatherWidget from '@/components/WeatherWidget'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const TABS = ['Dashboard','Projects','Budget','Investors','Documents','Expenses','Banking','Reports','Milestones']
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:520, margin:'0 16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string,{bg:string,color:string}> = {
  planning: { bg:'#EEF0FF', color:'#3B4AFF' },
  active: { bg:'#D1FAE5', color:'#059669' },
  on_hold: { bg:'#FEF3C7', color:'#D97706' },
  completed: { bg:'#F3F4F6', color:'#6B7280' },
  pending: { bg:'#FEF3C7', color:'#D97706' },
  paid: { bg:'#D1FAE5', color:'#059669' },
  over_budget: { bg:'#FEE2E2', color:'#DC2626' },
}

export default function DevPage() {
  const [tab, setTab] = useState('Dashboard')
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed',notes:''})
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBank, setShowAddBank] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [bankForm, setBankForm] = useState({name:'',type:'Current',balance:'',currency:'GBP'})
  const [txForm, setTxForm] = useState({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'})
  const [bankingTab, setBankingTab] = useState('Overview')
  const [reportTab, setReportTab] = useState('P&L')
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [budgetItems, setBudgetItems] = useState<any[]>([])
  const [investors, setInvestors] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      await loadAll()
      setLoading(false)
    }
    init()
  }, [])

  async function loadAll() {
    const [p, b, i, d, m] = await Promise.all([
      supabase.from('dev_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('dev_budget_items').select('*, dev_projects(name)').order('created_at', { ascending: false }),
      supabase.from('dev_investors').select('*, dev_projects(name)').order('created_at', { ascending: false }),
      supabase.from('dev_documents').select('*, dev_projects(name)').order('created_at', { ascending: false }),
      supabase.from('dev_milestones').select('*, dev_projects(name)').order('due_date', { ascending: true }),
    ])
    setProjects(p.data ?? [])
    setBudgetItems(b.data ?? [])
    setInvestors(i.data ?? [])
    setDocuments(d.data ?? [])
    setMilestones(m.data ?? [])
  }

  async function save(table: string, data: any) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) {
      await supabase.from(table).update({ ...data }).eq('id', editId)
    } else {
      await supabase.from(table).insert([{ ...data, user_id: user?.id }])
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await loadAll()
  }

  async function del(table: string, id: string) {
    if (!confirm('Delete?')) return
    await supabase.from(table).delete().eq('id', id)
    await loadAll()
  }

  function openEdit(modalName: string, record: any) {
    setForm(record); setEditId(record.id); setModal(modalName)
  }

  const totalBudget = projects.reduce((s, p) => s + (p.total_budget ?? 0), 0)
  const totalSpent = projects.reduce((s, p) => s + (p.spent ?? 0), 0)
  const totalInvestment = investors.reduce((s, i) => s + (i.investment_amount ?? 0), 0)
  const activeProjects = projects.filter(p => p.status === 'active').length
  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", color:'#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, background:'#8B5CF6', borderRadius:'50%' }} />
            <h1 style={{ fontSize:18, fontWeight:600, margin:0, color:'#101828' }}>Developments</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {tab==='Projects' && <button onClick={()=>{setModal('project');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ New Project</button>}
            {tab==='Budget' && <button onClick={()=>{setModal('budget');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Budget Item</button>}
            {tab==='Investors' && <button onClick={()=>{setModal('investor');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Investor</button>}
            {tab==='Documents' && <button onClick={()=>{setModal('document');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Document</button>}
    
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
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {['Property','Staff','Overhead'].map(cat=>(
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
                  <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}>{['Confirmed','Estimated'].map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{if(!expForm.description||!expForm.amount)return;setExpenses([...expenses,{id:Date.now(),...expForm}]);setExpForm({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed',notes:''});setShowAddExpense(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
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
            )}
          </div>
        )}

        {tab==='Reports'&&(
          <div>
            <div style={{background:'linear-gradient(135deg,#101828,#1D2939)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',opacity:0.6,marginBottom:6}}>NET PROFIT · THIS MONTH</div>
              <div style={{fontSize:36,fontWeight:800}}>£{(0-expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString()}</div>
              <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£0 income · £{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()} costs</div>
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
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>(
                <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                  <span>{m} {new Date().getFullYear()}</span><span style={{color:'#10B981'}}>£0</span><span style={{color:'#EF4444'}}>£0</span><span style={{color:'#F59E0B'}}>£0</span><span style={{fontWeight:600}}>£0</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='Milestones' && <button onClick={()=>{setModal('milestone');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Milestone</button>}
          </div>
        </div>
        <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:tab===t?'#8B5CF6':'#667085', borderBottom:tab===t?'2px solid #8B5CF6':'2px solid transparent', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t}</button>)}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 32px' }}>

        {/* DASHBOARD */}
        {tab==='Dashboard' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                { label:'Total Projects', value:projects.length, sub:`${activeProjects} active` },
                { label:'Total Budget', value:`£${totalBudget.toLocaleString()}`, sub:'Across all projects', purple:true },
                { label:'Total Spent', value:`£${totalSpent.toLocaleString()}`, sub:`${totalBudget>0?Math.round((totalSpent/totalBudget)*100):0}% of budget`, amber:true },
                { label:'Total Investment', value:`£${totalInvestment.toLocaleString()}`, sub:`${investors.length} investors`, green:true },
              ].map((c:any) => (
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:c.purple?'#8B5CF6':c.amber?'#F59E0B':c.green?'#10B981':'#101828', letterSpacing:'-0.02em' }}>{c.value}</div>
                  <div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Budget vs Spent</div>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'#667085', marginBottom:12 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#8B5CF6', display:'inline-block', borderRadius:2 }}></span>Budget</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#F59E0B', display:'inline-block', borderRadius:2 }}></span>Spent</span>
                </div>
                <svg viewBox="0 0 300 80" style={{ width:'100%' }}>
                  <polyline points="10,70 60,55 110,50 160,35 210,30 260,20 290,15" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10,75 60,68 110,65 160,55 210,50 260,42 290,38" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*56)} y={78} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Project Status</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:8 }}>
                  {[
                    { label:'Planning', count:projects.filter((p:any)=>p.status==='planning').length, color:'#8B5CF6' },
                    { label:'Active', count:projects.filter((p:any)=>p.status==='active').length, color:'#10B981' },
                    { label:'On Hold', count:projects.filter((p:any)=>p.status==='on_hold').length, color:'#F59E0B' },
                    { label:'Completed', count:projects.filter((p:any)=>p.status==='completed').length, color:'#667085' },
                  ].map((s:any)=>(
                    <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ fontSize:12, color:'#667085', width:72 }}>{s.label}</div>
                      <div style={{ flex:1, background:'#F2F4F7', borderRadius:100, height:8 }}>
                        <div style={{ background:s.color, borderRadius:100, height:8, width:projects.length>0?`${Math.round((s.count/projects.length)*100)}%`:'0%' }}/>
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#101828', width:20, textAlign:'right' }}>{s.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Milestones + Investors */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Upcoming Milestones</div>
                {milestones.filter((m:any)=>m.status!=='completed').slice(0,5).length===0 ? <div style={{ color:'#98A2B3', fontSize:13 }}>No upcoming milestones</div> :
                milestones.filter((m:any)=>m.status!=='completed').slice(0,5).map((m:any) => {
                  const overdue = m.due_date && m.due_date < today && m.status !== 'completed'
                  return (
                    <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}>
                      <div>
                        <div style={{ fontWeight:500, color:'#101828' }}>{m.name}</div>
                        <div style={{ fontSize:11, color:overdue?'#EF4444':'#667085' }}>{m.dev_projects?.name} · {m.due_date}{overdue?' · Overdue':''}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:overdue?'#FEE2E2':'#EEF0FF', color:overdue?'#DC2626':'#3B4AFF' }}>{m.status}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Investor Summary</div>
                {investors.length===0 ? <div style={{ color:'#98A2B3', fontSize:13 }}>No investors yet</div> :
                investors.slice(0,5).map((i:any) => (
                  <div key={i.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}>
                    <div>
                      <div style={{ fontWeight:500, color:'#101828' }}>{i.name}</div>
                      <div style={{ fontSize:11, color:'#667085' }}>{i.dev_projects?.name} · {i.equity_percentage}% equity</div>
                    </div>
                    <span style={{ fontWeight:600, color:'#10B981' }}>£{(i.investment_amount??0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active project cards */}
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:12 }}>Projects</div>
              {projects.length===0 ? (
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:40, textAlign:'center', color:'#98A2B3', fontSize:14 }}>No projects yet — click Projects tab to add one.</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
                  {projects.map((p:any) => {
                    const pct = p.total_budget > 0 ? Math.round((p.spent / p.total_budget) * 100) : 0
                    const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.planning
                    return (
                      <div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div style={{ fontWeight:600, fontSize:15, color:'#101828' }}>{p.name}</div>
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:sc.bg, color:sc.color, textTransform:'capitalize' }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize:13, color:'#667085', marginBottom:12 }}>{p.location}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#667085', marginBottom:6 }}>
                          <span>Budget: £{(p.total_budget??0).toLocaleString()}</span>
                          <span>Spent: £{(p.spent??0).toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ background:'#F2F4F7', borderRadius:100, height:6 }}>
                          <div style={{ background:pct>90?'#EF4444':pct>70?'#F59E0B':'#8B5CF6', borderRadius:100, height:6, width:`${Math.min(100,pct)}%` }} />
                        </div>
                        {p.end_date && <div style={{ fontSize:11, color:'#98A2B3', marginTop:8 }}>Due: {p.end_date}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
            <WeatherWidget />
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Quick Stats</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Total Projects</span><span style={{ fontWeight:600, color:'#101828' }}>{projects.length}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Active</span><span style={{ fontWeight:600, color:'#10B981' }}>{projects.filter((p:any)=>p.status==='active').length}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Total Budget</span><span style={{ fontWeight:600, color:'#8B5CF6' }}>£{totalBudget.toLocaleString()}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Total Spent</span><span style={{ fontWeight:600, color:'#F59E0B' }}>£{totalSpent.toLocaleString()}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Investors</span><span style={{ fontWeight:600, color:'#101828' }}>{investors.length}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Total Investment</span><span style={{ fontWeight:600, color:'#10B981' }}>£{totalInvestment.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* PROJECTS */}
        {tab==='Projects' && (
          <div>
            {projects.length===0 ? <div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No projects yet</div> :
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
              {projects.map(p => {
                const pct = p.total_budget > 0 ? Math.round((p.spent / p.total_budget) * 100) : 0
                const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.planning
                return (
                  <div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ fontWeight:600, fontSize:15, color:'#101828' }}>{p.name}</div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:sc.bg, color:sc.color, textTransform:'capitalize' }}>{p.status}</span>
                    </div>
                    <div style={{ fontSize:13, color:'#667085', marginBottom:4 }}>{p.location}</div>
                    <div style={{ fontSize:13, color:'#667085', marginBottom:12 }}>{p.description}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#667085', marginBottom:8 }}>
                      <span>Budget: £{(p.total_budget??0).toLocaleString()}</span>
                      <span>Spent: {pct}%</span>
                    </div>
                    <div style={{ background:'#F2F4F7', borderRadius:100, height:6, marginBottom:12 }}>
                      <div style={{ background:pct>90?'#EF4444':pct>70?'#F59E0B':'#8B5CF6', borderRadius:100, height:6, width:`${Math.min(100,pct)}%` }} />
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>openEdit('project',p)} style={{ fontSize:12, color:'#8B5CF6', background:'none', border:'1px solid #8B5CF6', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>del('dev_projects',p.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer', padding:0 }}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>}
          </div>
        )}

        {/* BUDGET */}
        {tab==='Budget' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[
                { label:'Total Budgeted', value:`£${budgetItems.reduce((s,b)=>s+(b.budgeted??0),0).toLocaleString()}`, color:'#101828' },
                { label:'Total Actual', value:`£${budgetItems.reduce((s,b)=>s+(b.actual??0),0).toLocaleString()}`, color:'#F59E0B' },
                { label:'Variance', value:`£${(budgetItems.reduce((s,b)=>s+(b.budgeted??0),0)-budgetItems.reduce((s,b)=>s+(b.actual??0),0)).toLocaleString()}`, color:'#10B981' },
              ].map((c:any)=>(
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px', padding:'12px 20px', background:'#F9FAFB', borderBottom:'1px solid #E4E7EC', fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase' }}>
                <span>Item</span><span>Project</span><span>Category</span><span>Budgeted</span><span>Actual</span><span></span>
              </div>
              {budgetItems.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No budget items yet</div> :
              budgetItems.map(b=>(
                <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 100px 100px 80px', padding:'14px 20px', borderBottom:'1px solid #F2F4F7', fontSize:13, color:'#344054', alignItems:'center' }}>
                  <span style={{ fontWeight:500, color:'#101828' }}>{b.name}</span>
                  <span>{b.dev_projects?.name??'—'}</span>
                  <span style={{ textTransform:'capitalize' }}>{b.category}</span>
                  <span>£{(b.budgeted??0).toLocaleString()}</span>
                  <span style={{ color:(b.actual??0)>(b.budgeted??0)?'#EF4444':'#10B981', fontWeight:600 }}>£{(b.actual??0).toLocaleString()}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>openEdit('budget',b)} style={{ fontSize:11, color:'#8B5CF6', background:'none', border:'1px solid #8B5CF6', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                    <button onClick={()=>del('dev_budget_items',b.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVESTORS */}
        {tab==='Investors' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[
                { label:'Total Investors', value:investors.length },
                { label:'Total Investment', value:`£${totalInvestment.toLocaleString()}`, green:true },
                { label:'Avg Investment', value:`£${investors.length>0?Math.round(totalInvestment/investors.length).toLocaleString():0}` },
              ].map((c:any)=>(
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:c.green?'#10B981':'#101828' }}>{c.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {investors.length===0 ? <div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No investors yet</div> :
              investors.map(i=>(
                <div key={i.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'#8B5CF6', flexShrink:0 }}>{i.name.charAt(0)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{i.name}</div>
                    <div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{i.email} {i.phone?`· ${i.phone}`:''}</div>
                    <div style={{ fontSize:12, color:'#98A2B3', marginTop:2 }}>{i.dev_projects?.name} · {i.equity_percentage}% equity</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#10B981' }}>£{(i.investment_amount??0).toLocaleString()}</div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:STATUS_COLORS[i.status]?.bg??'#F3F4F6', color:STATUS_COLORS[i.status]?.color??'#6B7280' }}>{i.status}</span>
                  </div>
                  <button onClick={()=>openEdit('investor',i)} style={{ fontSize:12, color:'#8B5CF6', background:'none', border:'1px solid #8B5CF6', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('dev_investors',i.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab==='Documents' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {documents.length===0 ? <div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No documents yet</div> :
            documents.map(d=>(
              <div key={d.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{d.name}</div>
                  <div style={{ fontSize:12, color:'#667085', marginTop:2, textTransform:'capitalize' }}>{d.type}{d.dev_projects?` · ${d.dev_projects.name}`:''}</div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:13, fontWeight:500, textDecoration:'none', color:'#344054' }}>View</a>
                <button onClick={()=>del('dev_documents',d.id)} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #FEE2E2', background:'#FFF5F5', color:'#EF4444', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* MILESTONES */}
        {tab==='Milestones' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {milestones.length===0 ? <div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No milestones yet</div> :
            milestones.map(m=>{
              const overdue = m.due_date && m.due_date < today && m.status !== 'completed'
              return (
                <div key={m.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${overdue?'#FEE2E2':'#E4E7EC'}`, padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr auto auto auto auto', alignItems:'center', gap:16 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:'#101828', marginBottom:2 }}>{m.name}</div>
                    <div style={{ fontSize:12, color:'#667085' }}>{m.dev_projects?.name} · Due: {m.due_date??'—'}{overdue?' · Overdue':''}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:overdue?'#FEE2E2':STATUS_COLORS[m.status]?.bg??'#EEF0FF', color:overdue?'#DC2626':STATUS_COLORS[m.status]?.color??'#3B4AFF', textTransform:'capitalize' }}>{m.status}</span>
                  <select value={m.status} onChange={async e=>{await supabase.from('dev_milestones').update({status:e.target.value}).eq('id',m.id);loadAll()}} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #E4E7EC', fontSize:13, fontFamily:'inherit' }}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={()=>openEdit('milestone',m)} style={{ fontSize:12, color:'#8B5CF6', background:'none', border:'1px solid #8B5CF6', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('dev_milestones',m.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal==='project' && (
        <Modal title={editId?'Edit Project':'New Project'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Project Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Rose Hall Development"/></div>
            <div><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div><label style={lbl}>Location</label><input style={inp} value={form.location??''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Montego Bay, Jamaica"/></div>
            <div><label style={lbl}>Status</label>
              <select style={{...inp,cursor:'pointer'}} value={form.status??'planning'} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={form.start_date??''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
              <div><label style={lbl}>End Date</label><input type="date" style={inp} value={form.end_date??''} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Total Budget (£)</label><input type="number" style={inp} value={form.total_budget??''} onChange={e=>setForm({...form,total_budget:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Spent So Far (£)</label><input type="number" style={inp} value={form.spent??''} onChange={e=>setForm({...form,spent:parseFloat(e.target.value)})}/></div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('dev_projects',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Create Project'}</button>
          </div>
        </Modal>
      )}

      {modal==='budget' && (
        <Modal title={editId?'Edit Budget Item':'Add Budget Item'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Item Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Foundation Work"/></div>
            <div><label style={lbl}>Project</label>
              <select style={{...inp,cursor:'pointer'}} value={form.project_id??''} onChange={e=>setForm({...form,project_id:e.target.value})}>
                <option value="">Select project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Category</label>
              <select style={{...inp,cursor:'pointer'}} value={form.category??'other'} onChange={e=>setForm({...form,category:e.target.value})}>
                <option value="construction">Construction</option>
                <option value="materials">Materials</option>
                <option value="labour">Labour</option>
                <option value="professional_fees">Professional Fees</option>
                <option value="permits">Permits</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Budgeted (£)</label><input type="number" style={inp} value={form.budgeted??''} onChange={e=>setForm({...form,budgeted:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Actual (£)</label><input type="number" style={inp} value={form.actual??''} onChange={e=>setForm({...form,actual:parseFloat(e.target.value)})}/></div>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={{...inp,cursor:'pointer'}} value={form.status??'pending'} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('dev_budget_items',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Item'}</button>
          </div>
        </Modal>
      )}

      {modal==='investor' && (
        <Modal title={editId?'Edit Investor':'Add Investor'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John Smith"/></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="john@example.com"/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            <div><label style={lbl}>Project</label>
              <select style={{...inp,cursor:'pointer'}} value={form.project_id??''} onChange={e=>setForm({...form,project_id:e.target.value})}>
                <option value="">Select project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Investment Amount (£)</label><input type="number" style={inp} value={form.investment_amount??''} onChange={e=>setForm({...form,investment_amount:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Equity %</label><input type="number" style={inp} value={form.equity_percentage??''} onChange={e=>setForm({...form,equity_percentage:parseFloat(e.target.value)})}/></div>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={{...inp,cursor:'pointer'}} value={form.status??'active'} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('dev_investors',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Investor'}</button>
          </div>
        </Modal>
      )}

      {modal==='document' && (
        <Modal title="Add Document" onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Document Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Planning Permission"/></div>
            <div><label style={lbl}>URL *</label><input type="url" style={inp} value={form.url??''} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://..."/></div>
            <div><label style={lbl}>Type</label>
              <select style={{...inp,cursor:'pointer'}} value={form.type??'other'} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="planning">Planning Permission</option>
                <option value="contract">Contract</option>
                <option value="survey">Survey</option>
                <option value="financial">Financial</option>
                <option value="legal">Legal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label style={lbl}>Project</label>
              <select style={{...inp,cursor:'pointer'}} value={form.project_id??''} onChange={e=>setForm({...form,project_id:e.target.value})}>
                <option value="">Select project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('dev_documents',form)} disabled={saving||!form.name||!form.url} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name||!form.url?0.6:1 }}>{saving?'Saving…':'Add Document'}</button>
          </div>
        </Modal>
      )}

      {modal==='milestone' && (
        <Modal title={editId?'Edit Milestone':'Add Milestone'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Milestone Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Foundation Complete"/></div>
            <div><label style={lbl}>Project</label>
              <select style={{...inp,cursor:'pointer'}} value={form.project_id??''} onChange={e=>setForm({...form,project_id:e.target.value})}>
                <option value="">Select project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.due_date??''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
              <div><label style={lbl}>Status</label>
                <select style={{...inp,cursor:'pointer'}} value={form.status??'pending'} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('dev_milestones',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Milestone'}</button>
          </div>
        </Modal>
      )}

    </div>
  )
}
