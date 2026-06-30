'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const LABEL = 'PROPERTY MANAGEMENT'
const SECTIONS = ['Pipeline','Leads','Quotes','Documents','Meetings','Analytics']
const STAGES = ['Enquiry','Qualified','Proposal','Negotiation','Won','Lost']
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Pipeline')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadForm, setLeadForm] = useState({name:'',email:'',phone:'',source:'Direct',status:'New',value:'',notes:''})
  const [deals, setDeals] = useState<any[]>([])
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealForm, setDealForm] = useState({name:'',contact:'',value:'',stage:'Enquiry',closeDate:'',notes:''})
  const [quotes, setQuotes] = useState<any[]>([])
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteForm, setQuoteForm] = useState({client:'',property:'',amount:'',validUntil:'',status:'Draft',notes:''})
  const [meetings, setMeetings] = useState<any[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingForm, setMeetingForm] = useState({title:'',contact:'',date:'',time:'',type:'Call',notes:''})

  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const totalPipeline = deals.filter(d=>!['Won','Lost'].includes(d.stage)).reduce((s:number,d:any)=>s+parseFloat(d.value||0),0)
  const wonDeals = deals.filter(d=>d.stage==='Won').reduce((s:number,d:any)=>s+parseFloat(d.value||0),0)

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>{LABEL}</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Sales</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Pipeline'&&<button onClick={()=>setShowDealForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Deal</button>}
          {section==='Leads'&&<button onClick={()=>setShowLeadForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Lead</button>}
          {section==='Quotes'&&<button onClick={()=>setShowQuoteForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Create Quote</button>}
          {section==='Meetings'&&<button onClick={()=>setShowMeetingForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Schedule Meeting</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Pipeline Value',v:'£'+totalPipeline.toLocaleString(),c:ACCENT},{l:'Won',v:'£'+wonDeals.toLocaleString(),c:'#10B981'},{l:'Total Leads',v:leads.length,c:'#101828'},{l:'Open Deals',v:deals.filter(d=>!['Won','Lost'].includes(d.stage)).length,c:'#F59E0B'}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:22,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* PIPELINE */}
        {section==='Pipeline'&&(<div>
          {showDealForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add Deal</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Deal Name *</label><input value={dealForm.name} onChange={e=>setDealForm({...dealForm,name:e.target.value})} placeholder="e.g. Summer Booking Package" style={inp}/></div>
              <div><label style={lbl}>Contact</label><input value={dealForm.contact} onChange={e=>setDealForm({...dealForm,contact:e.target.value})} placeholder="Contact name" style={inp}/></div>
              <div><label style={lbl}>Value (£)</label><input value={dealForm.value} onChange={e=>setDealForm({...dealForm,value:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Stage</label><select value={dealForm.stage} onChange={e=>setDealForm({...dealForm,stage:e.target.value})} style={inp}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Close Date</label><input value={dealForm.closeDate} onChange={e=>setDealForm({...dealForm,closeDate:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>Notes</label><input value={dealForm.notes} onChange={e=>setDealForm({...dealForm,notes:e.target.value})} placeholder="Optional notes" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!dealForm.name)return;setDeals([...deals,{id:Date.now(),...dealForm}]);setDealForm({name:'',contact:'',value:'',stage:'Enquiry',closeDate:'',notes:''});setShowDealForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add Deal</button>
              <button onClick={()=>setShowDealForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12}}>
            {STAGES.map(stage=>(
              <div key={stage} style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:12,minHeight:200}}>
                <div style={{fontSize:11,fontWeight:700,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:10}}>{stage} <span style={{background:'#E4E7EC',borderRadius:10,padding:'1px 6px',fontSize:10}}>{deals.filter(d=>d.stage===stage).length}</span></div>
                {deals.filter(d=>d.stage===stage).map((d:any)=>(
                  <div key={d.id} style={{background:'#fff',borderRadius:8,border:'1px solid #E4E7EC',padding:12,marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#101828',marginBottom:4}}>{d.name}</div>
                    {d.contact&&<div style={{fontSize:11,color:'#667085',marginBottom:4}}>{d.contact}</div>}
                    <div style={{fontSize:13,fontWeight:700,color:ACCENT}}>£{parseFloat(d.value||0).toLocaleString()}</div>
                    <div style={{display:'flex',gap:4,marginTop:8}}>
                      <select value={d.stage} onChange={e=>setDeals(deals.map((x:any)=>x.id===d.id?{...x,stage:e.target.value}:x))} style={{fontSize:10,border:'1px solid #E4E7EC',borderRadius:4,padding:'2px 4px',fontFamily:'inherit',flex:1}}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
                      <button onClick={()=>setDeals(deals.filter((x:any)=>x.id!==d.id))} style={{padding:'2px 6px',borderRadius:4,border:'none',background:'#FEE2E2',fontSize:10,cursor:'pointer',color:'#EF4444'}}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>)}

        {/* LEADS */}
        {section==='Leads'&&(<div>
          {showLeadForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add Lead</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} placeholder="Full name" style={inp}/></div>
              <div><label style={lbl}>Email</label><input value={leadForm.email} onChange={e=>setLeadForm({...leadForm,email:e.target.value})} type="email" placeholder="email@example.com" style={inp}/></div>
              <div><label style={lbl}>Phone</label><input value={leadForm.phone} onChange={e=>setLeadForm({...leadForm,phone:e.target.value})} placeholder="+44..." style={inp}/></div>
              <div><label style={lbl}>Source</label><select value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})} style={inp}>{['Direct','Airbnb','VRBO','Referral','Instagram','Website','Other'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Status</label><select value={leadForm.status} onChange={e=>setLeadForm({...leadForm,status:e.target.value})} style={inp}>{['New','Contacted','Qualified','Unqualified'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Est. Value (£)</label><input value={leadForm.value} onChange={e=>setLeadForm({...leadForm,value:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><input value={leadForm.notes} onChange={e=>setLeadForm({...leadForm,notes:e.target.value})} placeholder="Optional notes" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!leadForm.name)return;setLeads([...leads,{id:Date.now(),...leadForm}]);setLeadForm({name:'',email:'',phone:'',source:'Direct',status:'New',value:'',notes:''});setShowLeadForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add Lead</button>
              <button onClick={()=>setShowLeadForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 100px 120px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Name</span><span>Email</span><span>Source</span><span>Value</span><span>Status</span><span></span>
            </div>
            {leads.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>🎯</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No leads yet</div><div style={{fontSize:13}}>Add your first lead to start tracking.</div></div>):leads.map((l:any)=>(
              <div key={l.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 100px 120px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{l.name}</div>{l.phone&&<div style={{fontSize:11,color:'#98A2B3'}}>{l.phone}</div>}</div>
                <span style={{fontSize:12,color:'#667085'}}>{l.email||'—'}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{l.source}</span>
                <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>{l.value?'£'+parseFloat(l.value).toLocaleString():'—'}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block' as const,background:l.status==='New'?'#FEF3C7':l.status==='Qualified'?'#ECFDF5':'#F9FAFB',color:l.status==='New'?'#F59E0B':l.status==='Qualified'?'#10B981':'#667085'}}>{l.status}</span>
                <button onClick={()=>setLeads(leads.filter((x:any)=>x.id!==l.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* QUOTES */}
        {section==='Quotes'&&(<div>
          {showQuoteForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Create Quote</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Client *</label><input value={quoteForm.client} onChange={e=>setQuoteForm({...quoteForm,client:e.target.value})} placeholder="Client name" style={inp}/></div>
              <div><label style={lbl}>Property</label><input value={quoteForm.property} onChange={e=>setQuoteForm({...quoteForm,property:e.target.value})} placeholder="Property name" style={inp}/></div>
              <div><label style={lbl}>Amount (£)</label><input value={quoteForm.amount} onChange={e=>setQuoteForm({...quoteForm,amount:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Valid Until</label><input value={quoteForm.validUntil} onChange={e=>setQuoteForm({...quoteForm,validUntil:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={quoteForm.status} onChange={e=>setQuoteForm({...quoteForm,status:e.target.value})} style={inp}>{['Draft','Sent','Accepted','Declined'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Notes</label><input value={quoteForm.notes} onChange={e=>setQuoteForm({...quoteForm,notes:e.target.value})} placeholder="Optional" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!quoteForm.client)return;setQuotes([...quotes,{id:Date.now(),...quoteForm}]);setQuoteForm({client:'',property:'',amount:'',validUntil:'',status:'Draft',notes:''});setShowQuoteForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create Quote</button>
              <button onClick={()=>setShowQuoteForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 120px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Client</span><span>Property</span><span>Amount</span><span>Valid Until</span><span>Status</span><span></span>
            </div>
            {quotes.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>📋</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No quotes yet</div></div>):quotes.map((q:any)=>(
              <div key={q.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 120px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{q.client}</span>
                <span style={{fontSize:12,color:'#667085'}}>{q.property||'—'}</span>
                <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{parseFloat(q.amount||0).toLocaleString()}</span>
                <span style={{fontSize:12,color:'#667085'}}>{q.validUntil||'—'}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block' as const,background:q.status==='Accepted'?'#ECFDF5':q.status==='Declined'?'#FEE2E2':'#FEF3C7',color:q.status==='Accepted'?'#10B981':q.status==='Declined'?'#EF4444':'#F59E0B'}}>{q.status}</span>
                <button onClick={()=>setQuotes(quotes.filter((x:any)=>x.id!==q.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* MEETINGS */}
        {section==='Meetings'&&(<div>
          {showMeetingForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Schedule Meeting</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Title *</label><input value={meetingForm.title} onChange={e=>setMeetingForm({...meetingForm,title:e.target.value})} placeholder="e.g. Property viewing" style={inp}/></div>
              <div><label style={lbl}>Contact</label><input value={meetingForm.contact} onChange={e=>setMeetingForm({...meetingForm,contact:e.target.value})} placeholder="Contact name" style={inp}/></div>
              <div><label style={lbl}>Date</label><input value={meetingForm.date} onChange={e=>setMeetingForm({...meetingForm,date:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>Time</label><input value={meetingForm.time} onChange={e=>setMeetingForm({...meetingForm,time:e.target.value})} type="time" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={meetingForm.type} onChange={e=>setMeetingForm({...meetingForm,type:e.target.value})} style={inp}>{['Call','Video Call','In Person','Property Viewing'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Notes</label><input value={meetingForm.notes} onChange={e=>setMeetingForm({...meetingForm,notes:e.target.value})} placeholder="Optional" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!meetingForm.title)return;setMeetings([...meetings,{id:Date.now(),...meetingForm}]);setMeetingForm({title:'',contact:'',date:'',time:'',type:'Call',notes:''});setShowMeetingForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Schedule</button>
              <button onClick={()=>setShowMeetingForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 100px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Title</span><span>Contact</span><span>Date</span><span>Time</span><span>Type</span><span></span>
            </div>
            {meetings.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:12}}>📅</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No meetings scheduled</div></div>):meetings.map((m:any)=>(
              <div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 100px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{m.title}</span>
                <span style={{fontSize:12,color:'#667085'}}>{m.contact||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{m.date||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{m.time||'—'}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT}}>{m.type}</span>
                <button onClick={()=>setMeetings(meetings.filter((x:any)=>x.id!==m.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* ANALYTICS */}
        {section==='Analytics'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            {[{l:'Conversion Rate',v:leads.length>0?Math.round(deals.filter(d=>d.stage==='Won').length/leads.length*100)+'%':'0%',c:'#10B981'},{l:'Avg Deal Value',v:deals.length>0?'£'+Math.round(deals.reduce((s:number,d:any)=>s+parseFloat(d.value||0),0)/deals.length).toLocaleString():'£0',c:ACCENT},{l:'Total Revenue',v:'£'+wonDeals.toLocaleString(),c:'#101828'}].map((s:any)=>(
              <div key={s.l} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}>
                <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Pipeline by Stage</div>
            {STAGES.map(stage=>{
              const count = deals.filter(d=>d.stage===stage).length
              const val = deals.filter(d=>d.stage===stage).reduce((s:number,d:any)=>s+parseFloat(d.value||0),0)
              const max = Math.max(...STAGES.map(s=>deals.filter(d=>d.stage===s).reduce((sv:number,d:any)=>sv+parseFloat(d.value||0),0)),1)
              return(<div key={stage} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#344054'}}>{stage} ({count})</span><span style={{fontSize:13,fontWeight:600,color:ACCENT}}>£{val.toLocaleString()}</span></div>
                <div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:stage==='Won'?'#10B981':stage==='Lost'?'#EF4444':ACCENT,borderRadius:4,width:(val/max*100)+'%'}}></div></div>
              </div>)
            })}
          </div>
        </div>)}

        {/* DOCUMENTS */}
        {section==='Documents'&&(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>
          <div style={{fontSize:40,marginBottom:12}}>📁</div>
          <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>Sales Documents</div>
          <div style={{fontSize:13}}>Upload proposals, contracts and presentations here.</div>
        </div>)}

      </div>
    </div>
  )
}