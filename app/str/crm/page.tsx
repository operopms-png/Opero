'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const MODULE = 'str'
const ACCENT = '#3B4AFF'
const TITLE = 'Vacation Rentals'
const CONTACT_TYPES = ['guest','contact','vendor']
const DEAL_STAGES = ['Lead','Qualified','Proposal','Negotiation','Closed Won','Closed Lost']
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }
function Modal({ title, onClose, children }: any) {
  return <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={(e:any)=>e.target===e.currentTarget&&onClose()}><div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:520, margin:'0 16px', maxHeight:'90vh', overflowY:'auto' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}><h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>{title}</h2><button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button></div>{children}</div></div>
}
export default function Page() {
  const [section, setSection] = useState('Contacts')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [dragDeal, setDragDeal] = useState<string|null>(null)
  const today = new Date().toISOString().split('T')[0]
  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>{ if(!user){window.location.href='/login';return}; loadAll(); setLoading(false) }) }, [])
  async function loadAll() {
    const [c,d,t,a,m] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('module',MODULE).order('created_at',{ascending:false}),
      supabase.from('crm_deals').select('*,crm_contacts(name)').eq('module',MODULE).order('created_at',{ascending:false}),
      supabase.from('crm_tasks').select('*,crm_contacts(name)').eq('module',MODULE).order('due_date',{ascending:true}),
      supabase.from('crm_activities').select('*,crm_contacts(name)').eq('module',MODULE).order('created_at',{ascending:false}),
      supabase.from('crm_meetings').select('*,crm_contacts(name)').eq('module',MODULE).order('date',{ascending:true}),
    ])
    setContacts(c.data??[]); setDeals(d.data??[]); setTasks(t.data??[]); setActivities(a.data??[]); setMeetings(m.data??[])
  }
  async function save(table: string, data: any) {
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    if(editId){await supabase.from(table).update({...data}).eq('id',editId)}
    else{await supabase.from(table).insert([{...data,user_id:user?.id,module:MODULE}])}
    setSaving(false); setModal(null); setForm({}); setEditId(null); await loadAll()
  }
  async function del(table: string, id: string) { if(!confirm('Delete?'))return; await supabase.from(table).delete().eq('id',id); await loadAll() }
  function openEdit(mn: string, r: any) { setForm(r); setEditId(r.id); setModal(mn) }
  const filtered = (arr: any[]) => arr.filter(x => search===''||JSON.stringify(x).toLowerCase().includes(search.toLowerCase()))
  if(loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#98A2B3' }}>Loading...</div>
  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif", display:'flex' }}>
      <div style={{ width:200, background:'#fff', borderRight:'1px solid #F2F4F7', display:'flex', flexDirection:'column', paddingTop:16, flexShrink:0, minHeight:'100vh' }}>
        <div style={{ padding:'0 16px 16px', borderBottom:'1px solid #F2F4F7' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#98A2B3', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{TITLE}</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#101828' }}>CRM</div>
        </div>
        <nav style={{ flex:1, padding:'8px 10px' }}>
          {(['Contacts','Deals','Tasks','Meetings','Activity Feed'] as string[]).map(s=>(
            <button key={s} onClick={()=>setSection(s)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, border:'none', background:section===s?ACCENT+'18':'transparent', color:section===s?ACCENT:'#344054', fontSize:13, fontWeight:section===s?600:400, cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:1 }}>
              {s==='Contacts'?'👤':s==='Deals'?'💼':s==='Tasks'?'✓':s==='Meetings'?'📅':'⚡'} {s}
              {s==='Tasks'&&tasks.filter(t=>t.status==='pending'&&t.due_date<=today).length>0&&<span style={{ marginLeft:'auto', background:'#EF4444', color:'#fff', borderRadius:20, fontSize:10, fontWeight:700, padding:'1px 6px' }}>{tasks.filter(t=>t.status==='pending'&&t.due_date<=today).length}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <h1 style={{ fontSize:17, fontWeight:600, margin:0, color:'#101828' }}>{section}</h1>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:13, fontFamily:'inherit', width:200, outline:'none' }}/>
          </div>
          <div>
            {section==='Contacts'&&<button onClick={()=>{setModal('contact');setForm({module:MODULE});setEditId(null)}} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Contact</button>}
            {section==='Deals'&&<button onClick={()=>{setModal('deal');setForm({module:MODULE,stage:'Lead'});setEditId(null)}} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Deal</button>}
            {section==='Tasks'&&<button onClick={()=>{setModal('task');setForm({module:MODULE,status:'pending',priority:'medium'});setEditId(null)}} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Task</button>}
            {section==='Meetings'&&<button onClick={()=>{setModal('meeting');setForm({module:MODULE,status:'scheduled'});setEditId(null)}} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Schedule</button>}
            {section==='Activity Feed'&&<button onClick={()=>{setModal('activity');setForm({module:MODULE,type:'note'});setEditId(null)}} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Log Activity</button>}
          </div>
        </div>
        <div style={{ flex:1, padding:24, overflowY:'auto' }}>
          {section==='Contacts'&&(
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {[{l:'Total',v:filtered(contacts).length},{l:'Guests',v:filtered(contacts).filter(c=>c.type==='guest').length},{l:'Contacts',v:filtered(contacts).filter(c=>c.type==='contact').length},{l:'Vendors',v:filtered(contacts).filter(c=>c.type==='vendor').length}].map(s=>(
                  <div key={s.l} style={{ background:'#fff', borderRadius:10, border:'1px solid #E4E7EC', padding:'16px 20px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', marginBottom:4 }}>{s.l}</div><div style={{ fontSize:24, fontWeight:700, color:'#101828' }}>{s.v}</div></div>
                ))}
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 80px 100px', padding:'12px 20px', background:'#F9FAFB', borderBottom:'1px solid #E4E7EC', fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase' }}>
                  <span>Name</span><span>Email</span><span>Phone</span><span>Type</span><span></span>
                </div>
                {filtered(contacts).length===0?<div style={{ textAlign:'center', padding:60, color:'#98A2B3' }}>No contacts yet</div>:filtered(contacts).map(c=>(
                  <div key={c.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 80px 100px', padding:'14px 20px', borderBottom:'1px solid #F2F4F7', fontSize:13, alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}><div style={{ width:32, height:32, borderRadius:'50%', background:ACCENT+'18', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:ACCENT }}>{c.name.charAt(0)}</div><span style={{ fontWeight:500, color:'#101828' }}>{c.name}</span></div>
                    <span style={{ color:'#667085' }}>{c.email??'—'}</span><span style={{ color:'#667085' }}>{c.phone??'—'}</span>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:ACCENT+'18', color:ACCENT, textTransform:'capitalize' }}>{c.type}</span>
                    <div style={{ display:'flex', gap:6 }}><button onClick={()=>openEdit('contact',c)} style={{ fontSize:11, color:ACCENT, background:'none', border:`1px solid ${ACCENT}`, borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button><button onClick={()=>del('crm_contacts',c.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section==='Deals'&&(
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:16 }}>
              {DEAL_STAGES.map(stage=>{
                const sd=filtered(deals).filter(d=>d.stage===stage)
                return <div key={stage} style={{ minWidth:220, background:'#F7F8FA', borderRadius:12, border:'1px solid #E4E7EC', padding:12, flexShrink:0 }} onDragOver={e=>e.preventDefault()} onDrop={async()=>{if(dragDeal){await supabase.from('crm_deals').update({stage}).eq('id',dragDeal);setDragDeal(null);loadAll()}}}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}><span style={{ fontSize:12, fontWeight:600, color:'#344054' }}>{stage}</span><span style={{ fontSize:11, color:'#667085' }}>{sd.length} · £{sd.reduce((s,d)=>s+(d.value??0),0).toLocaleString()}</span></div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {sd.map(d=><div key={d.id} draggable onDragStart={()=>setDragDeal(d.id)} style={{ background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', padding:'12px 14px', cursor:'grab' }}>
                      <div style={{ fontWeight:500, fontSize:13, color:'#101828', marginBottom:4 }}>{d.name}</div>
                      <div style={{ fontSize:11, color:'#667085', marginBottom:6 }}>{d.crm_contacts?.name??'—'}</div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:12, fontWeight:600, color:'#10B981' }}>£{(d.value??0).toLocaleString()}</span><button onClick={()=>openEdit('deal',d)} style={{ fontSize:10, color:ACCENT, background:'none', border:`1px solid ${ACCENT}`, borderRadius:5, padding:'2px 7px', cursor:'pointer' }}>Edit</button></div>
                    </div>)}
                    <button onClick={()=>{setModal('deal');setForm({module:MODULE,stage});setEditId(null)}} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px dashed #D0D5DD', background:'none', fontSize:12, color:'#98A2B3', cursor:'pointer', fontFamily:'inherit' }}>+ Add</button>
                  </div>
                </div>
              })}
            </div>
          )}
          {section==='Tasks'&&(
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                {[{l:'Pending',v:filtered(tasks).filter(t=>t.status==='pending').length,c:'#F59E0B'},{l:'Overdue',v:filtered(tasks).filter(t=>t.status==='pending'&&t.due_date<today).length,c:'#EF4444'},{l:'Completed',v:filtered(tasks).filter(t=>t.status==='completed').length,c:'#10B981'}].map(s=>(
                  <div key={s.l} style={{ background:'#fff', borderRadius:10, border:'1px solid #E4E7EC', padding:'16px 20px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', marginBottom:4 }}>{s.l}</div><div style={{ fontSize:24, fontWeight:700, color:s.c }}>{s.v}</div></div>
                ))}
              </div>
              {filtered(tasks).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3' }}>No tasks yet</div>:filtered(tasks).map(t=>{
                const overdue=t.status==='pending'&&t.due_date<today
                return <div key={t.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${overdue?'#FEE2E2':'#E4E7EC'}`, padding:'14px 20px', display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', alignItems:'center', gap:14, marginBottom:8 }}>
                  <input type="checkbox" checked={t.status==='completed'} onChange={async()=>{await supabase.from('crm_tasks').update({status:t.status==='completed'?'pending':'completed'}).eq('id',t.id);loadAll()}} style={{ width:16, height:16, cursor:'pointer' }}/>
                  <div><div style={{ fontWeight:500, fontSize:14, color:t.status==='completed'?'#98A2B3':'#101828', textDecoration:t.status==='completed'?'line-through':'none' }}>{t.title}</div><div style={{ fontSize:11, color:'#667085' }}>{t.crm_contacts?.name}{t.due_date?` · Due: ${t.due_date}`:''}{overdue?' · Overdue':''}</div></div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.priority==='high'?'#FEE2E2':t.priority==='medium'?'#FEF3C7':'#F3F4F6', color:t.priority==='high'?'#DC2626':t.priority==='medium'?'#D97706':'#6B7280', textTransform:'uppercase' }}>{t.priority}</span>
                  <button onClick={()=>openEdit('task',t)} style={{ fontSize:11, color:ACCENT, background:'none', border:`1px solid ${ACCENT}`, borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('crm_tasks',t.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                </div>
              })}
            </div>
          )}
          {section==='Meetings'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered(meetings).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3' }}>No meetings scheduled</div>:filtered(meetings).map(m=>(
                <div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:ACCENT+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>📅</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{m.title}</div><div style={{ fontSize:12, color:'#667085' }}>{m.crm_contacts?.name}{m.date?` · ${m.date}`:''}{m.time?` at ${m.time}`:''}</div></div>
                  <button onClick={()=>openEdit('meeting',m)} style={{ fontSize:12, color:ACCENT, background:'none', border:`1px solid ${ACCENT}`, borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('crm_meetings',m.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
          {section==='Activity Feed'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered(activities).length===0?<div style={{ textAlign:'center', padding:80, color:'#98A2B3' }}>No activity yet</div>:filtered(activities).map(a=>(
                <div key={a.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{a.type==='call'?'📞':a.type==='email'?'✉️':a.type==='meeting'?'📅':'📝'}</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:500, fontSize:14, color:'#101828' }}>{a.subject}</div><div style={{ fontSize:13, color:'#667085', marginTop:4 }}>{a.body}</div><div style={{ fontSize:11, color:'#98A2B3', marginTop:6 }}>{a.crm_contacts?.name} · {new Date(a.created_at).toLocaleDateString('en-GB')}</div></div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#F3F4F6', color:'#6B7280', textTransform:'capitalize', alignSelf:'flex-start' }}>{a.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {modal==='contact'&&<Modal title={editId?'Edit Contact':'Add Contact'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}><div style={{ display:'flex', flexDirection:'column', gap:14 }}><div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John Smith"/></div><div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label style={lbl}>Type</label><select style={{...inp,cursor:'pointer'}} value={form.type??'guest'} onChange={e=>setForm({...form,type:e.target.value})}>{CONTACT_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></div><div><label style={lbl}>Source</label><input style={inp} value={form.source??''} onChange={e=>setForm({...form,source:e.target.value})} placeholder="Airbnb, Referral..."/></div><div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'} as React.CSSProperties} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div></div><div style={{ display:'flex', gap:10, marginTop:24 }}><button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button><button onClick={()=>save('crm_contacts',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving...':editId?'Save':'Add Contact'}</button></div></Modal>}
      {modal==='deal'&&<Modal title={editId?'Edit Deal':'Add Deal'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}><div style={{ display:'flex', flexDirection:'column', gap:14 }}><div><label style={lbl}>Deal Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><label style={lbl}>Contact</label><select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Select...</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}><div><label style={lbl}>Stage</label><select style={{...inp,cursor:'pointer'}} value={form.stage??'Lead'} onChange={e=>setForm({...form,stage:e.target.value})}>{DEAL_STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label style={lbl}>Value (£)</label><input type="number" style={inp} value={form.value??''} onChange={e=>setForm({...form,value:parseFloat(e.target.value)})}/></div></div><div><label style={lbl}>Close Date</label><input type="date" style={inp} value={form.close_date??''} onChange={e=>setForm({...form,close_date:e.target.value})}/></div></div><div style={{ display:'flex', gap:10, marginTop:24 }}><button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button><button onClick={()=>save('crm_deals',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving...':editId?'Save':'Add Deal'}</button></div></Modal>}
      {modal==='task'&&<Modal title={editId?'Edit Task':'Add Task'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}><div style={{ display:'flex', flexDirection:'column', gap:14 }}><div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})}/></div><div><label style={lbl}>Contact</label><select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Select...</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}><div><label style={lbl}>Due Date</label><input type="date" style={inp} value={form.due_date??''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div><div><label style={lbl}>Priority</label><select style={{...inp,cursor:'pointer'}} value={form.priority??'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div></div><div style={{ display:'flex', gap:10, marginTop:24 }}><button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button><button onClick={()=>save('crm_tasks',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving...':editId?'Save':'Add Task'}</button></div></Modal>}
      {modal==='meeting'&&<Modal title={editId?'Edit Meeting':'Schedule Meeting'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}><div style={{ display:'flex', flexDirection:'column', gap:14 }}><div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})}/></div><div><label style={lbl}>Contact</label><select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Select...</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}><div><label style={lbl}>Date</label><input type="date" style={inp} value={form.date??''} onChange={e=>setForm({...form,date:e.target.value})}/></div><div><label style={lbl}>Time</label><input type="time" style={inp} value={form.time??''} onChange={e=>setForm({...form,time:e.target.value})}/></div></div><div><label style={lbl}>Location</label><input style={inp} value={form.location??''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Zoom / Address"/></div></div><div style={{ display:'flex', gap:10, marginTop:24 }}><button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button><button onClick={()=>save('crm_meetings',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving...':editId?'Save':'Schedule'}</button></div></Modal>}
      {modal==='activity'&&<Modal title="Log Activity" onClose={()=>{setModal(null);setEditId(null);setForm({})}}><div style={{ display:'flex', flexDirection:'column', gap:14 }}><div><label style={lbl}>Type</label><select style={{...inp,cursor:'pointer'}} value={form.type??'note'} onChange={e=>setForm({...form,type:e.target.value})}><option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option></select></div><div><label style={lbl}>Contact</label><select style={{...inp,cursor:'pointer'}} value={form.contact_id??''} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Select...</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label style={lbl}>Subject *</label><input style={inp} value={form.subject??''} onChange={e=>setForm({...form,subject:e.target.value})}/></div><div><label style={lbl}>Details</label><textarea style={{...inp,resize:'vertical'} as React.CSSProperties} rows={3} value={form.body??''} onChange={e=>setForm({...form,body:e.target.value})}/></div></div><div style={{ display:'flex', gap:10, marginTop:24 }}><button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button><button onClick={()=>save('crm_activities',form)} disabled={saving||!form.subject} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.subject?0.6:1 }}>{saving?'Saving...':'Log Activity'}</button></div></Modal>}
    </div>
  )
}
