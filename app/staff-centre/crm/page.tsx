'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
const ACCENT = '#3B4AFF'
const CONTACT_TYPES = ['Landlord','Tenant','Buyer','Seller','Investor','Other']
const DEAL_STAGES = ['Enquiry','Viewing','Offer','Negotiation','Won','Lost']
const MODULES = [
  { key:'str', label:'Vacation Rentals', color:'#3B4AFF', bg:'#EEF1FF' },
  { key:'pm', label:'Property Management', color:'#3B4AFF', bg:'#EEF1FF' },
  { key:'estate', label:'Estate Agency', color:'#2D6A4F', bg:'#EAF3EE' },
  { key:'dev', label:'Developments', color:'#8B5CF6', bg:'#F3EEFF' },
]
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

function moduleBadge(m: string) {
  const found = MODULES.find(x=>x.key===m)
  if (!found) return <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#667085',fontWeight:600}}>—</span>
  return <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:found.bg,color:found.color,fontWeight:600}}>{found.label}</span>
}

export default function Page() {
  const [section, setSection] = useState('Contacts')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [showContactForm, setShowContactForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [editId, setEditId] = useState<any>(null)
  const [contactForm, setContactForm] = useState({name:'',email:'',phone:'',type:'Landlord',notes:'',module:'pm'})
  const [dealForm, setDealForm] = useState({name:'',contact_id:'',value:'',stage:'Enquiry',module:'pm'})

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      await loadAll(user.id)
      setLoading(false)
    })
  },[])

  async function loadAll(userId: string) {
    const [c,d] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('crm_deals').select('*,crm_contacts(name)').eq('user_id',userId).order('created_at',{ascending:false}),
    ])
    setContacts(c.data??[])
    setDeals(d.data??[])
  }

  const filteredContacts = moduleFilter==='All' ? contacts : contacts.filter((c:any)=>c.module===moduleFilter)
  const filteredDeals = moduleFilter==='All' ? deals : deals.filter((d:any)=>d.module===moduleFilter)

  async function saveContact() {
    if(!contactForm.name) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    if(editId){
      const {error}=await supabase.from('crm_contacts').update(contactForm).eq('id',editId)
      if(error){alert(error.message);setSaving(false);return}
    } else {
      const {error}=await supabase.from('crm_contacts').insert([{...contactForm,user_id:user?.id}])
      if(error){alert(error.message);setSaving(false);return}
    }
    setSaving(false); setContactForm({name:'',email:'',phone:'',type:'Landlord',notes:'',module:'pm'}); setShowContactForm(false); setEditId(null)
    await loadAll(user!.id)
  }

  async function saveDeal() {
    if(!dealForm.name) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    const payload = {...dealForm, value: dealForm.value ? parseFloat(dealForm.value as any) : null, contact_id: dealForm.contact_id || null}
    if(editId){
      const {error}=await supabase.from('crm_deals').update(payload).eq('id',editId)
      if(error){alert(error.message);setSaving(false);return}
    } else {
      const {error}=await supabase.from('crm_deals').insert([{...payload,user_id:user?.id}])
      if(error){alert(error.message);setSaving(false);return}
    }
    setSaving(false); setDealForm({name:'',contact_id:'',value:'',stage:'Enquiry',module:'pm'}); setShowDealForm(false); setEditId(null)
    await loadAll(user!.id)
  }

  async function delContact(id: string) {
    if(!confirm('Delete this contact?')) return
    await supabase.from('crm_contacts').delete().eq('id',id)
    const {data:{user}} = await supabase.auth.getUser()
    await loadAll(user!.id)
  }

  async function delDeal(id: string) {
    if(!confirm('Delete this deal?')) return
    await supabase.from('crm_deals').delete().eq('id',id)
    const {data:{user}} = await supabase.auth.getUser()
    await loadAll(user!.id)
  }

  async function updateDealStage(id: string, stage: string) {
    const {error} = await supabase.from('crm_deals').update({stage}).eq('id',id)
    if(error){alert(error.message);return}
    setDeals(deals.map((d:any)=>d.id===id?{...d,stage}:d))
  }

  function openEditContact(c: any) {
    setContactForm({name:c.name,email:c.email??'',phone:c.phone??'',type:c.type??'Landlord',notes:c.notes??'',module:c.module??'pm'})
    setEditId(c.id); setShowContactForm(true)
  }

  function openEditDeal(d: any) {
    const {crm_contacts, ...clean} = d
    setDealForm({name:clean.name,contact_id:clean.contact_id??'',value:clean.value??'',stage:clean.stage??'Enquiry',module:clean.module??'pm'})
    setEditId(d.id); setShowDealForm(true)
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div><div style={{fontSize:15,fontWeight:700,color:'#101828'}}>CRM</div></div>
        <div style={{display:'flex',gap:8}}>
          {section==='Contacts'&&<button onClick={()=>{setEditId(null);setContactForm({name:'',email:'',phone:'',type:'Landlord',notes:'',module:moduleFilter!=='All'?moduleFilter:'pm'});setShowContactForm(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Contact</button>}
          {section==='Deals'&&<button onClick={()=>{setEditId(null);setDealForm({name:'',contact_id:'',value:'',stage:'Enquiry',module:moduleFilter!=='All'?moduleFilter:'pm'});setShowDealForm(true)}} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Deal</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {['Contacts','Deals','Pipeline'].map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>

        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' as const}}>
          <button onClick={()=>setModuleFilter('All')} style={{padding:'7px 14px',borderRadius:20,border:moduleFilter==='All'?'1px solid '+ACCENT:'1px solid #E4E7EC',background:moduleFilter==='All'?ACCENT+'12':'#fff',color:moduleFilter==='All'?ACCENT:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>All</button>
          {MODULES.map(m=>(
            <button key={m.key} onClick={()=>setModuleFilter(m.key)} style={{padding:'7px 14px',borderRadius:20,border:moduleFilter===m.key?'1px solid '+m.color:'1px solid #E4E7EC',background:moduleFilter===m.key?m.bg:'#fff',color:moduleFilter===m.key?m.color:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{m.label}</button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Contacts',v:filteredContacts.length},{l:'Deals',v:filteredDeals.length},{l:'Landlords',v:filteredContacts.filter((c:any)=>c.type==='Landlord').length},{l:'Won Deals',v:filteredDeals.filter((d:any)=>d.stage==='Won').length}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {section==='Contacts'&&(<div>
          {showContactForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Contact':'Add Contact'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})} placeholder="Full name" style={inp}/></div>
              <div><label style={lbl}>Email</label><input value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})} type="email" style={inp}/></div>
              <div><label style={lbl}>Phone</label><input value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})} placeholder="+44..." style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={contactForm.type} onChange={e=>setContactForm({...contactForm,type:e.target.value})} style={inp}>{CONTACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Which part of the business?</label><select value={contactForm.module} onChange={e=>setContactForm({...contactForm,module:e.target.value})} style={inp}>{MODULES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
              <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><textarea value={contactForm.notes} onChange={e=>setContactForm({...contactForm,notes:e.target.value})} style={{...inp,resize:'vertical' as const}} rows={2}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={saveContact} disabled={saving||!contactForm.name} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving||!contactForm.name?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add'}</button>
              <button onClick={()=>{setShowContactForm(false);setEditId(null)}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 90px 150px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Name</span><span>Email</span><span>Phone</span><span>Type</span><span>Module</span><span></span></div>
            {filteredContacts.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>👥</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No contacts yet</div></div>):filteredContacts.map((c:any)=>(
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 160px 120px 90px 150px 100px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.name}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.email||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.phone||'—'}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054',fontWeight:600,width:'fit-content'}}>{c.type}</span>
                <span>{moduleBadge(c.module)}</span>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>openEditContact(c)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>delContact(c.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Deals'&&(<div>
          {showDealForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>{editId?'Edit Deal':'Add Deal'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Deal Name *</label><input value={dealForm.name} onChange={e=>setDealForm({...dealForm,name:e.target.value})} placeholder="e.g. 3 bed sale" style={inp}/></div>
              <div><label style={lbl}>Contact</label><select value={dealForm.contact_id} onChange={e=>setDealForm({...dealForm,contact_id:e.target.value})} style={inp}><option value="">Select…</option>{contacts.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={lbl}>Value (£)</label><input value={dealForm.value} onChange={e=>setDealForm({...dealForm,value:e.target.value})} type="number" style={inp}/></div>
              <div><label style={lbl}>Stage</label><select value={dealForm.stage} onChange={e=>setDealForm({...dealForm,stage:e.target.value})} style={inp}>{DEAL_STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Which part of the business?</label><select value={dealForm.module} onChange={e=>setDealForm({...dealForm,module:e.target.value})} style={inp}>{MODULES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={saveDeal} disabled={saving||!dealForm.name} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving||!dealForm.name?0.6:1}}>{saving?'Saving…':editId?'Save Changes':'Add'}</button>
              <button onClick={()=>{setShowDealForm(false);setEditId(null)}} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 120px 150px 100px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Deal</span><span>Contact</span><span>Value</span><span>Stage</span><span>Module</span><span></span></div>
            {filteredDeals.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>🏠</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No deals yet</div></div>):filteredDeals.map((d:any)=>(
              <div key={d.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 120px 150px 100px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{d.name}</span>
                <span style={{fontSize:12,color:'#667085'}}>{d.crm_contacts?.name||'—'}</span>
                <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>{d.value?'£'+parseFloat(d.value).toLocaleString():'—'}</span>
                <select value={d.stage} onChange={e=>updateDealStage(d.id,e.target.value)} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{DEAL_STAGES.map(s=><option key={s}>{s}</option>)}</select>
                <span>{moduleBadge(d.module)}</span>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>openEditDeal(d)} style={{fontSize:11,color:ACCENT,background:'none',border:'1px solid '+ACCENT,borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>delDeal(d.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Pipeline'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
            {DEAL_STAGES.map(stage=>(
              <div key={stage} style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:12,minHeight:200}}>
                <div style={{fontSize:10,fontWeight:700,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:8}}>{stage} ({filteredDeals.filter((d:any)=>d.stage===stage).length})</div>
                {filteredDeals.filter((d:any)=>d.stage===stage).map((d:any)=>(
                  <div key={d.id} style={{background:'#fff',borderRadius:8,border:'1px solid #E4E7EC',padding:10,marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#101828',marginBottom:2}}>{d.name}</div>
                    <div style={{fontSize:11,color:ACCENT,fontWeight:600,marginBottom:4}}>£{parseFloat(d.value||0).toLocaleString()}</div>
                    {moduleBadge(d.module)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>)}
      </div>
    </div>
  )
}
