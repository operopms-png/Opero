'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#3B4AFF'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Reports')
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportForm, setReportForm] = useState({name:'',type:'Revenue',period:'This Month',format:'PDF',notes:''})
  const [scheduled, setScheduled] = useState<any[]>([])
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({name:'',type:'Revenue',frequency:'Weekly',recipients:'',nextRun:'',format:'PDF'})

  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const SECTIONS = ['Reports','Scheduled','Analytics']
  const REPORT_TYPES = ['Revenue','Occupancy','Bookings','Expenses','P&L','Cash Flow','Owner Statement','Custom']

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>VACATION RENTALS</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Reporting</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Reports'&&<button onClick={()=>setShowReportForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Create Report</button>}
          {section==='Scheduled'&&<button onClick={()=>setShowScheduleForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Schedule Report</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Total Reports',v:reports.length},{l:'Scheduled',v:scheduled.length},{l:'This Month',v:reports.filter((r:any)=>r.period==='This Month').length},{l:'Report Types',v:new Set(reports.map((r:any)=>r.type)).size}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {section==='Reports'&&(<div>
          {showReportForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Create Report</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Report Name *</label><input value={reportForm.name} onChange={e=>setReportForm({...reportForm,name:e.target.value})} placeholder="e.g. June Revenue Report" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={reportForm.type} onChange={e=>setReportForm({...reportForm,type:e.target.value})} style={inp}>{REPORT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Period</label><select value={reportForm.period} onChange={e=>setReportForm({...reportForm,period:e.target.value})} style={inp}>{['This Month','Last Month','This Quarter','This Year','Custom'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Format</label><select value={reportForm.format} onChange={e=>setReportForm({...reportForm,format:e.target.value})} style={inp}>{['PDF','Excel','CSV'].map(f=><option key={f}>{f}</option>)}</select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!reportForm.name)return;setReports([...reports,{id:Date.now(),...reportForm,createdAt:new Date().toLocaleDateString()}]);setReportForm({name:'',type:'Revenue',period:'This Month',format:'PDF',notes:''});setShowReportForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Generate Report</button>
              <button onClick={()=>setShowReportForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 120px 140px 80px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Report</span><span>Type</span><span>Period</span><span>Format</span><span>Created</span><span></span>
            </div>
            {reports.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>📊</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No reports yet</div><div style={{fontSize:13}}>Create your first report.</div></div>):reports.map((r:any)=>(
              <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 140px 80px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{r.name}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{r.type}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.period}</span>
                <span style={{fontSize:11,fontWeight:600,color:'#667085'}}>{r.format}</span>
                <span style={{fontSize:11,color:'#98A2B3'}}>{r.createdAt}</span>
                <button onClick={()=>setReports(reports.filter((x:any)=>x.id!==r.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Scheduled'&&(<div>
          {showScheduleForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Schedule Report</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={scheduleForm.name} onChange={e=>setScheduleForm({...scheduleForm,name:e.target.value})} placeholder="Report name" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={scheduleForm.type} onChange={e=>setScheduleForm({...scheduleForm,type:e.target.value})} style={inp}>{REPORT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Frequency</label><select value={scheduleForm.frequency} onChange={e=>setScheduleForm({...scheduleForm,frequency:e.target.value})} style={inp}>{['Daily','Weekly','Monthly','Quarterly'].map(f=><option key={f}>{f}</option>)}</select></div>
              <div><label style={lbl}>Recipients</label><input value={scheduleForm.recipients} onChange={e=>setScheduleForm({...scheduleForm,recipients:e.target.value})} placeholder="email@example.com" style={inp}/></div>
              <div><label style={lbl}>Next Run</label><input value={scheduleForm.nextRun} onChange={e=>setScheduleForm({...scheduleForm,nextRun:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>Format</label><select value={scheduleForm.format} onChange={e=>setScheduleForm({...scheduleForm,format:e.target.value})} style={inp}>{['PDF','Excel','CSV'].map(f=><option key={f}>{f}</option>)}</select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!scheduleForm.name)return;setScheduled([...scheduled,{id:Date.now(),...scheduleForm,status:'Active'}]);setScheduleForm({name:'',type:'Revenue',frequency:'Weekly',recipients:'',nextRun:'',format:'PDF'});setShowScheduleForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Schedule</button>
              <button onClick={()=>setShowScheduleForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 200px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Name</span><span>Type</span><span>Frequency</span><span>Recipients</span><span>Next Run</span><span></span>
            </div>
            {scheduled.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>⏰</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No scheduled reports</div></div>):scheduled.map((r:any)=>(
              <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 200px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{r.name}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{r.type}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.frequency}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.recipients||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{r.nextRun||'—'}</span>
                <button onClick={()=>setScheduled(scheduled.filter((x:any)=>x.id!==r.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Analytics'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {REPORT_TYPES.slice(0,6).map(type=>(
              <div key={type} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,cursor:'pointer'}} onClick={()=>{setReportForm({...reportForm,type,name:type+' Report'});setSection('Reports');setShowReportForm(true)}}>
                <div style={{fontSize:24,marginBottom:8}}>{type==='Revenue'?'💰':type==='Occupancy'?'🏠':type==='Bookings'?'📅':type==='Expenses'?'💸':type==='P&L'?'📊':'💵'}</div>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>{type} Report</div>
                <div style={{fontSize:12,color:'#667085'}}>Click to generate</div>
                <div style={{marginTop:8,fontSize:12,color:ACCENT,fontWeight:600}}>{reports.filter((r:any)=>r.type===type).length} generated</div>
              </div>
            ))}
          </div>
        </div>)}

      </div>
    </div>
  )
}