'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#3B4AFF'
const NAV_SECTIONS = [
  {group:'MARKETING',items:[
    {s:'Campaigns',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
    {s:'Email',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>},
    {s:'Social',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>},
    {s:'Ads',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>},
    {s:'Events',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
    {s:'Forms',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>},
    {s:'CTAs',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>},
    {s:'Lead Scoring',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
    {s:'Analytics',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
    {s:'Brand',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>},
  ]}
]
export default function Page() {
  const [section, setSection] = useState('Campaigns')
  const [loading, setLoading] = useState(true)
  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) }, [])
  if(loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#98A2B3' }}>Loading...</div>
  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif", display:'flex' }}>
      <div style={{ width:210, background:'#fff', borderRight:'1px solid #F2F4F7', display:'flex', flexDirection:'column', paddingTop:16, flexShrink:0, minHeight:'100vh', overflowY:'auto' }}>
        <div style={{ padding:'0 16px 14px', borderBottom:'1px solid #F2F4F7' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#98A2B3', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Vacation Rentals</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#101828' }}>Marketing</div>
        </div>
        <nav style={{ flex:1, padding:'8px 10px' }}>
          {NAV_SECTIONS.map(group=>(
            <div key={group.group}>
              <div style={{ fontSize:10, fontWeight:700, color:'#98A2B3', textTransform:'uppercase', letterSpacing:'0.06em', padding:'10px 10px 4px' }}>{group.group}</div>
              {group.items.map(({s,i})=>(
                <button key={s} onClick={()=>setSection(s)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', borderRadius:7, border:'none', background:section===s?ACCENT+'18':'transparent', color:section===s?ACCENT:'#344054', fontSize:13, fontWeight:section===s?600:400, cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:1 }}>
                  <span style={{ display:'flex', alignItems:'center' }}>{i}</span>{s}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 24px', height:60, display:'flex', alignItems:'center' }}>
          <h1 style={{ fontSize:17, fontWeight:600, margin:0, color:'#101828' }}>{section}</h1>
        </div>
        <div style={{ flex:1, padding:24, overflowY:'auto' }}>
          {section==='Email'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0,marginBottom:4}}>Marketing Email</h2>
      <div style={{fontSize:13,color:'#667085'}}>0 marketing emails</div>
    </div>
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <div style={{fontSize:13,color:'#667085',marginRight:8}}>0/5,000 sent this month</div>
      <button style={{padding:'8px 16px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Email tools ▾</button>
      <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create email</button>
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
    <div style={{display:'flex',gap:0,borderBottom:'1px solid #E4E7EC',padding:'0 20px'}}>
      {['All emails','Drafts','Scheduled','Sent','Archived'].map((tab,i)=>(
        <button key={tab} style={{padding:'12px 16px',background:'none',border:'none',borderBottom:i===0?'2px solid '+ACCENT:'2px solid transparent',color:i===0?ACCENT:'#667085',fontSize:13,fontWeight:i===0?600:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
          {tab}
        </button>
      ))}
    </div>
    <div style={{padding:'12px 20px',display:'flex',gap:8,borderBottom:'1px solid #E4E7EC'}}>
      <input placeholder="Search email name or subject line" style={{flex:1,padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Email type ▾</button>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>+ Add quick filter</button>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Advanced filters</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 120px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
      <span>Email name</span><span style={{textAlign:'center'}}>Delivered</span><span style={{textAlign:'center'}}>Open rate</span><span style={{textAlign:'center'}}>Click rate</span>
    </div>
    <div style={{textAlign:'center',padding:60,color:'#98A2B3'}}>
      <div style={{fontSize:40,marginBottom:12}}>✉️</div>
      <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:8}}>No emails yet</div>
      <div style={{fontSize:13,color:'#667085',marginBottom:20}}>Create your first marketing email to get started.</div>
      <button style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create email</button>
    </div>
  </div>
</div>)}
          {section==='Ads'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
    <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0}}>Ads</h2>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:48,display:'flex',alignItems:'center',gap:48}}>
    <div style={{flex:1}}>
      <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:16}}>Track and optimize your ad campaigns to turn prospects into customers</h3>
      {[{t:'View the ROI',d:'of each ad campaign'},{t:'Use CRM data',d:'to create and optimize targeted ads'},{t:'Automatically follow up',d:'with new leads'}].map(i=>(
        <div key={i.t} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,fontSize:14,color:'#344054'}}>
          <span style={{color:ACCENT}}>→</span><strong>{i.t}</strong> {i.d}
        </div>
      ))}
      <button style={{marginTop:20,padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Get started with Ads</button>
    </div>
    <div style={{display:'flex',gap:12,flexShrink:0}}>
      {['🎯','💼','📘','📸'].map((icon,i)=>(
        <div key={i} style={{width:56,height:56,borderRadius:12,background:'#F2F4F7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{icon}</div>
      ))}
    </div>
  </div>
</div>)}
          {section==='Events'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0}}>Marketing events</h2>
    <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create marketing event</button>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
    <div style={{padding:'12px 20px',display:'flex',gap:8,borderBottom:'1px solid #E4E7EC'}}>
      <input placeholder="Type / to search" style={{flex:1,padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Filter</button>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Sort by</button>
    </div>
    <div style={{padding:40,textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:16}}>📅</div>
      <div style={{fontSize:16,fontWeight:600,color:'#101828',marginBottom:8}}>Centralize and manage your marketing events</div>
      <div style={{fontSize:13,color:'#667085',marginBottom:20}}>Track and analyze data from your Marketing Events to optimize your marketing efforts and event strategy.</div>
      <button style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create marketing event</button>
    </div>
    <div style={{borderTop:'1px solid #E4E7EC',padding:24}}>
      <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Sync your marketing events with</div>
      <div style={{display:'flex',gap:12}}>
        {['Zoom','Eventbrite','Hopin','GoToWebinar'].map(p=>(
          <div key={p} style={{padding:'12px 20px',border:'1px solid #E4E7EC',borderRadius:8,fontSize:13,color:'#344054',fontWeight:500}}>{p}</div>
        ))}
      </div>
    </div>
  </div>
</div>)}
          {section==='Forms'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0,marginBottom:4}}>Forms</h2>
      <div style={{fontSize:13,color:'#667085'}}>0 forms</div>
    </div>
    <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create form</button>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
    <div style={{display:'flex',gap:0,borderBottom:'1px solid #E4E7EC',padding:'0 20px'}}>
      {['All forms','Published'].map((tab,i)=>(
        <button key={tab} style={{padding:'12px 16px',background:'none',border:'none',borderBottom:i===0?'2px solid '+ACCENT:'2px solid transparent',color:i===0?ACCENT:'#667085',fontSize:13,fontWeight:i===0?600:400,cursor:'pointer',fontFamily:'inherit'}}>{tab}</button>
      ))}
    </div>
    <div style={{padding:'12px 20px',display:'flex',gap:8,borderBottom:'1px solid #E4E7EC'}}>
      <input placeholder="Search forms" style={{width:280,padding:'8px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Form Type ▾</button>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>+ Add quick filter</button>
      <button style={{padding:'8px 14px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Advanced filters</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 120px 140px 120px 120px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
      <span>Name</span><span>Page views</span><span>Submissions / page view</span><span>Spam submissions</span><span>Form submissions</span>
    </div>
    <div style={{textAlign:'center',padding:60,color:'#98A2B3'}}>
      <div style={{fontSize:40,marginBottom:12}}>📋</div>
      <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:8}}>No forms yet</div>
      <div style={{fontSize:13,color:'#667085',marginBottom:20}}>Create a form to start capturing leads.</div>
      <button style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create form</button>
    </div>
  </div>
</div>)}
          {section==='CTAs'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
    <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0}}>CTAs</h2>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,marginBottom:16}}>
    <div style={{fontSize:13,color:'#667085',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Calls-to-action (CTAs)</div>
    <h3 style={{fontSize:24,fontWeight:700,color:'#101828',marginBottom:24}}>Engage visitors with personalized pop-ups and buttons</h3>
    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Choose a recommended template to get started</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
      {[{t:'Pop-up',d:'A high-visibility message for lead generation, event sign-ups, or promotions.'},{t:'Slide-in',d:'Appears from the left or right side of the screen, encouraging visitors to take action.'},{t:'Button',d:'Place buttons anywhere on your site to encourage clicks for sign-ups, downloads, or purchases.'}].map(c=>(
        <div key={c.t} style={{border:'1px solid #E4E7EC',borderRadius:10,padding:20,background:'#F9FAFB'}}>
          <div style={{fontWeight:600,fontSize:14,color:'#101828',marginBottom:8}}>{c.t}</div>
          <div style={{fontSize:13,color:'#667085',marginBottom:16,lineHeight:1.5}}>{c.d}</div>
          <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Use template</button>
        </div>
      ))}
    </div>
  </div>
</div>)}
          {section==='Campaigns'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0}}>Campaigns</h2>
    <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create campaign</button>
  </div>
  <div style={{background:'linear-gradient(135deg,'+ACCENT+' 0%,#1a1a2e 100%)',borderRadius:12,padding:40,marginBottom:20,display:'flex',gap:40,alignItems:'center'}}>
    <div style={{flex:1}}>
      <div style={{fontSize:32,fontWeight:800,color:'#fff',marginBottom:12,lineHeight:1.2}}>All-in-one campaign management</div>
      <div style={{fontSize:14,color:'rgba(255,255,255,0.8)',marginBottom:20,lineHeight:1.6}}>Everything you need to execute great campaigns, all in one place. View, manage, and action campaign priorities directly from Opero.</div>
      <button style={{padding:'10px 24px',borderRadius:8,border:'2px solid #fff',background:'transparent',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create your first campaign</button>
    </div>
    <div style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:20,minWidth:300,flexShrink:0}}>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:12,fontWeight:600}}>CAMPAIGN OVERVIEW</div>
      {[{l:'Sessions',v:'0'},{l:'New Contacts',v:'0'},{l:'Influenced Contacts',v:'0'},{l:'Closed Deals',v:'0'},{l:'Attributed Revenue',v:'£0'}].map(s=>(
        <div key={s.l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.1)',fontSize:13}}>
          <span style={{color:'rgba(255,255,255,0.7)'}}>{s.l}</span>
          <span style={{color:'#fff',fontWeight:600}}>{s.v}</span>
        </div>
      ))}
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',marginBottom:16,overflow:'hidden'}}>
    <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7EC',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Campaign tasks</div>
      <div style={{display:'flex',gap:8}}>
        <button style={{padding:'6px 12px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>All assignees ▾</button>
        <button style={{padding:'6px 12px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Create task</button>
      </div>
    </div>
    <div style={{display:'flex',gap:0,borderBottom:'1px solid #E4E7EC',padding:'0 20px'}}>
      {['All (0)','Due today','Overdue','All completed'].map((tab,i)=>(
        <button key={tab} style={{padding:'10px 14px',background:'none',border:'none',borderBottom:i===0?'2px solid '+ACCENT:'2px solid transparent',color:i===0?ACCENT:'#667085',fontSize:13,fontWeight:i===0?600:400,cursor:'pointer',fontFamily:'inherit'}}>{tab}</button>
      ))}
    </div>
    <div style={{padding:'12px 20px',display:'flex',gap:8,borderBottom:'1px solid #E4E7EC'}}>
      <input placeholder="Search" style={{width:200,padding:'7px 12px',border:'1px solid #D0D5DD',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
      <button style={{padding:'7px 12px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Filter</button>
      <button style={{padding:'7px 12px',border:'1px solid #D0D5DD',borderRadius:6,background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit columns</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'40px 100px 1fr 180px 160px 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
      <span></span><span>Status</span><span>Title</span><span>Due date</span><span>Assigned to</span><span>Notes</span>
    </div>
    <div style={{textAlign:'center',padding:48,color:'#98A2B3'}}>
      <div style={{fontSize:36,marginBottom:12}}>✓</div>
      <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No tasks yet</div>
      <div style={{fontSize:13,color:'#667085'}}>Create a campaign to start adding tasks.</div>
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Track complex campaigns from one place</div>
    <div style={{fontSize:13,color:'#667085',marginBottom:20,lineHeight:1.6}}>Use real-time customer data with Opero Campaigns built on top of your CRM. View sessions, new contacts, influenced contacts, closed deals and attributed revenue.</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
      {[{l:'SESSIONS',v:'0'},{l:'NEW CONTACTS',v:'0'},{l:'INFLUENCED CONTACTS',v:'0'},{l:'CLOSED DEALS',v:'0'},{l:'ATTRIBUTED REVENUE',v:'£0'}].map(s=>(
        <div key={s.l} style={{textAlign:'center',padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
          <div style={{fontSize:10,color:'#667085',marginBottom:6,fontWeight:600,letterSpacing:'0.04em'}}>{s.l}</div>
          <div style={{fontSize:24,fontWeight:700,color:ACCENT}}>{s.v}</div>
        </div>
      ))}
    </div>
    <div style={{height:120,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3',fontSize:13}}>
      📈 Campaign analytics chart — data will appear once campaigns are created
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Effortless collaboration</div>
      <div style={{display:'flex',gap:8}}>
        <button style={{padding:'6px 12px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Month ▾</button>
        <button style={{padding:'6px 12px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Today</button>
        <button style={{padding:'6px 12px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Create task</button>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,background:'#E4E7EC',borderRadius:8,overflow:'hidden'}}>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
        <div key={d} style={{background:'#F9FAFB',padding:'8px 4px',textAlign:'center',fontSize:11,fontWeight:600,color:'#667085'}}>{d}</div>
      ))}
      {Array.from({length:35},(_,i)=>(
        <div key={i} style={{background:'#fff',minHeight:80,padding:6,fontSize:11,color:'#344054'}}>
          <div style={{color:'#98A2B3',marginBottom:4}}>{i<2?'':i-1}</div>
        </div>
      ))}
    </div>
  </div>
</div>)}
          {section==='Lead Scoring'&&(<div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:0}}>Lead Scoring</h2>
    <button style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create score</button>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
    <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32}}>
      <h3 style={{fontSize:22,fontWeight:700,color:'#101828',marginBottom:12,lineHeight:1.3}}>Prioritize and qualify your leads with Lead Scoring</h3>
      <p style={{fontSize:14,color:'#667085',marginBottom:20,lineHeight:1.6}}>Understand your leads&apos; digital body language with fit and engagement scores, help shorten sales cycles and drive more conversions.</p>
      <button style={{padding:'10px 24px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>Get started with Lead Scoring</button>
    </div>
    <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32}}>
      <h3 style={{fontSize:18,fontWeight:700,color:'#101828',marginBottom:12}}>Prioritise your most promising leads, improve conversion rates and align marketing and sales</h3>
      <div style={{background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC',padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>Combined contact score</div>
          <div style={{display:'flex',gap:6}}>
            <span style={{fontSize:11,color:'#667085'}}>Score is OFF</span>
            <button style={{padding:'4px 10px',borderRadius:4,border:'none',background:ACCENT,color:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Review and turn on</button>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:12,borderBottom:'1px solid #E4E7EC',paddingBottom:8}}>
          {['Criteria','Contacts','Settings'].map((t,i)=><button key={t} style={{padding:'4px 12px',borderRadius:4,border:'none',background:i===0?ACCENT:'transparent',color:i===0?'#fff':'#667085',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>)}
        </div>
        <div style={{fontSize:12,color:'#667085',marginBottom:8}}>Score limit: 0 to 300 points</div>
        <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:6,padding:12,marginBottom:6}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:'#101828'}}>Group 1 — EVENT</span>
            <span style={{fontSize:11,color:'#667085'}}>Group score limit +/-: 100</span>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:'#667085'}}>Decay scores</span>
            <span style={{padding:'2px 8px',borderRadius:4,background:'#10B981',color:'#fff',fontSize:11,fontWeight:600}}>ON</span>
            <span style={{fontSize:11,color:'#667085'}}>reduce by 50% every 3 months</span>
          </div>
          {[{l:'Sales Email (1:1)',pts:'+10'},{l:'Meetings',pts:'-10'}].map(r=>(
            <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:'1px solid #F2F4F7',fontSize:12,color:'#344054'}}>
              <span>{r.l}</span><span style={{fontWeight:600,color:r.pts.startsWith('+')?'#10B981':'#EF4444'}}>{r.pts} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,marginBottom:20}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'start'}}>
      <div>
        <h3 style={{fontSize:18,fontWeight:700,color:'#101828',marginBottom:12}}>Draw deeper insights from your lead data</h3>
        <p style={{fontSize:14,color:'#667085',lineHeight:1.6}}>Stop treating all leads the same. Fit and engagement scoring helps you evaluate how well a lead matches your ideal customer profile and their level of interest in your brand.</p>
      </div>
      <div style={{background:'#1D2939',borderRadius:10,padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>Choose score type</div>
          <button style={{padding:'4px 10px',borderRadius:4,border:'none',background:ACCENT,color:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Create</button>
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:12}}>Choose who you'd like to score</div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {['Contacts','Companies'].map((t,i)=><button key={t} style={{flex:1,padding:'8px',borderRadius:6,border:'1px solid '+(i===0?ACCENT:'rgba(255,255,255,0.2)'),background:i===0?ACCENT:'transparent',color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:i===0?600:400}}>{t}</button>)}
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:8}}>Choose how you'd like to score them</div>
        {[{t:'Contact engagement score',d:'Measure your contact&apos;s level of engagement based on their behavior and interactions.'},{t:'Contact fit score',d:'Evaluate how closely a contact aligns with your ideal customer based on demographics.'},{t:'Contact combined score',d:'Measure your contact&apos;s level of engagement and how they align to your ideal customer.'}].map((opt,i)=>(
          <div key={opt.t} style={{background:i===0?ACCENT+'22':'rgba(255,255,255,0.05)',border:'1px solid '+(i===0?ACCENT:'rgba(255,255,255,0.1)'),borderRadius:8,padding:12,marginBottom:8,cursor:'pointer'}}>
            <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:4}}>{opt.t}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>{opt.d}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'start'}}>
      <div style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>Lead score history</div>
          <button style={{background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#667085'}}>×</button>
        </div>
        <div style={{fontSize:12,color:'#667085',marginBottom:4}}>Intent Score: 90</div>
        <div style={{fontSize:12,color:ACCENT,marginBottom:12}}>See score calculations →</div>
        <div style={{fontSize:11,fontWeight:600,color:'#667085',marginBottom:8}}>Score trend — MONTHLY</div>
        <div style={{height:80,background:'#fff',borderRadius:6,border:'1px solid #E4E7EC',display:'flex',alignItems:'flex-end',padding:'8px',gap:4}}>
          {[20,35,45,60,55,70,80,90].map((h,i)=>(
            <div key={i} style={{flex:1,background:ACCENT,borderRadius:'2px 2px 0 0',height:`${h}%`,opacity:0.7+i*0.04}}/>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <div style={{display:'grid',gridTemplateColumns:'60px 60px 1fr 80px',fontSize:10,fontWeight:600,color:'#667085',padding:'4px 0',borderBottom:'1px solid #E4E7EC',textTransform:'uppercase'}}>
            <span>Score</span><span>Change</span><span>Event</span><span>Date</span>
          </div>
          {[{s:90,c:'+30',e:'Enrolled in workflow',d:'11/01/2024'},{s:60,c:'+20',e:'Email opened',d:'10/15/2024'},{s:40,c:'+40',e:'Page visited',d:'10/01/2024'}].map((r,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'60px 60px 1fr 80px',fontSize:11,color:'#344054',padding:'6px 0',borderBottom:'1px solid #F2F4F7'}}>
              <span style={{fontWeight:600,color:ACCENT}}>{r.s}</span>
              <span style={{color:'#10B981',fontWeight:600}}>{r.c}</span>
              <span>{r.e}</span>
              <span style={{color:'#667085'}}>{r.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 style={{fontSize:18,fontWeight:700,color:'#101828',marginBottom:12}}>Track lead scores with complete transparency</h3>
        <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:12}}>Easily view a contact&apos;s lead score right on their CRM record with the contact score card and score history panel. This gives you a detailed overview of the lead&apos;s score history and recent activities that influenced their score.</p>
        <p style={{fontSize:14,color:'#667085',lineHeight:1.6}}>Effectively sharing valuable leads between Marketing and Sales is essential for your success. With a clear view of how scores evolve over time, Sales can fully trust the scores provided by Marketing.</p>
      </div>
    </div>
  </div>
</div>)}
          {section!=='Email'&&section!=='Ads'&&section!=='Events'&&section!=='Forms'&&section!=='CTAs'&&section!=='Campaigns'&&section!=='Lead Scoring'&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>🚀</div><div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>{section}</div><div style={{fontSize:14,color:'#667085'}}>Coming soon</div></div></div>}
        </div>
      </div>
    </div>
  )
}
