'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#101828'
const NAV_SECTIONS = [
  {group:'SALES',items:[
    {s:'Sales Workspace',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>},
    {s:'Prospecting',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
    {s:'Documents',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
    {s:'Meetings Scheduler',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
    {s:'Sequences',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>},
    {s:'Forecast',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>},
    {s:'Sales Analytics',i:<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
  ]}
]
export default function Page() {
  const [section, setSection] = useState('Sales Workspace')
  const [loading, setLoading] = useState(true)
  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) }, [])
  if(loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#98A2B3' }}>Loading...</div>
  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif", display:'flex' }}>
      <div style={{ width:210, background:'#fff', borderRight:'1px solid #F2F4F7', display:'flex', flexDirection:'column', paddingTop:16, flexShrink:0, minHeight:'100vh', overflowY:'auto' }}>
        <div style={{ padding:'0 16px 14px', borderBottom:'1px solid #F2F4F7' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#98A2B3', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Property Management</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#101828' }}>Sales</div>
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
        <div style={{ flex:1, padding:24, overflowY:'auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>💼</div>
            <div style={{ fontSize:18, fontWeight:600, color:'#101828', marginBottom:8 }}>{section}</div>
            <div style={{ fontSize:14, color:'#667085' }}>Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  )
}
