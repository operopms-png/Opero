'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
const ACCENT = '#5B7CFA'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

const AGENTS = [
  {
    key: 'guest',
    name: 'AI Guest Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    desc: 'Answers guest questions 24/7, sends check-in/check-out instructions, Wi-Fi details, house rules, and handles common complaints.',
    capabilities: ['Answer guest questions 24/7','Send check-in/check-out instructions','Provide Wi-Fi details and house rules','Handle common complaints and requests','Respond to Airbnb, Booking.com & Vrbo enquiries','Sync calendars across platforms'],
  },
  {
    key: 'maintenance',
    name: 'AI Maintenance Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    desc: 'Logs maintenance issues, assigns jobs to contractors, tracks repairs and follows up until work is completed.',
    capabilities: ['Log maintenance issues automatically','Assign jobs to contractors','Track repair progress','Follow up until work is completed','Notify owners of urgent issues'],
  },
  {
    key: 'cleaning',
    name: 'AI Cleaning Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M9 9l-6 6a2 2 0 002.83 2.83L12 11.8M14 4l6 6-3.5 3.5L10 7l4-3z"/></svg>,
    desc: 'Automatically schedules cleaners after bookings, notifies them of turnovers, tracks completion and generates reports.',
    capabilities: ['Automatically schedule cleaners after bookings','Notify cleaners of turnovers','Track cleaning completion','Generate cleaning reports','Flag missed or late cleans'],
  },
  {
    key: 'revenue',
    name: 'AI Revenue Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    desc: 'Adjusts nightly rates automatically, monitors competitor pricing, increases rates during high demand and fills calendar gaps.',
    capabilities: ['Adjust nightly rates automatically','Monitor competitor pricing','Increase rates during high demand periods','Fill calendar gaps with discounts','Suggest minimum stay rules'],
  },
  {
    key: 'owner',
    name: 'AI Owner Relations Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    desc: 'Generates monthly income reports, occupancy reports, expense tracking and profit & loss statements for owners.',
    capabilities: ['Monthly income reports','Occupancy reports','Expense tracking','Profit and loss statements','Proactive owner updates'],
  },
  {
    key: 'leads',
    name: 'AI Lead Qualification Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    desc: 'Finds landlord leads, qualifies property owners, books appointments automatically and follows up with prospects.',
    capabilities: ['Find landlord leads','Qualify property owners','Book appointments automatically','Follow up with prospects','Score lead quality'],
  },
]

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [section, setSection] = useState('Overview')
  const [activeAgents, setActiveAgents] = useState<Record<string,boolean>>({guest:false,maintenance:false,cleaning:false,revenue:false,owner:false,leads:false})
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState({agent:'guest',action:'',property:'',notes:''})
  const [selectedAgent, setSelectedAgent] = useState<string|null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [guestTest, setGuestTest] = useState({ property_id:'', guest_name:'', message:'' })
  const [guestReply, setGuestReply] = useState('')
  const [maintTest, setMaintTest] = useState({ property_id:'', title:'', description:'', priority:'medium' })
  const [maintReply, setMaintReply] = useState('')
  const [cleanTest, setCleanTest] = useState({ property_id:'', scheduled_date:'' })
  const [cleanReply, setCleanReply] = useState('')
  const [revTest, setRevTest] = useState({ property_id:'' })
  const [revReply, setRevReply] = useState<any>(null)
  const [ownerTest, setOwnerTest] = useState({ owner_id:'' })
  const [ownerReply, setOwnerReply] = useState<any>(null)
  const [leadTest, setLeadTest] = useState({ lead_name:'', source:'', inquiry:'' })
  const [leadReply, setLeadReply] = useState('')
  const [testing, setTesting] = useState(false)

  async function loadActivityLog(uid: string) {
    const { data } = await supabase.from('ai_activity_log').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setActivityLog((data ?? []).map((l:any) => ({ id: l.id, agent: l.agent_key, action: l.action, property: l.property_name, notes: l.notes, createdAt: new Date(l.created_at).toLocaleString() })))
  }

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      setUserId(user.id)
      const [agentsRes, propsRes, ownersRes] = await Promise.all([
        supabase.from('ai_agents').select('*').eq('user_id', user.id),
        supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('owner_profiles').select('*').order('created_at', { ascending: false }),
      ])
      if (agentsRes.data?.length) {
        const loaded: Record<string,boolean> = {guest:false,maintenance:false,cleaning:false,revenue:false,owner:false,leads:false}
        agentsRes.data.forEach((a:any) => { loaded[a.agent_key] = a.enabled })
        setActiveAgents(loaded)
      }
      setProperties(propsRes.data ?? [])
      setOwners(ownersRes.data ?? [])
      await loadActivityLog(user.id)
      setLoading(false)
    })
  },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const toggleAgent = async (key:string) => {
    const next = !activeAgents[key]
    setActiveAgents({...activeAgents,[key]:next})
    if (userId) await supabase.from('ai_agents').upsert({ user_id: userId, agent_key: key, enabled: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,agent_key' })
  }
  const activeCount = Object.values(activeAgents).filter(Boolean).length

  async function testGuestAgent() {
    if (!guestTest.property_id || !guestTest.message.trim() || !userId) return
    setTesting(true)
    setGuestReply('')
    const res = await fetch('/api/ai/guest-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...guestTest, user_id: userId }),
    })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setGuestReply(result.reply)
    await loadActivityLog(userId)
    setTesting(false)
  }

  async function testMaintenanceAgent() {
    if (!maintTest.property_id || !maintTest.title.trim() || !userId) return
    setTesting(true); setMaintReply('')
    const res = await fetch('/api/ai/maintenance-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...maintTest, user_id: userId }) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setMaintReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testCleaningAgent() {
    if (!cleanTest.property_id || !cleanTest.scheduled_date || !userId) return
    setTesting(true); setCleanReply('')
    const res = await fetch('/api/ai/cleaning-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cleanTest, user_id: userId }) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setCleanReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testRevenueAgent() {
    if (!revTest.property_id || !userId) return
    setTesting(true); setRevReply(null)
    const res = await fetch('/api/ai/revenue-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...revTest, user_id: userId }) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a suggestion'); setTesting(false); return }
    setRevReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testOwnerAgent() {
    if (!ownerTest.owner_id || !userId) return
    setTesting(true); setOwnerReply(null)
    const res = await fetch('/api/ai/owner-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ownerTest, user_id: userId }) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not draft a report'); setTesting(false); return }
    setOwnerReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testLeadAgent() {
    if (!leadTest.inquiry.trim() || !userId) return
    setTesting(true); setLeadReply('')
    const res = await fetch('/api/ai/lead-qualify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...leadTest, user_id: userId }) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not qualify this lead'); setTesting(false); return }
    setLeadReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>AI PROPERTY MANAGER</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>AI Agents</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Activity Log'&&<button onClick={()=>setShowLogForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Log Activity</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {['Overview','Agents','Activity Log'].map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        {section==='Overview'&&(<div>
          <div style={{background:'linear-gradient(135deg,#5B7CFA,#3B4AFF)',borderRadius:16,padding:32,color:'#fff',marginBottom:24}}>
            <div style={{fontSize:13,opacity:0.85,marginBottom:8,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>AI Property Manager</div>
            <div style={{fontSize:26,fontWeight:700,marginBottom:10}}>{activeCount} of {AGENTS.length} agents active</div>
            <div style={{fontSize:14,opacity:0.9,lineHeight:1.6,maxWidth:600}}>Let AI handle guest communication, maintenance coordination, cleaning scheduling, dynamic pricing, owner reporting and lead qualification — reducing the workload of 2–5 staff while operating 24/7.</div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
            {[{l:'Active Agents',v:activeCount,c:'#10B981'},{l:'Activities Logged',v:activityLog.length,c:ACCENT},{l:'Potential Time Saved',v:activeCount*8+'h/wk',c:'#F59E0B'}].map((s:any)=>(
              <div key={s.l} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:20,textAlign:'center' as const}}>
                <div style={{fontSize:26,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            {AGENTS.map(agent=>(
              <div key={agent.key} style={{background:'#fff',borderRadius:14,border:'1px solid '+(activeAgents[agent.key]?ACCENT:'#E4E7EC'),padding:20,cursor:'pointer'}} onClick={()=>{setSelectedAgent(agent.key);setSection('Agents')}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>{agent.icon}</div>
                  <div onClick={(e)=>{e.stopPropagation();toggleAgent(agent.key)}} style={{width:36,height:20,borderRadius:10,background:activeAgents[agent.key]?'#10B981':'#E4E7EC',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:activeAgents[agent.key]?18:2,transition:'left 0.2s',boxShadow:'0 1px 2px rgba(0,0,0,0.2)'}}></div>
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>{agent.name}</div>
                <div style={{fontSize:12,color:'#667085',lineHeight:1.5}}>{agent.desc}</div>
                <div style={{marginTop:10,fontSize:11,fontWeight:600,color:activeAgents[agent.key]?'#10B981':'#98A2B3'}}>{activeAgents[agent.key]?'● Active':'○ Inactive'}</div>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Agents'&&(<div>
          <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto'}}>
            {AGENTS.map(a=>(
              <button key={a.key} onClick={()=>setSelectedAgent(a.key)} style={{padding:'8px 16px',borderRadius:20,border:'1px solid '+(selectedAgent===a.key?ACCENT:'#E4E7EC'),background:selectedAgent===a.key?ACCENT+'10':'#fff',fontSize:13,fontWeight:selectedAgent===a.key?600:400,color:selectedAgent===a.key?ACCENT:'#667085',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}><span style={{display:'inline-flex',verticalAlign:'middle',transform:'scale(0.6)',marginRight:-4}}>{a.icon}</span> {a.name}</button>
            ))}
          </div>
          {AGENTS.filter(a=>a.key===(selectedAgent||AGENTS[0].key)).map(agent=>(
            <div key={agent.key}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:28,marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                  <div style={{display:'flex',gap:14,alignItems:'center'}}>
                    <div style={{transform:'scale(1.4)'}}>{agent.icon}</div>
                    <div>
                      <div style={{fontSize:18,fontWeight:700,color:'#101828'}}>{agent.name}</div>
                      <div style={{fontSize:13,color:activeAgents[agent.key]?'#10B981':'#98A2B3',fontWeight:600,marginTop:2}}>{activeAgents[agent.key]?'● Active':'○ Inactive'}</div>
                    </div>
                  </div>
                  <button onClick={()=>toggleAgent(agent.key)} style={{padding:'9px 20px',borderRadius:8,border:'none',background:activeAgents[agent.key]?'#FEE2E2':ACCENT,color:activeAgents[agent.key]?'#EF4444':'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{activeAgents[agent.key]?'Deactivate':'Activate Agent'}</button>
                </div>
                <p style={{fontSize:14,color:'#667085',lineHeight:1.6,marginBottom:20}}>{agent.desc}</p>
                <div style={{fontSize:12,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:12}}>Capabilities</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {agent.capabilities.map(c=>(
                    <div key={c} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13,color:'#344054'}}>
                      <span style={{color:'#10B981',flexShrink:0}}>✓</span>{c}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:12}}>Recent Activity</div>
                {activityLog.filter((l:any)=>l.agent===agent.key).length===0?(
                  <div style={{color:'#98A2B3',fontSize:13,textAlign:'center' as const,padding:30}}>No activity logged for this agent yet.</div>
                ):activityLog.filter((l:any)=>l.agent===agent.key).slice(0,5).map((l:any)=>(
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}>
                    <span style={{color:'#101828'}}>{l.action}</span>
                    <span style={{color:'#98A2B3',fontSize:12}}>{l.createdAt}</span>
                  </div>
                ))}
              </div>
              {agent.key==='guest' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Simulates a guest message and gets a real AI-drafted reply using that property's WiFi, house rules, and check-in/out info (edit these under Vacation Rentals → Properties).</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={guestTest.property_id} onChange={e=>setGuestTest({...guestTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Guest Name</label><input value={guestTest.guest_name} onChange={e=>setGuestTest({...guestTest,guest_name:e.target.value})} placeholder="e.g. Sarah" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Guest Message</label><textarea value={guestTest.message} onChange={e=>setGuestTest({...guestTest,message:e.target.value})} rows={2} placeholder="e.g. What's the WiFi password?" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testGuestAgent} disabled={testing||!guestTest.property_id||!guestTest.message.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!guestTest.property_id||!guestTest.message.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {guestReply && (
                    <div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft Reply</div>
                      <div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{guestReply}</div>
                    </div>
                  )}
                </div>
              )}
              {agent.key==='maintenance' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Drafts a contractor assignment message, using your Team list to suggest who's best suited.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={maintTest.property_id} onChange={e=>setMaintTest({...maintTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Priority</label><select value={maintTest.priority} onChange={e=>setMaintTest({...maintTest,priority:e.target.value})} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Issue Title</label><input value={maintTest.title} onChange={e=>setMaintTest({...maintTest,title:e.target.value})} placeholder="e.g. AC not cooling" style={inp}/></div>
                  <div style={{marginBottom:12}}><label style={lbl}>Description</label><textarea value={maintTest.description} onChange={e=>setMaintTest({...maintTest,description:e.target.value})} rows={2} placeholder="Extra detail (optional)" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testMaintenanceAgent} disabled={testing||!maintTest.property_id||!maintTest.title.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!maintTest.property_id||!maintTest.title.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {maintReply && (<div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{maintReply}</div></div>)}
                </div>
              )}
              {agent.key==='cleaning' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Drafts a turnover-cleaning checklist for the cleaner, based on the property's house rules and guest capacity.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={cleanTest.property_id} onChange={e=>setCleanTest({...cleanTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Turnover Date</label><input type="date" value={cleanTest.scheduled_date} onChange={e=>setCleanTest({...cleanTest,scheduled_date:e.target.value})} style={inp}/></div>
                  </div>
                  <button onClick={testCleaningAgent} disabled={testing||!cleanTest.property_id||!cleanTest.scheduled_date} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!cleanTest.property_id||!cleanTest.scheduled_date?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {cleanReply && (<div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{cleanReply}</div></div>)}
                </div>
              )}
              {agent.key==='revenue' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Reasons from the property's own last-90-day occupancy and realized rates (no external competitor data source is connected yet) to suggest a rate change.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Property</label><select value={revTest.property_id} onChange={e=>setRevTest({...revTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <button onClick={testRevenueAgent} disabled={testing||!revTest.property_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!revTest.property_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {revReply && (<div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>Occupancy {revReply.occupancyPct}% · Avg realized rate £{revReply.avgNightly}</div><div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{revReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='owner' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Drafts a monthly report email using this owner's real last-30-day bookings and their split percentage.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Owner</label><select value={ownerTest.owner_id} onChange={e=>setOwnerTest({...ownerTest,owner_id:e.target.value})} style={inp}><option value="">Select…</option>{owners.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                  <button onClick={testOwnerAgent} disabled={testing||!ownerTest.owner_id} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!ownerTest.owner_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {ownerReply && (<div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>Revenue £{ownerReply.revenue?.toLocaleString()} · Owner Share £{ownerReply.ownerShare?.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{ownerReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='leads' && (
                <div style={{background:'#fff',borderRadius:14,border:'1px solid '+ACCENT,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:14}}>Scores a landlord/owner inquiry and drafts a qualifying reply. Saves the lead to CRM Contacts if a name is given.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Lead Name</label><input value={leadTest.lead_name} onChange={e=>setLeadTest({...leadTest,lead_name:e.target.value})} placeholder="e.g. Michael Chen" style={inp}/></div>
                    <div><label style={lbl}>Source</label><input value={leadTest.source} onChange={e=>setLeadTest({...leadTest,source:e.target.value})} placeholder="e.g. Instagram DM" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Inquiry</label><textarea value={leadTest.inquiry} onChange={e=>setLeadTest({...leadTest,inquiry:e.target.value})} rows={3} placeholder="Paste the lead's message…" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testLeadAgent} disabled={testing||!leadTest.inquiry.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:testing||!leadTest.inquiry.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {leadReply && (<div style={{marginTop:16,padding:16,borderRadius:10,background:'#F9FAFB',border:'1px solid #E4E7EC'}}><div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:8}}>AI Analysis</div><div style={{fontSize:14,color:'#101828',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{leadReply}</div></div>)}
                </div>
              )}
            </div>
          ))}
        </div>)}

        {section==='Activity Log'&&(<div>
          {showLogForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Log Activity</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Agent</label><select value={logForm.agent} onChange={e=>setLogForm({...logForm,agent:e.target.value})} style={inp}>{AGENTS.map(a=><option key={a.key} value={a.key}>{a.name}</option>)}</select></div>
              <div><label style={lbl}>Property</label><input value={logForm.property} onChange={e=>setLogForm({...logForm,property:e.target.value})} placeholder="Property name" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Action *</label><input value={logForm.action} onChange={e=>setLogForm({...logForm,action:e.target.value})} placeholder="e.g. Sent check-in instructions to guest" style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Notes</label><textarea value={logForm.notes} onChange={e=>setLogForm({...logForm,notes:e.target.value})} rows={2} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={async ()=>{
                if(!logForm.action || !userId) return
                await supabase.from('ai_activity_log').insert({ user_id: userId, agent_key: logForm.agent, action: logForm.action, property_name: logForm.property || null, notes: logForm.notes || null })
                await loadActivityLog(userId)
                setLogForm({agent:'guest',action:'',property:'',notes:''});setShowLogForm(false)
              }} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
              <button onClick={()=>setShowLogForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'160px 1fr 140px 180px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Agent</span><span>Action</span><span>Property</span><span>Date</span><span></span>
            </div>
            {activityLog.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>🤖</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No activity logged yet</div><div style={{fontSize:13}}>Activate an agent and log its first action.</div></div>):activityLog.map((l:any)=>{
              const agent = AGENTS.find(a=>a.key===l.agent)
              return(
                <div key={l.id} style={{display:'grid',gridTemplateColumns:'160px 1fr 140px 180px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:ACCENT}}><span style={{display:'inline-flex',verticalAlign:'middle',transform:'scale(0.55)',marginRight:-6}}>{agent?.icon}</span> {agent?.name}</span>
                  <span style={{fontSize:13,color:'#101828'}}>{l.action}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{l.property||'—'}</span>
                  <span style={{fontSize:11,color:'#98A2B3'}}>{l.createdAt}</span>
                  <button onClick={async ()=>{ await supabase.from('ai_activity_log').delete().eq('id', l.id); setActivityLog(activityLog.filter((x:any)=>x.id!==l.id)) }} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                </div>
              )
            })}
          </div>
        </div>)}

      </div>
    </div>
  )
}