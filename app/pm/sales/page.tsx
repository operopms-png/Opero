'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#101828'
const LABEL = 'Property Management'
const NAV = [{group:'SALES',items:[
  {s:'Sales Workspace',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>},
  {s:'Prospecting',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
  {s:'Documents',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
  {s:'Meetings Scheduler',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
  {s:'Sequences',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>},
  {s:'Activity Feed',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
  {s:'Forecast',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>},
  {s:'Sales Analytics',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
]}]
export default function Page() {
  const [section, setSection] = useState('Sales Workspace')
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>
  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      <div style={{width:210,background:'#fff',borderRight:'1px solid #F2F4F7',display:'flex',flexDirection:'column',paddingTop:16,flexShrink:0,minHeight:'100vh',overflowY:'auto'}}>
        <div style={{padding:'0 16px 14px',borderBottom:'1px solid #F2F4F7'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{LABEL}</div>
          <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>Sales</div>
        </div>
        <nav style={{flex:1,padding:'8px 10px'}}>
          {NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>{group.group}</div>
              {group.items.map(({s,i})=>(
                <button key={s} onClick={()=>setSection(s)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:7,border:'none',background:section===s?ACCENT+'18':'transparent',color:section===s?ACCENT:'#344054',fontSize:13,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit',textAlign:'left',marginBottom:1}}>
                  <span style={{display:'flex',alignItems:'center'}}>{i}</span>{s}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:'#101828'}}>{section}</h1>
          {section==='Documents'&&<div style={{display:'flex',gap:8}}><button style={{padding:'8px 16px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>New folder</button><button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Upload document</button></div>}
          {section==='Meetings Scheduler'&&<button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create scheduling page</button>}
          {section==='Sales Analytics'&&<button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create ▾</button>}
        </div>
        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {section==='Sales Workspace'&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>💼</div><div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>Sales Workspace</div><div style={{fontSize:14,color:'#667085'}}>Coming soon</div></div></div>}

          {section==='Prospecting'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#FEE2E2',borderRadius:20,padding:'4px 12px',marginBottom:16}}><span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block'}}/><span style={{fontSize:12,fontWeight:600,color:'#EF4444'}}>Prospecting Agent Off</span></div>
                <h3 style={{fontSize:20,fontWeight:700,color:'#101828',marginBottom:12}}>Your always-on pipeline assistant</h3>
                <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>The Prospecting Agent finds companies, sources contacts, and drafts personalized outreach, so your sales reps can close more deals.</p>
                <div style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:20,marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:12}}>Ready to activate!</div>
                  {[{icon:'✅',t:'Target audience',d:'All non-customers — Founders, Finance Leaders, Sales Leaders'},{icon:'⚠️',t:'Selling context',d:'Pulled from your website — what you sell, value prop, and pain points.'},{icon:'✅',t:'Sending inbox',d:'Prospecting agent will send from the contact owner'},{icon:'✅',t:'Source contacts',d:'Agent will find contacts that are a good match using the CRM.'}].map(item=>(
                    <div key={item.t} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid #F2F4F7'}}>
                      <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
                      <div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between'}}><div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{item.t}</div><button style={{background:'none',border:'none',color:ACCENT,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Edit</button></div><div style={{fontSize:12,color:'#667085',marginTop:2}}>{item.d}</div></div>
                    </div>
                  ))}
                </div>
                <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Activate agent</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[{icon:'🔍',t:'Monitor companies',d:'Track target accounts and get notified of buying signals'},{icon:'📡',t:'Check for signals',d:'Identify intent data and engagement triggers'},{icon:'👥',t:'Source contacts',d:'Find decision makers at target companies'},{icon:'✉️',t:'Generate email',d:'Draft personalized outreach for each prospect'},{icon:'🚀',t:'Start outreach',d:'Send approved emails and track responses'}].map((s,i)=>(
                  <div key={s.t} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.icon}</div>
                    <div><div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{s.t}</div><div style={{fontSize:12,color:'#667085'}}>{s.d}</div></div>
                    <div style={{marginLeft:'auto',width:20,height:20,borderRadius:'50%',background:i<3?'#10B981':'#F2F4F7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>{i<3?'✓':''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>)}

          {section==='Documents'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{padding:'12px 20px',display:'flex',gap:8,borderBottom:'1px solid #E4E7EC'}}><input placeholder="Search documents" style={{flex:1,padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 80px 140px 140px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}><span>Name</span><span>Links created</span><span>Views</span><span>Owner</span><span>Last updated</span></div>
              {[{n:'Property Management Client Acquisition Guide',d:'May 17, 2026'},{n:'Proposal Message template',d:'May 17, 2026'},{n:'Sales script',d:'May 17, 2026'},{n:'Owner onboarding scripts',d:'May 20, 2026'},{n:'Rental Projection PDFs',d:'May 17, 2026'},{n:'Staff email templates',d:'May 18, 2026'}].map(doc=>(
                <div key={doc.n} style={{display:'grid',gridTemplateColumns:'1fr 140px 80px 140px 140px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{color:ACCENT,fontSize:14}}>📁</span><span style={{fontSize:13,color:ACCENT,fontWeight:500,cursor:'pointer'}}>{doc.n}</span></div>
                  <span style={{fontSize:13,color:'#344054'}}>0</span><span style={{fontSize:13,color:'#344054'}}>0</span><span style={{fontSize:13,color:'#667085'}}>admin</span><span style={{fontSize:13,color:'#667085'}}>{doc.d}</span>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Meetings Scheduler'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 140px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}><span>Meeting name</span><span>Organizer</span><span>Type</span><span>Duration</span><span>Views</span><span>Meetings booked</span></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 140px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div><div style={{fontSize:13,fontWeight:500,color:ACCENT,cursor:'pointer'}}>60 min, 30 min, and 15 min meeting</div><div style={{fontSize:11,color:'#667085',marginTop:2}}>sangsters <span style={{background:'#F2F4F7',padding:'1px 6px',borderRadius:4,fontSize:10}}>default</span></div></div>
                <span style={{fontSize:13,color:'#344054'}}>sangsters group</span><span style={{fontSize:13,color:'#344054'}}>One-on-one</span><span style={{fontSize:13,color:'#344054'}}>Multiple</span><span style={{fontSize:13,color:'#344054'}}>0</span><span style={{fontSize:13,color:'#344054'}}>0</span>
              </div>
              <div style={{padding:'12px 20px',textAlign:'right'}}><button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Create scheduling page</button></div>
            </div>
          </div>)}

          {section==='Activity Feed'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7EC',display:'flex',gap:8}}><input placeholder="Search activities" style={{flex:1,padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/><select style={{padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff'}}><option>All activity types</option><option>Email</option><option>Call</option><option>Meeting</option></select></div>
              <div style={{padding:24}}>
                <div style={{fontSize:12,fontWeight:600,color:'#667085',marginBottom:12,textTransform:'uppercase'}}>Today</div>
                {[{name:'Guest enquiry received',action:'submitted a contact form on',target:'sangstersgroup.com',type:'Form',time:'Just now',color:'#10B981'},{name:'New contact added',action:'was added to',target:'CRM',type:'Contact',time:'2 mins ago',color:ACCENT},{name:'Deal created',action:'new deal created in',target:'pipeline',type:'Deal',time:'1 hour ago',color:'#F59E0B'}].map(a=>(
                  <div key={a.name} style={{display:'flex',gap:12,padding:'14px 0',borderBottom:'1px solid #F2F4F7'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:a.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:a.color,flexShrink:0}}>A</div>
                    <div style={{flex:1}}><div style={{fontSize:13,color:'#344054',lineHeight:1.5}}><strong style={{color:'#101828'}}>{a.name}</strong> {a.action} <span style={{color:ACCENT}}>{a.target}</span></div><div style={{fontSize:11,color:'#98A2B3',marginTop:2}}>{a.time}</div></div>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:a.color+'18',color:a.color,height:'fit-content'}}>{a.type}</span>
                  </div>
                ))}
                <div style={{textAlign:'center',marginTop:16}}><button style={{padding:'8px 24px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Load older activities</button></div>
              </div>
            </div>
          </div>)}

          {section==='Sequences'&&(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
            <div style={{textAlign:'center',maxWidth:500}}>
              <div style={{fontSize:48,marginBottom:16}}>🔄</div>
              <h3 style={{fontSize:20,fontWeight:700,color:'#101828',marginBottom:8}}>Automate your follow-ups</h3>
              <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>Book more meetings with personalized, multi-touch sequences. Streamline and automate repetitive sales activities to make sure no lead slips through the cracks.</p>
              <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create sequence</button>
            </div>
          </div>)}

          {section==='Forecast'&&(<div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,marginBottom:20}}>
              <h3 style={{fontSize:20,fontWeight:700,color:'#101828',marginBottom:20,textAlign:'center'}}>Get a holistic overview of your entire pipeline and easily dive into the details</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                <div style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}><span>Best case</span><span>Commit</span><span>Forecast</span></div>
                  {[{a:'£3,150',b:'£2,320',c:'£14,400'},{a:'£490',b:'£760',c:'£6,800'},{a:'£350',b:'£520',c:'£0'},{a:'£910',b:'£0',c:'£0'}].map((r,i)=>(<div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',padding:'12px 16px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',gap:8}}><span style={{fontWeight:500}}>{r.a}</span><span>{r.b}</span><span style={{color:ACCENT}}>{r.c}</span></div>))}
                </div>
                <div><h4 style={{fontSize:16,fontWeight:700,color:'#101828',marginBottom:8}}>Give power to your team</h4><p style={{fontSize:13,color:'#667085',lineHeight:1.6}}>Forecast submissions lets sales reps and managers submit a custom forecast for the month or quarter. This forecast rolls up by the team to give leaders visibility into where the team thinks they will land.</p></div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {[{l:'Pipeline value',v:'£0',c:ACCENT},{l:'Best case',v:'£0',c:'#10B981'},{l:'Commit',v:'£0',c:'#F59E0B'}].map(s=>(<div key={s.l} style={{textAlign:'center',padding:20,background:'#fff',borderRadius:10,border:'1px solid #E4E7EC'}}><div style={{fontSize:22,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div><div style={{fontSize:12,color:'#667085'}}>{s.l}</div></div>))}
            </div>
          </div>)}

          {section==='Sales Analytics'&&(<div>
            <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:16}}>
                <input placeholder="Search" style={{width:'100%',padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,boxSizing:'border-box'}}/>
                <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'4px 10px',marginBottom:8}}>Analytics suites</div>
                {[{l:'Marketing',active:false},{l:'Sales',active:true},{l:'Service',active:false}].map(item=>(<div key={item.l} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,background:item.active?ACCENT+'18':'transparent',color:item.active?ACCENT:'#344054',fontSize:13,fontWeight:item.active?600:400,cursor:'pointer',marginBottom:2}}>› {item.l}</div>))}
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:18,fontWeight:700,color:'#101828',marginBottom:4}}>Sales analytics suite</div>
                <div style={{fontSize:13,color:'#667085',marginBottom:20}}>Ready-made sales reports based on best practices</div>
                <div style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:20,marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:12}}>QUICK ANSWERS 🔥 Most popular</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{['How many deals were created this quarter?','How often are calls connecting?','How many activities have reps completed?'].map(q=>(<button key={q} style={{padding:'8px 14px',borderRadius:20,border:'1px solid #E4E7EC',background:'#fff',fontSize:12,color:'#344054',cursor:'pointer',fontFamily:'inherit'}}>🔥 {q}</button>))}</div>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span style={{fontSize:14,fontWeight:600,color:'#101828'}}>Suggested for you</span><span style={{fontSize:10,fontWeight:700,background:'#E0E7FF',color:ACCENT,padding:'2px 6px',borderRadius:4}}>BETA</span></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{[{i:'💼',t:'Deals created'},{i:'🏆',t:'Deals won & lost'},{i:'📏',t:'Average deal size'},{i:'📊',t:'Team activity'}].map(r=>(<div key={r.t} style={{padding:'12px 16px',border:'1px solid #E4E7EC',borderRadius:8,fontSize:13,color:'#344054',cursor:'pointer',display:'flex',alignItems:'center',gap:8,background:'#F9FAFB'}}>{r.i} {r.t}</div>))}</div>
                </div>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Ready-made reports</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>{[{i:'📞',t:'Call outcomes',d:'View the total number of calls your sales reps are making and what outcomes these calls have.',tag:'LAST MONTH'},{i:'✅',t:'Completed activities',d:'View the number of calls, meetings, tasks, notes, and emails each rep has logged.',tag:'LIMITED DATA'},{i:'🎯',t:'Prospecting activities',d:'Assess sales process, team performance, and resource allocation.',tag:'LAST MONTH'}].map(r=>(<div key={r.t} style={{padding:20,border:'1px solid #E4E7EC',borderRadius:10,cursor:'pointer'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{fontSize:20}}>{r.i}</span><span style={{fontSize:14,fontWeight:600,color:'#101828'}}>{r.t}</span></div><div style={{fontSize:12,color:'#667085',lineHeight:1.5,marginBottom:12}}>{r.d}</div><span style={{fontSize:10,fontWeight:700,background:'#F2F4F7',color:'#667085',padding:'2px 8px',borderRadius:4}}>{r.tag}</span></div>))}</div>
              </div>
            </div>
          </div>)}

        </div>
      </div>
    </div>
  )
}
