'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const DEAL_STAGES = ['Lead','Qualified','Proposal','Negotiation','Closed Won','Closed Lost']
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:520, margin:'0 16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function CRMPage() {
  const [section, setSection] = useState('Contacts')
  const [module, setModule] = useState('all')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [dragDeal, setDragDeal] = useState<string|null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      await loadAll()
      setLoading(false)
    }
    init()
  }, [])

  async function loadAll() {
    const [c,co,d,t,a,m] = await Promise.all([
      supabase.from('crm_contacts').select('*').order('created_at',{ascending:false}),
      supabase.from('crm_companies').select('*').order('created_at',{ascending:false}),
      supabase.from('crm_deals').select('*,crm_contacts(name)').order('created_at',{ascending:false}),
      supabase.from('crm_tasks').select('*,crm_contacts(name)').order('due_date',{ascending:true}),
      supabase.from('crm_activities').select('*,crm_contacts(name)').order('created_at',{ascending:false}),
      supabase.from('crm_meetings').select('*,crm_contacts(name)').order('date',{ascending:true}),
    ])
    setContacts(c.data??[]); setCompanies(co.data??[]); setDeals(d.data??[])
    setTasks(t.data??[]); setActivities(a.data??[]); setMeetings(m.data??[])
  }

  async function save(table: string, data: any) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) { await supabase.from(table).update({...data}).eq('id',editId) }
    else { await supabase.from(table).insert([{...data,user_id:user?.id}]) }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await loadAll()
  }

  async function del(table: string, id: string) {
    if (!confirm('Delete?')) return
    await supabase.from(table).delete().eq('id',id)
    await loadAll()
  }

  function openEdit(mn: string, r: any) { setForm(r); setEditId(r.id); setModal(mn) }

  const filtered = (arr: any[]) => arr.filter(x =>
    (module==='all'||x.module===module) &&
    (search===''||JSON.stringify(x).toLowerCase().includes(search.toLowerCase()))
  )

  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", color:'#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif", display:'flex' }}>
      <div style={{ width:220, background:'#fff', borderRight:'1px solid #F2F4F7', display:'flex', flexDirection:'column', paddingTop:16, flexShrink:0, minHeight:'100vh' }}>
        <div style={{ padding:'0 16px 16px', borderBottom:'1px solid #F2F4F7' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#101828', marginBottom:10 }}>CRM</div>
          <select value={module} onChange={e=>setModule(e.target.value)} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="all">All Modules</option>
            <option value="str">Vacation Rentals</option>
            <option value="pm">Property Management</option>
            <option value="dev">Developments</option>
          </select>
        </div>
        <nav style={{ flex:1, padding:'8px 10px', overflowY:'auto' }}>
          {[{label:'Contacts',icon:'👤'},{label:'Companies',icon:'🏢'},{label:'Deals',icon:'💼'},{label:'Tasks',icon:'✓'},{label:'Meetings',icon:'📅'},{label:'Activity Feed',icon:'⚡'},{label:'Inbox',icon:'✉️'},{label:'Calls',icon:'📞'}].map(s=>(
            <button key={s.label} onClick={()=>setSection(s.label)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, border:'none', background:section===s.label?'#EEF0FF':'transparent', color:section===s.label?'#3B4AFF':'#344054', fontSize:13, fontWeight:section===s.label?600:400, cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:1 }}>
              <span style={{ fontSize:14 }}>{s.icon}</span>
              {s.label}
              {s.label==='Tasks'&&tasks.filter(t=>t.status==='pending'&&t.due_date<=today).length>0&&(
                <span style={{ marginLeft:'auto', background:'#EF4444', color:'#fff', borderRadius:20, fontSize:10, fontWeight:700, padding:'1px 6px' }}>{tasks.filter(t=>t.status==='pending'&&t.due_date<=today).length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <h1 style={{ fontSize:17, fontWeight:600, margin:0, color:'#101828' }}>{section}</h1>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:13, fontFamily:'inherit', width:220, outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {section==='Contacts'&&<button onClick={()=>{setModal('contact');setForm({module});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Contact</button>}
            {section==='Companies'&&<button onClick={()=>{setModal('company');setForm({});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Company</button>}
            {section==='Deals'&&<button onClick={()=>{setModal('deal');setForm({module,stage:'Lead'});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Deal</button>}
            {section==='Tasks'&&<button onClick={()=>{setModal('task');setForm({module,status:'pending',priority:'medium'});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Task</button>}
            {section==='Meetings'&&<button onClick={()=>{setModal('meeting');setForm({module,status:'scheduled'});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Schedule Meeting</button>}
            {section==='Activity Feed'&&<button onClick={()=>{setModal('activity');setForm({module,type:'note'});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Log Activity</button>}
          </div>
        </div>

        <div style={{ flex:1, padding:24, overflowY:'auto' }}>

          {section==='Contacts'&&(
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {[{label:'Total',value:filtered(contacts).length},{label:'Guests',value:filtered(contacts).filter((c:any)=>c.type==='guest').length},{label:'Landlords',value:filtered(contacts).filter((c:any)=>c.type==='landlord').length},{label:'Investors',value:filtered(contacts).filter((c:any)=>c.type==='investor').length}].map((s:any)=>(
                  <div key={s.label} style={{ background:'#fff', borderRadius:10, border:'1px solid #E4E7EC', padding:'16px 20px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:'#101828' }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 80px 80px 100px', padding:'12px 20px', background:'#F9FAFB', borderBottom:'1px solid #E4E7EC', fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase' }}>
                  <span>Name</span><span>Email</span><span>Phone</span><span>Type</span><span>Module</span><span></span>
                </div>
                {filtered(contacts).length===0?<div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No contacts yet</div>:
                filtered(contacts).map((c:any)=>(
                  <div key={c.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 80px 80px 100px', padding:'14px 20px', borderBottom:'1px solid #F2F4F7', fontSize:13, color:'#344054', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#3B4AFF', flexShrink:0 }}>{c.name.charAt(0)}</div>
                      <span style={{ fontWeight:500, color:'#101828' }}>{c.name}</span>
                    </div>
                    <span style={{ color:'#667085' }}>{c.email??'—'}</span>
                    <span style={{ color:'#667085' }}>{c.phone??'—'}</span>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#EEF0FF', color:'#3B4AFF', textTransform:'capitalize' }}>{c.type}</span>
                    <span style={{ fontSize:11, color:'#98A2B3', textTransform:'uppercase' }}>{c.module}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>openEdit('contact',c)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>del('crm_contacts',c.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section==='Companies'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered(companies).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No companies yet</div>:
              filtered(companies).map((c:any)=>(
                <div key={c.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, color:'#3B4AFF' }}>{c.name.charAt(0)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{c.name}</div>
                    <div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{[c.industry,c.website].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button onClick={()=>openEdit('company',c)} style={{ fontSize:12, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('crm_companies',c.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {section==='Deals'&&(
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:16 }}>
              {DEAL_STAGES.map(stage=>{
                const sd=filtered(deals).filter((d:any)=>d.stage===stage)
                const sv=sd.reduce((s:number,d:any)=>s+(d.value??0),0)
                return(
                  <div key={stage} style={{ minWidth:220, background:'#F7F8FA', borderRadius:12, border:'1px solid #E4E7EC', padding:12, flexShrink:0 }}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={async()=>{if(dragDeal){await supabase.from('crm_deals').update({stage}).eq('id',dragDeal);setDragDeal(null);loadAll()}}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#344054' }}>{stage}</div>
                      <span style={{ fontSize:11, color:'#667085' }}>{sd.length} · £{sv.toLocaleString()}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {sd.map((d:any)=>(
                        <div key={d.id} draggable onDragStart={()=>setDragDeal(d.id)} style={{ background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', padding:'12px 14px', cursor:'grab' }}>
                          <div style={{ fontWeight:500, fontSize:13, color:'#101828', marginBottom:4 }}>{d.name}</div>
                          <div style={{ fontSize:11, color:'#667085', marginBottom:6 }}>{d.crm_contacts?.name??'—'}</div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:12, fontWeight:600, color:'#10B981' }}>£{(d.value??0).toLocaleString()}</span>
                            <button onClick={()=>openEdit('deal',d)} style={{ fontSize:10, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:5, padding:'2px 7px', cursor:'pointer' }}>Edit</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>{setModal('deal');setForm({module,stage});setEditId(null)}} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px dashed #D0D5DD', background:'none', fontSize:12, color:'#98A2B3', cursor:'pointer', fontFamily:'inherit' }}>+ Add deal</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {section==='Tasks'&&(
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                {[{label:'Pending',value:filtered(tasks).filter((t:any)=>t.status==='pending').length,color:'#F59E0B'},{label:'Overdue',value:filtered(tasks).filter((t:any)=>t.status==='pending'&&t.due_date<today).length,color:'#EF4444'},{label:'Completed',value:filtered(tasks).filter((t:any)=>t.status==='completed').length,color:'#10B981'}].map((s:any)=>(
                  <div key={s.label} style={{ background:'#fff', borderRadius:10, border:'1px solid #E4E7EC', padding:'16px 20px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {filtered(tasks).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No tasks yet</div>:
                filtered(tasks).map((t:any)=>{
                  const overdue=t.status==='pending'&&t.due_date<today
                  return(
                    <div key={t.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${overdue?'#FEE2E2':'#E4E7EC'}`, padding:'14px 20px', display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', alignItems:'center', gap:14 }}>
                      <input type="checkbox" checked={t.status==='completed'} onChange={async()=>{await supabase.from('crm_tasks').update({status:t.status==='completed'?'pending':'completed'}).eq('id',t.id);loadAll()}} style={{ width:16, height:16, cursor:'pointer' }}/>
                      <div>
                        <div style={{ fontWeight:500, fontSize:14, color:t.status==='completed'?'#98A2B3':'#101828', textDecoration:t.status==='completed'?'line-through':'none' }}>{t.title}</div>
                        <div style={{ fontSize:11, color:'#667085', marginTop:2 }}>{t.crm_contacts?.name}{t.due_date?` · Due: ${t.due_date}`:''}{overdue?' · Overdue':''}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.priority==='high'?'#FEE2E2':t.priority==='medium'?'#FEF3C7':'#F3F4F6', color:t.priority==='high'?'#DC2626':t.priority==='medium'?'#D97706':'#6B7280', textTransform:'uppercase' }}>{t.priority}</span>
                      <button onClick={()=>openEdit('task',t)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>del('crm_tasks',t.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {section==='Meetings'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered(meetings).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No meetings scheduled</div>:
              filtered(meetings).map((m:any)=>(
                <div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>📅</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{m.title}</div>
                    <div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{m.crm_contacts?.name}{m.date?` · ${m.date}`:''}{m.time?` at ${m.time}`:''}{m.location?` · ${m.location}`:''}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:m.status==='completed'?'#D1FAE5':'#DBEAFE', color:m.status==='completed'?'#059669':'#2563EB' }}>{m.status}</span>
                  <button onClick={()=>openEdit('meeting',m)} style={{ fontSize:12, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('crm_meetings',m.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {section==='Activity Feed'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered(activities).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3', fontSize:14 }}>No activity logged yet</div>:
              filtered(activities).map((a:any)=>(
                <div key={a.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:a.type==='call'?'#D1FAE5':a.type==='email'?'#DBEAFE':'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                    {a.type==='call'?'📞':a.type==='email'?'✉️':a.type==='meeting'?'📅':'📝'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, fontSize:14, color:'#101828' }}>{a.subject}</div>
                    <div style={{ fontSize:13, color:'#667085', marginTop:4, lineHeight:1.5 }}>{a.body}</div>
                    <div style={{ fontSize:11, color:'#98A2B3', marginTop:6 }}>{a.crm_contacts?.name} · {new Date(a.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#F3F4F6', color:'#6B7280', textTransform:'capitalize', alignSelf:'flex-start' }}>{a.type}</span>
                </div>
              ))}
            </div>
          )}

          {section==='Inbox'&&(
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:8 }}>
              {[{icon:'✉️',title:'Team Email',desc:'Manage and respond to team emails'},{icon:'💬',title:'Chat',desc:'Connect live chat on your website'},{icon:'📋',title:'Forms',desc:'Connect and respond to forms'},{icon:'📘',title:'Facebook Messenger',desc:'Start receiving Messenger conversations'},{icon:'📱',title:'WhatsApp',desc:'Start receiving WhatsApp conversations'},{icon:'📞',title:'Calling',desc:'Start making and receiving calls'}].map(c=>(
                <div key={c.title} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px', textAlign:'center' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>{c.icon}</div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#101828', marginBottom:6 }}>{c.title}</div>
                  <div style={{ fontSize:12, color:'#667085', lineHeight:1.5 }}>{c.desc}</div>
                  <button style={{ marginTop:16, padding:'8px 20px', borderRadius:8, border:'1px solid #D0D5DD', background:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'#344054' }}>Connect</button>
                </div>
              ))}
            </div>
          )}

          {section==='Calls'&&(
            <div style={{ textAlign:'center', padding:60 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📞</div>
              <div style={{ fontSize:16, fontWeight:600, color:'#101828', marginBottom:8 }}>Call Logging</div>
              <div style={{ fontSize:14, color:'#667085', marginBottom:24 }}>Log calls against contacts and track your outreach history</div>
              <button onClick={()=>{setModal('activity');setForm({module,type:'call'});setEditId(null)}} style={{ background:'#3B4AFF', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>+ Log a Call</button>
            </div>
          )}

        </div>
      </div>

      {modal==='contact'&&(
        <Modal title={editId?'Edit Contact':'Add Contact'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John Smith"/></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div><label style={lbl}>Company</label><input style={inp} value={form.company??''} onChange={e=>setForm({...form,company:e.target.value})}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Type</label>
                <select style={{...inp,cursor:'pointer'}} value={form.type??'contact'} onChange={e=>setForm({...form,type:e.target.value})}>
                  <option value="contact">Contact</option>
                  <option value="guest">Guest</option>
                  <option value="landlord">Landlord</option>
                  <option value="tenant">Tenant</option>
                  <option value="investor">Investor</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div><label style={lbl}>Module</label>
                <select style={{...inp,cursor:'pointer'}} value={form.module??'str'} onChange={e=>setForm({...form,module:e.target.value})}>
                  <option value="str">Vacation Rentals</option>
                  <option value="pm">Property Management</option>
                  <option value="dev">Developments</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Source</label><input style={inp} value={form.source??''} onChange={e=>setForm({...form,source:e.target.value})} placeholder="e.g. Airbnb, Referral"/></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_contacts',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving...':editId?'Save Changes':'Add Contact'}</button>
          </div>
        </Modal>
      )}

      {modal==='company'&&(
        <Modal title={editId?'Edit Company':'Add Company'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Company Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Acme Ltd"/></div>
            <div><label style={lbl}>Industry</label><input style={inp} value={form.industry??''} onChange={e=>setForm({...form,industry:e.target.value})}/></div>
            <div><label style={lbl}>Website</label><input type="url" style={inp} value={form.website??''} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://..."/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div><label style={lbl}>Address</label><input style={inp} value={form.address??''} onChange={e=>setForm({...form,address:e.target.value})}/></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_companies',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving...':editId?'Save Changes':'Add Company'}</button>
          </div>
        </Modal>
      )}

      {modal==='deal'&&(
        <Modal title={editId?'Edit Deal':'Add Deal'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Deal Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Rose Hall Deal"/></div>
            <div><label style={lbl}>Contact</label>
              <select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}>
                <option value="">Select contact...</option>
                {contacts.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Stage</label>
                <select style={{...inp,cursor:'pointer'}} value={form.stage??'Lead'} onChange={e=>setForm({...form,stage:e.target.value})}>
                  {DEAL_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Value (£)</label><input type="number" style={inp} value={form.value??''} onChange={e=>setForm({...form,value:parseFloat(e.target.value)})}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Close Date</label><input type="date" style={inp} value={form.close_date??''} onChange={e=>setForm({...form,close_date:e.target.value})}/></div>
              <div><label style={lbl}>Module</label>
                <select style={{...inp,cursor:'pointer'}} value={form.module??'str'} onChange={e=>setForm({...form,module:e.target.value})}>
                  <option value="str">Vacation Rentals</option>
                  <option value="pm">Property Management</option>
                  <option value="dev">Developments</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_deals',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving...':editId?'Save Changes':'Add Deal'}</button>
          </div>
        </Modal>
      )}

      {modal==='task'&&(
        <Modal title={editId?'Edit Task':'Add Task'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Follow up with investor"/></div>
            <div><label style={lbl}>Contact</label>
              <select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}>
                <option value="">Select contact...</option>
                {contacts.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.due_date??''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
              <div><label style={lbl}>Priority</label>
                <select style={{...inp,cursor:'pointer'}} value={form.priority??'medium'} onChange={e=>setForm({...form,priority:e.target.value})}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_tasks',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving...':editId?'Save Changes':'Add Task'}</button>
          </div>
        </Modal>
      )}

      {modal==='meeting'&&(
        <Modal title={editId?'Edit Meeting':'Schedule Meeting'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Property viewing call"/></div>
            <div><label style={lbl}>Contact</label>
              <select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}>
                <option value="">Select contact...</option>
                {contacts.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.date??''} onChange={e=>setForm({...form,date:e.target.value})}/></div>
              <div><label style={lbl}>Time</label><input type="time" style={inp} value={form.time??''} onChange={e=>setForm({...form,time:e.target.value})}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Duration (mins)</label><input type="number" style={inp} value={form.duration_mins??30} onChange={e=>setForm({...form,duration_mins:parseInt(e.target.value)})}/></div>
              <div><label style={lbl}>Location</label><input style={inp} value={form.location??''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Zoom / Address"/></div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_meetings',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving...':editId?'Save Changes':'Schedule'}</button>
          </div>
        </Modal>
      )}

      {modal==='activity'&&(
        <Modal title="Log Activity" onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Type</label>
              <select style={{...inp,cursor:'pointer'}} value={form.type??'note'} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option>
              </select>
            </div>
            <div><label style={lbl}>Contact</label>
              <select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}>
                <option value="">Select contact...</option>
                {contacts.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Subject *</label><input style={inp} value={form.subject??''} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g. Spoke about investment"/></div>
            <div><label style={lbl}>Details</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.body??''} onChange={e=>setForm({...form,body:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('crm_activities',form)} disabled={saving||!form.subject} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#3B4AFF', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.subject?0.6:1 }}>{saving?'Saving...':'Log Activity'}</button>
          </div>
        </Modal>
      )}

    </div>
  )
}
