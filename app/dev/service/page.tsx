'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#8B5CF6'
const LABEL = 'Developments'
const NAV = [{group:'SERVICE',items:[
  {s:'Help Desk',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
  {s:'Customer Success',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>},
  {s:'Customer Agent',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
  {s:'Chatflows',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
  {s:'Knowledge Base',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>},
  {s:'Customer Portal',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>},
  {s:'Feedback Surveys',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
  {s:'Service Analytics',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
]}]

const TICKET_STATUSES = ['Open','In Progress','Pending','Resolved','Closed']
const PRIORITIES = ['Low','Medium','High','Urgent']

export default function Page() {
  const [section, setSection] = useState('Help Desk')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<any[]>([])
  const [showTicket, setShowTicket] = useState(false)
  const [ticket, setTicket] = useState({subject:'',contact:'',priority:'Medium',channel:'Email',description:''})
  const [chatTab, setChatTab] = useState('Web Chat')

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      setLoading(false)
    })
  },[])

  const addTicket = () => {
    if(!ticket.subject) return
    setTickets([...tickets,{id:Date.now(),...ticket,status:'Open',created:new Date().toLocaleDateString('en-GB')}])
    setTicket({subject:'',contact:'',priority:'Medium',channel:'Email',description:''})
    setShowTicket(false)
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const openTickets = tickets.filter(t=>t.status==='Open'||t.status==='In Progress')
  const resolvedTickets = tickets.filter(t=>t.status==='Resolved'||t.status==='Closed')

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      <div style={{width:210,background:'#fff',borderRight:'1px solid #F2F4F7',display:'flex',flexDirection:'column',paddingTop:16,flexShrink:0,minHeight:'100vh'}}>
        <div style={{padding:'0 16px 14px',borderBottom:'1px solid #F2F4F7'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{LABEL}</div>
          <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>Service</div>
        </div>
        <nav style={{flex:1,padding:'8px 10px'}}>
          {NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>{group.group}</div>
              {group.items.map(({s,i})=>(
                <button key={s} onClick={()=>setSection(s)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:7,border:'none',background:section===s?ACCENT+'18':'transparent',color:section===s?ACCENT:'#344054',fontSize:13,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit',textAlign:'left',marginBottom:1}}>
                  <span style={{display:'flex',alignItems:'center'}}>{i}</span>{s}
                  {s==='Help Desk'&&openTickets.length>0&&<span style={{marginLeft:'auto',background:'#EF4444',color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 6px'}}>{openTickets.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:'#101828'}}>{section}</h1>
          {section==='Help Desk'&&<button onClick={()=>setShowTicket(true)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Create ticket</button>}
          {section==='Chatflows'&&<button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create chatflow</button>}
          {section==='Knowledge Base'&&<button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New article</button>}
          {section==='Feedback Surveys'&&<button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create survey</button>}
        </div>
        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {section==='Help Desk'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total tickets',v:tickets.length,c:ACCENT},{l:'Open',v:openTickets.length,c:'#F59E0B'},{l:'Resolved',v:resolvedTickets.length,c:'#10B981'},{l:'Avg response',v:'—',c:'#667085'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showTicket&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Create ticket</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Subject *</div><input value={ticket.subject} onChange={e=>setTicket({...ticket,subject:e.target.value})} placeholder="e.g. Heating not working" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Contact name</div><input value={ticket.contact} onChange={e=>setTicket({...ticket,contact:e.target.value})} placeholder="Guest or tenant name" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Priority</div><select value={ticket.priority} onChange={e=>setTicket({...ticket,priority:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Channel</div><select value={ticket.channel} onChange={e=>setTicket({...ticket,channel:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Email','WhatsApp','Phone','In Person','Airbnb'].map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Description</div><textarea value={ticket.description} onChange={e=>setTicket({...ticket,description:e.target.value})} rows={3} placeholder="Describe the issue..." style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box'}}/></div>
              <div style={{display:'flex',gap:8}}><button onClick={addTicket} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create ticket</button><button onClick={()=>setShowTicket(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button></div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'flex',gap:0,borderBottom:'1px solid #E4E7EC',padding:'0 20px'}}>
                {['All','Open','In Progress','Resolved'].map((tab,i)=>(
                  <button key={tab} style={{padding:'12px 14px',background:'none',border:'none',borderBottom:i===0?'2px solid '+ACCENT:'2px solid transparent',color:i===0?ACCENT:'#667085',fontSize:13,fontWeight:i===0?600:400,cursor:'pointer',fontFamily:'inherit'}}>{tab}</button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 120px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Subject</span><span>Contact</span><span>Priority</span><span>Channel</span><span>Status</span><span>Created</span>
              </div>
              {tickets.length===0?(<div style={{textAlign:'center',padding:60,color:'#98A2B3'}}><div style={{fontSize:40,marginBottom:12}}>🎫</div><div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No tickets yet</div><div style={{fontSize:13}}>Create a ticket to start tracking guest and tenant issues.</div></div>):tickets.map(t=>(
                <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 120px 100px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.subject}</div>
                  <span style={{fontSize:13,color:'#344054'}}>{t.contact||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:t.priority==='Urgent'?'#FEE2E2':t.priority==='High'?'#FEF3C7':'#F2F4F7',color:t.priority==='Urgent'?'#EF4444':t.priority==='High'?'#F59E0B':'#667085',display:'inline-block'}}>{t.priority}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{t.channel}</span>
                  <select value={t.status} onChange={e=>setTickets(tickets.map(x=>x.id===t.id?{...x,status:e.target.value}:x))} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #E4E7EC',fontSize:12,fontFamily:'inherit',outline:'none',background:'#fff',color:t.status==='Resolved'?'#10B981':t.status==='Open'?'#F59E0B':ACCENT,fontWeight:600}}>
                    {TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <span style={{fontSize:12,color:'#667085'}}>{t.created}</span>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Chatflows'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'flex',gap:0,borderBottom:'1px solid #E4E7EC',padding:'0 20px'}}>
                {['Web Chat','Mobile Chat','Facebook Messenger','WhatsApp'].map((tab,i)=>(
                  <button key={tab} onClick={()=>setChatTab(tab)} style={{padding:'14px 16px',background:'none',border:'none',borderBottom:chatTab===tab?'2px solid '+ACCENT:'2px solid transparent',color:chatTab===tab?ACCENT:'#667085',fontSize:13,fontWeight:chatTab===tab?600:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>{tab}</button>
                ))}
              </div>
              <div style={{padding:60,display:'flex',alignItems:'center',gap:60}}>
                <div style={{flex:1}}>
                  <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:12}}>Create your first chatflow</h3>
                  <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>With chatflows, you can create custom chat experiences for visitors on your website or messaging platforms — with as little or as much automation as you need. Create a simple welcome message to greet visitors and direct them to your live team.</p>
                  <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create chatflow</button>
                </div>
                <div style={{fontSize:80,flexShrink:0}}>💬</div>
              </div>
            </div>
          </div>)}

          {section==='Knowledge Base'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,display:'flex',alignItems:'center',gap:60,marginBottom:16}}>
              <div style={{flex:1}}>
                <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:12}}>Build your Knowledge Base</h3>
                <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>Create a self-service help centre for your guests and tenants. Answer common questions, reduce support requests, and improve satisfaction.</p>
                <div style={{display:'flex',gap:8}}>
                  <button style={{padding:'10px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New article</button>
                  <button style={{padding:'10px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>New category</button>
                </div>
              </div>
              <div style={{fontSize:80,flexShrink:0}}>📚</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {[{t:'Check-in Instructions',d:'How to access the property, key codes, parking info.',cat:'Guest Guide'},{t:'House Rules',d:'Noise policy, no smoking, maximum occupancy.',cat:'Guest Guide'},{t:'Emergency Contacts',d:'Who to call in case of emergency.',cat:'Safety'},{t:'WiFi & Utilities',d:'Network name, password, thermostat guide.',cat:'Property Info'},{t:'Checkout Procedure',d:'What guests need to do before leaving.',cat:'Guest Guide'},{t:'Maintenance Requests',d:'How to report issues during your stay.',cat:'Support'}].map(a=>(
                <div key={a.t} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,cursor:'pointer'}}>
                  <div style={{fontSize:11,fontWeight:600,color:ACCENT,background:ACCENT+'18',padding:'2px 8px',borderRadius:4,display:'inline-block',marginBottom:8}}>{a.cat}</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>{a.t}</div>
                  <div style={{fontSize:12,color:'#667085',lineHeight:1.5}}>{a.d}</div>
                  <button style={{marginTop:12,padding:'5px 12px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit article</button>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Customer Success'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Active guests',v:'0',c:ACCENT},{l:'NPS score',v:'—',c:'#10B981'},{l:'Satisfaction rate',v:'—',c:'#F59E0B'},{l:'Churn risk',v:'0',c:'#EF4444'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>🎯</div>
              <div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>Customer Success</div>
              <div style={{fontSize:14,color:'#667085',marginBottom:20}}>Track guest satisfaction, manage relationships and proactively resolve issues before they escalate.</div>
              <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Get started</button>
            </div>
          </div>)}

          {section==='Customer Agent'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,display:'flex',alignItems:'center',gap:60}}>
              <div style={{flex:1}}>
                <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:12}}>AI Customer Agent</h3>
                <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>Deploy an AI agent to handle common guest queries automatically — check-in times, property info, local recommendations — 24/7 without lifting a finger.</p>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                  {['Answer FAQs automatically','Escalate complex issues to your team','Available 24/7 across WhatsApp and Web Chat','Learns from your Knowledge Base'].map(f=>(
                    <div key={f} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#344054'}}><span style={{color:'#10B981',fontWeight:700}}>✓</span>{f}</div>
                  ))}
                </div>
                <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Configure agent</button>
              </div>
              <div style={{fontSize:80,flexShrink:0}}>🤖</div>
            </div>
          </div>)}

          {section==='Customer Portal'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,display:'flex',alignItems:'center',gap:60}}>
              <div style={{flex:1}}>
                <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:12}}>Customer Portal</h3>
                <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>Give guests and tenants their own secure portal to track support tickets, view documents, and communicate with your team — without needing to call or email.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
                  {[{t:'View tickets',d:'Track the status of their requests'},{t:'Access documents',d:'Tenancy agreements, invoices'},{t:'Submit requests',d:'New maintenance or support issues'},{t:'Message team',d:'Direct communication channel'}].map(f=>(
                    <div key={f.t} style={{padding:12,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:2}}>{f.t}</div>
                      <div style={{fontSize:11,color:'#667085'}}>{f.d}</div>
                    </div>
                  ))}
                </div>
                <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Set up portal</button>
              </div>
              <div style={{fontSize:80,flexShrink:0}}>🌐</div>
            </div>
          </div>)}

          {section==='Feedback Surveys'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Surveys sent',v:'0',c:ACCENT},{l:'Responses',v:'0',c:'#10B981'},{l:'Avg rating',v:'—',c:'#F59E0B'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Survey templates</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[{t:'Post-stay review',d:'Send automatically after checkout to collect guest feedback.',icon:'⭐'},{t:'NPS Survey',d:'Measure how likely guests are to recommend your property.',icon:'📊'},{t:'Maintenance feedback',d:'Follow up after a repair to check satisfaction.',icon:'🔧'}].map(s=>(
                  <div key={s.t} style={{border:'1px solid #E4E7EC',borderRadius:10,padding:20}}>
                    <div style={{fontSize:32,marginBottom:12}}>{s.icon}</div>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>{s.t}</div>
                    <div style={{fontSize:12,color:'#667085',marginBottom:16,lineHeight:1.5}}>{s.d}</div>
                    <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Use template</button>
                  </div>
                ))}
              </div>
            </div>
          </div>)}

          {section==='Service Analytics'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Tickets resolved',v:resolvedTickets.length,c:'#10B981'},{l:'Open tickets',v:openTickets.length,c:'#F59E0B'},{l:'Resolution rate',v:tickets.length?Math.round((resolvedTickets.length/tickets.length)*100)+'%':'—',c:ACCENT},{l:'Avg handle time',v:'—',c:'#667085'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Tickets by channel</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {['Email','WhatsApp','Phone','Airbnb','In Person'].map(ch=>{
                  const count = tickets.filter(t=>t.channel===ch).length
                  const pct = tickets.length?Math.round((count/tickets.length)*100):0
                  return(<div key={ch} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:100,fontSize:12,color:'#344054'}}>{ch}</div>
                    <div style={{flex:1,background:'#F2F4F7',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:ACCENT,borderRadius:4}}/></div>
                    <div style={{fontSize:12,color:'#667085',width:30,textAlign:'right'}}>{count}</div>
                  </div>)
                })}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Tickets by priority</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                {PRIORITIES.map(p=>(
                  <div key={p} style={{textAlign:'center',padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:22,fontWeight:700,color:p==='Urgent'?'#EF4444':p==='High'?'#F59E0B':p==='Medium'?ACCENT:'#667085',marginBottom:4}}>{tickets.filter(t=>t.priority===p).length}</div>
                    <div style={{fontSize:12,color:'#667085'}}>{p}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>)}

        </div>
      </div>
    </div>
  )
}
