'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import WeatherWidget from '@/components/WeatherWidget'
import { useRole, getAllowedTab } from '@/lib/useRole'

const TABS = ['Home','Bookings','Properties','Cleaning','Maintenance','Analytics','Integrations','Team','Reports','Expenses','Banking','Guest Comms']
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

async function uploadAttachment(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('pm-files').getPublicUrl(path)
  return data.publicUrl
}
function isVideoUrl(url: string) { return /\.(mp4|mov|webm|m4v)$/i.test(url) }
function parseMedia(val: string | null | undefined): string[] {
  if (!val) return []
  try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed.filter(Boolean) } catch {}
  return val.startsWith('http') ? [val] : []
}

function MediaPicker({ label, urls, onChange }: { label: string; urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  return (
    <div>
      <label style={lbl}>{label}</label>
      {urls.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          {urls.map((url, i) => (
            <div key={i} style={{ position:'relative' }}>
              {isVideoUrl(url)
                ? <video src={url} style={{ height:70, width:70, objectFit:'cover', borderRadius:6, display:'block' }} controls />
                : <img src={url} alt="" style={{ height:70, width:70, objectFit:'cover', borderRadius:6, display:'block' }} />
              }
              <button onClick={()=>onChange(urls.filter((_,idx)=>idx!==i))} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#DC2626', color:'#fff', border:'2px solid #fff', fontSize:11, lineHeight:'14px', cursor:'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px dashed #D0D5DD', borderRadius:8, cursor:'pointer', fontSize:13, color:'#667085' }}>
        {uploading ? 'Uploading…' : '📎 Add photo/video'}
        <input type="file" accept="image/*,video/*" multiple style={{ display:'none' }} onChange={async e=>{
          const files = Array.from(e.target.files ?? [])
          if (!files.length) return
          setUploading(true)
          const uploaded = await Promise.all(files.map(f=>uploadAttachment(f,'cleaning')))
          onChange([...urls, ...uploaded.filter((u): u is string => !!u)])
          setUploading(false)
          e.target.value = ''
        }} />
      </label>
    </div>
  )
}

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:500, margin:'0 16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#667085' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function STRPage() {
  const [tab, setTab] = useState('Home')
  const { role, propertyIds, loading: roleLoading } = useRole()
  const allowedTab = getAllowedTab(role, 'str')

  useEffect(() => { window.scrollTo(0, 0) }, [tab])
  useEffect(() => { if (allowedTab) setTab(allowedTab) }, [allowedTab])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ properties:0, cleaning:0, maintenance:0, revenue:0 })
  const [commTemplates, setCommTemplates] = useState<any[]>([])
  const [activeTemplateKey, setActiveTemplateKey] = useState('welcome')
  const [templateDraft, setTemplateDraft] = useState('')
  const [templateSubjectDraft, setTemplateSubjectDraft] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const DEFAULT_TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
    welcome: { label: 'Welcome Message', subject: 'Welcome to your stay!', body: "Hi {guest_name},\n\nWelcome! We're excited to host you.\n\nCheck-in: {check_in}\nCheck-out: {check_out}\n\nPlease don't hesitate to reach out if you need anything.\n\nBest regards" },
    checkin: { label: 'Check-in Instructions', subject: 'Your check-in details', body: "Hi {guest_name},\n\nYour check-in is coming up on {check_in}. Here's everything you need:\n\nAddress: \nWiFi: \nLockbox code: \n\nSafe travels!" },
    checkout: { label: 'Check-out Reminder', subject: 'Check-out reminder', body: "Hi {guest_name},\n\nJust a reminder that check-out is on {check_out}. Please leave the keys in the lockbox and lock up on your way out.\n\nThanks for staying with us!" },
    review: { label: 'Review Request', subject: 'How was your stay?', body: "Hi {guest_name},\n\nThanks for staying with us! If you had a great time, we'd really appreciate a review — it means a lot to our small team.\n\nHope to host you again soon!" },
  }

  function selectTemplate(key: string) {
    setActiveTemplateKey(key)
    const saved = commTemplates.find((t:any) => t.template_key === key)
    setTemplateSubjectDraft(saved?.subject ?? DEFAULT_TEMPLATES[key].subject)
    setTemplateDraft(saved?.body ?? DEFAULT_TEMPLATES[key].body)
  }

  async function saveTemplate() {
    setSavingTemplate(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('guest_comm_templates').upsert({
      user_id: user?.id, template_key: activeTemplateKey, subject: templateSubjectDraft, body: templateDraft, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,template_key' })
    setSavingTemplate(false)
    if (error) { alert(error.message); return }
    await loadAll()
  }

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(templateDraft)
      alert('Copied!')
    } catch {
      alert('Could not copy — select the text and copy manually.')
    }
  }
  const [bookings, setBookings] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [cleaning, setCleaning] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false,notes:''})
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBank, setShowAddBank] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [bankForm, setBankForm] = useState({name:'',type:'Current',balance:'',currency:'GBP'})
  const [txForm, setTxForm] = useState({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'})
  const [bankingTab, setBankingTab] = useState('Overview')
  const [reportTab, setReportTab] = useState('P&L')

  useEffect(() => {
    if (roleLoading) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      await loadAll(user.id)
      setLoading(false)
    }
    load()
  }, [roleLoading, propertyIds])

  useEffect(() => { selectTemplate(activeTemplateKey) }, [commTemplates])

  async function loadAll(uid?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = uid || user?.id
    // properties has a user_id column, but bookings/cleaning_tasks/
    // maintenance_tickets don't — they only relate to the
    // business via property_id, so fetch properties first and filter
    // the rest by that (same fix as the owner-portal).
    const { data: propsData } = await supabase.from('properties').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    let restrictedProps = propsData ?? []
    if (propertyIds.length > 0) restrictedProps = restrictedProps.filter((p: any) => propertyIds.includes(p.id))
    const ids = restrictedProps.map((p: any) => p.id)
    const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
    const [b, c, m, tm, ex, ct] = await Promise.all([
      supabase.from('bookings').select('*, properties(name)').in('property_id', safeIds).order('check_in', { ascending: false }),
      supabase.from('cleaning_tasks').select('*, properties(name)').in('property_id', safeIds).order('scheduled_date', { ascending: true }),
      supabase.from('maintenance_tickets').select('*, properties(name)').in('property_id', safeIds).order('created_at', { ascending: false }),
      supabase.from('team_members').select('*').eq('user_id', userId),
      supabase.from('office_expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('guest_comm_templates').select('*').eq('user_id', userId),
    ])
    setCommTemplates(ct.data ?? [])
    setProperties(restrictedProps)
    setBookings(b.data ?? [])
    setCleaning(c.data ?? [])
    setMaintenance(m.data ?? [])
    setTeam(tm.data ?? [])
    setExpenses(ex.data ?? [])
    const rev = (b.data ?? []).filter((x:any) => x.status !== 'cancelled').reduce((s:number, x:any) => s + (x.total_amount ?? 0), 0)
    setStats({ properties:restrictedProps.length, cleaning:(c.data??[]).filter((x:any)=>x.status==='pending').length, maintenance:(m.data??[]).filter((x:any)=>x.status==='open').length, revenue:rev })
  }

  async function addOfficeExpense() {
    if (!expForm.description || !expForm.amount) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('office_expenses').insert({ ...expForm, amount: parseFloat(expForm.amount), user_id: user?.id })
    if (error) { alert(error.message); return }
    await loadAll()
    setExpForm({description:'',vendor:'',category:'Overhead',amount:'',date:'',status:'Unpaid',is_recurring:false,notes:''})
    setShowAddExpense(false)
  }

  async function deleteOfficeExpense(id: string) {
    await supabase.from('office_expenses').delete().eq('id', id)
    setExpenses(expenses.filter((x:any)=>x.id!==id))
  }

  async function toggleOfficeExpensePaid(id: string, status: string) {
    await supabase.from('office_expenses').update({ status }).eq('id', id)
    setExpenses(expenses.map((x:any)=>x.id===id?{...x,status}:x))
  }

  async function duplicateOfficeExpenseToNextMonth(e: any) {
    const { data: { user } } = await supabase.auth.getUser()
    let nextDate = null
    if (e.date) { const d = new Date(e.date); d.setMonth(d.getMonth()+1); nextDate = d.toISOString().slice(0,10) }
    const { error } = await supabase.from('office_expenses').insert({
      user_id: user?.id, description: e.description, vendor: e.vendor,
      category: e.category, amount: e.amount, date: nextDate, status: 'Unpaid', is_recurring: true, notes: e.notes,
    })
    if (error) { alert(error.message); return }
    await loadAll()
  }

  // These tables relate to the business via property_id only — they have
  // no user_id column, so save() must not try to write one.
  const NO_USER_ID_TABLES = ['bookings', 'cleaning_tasks', 'maintenance_tickets']

  // assigned_to now stores a team_members.id (uuid) — resolve it back to a name for display
  function teamName(id: string | null | undefined) {
    if (!id) return null
    return team.find((m: any) => m.id === id)?.name ?? null
  }

  async function save(table: string, data: any) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) {
      await supabase.from(table).update({ ...data }).eq('id', editId)
    } else {
      const payload = NO_USER_ID_TABLES.includes(table) ? { ...data } : { ...data, user_id: user?.id }
      const { error } = await supabase.from(table).insert([payload])
      if (error) { alert(error.message); setSaving(false); return }
      notifyIfRelevant(table, data, user?.id)
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await loadAll()
  }

  function notifyIfRelevant(table: string, data: any, userId?: string) {
    if (!userId) return
    const propertyName = properties.find((p:any)=>p.id===data.property_id)?.name
    const configs: Record<string, { type: string; title: string }> = {
      maintenance_tickets: { type: 'maintenance', title: `New maintenance ticket: ${data.title || 'Untitled'}` },
      cleaning_tasks: { type: 'cleaning', title: `New cleaning task scheduled` },
      bookings: { type: 'booking', title: `New booking: ${data.guest_name || 'Guest'}` },
    }
    const cfg = configs[table]
    if (!cfg) return
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      user_id: userId, module: 'str', type: cfg.type, title: cfg.title, property_name: propertyName, property_id: data.property_id, link: '/str',
    }) }).catch(()=>{})
  }

  async function del(table: string, id: string) {
    if (!confirm('Delete?')) return
    await supabase.from(table).delete().eq('id', id)
    await loadAll()
  }

  function openEdit(modalName: string, record: any) {
    setForm(record); setEditId(record.id); setModal(modalName)
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", color:'#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, background:'#3B4AFF', borderRadius:'50%' }} />
            <h1 style={{ fontSize:18, fontWeight:600, margin:0, color:'#101828' }}>Vacation Rentals</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {tab==='Bookings' && <button onClick={()=>{setModal('booking');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ New Booking</button>}
            {tab==='Properties' && <button onClick={()=>{setModal('property');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Property</button>}
            {tab==='Cleaning' && <button onClick={()=>{setModal('cleaning');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ New Task</button>}
            {tab==='Maintenance' && <button onClick={()=>{setModal('maintenance');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ New Ticket</button>}

            {tab==='Team' && <button onClick={()=>{setModal('team');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Member</button>}
          </div>
        </div>
        <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(t => {
            const locked = !!(allowedTab && t !== allowedTab)
            const badge = t==='Cleaning' ? cleaning.filter((c:any)=>c.status==='pending').length : t==='Maintenance' ? maintenance.filter((m:any)=>m.status==='open').length : 0
            return <button key={t} onClick={() => !locked && setTab(t)} disabled={locked} title={locked ? `Your role only has access to ${allowedTab}` : undefined} style={{ padding:'10px 14px', background:'none', border:'none', cursor: locked ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:500, color: locked ? '#C1C9D2' : tab===t?'#3B4AFF':'#667085', borderBottom:tab===t && !locked?'2px solid #3B4AFF':'2px solid transparent', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t}{badge>0 && !locked && <span style={{marginLeft:6,background:t==='Maintenance'?'#EF4444':'#F59E0B',color:'#fff',fontSize:10,fontWeight:700,borderRadius:10,padding:'1px 6px'}}>{badge}</span>}{locked && <span style={{marginLeft:5}}>🔒</span>}</button>
          })}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 32px' }}>

        {tab==='Home' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Properties</div><div style={{ fontSize:28, fontWeight:800, color:'#3B4AFF' }}>{stats.properties}</div><div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Total active</div></div>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Cleaning Tasks</div><div style={{ fontSize:28, fontWeight:800, color:'#10B981' }}>{stats.cleaning}</div><div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Pending today</div></div>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Maintenance</div><div style={{ fontSize:28, fontWeight:800, color:'#F59E0B' }}>{stats.maintenance}</div><div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Open tickets</div></div>
              <div style={{ background:'#101828', border:'1px solid #101828', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Revenue</div><div style={{ fontSize:28, fontWeight:800, color:'#fff' }}>£{stats.revenue.toLocaleString()}</div><div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>This month</div></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Revenue Trends</div>
                <svg viewBox="0 0 300 80" style={{ width:'100%' }}>
                  <polyline points="10,70 60,55 110,60 160,35 210,40 260,20 290,15" fill="none" stroke="#3B4AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*56)} y={78} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Occupancy Trends</div>
                <svg viewBox="0 0 300 80" style={{ width:'100%' }}>
                  {([{x:10,h:40,p:true},{x:55,h:45,p:true},{x:100,h:35,p:true},{x:145,h:55,p:false},{x:190,h:58,p:false},{x:235,h:62,p:false}] as any[]).map((b,i)=>(<rect key={i} x={b.x} y={75-b.h} width={30} height={b.h} rx="3" fill={b.p?'#EEF0FF':'#3B4AFF'}/>))}
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={15+(i*45)} y={79} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Upcoming Check-ins</div>
                {bookings.filter(b=>b.check_in>=today).slice(0,5).length===0 ? <div style={{ color:'#98A2B3', fontSize:13 }}>No upcoming check-ins</div> :
                bookings.filter(b=>b.check_in>=today).slice(0,5).map(b=>(<div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}><div><div style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'Guest'}</div><div style={{ fontSize:11, color:'#667085' }}>{b.properties?.name} · {b.check_in}</div></div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#D1FAE5', color:'#059669' }}>Check-in</span></div>))}
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Recent Bookings</div>
                {bookings.slice(0,5).length===0 ? <div style={{ color:'#98A2B3', fontSize:13 }}>No bookings yet</div> :
                bookings.slice(0,5).map(b=>(<div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}><div><div style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'Guest'}</div><div style={{ fontSize:11, color:'#667085' }}>{b.properties?.name}</div></div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:b.status==='confirmed'?'#D1FAE5':'#F3F4F6', color:b.status==='confirmed'?'#059669':'#6B7280' }}>{b.status}</span></div>))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
              <WeatherWidget />
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Quick Stats</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Avg nightly rate</span><span style={{ fontWeight:600, color:'#101828' }}>£{properties.length>0?Math.round(properties.reduce((s:number,p:any)=>s+(p.nightly_rate??0),0)/properties.length):0}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Total bookings</span><span style={{ fontWeight:600, color:'#101828' }}>{bookings.length}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Confirmed</span><span style={{ fontWeight:600, color:'#10B981' }}>{bookings.filter((b:any)=>b.status==='confirmed').length}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Cancelled</span><span style={{ fontWeight:600, color:'#EF4444' }}>{bookings.filter((b:any)=>b.status==='cancelled').length}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Cleaning pending</span><span style={{ fontWeight:600, color:'#F59E0B' }}>{cleaning.filter((c:any)=>c.status==='pending').length}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}><span style={{ color:'#667085' }}>Open maintenance</span><span style={{ fontWeight:600, color:'#3B4AFF' }}>{maintenance.filter((m:any)=>m.status==='open').length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='Bookings' && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 100px 80px', padding:'12px 20px', background:'#F9FAFB', borderBottom:'1px solid #E4E7EC', fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase' }}>
              <span>Guest</span><span>Property</span><span>Check In</span><span>Check Out</span><span>Status</span><span></span>
            </div>
            {bookings.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No bookings yet</div> :
            bookings.map(b=>(<div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 100px 80px', padding:'14px 20px', borderBottom:'1px solid #F2F4F7', fontSize:13, color:'#344054', alignItems:'center' }}>
              <span style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'—'}</span>
              <span>{b.properties?.name??'—'}</span>
              <span>{b.check_in??'—'}</span>
              <span>{b.check_out??'—'}</span>
              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:b.status==='confirmed'?'#D1FAE5':'#F3F4F6', color:b.status==='confirmed'?'#059669':'#6B7280' }}>{b.status}</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>openEdit('booking',b)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                <button onClick={()=>del('bookings',b.id)} style={{ fontSize:11, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>×</button>
              </div>
            </div>))}
          </div>
        )}

        {tab==='Properties' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {properties.length===0 ? <div style={{ color:'#98A2B3', fontSize:14 }}>No properties yet</div> :
            properties.map(p=>(<div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
              <div style={{ fontWeight:600, fontSize:15, color:'#101828', marginBottom:4 }}>{p.name}</div>
              <div style={{ fontSize:13, color:'#667085', marginBottom:8 }}>{p.address}</div>
              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#D1FAE5', color:'#059669' }}>active</span>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={()=>openEdit('property',p)} style={{ fontSize:12, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
                <button onClick={()=>del('properties',p.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer', padding:0 }}>Delete</button>
              </div>
            </div>))}
          </div>
        )}

        {tab==='Cleaning' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[{label:'Total Tasks',value:cleaning.length,color:'#101828'},{label:'Pending',value:cleaning.filter(t=>t.status==='pending').length,color:'#F59E0B'},{label:'Completed',value:cleaning.filter(t=>t.status==='completed').length,color:'#10B981'}].map((c:any)=>(
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div><div style={{ fontSize:28, fontWeight:800, color:c.color }}>{c.value}</div></div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cleaning.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No cleaning tasks yet</div> :
              cleaning.map((t:any)=>{
                const before = parseMedia(t.before_media)
                const after = parseMedia(t.after_media)
                return (<div key={t.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto auto auto', alignItems:'center', gap:12 }}>
                <span style={{ fontWeight:500, color:'#101828' }}>{t.properties?.name??'—'}</span>
                <span style={{ fontSize:13, color:'#667085' }}>{t.scheduled_date??'—'}</span>
                <span style={{ fontSize:13, color:'#667085' }}>{teamName(t.assigned_to)??'Unassigned'}</span>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.status==='completed'?'#D1FAE5':t.status==='in_progress'?'#FEF3C7':'#DBEAFE', color:t.status==='completed'?'#059669':t.status==='in_progress'?'#D97706':'#2563EB' }}>{t.status??'pending'}</span>
                <div style={{ display:'flex', gap:3 }}>
                  {[...before.slice(0,2), ...after.slice(0,2)].map((url,i)=>(
                    isVideoUrl(url)
                      ? <video key={i} src={url} style={{ height:32, width:32, objectFit:'cover', borderRadius:4, cursor:'pointer' }} onClick={()=>window.open(url,'_blank')} />
                      : <img key={i} src={url} alt="" style={{ height:32, width:32, objectFit:'cover', borderRadius:4, cursor:'pointer' }} onClick={()=>window.open(url,'_blank')} />
                  ))}
                </div>
                <button onClick={()=>openEdit('cleaning',t)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                <button onClick={()=>del('cleaning_tasks',t.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
              </div>)})}
            </div>
          </div>
        )}

        {tab==='Maintenance' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[{label:'Total',value:maintenance.length,color:'#101828'},{label:'Open',value:maintenance.filter(m=>m.status==='open').length,color:'#3B4AFF'},{label:'In Progress',value:maintenance.filter(m=>m.status==='in_progress').length,color:'#F59E0B'},{label:'Urgent',value:maintenance.filter(m=>m.priority==='urgent').length,color:'#EF4444'}].map((c:any)=>(
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div><div style={{ fontSize:28, fontWeight:800, color:c.color }}>{c.value}</div></div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {maintenance.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No maintenance tickets</div> :
              maintenance.map((m:any)=>{
                const priColor=m.priority==='urgent'?'#EF4444':m.priority==='high'?'#F59E0B':'#3B4AFF'
                const priBg=m.priority==='urgent'?'#FEE2E2':m.priority==='high'?'#FEF3C7':'#EEF0FF'
                return(<div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr auto auto auto auto', alignItems:'center', gap:12 }}>
                  <div><div style={{ fontWeight:600, fontSize:14, color:'#101828', marginBottom:2 }}>{m.title}</div><div style={{ fontSize:12, color:'#667085' }}>{m.properties?.name}{teamName(m.assigned_to)?` · ${teamName(m.assigned_to)}`:''}</div></div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:priBg, color:priColor, textTransform:'uppercase' }}>{m.priority}</span>
                  <select value={m.status} onChange={async e=>{await supabase.from('maintenance_tickets').update({status:e.target.value}).eq('id',m.id);loadAll()}} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #E4E7EC', fontSize:13, fontFamily:'inherit' }}>
                    <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                  </select>
                  <button onClick={()=>openEdit('maintenance',m)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>del('maintenance_tickets',m.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
                </div>)
              })}
            </div>
          </div>
        )}

        {tab==='Team' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {team.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No team members yet</div> :
            team.map((m:any)=>(<div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, color:'#3B4AFF' }}>{m.name.charAt(0)}</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{m.name}</div><div style={{ fontSize:12, color:'#667085', textTransform:'capitalize' }}>{m.role}</div></div>
              <button onClick={()=>openEdit('team',m)} style={{ fontSize:12, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Edit</button>
              <button onClick={()=>del('team_members',m.id)} style={{ fontSize:12, color:'#EF4444', background:'none', border:'none', cursor:'pointer' }}>Remove</button>
            </div>))}
          </div>
        )}

        {tab==='Analytics' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}><div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Total Revenue</div><div style={{ fontSize:24, fontWeight:800, color:'#101828' }}>£{stats.revenue.toLocaleString()}</div><svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}><polyline points="5,45 40,35 75,38 110,20 145,25 175,10 195,8" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}><div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Total Bookings</div><div style={{ fontSize:24, fontWeight:800, color:'#101828' }}>{bookings.filter(b=>b.status!=='cancelled').length}</div><svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}><polyline points="5,45 40,38 75,40 110,28 145,30 175,18 195,15" fill="none" stroke="#3B4AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #FEE2E2', padding:'20px 24px' }}><div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Cancellations</div><div style={{ fontSize:24, fontWeight:800, color:'#EF4444' }}>{bookings.filter(b=>b.status==='cancelled').length}</div><svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}><polyline points="5,20 40,25 75,18 110,30 145,22 175,35 195,30" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/></svg></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'#101828', marginBottom:16 }}>Occupancy</div>
                <svg viewBox="0 0 200 110" style={{ width:'100%', maxWidth:240, display:'block', margin:'0 auto' }}>
                  <path d="M 20 80 A 80 80 0 0 1 180 80" fill="none" stroke="#F3F4F6" strokeWidth="16" strokeLinecap="round"/>
                  <path d="M 20 80 A 80 80 0 0 1 100 0" fill="none" stroke="#3B4AFF" strokeWidth="16" strokeLinecap="round"/>
                  <text x="18" y="98" fontSize="10" fill="#9CA3AF">0%</text><text x="88" y="18" fontSize="10" fill="#9CA3AF">50%</text><text x="172" y="98" fontSize="10" fill="#9CA3AF">100%</text>
                  <text x="100" y="100" fontSize="18" fontWeight="bold" fill="#101828" textAnchor="middle">0%</text>
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'#101828', marginBottom:16 }}>Revenue & Occupancy</div>
                <svg viewBox="0 0 300 120" style={{ width:'100%' }}>
                  <polyline points="10,110 60,90 110,95 160,60 210,65 260,40 290,30" fill="none" stroke="#3B4AFF" strokeWidth="2"/>
                  <polyline points="10,100 60,85 110,88 160,70 210,72 260,55 290,48" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 3"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*52)} y={118} fontSize="8" fill="#9CA3AF" textAnchor="middle">{m}</text>))}
                </svg>
              </div>
            </div>
          </div>
        )}

        {tab==='Integrations' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[{name:'Airbnb iCal',desc:'Sync bookings via iCal URL',color:'#FF5A5F',connected:false},{name:'VRBO iCal',desc:'Sync VRBO bookings automatically',color:'#3D67FF',connected:false},{name:'Booking.com iCal',desc:'Sync Booking.com reservations',color:'#003580',connected:false},{name:'PriceLabs',desc:'Dynamic pricing recommendations',color:'#5B4EFF',connected:false},{name:'Stripe',desc:'Process direct booking payments',color:'#635BFF',connected:true},{name:'PayPal',desc:'Accept PayPal payments from guests',color:'#009CDE',connected:false}].map(i=>(
              <div key={i.name} style={{ background:'#fff', borderRadius:12, border:`1px solid ${i.connected?'#BBF7D0':'#E4E7EC'}`, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:i.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:i.color }}>{i.name.charAt(0)}</div>
                  <div><div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{i.name}</div><div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{i.desc}</div></div>
                </div>
                {i.connected ? <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'#D1FAE5', color:'#059669' }}>Connected</span> : <a href="/integrations" style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8, background:'#101828', color:'#fff', textDecoration:'none' }}>Connect</a>}
              </div>
            ))}
          </div>
        )}

        {tab==='Reports' && (
          <div>
            {/* Net Profit Banner */}
            <div style={{background:'linear-gradient(135deg,#101828,#1D2939)',borderRadius:12,padding:24,marginBottom:20,color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.6,marginBottom:6}}>{new Date().toLocaleString('default',{month:'long',year:'numeric'}).toUpperCase()} · NET PROFIT</div>
              <div style={{fontSize:36,fontWeight:800}}>£{(stats.revenue - expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString()}</div>
              <div style={{fontSize:13,opacity:0.6,marginTop:4}}>£{stats.revenue.toLocaleString()} income · £{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()} costs</div>
            </div>
            {/* Period tabs */}
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {['P&L','Rent Collection','Cash Flow','Forecast'].map(t=>(
                <button key={t} onClick={()=>setReportTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:reportTab===t?'#101828':'#fff',color:reportTab===t?'#fff':'#344054',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',outline:'1px solid '+(reportTab===t?'#101828':'#E4E7EC')}}>{t}</button>
              ))}
            </div>
            {reportTab==='P&L'&&(() => {
              const year = new Date().getFullYear()
              const pnlByMonth = Array.from({length:12},(_,i)=>{
                const monthKey = `${year}-${String(i+1).padStart(2,'0')}`
                const income = bookings.filter((b:any)=>b.status!=='cancelled' && b.check_in?.startsWith(monthKey)).reduce((s:number,b:any)=>s+(Number(b.total_amount)||0),0)
                const costs = expenses.filter((e:any)=>e.date?.startsWith(monthKey)).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
                return { income, costs }
              })
              const totalExpenses = expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
              return (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                  {[{l:'YTD Income',v:'£'+stats.revenue.toLocaleString(),c:'#101828'},{l:'YTD Costs',v:'£'+expenses.filter((e:any)=>e.category==='Property').reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString(),c:'#EF4444'},{l:'YTD Expenses',v:'£'+totalExpenses.toLocaleString(),c:'#F59E0B'},{l:'YTD Net Profit',v:'£'+(stats.revenue-totalExpenses).toLocaleString(),c:'#10B981'}].map((s:any)=>(
                    <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                      <div style={{fontSize:11,color:'#667085',fontWeight:600,textTransform:'uppercase'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
                    <span>Month</span><span>Income</span><span>LL Costs</span><span>Expenses</span><span>Net Profit</span>
                  </div>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>(
                    <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                      <span>{m} {year}</span>
                      <span style={{color:'#10B981'}}>£{pnlByMonth[i].income.toLocaleString()}</span>
                      <span style={{color:'#EF4444'}}>£0</span>
                      <span style={{color:'#F59E0B'}}>£{pnlByMonth[i].costs.toLocaleString()}</span>
                      <span style={{fontWeight:600}}>£{(pnlByMonth[i].income-pnlByMonth[i].costs).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',background:'#F9FAFB',fontSize:13,fontWeight:700,color:'#101828'}}>
                    <span>TOTAL {year}</span>
                    <span style={{color:'#10B981'}}>£{stats.revenue.toLocaleString()}</span>
                    <span style={{color:'#EF4444'}}>£0</span>
                    <span style={{color:'#F59E0B'}}>£{totalExpenses.toLocaleString()}</span>
                    <span>£{(stats.revenue-totalExpenses).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              )
            })()}
            {reportTab==='Rent Collection'&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:12}}>📊</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>Rent Collection Report</div>
                <div style={{fontSize:13}}>Payment history and arrears data will appear here as bookings are recorded.</div>
              </div>
            )}
            {reportTab==='Cash Flow'&&(() => {
              const year = new Date().getFullYear()
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
              let cumulative = 0
              const cfData = months.map((m,i)=>{
                const monthKey = `${year}-${String(i+1).padStart(2,'0')}`
                const moneyIn = bookings.filter((b:any)=>b.status!=='cancelled' && b.check_in?.startsWith(monthKey)).reduce((s:number,b:any)=>s+(Number(b.total_amount)||0),0)
                const moneyOut = expenses.filter((e:any)=>e.date?.startsWith(monthKey)).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)
                const net = moneyIn - moneyOut
                cumulative += net
                return { m, moneyIn, moneyOut, net, cumulative }
              })
              const maxVal = Math.max(1, ...cfData.map(d=>d.moneyIn))
              return (
              <div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Cash Flow ({year})</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:4,alignItems:'flex-end',height:120,marginBottom:8}}>
                    {cfData.map(d=>(
                      <div key={d.m} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{width:'100%',background:'#10B98133',borderRadius:'4px 4px 0 0',height:Math.max(4,(d.moneyIn/maxVal)*80),minHeight:4}}/>
                        <div style={{fontSize:10,color:'#98A2B3'}}>{d.m}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
                    <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
                  </div>
                  {cfData.map(d=>(
                    <div key={d.m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                      <span>{d.m} {year}</span><span style={{color:'#10B981'}}>£{d.moneyIn.toLocaleString()}</span><span style={{color:'#EF4444'}}>£{d.moneyOut.toLocaleString()}</span><span>£{d.net.toLocaleString()}</span><span>£{d.cumulative.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              )
            })()}
            {reportTab==='Forecast'&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:12}}>🔮</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>Revenue Forecast</div>
                <div style={{fontSize:13}}>Add bookings and expenses to generate a 12-month forecast.</div>
              </div>
            )}
          </div>
        )}

        {tab==='Expenses' && (
          <div>
            {/* Banner */}
            <div style={{background:'linear-gradient(135deg,#101828,#1D2939)',borderRadius:12,padding:24,marginBottom:20,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.6,marginBottom:6}}>TOTAL SPENT · ALL TIME</div>
                <div style={{fontSize:36,fontWeight:800}}>£{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                <div style={{fontSize:13,opacity:0.6,marginTop:4}}>{expenses.length} records</div>
              </div>
              <button onClick={()=>setShowAddExpense(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#fff',color:'#101828',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
            </div>
            {/* Category stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {['Property','Utilities','Staff','Overhead'].map(cat=>(
                <div key={cat} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>{cat}</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#101828'}}>£{expenses.filter((e:any)=>e.category===cat).reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {/* Add form */}
            {showAddExpense&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:20}}>
                <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Add expense</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Description *</label><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder="e.g. Office rent" style={inp}/></div>
                  <div><label style={lbl}>Vendor</label><input value={expForm.vendor} onChange={e=>setExpForm({...expForm,vendor:e.target.value})} placeholder="e.g. Landlord" style={inp}/></div>
                  <div><label style={lbl}>Category</label><select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={inp}>{['Property','Staff','Overhead','Maintenance','Marketing','Insurance','Utilities','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Amount (£)</label><input value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
                  <div><label style={lbl}>Date</label><input value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} type="date" style={inp}/></div>
                  <div><label style={lbl}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={inp}>{['Paid','Unpaid'].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" id="is_recurring" checked={expForm.is_recurring} onChange={e=>setExpForm({...expForm,is_recurring:e.target.checked})}/><label htmlFor="is_recurring" style={{fontSize:13,color:'#344054',cursor:'pointer'}}>Recurring monthly bill</label></div>
                  <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><input value={expForm.notes} onChange={e=>setExpForm({...expForm,notes:e.target.value})} placeholder="Optional notes" style={inp}/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={addOfficeExpense} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
                  <button onClick={()=>setShowAddExpense(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
            )}
            {/* Table */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 130px 110px 90px 90px 90px 70px 30px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Description</span><span>Vendor</span><span>Category</span><span>Amount</span><span>Date</span><span>Status</span><span></span><span></span>
              </div>
              {expenses.length===0?(
                <div style={{textAlign:'center',padding:60,color:'#98A2B3'}}>
                  <div style={{fontSize:32,marginBottom:12}}>🧾</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No expenses yet</div>
                  <div style={{fontSize:13}}>Add your first expense to start tracking costs.</div>
                </div>
              ):expenses.map((e:any)=>(
                <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 130px 110px 90px 90px 90px 70px 30px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.description}{e.is_recurring && <span title="Recurring monthly bill" style={{marginLeft:6,fontSize:11}}>🔁</span>}</div>
                    {e.notes&&<div style={{fontSize:11,color:'#98A2B3'}}>{e.notes}</div>}
                  </div>
                  <span style={{fontSize:12,color:'#344054'}}>{e.vendor||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054',display:'inline-block'}}>{e.category}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#EF4444'}}>£{parseFloat(e.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{e.date||'—'}</span>
                  <select value={e.status} onChange={ev=>toggleOfficeExpensePaid(e.id, ev.target.value)} style={{fontSize:11,fontWeight:600,padding:'3px 6px',borderRadius:4,border:'none',cursor:'pointer',background:e.status==='Paid'?'#ECFDF5':'#FEF3C7',color:e.status==='Paid'?'#10B981':'#F59E0B'}}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                  <button onClick={()=>duplicateOfficeExpenseToNextMonth(e)} title="Duplicate to next month" style={{padding:'4px 8px',borderRadius:6,border:'1px solid #D0D5DD',background:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Next mo.</button>
                  <button onClick={()=>deleteOfficeExpense(e.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='Banking' && (
          <div>
            {/* Banking sub-tabs */}
            <div style={{display:'flex',gap:0,marginBottom:20,background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:4,width:'fit-content'}}>
              {['Overview','Bank Accounts','Transactions','Reconciliation','Cash Flow'].map(t=>(
                <button key={t} onClick={()=>setBankingTab(t)} style={{padding:'7px 14px',borderRadius:7,border:'none',background:bankingTab===t?'#101828':'transparent',color:bankingTab===t?'#fff':'#344054',fontSize:13,fontWeight:bankingTab===t?600:400,cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>

            {bankingTab==='Overview'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',marginBottom:8}}>TOTAL CASH BALANCE</div>
                    <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>£{bankAccounts.reduce((s:number,a:any)=>s+(parseFloat(a.balance)||0),0).toLocaleString()}</div>
                    <div style={{fontSize:13,color:'#98A2B3'}}>{bankAccounts.length===0?'No connected accounts':bankAccounts.length+' account(s)'}</div>
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Reconciliation Status</div>
                    <div style={{display:'flex',gap:12}}>
                      {[{l:'Matched',v:transactions.filter((t:any)=>t.status==='Reconciled').length,c:'#10B981'},{l:'To review',v:transactions.filter((t:any)=>t.status==='Unreconciled').length,c:'#F59E0B'},{l:'Ignored',v:0,c:'#98A2B3'}].map((s:any)=>(
                        <div key={s.l} style={{flex:1,textAlign:'center'}}>
                          <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Recent Transactions</div>
                    {transactions.length===0?<div style={{textAlign:'center',padding:24,color:'#98A2B3',fontSize:13}}>No transactions yet</div>:transactions.slice(0,5).map((t:any)=>(
                      <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F2F4F7'}}>
                        <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date}</div></div>
                        <span style={{fontSize:13,fontWeight:600,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:12}}>Quick Actions</div>
                    {[{l:'Add Bank Account',d:'Connect or manually add an account'},{l:'Add Transaction',d:'Record income or expense'},{l:'Reconcile',d:'Match transactions to records'}].map(a=>(
                      <div key={a.l} onClick={()=>{if(a.l==='Add Bank Account')setShowAddBank(true);if(a.l==='Add Transaction')setShowAddTx(true);if(a.l==='Reconcile')setBankingTab('Reconciliation')}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #F2F4F7',cursor:'pointer'}}>
                        <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{a.l}</div><div style={{fontSize:11,color:'#98A2B3'}}>{a.d}</div></div>
                        <span style={{color:'#667085'}}>›</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {bankingTab==='Bank Accounts'&&(
              <div>
                {showAddBank&&(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:20}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add bank account</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={lbl}>Account name *</label><input value={bankForm.name} onChange={e=>setBankForm({...bankForm,name:e.target.value})} placeholder="e.g. Barclays Business" style={inp}/></div>
                      <div><label style={lbl}>Type</label><select value={bankForm.type} onChange={e=>setBankForm({...bankForm,type:e.target.value})} style={inp}>{['Current','Savings','Business','Credit'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={lbl}>Balance (£)</label><input value={bankForm.balance} onChange={e=>setBankForm({...bankForm,balance:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
                      <div><label style={lbl}>Currency</label><select value={bankForm.currency} onChange={e=>setBankForm({...bankForm,currency:e.target.value})} style={inp}>{['GBP','USD','EUR','JMD'].map(c=><option key={c}>{c}</option>)}</select></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!bankForm.name)return;setBankAccounts([...bankAccounts,{id:Date.now(),...bankForm}]);setBankForm({name:'',type:'Current',balance:'',currency:'GBP'});setShowAddBank(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add account</button>
                      <button onClick={()=>setShowAddBank(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>
                )}
                {bankAccounts.length===0?(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center',color:'#98A2B3'}}>
                    <div style={{fontSize:32,marginBottom:12}}>🏦</div>
                    <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No bank accounts connected</div>
                    <div style={{fontSize:13,marginBottom:16}}>Add a bank account to start tracking transactions.</div>
                    <button onClick={()=>setShowAddBank(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add Bank Account</button>
                  </div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                    {bankAccounts.map((a:any)=>(
                      <div key={a.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                          <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{a.name}</div>
                          <button onClick={()=>setBankAccounts(bankAccounts.filter((x:any)=>x.id!==a.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:16}}>×</button>
                        </div>
                        <div style={{fontSize:28,fontWeight:800,color:'#101828',marginBottom:4}}>£{parseFloat(a.balance||0).toLocaleString()}</div>
                        <div style={{fontSize:12,color:'#98A2B3'}}>{a.type} · {a.currency}</div>
                      </div>
                    ))}
                    <div onClick={()=>setShowAddBank(true)} style={{background:'#F9FAFB',borderRadius:12,border:'2px dashed #E4E7EC',padding:24,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#667085',fontSize:13,fontWeight:500}}>+ Add Account</div>
                  </div>
                )}
              </div>
            )}

            {bankingTab==='Transactions'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16}}>
                  {[{l:'Imported',v:transactions.length},{l:'Matched',v:transactions.filter((t:any)=>t.status==='Reconciled').length},{l:'Needs Review',v:transactions.filter((t:any)=>t.status==='Unreconciled').length},{l:'Reconciled',v:Math.round(transactions.filter((t:any)=>t.status==='Reconciled').length/Math.max(transactions.length,1)*100)+'%'},{l:'Total Amount',v:'£'+transactions.reduce((s:number,t:any)=>s+(t.type==='Income'?parseFloat(t.amount||0):0),0).toLocaleString()}].map((s:any)=>(
                    <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,textAlign:'center'}}>
                      <div style={{fontSize:20,fontWeight:700,color:'#101828',marginBottom:4}}>{s.v}</div>
                      <div style={{fontSize:11,color:'#667085'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {showAddTx&&(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #101828',padding:24,marginBottom:16}}>
                    <h3 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Add transaction</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><label style={lbl}>Description *</label><input value={txForm.description} onChange={e=>setTxForm({...txForm,description:e.target.value})} placeholder="e.g. Rent payment" style={inp}/></div>
                      <div><label style={lbl}>Account</label><select value={txForm.account} onChange={e=>setTxForm({...txForm,account:e.target.value})} style={inp}><option value="">Select account</option>{bankAccounts.map((a:any)=><option key={a.id}>{a.name}</option>)}</select></div>
                      <div><label style={lbl}>Amount (£)</label><input value={txForm.amount} onChange={e=>setTxForm({...txForm,amount:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
                      <div><label style={lbl}>Type</label><select value={txForm.type} onChange={e=>setTxForm({...txForm,type:e.target.value})} style={inp}>{['Income','Expense'].map(t=><option key={t}>{t}</option>)}</select></div>
                      <div><label style={lbl}>Date</label><input value={txForm.date} onChange={e=>setTxForm({...txForm,date:e.target.value})} type="date" style={inp}/></div>
                      <div><label style={lbl}>Category</label><select value={txForm.category} onChange={e=>setTxForm({...txForm,category:e.target.value})} style={inp}>{['Rent','Maintenance','Utilities','Insurance','Marketing','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{if(!txForm.description||!txForm.amount)return;setTransactions([...transactions,{id:Date.now(),...txForm,status:'Unreconciled'}]);setTxForm({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'});setShowAddTx(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add transaction</button>
                      <button onClick={()=>setShowAddTx(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #E4E7EC'}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>{transactions.length} transactions</div>
                    <button onClick={()=>setShowAddTx(true)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 120px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                    <span>Description</span><span>Account</span><span>Amount</span><span>Type</span><span>Category</span><span>Status</span><span></span>
                  </div>
                  {transactions.length===0?<div style={{textAlign:'center',padding:40,color:'#98A2B3',fontSize:13}}>No transactions yet — add one above</div>:transactions.map((t:any)=>(
                    <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 120px 120px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                      <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date}</div></div>
                      <span style={{fontSize:12,color:'#344054'}}>{t.account||'—'}</span>
                      <span style={{fontSize:13,fontWeight:600,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span>
                      <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:t.type==='Income'?'#ECFDF5':'#FEE2E2',color:t.type==='Income'?'#10B981':'#EF4444',fontWeight:600,display:'inline-block'}}>{t.type}</span>
                      <span style={{fontSize:12,color:'#667085'}}>{t.category}</span>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block',background:t.status==='Reconciled'?'#ECFDF5':'#FEF3C7',color:t.status==='Reconciled'?'#10B981':'#F59E0B',cursor:'pointer'}} onClick={()=>setTransactions(transactions.map((x:any)=>x.id===t.id?{...x,status:x.status==='Reconciled'?'Unreconciled':'Reconciled'}:x))}>{t.status}</span>
                      <button onClick={()=>setTransactions(transactions.filter((x:any)=>x.id!==t.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bankingTab==='Reconciliation'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
                  {[{l:'To Review',v:transactions.filter((t:any)=>t.status==='Unreconciled').length,c:'#F59E0B'},{l:'High Confidence',v:0,c:'#10B981'},{l:'Matched',v:transactions.filter((t:any)=>t.status==='Reconciled').length,c:'#101828'}].map((s:any)=>(
                    <div key={s.l} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:20,textAlign:'center'}}>
                      <div style={{fontSize:28,fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                      <div style={{fontSize:12,color:'#667085'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {transactions.filter((t:any)=>t.status==='Unreconciled').length===0?(
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:60,textAlign:'center',color:'#98A2B3'}}>
                    <div style={{fontSize:32,marginBottom:12}}>✅</div>
                    <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>All caught up</div>
                    <div style={{fontSize:13}}>No incoming transactions are waiting for review.</div>
                  </div>
                ):transactions.filter((t:any)=>t.status==='Unreconciled').map((t:any)=>(
                  <div key={t.id} style={{background:'#fff',borderRadius:10,border:'1px solid #E4E7EC',padding:16,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{t.description}</div><div style={{fontSize:11,color:'#98A2B3'}}>{t.date} · {t.category}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:14,fontWeight:700,color:t.type==='Income'?'#10B981':'#EF4444'}}>{t.type==='Income'?'+':'-'}£{parseFloat(t.amount).toLocaleString()}</span>
                      <button onClick={()=>setTransactions(transactions.map((x:any)=>x.id===t.id?{...x,status:'Reconciled'}:x))} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'#101828',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✓ Match</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bankingTab==='Cash Flow'&&(()=>{
              const year = new Date().getFullYear()
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
              const cfData = months.map((m:string,i:number)=>{
                const inflow = transactions.filter((t:any)=>t.type==='Income'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
                const outflow = transactions.filter((t:any)=>t.type==='Expense'&&t.date?.startsWith(year+'-'+(String(i+1).padStart(2,'0')))).reduce((s:number,t:any)=>s+parseFloat(t.amount||0),0)
                return {m, inflow, outflow, net: inflow-outflow}
              })
              const maxVal = Math.max(...cfData.map((d:any)=>Math.max(d.inflow,d.outflow,Math.abs(d.net))),1)
              const W=700,H=180,PAD=32
              const x=(i:number)=>PAD+(i/(months.length-1))*(W-PAD*2)
              const y=(v:number)=>H-PAD-(v/maxVal)*(H-PAD*2)
              const line=(arr:number[])=>arr.map((v,i)=>(i===0?'M':'L')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')
              let cumulative=0
              return (
                <div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Cash Flow ({year})</div>
                      <div style={{display:'flex',gap:16,alignItems:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#10B981',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Inflows</span></div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#EF4444',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Outflows</span></div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:3,background:'#5B7CFA',borderRadius:2}}></div><span style={{fontSize:12,color:'#667085'}}>Net Cash Flow</span></div>
                      </div>
                    </div>
                    <svg viewBox={'0 0 '+W+' '+H} style={{width:'100%',height:H,overflow:'visible'}}>
                      {[0,0.25,0.5,0.75,1].map((p:number,i:number)=>(
                        <g key={i}>
                          <line x1={PAD} y1={y(maxVal*p)} x2={W-PAD} y2={y(maxVal*p)} stroke='#F2F4F7' strokeWidth='1'/>
                          <text x={PAD-4} y={y(maxVal*p)+4} textAnchor='end' fontSize='9' fill='#98A2B3'>£{(maxVal*p).toFixed(0)}</text>
                        </g>
                      ))}
                      {months.map((m:string,i:number)=>(
                        <text key={m} x={x(i)} y={H-4} textAnchor='middle' fontSize='9' fill='#98A2B3'>{m}</text>
                      ))}
                      <path d={line(cfData.map((d:any)=>d.inflow))+' L'+x(11)+' '+(H-PAD)+' L'+x(0)+' '+(H-PAD)+' Z'} fill='#10B98115'/>
                      <path d={line(cfData.map((d:any)=>d.inflow))} fill='none' stroke='#10B981' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                      <path d={line(cfData.map((d:any)=>d.outflow))} fill='none' stroke='#EF4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                      <path d={line(cfData.map((d:any)=>d.net))} fill='none' stroke='#5B7CFA' strokeWidth='2' strokeDasharray='4 3' strokeLinecap='round' strokeLinejoin='round'/>
                      {cfData.map((d:any,i:number)=>(
                        <g key={i}>
                          <circle cx={x(i)} cy={y(d.inflow)} r='3' fill='#10B981'/>
                          <circle cx={x(i)} cy={y(d.outflow)} r='3' fill='#EF4444'/>
                          <circle cx={x(i)} cy={y(d.net)} r='3' fill='#5B7CFA'/>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #E4E7EC'}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Monthly Breakdown</div>
                      <div style={{fontSize:12,color:'#667085'}}>Add transactions to populate</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,gap:8}}>
                      <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
                    </div>
                    {cfData.map((d:any,i:number)=>{
                      cumulative+=d.net
                      return(
                        <div key={d.m} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054',alignItems:'center',gap:8,background:i%2===0?'#fff':'#FAFAFA'}}>
                          <span style={{fontWeight:500,color:'#101828'}}>{d.m} {year}</span>
                          <span style={{color:'#10B981',fontWeight:500}}>£{d.inflow.toLocaleString()}</span>
                          <span style={{color:'#EF4444',fontWeight:500}}>£{d.outflow.toLocaleString()}</span>
                          <span style={{fontWeight:600,color:d.net>=0?'#10B981':'#EF4444'}}>£{d.net.toLocaleString()}</span>
                          <span style={{color:cumulative>=0?'#101828':'#EF4444'}}>£{cumulative.toLocaleString()}</span>
                        </div>
                      )
                    })}
                    <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',padding:'14px 20px',background:'#F9FAFB',fontSize:13,fontWeight:700,color:'#101828',gap:8,borderTop:'2px solid #E4E7EC'}}>
                      <span>TOTAL {year}</span>
                      <span style={{color:'#10B981'}}>£{cfData.reduce((s:number,d:any)=>s+d.inflow,0).toLocaleString()}</span>
                      <span style={{color:'#EF4444'}}>£{cfData.reduce((s:number,d:any)=>s+d.outflow,0).toLocaleString()}</span>
                      <span>£{cfData.reduce((s:number,d:any)=>s+d.net,0).toLocaleString()}</span>
                      <span>—</span>
                    </div>
                  </div>
                  <div style={{marginTop:12,padding:14,background:'#EEF1FF',borderRadius:10,fontSize:12,color:'#5B7CFA'}}>
                    💡 Add transactions in the Transactions tab to populate this chart automatically.
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {tab==='Guest Comms' && (
          <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:24 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Templates</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {Object.entries(DEFAULT_TEMPLATES).map(([key,t])=>(
                  <div key={key} onClick={()=>selectTemplate(key)} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid '+(activeTemplateKey===key?'#101828':'#E4E7EC'), background:activeTemplateKey===key?'#101828':'#fff', cursor:'pointer', fontSize:13, color:activeTemplateKey===key?'#fff':'#344054', fontWeight:activeTemplateKey===key?600:400 }}>{t.label}</div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E4E7EC', padding:28 }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#101828', marginBottom:4 }}>{DEFAULT_TEMPLATES[activeTemplateKey].label}</div>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Subject</label>
                <input value={templateSubjectDraft} onChange={e=>setTemplateSubjectDraft(e.target.value)} style={inp} />
              </div>
              <label style={lbl}>Message</label>
              <textarea value={templateDraft} onChange={e=>setTemplateDraft(e.target.value)} style={{ width:'100%', minHeight:200, padding:14, borderRadius:10, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={saveTemplate} disabled={savingTemplate} style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:savingTemplate?0.6:1 }}>{savingTemplate?'Saving…':'Save template'}</button>
                <button onClick={copyTemplate} style={{ padding:'10px 20px', borderRadius:8, border:'1px solid #D0D5DD', background:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Copy to clipboard</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {modal==='booking' && (
        <Modal title={editId?'Edit Booking':'New Booking'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Guest Name *</label><input style={inp} value={form.guest_name??''} onChange={e=>setForm({...form,guest_name:e.target.value})} placeholder="John Smith"/></div>
            <div><label style={lbl}>Guest Email</label><input type="email" style={inp} value={form.guest_email??''} onChange={e=>setForm({...form,guest_email:e.target.value})} placeholder="john@example.com"/></div>
            <div><label style={lbl}>Property</label><select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}><option value="">Select…</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Check In</label><input type="date" style={inp} value={form.check_in??''} onChange={e=>setForm({...form,check_in:e.target.value})}/></div>
              <div><label style={lbl}>Check Out</label><input type="date" style={inp} value={form.check_out??''} onChange={e=>setForm({...form,check_out:e.target.value})}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Total Amount (£)</label><input type="number" style={inp} value={form.total_amount??''} onChange={e=>setForm({...form,total_amount:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Status</label><select style={{...inp,cursor:'pointer'}} value={form.status??'confirmed'} onChange={e=>setForm({...form,status:e.target.value})}><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('bookings',form)} disabled={saving||!form.guest_name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.guest_name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Booking'}</button>
          </div>
        </Modal>
      )}

      {modal==='property' && (
        <Modal title={editId?'Edit Property':'Add Property'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Property Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Aurévo Seacastle"/></div>
            <div><label style={lbl}>Address</label><input style={inp} value={form.address??''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="123 Main Street"/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>City</label><input style={inp} value={form.city??''} onChange={e=>setForm({...form,city:e.target.value})}/></div>
              <div><label style={lbl}>Country</label><input style={inp} value={form.country??''} onChange={e=>setForm({...form,country:e.target.value})}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Nightly Rate (£)</label><input type="number" style={inp} value={form.nightly_rate??''} onChange={e=>setForm({...form,nightly_rate:parseFloat(e.target.value)})}/></div>
              <div><label style={lbl}>Max Guests</label><input type="number" style={inp} value={form.max_guests??''} onChange={e=>setForm({...form,max_guests:parseInt(e.target.value)})}/></div>
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:8 }}>AI Guest Agent Knowledge Base</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>WiFi Network Name</label><input style={inp} value={form.wifi_name??''} onChange={e=>setForm({...form,wifi_name:e.target.value})}/></div>
              <div><label style={lbl}>WiFi Password</label><input style={inp} value={form.wifi_password??''} onChange={e=>setForm({...form,wifi_password:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Check-in Instructions</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.checkin_instructions??''} onChange={e=>setForm({...form,checkin_instructions:e.target.value})} placeholder="e.g. Self check-in via lockbox, code sent 24h before arrival"/></div>
            <div><label style={lbl}>Check-out Instructions</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.checkout_instructions??''} onChange={e=>setForm({...form,checkout_instructions:e.target.value})} placeholder="e.g. Check-out by 11am, leave keys in lockbox"/></div>
            <div><label style={lbl}>House Rules</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.house_rules??''} onChange={e=>setForm({...form,house_rules:e.target.value})} placeholder="e.g. No smoking, no parties, quiet hours 10pm-8am"/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('properties',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Property'}</button>
          </div>
        </Modal>
      )}

      {modal==='cleaning' && (
        <Modal title={editId?'Edit Task':'New Cleaning Task'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Property *</label><select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}><option value="">Select…</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl}>Scheduled Date</label><input type="date" style={inp} value={form.scheduled_date??''} onChange={e=>setForm({...form,scheduled_date:e.target.value})}/></div>
            <div><label style={lbl}>Assigned To</label><select style={{...inp,cursor:'pointer'}} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Select team member…</option>{team.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}</select></div>
            <div><label style={lbl}>Status</label><select style={{...inp,cursor:'pointer'}} value={form.status??'pending'} onChange={e=>setForm({...form,status:e.target.value})}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            <MediaPicker label="Before Photos/Videos" urls={parseMedia(form.before_media)} onChange={urls=>setForm({...form,before_media:JSON.stringify(urls)})} />
            <MediaPicker label="After Photos/Videos" urls={parseMedia(form.after_media)} onChange={urls=>setForm({...form,after_media:JSON.stringify(urls)})} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('cleaning_tasks',form)} disabled={saving||!form.property_id} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.property_id?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Task'}</button>
          </div>
        </Modal>
      )}

      {modal==='maintenance' && (
        <Modal title={editId?'Edit Ticket':'New Maintenance Ticket'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Title *</label><input style={inp} value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Boiler not working"/></div>
            <div><label style={lbl}>Property</label><select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}><option value="">Select…</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Priority</label><select style={{...inp,cursor:'pointer'}} value={form.priority??'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <div><label style={lbl}>Assigned To</label><select style={{...inp,cursor:'pointer'}} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Select…</option>{team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('maintenance_tickets',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Create Ticket'}</button>
          </div>
        </Modal>
      )}

      {modal==='team' && (
        <Modal title={editId?'Edit Member':'Add Team Member'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Smith"/></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@example.com"/></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone??''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            <div><label style={lbl}>Role</label><select style={{...inp,cursor:'pointer'}} value={form.role??'cleaner'} onChange={e=>setForm({...form,role:e.target.value})}><option value="cleaner">Cleaner</option><option value="maintenance">Maintenance</option><option value="manager">Manager</option><option value="inspector">Inspector</option></select></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('team_members',form)} disabled={saving||!form.name} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.name?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Add Member'}</button>
          </div>
        </Modal>
      )}

    </div>
  )
}
