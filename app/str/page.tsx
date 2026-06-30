'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import WeatherWidget from '@/components/WeatherWidget'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const TABS = ['Home','Bookings','Properties','Cleaning','Maintenance','Turnovers','Owner Reports','Analytics','Integrations','Team','Reports','Expenses','Banking','Guest Comms']
const lbl: React.CSSProperties = { display:'block', fontSize:13, fontWeight:500, color:'#344054', marginBottom:5 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

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
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ properties:0, cleaning:0, maintenance:0, revenue:0 })
  const [bookings, setBookings] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [cleaning, setCleaning] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [turnovers, setTurnovers] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed',notes:''})
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBank, setShowAddBank] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [bankForm, setBankForm] = useState({name:'',type:'Current',balance:'',currency:'GBP'})
  const [txForm, setTxForm] = useState({account:'',description:'',amount:'',type:'Income',date:'',category:'Rent',status:'Unreconciled'})
  const [bankingTab, setBankingTab] = useState('Overview')
  const [reportTab, setReportTab] = useState('P&L')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      await loadAll(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadAll(uid?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = uid || user?.id
    const [p, b, c, m, t, tm] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, properties(name)').eq('user_id', userId).order('check_in', { ascending: false }),
      supabase.from('cleaning_tasks').select('*, properties(name)').eq('user_id', userId).order('scheduled_date', { ascending: true }),
      supabase.from('maintenance_tickets').select('*, properties(name)').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('turnovers').select('*, properties(name)').eq('user_id', userId).order('turnover_date', { ascending: true }),
      supabase.from('team_members').select('*').eq('user_id', userId),
    ])
    setProperties(p.data ?? [])
    setBookings(b.data ?? [])
    setCleaning(c.data ?? [])
    setMaintenance(m.data ?? [])
    setTurnovers(t.data ?? [])
    setTeam(tm.data ?? [])
    const rev = (b.data ?? []).filter((x:any) => x.status !== 'cancelled').reduce((s:number, x:any) => s + (x.total_amount ?? 0), 0)
    setStats({ properties:(p.data??[]).length, cleaning:(c.data??[]).filter((x:any)=>x.status==='pending').length, maintenance:(m.data??[]).filter((x:any)=>x.status==='open').length, revenue:rev })
  }

  async function save(table: string, data: any) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) {
      await supabase.from(table).update({ ...data }).eq('id', editId)
    } else {
      await supabase.from(table).insert([{ ...data, user_id: user?.id }])
    }
    setSaving(false); setModal(null); setForm({}); setEditId(null)
    await loadAll()
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
            {tab==='Turnovers' && <button onClick={()=>{setModal('turnover');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Schedule Turnover</button>}
            {tab==='Team' && <button onClick={()=>{setModal('team');setForm({});setEditId(null)}} style={{ background:'#101828', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add Member</button>}
          </div>
        </div>
        <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:tab===t?'#3B4AFF':'#667085', borderBottom:tab===t?'2px solid #3B4AFF':'2px solid transparent', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t}</button>)}
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
              cleaning.map((t:any)=>(<div key={t.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto auto', alignItems:'center', gap:12 }}>
                <span style={{ fontWeight:500, color:'#101828' }}>{t.properties?.name??'—'}</span>
                <span style={{ fontSize:13, color:'#667085' }}>{t.scheduled_date??'—'}</span>
                <span style={{ fontSize:13, color:'#667085' }}>{t.assigned_to??'Unassigned'}</span>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.status==='completed'?'#D1FAE5':t.status==='in_progress'?'#FEF3C7':'#DBEAFE', color:t.status==='completed'?'#059669':t.status==='in_progress'?'#D97706':'#2563EB' }}>{t.status??'pending'}</span>
                <button onClick={()=>openEdit('cleaning',t)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                <button onClick={()=>del('cleaning_tasks',t.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
              </div>))}
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
                  <div><div style={{ fontWeight:600, fontSize:14, color:'#101828', marginBottom:2 }}>{m.title}</div><div style={{ fontSize:12, color:'#667085' }}>{m.properties?.name}{m.assigned_to?` · ${m.assigned_to}`:''}</div></div>
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

        {tab==='Turnovers' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[{label:'Total',value:turnovers.length,color:'#101828'},{label:'Upcoming',value:turnovers.filter(t=>t.status==='scheduled'&&t.turnover_date>=today).length,color:'#3B4AFF'},{label:'Completed',value:turnovers.filter(t=>t.status==='completed').length,color:'#10B981'}].map((c:any)=>(
                <div key={c.label} style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}><div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div><div style={{ fontSize:28, fontWeight:800, color:c.color }}>{c.value}</div></div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {turnovers.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No turnovers scheduled</div> :
              turnovers.map((t:any)=>(<div key={t.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto auto', alignItems:'center', gap:12 }}>
                <div><div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{t.properties?.name??'—'}</div><div style={{ fontSize:12, color:'#667085' }}>{t.turnover_date}</div></div>
                <span style={{ fontSize:13, color:'#667085' }}>{t.assigned_to??'Unassigned'}</span>
                <select value={t.status??'scheduled'} onChange={async e=>{await supabase.from('turnovers').update({status:e.target.value}).eq('id',t.id);loadAll()}} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #E4E7EC', fontSize:13, fontFamily:'inherit' }}>
                  <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                </select>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.status==='completed'?'#D1FAE5':t.status==='in_progress'?'#FEF3C7':'#DBEAFE', color:t.status==='completed'?'#059669':t.status==='in_progress'?'#D97706':'#2563EB' }}>{t.status??'scheduled'}</span>
                <button onClick={()=>openEdit('turnover',t)} style={{ fontSize:11, color:'#3B4AFF', background:'none', border:'1px solid #3B4AFF', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Edit</button>
                <button onClick={()=>del('turnovers',t.id)} style={{ fontSize:18, color:'#D1D5DB', background:'none', border:'none', cursor:'pointer' }}>×</button>
              </div>))}
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

        {tab==='Owner Reports' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>💰</span><span style={{fontSize:12,color:'#667085'}}>Revenue</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>£{stats.revenue.toLocaleString()}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>{bookings.filter((b:any)=>b.status!=='cancelled').length} bookings</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,45 40,38 75,35 110,22 145,18 175,10 195,6" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="195" cy="6" r="3" fill="#10B981"/></svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>📅</span><span style={{fontSize:12,color:'#667085'}}>Bookings</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#101828',marginBottom:4}}>{bookings.filter((b:any)=>b.status!=='cancelled').length}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>confirmed bookings</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,45 40,40 75,42 110,28 145,24 175,14 195,10" fill="none" stroke="#5B7CFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="195" cy="10" r="3" fill="#5B7CFA"/></svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #FEE2E2',padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:16}}>❌</span><span style={{fontSize:12,color:'#667085'}}>Cancellations</span></div>
                <div style={{fontSize:32,fontWeight:800,color:'#EF4444',marginBottom:4}}>{bookings.filter((b:any)=>b.status==='cancelled').length}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>cancelled bookings</div>
                <svg viewBox="0 0 200 50" style={{width:'100%',marginTop:12}}><polyline points="5,20 40,22 75,18 110,25 145,20 175,28 195,24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/></svg>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:20,alignSelf:'flex-start'}}>Occupancy</div>
                <svg viewBox="0 0 200 120" style={{width:'100%',maxWidth:200}}>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F3F4F6" strokeWidth="20" strokeLinecap="round"/>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#5B7CFA" strokeWidth="20" strokeLinecap="round"/>
                  <text x="100" y="95" fontSize="22" fontWeight="800" fill="#101828" textAnchor="middle">100%</text>
                  <text x="100" y="115" fontSize="10" fill="#98A2B3" textAnchor="middle">occupancy rate</text>
                </svg>
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:8}}>Occupancy & Revenue</div>
                <div style={{display:'flex',gap:16,marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:20,height:3,background:'#10B981',borderRadius:2}}></div><span style={{fontSize:11,color:'#667085'}}>Revenue</span></div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:20,height:3,background:'#5B7CFA',borderRadius:2}}></div><span style={{fontSize:11,color:'#667085'}}>Occupancy</span></div>
                </div>
                <svg viewBox="0 0 300 120" style={{width:'100%'}}>
                  <polyline points="30,100 80,92 130,95 180,70 230,65 280,40 295,30" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="30,90 80,85 130,88 180,62 230,58 280,35 295,25" fill="none" stroke="#5B7CFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m:string,i:number)=>(<text key={m} x={30+i*52} y={115} fontSize="8" fill="#98A2B3" textAnchor="middle">{m}</text>))}
                </svg>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{label:'Revenues / Portal',pct:100,color:'#10B981'},{label:'Bookings',pct:100,color:'#10B981'},{label:'Nights / Portal',pct:100,color:'#10B981'},{label:'Cancellations',pct:0,color:'#E4E7EC'}].map((d:any)=>(
                <div key={d.label} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:16,textAlign:'center' as const}}>
                  <div style={{fontSize:11,color:'#667085',marginBottom:12}}>{d.label}</div>
                  <svg viewBox="0 0 80 80" style={{width:64,height:64}}>
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#F3F4F6" strokeWidth="10"/>
                    <circle cx="40" cy="40" r="28" fill="none" stroke={d.color} strokeWidth="10" strokeDasharray={String(2*Math.PI*28)} strokeDashoffset={String(2*Math.PI*28*(1-d.pct/100))} transform="rotate(-90 40 40)" strokeLinecap="round"/>
                    <text x="40" y="45" fontSize="13" fontWeight="700" fill="#101828" textAnchor="middle">{d.pct}%</text>
                  </svg>
                  <div style={{fontSize:11,color:'#10B981',marginTop:8,fontWeight:500}}>Direct {d.pct}%</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Upcoming Bookings</div>
                {bookings.filter((b:any)=>b.status!=='cancelled'&&b.check_in>new Date().toISOString().split('T')[0]).length===0?(<div style={{color:'#98A2B3',fontSize:13}}>No upcoming bookings</div>):bookings.filter((b:any)=>b.status!=='cancelled').slice(0,4).map((b:any)=>(<div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828',fontWeight:500}}>{b.guest_name??'Guest'}</span><span style={{color:'#667085'}}>{b.check_in}</span></div>))}
              </div>
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E4E7EC',padding:24}}>
                <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:14}}>Recent Finance</div>
                {bookings.filter((b:any)=>b.status!=='cancelled').slice(0,4).map((b:any)=>(<div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F2F4F7',fontSize:13}}><span style={{color:'#101828'}}>{b.guest_name??'Guest'} — booking</span><span style={{color:'#10B981',fontWeight:600}}>+£{(b.total_amount??0).toLocaleString()}</span></div>))}
                {bookings.filter((b:any)=>b.status!=='cancelled').length===0&&<div style={{color:'#98A2B3',fontSize:13}}>No recent transactions</div>}
              </div>
            </div>
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
            {reportTab==='P&L'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                  {[{l:'YTD Income',v:'£'+stats.revenue.toLocaleString(),c:'#101828'},{l:'YTD Costs',v:'£'+expenses.filter((e:any)=>e.category==='Property').reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString(),c:'#EF4444'},{l:'YTD Expenses',v:'£'+expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString(),c:'#F59E0B'},{l:'YTD Net Profit',v:'£'+(stats.revenue-expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString(),c:'#10B981'}].map((s:any)=>(
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
                      <span>{m} {new Date().getFullYear()}</span>
                      <span style={{color:'#10B981'}}>£0</span>
                      <span style={{color:'#EF4444'}}>£0</span>
                      <span style={{color:'#F59E0B'}}>£0</span>
                      <span style={{fontWeight:600}}>£0</span>
                    </div>
                  ))}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',background:'#F9FAFB',fontSize:13,fontWeight:700,color:'#101828'}}>
                    <span>TOTAL {new Date().getFullYear()}</span>
                    <span style={{color:'#10B981'}}>£{stats.revenue.toLocaleString()}</span>
                    <span style={{color:'#EF4444'}}>£0</span>
                    <span style={{color:'#F59E0B'}}>£{expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</span>
                    <span>£{(stats.revenue-expenses.reduce((s:number,e:any)=>s+(parseFloat(e.amount)||0),0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
            {reportTab==='Rent Collection'&&(
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:32,textAlign:'center',color:'#98A2B3'}}>
                <div style={{fontSize:32,marginBottom:12}}>📊</div>
                <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>Rent Collection Report</div>
                <div style={{fontSize:13}}>Payment history and arrears data will appear here as bookings are recorded.</div>
              </div>
            )}
            {reportTab==='Cash Flow'&&(
              <div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',padding:24,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#101828',marginBottom:16}}>Cash Flow (Last 6 Months)</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:4,alignItems:'flex-end',height:120,marginBottom:8}}>
                    {['Jan','Feb','Mar','Apr','May','Jun'].map(m=>(
                      <div key={m} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{width:'100%',background:'#10B98133',borderRadius:'4px 4px 0 0',height:Math.random()*80+20,minHeight:20}}/>
                        <div style={{fontSize:10,color:'#98A2B3'}}>{m}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase'}}>
                    <span>Month</span><span>Money In</span><span>Money Out</span><span>Net</span><span>Cumulative</span>
                  </div>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map(m=>(
                    <div key={m} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid #F2F4F7',fontSize:13,color:'#344054'}}>
                      <span>{m} {new Date().getFullYear()}</span><span style={{color:'#10B981'}}>£0</span><span style={{color:'#EF4444'}}>£0</span><span>£0</span><span>£0</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {['Property','Staff','Overhead'].map(cat=>(
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
                  <div><label style={lbl}>Description *</label><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder="e.g. Cleaning supplies" style={inp}/></div>
                  <div><label style={lbl}>Vendor</label><input value={expForm.vendor} onChange={e=>setExpForm({...expForm,vendor:e.target.value})} placeholder="e.g. Amazon" style={inp}/></div>
                  <div><label style={lbl}>Category</label><select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={inp}>{['Property','Staff','Overhead','Maintenance','Marketing','Insurance','Utilities','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Amount (£)</label><input value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} type="number" placeholder="0.00" style={inp}/></div>
                  <div><label style={lbl}>Date</label><input value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} type="date" style={inp}/></div>
                  <div><label style={lbl}>Status</label><select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={inp}>{['Confirmed','Estimated'].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div style={{gridColumn:'span 2'}}><label style={lbl}>Notes</label><input value={expForm.notes} onChange={e=>setExpForm({...expForm,notes:e.target.value})} placeholder="Optional notes" style={inp}/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{if(!expForm.description||!expForm.amount)return;setExpenses([...expenses,{id:Date.now(),...expForm}]);setExpForm({description:'',vendor:'',category:'Property',amount:'',date:'',status:'Confirmed',notes:''});setShowAddExpense(false)}} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#101828',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Add expense</button>
                  <button onClick={()=>setShowAddExpense(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
                </div>
              </div>
            )}
            {/* Table */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 100px 80px',padding:'10px 20px',background:'#F9FAFB',borderBottom:'1px solid #E4E7EC',fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase',gap:8}}>
                <span>Description</span><span>Vendor</span><span>Category</span><span>Amount</span><span>Date</span><span>Status</span><span></span>
              </div>
              {expenses.length===0?(
                <div style={{textAlign:'center',padding:60,color:'#98A2B3'}}>
                  <div style={{fontSize:32,marginBottom:12}}>🧾</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#101828',marginBottom:6}}>No expenses yet</div>
                  <div style={{fontSize:13}}>Add your first expense to start tracking costs.</div>
                </div>
              ):expenses.map((e:any)=>(
                <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 100px 80px',padding:'14px 20px',borderBottom:'1px solid #F2F4F7',alignItems:'center',gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:'#101828'}}>{e.description}</div>
                    {e.notes&&<div style={{fontSize:11,color:'#98A2B3'}}>{e.notes}</div>}
                  </div>
                  <span style={{fontSize:12,color:'#344054'}}>{e.vendor||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'#F2F4F7',color:'#344054',display:'inline-block'}}>{e.category}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#EF4444'}}>£{parseFloat(e.amount).toLocaleString()}</span>
                  <span style={{fontSize:12,color:'#667085'}}>{e.date||'—'}</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,display:'inline-block',background:e.status==='Confirmed'?'#ECFDF5':'#FEF3C7',color:e.status==='Confirmed'?'#10B981':'#F59E0B'}}>{e.status}</span>
                  <button onClick={()=>setExpenses(expenses.filter((x:any)=>x.id!==e.id))} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#EF4444'}}>×</button>
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
                {['Welcome Message','Check-in Instructions','Check-out Reminder','Review Request'].map(t=>(<div key={t} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid #E4E7EC', background:'#fff', cursor:'pointer', fontSize:13, color:'#344054' }}>{t}</div>))}
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E4E7EC', padding:28 }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#101828', marginBottom:4 }}>Welcome Message</div>
              <div style={{ fontSize:13, color:'#667085', marginBottom:16 }}>Subject: Welcome to your stay!</div>
              <textarea defaultValue={"Hi {guest_name},\n\nWelcome! We're excited to host you.\n\nCheck-in: {check_in}\nCheck-out: {check_out}\n\nPlease don't hesitate to reach out if you need anything.\n\nBest regards"} style={{ width:'100%', minHeight:200, padding:14, borderRadius:10, border:'1px solid #D0D5DD', fontSize:14, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
              <button onClick={()=>alert('Copied!')} style={{ marginTop:12, padding:'10px 20px', borderRadius:8, border:'1px solid #D0D5DD', background:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Copy to clipboard</button>
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
            <div><label style={lbl}>Assigned To</label><select style={{...inp,cursor:'pointer'}} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Select team member…</option>{team.map(m=><option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}</select></div>
            <div><label style={lbl}>Status</label><select style={{...inp,cursor:'pointer'}} value={form.status??'pending'} onChange={e=>setForm({...form,status:e.target.value})}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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
              <div><label style={lbl}>Assigned To</label><select style={{...inp,cursor:'pointer'}} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Select…</option>{team.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('maintenance_tickets',form)} disabled={saving||!form.title} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.title?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Create Ticket'}</button>
          </div>
        </Modal>
      )}

      {modal==='turnover' && (
        <Modal title={editId?'Edit Turnover':'Schedule Turnover'} onClose={()=>{setModal(null);setEditId(null);setForm({})}}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Property *</label><select style={{...inp,cursor:'pointer'}} value={form.property_id??''} onChange={e=>setForm({...form,property_id:e.target.value})}><option value="">Select…</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl}>Date *</label><input type="date" style={inp} value={form.turnover_date??''} onChange={e=>setForm({...form,turnover_date:e.target.value})}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label style={lbl}>Check-out Time</label><input type="time" style={inp} value={form.check_out_time??''} onChange={e=>setForm({...form,check_out_time:e.target.value})}/></div>
              <div><label style={lbl}>Check-in Time</label><input type="time" style={inp} value={form.check_in_time??''} onChange={e=>setForm({...form,check_in_time:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Assigned To</label><select style={{...inp,cursor:'pointer'}} value={form.assigned_to??''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Select…</option>{team.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            <div><label style={lbl}>Notes</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={()=>{setModal(null);setEditId(null);setForm({})}} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>save('turnovers',form)} disabled={saving||!form.property_id||!form.turnover_date} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#101828', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:saving||!form.property_id||!form.turnover_date?0.6:1 }}>{saving?'Saving…':editId?'Save Changes':'Schedule'}</button>
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
