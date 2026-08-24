'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useRole } from '@/lib/useRole'
const ACCENT = '#3B4AFF'
const NAV = [
  {group:'ACCOUNT',items:[
    {s:'My Account',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
    {s:'Team Management',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
    {s:'Referrals',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>},
    {s:'Billing & Subscriptions',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>},
    {s:'System Messages',i:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>},
  ]}
]

const ROLES = ['Admin','Vacation Rental Team','Property Management Team','Estate Agency Team','Development Team','Cleaning Team','Maintenance Team','Viewer']

function SettingsInner() {
  const searchParams = useSearchParams()
  const billingRequired = searchParams.get('billing') === 'required'
  const { role: myRole, hasSettings, loading: roleLoading } = useRole()
  const [section, setSection] = useState(billingRequired ? 'Billing & Subscriptions' : 'My Account')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [allProperties, setAllProperties] = useState<any[]>([])
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [showPropertyPicker, setShowPropertyPicker] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string|null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Cleaning Team')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [addMode, setAddMode] = useState<'invite'|'create'>('invite')
  const [staffPassword, setStaffPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [plan, setPlan] = useState('Professional')
  const [messages, setMessages] = useState<any[]>([])
  const [connectAccountId, setConnectAccountId] = useState<string|null>(null)
  const [connectOnboarded, setConnectOnboarded] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)

  useEffect(() => {
    if(roleLoading) return
    if(!hasSettings){ window.location.href='/'; return }
  }, [roleLoading, hasSettings])

  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      setUser(user)
      const {data:sub} = await supabase.from('subscriptions').select('*').eq('user_id',user.id).single()
      if(sub){
        setApiKey((sub as any).api_key??'')
        setPlan((sub as any).plan??'Professional')
        setConnectAccountId((sub as any).stripe_connect_account_id??null)
        setConnectOnboarded(!!(sub as any).stripe_connect_onboarded)
      }
      const {data:msgs} = await supabase.from('system_messages').select('*').eq('published',true).order('created_at',{ascending:false})
      setMessages(msgs??[])
      const {data:teamData} = await supabase.from('team_members').select('*').eq('user_id',user.id).order('name')
      setTeam(teamData??[])
      const [strP, pmP, eaP, devP] = await Promise.all([
        supabase.from('properties').select('id,name').eq('user_id',user.id),
        supabase.from('pm_properties').select('id,name').eq('user_id',user.id),
        supabase.from('estate_properties').select('id,name').eq('user_id',user.id),
        supabase.from('dev_projects').select('id,name').eq('user_id',user.id),
      ])
      setAllProperties([
        ...(strP.data??[]).map((p:any)=>({...p,module:'Vacation Rentals'})),
        ...(pmP.data??[]).map((p:any)=>({...p,module:'Property Management'})),
        ...(eaP.data??[]).map((p:any)=>({...p,module:'Estate Agency'})),
        ...(devP.data??[]).map((p:any)=>({...p,module:'Developments'})),
      ])
      setLoading(false)
    })
  },[])

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function connectStripe() {
    setConnectingStripe(true)
    try {
      const res = await fetch('/api/stripe-connect/onboard', { method: 'POST', headers: await authHeaders() })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error(`Server returned an unexpected response (status ${res.status}). This usually means Stripe Connect isn't enabled on the account yet — check the server logs.`) }
      if (!res.ok) throw new Error(data.error || 'Could not start Stripe onboarding.')
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message || 'Could not start Stripe onboarding.')
    } finally {
      setConnectingStripe(false)
    }
  }

  const copyKey = () => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif",display:'flex'}}>
      <div style={{width:210,background:'#fff',borderRight:'1px solid #F2F4F7',display:'flex',flexDirection:'column',paddingTop:16,flexShrink:0,minHeight:'100vh'}}>
        <div style={{padding:'0 16px 14px',borderBottom:'1px solid #F2F4F7'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Opero</div>
          <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>Settings</div>
        </div>
        <nav style={{flex:1,padding:'8px 10px'}}>
          {NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 10px 4px'}}>{group.group}</div>
              {group.items.map(({s,i})=>{
                const locked = billingRequired && s!=='Billing & Subscriptions'
                return (
                <button key={s} onClick={()=>{if(!locked)setSection(s)}} disabled={locked} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:7,border:'none',background:section===s?ACCENT+'18':'transparent',color:locked?'#D0D5DD':section===s?ACCENT:'#344054',fontSize:13,fontWeight:section===s?600:400,cursor:locked?'not-allowed':'pointer',fontFamily:'inherit',textAlign:'left',marginBottom:1}}>
                  <span style={{display:'flex',alignItems:'center'}}>{i}</span>{s}
                </button>
                )
              })}
            </div>
          ))}
        </nav>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{fontSize:17,fontWeight:600,margin:0,color:'#101828'}}>{section}</h1>
        </div>
        <div style={{flex:1,padding:24,overflowY:'auto'}}>

          {billingRequired && (
            <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>⚠️</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#92400E'}}>Access restricted — payment required</div>
                <div style={{fontSize:13,color:'#B45309',marginTop:2}}>Your trial has ended and we couldn't process payment. Update your billing details below to restore full access.</div>
              </div>
            </div>
          )}

          {section==='My Account'&&(<div style={{maxWidth:600}}>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16,margin:'0 0 16px'}}>Profile</h3>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:ACCENT}}>{user?.email?.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828'}}>{user?.email?.split('@')[0]}</div>
                  <div style={{fontSize:13,color:'#667085'}}>{user?.email}</div>
                  <div style={{fontSize:12,color:ACCENT,fontWeight:500,marginTop:2,textTransform:'capitalize'}}>{plan} Plan</div>
                </div>
              </div>
              <div style={{display:'grid',gap:12}}>
                {[{l:'Full name',v:user?.email?.split('@')[0]},{l:'Email address',v:user?.email},{l:'Role',v:'Admin'}].map(f=>(
                  <div key={f.l}>
                    <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>{f.l}</div>
                    <input defaultValue={f.v} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#101828'}}/>
                  </div>
                ))}
              </div>
              <button style={{marginTop:16,padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save changes</button>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 4px'}}>API Key</h3>
              <div style={{fontSize:13,color:'#667085',marginBottom:16}}>Use this key to connect Opero with external tools and websites. Keep it private — anyone with this key can add contacts to your account.</div>
              <div style={{display:'flex',gap:8,marginBottom:20}}>
                <input value={apiKey} readOnly style={{flex:1,padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:12,fontFamily:'monospace',outline:'none',background:'#F9FAFB',color:'#344054'}}/>
                <button onClick={copyKey} style={{padding:'9px 16px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054',whiteSpace:'nowrap'}}>{copied?'✓ Copied!':'Copy'}</button>
              </div>
              <div style={{background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC',padding:20}}>
                <div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:12}}>How to use</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[{n:'1',t:'Copy your API key above'},{n:'2',t:'In your website form script, add',code:"api_key: 'YOUR_KEY'"},{n:'3',t:'Enquiries from your website will appear in your STR and PM CRM automatically'},{n:'4',t:'For the source field, pass the form name e.g.',code:"source: 'Contact Form'"}].map(s=>(
                    <div key={s.n} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <div style={{width:20,height:20,borderRadius:'50%',background:ACCENT,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{s.n}</div>
                      <div style={{fontSize:13,color:'#344054',lineHeight:1.5}}>
                        {s.t}{s.code&&<><br/><code style={{background:'#E4E7EC',padding:'2px 6px',borderRadius:4,fontSize:12,fontFamily:'monospace',color:ACCENT}}>{s.code}</code></>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:16,background:'#fff',borderRadius:6,border:'1px solid #E4E7EC',padding:14}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>Example fetch call</div>
                  <pre style={{fontSize:11,color:'#344054',fontFamily:'monospace',margin:0,lineHeight:1.6,overflow:'auto'}}>{`fetch('https://helloopero.com/api/crm-enquiry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Smith',
    email: 'john@example.com',
    module: 'str',  // or 'pm' or 'dev'
    type: 'guest',  // or 'landlord'
    source: 'Contact Form',
    api_key: '${apiKey}'
  })
})`}</pre>
                </div>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 8px'}}>Change password</h3>
              <div style={{display:'grid',gap:12}}>
                {['Current password','New password','Confirm new password'].map(f=>(
                  <div key={f}>
                    <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>{f}</div>
                    <input type="password" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              <button style={{marginTop:16,padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Update password</button>
            </div>
          </div>)}

          {section==='Team Management'&&(<div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:'0 0 4px'}}>Team Management</h2>
                <div style={{fontSize:13,color:'#667085'}}>Add unlimited cleaners and admins. Assign multiple cleaners per property. Everyone gets their own account.</div>
              </div>
              <button onClick={()=>{setEditingMemberId(null);setInviteName('');setInviteEmail('');setInvitePhone('');setInviteRole(ROLES[0]);setAssignedPropertyIds([]);setShowInvite(true)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>+ Invite member</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total members',v:team.length+1,c:ACCENT},{l:'Admins',v:1+team.filter(t=>t.role==='Admin').length,c:'#101828'},{l:'Cleaners',v:team.filter(t=>t.role==='Cleaning Team').length,c:'#10B981'},{l:'Other',v:team.filter(t=>t.role!=='Cleaning Team'&&t.role!=='Admin').length,c:'#F59E0B'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showInvite&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              {!editingMemberId && (
                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  <button onClick={()=>setAddMode('invite')} style={{padding:'6px 14px',borderRadius:20,border:'1px solid '+(addMode==='invite'?ACCENT:'#E4E7EC'),background:addMode==='invite'?ACCENT:'#fff',color:addMode==='invite'?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Send email invite</button>
                  <button onClick={()=>setAddMode('create')} style={{padding:'6px 14px',borderRadius:20,border:'1px solid '+(addMode==='create'?ACCENT:'#E4E7EC'),background:addMode==='create'?ACCENT:'#fff',color:addMode==='create'?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Create account directly</button>
                </div>
              )}
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 4px'}}>{editingMemberId?'Edit team member':addMode==='invite'?'Invite team member':'Create staff account'}</h3>
              <div style={{fontSize:12,color:'#667085',marginBottom:16}}>{editingMemberId?'Update their details, role, and assigned properties.':addMode==='invite'?'Sends a real invite email — they set their own password via the link.':"Sets a password now — no email needed. Share the login details with them yourself (text, WhatsApp, in person)."}</div>
              <div style={{display:'grid',gridTemplateColumns:addMode==='create'&&!editingMemberId?'1fr 1fr 1fr 1fr 160px':'1fr 1fr 1fr 160px',gap:12,marginBottom:16}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Full name</div>
                  <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Jane Smith" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Email address {editingMemberId&&<span style={{color:'#98A2B3',fontWeight:400}}>(can't be changed here)</span>}</div>
                  <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} disabled={!!editingMemberId} placeholder="jane@example.com" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:editingMemberId?'#F9FAFB':'#fff',color:editingMemberId?'#98A2B3':'#101828'}}/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Phone (optional)</div>
                  <input value={invitePhone} onChange={e=>setInvitePhone(e.target.value)} placeholder="+44 7700 900000" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>
                {addMode==='create'&&!editingMemberId&&(
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Password</div>
                    <input value={staffPassword} onChange={e=>setStaffPassword(e.target.value)} type="text" placeholder="min. 6 characters" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                )}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Role</div>
                  <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {allProperties.length>0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Assigned properties</div>
                  <div style={{fontSize:11,color:'#98A2B3',marginBottom:6}}>Leave none checked to give access to all properties. Check specific ones to restrict them to only those.</div>
                  <div style={{border:'1px solid #EAECF0',borderRadius:8,maxHeight:160,overflowY:'auto',padding:6}}>
                    {allProperties.map((p:any)=>(
                      <label key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',fontSize:13,cursor:'pointer',borderRadius:6}}>
                        <input type="checkbox" checked={assignedPropertyIds.includes(p.id)} onChange={()=>setAssignedPropertyIds(prev=>prev.includes(p.id)?prev.filter(id=>id!==p.id):[...prev,p.id])} />
                        {p.name} <span style={{color:'#98A2B3',fontSize:11}}>({p.module})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:8}}>
                {editingMemberId?(
                  <button onClick={async ()=>{
                    if(!inviteName)return
                    setInviting(true)
                    const {error} = await supabase.from('team_members').update({name:inviteName,phone:invitePhone,role:inviteRole,property_ids:assignedPropertyIds}).eq('id',editingMemberId)
                    setInviting(false)
                    if(error){alert(error.message);return}
                    setTeam(team.map(t=>t.id===editingMemberId?{...t,name:inviteName,phone:invitePhone,role:inviteRole,property_ids:assignedPropertyIds}:t))
                    setEditingMemberId(null);setInviteName('');setInviteEmail('');setInvitePhone('');setAssignedPropertyIds([]);setShowInvite(false)
                  }} disabled={inviting} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:inviting?0.6:1}}>{inviting?'Saving…':'Save changes'}</button>
                ):addMode==='invite'?(
                  <button onClick={async ()=>{
                    if(!inviteName||!inviteEmail)return
                    setInviting(true)
                    const res = await fetch('/api/invite',{method:'POST',headers:await authHeaders(),body:JSON.stringify({name:inviteName,email:inviteEmail,role:inviteRole,phone:invitePhone,property_ids:assignedPropertyIds})})
                    const result = await res.json()
                    setInviting(false)
                    if(!res.ok){alert(result.error||'Could not send invite');return}
                    setTeam([...team,result.member]);setInviteName('');setInviteEmail('');setInvitePhone('');setAssignedPropertyIds([]);setShowInvite(false)
                  }} disabled={inviting} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:inviting?0.6:1}}>{inviting?'Sending…':'Send invite'}</button>
                ):(
                  <button onClick={async ()=>{
                    if(!inviteName||!inviteEmail||!staffPassword)return
                    setCreating(true)
                    const res = await fetch('/api/create-staff-account',{method:'POST',headers:await authHeaders(),body:JSON.stringify({name:inviteName,email:inviteEmail,role:inviteRole,phone:invitePhone,password:staffPassword,property_ids:assignedPropertyIds})})
                    const result = await res.json()
                    setCreating(false)
                    if(!res.ok){alert(result.error||'Could not create account');return}
                    setTeam([...team,result.member]);setInviteName('');setInviteEmail('');setInvitePhone('');setStaffPassword('');setAssignedPropertyIds([]);setShowInvite(false)
                    alert(`Account created. Share these details with ${inviteName}:\n\nEmail: ${inviteEmail}\nPassword: ${staffPassword}\nLogin at: helloopero.com/login`)
                  }} disabled={creating} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:creating?0.6:1}}>{creating?'Creating…':'Create account'}</button>
                )}
                <button onClick={()=>{setShowInvite(false);setEditingMemberId(null)}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 140px 120px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span></span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 140px 120px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:ACCENT+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:ACCENT}}>{user?.email?.charAt(0).toUpperCase()}</div>
                  <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{user?.email?.split('@')[0]}</span>
                </div>
                <span style={{fontSize:13,color:'#667085'}}>{user?.email}</span>
                <span style={{fontSize:12,fontWeight:600,color:ACCENT,background:ACCENT+'18',padding:'3px 10px',borderRadius:20,display:'inline-block'}}>{myRole}</span>
                <span style={{fontSize:12,color:'#10B981',fontWeight:500}}>● Active</span>
                <span style={{fontSize:12,color:'#98A2B3'}}>You</span>
              </div>
              {team.map(m=>(
                <div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 140px 120px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'#F2F4F7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#344054'}}>{m.name.charAt(0).toUpperCase()}</div>
                    <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{m.name}</span>
                  </div>
                  <span style={{fontSize:13,color:'#667085'}}>{m.email}</span>
                  <span style={{fontSize:12,fontWeight:600,color:'#344054',background:'#F2F4F7',padding:'3px 10px',borderRadius:20,display:'inline-block'}}>{m.role}</span>
                  <span style={{fontSize:12,color:'#F59E0B',fontWeight:500}}>● {m.status}</span>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <button onClick={()=>{
                      setEditingMemberId(m.id)
                      setInviteName(m.name??'')
                      setInviteEmail(m.email??'')
                      setInvitePhone(m.phone??'')
                      setInviteRole(m.role??ROLES[0])
                      setAssignedPropertyIds(m.property_ids??[])
                      setAddMode('invite')
                      setShowInvite(true)
                    }} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                    <button onClick={async ()=>{await supabase.from('team_members').delete().eq('id',m.id);setTeam(team.filter(t=>t.id!==m.id))}} style={{background:'none',border:'none',color:'#98A2B3',cursor:'pointer',fontSize:18}}>×</button>
                  </div>
                </div>
              ))}
              {team.length===0&&(<div style={{textAlign:'center',padding:40,color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:8}}>👥</div>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>No additional team members yet</div>
                <div style={{fontSize:13}}>Invite cleaners, admins and managers to get started.</div>
              </div>)}
            </div>
          </div>)}

          {section==='Referrals'&&(<div style={{maxWidth:600}}>
            <div style={{background:'linear-gradient(135deg,'+ACCENT+' 0%,#1a1a2e 100%)',borderRadius:12,padding:32,marginBottom:20,color:'#fff'}}>
              <h2 style={{fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Refer & Earn</h2>
              <p style={{fontSize:14,opacity:0.8,margin:'0 0 20px'}}>Earn £100 for every property manager or landlord you refer who signs up to Opero.</p>
              <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:16,display:'flex',alignItems:'center',gap:12}}>
                <input readOnly value={"https://helloopero.com?ref="+user?.email?.split('@')[0].toUpperCase()} style={{flex:1,background:'transparent',border:'none',color:'#fff',fontSize:13,fontFamily:'monospace',outline:'none'}}/>
                <button onClick={()=>navigator.clipboard.writeText("https://helloopero.com?ref="+user?.email?.split('@')[0].toUpperCase())} style={{padding:'7px 14px',borderRadius:6,border:'1px solid rgba(255,255,255,0.4)',background:'transparent',color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Copy link</button>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Your referral stats</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[{l:'Total referrals',v:'0'},{l:'Pending',v:'0'},{l:'Total earned',v:'£0'}].map(s=>(
                  <div key={s.l} style={{textAlign:'center',padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:24,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 12px'}}>How it works</h3>
              {[{n:'1',t:'Share your link',d:'Send your unique referral link to property managers and landlords.'},{n:'2',t:'They sign up',d:'They create an Opero account using your referral link.'},{n:'3',t:'You earn £100',d:'Once they complete their first month, £100 is credited to your account.'}].map(s=>(
                <div key={s.n} style={{display:'flex',gap:12,marginBottom:16}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:ACCENT,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{s.n}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:'#101828',marginBottom:2}}>{s.t}</div><div style={{fontSize:12,color:'#667085'}}>{s.d}</div></div>
                </div>
              ))}
            </div>
          </div>)}

          {section==='Billing & Subscriptions'&&(<div style={{maxWidth:700}}>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 4px'}}>Current plan</h3>
                  <div style={{fontSize:13,color:'#667085'}}>Your subscription details</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:22,fontWeight:700,color:'#101828'}}>{({aipm:'AI Property Manager',invest:'Deal Analyser',str:'Vacation Rentals',pm:'Property Management',dev:'Developments',ea:'Estate Agency',bundle:'All Modules Bundle'} as any)[plan] ?? plan}</div>
                  <div style={{fontSize:12,color:'#667085'}}>Active</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
                {(plan==='bundle'
                  ? [{l:'All modules included',icon:'✅'},{l:'One-time payment',icon:'💳'},{l:'No recurring fees',icon:'⚡'}]
                  : [{l:{aipm:'AI Property Manager',invest:'Deal Analyser',str:'Vacation Rentals',pm:'Property Management',dev:'Developments',ea:'Estate Agency'}[plan] ?? plan,icon:'📦'},{l:'Billed monthly',icon:'🗓️'},{l:'Add more modules anytime',icon:'➕'}]
                ).map(f=>(
                  <div key={f.l} style={{padding:16,background:'#F9FAFB',borderRadius:8,border:'1px solid #E4E7EC',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:18}}>{f.icon}</span>
                    <span style={{fontSize:12,fontWeight:500,color:'#344054'}}>{f.l}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Manage subscription</button>
                <button style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>View invoices</button>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div>
                  <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 4px'}}>Tenant payment setup</h3>
                  <div style={{fontSize:13,color:'#667085'}}>Connect your own Stripe account so rent and utility payments tenants make through their portal go directly to your bank, not Opero's.</div>
                </div>
              </div>
              {connectOnboarded ? (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,background:'#ECFDF5',border:'1px solid #A7F3D0'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#10B981'}}>✓ Connected — tenant payments route to your account</span>
                </div>
              ) : (
                <div>
                  {connectAccountId && <div style={{fontSize:12,color:'#F59E0B',marginBottom:10}}>Setup started but not finished — payments won't work until this is complete.</div>}
                  <button onClick={connectStripe} disabled={connectingStripe} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:connectingStripe?0.6:1}}>{connectingStripe?'Redirecting…':connectAccountId?'Finish Stripe setup':'Connect Stripe account'}</button>
                </div>
              )}
            </div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 4px'}}>Modules</h3>
              <div style={{fontSize:13,color:'#667085',marginBottom:16}}>Opero is priced à la carte — add only the modules you need, or take the full bundle.</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[
                  {key:'aipm',name:'AI Property Manager',price:'£9.99',period:'/mo'},
                  {key:'invest',name:'Deal Analyser',price:'£19',period:'/mo'},
                  {key:'str',name:'Vacation Rentals (STR)',price:'£29',period:'/mo'},
                  {key:'pm',name:'Property Management',price:'£39',period:'/mo'},
                  {key:'dev',name:'Developments',price:'£49',period:'/mo'},
                  {key:'ea',name:'Estate Agency',price:'£59',period:'/mo'},
                ].map(p=>(
                  <div key={p.key} style={{border:'2px solid '+(p.key===plan?ACCENT:'#E4E7EC'),borderRadius:10,padding:20,background:p.key===plan?ACCENT+'08':'#fff'}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:22,fontWeight:700,color:ACCENT,marginBottom:12}}>{p.price}<span style={{fontSize:12,color:'#667085',fontWeight:400}}>{p.period}</span></div>
                    <button onClick={async ()=>{
                      const res = await fetch('/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:p.key})})
                      const result = await res.json()
                      if(result.url) window.location.href = result.url
                      else alert(result.error || 'Could not start checkout')
                    }} style={{width:'100%',marginTop:12,padding:'8px',borderRadius:8,border:'none',background:p.key===plan?ACCENT:'#F2F4F7',color:p.key===plan?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{p.key===plan?'Current plan':'Add module'}</button>
                  </div>
                ))}
                <div style={{border:'2px solid '+(plan==='bundle'?ACCENT:'#C9A84C'),borderRadius:10,padding:20,background:plan==='bundle'?ACCENT+'08':'#FBF4E6',gridColumn:'span 3'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:4}}>All Modules Bundle</div>
                      <div style={{fontSize:12,color:'#667085'}}>Every module above, one-time payment — no recurring per-module fees.</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:16}}>
                      <div style={{fontSize:22,fontWeight:700,color:'#C9A84C'}}>£175.50</div>
                      <button onClick={async ()=>{
                        const res = await fetch('/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:'bundle'})})
                        const result = await res.json()
                        if(result.url) window.location.href = result.url
                        else alert(result.error || 'Could not start checkout')
                      }} style={{padding:'10px 20px',borderRadius:8,border:'none',background:plan==='bundle'?ACCENT:'#C9A84C',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{plan==='bundle'?'Current plan':'Get the bundle'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>)}

          {section==='System Messages'&&(<div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:700,color:'#101828',margin:'0 0 4px'}}>System Messages</h2>
                <div style={{fontSize:13,color:'#667085'}}>Platform updates, new features and announcements from Opero.</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {messages.length===0?(<div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:40,textAlign:'center',color:'#98A2B3'}}><div style={{fontSize:32,marginBottom:8}}>🔔</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>No messages yet</div><div style={{fontSize:13}}>System announcements will appear here.</div></div>):messages.map(msg=>{
                const colors:any = {success:{bg:'#ECFDF5',border:'#6EE7B7',icon:'✅',tag:'#10B981',tagBg:'#ECFDF5'},info:{bg:'#EFF6FF',border:'#93C5FD',icon:'ℹ️',tag:'#3B82F6',tagBg:'#EFF6FF'},update:{bg:'#EEF0FF',border:'#A5B4FC',icon:'🚀',tag:'#6366F1',tagBg:'#EEF0FF'},warning:{bg:'#FFFBEB',border:'#FCD34D',icon:'⚠️',tag:'#F59E0B',tagBg:'#FFFBEB'}}
                const c = colors[msg.type]??colors.info
                return(<div key={msg.id} style={{background:c.bg,borderRadius:12,border:'1px solid '+c.border,padding:20,display:'flex',gap:14}}>
                  <span style={{fontSize:24,flexShrink:0}}>{c.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{msg.title}</div>
                      <span style={{fontSize:10,fontWeight:700,background:c.tagBg,color:c.tag,border:'1px solid '+c.border,padding:'2px 8px',borderRadius:20,textTransform:'uppercase'}}>{msg.type}</span>
                    </div>
                    {msg.body&&<div style={{fontSize:13,color:'#344054',lineHeight:1.6}}>{msg.body}</div>}
                    <div style={{fontSize:11,color:'#98A2B3',marginTop:6}}>{new Date(msg.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
                  </div>
                </div>)
              })}
            </div>
          </div>)}

        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>}>
      <SettingsInner />
    </Suspense>
  )
}
