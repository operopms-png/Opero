'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const TABS = ['Home','Bookings','Properties','Cleaning','Maintenance','Turnovers','Owner Reports','Analytics','Integrations','Team','Reports','Guest Comms']

export default function STRPage() {
  const [tab, setTab] = useState('Home')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ properties: 0, cleaning: 0, maintenance: 0, revenue: 0 })
  const [bookings, setBookings] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [cleaning, setCleaning] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [turnovers, setTurnovers] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [p, b, c, m, t, tm] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('bookings').select('*, properties(name)').order('check_in', { ascending: false }),
        supabase.from('cleaning_tasks').select('*, properties(name)').order('scheduled_date', { ascending: true }),
        supabase.from('maintenance_tickets').select('*, properties(name)').order('created_at', { ascending: false }),
        supabase.from('turnovers').select('*, properties(name)').order('turnover_date', { ascending: true }),
        supabase.from('team_members').select('*').eq('user_id', user.id),
      ])
      setProperties(p.data ?? [])
      setBookings(b.data ?? [])
      setCleaning(c.data ?? [])
      setMaintenance(m.data ?? [])
      setTurnovers(t.data ?? [])
      setTeam(tm.data ?? [])
      const rev = (b.data ?? []).filter((x:any) => x.status !== 'cancelled').reduce((s:number, x:any) => s + (x.total_amount ?? 0), 0)
      setStats({ properties: (p.data ?? []).length, cleaning: (c.data ?? []).filter((x:any) => x.status === 'pending').length, maintenance: (m.data ?? []).filter((x:any) => x.status === 'open').length, revenue: rev })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", color:'#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #E4E7EC', padding:'0 32px' }}>
        <div style={{ display:'flex', alignItems:'center', height:64 }}>
          <div style={{ width:8, height:8, background:'#3B4AFF', borderRadius:'50%', marginRight:10 }} />
          <h1 style={{ fontSize:18, fontWeight:600, margin:0, color:'#101828' }}>Vacation Rentals</h1>
        </div>
        <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:tab===t?'#3B4AFF':'#667085', borderBottom:tab===t?'2px solid #3B4AFF':'2px solid transparent', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 32px' }}>
        {tab==='Home' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Properties</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#3B4AFF', letterSpacing:'-0.02em' }}>{stats.properties}</div>
                <div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Total active</div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Cleaning Tasks</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#10B981', letterSpacing:'-0.02em' }}>{stats.cleaning}</div>
                <div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Pending today</div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Maintenance</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#F59E0B', letterSpacing:'-0.02em' }}>{stats.maintenance}</div>
                <div style={{ fontSize:12, color:'#98A2B3', marginTop:4 }}>Open tickets</div>
              </div>
              <div style={{ background:'#101828', border:'1px solid #101828', borderRadius:12, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Revenue</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>£{stats.revenue.toLocaleString()}</div>
                <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>This month</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Revenue Trends</div>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'#667085', marginBottom:12 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#3B4AFF', display:'inline-block', borderRadius:2 }}></span>Revenue</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#E4E7EC', display:'inline-block', borderRadius:2 }}></span>Previous</span>
                </div>
                <svg viewBox="0 0 300 80" style={{ width:'100%' }}>
                  <polyline points="10,70 60,55 110,60 160,35 210,40 260,20 290,15" fill="none" stroke="#3B4AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10,75 60,72 110,74 160,65 210,68 260,58 290,55" fill="none" stroke="#E4E7EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*56)} y={78} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:4 }}>Occupancy Trends</div>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'#667085', marginBottom:12 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:'#EEF0FF', display:'inline-block', borderRadius:2 }}></span>Previous</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:'#3B4AFF', display:'inline-block', borderRadius:2 }}></span>Current</span>
                </div>
                <svg viewBox="0 0 300 80" style={{ width:'100%' }}>
                  {([{x:10,h:40,p:true},{x:55,h:45,p:true},{x:100,h:35,p:true},{x:145,h:55,p:false},{x:190,h:58,p:false},{x:235,h:62,p:false}] as any[]).map((b,i)=>(<rect key={i} x={b.x} y={75-b.h} width={30} height={b.h} rx="3" fill={b.p?'#EEF0FF':'#3B4AFF'}/>))}
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={15+(i*45)} y={79} fontSize="8" fill="#98A2B3">{m}</text>))}
                </svg>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Upcoming Check-ins</div>
                {bookings.filter(b=>b.check_in>=new Date().toISOString().split('T')[0]).slice(0,5).length===0 ?
                  <div style={{ color:'#98A2B3', fontSize:13 }}>No upcoming check-ins</div> :
                  bookings.filter(b=>b.check_in>=new Date().toISOString().split('T')[0]).slice(0,5).map(b=>(
                    <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}>
                      <div>
                        <div style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'Guest'}</div>
                        <div style={{ fontSize:11, color:'#667085' }}>{b.properties?.name} · {b.check_in}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#D1FAE5', color:'#059669' }}>Check-in</span>
                    </div>
                  ))
                }
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#101828', marginBottom:14 }}>Recent Bookings</div>
                {bookings.slice(0,5).length===0 ?
                  <div style={{ color:'#98A2B3', fontSize:13 }}>No bookings yet</div> :
                  bookings.slice(0,5).map(b=>(
                    <div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F2F4F7', fontSize:13 }}>
                      <div>
                        <div style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'Guest'}</div>
                        <div style={{ fontSize:11, color:'#667085' }}>{b.properties?.name}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:b.status==='confirmed'?'#D1FAE5':'#F3F4F6', color:b.status==='confirmed'?'#059669':'#6B7280' }}>{b.status}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        {tab==='Bookings' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/bookings" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>+ New Booking</a></div>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 100px', padding:'12px 20px', background:'#F9FAFB', borderBottom:'1px solid #E4E7EC', fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase' }}><span>Guest</span><span>Property</span><span>Check In</span><span>Check Out</span><span>Status</span></div>
              {bookings.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No bookings yet</div> :
              bookings.map(b=>(
                <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 100px', padding:'14px 20px', borderBottom:'1px solid #F2F4F7', fontSize:13, color:'#344054', alignItems:'center' }}>
                  <span style={{ fontWeight:500, color:'#101828' }}>{b.guest_name??'—'}</span><span>{b.properties?.name??'—'}</span><span>{b.check_in??'—'}</span><span>{b.check_out??'—'}</span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:b.status==='confirmed'?'#D1FAE5':'#F3F4F6', color:b.status==='confirmed'?'#059669':'#6B7280' }}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='Properties' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/properties" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Manage Properties</a></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {properties.length===0 ? <div style={{ color:'#98A2B3', fontSize:14 }}>No properties yet</div> :
              properties.map(p=>(<div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}><div style={{ fontWeight:600, fontSize:15, color:'#101828', marginBottom:4 }}>{p.name}</div><div style={{ fontSize:13, color:'#667085', marginBottom:8 }}>{p.address}</div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#D1FAE5', color:'#059669' }}>active</span></div>))}
            </div>
          </div>
        )}
        {tab==='Cleaning' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/cleaning" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Manage Cleaning</a></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cleaning.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No cleaning tasks</div> :
              cleaning.map(t=>(<div key={t.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}><div><div style={{ fontWeight:500, fontSize:14, color:'#101828' }}>{t.properties?.name??'—'}</div><div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{t.scheduled_date} · {t.assigned_to??'Unassigned'}</div></div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:t.status==='completed'?'#D1FAE5':'#DBEAFE', color:t.status==='completed'?'#059669':'#2563EB' }}>{t.status}</span></div>))}
            </div>
          </div>
        )}
        {tab==='Maintenance' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/maintenance" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Manage Maintenance</a></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {maintenance.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No maintenance tickets</div> :
              maintenance.map(m=>(<div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}><div><div style={{ fontWeight:500, fontSize:14, color:'#101828' }}>{m.title}</div><div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{m.properties?.name} · {m.priority}</div></div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:m.status==='open'?'#DBEAFE':'#D1FAE5', color:m.status==='open'?'#2563EB':'#059669' }}>{m.status}</span></div>))}
            </div>
          </div>
        )}
        {tab==='Turnovers' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/turnovers" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Manage Turnovers</a></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {turnovers.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No turnovers</div> :
              turnovers.map(t=>(<div key={t.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}><div><div style={{ fontWeight:500, fontSize:14, color:'#101828' }}>{t.properties?.name??'—'}</div><div style={{ fontSize:12, color:'#667085', marginTop:2 }}>{t.turnover_date} · {t.assigned_to??'Unassigned'}</div></div><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#DBEAFE', color:'#2563EB' }}>{t.status??'scheduled'}</span></div>))}
            </div>
          </div>
        )}
        {tab==='Owner Reports' && <div style={{ textAlign:'center', padding:40 }}><div style={{ fontSize:14, color:'#667085', marginBottom:16 }}>Full owner reporting with revenue splits and ROI</div><a href="/owners" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Open Owner Reports</a></div>}
        {tab==='Analytics' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Total Revenue</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#101828' }}>£{stats.revenue.toLocaleString()}</div>
                <svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}>
                  <polyline points="5,45 40,35 75,38 110,20 145,25 175,10 195,8" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Total Bookings</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#101828' }}>{bookings.filter(b=>b.status!=='cancelled').length}</div>
                <svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}>
                  <polyline points="5,45 40,38 75,40 110,28 145,30 175,18 195,15" fill="none" stroke="#3B4AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #FEE2E2', padding:'20px 24px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Cancellations</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#EF4444' }}>{bookings.filter(b=>b.status==='cancelled').length}</div>
                <svg viewBox="0 0 200 50" style={{ width:'100%', marginTop:8 }}>
                  <polyline points="5,20 40,25 75,18 110,30 145,22 175,35 195,30" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/>
                </svg>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'#101828', marginBottom:16 }}>Occupancy</div>
                <svg viewBox="0 0 200 110" style={{ width:'100%', maxWidth:240, display:'block', margin:'0 auto' }}>
                  <path d="M 20 80 A 80 80 0 0 1 180 80" fill="none" stroke="#F3F4F6" strokeWidth="16" strokeLinecap="round"/>
                  <path d="M 20 80 A 80 80 0 0 1 100 0" fill="none" stroke="#3B4AFF" strokeWidth="16" strokeLinecap="round"/>
                  <text x="18" y="98" fontSize="10" fill="#9CA3AF">0%</text>
                  <text x="88" y="18" fontSize="10" fill="#9CA3AF">50%</text>
                  <text x="172" y="98" fontSize="10" fill="#9CA3AF">100%</text>
                  <text x="100" y="100" fontSize="18" fontWeight="bold" fill="#101828" textAnchor="middle">0%</text>
                </svg>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'#101828', marginBottom:4 }}>Occupancy & Revenue</div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'#667085', marginBottom:16 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#3B4AFF', display:'inline-block' }}></span>Revenue</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'#10B981', display:'inline-block', borderTop:'2px dashed #10B981' }}></span>Occupancy</span>
                </div>
                <svg viewBox="0 0 300 120" style={{ width:'100%' }}>
                  <polyline points="10,110 60,90 110,95 160,60 210,65 260,40 290,30" fill="none" stroke="#3B4AFF" strokeWidth="2"/>
                  <polyline points="10,100 60,85 110,88 160,70 210,72 260,55 290,48" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 3"/>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i)=>(<text key={m} x={10+(i*52)} y={118} fontSize="8" fill="#9CA3AF" textAnchor="middle">{m}</text>))}
                </svg>
              </div>
            </div>
          </div>
        )}
        {tab==='Integrations' && <div style={{ textAlign:'center', padding:40 }}><div style={{ fontSize:14, color:'#667085', marginBottom:16 }}>Connect Airbnb, VRBO, Booking.com and PriceLabs</div><a href="/integrations" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Open Integrations</a></div>}
        {tab==='Team' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}><a href="/team" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Manage Team</a></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {team.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#98A2B3', fontSize:14 }}>No team members yet</div> :
              team.map(m=>(<div key={m.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}><div style={{ width:40, height:40, borderRadius:'50%', background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, color:'#3B4AFF' }}>{m.name.charAt(0)}</div><div><div style={{ fontWeight:600, fontSize:14, color:'#101828' }}>{m.name}</div><div style={{ fontSize:12, color:'#667085', textTransform:'capitalize' }}>{m.role}</div></div></div>))}
            </div>
          </div>
        )}
        {tab==='Reports' && <div style={{ textAlign:'center', padding:40 }}><div style={{ fontSize:14, color:'#667085', marginBottom:16 }}>Revenue reports and CSV exports</div><a href="/reports" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Open Reports</a></div>}
        {tab==='Guest Comms' && <div style={{ textAlign:'center', padding:40 }}><div style={{ fontSize:14, color:'#667085', marginBottom:16 }}>Message templates for check-in, checkout and reviews</div><a href="/guest-comms" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Open Guest Comms</a></div>}
      </div>
    </div>
  )
}
