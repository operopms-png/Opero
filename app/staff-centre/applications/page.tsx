'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const STAGES = ['Applied','Interviewing','Offered','Hired','Rejected']
const MODULES = [
  { key:'str', label:'Vacation Rentals' },
  { key:'pm', label:'Property Management' },
  { key:'estate', label:'Estate Agency' },
  { key:'dev', label:'Developments' },
  { key:'', label:'General / Other' },
]
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}
const STAGE_COLORS: Record<string,{bg:string,fg:string}> = {
  Applied: {bg:'#F2F4F7',fg:'#667085'},
  Interviewing: {bg:'#EEF1FF',fg:ACCENT},
  Offered: {bg:'#FFFBEB',fg:'#F59E0B'},
  Hired: {bg:'#ECFDF5',fg:'#10B981'},
  Rejected: {bg:'#FEF2F2',fg:'#EF4444'},
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apps, setApps] = useState<any[]>([])
  const [stageFilter, setStageFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState({candidate_name:'',email:'',phone:'',role_applied:'',module:'',stage:'Applied',notes:''})

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      await loadAll(user.id)
      setLoading(false)
    })
  },[])

  async function loadAll(userId: string) {
    const {data} = await supabase.from('job_applications').select('*').eq('user_id',userId).order('created_at',{ascending:false})
    setApps(data??[])
  }

  const filtered = stageFilter==='All' ? apps : apps.filter((a:any)=>a.stage===stageFilter)

  async function saveApp() {
    if(!form.candidate_name || !form.role_applied) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    if(editId){
      const {error} = await supabase.from('job_applications').update(form).eq('id',editId)
      if(error){alert(error.message);setSaving(false);return}
    } else {
      const {error} = await supabase.from('job_applications').insert([{...form,user_id:user?.id}])
      if(error){alert(error.message);setSaving(false);return}
    }
    setSaving(false); setForm({candidate_name:'',email:'',phone:'',role_applied:'',module:'',stage:'Applied',notes:''}); setShowForm(false); setEditId(null)
    await loadAll(user!.id)
  }

  async function updateStage(id: string, stage: string) {
    const {error} = await supabase.from('job_applications').update({stage}).eq('id',id)
    if(error){alert(error.message);return}
    setApps(prev=>prev.map((a:any)=>a.id===id?{...a,stage}:a))
  }

  async function delApp(id: string) {
    if(!confirm('Delete this application?')) return
    await supabase.from('job_applications').delete().eq('id',id)
    setApps(prev=>prev.filter((a:any)=>a.id!==id))
  }

  function openEdit(a: any) {
    setForm({candidate_name:a.candidate_name,email:a.email??'',phone:a.phone??'',role_applied:a.role_applied,module:a.module??'',stage:a.stage,notes:a.notes??''})
    setEditId(a.id); setShowForm(true)
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Applications</div>
        </div>
        <button onClick={()=>{setEditId(null);setForm({candidate_name:'',email:'',phone:'',role_applied:'',module:'',stage:'Applied',notes:''});setShowForm(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Candidate</button>
      </div>

      <div style={{padding:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {STAGES.map(s=>(
            <div key={s} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,textAlign:'center' as const}}>
              <div style={{fontSize:22,fontWeight:700,color:STAGE_COLORS[s].fg,marginBottom:4}}>{apps.filter((a:any)=>a.stage===s).length}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s}</div>
            </div>
          ))}
        </div>

        {showForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
          <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Candidate':'Add Candidate'}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={lbl}>Candidate Name *</label><input value={form.candidate_name} onChange={e=>setForm({...form,candidate_name:e.target.value})} placeholder="Full name" style={inp}/></div>
            <div><label style={lbl}>Role Applied For *</label><input value={form.role_applied} onChange={e=>setForm({...form,role_applied:e.target.value})} placeholder="e.g. Cleaning Team" style={inp}/></div>
            <div><label style={lbl}>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" style={inp}/></div>
            <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44..." style={inp}/></div>
            <div><label style={lbl}>Which part of the business?</label><select value={form.module} onChange={e=>setForm({...form,module:e.target.value})} style={inp}>{MODULES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
            <div><label style={lbl}>Stage</label><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} style={inp}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...inp,resize:'vertical' as const}}/></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={saveApp} disabled={saving||!form.candidate_name||!form.role_applied} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.candidate_name||!form.role_applied?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add'}</button>
            <button onClick={()=>{setShowForm(false);setEditId(null)}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
          </div>
        </div>)}

        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' as const}}>
          <button onClick={()=>setStageFilter('All')} style={{padding:'6px 14px',borderRadius:20,border:stageFilter==='All'?'1px solid '+ACCENT:'1px solid #E4E7EC',background:stageFilter==='All'?ACCENT+'12':'#fff',color:stageFilter==='All'?ACCENT:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>All</button>
          {STAGES.map(s=>(
            <button key={s} onClick={()=>setStageFilter(s)} style={{padding:'6px 14px',borderRadius:20,border:stageFilter===s?'1px solid '+STAGE_COLORS[s].fg:'1px solid #E4E7EC',background:stageFilter===s?STAGE_COLORS[s].bg:'#fff',color:stageFilter===s?STAGE_COLORS[s].fg:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
          ))}
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 160px 150px 130px 130px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
            <span>Candidate</span><span>Contact</span><span>Role</span><span>Module</span><span>Stage</span><span></span>
          </div>
          {filtered.length===0?(
            <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>📄</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No applications yet</div></div>
          ):filtered.map((a:any)=>(
            <div key={a.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 150px 130px 130px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.candidate_name}</span>
              <div><div style={{fontSize:12,color:'#667085'}}>{a.email||'—'}</div>{a.phone&&<div style={{fontSize:11,color:'#98A2B3'}}>{a.phone}</div>}</div>
              <span style={{fontSize:12,color:'#667085'}}>{a.role_applied}</span>
              <span style={{fontSize:11,color:'#667085'}}>{MODULES.find(m=>m.key===a.module)?.label ?? '—'}</span>
              <select value={a.stage} onChange={e=>updateStage(a.id,e.target.value)} style={{background:STAGE_COLORS[a.stage]?.bg,color:STAGE_COLORS[a.stage]?.fg,fontSize:11,fontWeight:600,padding:'5px 8px',borderRadius:6,border:'none',fontFamily:'inherit'}}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
              <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                <button onClick={()=>openEdit(a)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                <button onClick={()=>delApp(a.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
