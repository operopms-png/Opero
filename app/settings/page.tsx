'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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

const ROLES = ['Admin','Airbnb Agent','Property Manager','Cleaner','Maintenance','Viewer','Estate Agent']

export default function Page() {
  const [section, setSection] = useState('My Account')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Cleaner')
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [plan, setPlan] = useState('Professional')
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      setUser(user)
      const {data:sub} = await supabase.from('subscriptions').select('*').eq('user_id',user.id).single()
      if(sub){
        setApiKey((sub as any).api_key??'')
        setPlan((sub as any).plan??'Professional')
      }
      const {data:msgs} = await supabase.from('system_messages').select('*').eq('published',true).order('created_at',{ascending:false})
      setMessages(msgs??[])
      setLoading(false)
    })
  },[])

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
        </div>
        <div style={{flex:1,padding:24,overflowY:'auto'}}>

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
              <button onClick={()=>setShowInvite(true)} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>+ Invite member</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Total members',v:team.length+1,c:ACCENT},{l:'Admins',v:1,c:'#101828'},{l:'Cleaners',v:team.filter(t=>t.role==='Cleaner').length,c:'#10B981'},{l:'Other',v:team.filter(t=>t.role!=='Cleaner'&&t.role!=='Admin').length,c:'#F59E0B'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                </div>
              ))}
            </div>
            {showInvite&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Invite team member</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 160px',gap:12,marginBottom:16}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Full name</div>
                  <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Jane Smith" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Email address</div>
                  <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="jane@example.com" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4}}>Role</div>
                  <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(inviteName&&inviteEmail){setTeam([...team,{id:Date.now(),name:inviteName,email:inviteEmail,role:inviteRole,status:'Pending'}]);setInviteName('');setInviteEmail('');setShowInvite(false)}}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Send invite</button>
                <button onClick={()=>setShowInvite(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
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
                <span style={{fontSize:12,fontWeight:600,color:ACCENT,background:ACCENT+'18',padding:'3px 10px',borderRadius:20,display:'inline-block'}}>Admin</span>
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
                  <button onClick={()=>setTeam(team.filter(t=>t.id!==m.id))} style={{background:'none',border:'none',color:'#98A2B3',cursor:'pointer',fontSize:18}}>×</button>
                </div>
              ))}
              {team.length===0&&(<div style={{textAlign:'center',padding:40,color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:8}}>👥</div>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>No team members yet</div>
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
                  <div style={{fontSize:22,fontWeight:700,color:'#101828',textTransform:'capitalize'}}>{plan}</div>
                  <div style={{fontSize:12,color:'#667085'}}>Active</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
                {[{l:'Unlimited properties',icon:'🏠'},{l:'All modules included',icon:'✅'},{l:'Priority support',icon:'⚡'}].map(f=>(
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
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Available plans</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[{name:'Starter',price:'£29',period:'/mo',features:['Up to 5 properties','CRM','Basic reporting']},{name:'Growth',price:'£79',period:'/mo',features:['Up to 20 properties','All modules','Advanced analytics']},{name:'Professional',price:'£199',period:'/mo',features:['Unlimited properties','All modules','Priority support','Custom integrations']}].map(p=>(
                  <div key={p.name} style={{border:'2px solid '+(p.name===plan?ACCENT:'#E4E7EC'),borderRadius:10,padding:20,background:p.name===plan?ACCENT+'08':'#fff'}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:22,fontWeight:700,color:ACCENT,marginBottom:12}}>{p.price}<span style={{fontSize:12,color:'#667085',fontWeight:400}}>{p.period}</span></div>
                    {p.features.map(f=><div key={f} style={{fontSize:12,color:'#344054',marginBottom:6,display:'flex',alignItems:'center',gap:6}}><span style={{color:'#10B981'}}>✓</span>{f}</div>)}
                    <button style={{width:'100%',marginTop:12,padding:'8px',borderRadius:8,border:'none',background:p.name===plan?ACCENT:'#F2F4F7',color:p.name===plan?'#fff':'#344054',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{p.name===plan?'Current plan':'Switch'}</button>
                  </div>
                ))}
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
