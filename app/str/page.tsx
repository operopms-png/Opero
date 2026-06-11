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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
              {[
                { label:'Properties', value:stats.properties, sub:'Total active', color:'#3B4AFF' },
                { label:'Cleaning Tasks', value:stats.cleaning, sub:'Pending', color:'#10B981' },
                { label:'Maintenance', value:stats.maintenance, sub:'Open tickets', color:'#F59E0B' },
                { label:'Revenue', value:`£${stats.revenue.toLocaleString()}`, sub:'This month', dark:true },
              ].map((c:any) => (
                <div key={c.label} style={{ background:c.dark?'#101828':'#fff', border:'1px solid #E4E7EC', borderRadius:12, padding:'20px 24px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:c.dark?'#6B7280':'#667085', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:c.dark?'#fff':c.color, letterSpacing:'-0.02em' }}>{c.value}</div>
                  <div style={{ fontSize:12, color:c.dark?'#6B7280':'#98A2B3', marginTop:4 }}>{c.sub}</div>
                </div>
              ))}
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
        {tab==='Analytics' && <div style={{ textAlign:'center', padding:40 }}><div style={{ fontSize:14, color:'#667085', marginBottom:16 }}>Revenue charts, occupancy rates and booking trends</div><a href="/analytics" style={{ background:'#101828', color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:500, textDecoration:'none' }}>Open Analytics</a></div>}
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
