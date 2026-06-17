'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#3B4AFF'
const inp = {width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}
const lbl = {fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block' as const}

export default function Page() {
  const [section, setSection] = useState('Contacts')
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<any[]>([])
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({name:'',email:'',phone:'',type:'Landlord',status:'Active',notes:''})
  const [deals, setDeals] = useState<any[]>([])
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealForm, setDealForm] = useState({name:'',contact:'',value:'',stage:'Enquiry',type:'Sale',notes:''})

  useEffect(()=>{ supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; setLoading(false) }) },[])
  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>ESTATE AGENCY</div><div style={{fontSize:15,fontWeight:700,color:'#101828'}}>CRM</div></div>
        <div style={{display:'flex',gap:8}}>
          {section==='Contacts'&&<button onClick={()=>setShowContactForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Contact</button>}
          {section==='Deals'&&<button onClick={()=>setShowDealForm(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Deal</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:0,padding:'0 28px',background:'#fff',borderBottom:'1px solid #E4E7EC'}}>
        {['Contacts','Deals','Pipeline'].map(s=><button key={s} onClick={()=>setSection(s)} style={{padding:'12px 16px',border:'none',background:'transparent',fontSize:13,fontWeight:section===s?600:400,color:section===s?ACCENT:'#667085',borderBottom:section===s?'2px solid '+ACCENT:'2px solid transparent',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>)}
      </div>
      <div style={{padding:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Contacts',v:contacts.length},{l:'Deals',v:deals.length},{l:'Landlords',v:contacts.filter((c:any)=>c.type==='Landlord').length},{l:'Won Deals',v:deals.filter((d:any)=>d.stage==='Won').length}].map((s:any)=>(
            <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:18,textAlign:'center' as const}}>
              <div style={{fontSize:26,fontWeight:700,color:ACCENT,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {section==='Contacts'&&(<div>
          {showContactForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add Contact</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Name *</label><input value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})} placeholder="Full name" style={inp}/></div>
              <div><label style={lbl}>Email</label><input value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})} type="email" style={inp}/></div>
              <div><label style={lbl}>Phone</label><input value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})} placeholder="+44..." style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={contactForm.type} onChange={e=>setContactForm({...contactForm,type:e.target.value})} style={inp}>{['Landlord','Tenant','Buyer','Seller','Investor','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!contactForm.name)return;setContacts([...contacts,{id:Date.now(),...contactForm}]);setContactForm({name:'',email:'',phone:'',type:'Landlord',status:'Active',notes:''});setShowContactForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
              <button onClick={()=>setShowContactForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 180px 140px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Name</span><span>Email</span><span>Phone</span><span>Type</span><span></span></div>
            {contacts.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>👥</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No contacts yet</div></div>):contacts.map((c:any)=>(
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 180px 140px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{c.name}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.email||'—'}</span>
                <span style={{fontSize:12,color:'#667085'}}>{c.phone||'—'}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT,fontWeight:600}}>{c.type}</span>
                <button onClick={()=>setContacts(contacts.filter((x:any)=>x.id!==c.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Deals'&&(<div>
          {showDealForm&&(<div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add Deal</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={lbl}>Deal Name *</label><input value={dealForm.name} onChange={e=>setDealForm({...dealForm,name:e.target.value})} placeholder="e.g. 3 bed sale" style={inp}/></div>
              <div><label style={lbl}>Contact</label><input value={dealForm.contact} onChange={e=>setDealForm({...dealForm,contact:e.target.value})} placeholder="Contact name" style={inp}/></div>
              <div><label style={lbl}>Value (£)</label><input value={dealForm.value} onChange={e=>setDealForm({...dealForm,value:e.target.value})} type="number" style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={dealForm.type} onChange={e=>setDealForm({...dealForm,type:e.target.value})} style={inp}>{['Sale','Let','Management','Valuation'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Stage</label><select value={dealForm.stage} onChange={e=>setDealForm({...dealForm,stage:e.target.value})} style={inp}>{['Enquiry','Viewing','Offer','Negotiation','Won','Lost'].map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{if(!dealForm.name)return;setDeals([...deals,{id:Date.now(),...dealForm}]);setDealForm({name:'',contact:'',value:'',stage:'Enquiry',type:'Sale',notes:''});setShowDealForm(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
              <button onClick={()=>setShowDealForm(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>)}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 100px 60px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}><span>Deal</span><span>Contact</span><span>Value</span><span>Type</span><span>Stage</span><span></span></div>
            {deals.length===0?(<div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>🏠</div><div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:6}}>No deals yet</div></div>):deals.map((d:any)=>(
              <div key={d.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 100px 60px',padding:'13px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:'#101828'}}>{d.name}</span>
                <span style={{fontSize:12,color:'#667085'}}>{d.contact||'—'}</span>
                <span style={{fontSize:13,fontWeight:600,color:ACCENT}}>{d.value?'£'+parseFloat(d.value).toLocaleString():'—'}</span>
                <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:'#EEF1FF',color:ACCENT}}>{d.type}</span>
                <select value={d.stage} onChange={e=>setDeals(deals.map((x:any)=>x.id===d.id?{...x,stage:e.target.value}:x))} style={{fontSize:11,border:'1px solid #E4E7EC',borderRadius:4,padding:'3px 6px',fontFamily:'inherit'}}>{['Enquiry','Viewing','Offer','Negotiation','Won','Lost'].map(s=><option key={s}>{s}</option>)}</select>
                <button onClick={()=>setDeals(deals.filter((x:any)=>x.id!==d.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            ))}
          </div>
        </div>)}

        {section==='Pipeline'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
            {['Enquiry','Viewing','Offer','Negotiation','Won','Lost'].map(stage=>(
              <div key={stage} style={{background:'#F9FAFB',borderRadius:10,border:'1px solid #E4E7EC',padding:12,minHeight:200}}>
                <div style={{fontSize:10,fontWeight:700,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:8}}>{stage} ({deals.filter((d:any)=>d.stage===stage).length})</div>
                {deals.filter((d:any)=>d.stage===stage).map((d:any)=>(
                  <div key={d.id} style={{background:'#fff',borderRadius:8,border:'1px solid #E4E7EC',padding:10,marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#101828',marginBottom:2}}>{d.name}</div>
                    <div style={{fontSize:11,color:ACCENT,fontWeight:600}}>£{parseFloat(d.value||0).toLocaleString()}</div>
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