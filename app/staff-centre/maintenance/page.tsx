'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const MODULES = [
  { key:'str', label:'Vacation Rentals', bg:'#EEF1FF', fg:'#3B4AFF' },
  { key:'pm', label:'Property Management', bg:'#EEF1FF', fg:'#3B4AFF' },
  { key:'estate', label:'Estate Agency', bg:'#EAF3EE', fg:'#2D6A4F' },
]
const PRIORITY_STYLE: Record<string,{bg:string,fg:string,border:string}> = {
  urgent: { bg:'#FEE2E2', fg:'#DC2626', border:'#DC2626' },
  high:   { bg:'#FFEDD5', fg:'#EA580C', border:'#EA580C' },
  medium: { bg:'#FEF3C7', fg:'#D97706', border:'#D97706' },
  low:    { bg:'#F3F4F6', fg:'#6B7280', border:'#9CA3AF' },
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs/60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins/60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours/24)
  return `${days} day${days===1?'':'s'} ago`
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<any[]>([])
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Open')

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href='/login'; return }

    const [pmRes, eaRes, strProps] = await Promise.all([
      supabase.from('pm_maintenance').select('*,pm_properties(name)').eq('user_id',user.id).order('created_at',{ascending:false}),
      supabase.from('estate_maintenance').select('*,estate_properties(name)').eq('user_id',user.id).order('created_at',{ascending:false}),
      // maintenance_tickets has no user_id column -- scoped via the
      // business's own properties instead, same pattern str/page.tsx
      // itself uses.
      supabase.from('properties').select('id,name').eq('user_id',user.id),
    ])
    const strPropIds = (strProps.data??[]).map((p:any)=>p.id)
    const strRes = strPropIds.length
      ? await supabase.from('maintenance_tickets').select('*,properties(name)').in('property_id',strPropIds).order('created_at',{ascending:false})
      : { data: [] }

    const all = [
      ...(pmRes.data??[]).map((m:any)=>({ ...m, module:'pm', propertyName: m.pm_properties?.name })),
      ...(eaRes.data??[]).map((m:any)=>({ ...m, module:'estate', propertyName: m.estate_properties?.name })),
      ...(strRes.data??[]).map((m:any)=>({ ...m, module:'str', propertyName: m.properties?.name })),
    ]
    all.sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())
    setTickets(all)
    setLoading(false)
  }

  async function updateStatus(ticket: any, status: string) {
    const table = ticket.module==='pm' ? 'pm_maintenance' : ticket.module==='estate' ? 'estate_maintenance' : 'maintenance_tickets'
    await supabase.from(table).update({ status }).eq('id', ticket.id)
    setTickets(prev=>prev.map(t=>t.id===ticket.id&&t.module===ticket.module?{...t,status}:t))
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const filtered = tickets
    .filter((t:any)=>moduleFilter==='All'||t.module===moduleFilter)
    .filter((t:any)=>statusFilter==='All'||(statusFilter==='Open'?t.status!=='resolved'&&t.status!=='closed':t.status===statusFilter))
  const urgentCount = tickets.filter((t:any)=>t.priority==='urgent'&&t.status!=='resolved'&&t.status!=='closed').length
  const openCount = tickets.filter((t:any)=>t.status!=='resolved'&&t.status!=='closed').length

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Maintenance Board</div>
        </div>
      </div>

      <div style={{padding:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>Open Jobs</div>
            <div style={{fontSize:26,fontWeight:800,color:'#101828'}}>{openCount}</div>
          </div>
          <div style={{background:'#fff',border:urgentCount>0?'1px solid #FEE2E2':'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>Urgent</div>
            <div style={{fontSize:26,fontWeight:800,color:urgentCount>0?'#DC2626':'#101828'}}>{urgentCount}</div>
          </div>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>Total Tickets</div>
            <div style={{fontSize:26,fontWeight:800,color:'#101828'}}>{tickets.length}</div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap' as const,gap:10}}>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setModuleFilter('All')} style={{padding:'6px 14px',borderRadius:20,border:moduleFilter==='All'?'1px solid '+ACCENT:'1px solid #E4E7EC',background:moduleFilter==='All'?ACCENT+'12':'#fff',color:moduleFilter==='All'?ACCENT:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>All</button>
            {MODULES.map(m=>(
              <button key={m.key} onClick={()=>setModuleFilter(m.key)} style={{padding:'6px 14px',borderRadius:20,border:moduleFilter===m.key?'1px solid '+m.fg:'1px solid #E4E7EC',background:moduleFilter===m.key?m.bg:'#fff',color:moduleFilter===m.key?m.fg:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{m.label}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            {['Open','All'].map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)} style={{padding:'6px 14px',borderRadius:20,border:statusFilter===s?'1px solid #101828':'1px solid #E4E7EC',background:statusFilter===s?'#101828':'#fff',color:statusFilter===s?'#fff':'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
          {filtered.length===0?(
            <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',background:'#fff',borderRadius:12,border:'1px solid #E4E7EC'}}>
              <div style={{fontSize:36,marginBottom:12}}>🔧</div>
              <div style={{fontSize:14,fontWeight:600,color:'#101828'}}>Nothing here</div>
            </div>
          ):filtered.map((t:any)=>{
            const p = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium
            const mod = MODULES.find(m=>m.key===t.module)
            return (
              <div key={t.module+t.id} style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',borderLeft:'3px solid '+p.border,padding:'14px 20px',display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,background:p.bg,color:p.fg,letterSpacing:'0.03em',textTransform:'uppercase' as const}}>{t.priority}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{t.title}</div>
                  <div style={{fontSize:12,color:'#667085',marginTop:2}}>{t.propertyName??'—'} · {mod?.label} {t.assigned_to?`· ${t.assigned_to}`:''}</div>
                </div>
                <span style={{fontSize:11,color:'#98A2B3'}}>{relativeTime(t.created_at)}</span>
                <select value={t.status} onChange={e=>updateStatus(t,e.target.value)} style={{fontSize:12,padding:'5px 10px',borderRadius:6,border:'1px solid #E4E7EC',fontFamily:'inherit',cursor:'pointer'}}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
