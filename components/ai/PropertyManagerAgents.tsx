'use client'
// AI Property Manager agents (guest replies, maintenance, cleaning, revenue,
// owner reports, lead qualification). Shown as a tab inside the AI page
// (Staff Centre → AI Receptionist); /ai-manager redirects there.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { C, Stat, Pill, Group, Row, Empty, btn, input as inp, label as lbl } from '../crm/Page'
const ACCENT = C.goldDark

const AGENTS = [
  {
    key: 'guest',
    name: 'AI Guest Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    desc: 'Answers guest questions 24/7, sends check-in/check-out instructions, Wi-Fi details, house rules, and handles common complaints.',
    capabilities: ['Answer guest questions 24/7','Send check-in/check-out instructions','Provide Wi-Fi details and house rules','Handle common complaints and requests','Respond to Airbnb, Booking.com & Vrbo enquiries','Sync calendars across platforms'],
  },
  {
    key: 'maintenance',
    name: 'AI Maintenance Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    desc: 'Logs maintenance issues, assigns jobs to contractors, tracks repairs and follows up until work is completed.',
    capabilities: ['Log maintenance issues automatically','Assign jobs to contractors','Track repair progress','Follow up until work is completed','Notify owners of urgent issues'],
  },
  {
    key: 'cleaning',
    name: 'AI Cleaning Coordinator',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M9 9l-6 6a2 2 0 002.83 2.83L12 11.8M14 4l6 6-3.5 3.5L10 7l4-3z"/></svg>,
    desc: 'Automatically schedules cleaners after bookings, notifies them of turnovers, tracks completion and generates reports.',
    capabilities: ['Automatically schedule cleaners after bookings','Notify cleaners of turnovers','Track cleaning completion','Generate cleaning reports','Flag missed or late cleans'],
  },
  {
    key: 'revenue',
    name: 'AI Revenue Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    desc: 'Adjusts nightly rates automatically, monitors competitor pricing, increases rates during high demand and fills calendar gaps.',
    capabilities: ['Adjust nightly rates automatically','Monitor competitor pricing','Increase rates during high demand periods','Fill calendar gaps with discounts','Suggest minimum stay rules'],
  },
  {
    key: 'owner',
    name: 'AI Owner Relations Manager',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    desc: 'Generates monthly income reports, occupancy reports, expense tracking and profit & loss statements for owners.',
    capabilities: ['Monthly income reports','Occupancy reports','Expense tracking','Profit and loss statements','Proactive owner updates'],
  },
  {
    key: 'leads',
    name: 'AI Lead Qualification Agent',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8862E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    desc: 'Finds landlord leads, qualifies property owners, books appointments automatically and follows up with prospects.',
    capabilities: ['Find landlord leads','Qualify property owners','Book appointments automatically','Follow up with prospects','Score lead quality'],
  },
]

export default function PropertyManagerAgents() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [section, setSection] = useState<'Agents'|'Activity log'>('Agents')
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
      const accountId = await getAccountId(user)
      setUserId(accountId)
      const [agentsRes, propsRes, ownersRes] = await Promise.all([
        supabase.from('ai_agents').select('*').eq('user_id', accountId),
        supabase.from('properties').select('*').eq('user_id', accountId).order('created_at', { ascending: false }),
        supabase.from('owner_profiles').select('*').eq('business_id', accountId).order('created_at', { ascending: false }),
      ])
      if (agentsRes.data?.length) {
        const loaded: Record<string,boolean> = {guest:false,maintenance:false,cleaning:false,revenue:false,owner:false,leads:false}
        agentsRes.data.forEach((a:any) => { loaded[a.agent_key] = a.enabled })
        setActiveAgents(loaded)
      }
      setProperties(propsRes.data ?? [])
      setOwners(ownersRes.data ?? [])
      await loadActivityLog(accountId)
      setLoading(false)
    })
  },[])
  if(loading) return <div style={{padding:40,color:C.faint,fontSize:14}}>Loading…</div>

  const toggleAgent = async (key:string) => {
    const next = !activeAgents[key]
    setActiveAgents({...activeAgents,[key]:next})
    if (userId) {
      const {error} = await supabase.from('ai_agents').upsert({ user_id: userId, agent_key: key, enabled: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,agent_key' })
      if (error) { alert(error.message); setActiveAgents({...activeAgents,[key]:!next}); }
    }
  }
  const activeCount = Object.values(activeAgents).filter(Boolean).length

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function testGuestAgent() {
    if (!guestTest.property_id || !guestTest.message.trim() || !userId) return
    setTesting(true)
    setGuestReply('')
    const res = await fetch('/api/ai/guest-reply', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(guestTest),
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
    const res = await fetch('/api/ai/maintenance-reply', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(maintTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setMaintReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testCleaningAgent() {
    if (!cleanTest.property_id || !cleanTest.scheduled_date || !userId) return
    setTesting(true); setCleanReply('')
    const res = await fetch('/api/ai/cleaning-reply', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(cleanTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a reply'); setTesting(false); return }
    setCleanReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }

  async function testRevenueAgent() {
    if (!revTest.property_id || !userId) return
    setTesting(true); setRevReply(null)
    const res = await fetch('/api/ai/revenue-suggest', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(revTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not get a suggestion'); setTesting(false); return }
    setRevReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testOwnerAgent() {
    if (!ownerTest.owner_id || !userId) return
    setTesting(true); setOwnerReply(null)
    const res = await fetch('/api/ai/owner-report', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(ownerTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not draft a report'); setTesting(false); return }
    setOwnerReply(result); await loadActivityLog(userId); setTesting(false)
  }

  async function testLeadAgent() {
    if (!leadTest.inquiry.trim() || !userId) return
    setTesting(true); setLeadReply('')
    const res = await fetch('/api/ai/lead-qualify', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(leadTest) })
    const result = await res.json()
    if (!res.ok) { alert(result.error || 'Could not qualify this lead'); setTesting(false); return }
    setLeadReply(result.reply); await loadActivityLog(userId); setTesting(false)
  }


  const toggle = (key: string) => (
    <span onClick={e => { e.stopPropagation(); toggleAgent(key) }} title={activeAgents[key] ? 'Switch off' : 'Switch on'} style={{ width: 36, height: 20, borderRadius: 10, background: activeAgents[key] ? C.green : C.border, position: 'relative', cursor: 'pointer', transition: 'background .2s', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: activeAgents[key] ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </span>
  )
  const current = AGENTS.find(a => a.key === selectedAgent)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Agents switched on" value={`${activeCount} of ${AGENTS.length}`} />
        <Stat label="Activities logged" value={activityLog.length} />
        <Stat label="Estimated time saved" value={activeCount * 8 + 'h/wk'} highlight />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {(['Agents', 'Activity log'] as const).map(s => <button key={s} onClick={() => { setSection(s); setSelectedAgent(null) }} style={btn(section === s ? 'gold' : 'ghost', true)}>{s}</button>)}
        <div style={{ flex: 1 }} />
        {section === 'Activity log' && <button onClick={() => setShowLogForm(true)} style={btn('ghost', true)}>+ Log activity</button>}
      </div>

      {section === 'Agents' && !current && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {AGENTS.map(agent => (
            <div key={agent.key} onClick={() => setSelectedAgent(agent.key)} style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + (activeAgents[agent.key] ? C.gold : C.row), padding: 18, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>{agent.icon}{toggle(agent.key)}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{agent.name}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{agent.desc}</div>
              <div style={{ marginTop: 10 }}><Pill width={0} color={activeAgents[agent.key] ? C.green : C.grey}>{activeAgents[agent.key] ? 'On' : 'Off'}</Pill></div>
            </div>
          ))}
        </div>
      )}

      {section === 'Agents' && current && [current].map(agent => (
        <div key={agent.key}>
          <button onClick={() => setSelectedAgent(null)} style={{ ...btn('ghost', true), marginBottom: 12 }}>← All agents</button>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{agent.icon}<div><div style={{ fontSize: 18, fontWeight: 600 }}>{agent.name}</div><div style={{ marginTop: 4 }}><Pill width={0} color={activeAgents[agent.key] ? C.green : C.grey}>{activeAgents[agent.key] ? 'On' : 'Off'}</Pill></div></div></div>
              <button onClick={() => toggleAgent(agent.key)} style={btn(activeAgents[agent.key] ? 'danger' : 'gold')}>{activeAgents[agent.key] ? 'Switch off' : 'Switch on'}</button>
            </div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 16px' }}>{agent.desc}</p>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>What it does</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
              {agent.capabilities.map(c => <div key={c} style={{ display: 'flex', gap: 8, fontSize: 13 }}><span style={{ color: C.green }}>✓</span>{c}</div>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent activity</div>
            {activityLog.filter((l: any) => l.agent === agent.key).length === 0 ? <div style={{ color: C.faint, fontSize: 13, padding: '12px 0' }}>Nothing logged for this agent yet.</div> :
              activityLog.filter((l: any) => l.agent === agent.key).slice(0, 5).map((l: any) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + C.row, fontSize: 13 }}><span>{l.action}</span><span style={{ color: C.faint, fontSize: 12 }}>{l.createdAt}</span></div>
              ))}
          </div>
              {agent.key==='guest' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Simulates a guest message and gets a real AI-drafted reply using that property's WiFi, house rules, and check-in/out info (edit these under Vacation Rentals → Properties).</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={guestTest.property_id} onChange={e=>setGuestTest({...guestTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Guest Name</label><input value={guestTest.guest_name} onChange={e=>setGuestTest({...guestTest,guest_name:e.target.value})} placeholder="e.g. Sarah" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Guest Message</label><textarea value={guestTest.message} onChange={e=>setGuestTest({...guestTest,message:e.target.value})} rows={2} placeholder="e.g. What's the WiFi password?" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testGuestAgent} disabled={testing||!guestTest.property_id||!guestTest.message.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!guestTest.property_id||!guestTest.message.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {guestReply && (
                    <div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft Reply</div>
                      <div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{guestReply}</div>
                    </div>
                  )}
                </div>
              )}
              {agent.key==='maintenance' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a contractor assignment message, using your Team list to suggest who's best suited.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={maintTest.property_id} onChange={e=>setMaintTest({...maintTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Priority</label><select value={maintTest.priority} onChange={e=>setMaintTest({...maintTest,priority:e.target.value})} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Issue Title</label><input value={maintTest.title} onChange={e=>setMaintTest({...maintTest,title:e.target.value})} placeholder="e.g. AC not cooling" style={inp}/></div>
                  <div style={{marginBottom:12}}><label style={lbl}>Description</label><textarea value={maintTest.description} onChange={e=>setMaintTest({...maintTest,description:e.target.value})} rows={2} placeholder="Extra detail (optional)" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testMaintenanceAgent} disabled={testing||!maintTest.property_id||!maintTest.title.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!maintTest.property_id||!maintTest.title.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {maintReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{maintReply}</div></div>)}
                </div>
              )}
              {agent.key==='cleaning' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a turnover-cleaning checklist for the cleaner, based on the property's house rules and guest capacity.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Property</label><select value={cleanTest.property_id} onChange={e=>setCleanTest({...cleanTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label style={lbl}>Turnover Date</label><input type="date" value={cleanTest.scheduled_date} onChange={e=>setCleanTest({...cleanTest,scheduled_date:e.target.value})} style={inp}/></div>
                  </div>
                  <button onClick={testCleaningAgent} disabled={testing||!cleanTest.property_id||!cleanTest.scheduled_date} style={{...btn('gold'),fontSize:13,opacity:testing||!cleanTest.property_id||!cleanTest.scheduled_date?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {cleanReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Draft</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{cleanReply}</div></div>)}
                </div>
              )}
              {agent.key==='revenue' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Reasons from the property's own last-90-day occupancy and realized rates (no external competitor data source is connected yet) to suggest a rate change.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Property</label><select value={revTest.property_id} onChange={e=>setRevTest({...revTest,property_id:e.target.value})} style={inp}><option value="">Select…</option>{properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <button onClick={testRevenueAgent} disabled={testing||!revTest.property_id} style={{...btn('gold'),fontSize:13,opacity:testing||!revTest.property_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {revReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>Occupancy {revReply.occupancyPct}% · Avg realized rate £{revReply.avgNightly}</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{revReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='owner' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Drafts a monthly report email using this owner's real last-30-day bookings and their split percentage.</div>
                  <div style={{marginBottom:12}}><label style={lbl}>Owner</label><select value={ownerTest.owner_id} onChange={e=>setOwnerTest({...ownerTest,owner_id:e.target.value})} style={inp}><option value="">Select…</option>{owners.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                  <button onClick={testOwnerAgent} disabled={testing||!ownerTest.owner_id} style={{...btn('gold'),fontSize:13,opacity:testing||!ownerTest.owner_id?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {ownerReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>Revenue £{ownerReply.revenue?.toLocaleString()} · Owner Share £{ownerReply.ownerShare?.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{ownerReply.reply}</div></div>)}
                </div>
              )}
              {agent.key==='leads' && (
                <div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:20,marginTop:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#323338',marginBottom:4}}>Try it live</div>
                  <div style={{fontSize:12,color:'#676879',marginBottom:14}}>Scores a landlord/owner inquiry and drafts a qualifying reply. Saves the lead to CRM Contacts if a name is given.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Lead Name</label><input value={leadTest.lead_name} onChange={e=>setLeadTest({...leadTest,lead_name:e.target.value})} placeholder="e.g. Michael Chen" style={inp}/></div>
                    <div><label style={lbl}>Source</label><input value={leadTest.source} onChange={e=>setLeadTest({...leadTest,source:e.target.value})} placeholder="e.g. Instagram DM" style={inp}/></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={lbl}>Inquiry</label><textarea value={leadTest.inquiry} onChange={e=>setLeadTest({...leadTest,inquiry:e.target.value})} rows={3} placeholder="Paste the lead's message…" style={{...inp,resize:'vertical' as const}}/></div>
                  <button onClick={testLeadAgent} disabled={testing||!leadTest.inquiry.trim()} style={{...btn('gold'),fontSize:13,opacity:testing||!leadTest.inquiry.trim()?0.6:1}}>{testing?'Thinking…':'Get AI Reply'}</button>
                  {leadReply && (<div style={{marginTop:16,padding:16,borderRadius:6,background:'#FAFBFC',border:'1px solid #E6E9EF'}}><div style={{fontSize:11,fontWeight:600,color:'#676879',textTransform:'uppercase' as const,marginBottom:8}}>AI Analysis</div><div style={{fontSize:14,color:'#323338',whiteSpace:'pre-wrap' as const,lineHeight:1.6}}>{leadReply}</div></div>)}
                </div>
              )}
        </div>
      ))}

      {section === 'Activity log' && (
        <div>
          {showLogForm&&(<div style={{background:'#fff',borderRadius:8,border:'1px solid '+C.creamLine,padding:24,marginBottom:20}}>
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
                const {error} = await supabase.from('ai_activity_log').insert({ user_id: userId, agent_key: logForm.agent, action: logForm.action, property_name: logForm.property || null, notes: logForm.notes || null })
                if (error) { alert(error.message); return }
                await loadActivityLog(userId)
                setLogForm({agent:'guest',action:'',property:'',notes:''});setShowLogForm(false)
              }} style={{...btn('gold'),fontSize:13}}>Save</button>
              <button onClick={()=>setShowLogForm(false)} style={{...btn('ghost'),fontSize:13}}>Cancel</button>
            </div>
          </div>)}
          {activityLog.length === 0 ? <Empty>No activity logged yet. Switch an agent on and try it.</Empty> : (
            <Group title="Activity" color={C.gold} count={activityLog.length} cols={[{ k: 'a', l: 'Agent', w: 220 }, { k: 'x', l: 'What it did', w: 'minmax(240px,2fr)' }, { k: 'p', l: 'Property', w: 170 }, { k: 'd', l: 'When', w: 170 }, { k: 'z', l: '', w: 56 }]}>
              {activityLog.map((l: any) => {
                const agent = AGENTS.find(a => a.key === l.agent)
                return <Row key={l.id} cells={[
                  <span key="a" style={{ fontSize: 13, fontWeight: 500 }}>{agent?.name ?? l.agent}</span>,
                  <span key="x" style={{ fontSize: 13, width: '100%' }}>{l.action}</span>,
                  <span key="p" style={{ fontSize: 13, color: C.muted }}>{l.property || '—'}</span>,
                  <span key="d" style={{ fontSize: 12, color: C.muted }}>{l.createdAt}</span>,
                  <button key="z" title="Delete" onClick={async () => { const { error } = await supabase.from('ai_activity_log').delete().eq('id', l.id); if (error) { alert(error.message); return } setActivityLog(activityLog.filter((x: any) => x.id !== l.id)) }} style={{ ...btn('danger', true), padding: '4px 8px' }}>×</button>,
                ]} />
              })}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}
