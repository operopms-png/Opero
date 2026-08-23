'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const MODULE = 'str'
const LABEL = 'VACATION RENTALS'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Campaigns')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [campaignForm, setCampaignForm] = useState({name:'',type:'Email',status:'Draft',audience:'',budget:'',start_date:'',end_date:'',notes:''})
  const [emails, setEmails] = useState<any[]>([])
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailForm, setEmailForm] = useState({subject:'',to_recipient:'',template:'',status:'Draft',scheduled_at:'',notes:'',body:''})
  const [sendingEmailId, setSendingEmailId] = useState<string|null>(null)
  const [emailReplies, setEmailReplies] = useState<Record<string,any[]>>({})
  const [showSendSettings, setShowSendSettings] = useState(false)
  const [sendSettings, setSendSettings] = useState({marketing_from_email:'',marketing_from_name:'Sangsters Group'})
  const [savingSendSettings, setSavingSendSettings] = useState(false)
  const [emailSubTab, setEmailSubTab] = useState('Manage')
  const [emailFilter, setEmailFilter] = useState('All emails')
  const [emailEvents, setEmailEvents] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateForm, setTemplateForm] = useState({name:'',category:'Other',subject:'',body:''})
  const [editingTemplateId, setEditingTemplateId] = useState<string|null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [emailSearch, setEmailSearch] = useState('')
  const [showColumns, setShowColumns] = useState({delivered:true,openRate:true,clickRate:true,lastUpdated:true})
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [socials, setSocials] = useState<any[]>([])
  const [showSocialForm, setShowSocialForm] = useState(false)
  const [socialForm, setSocialForm] = useState({caption:'',platform:'Instagram',scheduled_at:'',status:'Draft',link:''})
  const [ads, setAds] = useState<any[]>([])
  const [showAdForm, setShowAdForm] = useState(false)
  const [adForm, setAdForm] = useState({name:'',platform:'Google',budget:'',status:'Draft',start_date:'',end_date:''})

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      await loadAll(user.id)
      const { data: settings } = await supabase.from('integrations').select('marketing_from_email,marketing_from_name').eq('user_id',user.id).single()
      if (settings) setSendSettings({marketing_from_email:settings.marketing_from_email||'',marketing_from_name:settings.marketing_from_name||'Sangsters Group'})
      setLoading(false)
    })
  },[])

  async function saveSendSettings() {
    setSavingSendSettings(true)
    const {data:{user}} = await supabase.auth.getUser()
    const {error} = await supabase.from('integrations').upsert({user_id:user?.id, ...sendSettings}, {onConflict:'user_id'})
    setSavingSendSettings(false)
    if(error){alert(error.message);return}
    setShowSendSettings(false)
  }

  async function loadAll(userId: string) {
    const [c,e,s,a,tpl] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('marketing_emails').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('marketing_socials').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('marketing_ads').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('marketing_email_templates').select('*').eq('module',MODULE).eq('user_id',userId).order('created_at',{ascending:false}),
    ])
    setCampaigns(c.data??[]); setEmails(e.data??[]); setSocials(s.data??[]); setAds(a.data??[]); setTemplates(tpl.data??[])

    const emailIds = (e.data??[]).map((x:any)=>x.id)
    if (emailIds.length > 0) {
      const [{ data: replies }, { data: events }] = await Promise.all([
        supabase.from('marketing_email_replies').select('*').in('marketing_email_id', emailIds).order('created_at',{ascending:true}),
        supabase.from('marketing_email_events').select('*').in('marketing_email_id', emailIds),
      ])
      const grouped: Record<string,any[]> = {}
      for (const r of replies??[]) { (grouped[r.marketing_email_id] ??= []).push(r) }
      setEmailReplies(grouped)
      setEmailEvents(events??[])
    } else {
      setEmailEvents([])
    }
  }

  async function sendMarketingEmail(emailId: string) {
    setSendingEmailId(emailId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/marketing-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token??''}` },
      body: JSON.stringify({ email_id: emailId }),
    })
    const result = await res.json()
    setSendingEmailId(null)
    if (!res.ok) { alert(result.error||'Could not send email'); return }
    if (result.skipped) { alert(result.message); return }
    const { data: { user } } = await supabase.auth.getUser()
    await loadAll(user!.id)
  }

  function emailStats(emailId: string) {
    const events = emailEvents.filter((x:any)=>x.marketing_email_id===emailId)
    const delivered = events.some((x:any)=>x.type==='delivered')
    const opened = events.filter((x:any)=>x.type==='opened').length
    const clicked = events.filter((x:any)=>x.type==='clicked').length
    const bounced = events.some((x:any)=>x.type==='bounced')
    const complained = events.some((x:any)=>x.type==='complained')
    return { delivered, opened, clicked, bounced, complained }
  }

  async function saveTemplate() {
    if (!templateForm.name||!templateForm.subject||!templateForm.body) return
    setSavingTemplate(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editingTemplateId) {
      const { error } = await supabase.from('marketing_email_templates').update(templateForm).eq('id', editingTemplateId)
      setSavingTemplate(false)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from('marketing_email_templates').insert([{...templateForm, user_id:user?.id, module:MODULE}])
      setSavingTemplate(false)
      if (error) { alert(error.message); return }
    }
    setTemplateForm({name:'',category:'Other',subject:'',body:''})
    setEditingTemplateId(null)
    setShowTemplateForm(false)
    await loadAll(user!.id)
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase.from('marketing_email_templates').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setTemplates(prev=>prev.filter((t:any)=>t.id!==id))
  }

  function useTemplate(t: any) {
    setEmailForm({subject:t.subject, to_recipient:'', template:t.name, status:'Draft', scheduled_at:'', notes:'', body:t.body})
    setEmailSubTab('Manage')
    setShowEmailForm(true)
  }

  function exportEmailsCsv() {
    const rows = emails.map((e:any)=>{
      const stats = emailStats(e.id)
      return {
        'Email Name': e.subject,
        'To': e.to_recipient||'',
        'Status': e.status,
        'Delivered': e.status==='Sent'?(stats.delivered?'Yes':'Pending'):'',
        'Open Rate': e.status==='Sent'?(stats.delivered?(stats.opened>0?'100%':'0%'):''):'',
        'Click Rate': e.status==='Sent'?(stats.delivered?(stats.clicked>0?'100%':'0%'):''):'',
        'Last Updated': new Date(e.sent_at||e.created_at).toISOString(),
      }
    })
    if (rows.length===0) { alert('No emails to export yet.'); return }
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r=>headers.map(h=>`"${String((r as any)[h]).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `marketing-emails-${MODULE}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function save(table: string, data: any, clearForm: () => void, closeForm: () => void) {
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    const {error} = await supabase.from(table).insert([{...data,user_id:user?.id,module:MODULE}])
    setSaving(false)
    if(error){alert(error.message);return}
    clearForm(); closeForm(); await loadAll(user!.id)
  }

  async function updateField(table: string, id: string, field: string, value: any, setter: (fn:(prev:any[])=>any[])=>void) {
    const {error} = await supabase.from(table).update({[field]:value}).eq('id',id)
    if(error){alert(error.message);return}
    setter(prev=>prev.map((x:any)=>x.id===id?{...x,[field]:value}:x))
  }

  async function del(table: string, id: string, setter: (fn:(prev:any[])=>any[])=>void) {
    const {error} = await supabase.from(table).delete().eq('id',id)
    if(error){alert(error.message);return}
    setter(prev=>prev.filter((x:any)=>x.id!==id))
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const SECTIONS = ['Campaigns','Email','Social','Ads','Analytics']
  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>{LABEL}</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Marketing</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {section==='Campaigns'&&<button onClick={()=>setShowCampaignForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Campaign</button>}
          {section==='Email'&&emailSubTab==='Manage'&&<button onClick={()=>setShowEmailForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Email</button>}
          {section==='Email'&&emailSubTab==='Templates'&&<button onClick={()=>{setEditingTemplateId(null);setTemplateForm({name:'',category:'Other',subject:'',body:''});setShowTemplateForm(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Template</button>}
          {section==='Social'&&<button onClick={()=>setShowSocialForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Post</button>}
          {section==='Ads'&&<button onClick={()=>setShowAdForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Ad</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Campaigns',v:campaigns.length},{l:'Emails Sent',v:emails.filter((e:any)=>e.status==='Sent').length},{l:'Social Posts',v:socials.length},{l:'Active Ads',v:ads.filter((a:any)=>a.status==='Active').length}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {section==='Campaigns'&&(<div>
          {showCampaignForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Campaign</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={campaignForm.name} onChange={e=>setCampaignForm({...campaignForm,name:e.target.value})} placeholder="Campaign name" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={campaignForm.type} onChange={e=>setCampaignForm({...campaignForm,type:e.target.value})} style={inp}>{['Email','Social','Ads','SMS','Multi-channel'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Audience</label><input value={campaignForm.audience} onChange={e=>setCampaignForm({...campaignForm,audience:e.target.value})} placeholder="Target audience" style={inp}/></div>
              <div><label style={lbl}>Budget (£)</label><input value={campaignForm.budget} onChange={e=>setCampaignForm({...campaignForm,budget:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Start Date</label><input value={campaignForm.start_date} onChange={e=>setCampaignForm({...campaignForm,start_date:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>End Date</label><input value={campaignForm.end_date} onChange={e=>setCampaignForm({...campaignForm,end_date:e.target.value})} type="date" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!campaignForm.name)return;save('marketing_campaigns',{...campaignForm,budget:campaignForm.budget?parseFloat(campaignForm.budget):null},()=>setCampaignForm({name:'',type:'Email',status:'Draft',audience:'',budget:'',start_date:'',end_date:'',notes:''}),()=>setShowCampaignForm(false))}} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Save'}</button>
              <button onClick={()=>setShowCampaignForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 120px 100px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
              <span>Campaign</span><span>Type</span><span>Audience</span><span>Budget</span><span>Status</span><span></span>
            </div>
            {campaigns.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>📣</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No campaigns yet</div><div style={{fontSize:13}}>Create your first marketing campaign.</div></div>):campaigns.map((c:any)=>(
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 120px 100px 100px 80px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.name}</div>{c.start_date&&<div style={{fontSize:11,color:'#98A2B3'}}>{c.start_date} - {c.end_date}</div>}</div>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{c.type}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.audience||'—'}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#101828'}}>{c.budget?'£'+parseFloat(c.budget).toLocaleString():'—'}</span>
                <select value={c.status} onChange={e=>updateField('marketing_campaigns',c.id,'status',e.target.value,setCampaigns)} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Draft','Active','Paused','Completed'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>del('marketing_campaigns',c.id,setCampaigns)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>Delete</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Email'&&(<div>
          <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid #E4E7EC'}}>
            {['Manage','Templates','Analyze'].map(t=>(
              <button key={t} onClick={()=>setEmailSubTab(t)} style={{padding:'10px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:emailSubTab===t?600:400,color:emailSubTab===t?ACCENT:'#667085',borderBottom:emailSubTab===t?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit',marginBottom:-1}}>{t}</button>
            ))}
          </div>

          {emailSubTab==='Manage'&&(<div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontSize:20,fontWeight:700,color:'#101828'}}>Marketing Email</div>
                <div style={{fontSize:12,color:'#667085',marginTop:2}}>{emails.length} marketing email{emails.length===1?'':'s'} · {emails.filter((e:any)=>e.status==='Sent').length} sent this month</div>
              </div>
              <div style={{fontSize:12,color:'#667085'}}>Sending as: <strong style={{color:'#101828'}}>{sendSettings.marketing_from_email?`${sendSettings.marketing_from_name} <${sendSettings.marketing_from_email}>`:'Opero <notifications@helloopero.com> (default — not set up yet)'}</strong> <button onClick={()=>setShowSendSettings(!showSendSettings)} style={{fontSize:12,fontWeight:600,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit',marginLeft:8}}>{sendSettings.marketing_from_email?'Change':'Set up'}</button></div>
            </div>
            {showSendSettings&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 6px'}}>Sending Address</h3>
              <p style={{fontSize:12,color:'#98A2B3',marginBottom:16,lineHeight:1.5}}>This address's domain must be verified in Resend (SPF/DKIM records added to its DNS) or sends will fail or land in spam. If you haven't verified sangstersgroup.com in Resend yet, do that first — this setting alone won't make sends work on an unverified domain.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div><label style={lbl}>From Name</label><input value={sendSettings.marketing_from_name} onChange={e=>setSendSettings({...sendSettings,marketing_from_name:e.target.value})} placeholder="Sangsters Group" style={inp}/></div>
                <div><label style={lbl}>From Email</label><input value={sendSettings.marketing_from_email} onChange={e=>setSendSettings({...sendSettings,marketing_from_email:e.target.value})} placeholder="info@sangstersgroup.com" style={inp}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveSendSettings} disabled={savingSendSettings} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:savingSendSettings?0.6:1}}>{savingSendSettings?'Saving…':'Save'}</button>
                <button onClick={()=>setShowSendSettings(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            {showEmailForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Email</h3>
              {templates.length>0&&(
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Start from a template (optional)</label>
                  <select value="" onChange={e=>{const t=templates.find((x:any)=>x.id===e.target.value);if(t)setEmailForm({...emailForm,subject:t.subject,body:t.body,template:t.name})}} style={inp}>
                    <option value="">Blank email</option>
                    {templates.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={lbl}>Subject *</label><input value={emailForm.subject} onChange={e=>setEmailForm({...emailForm,subject:e.target.value})} placeholder="Email subject" style={inp}/></div>
                <div><label style={lbl}>To *</label><input value={emailForm.to_recipient} onChange={e=>setEmailForm({...emailForm,to_recipient:e.target.value})} placeholder="recipient@example.com" style={inp}/></div>
                <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Body *</label><textarea value={emailForm.body} onChange={e=>setEmailForm({...emailForm,body:e.target.value})} placeholder="Write your email…" rows={5} style={{...inp,resize:'vertical' as const}}/></div>
                <div><label style={lbl}>Status</label><select value={emailForm.status} onChange={e=>setEmailForm({...emailForm,status:e.target.value})} style={inp}>{['Draft','Scheduled'].map(s=><option key={s}>{s}</option>)}</select></div>
                <div><label style={lbl}>Scheduled At</label><input value={emailForm.scheduled_at} onChange={e=>setEmailForm({...emailForm,scheduled_at:e.target.value})} type="datetime-local" style={inp}/></div>
              </div>
              <div style={{fontSize:11,color:'#98A2B3',marginBottom:12}}>Saved as a draft first — use "Send Now" on the list below to actually send it.</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(!emailForm.subject||!emailForm.to_recipient||!emailForm.body)return;save('marketing_emails',{...emailForm,scheduled_at:emailForm.scheduled_at||null},()=>setEmailForm({subject:'',to_recipient:'',template:'',status:'Draft',scheduled_at:'',notes:'',body:''}),()=>setShowEmailForm(false))}} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Save'}</button>
                <button onClick={()=>setShowEmailForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}

            <div style={{display:'flex',gap:20,marginBottom:16,borderBottom:'1px solid #E4E7EC',alignItems:'center'}}>
              {[
                {l:'All emails',dot:null},
                {l:'Drafts',dot:'#98A2B3'},
                {l:'Scheduled',dot:'#F59E0B'},
                {l:'Sent',dot:'#10B981'},
              ].map(f=>(
                <button key={f.l} onClick={()=>setEmailFilter(f.l)} style={{display:'flex',alignItems:'center',gap:6,padding:'0 0 10px',border:'none',background:'transparent',fontSize:13,fontWeight:emailFilter===f.l?600:400,color:emailFilter===f.l?'#101828':'#667085',borderBottom:emailFilter===f.l?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>
                  {f.dot&&<div style={{width:7,height:7,borderRadius:'50%',background:f.dot}}/>}
                  {f.l}
                </button>
              ))}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:12}}>
              <div style={{position:'relative',flex:1,maxWidth:340}}>
                <input value={emailSearch} onChange={e=>setEmailSearch(e.target.value)} placeholder="Search email name or subject line" style={{...inp,paddingLeft:32}}/>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#98A2B3',fontSize:13}}>🔍</span>
              </div>
              <div style={{display:'flex',gap:8,position:'relative'}}>
                <button onClick={()=>setShowColumnsMenu(!showColumnsMenu)} style={{fontSize:12,fontWeight:600,color:'#344054',background:'#fff',border:'1px solid #D0D5DD',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'inherit'}}>Edit columns</button>
                {showColumnsMenu&&(
                  <div style={{position:'absolute',top:'110%',right:90,background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,padding:12,boxShadow:'0 4px 12px rgba(0,0,0,0.08)',zIndex:10,width:160}}>
                    {[['delivered','Delivered'],['openRate','Open Rate'],['clickRate','Click Rate'],['lastUpdated','Last Updated']].map(([k,l])=>(
                      <label key={k} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#344054',padding:'4px 0',cursor:'pointer'}}>
                        <input type="checkbox" checked={(showColumns as any)[k]} onChange={e=>setShowColumns({...showColumns,[k]:e.target.checked})}/>
                        {l}
                      </label>
                    ))}
                  </div>
                )}
                <button onClick={exportEmailsCsv} style={{fontSize:12,fontWeight:600,color:'#344054',background:'#fff',border:'1px solid #D0D5DD',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'inherit'}}>Export emails</button>
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:`1.5fr ${showColumns.delivered?'90px':''} ${showColumns.openRate?'90px':''} ${showColumns.clickRate?'90px':''} ${showColumns.lastUpdated?'140px':''} 90px`,padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                <span>Email Name</span>
                {showColumns.delivered&&<span>Delivered</span>}
                {showColumns.openRate&&<span>Open Rate</span>}
                {showColumns.clickRate&&<span>Click Rate</span>}
                {showColumns.lastUpdated&&<span>Last Updated</span>}
                <span></span>
              </div>
              {(()=>{
                const filtered = emails
                  .filter((e:any)=>emailFilter==='All emails'||e.status===emailFilter.replace(/s$/,''))
                  .filter((e:any)=>!emailSearch||e.subject?.toLowerCase().includes(emailSearch.toLowerCase())||e.to_recipient?.toLowerCase().includes(emailSearch.toLowerCase()))
                if (filtered.length===0) return <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>✉️</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No emails here yet</div></div>
                const statusDot: Record<string,string> = {Draft:'#98A2B3',Scheduled:'#F59E0B',Sent:'#10B981'}
                return filtered.map((e:any)=>{
                  const stats = emailStats(e.id)
                  const openRate = stats.delivered ? Math.round((stats.opened>0?1:0)*100) : 0
                  const clickRate = stats.delivered ? Math.round((stats.clicked>0?1:0)*100) : 0
                  const updated = new Date(e.sent_at||e.created_at)
                  return (
                    <div key={e.id}>
                      <div style={{display:'grid',gridTemplateColumns:`1.5fr ${showColumns.delivered?'90px':''} ${showColumns.openRate?'90px':''} ${showColumns.clickRate?'90px':''} ${showColumns.lastUpdated?'140px':''} 90px`,padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                          <div style={{width:7,height:7,borderRadius:'50%',background:statusDot[e.status]||'#98A2B3',marginTop:5,flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{e.subject}</div>
                            <div style={{fontSize:11,color:'#98A2B3',marginTop:2}}>To: {e.to_recipient||'—'}</div>
                          </div>
                        </div>
                        {showColumns.delivered&&<span style={{fontSize:12,color:e.status==='Sent'?(stats.delivered?'#10B981':'#98A2B3'):'#98A2B3'}}>{e.status==='Sent'?(stats.delivered?'Yes':'Pending'):'—'}</span>}
                        {showColumns.openRate&&<span style={{fontSize:12,color:'#344054'}}>{e.status==='Sent'?openRate+'%':'—'}</span>}
                        {showColumns.clickRate&&<span style={{fontSize:12,color:'#344054'}}>{e.status==='Sent'?clickRate+'%':'—'}</span>}
                        {showColumns.lastUpdated&&(
                          <span style={{fontSize:11,color:'#667085',lineHeight:1.4}}>
                            {updated.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}<br/>
                            {updated.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        )}
                        <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                          {e.status!=='Sent'&&(
                            <button onClick={()=>sendMarketingEmail(e.id)} disabled={sendingEmailId===e.id} style={{fontSize:11,fontWeight:600,color:'#fff',background:ACCENT,border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',opacity:sendingEmailId===e.id?0.6:1}}>{sendingEmailId===e.id?'…':'Send'}</button>
                          )}
                          <button onClick={()=>del('marketing_emails',e.id,setEmails)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                        </div>
                      </div>
                      {emailReplies[e.id]?.length>0 && (
                        <div style={{padding:'0 20px 16px',display:'flex',flexDirection:'column',gap:8,background:'#FAFBFC'}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,paddingTop:12}}>Replies ({emailReplies[e.id].length})</div>
                          {emailReplies[e.id].map((r:any)=>(
                            <div key={r.id} style={{background:'#fff',border:'1px solid #F2F4F7',borderRadius:8,padding:'10px 12px'}}>
                              <div style={{fontSize:12,fontWeight:600,color:'#101828'}}>{r.from_address}</div>
                              <div style={{fontSize:12,color:'#344054',marginTop:2,whiteSpace:'pre-wrap' as const}}>{r.body}</div>
                              <div style={{fontSize:10,color:'#98A2B3',marginTop:4}}>{new Date(r.created_at).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>)}

          {emailSubTab==='Templates'&&(<div>
            <p style={{fontSize:12,color:'#98A2B3',marginBottom:16}}>Build reusable templates for common situations — staff pick one when composing instead of writing from scratch.</p>
            {showTemplateForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
              <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editingTemplateId?'Edit Template':'New Template'}</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={lbl}>Template Name *</label><input value={templateForm.name} onChange={e=>setTemplateForm({...templateForm,name:e.target.value})} placeholder="e.g. Move-In Welcome" style={inp}/></div>
                <div><label style={lbl}>Category</label><select value={templateForm.category} onChange={e=>setTemplateForm({...templateForm,category:e.target.value})} style={inp}>{['Onboarding','Rent & Payments','Maintenance','Renewals','Announcements','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Subject *</label><input value={templateForm.subject} onChange={e=>setTemplateForm({...templateForm,subject:e.target.value})} placeholder="Email subject" style={inp}/></div>
                <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Body *</label><textarea value={templateForm.body} onChange={e=>setTemplateForm({...templateForm,body:e.target.value})} placeholder="Write the template…" rows={6} style={{...inp,resize:'vertical' as const}}/></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveTemplate} disabled={savingTemplate} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:savingTemplate?0.6:1}}>{savingTemplate?'Saving…':'Save Template'}</button>
                <button onClick={()=>{setShowTemplateForm(false);setEditingTemplateId(null)}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
              </div>
            </div>)}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {templates.length===0?(<div style={{gridColumn:'span 3' as const,textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}><div style={{fontSize:36,marginBottom:12}}>📄</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No templates yet</div><div style={{fontSize:13}}>Add your first one above.</div></div>):templates.map((t:any)=>(
                <div key={t.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT}}>{t.category}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:4}}>{t.name}</div>
                  <div style={{fontSize:12,color:'#667085',marginBottom:6}}>{t.subject}</div>
                  <div style={{fontSize:12,color:'#98A2B3',lineHeight:1.5,marginBottom:12,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>{t.body}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>useTemplate(t)} style={{flex:1,padding:'7px',borderRadius:6,border:'none',background:ACCENT,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Use Template</button>
                    <button onClick={()=>{setEditingTemplateId(t.id);setTemplateForm({name:t.name,category:t.category,subject:t.subject,body:t.body});setShowTemplateForm(true)}} style={{padding:'7px 10px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Edit</button>
                    <button onClick={()=>deleteTemplate(t.id)} style={{padding:'7px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:12,cursor:'pointer',color:'#EF4444'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {emailSubTab==='Analyze'&&(()=>{
            const sent = emails.filter((e:any)=>e.status==='Sent')
            const sentIds = sent.map((e:any)=>e.id)
            const sentEvents = emailEvents.filter((ev:any)=>sentIds.includes(ev.marketing_email_id))
            const delivered = sent.filter((e:any)=>sentEvents.some((ev:any)=>ev.marketing_email_id===e.id&&ev.type==='delivered')).length
            const openedCount = new Set(sentEvents.filter((ev:any)=>ev.type==='opened').map((ev:any)=>ev.marketing_email_id)).size
            const clickedCount = new Set(sentEvents.filter((ev:any)=>ev.type==='clicked').map((ev:any)=>ev.marketing_email_id)).size
            const bouncedCount = new Set(sentEvents.filter((ev:any)=>ev.type==='bounced').map((ev:any)=>ev.marketing_email_id)).size
            const complainedCount = new Set(sentEvents.filter((ev:any)=>ev.type==='complained').map((ev:any)=>ev.marketing_email_id)).size
            const repliedCount = Object.keys(emailReplies).filter(id=>sentIds.includes(id)&&emailReplies[id].length>0).length
            const pct = (n:number,d:number)=>d>0?Math.round((n/d)*100):0

            const deviceCounts: Record<string,{opened:number,clicked:number}> = {Desktop:{opened:0,clicked:0},Mobile:{opened:0,clicked:0},Other:{opened:0,clicked:0}}
            sentEvents.forEach((ev:any)=>{
              if(!ev.device_type||!(ev.type==='opened'||ev.type==='clicked'))return
              if(!deviceCounts[ev.device_type])deviceCounts[ev.device_type]={opened:0,clicked:0}
              if(ev.type==='opened')deviceCounts[ev.device_type].opened++
              if(ev.type==='clicked')deviceCounts[ev.device_type].clicked++
            })
            const maxDeviceVal = Math.max(1,...Object.values(deviceCounts).flatMap(d=>[d.opened,d.clicked]))

            return (
            <div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16}}>Recipient Engagement</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                  {[
                    {l:'Sent',v:sent.length,sub:sent.length+' Emails'},
                    {l:'Open Rate',v:pct(openedCount,delivered)+'%',sub:openedCount+' Opened'},
                    {l:'Click Rate',v:pct(clickedCount,delivered)+'%',sub:clickedCount+' Clicked'},
                    {l:'Click-Through Rate',v:pct(clickedCount,openedCount)+'%',sub:'of opens'},
                    {l:'Reply Rate',v:pct(repliedCount,sent.length)+'%',sub:repliedCount+' Replied'},
                  ].map((s:any)=>(
                    <div key={s.l} style={{textAlign:'center' as const}}>
                      <div style={{fontSize:24,fontWeight:700,color:'#101828'}}>{s.v}</div>
                      <div style={{fontSize:11,color:'#98A2B3',marginTop:2}}>{s.sub}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginTop:6}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:16}}>Delivery</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {[
                    {l:'Delivery Rate',v:pct(delivered,sent.length)+'%'},
                    {l:'Hard Bounce Rate',v:pct(bouncedCount,sent.length)+'%'},
                    {l:'Spam Report Rate',v:pct(complainedCount,sent.length)+'%'},
                  ].map((s:any)=>(
                    <div key={s.l} style={{textAlign:'center' as const}}>
                      <div style={{fontSize:24,fontWeight:700,color:'#101828'}}>{s.v}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginTop:6}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:4}}>Performance by Device Type</div>
                <div style={{fontSize:11,color:'#98A2B3',marginBottom:16}}>Based on opens/clicks with a detectable device — sends before this tracking existed won't be counted.</div>
                {sentEvents.filter((ev:any)=>ev.device_type).length===0?(
                  <div style={{textAlign:'center' as const,padding:30,color:'#98A2B3',fontSize:13}}>No device data yet.</div>
                ):(
                  <div style={{display:'flex',gap:24,alignItems:'flex-end',height:140,paddingTop:10}}>
                    {Object.entries(deviceCounts).map(([device,counts])=>(
                      <div key={device} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                        <div style={{display:'flex',gap:4,alignItems:'flex-end',height:100}}>
                          <div style={{width:20,height:Math.max(2,(counts.opened/maxDeviceVal)*100),background:ACCENT,borderRadius:'3px 3px 0 0'}} title={`Opened: ${counts.opened}`}/>
                          <div style={{width:20,height:Math.max(2,(counts.clicked/maxDeviceVal)*100),background:'#10B981',borderRadius:'3px 3px 0 0'}} title={`Clicked: ${counts.clicked}`}/>
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:'#344054'}}>{device}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',gap:16,marginTop:16,fontSize:11,color:'#667085'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:9,height:9,borderRadius:2,background:ACCENT}}/>Opened</div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:9,height:9,borderRadius:2,background:'#10B981'}}/>Clicked</div>
                </div>
              </div>
            </div>
            )
          })()}
        </div>)}

        {section==='Social'&&(<div>
          {showSocialForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Social Post</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Platform</label><select value={socialForm.platform} onChange={e=>setSocialForm({...socialForm,platform:e.target.value})} style={inp}>{['Instagram','Facebook','LinkedIn','TikTok','Twitter/X'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Status</label><select value={socialForm.status} onChange={e=>setSocialForm({...socialForm,status:e.target.value})} style={inp}>{['Draft','Scheduled','Published'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Scheduled At</label><input value={socialForm.scheduled_at} onChange={e=>setSocialForm({...socialForm,scheduled_at:e.target.value})} type="datetime-local" style={inp}/></div>
              <div><label style={lbl}>Link</label><input value={socialForm.link} onChange={e=>setSocialForm({...socialForm,link:e.target.value})} placeholder="https://..." style={inp}/></div>
              <div style={{gridColumn:'span 2' as const}}><label style={lbl}>Caption *</label><textarea value={socialForm.caption} onChange={e=>setSocialForm({...socialForm,caption:e.target.value})} placeholder="Write your caption..." rows={3} style={{...inp,resize:'vertical' as const}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!socialForm.caption)return;save('marketing_socials',{...socialForm,scheduled_at:socialForm.scheduled_at||null},()=>setSocialForm({caption:'',platform:'Instagram',scheduled_at:'',status:'Draft',link:''}),()=>setShowSocialForm(false))}} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Save'}</button>
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
                {p.scheduled_at&&<div style={{fontSize:11,color:'#98A2B3',marginBottom:8}}>📅 {p.scheduled_at}</div>}
                <button onClick={()=>del('marketing_socials',p.id,setSocials)} style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444',width:'100%'}}>Delete</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Ads'&&(<div>
          {showAdForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>New Ad</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Ad Name *</label><input value={adForm.name} onChange={e=>setAdForm({...adForm,name:e.target.value})} placeholder="Ad name" style={inp}/></div>
              <div><label style={lbl}>Platform</label><select value={adForm.platform} onChange={e=>setAdForm({...adForm,platform:e.target.value})} style={inp}>{['Google','Facebook','Instagram','TikTok','LinkedIn'].map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={lbl}>Budget (£)</label><input value={adForm.budget} onChange={e=>setAdForm({...adForm,budget:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>Status</label><select value={adForm.status} onChange={e=>setAdForm({...adForm,status:e.target.value})} style={inp}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Start Date</label><input value={adForm.start_date} onChange={e=>setAdForm({...adForm,start_date:e.target.value})} type="date" style={inp}/></div>
              <div><label style={lbl}>End Date</label><input value={adForm.end_date} onChange={e=>setAdForm({...adForm,end_date:e.target.value})} type="date" style={inp}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!adForm.name)return;save('marketing_ads',{...adForm,budget:adForm.budget?parseFloat(adForm.budget):null},()=>setAdForm({name:'',platform:'Google',budget:'',status:'Draft',start_date:'',end_date:''}),()=>setShowAdForm(false))}} disabled={saving} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1}}>{saving?'Saving…':'Save'}</button>
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
                <span style={{fontSize:12,color:'#667085'}}>{a.start_date||'—'}</span>
                <select value={a.status} onChange={e=>updateField('marketing_ads',a.id,'status',e.target.value,setAds)} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Draft','Active','Paused','Ended'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>del('marketing_ads',a.id,setAds)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

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
