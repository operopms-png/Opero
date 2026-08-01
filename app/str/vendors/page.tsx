'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const MODULE = 'str'
const LABEL = 'Vacation Rentals'
const VENDOR_TYPES = ['Cleaner','Maintenance','Plumber','Electrician','Handyman','Landscaper','Other']
const STATUS_COLORS: any = {'Open':'#F59E0B','In Progress':'#3B4AFF','Completed':'#10B981','Approved':'#10B981','Rejected':'#EF4444','Pending':'#F59E0B'}
const NAV = [
  {group:'VENDORS',items:[
    {s:'Work Orders',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>},
    {s:'Contractors',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
    {s:'Invoices',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>},
    {s:'Approvals',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
  ]}
]
export default function Page() {
  const [section, setSection] = useState('Work Orders')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [showWO, setShowWO] = useState(false)
  const [showContractor, setShowContractor] = useState(false)
  const [wo, setWo] = useState({title:'',description:'',contractor_id:'',priority:'Medium',property:''})
  const [con, setCon] = useState({name:'',email:'',phone:'',type:'Cleaner',company:''})

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      await loadAll(user.id)
      setLoading(false)
    })
  },[])

  async function loadAll(userId: string) {
    const [w,c] = await Promise.all([
      supabase.from('vendor_work_orders').select('*, vendor_contractors(name)').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('vendor_contractors').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
    ])
    setWorkOrders(w.data??[]); setContractors(c.data??[])
  }

  async function addWO() {
    if(!wo.title) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    const {error} = await supabase.from('vendor_work_orders').insert([{...wo,contractor_id:wo.contractor_id||null,user_id:user?.id,module:MODULE,status:'Open'}])
    setSaving(false)
    if(error){alert(error.message);return}
    setWo({title:'',description:'',contractor_id:'',priority:'Medium',property:''})
    setShowWO(false)
    await loadAll(user!.id)
  }

  async function addContractor() {
    if(!con.name) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    const {error} = await supabase.from('vendor_contractors').insert([{...con,user_id:user?.id,module:MODULE,status:'Active'}])
    setSaving(false)
    if(error){alert(error.message);return}
    setCon({name:'',email:'',phone:'',type:'Cleaner',company:''})
    setShowContractor(false)
    await loadAll(user!.id)
  }

  async function updateWOField(id: string, field: string, value: any) {
    const {error} = await supabase.from('vendor_work_orders').update({[field]:value}).eq('id',id)
    if(error){alert(error.message);return}
    setWorkOrders(prev=>prev.map((x:any)=>x.id===id?{...x,[field]:value}:x))
  }

  async function delRow(table: string, id: string, setter: (fn:(prev:any[])=>any[])=>void) {
    const {error} = await supabase.from(table).delete().eq('id',id)
    if(error){alert(error.message);return}
    setter(prev=>prev.filter((x:any)=>x.id!==id))
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const pendingInvoices = workOrders.filter(w=>w.invoice_amount&&w.status!=='Approved'&&w.status!=='Rejected')
  const totalSpend = workOrders.filter(w=>w.status==='Approved').reduce((s,w)=>s+(parseFloat(w.invoice_amount)||0),0)

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      <div style={{width:210,background:'#fff',borderRight:'1px solid #F2F4F7',display:'flex',flexDirection:'column',paddingTop:16,flexShrink:0,minHeight:'100vh'}}>
        <div style={{padding:'0 16px 14px',borderBottom:'1px solid #F2F4F7'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{LABEL}</div>
          <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>Contractor Portal</div>
        </div>
        <nav style={{flex:1,padding:'8px 10px'}}>
          {NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>{group.group}</div>
              {group.items.map(({s,i})=>(
                <button key={s} onClick={()=>setSection(s)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:7,border:'none',background:section===s?ACCENT+'18':'transparent',color:section===s?ACCENT:'#344054',fontSize:13,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit',textAlign:'left',marginBottom:1}}>
                  <span style={{display:'flex',alignItems:'center'}}>{i}</span>{s}
                  {s==='Approvals'&&pendingInvoices.length>0&&<span style={{marginLeft:'auto',background:'#EF4444',color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 6px'}}>{pendingInvoices.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:'#101828'}}>{section}</h1>
          <div style={{display:'flex',gap:8}}>
            {section==='Work Orders'&&<button onClick={()=>setShowWO(true)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New work order</button>}
            {section==='Contractors'&&<button onClick={()=>setShowContractor(true)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add contractor</button>}
          </div>
        </div>
        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {section==='Work Orders'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total orders',v:workOrders.length,c:ACCENT},{l:'Open',v:workOrders.filter(w=>w.status==='Open').length,c:'#F59E0B'},{l:'In Progress',v:workOrders.filter(w=>w.status==='In Progress').length,c:'#3B4AFF'},{l:'Completed',v:workOrders.filter(w=>w.status==='Completed'||w.status==='Approved').length,c:'#10B981'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showWO&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>New work order</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Title *</div><input value={wo.title} onChange={e=>setWo({...wo,title:e.target.value})} placeholder="e.g. Fix leaking tap in unit 3" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Property</div><input value={wo.property} onChange={e=>setWo({...wo,property:e.target.value})} placeholder="e.g. Sangsters Aurevo C1-12" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Assign to contractor</div><select value={wo.contractor_id} onChange={e=>setWo({...wo,contractor_id:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}><option value="">Select contractor</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Priority</div><select value={wo.priority} onChange={e=>setWo({...wo,priority:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}</select></div>
              </div>
              <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Description</div><textarea value={wo.description} onChange={e=>setWo({...wo,description:e.target.value})} placeholder="Describe the work needed..." rows={3} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box'}}/></div>
              <div style={{display:'flex',gap:8}}><button onClick={addWO} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Create work order'}</button><button onClick={()=>setShowWO(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button></div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 160px 100px 100px 120px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Title</span><span>Contractor</span><span>Priority</span><span>Status</span><span>Created</span><span></span>
              </div>
              {workOrders.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🔧</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No work orders yet</div><div style={{fontSize:13}}>Create a work order to assign to a contractor.</div></div>):workOrders.map(w=>(
                <div key={w.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 100px 100px 120px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{w.title}</div>{w.property&&<div style={{fontSize:11,color:'#667085'}}>{w.property}</div>}</div>
                  <span style={{fontSize:13,color:'#344054'}}>{w.vendor_contractors?.name||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:w.priority==='Urgent'?'#FEE2E2':w.priority==='High'?'#FEF3C7':'#F2F4F7',color:w.priority==='Urgent'?'#EF4444':w.priority==='High'?'#F59E0B':'#667085',display:'inline-block'}}>{w.priority}</span>
                  <select value={w.status} onChange={e=>updateWOField(w.id,'status',e.target.value)} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #E4E7EC',fontSize:12,fontFamily:'inherit',outline:'none',background:'#fff',color:STATUS_COLORS[w.status]||'#344054',fontWeight:600}}>
                    {['Open','In Progress','Completed','Approved','Rejected'].map(s=><option key={s}>{s}</option>)}
                  </select>
                  <span style={{fontSize:12,color:'#667085'}}>{new Date(w.created_at).toLocaleDateString('en-GB')}</span>
                  <button onClick={()=>delRow('vendor_work_orders',w.id,setWorkOrders)} style={{background:'none',border:'none',color:'#98A2B3',cursor:'pointer',fontSize:18}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Contractors'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total contractors',v:contractors.length,c:ACCENT},{l:'Active',v:contractors.filter(c=>c.status==='Active').length,c:'#10B981'},{l:'Types',v:[...new Set(contractors.map(c=>c.type))].length,c:'#667085'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showContractor&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add contractor</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Full name *</div><input value={con.name} onChange={e=>setCon({...con,name:e.target.value})} placeholder="John Smith" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Company</div><input value={con.company} onChange={e=>setCon({...con,company:e.target.value})} placeholder="Smith Plumbing Ltd" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Email</div><input value={con.email} onChange={e=>setCon({...con,email:e.target.value})} placeholder="john@example.com" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Phone</div><input value={con.phone} onChange={e=>setCon({...con,phone:e.target.value})} placeholder="+44 7700 900000" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Type</div><select value={con.type} onChange={e=>setCon({...con,type:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>{VENDOR_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:8}}><button onClick={addContractor} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Add contractor'}</button><button onClick={()=>setShowContractor(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button></div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 140px 120px 80px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Name</span><span>Type</span><span>Company</span><span>Phone</span><span>Status</span><span></span>
              </div>
              {contractors.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>👷</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No contractors yet</div><div style={{fontSize:13}}>Add your first contractor to start assigning work orders.</div></div>):contractors.map(c=>(
                <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 140px 120px 80px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:32,height:32,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:ACCENT}}>{c.name.charAt(0)}</div><div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.name}</div><div style={{fontSize:11,color:'#667085'}}>{c.email}</div></div></div>
                  <span style={{fontSize:12,fontWeight:600,color:'#344054',background:'#F2F4F7',padding:'3px 8px',borderRadius:4,display:'inline-block'}}>{c.type}</span>
                  <span style={{fontSize:13,color:'#667085'}}>{c.company||'—'}</span>
                  <span style={{fontSize:13,color:'#344054'}}>{c.phone||'—'}</span>
                  <span style={{fontSize:12,color:'#10B981',fontWeight:500}}>● Active</span>
                  <button onClick={()=>delRow('vendor_contractors',c.id,setContractors)} style={{background:'none',border:'none',color:'#98A2B3',cursor:'pointer',fontSize:18}}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Invoices'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Pending invoices',v:pendingInvoices.length,c:'#F59E0B'},{l:'Total approved spend',v:'£'+totalSpend.toLocaleString(),c:'#10B981'},{l:'Awaiting approval',v:pendingInvoices.length,c:ACCENT}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 120px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Work order</span><span>Contractor</span><span>Amount</span><span>Status</span><span></span>
              </div>
              {workOrders.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🧾</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No invoices yet</div><div style={{fontSize:13}}>Invoices will appear here once work orders are submitted.</div></div>):workOrders.map(w=>(
                <div key={w.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 120px 100px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{w.title}</div>{w.property&&<div style={{fontSize:11,color:'#667085'}}>{w.property}</div>}</div>
                  <span style={{fontSize:13,color:'#344054'}}>{w.vendor_contractors?.name||'—'}</span>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#667085'}}>£</span>
                    <input value={w.invoice_amount||''} onChange={e=>updateWOField(w.id,'invoice_amount',e.target.value)} placeholder="0.00" style={{width:80,padding:'4px 8px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:STATUS_COLORS[w.status]||'#344054'}}>{w.status}</span>
                  <button onClick={()=>setSection('Approvals')} style={{padding:'5px 10px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Review</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Approvals'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7EC',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Pending approvals</div>
                <span style={{fontSize:12,color:'#667085'}}>{pendingInvoices.length} awaiting review</span>
              </div>
              {pendingInvoices.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>✅</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>All caught up</div><div style={{fontSize:13}}>No invoices pending approval.</div></div>):pendingInvoices.map(w=>(
                <div key={w.id} style={{padding:'20px',borderBottom:'1px solid #F2F4F7'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:2}}>{w.title}</div><div style={{fontSize:12,color:'#667085'}}>{w.vendor_contractors?.name} · {w.property} · {new Date(w.created_at).toLocaleDateString('en-GB')}</div></div>
                    <div style={{fontSize:18,fontWeight:700,color:'#101828'}}>£{parseFloat(w.invoice_amount||0).toLocaleString()}</div>
                  </div>
                  {w.description&&<div style={{fontSize:13,color:'#667085',marginBottom:12,background:'#F9FAFB',padding:'10px 12px',borderRadius:8}}>{w.description}</div>}
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>updateWOField(w.id,'status','Approved')} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#10B981',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✓ Approve</button>
                    <button onClick={()=>updateWOField(w.id,'status','Rejected')} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #EF4444',background:'#fff',color:'#EF4444',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✕ Reject</button>
                  </div>
                </div>
              ))}
              {workOrders.filter(w=>w.status==='Approved'||w.status==='Rejected').length>0&&(<div style={{padding:'16px 20px',borderTop:'1px solid #E4E7EC'}}>
                <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:12}}>Completed</div>
                {workOrders.filter(w=>w.status==='Approved'||w.status==='Rejected').map(w=>(
                  <div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F9FAFB'}}>
                    <div><div style={{fontSize:13,color:'#344054'}}>{w.title}</div><div style={{fontSize:11,color:'#667085'}}>{w.vendor_contractors?.name}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>£{parseFloat(w.invoice_amount||0).toLocaleString()}</span>
                      <span style={{fontSize:12,fontWeight:600,color:STATUS_COLORS[w.status]}}>{w.status}</span>
                    </div>
                  </div>
                ))}
              </div>)}
            </div>
          </div>)}

        </div>
      </div>
    </div>
  )
}
