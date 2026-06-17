'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#3B4AFF'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Tickets')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<any[]>([])
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [ticketForm, setTicketForm] = useState({title:'',type:'Complaint',priority:'Medium',status:'Open',contact:'',property:'',description:''})
  const [faqs, setFaqs] = useState<any[]>([])
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [faqForm, setFaqForm] = useState({question:'',answer:'',category:'General'})

  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const SECTIONS = ['Tickets','FAQs','Analytics']
  const open = tickets.filter(t=>t.status==='Open').length
  const inProgress = tickets.filter(t=>t.status==='In Progress').length
  const resolved = tickets.filter(t=>t.status==='Resolved').length

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>PROPERTY MANAGEMENT</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Service</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Tickets'&&<button onClick={()=>setShowTicketForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Ticket</button>}
          {section==='FAQs'&&<button onClick={()=>setShowFaqForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add FAQ</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Open',v:open,c:'#EF4444'},{l:'In Progress',v:inProgress,c:'#F59E0B'},{l:'Resolved',v:resolved,c:'#10B981'},{l:'Total',v:tickets.length,c:'#101828'}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {section==='Tickets'&&(<div>
          {showTicketForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Ticket</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Title *</label><input value={ticketForm.title} onChange={e=>setTicketForm({...ticketForm,title:e.target.value})} placeholder="Issue title" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={ticketForm.type} onChange={e=>setTicketForm({...ticketForm,type:e.target.value})} style={inp}>{['Complaint','Request','Enquiry','Emergency','Feedback'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Priority</label><select value={ticketForm.priority} onChange={e=>setTicketForm({...ticketForm,priority:e.target.value})} style={inp}>{['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Status</label><select value={ticketForm.status} onChange={e=>setTicketForm({...ticketForm,status:e.target.value})} style={inp}>{['Open','In Progress','Resolved','Closed'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Contact</label><input value={ticketForm.contact} onChange={e=>setTicketForm({...ticketForm,contact:e.target.value})} placeholder="Name or email" style={inp}/></div>
              <div><label style={lbl}>Property</label><input value={ticketForm.property} onChange={e=>setTicketForm({...ticketForm,property:e.target.value})} placeholder="Property name" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Description</label><textarea value={ticketForm.description} onChange={e=>setTicketForm({...ticketForm,description:e.target.value})} placeholder="Describe the issue..." rows={3} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!ticketForm.title)return;setTickets([...tickets,{id:Date.now(),...ticketForm,createdAt:new Date().toLocaleDateString()}]);setTicketForm({title:'',type:'Complaint',priority:'Medium',status:'Open',contact:'',property:'',description:''});setShowTicketForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create Ticket</button>
              <button onClick={()=>setShowTicketForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 80px 140px 120px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Title</span><span>Type</span><span>Priority</span><span>Status</span><span>Contact</span><span>Property</span><span></span>
            </div>
            {tickets.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>🎧</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No tickets yet</div><div style={{fontSize:13}}>Raise a new support ticket.</div></div>):tickets.map((t:any)=>(
              <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 80px 140px 120px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.title}</div>{t.description&&<div style={{fontSize:11,color:'#98A2B3'}}>{t.description.substring(0,40)}...</div>}</div>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{t.type}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 6px',borderRadius:4,background:t.priority==='Urgent'?'#FEE2E2':t.priority==='High'?'#FEF3C7':'#F9FAFB',color:t.priority==='Urgent'?'#EF4444':t.priority==='High'?'#F59E0B':'#667085'}}>{t.priority}</span>
                <select value={t.status} onChange={e=>setTickets(tickets.map((x:any)=>x.id===t.id?{...x,status:e.target.value}:x))} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Open','In Progress','Resolved','Closed'].map(s=><option key={s}>{s}</option>)}</select>
                <span style={{fontSize:12,color:'#667085'}}>{t.contact||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{t.property||'—'}</span>
                <button onClick={()=>setTickets(tickets.filter((x:any)=>x.id!==t.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='FAQs'&&(<div>
          {showFaqForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add FAQ</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Category</label><select value={faqForm.category} onChange={e=>setFaqForm({...faqForm,category:e.target.value})} style={inp}>{['General','Bookings','Payments','Property','Maintenance','Cancellations'].map(c=><option key={c}>{c}</option>)}</select></div>
              <div></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Question *</label><input value={faqForm.question} onChange={e=>setFaqForm({...faqForm,question:e.target.value})} placeholder="Enter question" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Answer *</label><textarea value={faqForm.answer} onChange={e=>setFaqForm({...faqForm,answer:e.target.value})} placeholder="Enter answer..." rows={3} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!faqForm.question||!faqForm.answer)return;setFaqs([...faqs,{id:Date.now(),...faqForm}]);setFaqForm({question:'',answer:'',category:'General'});setShowFaqForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add FAQ</button>
              <button onClick={()=>setShowFaqForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            {faqs.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}><div style={{fontSize:36,marginBottom:12}}>❓</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No FAQs yet</div></div>):faqs.map((f:any)=>(
              <div key={f.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div><span style={{fontSize:10,fontWeight:600,color:ACCENT,background:'#EEF1FF',padding:'2px 8px',borderRadius:4,marginRight:8}}>{f.category}</span><span style={{fontSize:14,fontWeight:600,color:'#101828'}}>{f.question}</span></div>
                  <button onClick={()=>setFaqs(faqs.filter((x:any)=>x.id!==f.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444',flexShrink:0}}>×</button>
                </div>
                <p style={{fontSize:13,color:'#667085',lineHeight:1.6,margin:0}}>{f.answer}</p>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Analytics'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Tickets by Status</div>
              {[{l:'Open',v:open,c:'#EF4444'},{l:'In Progress',v:inProgress,c:'#F59E0B'},{l:'Resolved',v:resolved,c:'#10B981'}].map(s=>(
                <div key={s.l} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#344054'}}>{s.l}</span><span style={{fontSize:13,fontWeight:600,color:s.c}}>{s.v}</span></div>
                  <div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:s.c,borderRadius:4,width:tickets.length>0?(s.v/tickets.length*100)+'%':'0%'}}></div></div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Tickets by Priority</div>
              {['Urgent','High','Medium','Low'].map(p=>{
                const count = tickets.filter(t=>t.priority===p).length
                return(<div key={p} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#344054'}}>{p}</span><span style={{fontSize:13,fontWeight:600}}>{count}</span></div>
                  <div style={{height:8,background:'#F3F4F6',borderRadius:4}}><div style={{height:'100%',background:p==='Urgent'?'#EF4444':p==='High'?'#F59E0B':p==='Medium'?ACCENT:'#10B981',borderRadius:4,width:tickets.length>0?(count/tickets.length*100)+'%':'0%'}}></div></div>
                </div>)
              })}
            </div>
          </div>
        </div>)}

      </div>
    </div>
  )
}