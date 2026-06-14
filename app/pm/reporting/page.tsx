'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const MODULE = 'pm'
const ACCENT = '#101828'
const LABEL = 'Property Management'
const NAV = [{group:'REPORTING',items:[{s:'Dashboards'},{s:'Reports'},{s:'Goals'}]}]
export default function Page() {
  const [section, setSection] = useState('Dashboards')
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      const [c,d,a] = await Promise.all([
        supabase.from('crm_contacts').select('*').eq('module',MODULE).order('created_at',{ascending:false}),
        supabase.from('crm_deals').select('*').eq('module',MODULE).order('created_at',{ascending:false}),
        supabase.from('crm_activities').select('*,crm_contacts(name)').eq('module',MODULE).order('created_at',{ascending:false}).limit(10),
      ])
      setContacts(c.data??[]); setDeals(d.data??[]); setActivities(a.data??[])
      setLoading(false)
    })
  },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>
  const totalRevenue = deals.reduce((s,d)=>s+(d.value??0),0)
  const wonDeals = deals.filter(d=>d.stage==='Closed Won')
  const newDeals = deals.filter(d=>d.stage==='Lead')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentMonth = new Date().getMonth()
  const barData = months.map((_,i)=>({month:months[i],value:deals.filter(d=>new Date(d.created_at).getMonth()===i).reduce((s,d)=>s+(d.value??0),0),active:i===currentMonth}))
  const maxBar = Math.max(...barData.map(b=>b.value),100)
  const stageData = ['Lead','Qualified','Proposal','Negotiation','Closed Won','Closed Lost'].map(stage=>({stage,count:deals.filter(d=>d.stage===stage).length,value:deals.filter(d=>d.stage===stage).reduce((s,d)=>s+(d.value??0),0)}))
  const last30 = new Date(Date.now()-30*86400000)
  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      <div style={{width:210,background:'#fff',borderRight:'1px solid #F2F4F7',display:'flex',flexDirection:'column',paddingTop:16,flexShrink:0,minHeight:'100vh'}}>
        <div style={{padding:'0 16px 14px',borderBottom:'1px solid #F2F4F7'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{LABEL}</div>
          <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>Reporting</div>
        </div>
        <nav style={{flex:1,padding:'8px 10px'}}>
          {NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>{group.group}</div>
              {group.items.map(({s})=>(
                <button key={s} onClick={()=>setSection(s)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:7,border:'none',background:section===s?ACCENT+'18':'transparent',color:section===s?ACCENT:'#344054',fontSize:13,fontWeight:section===s?600:400,cursor:'pointer',fontFamily:'inherit',textAlign:'left',marginBottom:1}}>
                  {s==='Dashboards'?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>:s==='Reports'?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>}
                  {s}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <h1 style={{fontSize:17,fontWeight:600,margin:0,color:'#101828'}}>{section}</h1>
            {section==='Dashboards'&&<select style={{padding:'5px 10px',borderRadius:6,border:'1px solid #D0D5DD',fontSize:13,color:'#344054',fontFamily:'inherit'}}><option>Sales</option><option>Marketing</option><option>Overview</option></select>}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{padding:'7px 14px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Quick filters</button>
            <button style={{padding:'7px 14px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Advanced filters</button>
            <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>+ Add content</button>
          </div>
        </div>
        {section==='Dashboards'&&(
          <div style={{flex:1,padding:24,overflowY:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Team activities by activity date</div>
                  <span style={{fontSize:11,color:'#667085',background:'#F2F4F7',padding:'2px 8px',borderRadius:4}}>LAST 30 DAYS</span>
                </div>
                {activities.length===0?<div style={{textAlign:'center',padding:40,color:'#98A2B3'}}>No activity yet</div>:activities.slice(0,4).map(a=>(
                  <div key={a.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid #F2F4F7'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:ACCENT,flexShrink:0}}>{a.crm_contacts?.name?.charAt(0)??'?'}</div>
                    <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.subject}</div><div style={{fontSize:11,color:'#667085'}}>{a.crm_contacts?.name} · {new Date(a.created_at).toLocaleDateString('en-GB')}</div></div>
                  </div>
                ))}
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Contacts created and worked totals</div>
                <div style={{fontSize:11,color:'#667085',marginBottom:16}}>IN THE LAST 30 DAYS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                  {[{l:'CONTACTS CREATED',v:contacts.filter(c=>new Date(c.created_at)>last30).length},{l:'CONTACTS ASSIGNED',v:contacts.length},{l:'CONTACTS WORKED',v:activities.length}].map(s=>(
                    <div key={s.l} style={{textAlign:'center'}}><div style={{fontSize:11,color:'#667085',marginBottom:4}}>{s.l}</div><div style={{fontSize:28,fontWeight:700,color:ACCENT}}>{s.v}</div></div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[{l:'NEW DEALS CREATED',v:newDeals.length},{l:'DEALS CLOSED WON',v:wonDeals.length}].map(s=>(
                    <div key={s.l} style={{textAlign:'center',background:'#F9FAFB',borderRadius:8,padding:12}}><div style={{fontSize:11,color:'#667085',marginBottom:4}}>{s.l}</div><div style={{fontSize:24,fontWeight:700,color:'#101828'}}>{s.v}</div></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Deal revenue forecast by stage</div>
                <div style={{fontSize:11,color:'#667085',marginBottom:16}}>THIS ENTIRE YEAR | MONTHLY</div>
                <div style={{display:'flex',alignItems:'flex-end',gap:4,height:120,marginBottom:8}}>
                  {barData.map(b=>(
                    <div key={b.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                      <div style={{width:'100%',borderRadius:'3px 3px 0 0',background:b.active?ACCENT:b.value>0?ACCENT+'66':'#F2F4F7',height:`${Math.max((b.value/maxBar)*100,4)}%`}}/>
                      <div style={{fontSize:9,color:'#98A2B3'}}>{b.month.slice(0,1)}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:12,color:'#667085'}}>Total forecast: <strong style={{color:'#101828'}}>£{totalRevenue.toLocaleString()}</strong></div>
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>Deal closed totals vs. goal</div>
                <div style={{fontSize:11,color:'#667085',marginBottom:16}}>BY PIPELINE STAGE</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {stageData.map(s=>(
                    <div key={s.stage} style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{fontSize:12,color:'#344054',width:100,flexShrink:0}}>{s.stage}</div>
                      <div style={{flex:1,background:'#F2F4F7',borderRadius:4,height:8,overflow:'hidden'}}>
                        <div style={{width:`${deals.length?Math.min((s.count/deals.length)*100,100):0}%`,height:'100%',background:s.stage==='Closed Won'?'#10B981':s.stage==='Closed Lost'?'#EF4444':ACCENT,borderRadius:4}}/>
                      </div>
                      <div style={{fontSize:11,color:'#667085',width:60,textAlign:'right'}}>£{s.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {(section==='Reports'||section==='Goals')&&(
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{textAlign:'center'}}><div style={{fontSize:40,marginBottom:16}}>📊</div><div style={{fontSize:18,fontWeight:600,color:'#101828',marginBottom:8}}>{section}</div><div style={{fontSize:14,color:'#667085'}}>Coming soon</div></div>
          </div>
        )}
      </div>
    </div>
  )
}
