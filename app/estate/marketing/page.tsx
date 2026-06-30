'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Campaigns')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [campaignForm, setCampaignForm] = useState({name:'',type:'Email',status:'Draft',audience:'',budget:'',startDate:'',endDate:'',notes:''})
  const [emails, setEmails] = useState<any[]>([])
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailForm, setEmailForm] = useState({subject:'',to:'',template:'',status:'Draft',scheduledAt:'',notes:''})
  const [socials, setSocials] = useState<any[]>([])
  const [showSocialForm, setShowSocialForm] = useState(false)
  const [socialForm, setSocialForm] = useState({caption:'',platform:'Instagram',scheduledAt:'',status:'Draft',link:''})
  const [ads, setAds] = useState<any[]>([])
  const [showAdForm, setShowAdForm] = useState(false)
  const [adForm, setAdForm] = useState({name:'',platform:'Google',budget:'',status:'Draft',startDate:'',endDate:'',clicks:'',impressions:''})

  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const SECTIONS = ['Campaigns','Email','Social','Ads','Analytics']
  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>ESTATE AGENCY</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Marketing</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Campaigns'&&<button onClick={()=>setShowCampaignForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Campaign</button>}
          {section==='Email'&&<button onClick={()=>setShowEmailForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Email</button>}
          {section==='Social'&&<button onClick={()=>setShowSocialForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Post</button>}
          {section==='Ads'&&<button onClick={()=>setShowAdForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Ad</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Campaigns',v:campaigns.length},{l:'Emails Sent',v:emails.filter((e:any)=>e.status==='Sent').length},{l:'Social Posts',v:socials.length},{l:'Active Ads',v:ads.filter((a:any)=>a.status==='Active').length}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* CAMPAIGNS */}
        {section==='Campaigns'&&(<div>
          {showCampaignForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Campaign</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={campaignForm.name} onChange={e=>setCampaignForm({...campaignForm,name:e.target.value})} placeholder="Campaign name" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={campaignForm.type} onChange={e=>setCampaignForm({...campaignForm,type:e.target.value})} style={inp}>{['Email','Social','Ads','SMS','Multi-channel'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Audience</label><input value={campaignForm.audience} onChange={e=>setCampaignForm({...campaignForm,audience:e.target.value})} placeholder="Target audience" style={inp}/></div>
              <div><label style={lbl}>Budget (£)</label><input value={campaignForm.budget} onChange={e=>setCampaignForm({...campaignForm,budget:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Start Date</label><input value={campaignForm.startDate} onChange={e=>setCampaignForm({...campaignForm,startDate:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>End Date</label><input value={campaignForm.endDate} onChange={e=>setCampaignForm({...campaignForm,endDate:e.target.value})} type="date" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!campaignForm.name)return;setCampaigns([...campaigns,{id:Date.now(),...campaignForm}]);setCampaignForm({name:'',type:'Email',status:'Draft',audience:'',budget:'',startDate:'',endDate:'',notes:''});setShowCampaignForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
              <button onClick={()=>setShowCampaignForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 120px 100px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Campaign</span><span>Type</span><span>Audience</span><span>Budget</span><span>Status</span><span></span>
            </div>
            {campaigns.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>📣</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No campaigns yet</div><div style={{fontSize:13}}>Create your first marketing campaign.</div></div>):campaigns.map((c:any)=>(
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 120px 100px 100px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.name}</div>{c.startDate&&<div style={{fontSize:11,color:'#98A2B3'}}>{c.startDate} - {c.endDate}</div>}</div>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{c.type}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.audience||'—'}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{c.budget?'£'+parseFloat(c.budget).toLocaleString():'—'}</span>
                <select value={c.status} onChange={e=>setCampaigns(campaigns.map((x:any)=>x.id===c.id?{...x,status:e.target.value}:x))} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Draft','Active','Paused','Completed'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>setCampaigns(campaigns.filter((x:any)=>x.id!==c.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>Delete</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* EMAIL */}
        {section==='Email'&&(<div>
          {showEmailForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Email</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Subject *</label><input value={emailForm.subject} onChange={e=>setEmailForm({...emailForm,subject:e.target.value})} placeholder="Email subject" style={inp}/></div>
              <div><label style={lbl}>To</label><input value={emailForm.to} onChange={e=>setEmailForm({...emailForm,to:e.target.value})} placeholder="Recipient or list" style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={emailForm.status} onChange={e=>setEmailForm({...emailForm,status:e.target.value})} style={inp}>{['Draft','Scheduled','Sent'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Scheduled At</label><input value={emailForm.scheduledAt} onChange={e=>setEmailForm({...emailForm,scheduledAt:e.target.value})} type="datetime-local" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!emailForm.subject)return;setEmails([...emails,{id:Date.now(),...emailForm}]);setEmailForm({subject:'',to:'',template:'',status:'Draft',scheduledAt:'',notes:''});setShowEmailForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
              <button onClick={()=>setShowEmailForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 200px 120px 180px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Subject</span><span>To</span><span>Status</span><span>Scheduled</span><span></span>
            </div>
            {emails.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>✉️</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No emails yet</div></div>):emails.map((e:any)=>(
              <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 200px 120px 180px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.subject}</span>
                <span style={{fontSize:12,color:'#667085'}}>{e.to||'—'}</span>
                <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:e.status==='Sent'?'#ECFDF5':e.status==='Scheduled'?'#EEF1FF':'#F9FAFB',color:e.status==='Sent'?'#10B981':e.status==='Scheduled'?ACCENT:'#667085'}}>{e.status}</span>
                <span style={{fontSize:12,color:'#667085'}}>{e.scheduledAt||'—'}</span>
                <button onClick={()=>setEmails(emails.filter((x:any)=>x.id!==e.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* SOCIAL */}
        {section==='Social'&&(<div>
          {showSocialForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Social Post</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Platform</label><select value={socialForm.platform} onChange={e=>setSocialForm({...socialForm,platform:e.target.value})} style={inp}>{['Instagram','Facebook','LinkedIn','TikTok','Twitter/X'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Status</label><select value={socialForm.status} onChange={e=>setSocialForm({...socialForm,status:e.target.value})} style={inp}>{['Draft','Scheduled','Published'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Scheduled At</label><input value={socialForm.scheduledAt} onChange={e=>setSocialForm({...socialForm,scheduledAt:e.target.value})} type="datetime-local" style={inp}/></div>
              <div><label style={lbl}>Link</label><input value={socialForm.link} onChange={e=>setSocialForm({...socialForm,link:e.target.value})} placeholder="https://..." style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Caption *</label><textarea value={socialForm.caption} onChange={e=>setSocialForm({...socialForm,caption:e.target.value})} placeholder="Write your caption..." rows={3} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!socialForm.caption)return;setSocials([...socials,{id:Date.now(),...socialForm}]);setSocialForm({caption:'',platform:'Instagram',scheduledAt:'',status:'Draft',link:''});setShowSocialForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
              <button onClick={()=>setShowSocialForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {socials.length===0?(<div style={{gridColumn:'span 3' as const,textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}><div style={{fontSize:36,marginBottom:12}}>📱</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No posts yet</div></div>):socials.map((p:any)=>(
              <div key={p.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT}}>{p.platform}</span>
                  <span style={{fontSize:11,color:p.status==='Published'?'#10B981':'#667085',fontWeight:600}}>{p.status}</span>
                </div>
                <p style={{fontSize:13,color:'#344054',lineHeight:1.5,marginBottom:8}}>{p.caption}</p>
                {p.scheduledAt&&<div style={{fontSize:11,color:'#98A2B3',marginBottom:8}}>📅 {p.scheduledAt}</div>}
                <button onClick={()=>setSocials(socials.filter((x:any)=>x.id!==p.id))} style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444',width:'100%'}}>Delete</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* ADS */}
        {section==='Ads'&&(<div>
          {showAdForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Ad</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Ad Name *</label><input value={adForm.name} onChange={e=>setAdForm({...adForm,name:e.target.value})} placeholder="Ad name" style={inp}/></div>
              <div><label style={lbl}>Platform</label><select value={adForm.platform} onChange={e=>setAdForm({...adForm,platform:e.target.value})} style={inp}>{['Google','Facebook','Instagram','TikTok','LinkedIn'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Budget (£)</label><input value={adForm.budget} onChange={e=>setAdForm({...adForm,budget:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={adForm.status} onChange={e=>setAdForm({...adForm,status:e.target.value})} style={inp}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Start Date</label><input value={adForm.startDate} onChange={e=>setAdForm({...adForm,startDate:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>End Date</label><input value={adForm.endDate} onChange={e=>setAdForm({...adForm,endDate:e.target.value})} type="date" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!adForm.name)return;setAds([...ads,{id:Date.now(),...adForm}]);setAdForm({name:'',platform:'Google',budget:'',status:'Draft',startDate:'',endDate:'',clicks:'',impressions:''});setShowAdForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
              <button onClick={()=>setShowAdForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 100px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Ad Name</span><span>Platform</span><span>Budget</span><span>Start</span><span>Status</span><span></span>
            </div>
            {ads.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>📢</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No ads yet</div></div>):ads.map((a:any)=>(
              <div key={a.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 100px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.name}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{a.platform}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{a.budget?'£'+parseFloat(a.budget).toLocaleString():'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{a.startDate||'—'}</span>
                <select value={a.status} onChange={e=>setAds(ads.map((x:any)=>x.id===a.id?{...x,status:e.target.value}:x))} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>setAds(ads.filter((x:any)=>x.id!==a.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {/* ANALYTICS */}
        {section==='Analytics'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[{l:'Total Campaigns',v:campaigns.length,c:ACCENT},{l:'Emails Sent',v:emails.filter((e:any)=>e.status==='Sent').length,c:'#10B981'},{l:'Active Ads',v:ads.filter((a:any)=>a.status==='Active').length,c:'#F59E0B'},{l:'Ad Budget Spent',v:'£'+ads.reduce((s:number,a:any)=>s+parseFloat(a.budget||0),0).toLocaleString(),c:'#101828'}].map((s:any)=>(
              <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
                <div style={{fontSize:26,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Campaign Performance</div>
            {campaigns.length===0?<div style={{color:'#98A2B3',fontSize:13,textAlign:'center' as const,padding:40}}>No campaigns to show yet.</div>:campaigns.map((c:any)=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}>
                <span style={{color:'#101828',fontWeight:500}}>{c.name}</span>
                <span style={{color:c.status==='Active'?'#10B981':'#667085',fontWeight:600}}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>)}

      </div>
    </div>
  )
}