'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const SECTIONS = ['Dashboard','Employees','Onboarding','Performance','Training','Discipline','Time Tracking','HR Requests','Company Goals']
const inp: React.CSSProperties = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}
const lbl: React.CSSProperties = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}
const cardStyle: React.CSSProperties = {background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:20}

function initials(name: string) {
  return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join('')
}
const AVATAR_COLORS = ['#3B4AFF','#10B981','#F59E0B','#8B5CF6','#EC4899','#2D6A4F','#DC2626','#0891B2']
function avatarColor(name: string) {
  let hash = 0
  for (let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function StatusBadge({ status, colors }: { status: string, colors: Record<string,{bg:string,fg:string}> }) {
  const c = colors[status] ?? { bg:'#F2F4F7', fg:'#6B7280' }
  return <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20,background:c.bg,color:c.fg,width:'fit-content'}}>{status}</span>
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('Dashboard')
  const [userId, setUserId] = useState('')
  const [employees, setEmployees] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [training, setTraining] = useState<any[]>([])
  const [discipline, setDiscipline] = useState<any[]>([])
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href='/login'; return }
    const accountId = await getAccountId(user)
    setUserId(accountId)
    const [emp, ob, perf, tr, disc, time, req, gl] = await Promise.all([
      supabase.from('hr_employees').select('*').eq('user_id',accountId).order('full_name'),
      supabase.from('hr_onboarding_tasks').select('*').eq('user_id',accountId).order('due_date',{ascending:true}),
      supabase.from('hr_performance_reviews').select('*').eq('user_id',accountId).order('review_date',{ascending:false}),
      supabase.from('hr_training_records').select('*').eq('user_id',accountId).order('expiry_date',{ascending:true}),
      supabase.from('hr_discipline_records').select('*').eq('user_id',accountId).order('date_issued',{ascending:false}),
      supabase.from('hr_time_entries').select('*').eq('user_id',accountId).order('entry_date',{ascending:false}),
      supabase.from('hr_requests').select('*').eq('user_id',accountId).order('created_at',{ascending:false}),
      supabase.from('hr_company_goals').select('*').eq('user_id',accountId).order('target_date',{ascending:true}),
    ])
    setEmployees(emp.data??[]); setOnboarding(ob.data??[]); setReviews(perf.data??[]); setTraining(tr.data??[])
    setDiscipline(disc.data??[]); setTimeEntries(time.data??[]); setRequests(req.data??[]); setGoals(gl.data??[])
    setLoading(false)
  }

  function empName(id: string) { return employees.find((e:any)=>e.id===id)?.full_name ?? '—' }

  async function saveRecord(table: string, setter: (v:any)=>void, resetForm: any) {
    if (!userId) return
    // Empty text inputs come through as '' -- fine for text columns, but
    // Postgres rejects '' for numeric/uuid columns (e.g. Salary, Rating,
    // Progress %, or an unselected employee/owner dropdown). Convert any
    // blank field to null before it hits the database.
    const cleaned = Object.fromEntries(Object.entries(form).map(([k,v])=>[k, v==='' ? null : v]))
    const { error } = editId
      ? await supabase.from(table).update(cleaned).eq('id',editId)
      : await supabase.from(table).insert([{...cleaned,user_id:userId}])
    if (error) { alert(error.message); return }
    setForm(resetForm); setEditId(null); setShowForm(false)
    await load()
  }

  async function delRecord(table: string, id: string, setter: (fn:(prev:any[])=>any[])=>void) {
    if (!confirm('Delete this record?')) return
    await supabase.from(table).delete().eq('id',id)
    setter(prev=>prev.filter((r:any)=>r.id!==id))
  }

  function openAdd(defaults: any) { setEditId(null); setForm(defaults); setShowForm(true) }
  function openEdit(record: any) { setEditId(record.id); setForm(record); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditId(null); setForm({}) }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const EMPLOYEE_STATUS_COLORS = {'Active':{bg:'#D1FAE5',fg:'#059669'},'On Leave':{bg:'#FEF3C7',fg:'#D97706'},'Terminated':{bg:'#FEE2E2',fg:'#DC2626'}}
  const activeEmployees = employees.filter((e:any)=>e.status==='Active')
  const pendingRequests = requests.filter((r:any)=>r.status==='Pending')
  const openDiscipline = discipline.filter((d:any)=>new Date(d.date_issued) >= new Date(Date.now()-90*86400000))
  const expiringTraining = training.filter((t:any)=>t.expiry_date && new Date(t.expiry_date) <= new Date(Date.now()+30*86400000) && new Date(t.expiry_date) >= new Date())
  const pendingOnboarding = onboarding.filter((o:any)=>o.status==='Pending')

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>People &amp; HR</div>
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC',overflowX:'auto' as const}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>{setSection(s);closeForm()}} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>{s}</button>)}
      </div>

      <div style={{padding:24,maxWidth:1100}}>

        {section==='Dashboard'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:24}}>
              {[
                {label:'Active Employees',value:activeEmployees.length,color:'#101828'},
                {label:'Pending Onboarding',value:pendingOnboarding.length,color:'#D97706'},
                {label:'Pending HR Requests',value:pendingRequests.length,color:pendingRequests.length>0?'#DC2626':'#101828'},
                {label:'Discipline (90d)',value:openDiscipline.length,color:openDiscipline.length>0?'#DC2626':'#101828'},
                {label:'Training Expiring Soon',value:expiringTraining.length,color:expiringTraining.length>0?'#D97706':'#101828'},
              ].map(s=>(
                <div key={s.label} style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'16px 18px'}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:'#667085',marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:12}}>Team</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
              {employees.length===0?<div style={{color:'#98A2B3',fontSize:13,textAlign:'center' as const,padding:40,background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>No employees added yet.</div>:
              employees.map((e:any)=>(
                <div key={e.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:avatarColor(e.full_name)+'22',color:avatarColor(e.full_name),fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(e.full_name)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{e.full_name}</div>
                    <div style={{fontSize:11,color:'#667085'}}>{e.role}{e.department?` · ${e.department}`:''}</div>
                  </div>
                  <StatusBadge status={e.status} colors={EMPLOYEE_STATUS_COLORS}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {section==='Employees'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({full_name:'',role:'',department:'',employment_type:'Full-Time',status:'Active',start_date:'',email:'',phone:'',salary:'',notes:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Employee</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Employee':'Add Employee'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Full Name *</label><input style={inp} value={form.full_name??''} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
                <div><label style={lbl}>Role</label><input style={inp} value={form.role??''} onChange={e=>setForm({...form,role:e.target.value})}/></div>
                <div><label style={lbl}>Department</label><input style={inp} value={form.department??''} onChange={e=>setForm({...form,department:e.target.value})}/></div>
                <div><label style={lbl}>Employment Type</label><select style={inp} value={form.employment_type??'Full-Time'} onChange={e=>setForm({...form,employment_type:e.target.value})}><option>Full-Time</option><option>Part-Time</option><option>Contractor</option></select></div>
                <div><label style={lbl}>Status</label><select style={inp} value={form.status??'Active'} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>On Leave</option><option>Terminated</option></select></div>
                <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={form.start_date??''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
                <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
                <div><label style={lbl}>Salary (£/yr)</label><input type="number" style={inp} value={form.salary??''} onChange={e=>setForm({...form,salary:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_employees',setEmployees,{})} disabled={!form.full_name?.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.full_name?.trim()?0.6:1}}>{editId?'Save Changes':'Add Employee'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 100px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Name</span><span>Role</span><span>Department</span><span>Type</span><span>Status</span><span></span></div>
            {employees.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>No employees yet.</div>:
            employees.map((e:any)=>(
              <div key={e.id} style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 100px 100px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.full_name}</span>
                <span style={{fontSize:12,color:'#667085'}}>{e.role||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{e.department||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{e.employment_type}</span>
                <StatusBadge status={e.status} colors={EMPLOYEE_STATUS_COLORS}/>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>openEdit(e)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>delRecord('hr_employees',e.id,setEmployees)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Onboarding'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',task:'',status:'Pending',due_date:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Task</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Task':'Add Onboarding Task'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.due_date??''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Task *</label><input style={inp} value={form.task??''} onChange={e=>setForm({...form,task:e.target.value})} placeholder="e.g. Collect signed contract, IT setup, induction training"/></div>
                <div><label style={lbl}>Status</label><select style={inp} value={form.status??'Pending'} onChange={e=>setForm({...form,status:e.target.value})}><option>Pending</option><option>Complete</option></select></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_onboarding_tasks',setOnboarding,{})} disabled={!form.task?.trim()||!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.task?.trim()||!form.employee_id?0.6:1}}>{editId?'Save Changes':'Add Task'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 110px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Employee</span><span>Task</span><span>Due</span><span>Status</span><span></span></div>
            {onboarding.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>No onboarding tasks yet.</div>:
            onboarding.map((o:any)=>(
              <div key={o.id} style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 110px 100px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{empName(o.employee_id)}</span>
                <span style={{fontSize:12,color:'#667085'}}>{o.task}</span>
                <span style={{fontSize:12,color:'#667085'}}>{o.due_date||'—'}</span>
                <select value={o.status} onChange={async e=>{await supabase.from('hr_onboarding_tasks').update({status:e.target.value,completed_date:e.target.value==='Complete'?new Date().toISOString().slice(0,10):null}).eq('id',o.id);load()}} style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1px solid #E4E7EC',background:o.status==='Complete'?'#D1FAE5':'#FEF3C7',color:o.status==='Complete'?'#059669':'#D97706'}}><option>Pending</option><option>Complete</option></select>
                <button onClick={()=>delRecord('hr_onboarding_tasks',o.id,setOnboarding)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Performance'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',review_date:new Date().toISOString().slice(0,10),reviewer:'',rating:'',strengths:'',improvements:'',goals:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Log Review</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Review':'Log Performance Review'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Review Date</label><input type="date" style={inp} value={form.review_date??''} onChange={e=>setForm({...form,review_date:e.target.value})}/></div>
                <div><label style={lbl}>Reviewer</label><input style={inp} value={form.reviewer??''} onChange={e=>setForm({...form,reviewer:e.target.value})}/></div>
                <div><label style={lbl}>Rating (out of 5)</label><input type="number" min="1" max="5" step="0.5" style={inp} value={form.rating??''} onChange={e=>setForm({...form,rating:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Strengths</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.strengths??''} onChange={e=>setForm({...form,strengths:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Areas for Improvement</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.improvements??''} onChange={e=>setForm({...form,improvements:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Goals for Next Period</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.goals??''} onChange={e=>setForm({...form,goals:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_performance_reviews',setReviews,{})} disabled={!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.employee_id?0.6:1}}>{editId?'Save Changes':'Log Review'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {reviews.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>No reviews logged yet.</div>:
            reviews.map((r:any)=>(
              <div key={r.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div><span style={{fontSize:13,fontWeight:700,color:'#101828'}}>{empName(r.employee_id)}</span><span style={{fontSize:12,color:'#98A2B3',marginLeft:8}}>{r.review_date}{r.reviewer?` · Reviewed by ${r.reviewer}`:''}</span></div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {r.rating&&<span style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>{'★'.repeat(Math.round(r.rating))}<span style={{color:'#E4E7EC'}}>{'★'.repeat(5-Math.round(r.rating))}</span></span>}
                    <button onClick={()=>openEdit(r)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>delRecord('hr_performance_reviews',r.id,setReviews)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                  </div>
                </div>
                {r.strengths&&<div style={{fontSize:12,color:'#344054',marginBottom:4}}><strong>Strengths:</strong> {r.strengths}</div>}
                {r.improvements&&<div style={{fontSize:12,color:'#344054',marginBottom:4}}><strong>To improve:</strong> {r.improvements}</div>}
                {r.goals&&<div style={{fontSize:12,color:'#344054'}}><strong>Goals:</strong> {r.goals}</div>}
              </div>
            ))}
          </div>
        </div>)}

        {section==='Training'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',training_name:'',provider:'',status:'Scheduled',completed_date:'',expiry_date:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Training</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Training':'Add Training Record'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Training Name *</label><input style={inp} value={form.training_name??''} onChange={e=>setForm({...form,training_name:e.target.value})} placeholder="e.g. Fire Safety, First Aid"/></div>
                <div><label style={lbl}>Provider</label><input style={inp} value={form.provider??''} onChange={e=>setForm({...form,provider:e.target.value})}/></div>
                <div><label style={lbl}>Status</label><select style={inp} value={form.status??'Scheduled'} onChange={e=>setForm({...form,status:e.target.value})}><option>Scheduled</option><option>Completed</option><option>Expired</option></select></div>
                <div><label style={lbl}>Completed Date</label><input type="date" style={inp} value={form.completed_date??''} onChange={e=>setForm({...form,completed_date:e.target.value})}/></div>
                <div><label style={lbl}>Expiry Date</label><input type="date" style={inp} value={form.expiry_date??''} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_training_records',setTraining,{})} disabled={!form.training_name?.trim()||!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.training_name?.trim()||!form.employee_id?0.6:1}}>{editId?'Save Changes':'Add Training'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 100px 110px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Employee</span><span>Training</span><span>Status</span><span>Expires</span><span></span></div>
            {training.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>No training records yet.</div>:
            training.map((t:any)=>{
              const expSoon = t.expiry_date && new Date(t.expiry_date) <= new Date(Date.now()+30*86400000) && new Date(t.expiry_date) >= new Date()
              return (
              <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 100px 110px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{empName(t.employee_id)}</span>
                <span style={{fontSize:12,color:'#667085'}}>{t.training_name}{t.provider?` (${t.provider})`:''}</span>
                <StatusBadge status={t.status} colors={{'Scheduled':{bg:'#EEF1FF',fg:'#3B4AFF'},'Completed':{bg:'#D1FAE5',fg:'#059669'},'Expired':{bg:'#FEE2E2',fg:'#DC2626'}}}/>
                <span style={{fontSize:12,color:expSoon?'#D97706':'#667085',fontWeight:expSoon?600:400}}>{t.expiry_date||'—'}</span>
                <button onClick={()=>delRecord('hr_training_records',t.id,setTraining)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            )})}
          </div>
        </div>)}

        {section==='Discipline'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',type:'Verbal Warning',date_issued:new Date().toISOString().slice(0,10),reason:'',issued_by:'',resolution:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Record</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Record':'Add Disciplinary Record'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Type</label><select style={inp} value={form.type??'Verbal Warning'} onChange={e=>setForm({...form,type:e.target.value})}><option>Verbal Warning</option><option>Written Warning</option><option>Final Warning</option><option>Performance Improvement Plan</option><option>Other</option></select></div>
                <div><label style={lbl}>Date Issued</label><input type="date" style={inp} value={form.date_issued??''} onChange={e=>setForm({...form,date_issued:e.target.value})}/></div>
                <div><label style={lbl}>Issued By</label><input style={inp} value={form.issued_by??''} onChange={e=>setForm({...form,issued_by:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Reason</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.reason??''} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Resolution / Follow-up</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.resolution??''} onChange={e=>setForm({...form,resolution:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_discipline_records',setDiscipline,{})} disabled={!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.employee_id?0.6:1}}>{editId?'Save Changes':'Add Record'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {discipline.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>No disciplinary records.</div>:
            discipline.map((d:any)=>(
              <div key={d.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div><span style={{fontSize:13,fontWeight:700,color:'#101828'}}>{empName(d.employee_id)}</span> <StatusBadge status={d.type} colors={{'Verbal Warning':{bg:'#FEF3C7',fg:'#D97706'},'Written Warning':{bg:'#FFEDD5',fg:'#EA580C'},'Final Warning':{bg:'#FEE2E2',fg:'#DC2626'},'Performance Improvement Plan':{bg:'#EEF1FF',fg:'#3B4AFF'}}}/> <span style={{fontSize:12,color:'#98A2B3',marginLeft:6}}>{d.date_issued}{d.issued_by?` · Issued by ${d.issued_by}`:''}</span></div>
                  <button onClick={()=>delRecord('hr_discipline_records',d.id,setDiscipline)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                </div>
                {d.reason&&<div style={{fontSize:12,color:'#344054',marginBottom:4}}>{d.reason}</div>}
                {d.resolution&&<div style={{fontSize:12,color:'#667085'}}><strong>Resolution:</strong> {d.resolution}</div>}
              </div>
            ))}
          </div>
        </div>)}

        {section==='Time Tracking'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',entry_date:new Date().toISOString().slice(0,10),clock_in:'',clock_out:'',hours:'',notes:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Entry</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Entry':'Add Time Entry'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.entry_date??''} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
                <div><label style={lbl}>Clock In</label><input type="time" style={inp} value={form.clock_in??''} onChange={e=>setForm({...form,clock_in:e.target.value})}/></div>
                <div><label style={lbl}>Clock Out</label><input type="time" style={inp} value={form.clock_out??''} onChange={e=>setForm({...form,clock_out:e.target.value})}/></div>
                <div><label style={lbl}>Hours (auto or manual)</label><input type="number" step="0.25" style={inp} value={form.hours??''} onChange={e=>setForm({...form,hours:e.target.value})}/></div>
                <div><label style={lbl}>Notes</label><input style={inp} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_time_entries',setTimeEntries,{})} disabled={!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.employee_id?0.6:1}}>{editId?'Save Changes':'Add Entry'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 90px 90px 80px 1fr 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Employee</span><span>Date</span><span>In</span><span>Out</span><span>Hours</span><span>Notes</span><span></span></div>
            {timeEntries.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>No time entries yet.</div>:
            timeEntries.map((t:any)=>(
              <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 90px 90px 80px 1fr 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{empName(t.employee_id)}</span>
                <span style={{fontSize:12,color:'#667085'}}>{t.entry_date}</span>
                <span style={{fontSize:12,color:'#667085'}}>{t.clock_in||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{t.clock_out||'—'}</span>
                <span style={{fontSize:12,fontWeight:600,color:'#101828'}}>{t.hours??'—'}</span>
                <span style={{fontSize:12,color:'#98A2B3'}}>{t.notes||''}</span>
                <button onClick={()=>delRecord('hr_time_entries',t.id,setTimeEntries)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='HR Requests'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({employee_id:'',type:'Holiday',title:'',description:'',status:'Pending',start_date:'',end_date:''})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Request</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Request':'Add HR Request'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Employee *</label><select style={inp} value={form.employee_id??''} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select…</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Type</label><select style={inp} value={form.type??'Holiday'} onChange={e=>setForm({...form,type:e.target.value})}><option>Holiday</option><option>Sick Leave</option><option>Expense</option><option>General</option></select></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={form.start_date??''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
                <div><label style={lbl}>End Date</label><input type="date" style={inp} value={form.end_date??''} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_requests',setRequests,{})} disabled={!form.title?.trim()||!form.employee_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.title?.trim()||!form.employee_id?0.6:1}}>{editId?'Save Changes':'Add Request'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Employee</span><span>Request</span><span>Type</span><span>Dates</span><span>Status</span></div>
            {requests.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}>No requests yet.</div>:
            requests.map((r:any)=>(
              <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px 100px 100px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{empName(r.employee_id)}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.title}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.type}</span>
                <span style={{fontSize:11,color:'#98A2B3'}}>{r.start_date?`${r.start_date}${r.end_date?' – '+r.end_date:''}`:'—'}</span>
                <select value={r.status} onChange={async e=>{await supabase.from('hr_requests').update({status:e.target.value,resolved_date:e.target.value!=='Pending'?new Date().toISOString().slice(0,10):null}).eq('id',r.id);load()}} style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1px solid #E4E7EC',background:r.status==='Approved'?'#D1FAE5':r.status==='Denied'?'#FEE2E2':'#FEF3C7',color:r.status==='Approved'?'#059669':r.status==='Denied'?'#DC2626':'#D97706'}}><option>Pending</option><option>Approved</option><option>Denied</option></select>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Company Goals'&&(<div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button onClick={()=>openAdd({title:'',description:'',owner_employee_id:'',target_date:'',status:'Not Started',progress_pct:0})} style={{padding:'8px 18px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Goal</button>
          </div>
          {showForm&&(
            <div style={cardStyle}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Goal':'Add Company Goal'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div><label style={lbl}>Owner</label><select style={inp} value={form.owner_employee_id??''} onChange={e=>setForm({...form,owner_employee_id:e.target.value})}><option value="">Unassigned</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><label style={lbl}>Target Date</label><input type="date" style={inp} value={form.target_date??''} onChange={e=>setForm({...form,target_date:e.target.value})}/></div>
                <div><label style={lbl}>Status</label><select style={inp} value={form.status??'Not Started'} onChange={e=>setForm({...form,status:e.target.value})}><option>Not Started</option><option>In Progress</option><option>Achieved</option><option>Missed</option></select></div>
                <div><label style={lbl}>Progress (%)</label><input type="number" min="0" max="100" style={inp} value={form.progress_pct??0} onChange={e=>setForm({...form,progress_pct:e.target.value})}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical' as const}} rows={2} value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>saveRecord('hr_company_goals',setGoals,{})} disabled={!form.title?.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:!form.title?.trim()?0.6:1}}>{editId?'Save Changes':'Add Goal'}</button>
                <button onClick={closeForm} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
            {goals.length===0?<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>No company goals yet.</div>:
            goals.map((g:any)=>(
              <div key={g.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:'16px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>{g.title}</div>
                    <div style={{fontSize:11,color:'#98A2B3',marginTop:2}}>{g.owner_employee_id?empName(g.owner_employee_id):'Unassigned'}{g.target_date?` · Target: ${g.target_date}`:''}</div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <StatusBadge status={g.status} colors={{'Not Started':{bg:'#F2F4F7',fg:'#6B7280'},'In Progress':{bg:'#EEF1FF',fg:'#3B4AFF'},'Achieved':{bg:'#D1FAE5',fg:'#059669'},'Missed':{bg:'#FEE2E2',fg:'#DC2626'}}}/>
                    <button onClick={()=>openEdit(g)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>delRecord('hr_company_goals',g.id,setGoals)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                  </div>
                </div>
                {g.description&&<div style={{fontSize:12,color:'#667085',marginBottom:10}}>{g.description}</div>}
                <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${g.progress_pct??0}%`,background:g.status==='Achieved'?'#10B981':g.status==='Missed'?'#EF4444':ACCENT}}/></div>
                <div style={{fontSize:11,color:'#98A2B3',marginTop:4}}>{g.progress_pct??0}% complete</div>
              </div>
            ))}
          </div>
        </div>)}

      </div>
    </div>
  )
}
