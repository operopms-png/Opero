'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const CHANNELS = [
  { key:'str_owner', label:'VR Owner', bg:'#EEF1FF', fg:'#3B4AFF',
    table:'owner_messages', recipientTable:'owner_profiles', idField:'owner_id', sendRoute:'/api/admin/send-message', sendBody:'owner_id' },
  { key:'pm_landlord', label:'PM Landlord', bg:'#EEF1FF', fg:'#3B4AFF',
    table:'pm_landlord_messages', recipientTable:'pm_landlords', idField:'landlord_id', sendRoute:'/api/admin/send-landlord-message', sendBody:'landlord_id' },
  { key:'pm_tenant', label:'PM Tenant', bg:'#EEF1FF', fg:'#3B4AFF',
    table:'pm_tenant_messages', recipientTable:'pm_tenants', idField:'tenant_id', sendRoute:'/api/admin/send-tenant-message', sendBody:'tenant_id' },
  { key:'estate_tenant', label:'EA Tenant', bg:'#EAF3EE', fg:'#2D6A4F',
    table:'estate_tenant_messages', recipientTable:'estate_tenants', idField:'tenant_id', sendRoute:'/api/admin/send-estate-tenant-message', sendBody:'tenant_id' },
  { key:'estate_landlord', label:'EA Landlord', bg:'#EAF3EE', fg:'#2D6A4F',
    table:'estate_landlord_messages', recipientTable:'estate_landlords', idField:'landlord_id', sendRoute:'/api/admin/send-estate-landlord-message', sendBody:'landlord_id' },
]
// The sender value that means "this message came from the other
// party, not staff" -- differs per channel's own convention.
const NON_STAFF_SENDER: Record<string,string> = { str_owner:'owner', pm_landlord:'landlord', pm_tenant:'tenant', estate_tenant:'tenant', estate_landlord:'landlord' }

function initials(name: string) {
  return (name||'?').split(' ').filter(Boolean).slice(0,2).map((w:string)=>w[0]?.toUpperCase()).join('')
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
  const [conversations, setConversations] = useState<any[]>([])
  const [openConvo, setOpenConvo] = useState<any>(null)
  const [thread, setThread] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('All')

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href='/login'; return }

    const allConvos: any[] = []
    for (const ch of CHANNELS) {
      // Explicit two-step fetch (recipients scoped to this business,
      // then their messages) rather than relying on an unfiltered
      // query + implicit RLS -- safer since not every one of these
      // five tables' exact RLS policy could be independently verified
      // while building this.
      // owner_profiles is the one exception: unlike the other four
      // recipient tables, its own user_id column is the OWNER's own
      // portal login id, not a staff-scoping column -- the app's own
      // staff-facing code fetches it with no filter at all, relying on
      // RLS to scope it correctly. Matching that here rather than
      // filtering by user_id, which would silently return nothing.
      const recipientQuery = ch.key === 'str_owner'
        ? supabase.from(ch.recipientTable).select('id,name')
        : supabase.from(ch.recipientTable).select('id,name').eq('user_id', user.id)
      const { data: recipients } = await recipientQuery
      const ids = (recipients??[]).map((r:any)=>r.id)
      if (ids.length===0) continue
      const { data: msgs } = await supabase.from(ch.table).select('*').in(ch.idField, ids).order('created_at',{ascending:false})
      const byRecipient: Record<string, any[]> = {}
      for (const m of msgs??[]) {
        const rid = (m as any)[ch.idField]
        if (!byRecipient[rid]) byRecipient[rid] = []
        byRecipient[rid].push(m)
      }
      for (const r of recipients??[]) {
        const msgsForR = byRecipient[r.id]
        if (!msgsForR || msgsForR.length===0) continue
        const last = msgsForR[0] // already sorted desc
        allConvos.push({
          channel: ch.key, channelLabel: ch.label, channelBg: ch.bg, channelFg: ch.fg,
          recipientId: r.id, recipientName: r.name,
          lastMessage: last.message, lastAt: last.created_at,
          unread: last.sender === NON_STAFF_SENDER[ch.key],
        })
      }
    }
    allConvos.sort((a,b)=>new Date(b.lastAt).getTime()-new Date(a.lastAt).getTime())
    setConversations(allConvos)
    setLoading(false)
  }

  async function openThread(convo: any) {
    setOpenConvo(convo)
    const ch = CHANNELS.find(c=>c.key===convo.channel)!
    const { data } = await supabase.from(ch.table).select('*').eq(ch.idField, convo.recipientId).order('created_at',{ascending:true})
    setThread(data??[])
  }

  async function sendReply() {
    if (!reply.trim() || !openConvo) return
    setSending(true)
    const ch = CHANNELS.find(c=>c.key===openConvo.channel)!
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(ch.sendRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token??''}` },
      body: JSON.stringify({ [ch.sendBody]: openConvo.recipientId, message: reply.trim() }),
    })
    setSending(false)
    if (!res.ok) { const r = await res.json(); alert(r.error||'Could not send'); return }
    setReply('')
    await openThread(openConvo)
    await load()
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const filtered = filter==='All' ? conversations : conversations.filter(c=>c.channel===filter)
  const unreadCount = conversations.filter(c=>c.unread).length

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Inbox {unreadCount>0&&<span style={{marginLeft:8,background:'#DC2626',color:'#fff',fontSize:11,fontWeight:700,borderRadius:10,padding:'2px 8px'}}>{unreadCount} unread</span>}</div>
        </div>
      </div>

      <div style={{display:'flex',height:'calc(100vh - 56px)'}}>
        <div style={{width:340,borderRight:'1px solid #E4E7EC',background:'#fff',overflowY:'auto' as const}}>
          <div style={{display:'flex',gap:6,padding:14,flexWrap:'wrap' as const,borderBottom:'1px solid #F2F4F7'}}>
            <button onClick={()=>setFilter('All')} style={{padding:'5px 12px',borderRadius:16,border:filter==='All'?'1px solid '+ACCENT:'1px solid #E4E7EC',background:filter==='All'?ACCENT+'12':'#fff',color:filter==='All'?ACCENT:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>All</button>
            {CHANNELS.map(ch=>(
              <button key={ch.key} onClick={()=>setFilter(ch.key)} style={{padding:'5px 12px',borderRadius:16,border:filter===ch.key?'1px solid '+ch.fg:'1px solid #E4E7EC',background:filter===ch.key?ch.bg:'#fff',color:filter===ch.key?ch.fg:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ch.label}</button>
            ))}
          </div>
          {filtered.length===0?(
            <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',fontSize:13}}>No conversations yet.</div>
          ):filtered.map((c:any,i:number)=>(
            <div key={c.channel+c.recipientId} onClick={()=>openThread(c)} style={{padding:'14px 18px',borderBottom:'1px solid #F2F4F7',cursor:'pointer',background:openConvo?.recipientId===c.recipientId&&openConvo?.channel===c.channel?'#F5F6FF':'transparent',display:'flex',gap:10}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:c.channelBg,color:c.channelFg,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{initials(c.recipientName)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:c.unread?700:500,color:'#101828'}}>{c.recipientName}</span>
                  <span style={{fontSize:10,color:'#98A2B3',flexShrink:0}}>{relativeTime(c.lastAt)}</span>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:c.channelFg,margin:'2px 0'}}>{c.channelLabel}</div>
                <div style={{fontSize:12,color:c.unread?'#344054':'#98A2B3',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis',fontWeight:c.unread?600:400}}>{c.lastMessage}</div>
              </div>
              {c.unread&&<div style={{width:8,height:8,borderRadius:'50%',background:ACCENT,flexShrink:0,marginTop:4}}/>}
            </div>
          ))}
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column' as const}}>
          {!openConvo?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3',fontSize:13}}>Select a conversation</div>
          ):(
            <>
              <div style={{padding:'16px 24px',borderBottom:'1px solid #E4E7EC',background:'#fff',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:openConvo.channelBg,color:openConvo.channelFg,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(openConvo.recipientName)}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>{openConvo.recipientName}</div>
                  <div style={{fontSize:11,color:openConvo.channelFg,fontWeight:600}}>{openConvo.channelLabel}</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto' as const,padding:24,display:'flex',flexDirection:'column' as const,gap:10}}>
                {thread.map((m:any)=>{
                  const isStaff = m.sender !== NON_STAFF_SENDER[openConvo.channel]
                  return (
                    <div key={m.id} style={{alignSelf:isStaff?'flex-end':'flex-start',maxWidth:'65%'}}>
                      <div style={{background:isStaff?ACCENT:'#F2F4F7',color:isStaff?'#fff':'#101828',borderRadius:12,padding:'10px 14px',fontSize:13}}>{m.message}</div>
                      <div style={{fontSize:10,color:'#98A2B3',marginTop:3,textAlign:isStaff?'right' as const:'left' as const}}>{isStaff?'Staff':openConvo.recipientName} · {new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{borderTop:'1px solid #E4E7EC',padding:16,display:'flex',gap:10,background:'#fff'}}>
                <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendReply()} placeholder="Type a reply…" style={{flex:1,padding:'10px 14px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
                <button onClick={sendReply} disabled={sending||!reply.trim()} style={{padding:'10px 22px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:sending||!reply.trim()?0.6:1}}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
