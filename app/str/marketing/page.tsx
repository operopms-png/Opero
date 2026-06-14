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
          {section!=='Email'&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>🚀</div><div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>{section}</div><div style={{fontSize:14,color:'#667085'}}>Coming soon</div></div></div>}
        </div>
      </div>
    </div>
  )
}
