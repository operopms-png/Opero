'use client'
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const CATEGORIES = [
  { key:'Deal Closed', label:'Deal Closed', icon:'🤝', color:'#3B4AFF' },
  { key:'Client Onboarded (Short-Term)', label:'Client Onboarded — Short-Term', icon:'🏠', color:'#10B981' },
  { key:'Client Onboarded (Long-Term)', label:'Client Onboarded — Long-Term', icon:'🏢', color:'#059669' },
  { key:'Joint Venture Secured', label:'Joint Venture Secured', icon:'🔗', color:'#8B5CF6' },
  { key:'Investor Secured', label:'Investor Secured', icon:'💰', color:'#F59E0B' },
  { key:'Tenant Secured', label:'Tenant Secured (Vacancy Filled)', icon:'🔑', color:'#2D6A4F' },
]
const MODULES = [
  { key:'', label:'—' },
  { key:'str', label:'Vacation Rentals' },
  { key:'pm', label:'Property Management' },
  { key:'estate', label:'Estate Agency' },
  { key:'dev', label:'Developments' },
]
const PERIODS = ['This Month','This Quarter','This Year','All Time']

function periodStart(period: string) {
  const now = new Date()
  if (period==='This Month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period==='This Quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1)
  if (period==='This Year') return new Date(now.getFullYear(), 0, 1)
  return null
}

function initials(name: string) {
  return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join('')
}

const AVATAR_COLORS = ['#3B4AFF','#10B981','#F59E0B','#8B5CF6','#EC4899','#2D6A4F','#DC2626','#0891B2']
function avatarColor(name: string) {
  let hash = 0
  for (let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [wins, setWins] = useState<any[]>([])
  const [period, setPeriod] = useState('This Month')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showAddWin, setShowAddWin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({staff_name:'',category:CATEGORIES[0].key,title:'',value:'',module:'',date_achieved:new Date().toISOString().slice(0,10),notes:''})

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href='/login'; return }
    const accountId = await getAccountId(user)
    const { data } = await supabase.from('staff_performance_wins').select('*').eq('user_id',accountId).order('date_achieved',{ascending:false})
    setWins(data ?? [])
    setLoading(false)
  }

  async function saveWin() {
    if (!form.staff_name.trim() || !form.title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const accountId = await getAccountId(user!)
    const payload = { ...form, value: form.value ? parseFloat(form.value) : null, module: form.module || null, user_id: accountId }
    const { error } = await supabase.from('staff_performance_wins').insert([payload])
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm({staff_name:'',category:CATEGORIES[0].key,title:'',value:'',module:'',date_achieved:new Date().toISOString().slice(0,10),notes:''})
    setShowAddWin(false)
    await load()
  }

  async function delWin(id: string) {
    if (!confirm('Delete this win?')) return
    await supabase.from('staff_performance_wins').delete().eq('id',id)
    setWins(prev=>prev.filter((w:any)=>w.id!==id))
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const start = periodStart(period)
  const filtered = wins
    .filter((w:any)=>!start || new Date(w.date_achieved) >= start)
    .filter((w:any)=>categoryFilter==='All' || w.category===categoryFilter)

  const byStaff: Record<string, { name:string, count:number, value:number, byCategory: Record<string,number> }> = {}
  for (const w of filtered) {
    if (!byStaff[w.staff_name]) byStaff[w.staff_name] = { name:w.staff_name, count:0, value:0, byCategory:{} }
    byStaff[w.staff_name].count++
    byStaff[w.staff_name].value += parseFloat(w.value)||0
    byStaff[w.staff_name].byCategory[w.category] = (byStaff[w.staff_name].byCategory[w.category]||0)+1
  }
  const leaderboard = Object.values(byStaff).sort((a,b)=>b.value-a.value || b.count-a.count)

  const totalWins = filtered.length
  const totalValue = filtered.reduce((s:number,w:any)=>s+(parseFloat(w.value)||0),0)

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Staff Performance</div>
        </div>
        <button onClick={()=>setShowAddWin(true)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Log a Win</button>
      </div>

      <div style={{padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:10}}>
          <div style={{display:'flex',gap:8}}>
            {PERIODS.map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{padding:'7px 14px',borderRadius:20,border:period===p?'1px solid '+ACCENT:'1px solid #E4E7EC',background:period===p?ACCENT+'12':'#fff',color:period===p?ACCENT:'#667085',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{p}</button>
            ))}
          </div>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #D0D5DD',fontSize:12,fontFamily:'inherit'}}>
            <option value="All">All categories</option>
            {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:6}}>Total Wins</div>
            <div style={{fontSize:26,fontWeight:800,color:'#101828'}}>{totalWins}</div>
          </div>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:6}}>Total Value</div>
            <div style={{fontSize:26,fontWeight:800,color:'#10B981'}}>£{totalValue.toLocaleString()}</div>
          </div>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:12,padding:'18px 22px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#667085',textTransform:'uppercase' as const,marginBottom:6}}>Staff on the Board</div>
            <div style={{fontSize:26,fontWeight:800,color:'#101828'}}>{leaderboard.length}</div>
          </div>
        </div>

        {showAddWin&&(
          <div style={{background:'#fff',borderRadius:12,border:'1px solid '+ACCENT,padding:24,marginBottom:24}}>
            <h3 style={{fontSize:15,fontWeight:600,color:'#101828',margin:'0 0 16px'}}>Log a Win</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Staff Member *</label><input value={form.staff_name} onChange={e=>setForm({...form,staff_name:e.target.value})} placeholder="e.g. Safiya Reid" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Category *</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>
                  {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'span 2'}}><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>What happened? *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Closed sale on 12 Elm Road" style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Value (£, optional)</label><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="Deal size, investment, annual rent..." style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Module</label>
                <select value={form.module} onChange={e=>setForm({...form,module:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>
                  {MODULES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Date</label><input type="date" value={form.date_achieved} onChange={e=>setForm({...form,date_achieved:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <div style={{gridColumn:'span 2'}}><label style={{fontSize:12,fontWeight:600,color:'#344054',marginBottom:4,display:'block'}}>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{width:'100%',padding:'9px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={saveWin} disabled={saving||!form.staff_name.trim()||!form.title.trim()} style={{padding:'9px 20px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:saving||!form.staff_name.trim()||!form.title.trim()?0.6:1}}>{saving?'Saving…':'Log Win'}</button>
              <button onClick={()=>setShowAddWin(false)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #D0D5DD',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#344054'}}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:12}}>🏆 Leaderboard — {period}</div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden',marginBottom:32}}>
          {leaderboard.length===0?(
            <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3'}}><div style={{fontSize:36,marginBottom:12}}>🏆</div><div style={{fontSize:14,fontWeight:600,color:'#101828'}}>No wins logged for this period yet</div></div>
          ):leaderboard.map((s,i)=>(
            <div key={s.name} style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',borderBottom:'1px solid #F2F4F7',background:i===0?'#FFFBEB':'transparent'}}>
              <div style={{width:28,textAlign:'center' as const,fontSize:i<3?18:13,fontWeight:700,color:i===0?'#F59E0B':i===1?'#94A3B8':i===2?'#B45309':'#98A2B3'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
              <div style={{width:40,height:40,borderRadius:'50%',background:avatarColor(s.name)+'22',color:avatarColor(s.name),fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{initials(s.name)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>{s.name}</div>
                <div style={{fontSize:11,color:'#667085',marginTop:2}}>{Object.entries(s.byCategory).map(([cat,n])=>`${CATEGORIES.find(c=>c.key===cat)?.icon||''} ${n}`).join('   ')}</div>
              </div>
              <div style={{textAlign:'right' as const}}>
                <div style={{fontSize:16,fontWeight:800,color:'#10B981'}}>£{s.value.toLocaleString()}</div>
                <div style={{fontSize:11,color:'#98A2B3'}}>{s.count} win{s.count===1?'':'s'}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{fontSize:14,fontWeight:700,color:'#101828',marginBottom:12}}>Recent Activity</div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #E4E7EC',overflow:'hidden'}}>
          {filtered.length===0?(
            <div style={{textAlign:'center' as const,padding:40,color:'#98A2B3',fontSize:13}}>Nothing logged for this period yet.</div>
          ):filtered.map((w:any)=>{
            const cat = CATEGORIES.find(c=>c.key===w.category)
            return (
              <div key={w.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:'1px solid #F2F4F7'}}>
                <span style={{fontSize:18}}>{cat?.icon||'⭐'}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#101828'}}>{w.title}</div>
                  <div style={{fontSize:11,color:'#667085',marginTop:2}}>{w.staff_name} · {cat?.label||w.category} · {w.date_achieved}{w.module?` · ${MODULES.find(m=>m.key===w.module)?.label}`:''}</div>
                </div>
                {w.value>0&&<span style={{fontSize:13,fontWeight:700,color:'#10B981'}}>£{parseFloat(w.value).toLocaleString()}</span>}
                <button onClick={()=>delWin(w.id)} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',fontSize:11,cursor:'pointer',color:'#EF4444'}}>×</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
