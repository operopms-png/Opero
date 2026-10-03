'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import CallButton from '@/components/CallButton'

const ACCENT = '#A8862E'
const CHANNELS = [
  { key:'str_owner', label:'VR Owner', bg:'#FBF4E6', fg:'#A8862E',
    table:'owner_messages', recipientTable:'owner_profiles', idField:'owner_id', sendRoute:'/api/admin/send-message', sendBody:'owner_id' },
  { key:'pm_landlord', label:'PM Landlord', bg:'#FBF4E6', fg:'#A8862E',
    table:'pm_landlord_messages', recipientTable:'pm_landlords', idField:'landlord_id', sendRoute:'/api/admin/send-landlord-message', sendBody:'landlord_id' },
  { key:'pm_tenant', label:'PM Tenant', bg:'#FBF4E6', fg:'#A8862E',
    table:'pm_tenant_messages', recipientTable:'pm_tenants', idField:'tenant_id', sendRoute:'/api/admin/send-tenant-message', sendBody:'tenant_id' },
  { key:'estate_tenant', label:'EA Tenant', bg:'#EAF3EE', fg:'#2D6A4F',
    table:'estate_tenant_messages', recipientTable:'estate_tenants', idField:'tenant_id', sendRoute:'/api/admin/send-estate-tenant-message', sendBody:'tenant_id' },
  { key:'estate_landlord', label:'EA Landlord', bg:'#EAF3EE', fg:'#2D6A4F',
    table:'estate_landlord_messages', recipientTable:'estate_landlords', idField:'landlord_id', sendRoute:'/api/admin/send-estate-landlord-message', sendBody:'landlord_id' },
  { key:'str_guest', label:'Guest (Airbnb)', bg:'#FFEDEE', fg:'#E0484E',
    table:'str_guest_messages', recipientTable:'bookings', idField:'booking_id', sendRoute:'/api/guest-send', sendBody:'booking_id' },
]
const WHATSAPP_BG = '#E7F9F0'
const WHATSAPP_FG = '#1DA851'
const SMS_BG = '#FFF4E5'
const SMS_FG = '#B45309'
const TEAM_BG = '#F5F3FF'
const TEAM_FG = '#A8862E'
const CALLS_BG = '#FFF1F2'
const CALLS_FG = '#E11D48'
const NON_STAFF_SENDER: Record<string,string> = { str_guest:'guest', str_owner:'owner', pm_landlord:'landlord', pm_tenant:'tenant', estate_tenant:'tenant', estate_landlord:'landlord', whatsapp:'contact', sms:'contact' }

const TABS = ['Unread', 'All'] as const
// CRM-style label colours for each channel
const CH_COLOR: Record<string,string> = { str_guest:'#FF5A5F', team:'#D0AE4C', calls:'#DF2F4A', str_owner:'#00C875', pm_landlord:'#579BFC', pm_tenant:'#66CCFF', estate_tenant:'#9D50DD', estate_landlord:'#784BD1', whatsapp:'#1DA851', sms:'#FDAB3D' }
const CHANNEL_PILLS = [{ key:'team', label:'Team Chat', bg:TEAM_BG, fg:TEAM_FG }, { key:'calls', label:'Calls', bg:CALLS_BG, fg:CALLS_FG }, ...CHANNELS]

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

function fmtDuration(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s/60), sec = s%60
  return `${m}:${String(sec).padStart(2,'0')}`
}

const CALL_STATUS_LABEL: Record<string,string> = { 'completed':'Completed', 'in-progress':'In progress', 'missed':'Missed', 'no-answer':'No answer', 'failed':'Failed' }

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [identity, setIdentity] = useState<{ email:string; name:string; isAdmin:boolean; businessId:string } | null>(null)
  const [team, setTeam] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [openConvo, setOpenConvo] = useState<any>(null)
  const [thread, setThread] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<typeof TABS[number]>('All')
  const [filter, setFilter] = useState('All')
  const [waConnections, setWaConnections] = useState<any[]>([])
  const [activeWaConnection, setActiveWaConnection] = useState<string | null>(null)
  const [activeSmsConnection, setActiveSmsConnection] = useState<string | null>(null)
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [newConvoName, setNewConvoName] = useState('')
  const [newConvoMembers, setNewConvoMembers] = useState<string[]>([])
  const [creatingConvo, setCreatingConvo] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if (activeWaConnection) loadWaConversations(activeWaConnection) }, [activeWaConnection])
  useEffect(()=>{ if (activeSmsConnection) loadSmsConversations(activeSmsConnection) }, [activeSmsConnection])

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: rows } = await supabase.from('team_members').select('*').eq('email', user.email).order('created_at', { ascending: false }).limit(1)
    const m = rows?.[0]
    const id = m
      ? { email: user.email!, name: m.name, isAdmin: false, businessId: m.user_id }
      : { email: user.email!, name: user.email!.split('@')[0], isAdmin: true, businessId: user.id }
    setIdentity(id)

    if (id.isAdmin) {
      const { data: teamRows } = await supabase.from('team_members').select('*').eq('user_id', id.businessId).order('name')
      setTeam(teamRows ?? [])
    }

    await Promise.all([loadExternal(id), loadTeamConversations(id), loadWaConnections(), loadCallLogs()])
    setLoading(false)
  }

  async function loadCallLogs() {
    const res = await fetch('/api/voice/log', { headers: await authHeaders() })
    if (!res.ok) return
    const result = await res.json()
    const callConvos = (result.calls ?? []).map((c:any) => ({
      channel: 'calls', channelLabel: 'Calls', channelBg: CALLS_BG, channelFg: CALLS_FG,
      recipientId: c.id, recipientName: c.contact_name || c.contact_phone || 'Unknown',
      lastMessage: `${c.direction === 'outbound' ? 'Outgoing' : 'Incoming'} · ${CALL_STATUS_LABEL[c.status] ?? c.status} · ${fmtDuration(c.duration_seconds)}`,
      lastAt: c.created_at, unread: false,
      callDirection: c.direction, callStatus: c.status, callDuration: c.duration_seconds, callPhone: c.contact_phone,
    }))
    setConversations(prev => [...prev.filter(c=>c.channel!=='calls'), ...callConvos])
  }

  async function loadWaConnections() {
    const res = await fetch('/api/whatsapp/connections', { headers: await authHeaders() })
    if (!res.ok) return
    const result = await res.json()
    setWaConnections(result.connections ?? [])
    if (result.connections?.length && !activeWaConnection) setActiveWaConnection(result.connections[0].id)
    if (result.connections?.length && !activeSmsConnection) setActiveSmsConnection(result.connections[0].id)
  }

  async function loadSmsConversations(connectionId: string) {
    const res = await fetch(`/api/sms/messages?connection_id=${connectionId}`, { headers: await authHeaders() })
    if (!res.ok) return
    const result = await res.json()
    const conn = waConnections.find(c=>c.id===connectionId)
    const smsConvos = (result.conversations ?? []).map((c:any)=>({
      channel: 'sms', channelLabel: conn?.label ?? 'SMS', channelBg: SMS_BG, channelFg: SMS_FG,
      recipientId: c.contact_phone, recipientName: c.contact_name || c.contact_phone,
      lastMessage: c.last_message, lastAt: c.last_at, unread: c.unread, connectionId,
    }))
    setConversations(prev => [...prev.filter(c=>c.channel!=='sms'), ...smsConvos].sort((a,b)=>new Date(b.lastAt).getTime()-new Date(a.lastAt).getTime()))
  }

  async function loadWaConversations(connectionId: string) {
    const res = await fetch(`/api/whatsapp/messages?connection_id=${connectionId}`, { headers: await authHeaders() })
    if (!res.ok) return
    const result = await res.json()
    const conn = waConnections.find(c=>c.id===connectionId)
    const waConvos = (result.conversations ?? []).map((c:any)=>({
      channel: 'whatsapp', channelLabel: conn?.label ?? 'WhatsApp', channelBg: WHATSAPP_BG, channelFg: WHATSAPP_FG,
      recipientId: c.contact_phone, recipientName: c.contact_name || c.contact_phone,
      lastMessage: c.last_message, lastAt: c.last_at, unread: c.unread, connectionId,
    }))
    setConversations(prev => [...prev.filter(c=>c.channel!=='whatsapp'), ...waConvos].sort((a,b)=>new Date(b.lastAt).getTime()-new Date(a.lastAt).getTime()))
  }

  async function loadExternal(id: { businessId: string }) {
    const allConvos: any[] = []
    for (const ch of CHANNELS) {
      let recipients: any[] | null
      if (ch.key === 'str_guest') {
        // Airbnb/Booking.com guests: one conversation per booking (synced from Smoobu)
        const { data } = await supabase.from('bookings').select('id,guest_name,platform,properties!inner(user_id,name)').eq('properties.user_id', id.businessId)
        recipients = (data ?? []).map((b: any) => ({ id: b.id, name: `${(b.guest_name || 'Guest').trim()} · ${b.properties?.name ?? ''}${b.platform ? ` (${b.platform})` : ''}` }))
      } else {
        const recipientQuery = ch.key === 'str_owner'
          ? supabase.from(ch.recipientTable).select('id,name')
          : supabase.from(ch.recipientTable).select('id,name').eq('user_id', id.businessId)
        recipients = (await recipientQuery).data
      }
      const ids = (recipients??[]).map((r:any)=>r.id)
      if (ids.length===0) continue
      const { data: msgs } = await supabase.from(ch.table).select('*').in(ch.idField, ids).order('created_at',{ascending:false})
      const byRecipient: Record<string, any[]> = {}
      for (const msg of msgs??[]) {
        const rid = (msg as any)[ch.idField]
        if (!byRecipient[rid]) byRecipient[rid] = []
        byRecipient[rid].push(msg)
      }
      for (const r of recipients??[]) {
        const msgsForR = byRecipient[r.id]
        if (!msgsForR || msgsForR.length===0) continue
        const last = msgsForR[0]
        allConvos.push({
          channel: ch.key, channelLabel: ch.label, channelBg: ch.bg, channelFg: ch.fg,
          recipientId: r.id, recipientName: r.name,
          lastMessage: last.message, lastAt: last.created_at,
          unread: last.sender === NON_STAFF_SENDER[ch.key],
        })
      }
    }
    setConversations(prev => [...prev.filter(c=>!CHANNELS.some(ch=>ch.key===c.channel)), ...allConvos])
  }

  async function loadTeamConversations(id: { email:string; businessId:string }) {
    const { data: convos } = await supabase.from('staff_conversations').select('*').order('created_at', { ascending: false })
    if (!convos || convos.length === 0) return
    const convoIds = convos.map((c:any)=>c.id)
    const [{ data: allMembers }, { data: allMessages }] = await Promise.all([
      supabase.from('staff_conversation_members').select('*').in('conversation_id', convoIds),
      supabase.from('staff_messages').select('*').in('conversation_id', convoIds).order('created_at', { ascending: false }),
    ])
    const teamConvos = convos.map((c:any) => {
      const members = (allMembers ?? []).filter((m:any) => m.conversation_id === c.id)
      const lastMsg = (allMessages ?? []).find((msg:any) => msg.conversation_id === c.id)
      const myMembership = members.find((m:any) => m.member_email === id.email)
      const unread = !!lastMsg && lastMsg.sender_email !== id.email && (!myMembership?.last_read_at || new Date(lastMsg.created_at) > new Date(myMembership.last_read_at))
      const other = members.length === 2 ? members.find((m:any) => m.member_email !== id.email) : null
      return {
        channel: 'team', channelLabel: 'Team Chat', channelBg: TEAM_BG, channelFg: TEAM_FG,
        recipientId: c.id, recipientName: c.name,
        lastMessage: lastMsg?.body ?? 'No messages yet', lastAt: lastMsg?.created_at ?? c.created_at,
        unread, members, teamMemberEmail: other?.member_email, teamMemberName: other?.member_name,
      }
    })
    setConversations(prev => [...prev.filter(c=>c.channel!=='team'), ...teamConvos])
  }

  async function openThread(convo: any) {
    setOpenConvo(convo)
    if (convo.channel === 'calls') { setThread([]); return }
    if (convo.channel === 'whatsapp' || convo.channel === 'sms') {
      const base = convo.channel === 'whatsapp' ? '/api/whatsapp/messages' : '/api/sms/messages'
      const res = await fetch(`${base}?connection_id=${convo.connectionId}&contact_phone=${encodeURIComponent(convo.recipientId)}`, { headers: await authHeaders() })
      const result = await res.json()
      setThread((result.messages ?? []).map((msg:any)=>({ id:msg.id, message:msg.body, sender:msg.sender, created_at:msg.created_at })))
      return
    }
    if (convo.channel === 'team') {
      const { data } = await supabase.from('staff_messages').select('*').eq('conversation_id', convo.recipientId).order('created_at', { ascending: true })
      setThread((data ?? []).map((msg:any) => ({ id: msg.id, message: msg.body, sender: msg.sender_email, senderName: msg.sender_name, created_at: msg.created_at })))
      if (identity) {
        const now = new Date().toISOString()
        await supabase.from('staff_conversation_members').update({ last_read_at: now }).eq('conversation_id', convo.recipientId).eq('member_email', identity.email)
        setConversations(prev => prev.map(c => c.channel==='team' && c.recipientId===convo.recipientId ? { ...c, unread: false } : c))
      }
      return
    }
    const ch = CHANNELS.find(c=>c.key===convo.channel)!
    const { data } = await supabase.from(ch.table).select('*').eq(ch.idField, convo.recipientId).order('created_at',{ascending:true})
    setThread(data??[])
  }

  async function sendReply() {
    if (!reply.trim() || !openConvo || !identity) return
    setSending(true)
    if (openConvo.channel === 'whatsapp' || openConvo.channel === 'sms') {
      const sendRoute = openConvo.channel === 'whatsapp' ? '/api/whatsapp/send' : '/api/sms/send'
      const res = await fetch(sendRoute, {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ connection_id: openConvo.connectionId, to: openConvo.recipientId, body: reply.trim() }),
      })
      setSending(false)
      if (!res.ok) { const r = await res.json(); alert(r.error||'Could not send'); return }
      setReply('')
      await openThread(openConvo)
      if (openConvo.channel === 'whatsapp') await loadWaConversations(openConvo.connectionId)
      else await loadSmsConversations(openConvo.connectionId)
      return
    }
    if (openConvo.channel === 'team') {
      const { error } = await supabase.from('staff_messages').insert({
        conversation_id: openConvo.recipientId, sender_email: identity.email, sender_name: identity.name, body: reply.trim(),
      })
      setSending(false)
      if (error) { alert(error.message); return }
      setReply('')
      await openThread(openConvo)
      await loadTeamConversations(identity)
      return
    }
    const ch = CHANNELS.find(c=>c.key===openConvo.channel)!
    const res = await fetch(ch.sendRoute, {
      method: 'POST', headers: await authHeaders(),
      body: JSON.stringify({ [ch.sendBody]: openConvo.recipientId, message: reply.trim() }),
    })
    setSending(false)
    if (!res.ok) { const r = await res.json(); alert(r.error||'Could not send'); return }
    setReply('')
    await openThread(openConvo)
    await loadExternal(identity)
  }

  async function createConversation() {
    if (!newConvoName.trim() || newConvoMembers.length === 0 || !identity) return
    setCreatingConvo(true)
    const { data: convo, error } = await supabase.from('staff_conversations').insert({ user_id: identity.businessId, name: newConvoName.trim() }).select().single()
    if (error || !convo) { setCreatingConvo(false); alert(error?.message || 'Could not create conversation'); return }

    const memberRows = newConvoMembers.map((staffId) => {
      const t = team.find((x: any) => x.id === staffId)
      return { conversation_id: convo.id, member_email: t?.email, member_name: t?.name }
    })
    memberRows.push({ conversation_id: convo.id, member_email: identity.email, member_name: identity.name })

    const { error: memberError } = await supabase.from('staff_conversation_members').insert(memberRows)
    setCreatingConvo(false)
    if (memberError) { alert(memberError.message); return }

    setShowNewConvo(false)
    setNewConvoName('')
    setNewConvoMembers([])
    await loadTeamConversations(identity)
    setFilter('team')
  }

  if (loading || !identity) return <div style={{minHeight: 'calc(100vh - var(--hub-h, 0px))',display:'flex',alignItems:'center',justifyContent:'center',color:'#9699A6',fontFamily:'Figtree, Inter, sans-serif'}}>Loading conversations…</div>

  const q = search.trim().toLowerCase()
  const tabFiltered = tab==='Unread' ? conversations.filter(c=>c.unread) : conversations
  const filtered = (filter==='All' ? tabFiltered : tabFiltered.filter(c=>c.channel===filter))
    .filter(c => !q || `${c.recipientName} ${c.lastMessage} ${c.channelLabel}`.toLowerCase().includes(q))
  const sorted = [...filtered].sort((a,b)=>new Date(b.lastAt).getTime()-new Date(a.lastAt).getTime())
  const unreadCount = conversations.filter(c=>c.unread).length
  const isOpenTeam = openConvo?.channel === 'team'
  const canCallOpenTeam = isOpenTeam && !!openConvo?.teamMemberEmail
  const isOpenCalls = openConvo?.channel === 'calls'
  const navChannels = [...CHANNEL_PILLS.map(c=>({key:c.key,label:c.label})), ...(waConnections.length ? [{key:'whatsapp',label:'WhatsApp'},{key:'sms',label:'SMS'}] : [])]
  const current = tab==='Unread' ? 'Unread' : filter==='All' ? 'All conversations' : (navChannels.find(c=>c.key===filter)?.label ?? 'Conversations')
  const col = (c:any) => CH_COLOR[c?.channel] ?? '#C4C4C4'
  const INK = '#323338', MUTED = '#676879', LINE = '#E6E9EF', BORDER = '#D0D4E4', CREAM = '#FBF4E6'
  const navBtn = (active:boolean): React.CSSProperties => ({display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',border:active?`1px solid ${ACCENT}`:'1px solid transparent',borderRadius:4,background:active?CREAM:'none',color:INK,fontSize:13.5,cursor:'pointer',fontFamily:'inherit',textAlign:'left'})
  const Pill = ({c}:{c:any}) => <span style={{background:col(c),color:'#fff',fontSize:11.5,fontWeight:500,borderRadius:3,padding:'1px 8px',whiteSpace:'nowrap'}}>{c.channelLabel}</span>

  return (
    <div style={{display:'flex',height: 'calc(100vh - var(--hub-h, 0px))',width:'100%',contain:'inline-size',fontFamily:'Figtree, Inter, -apple-system, sans-serif',color:INK,background:'#fff'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap'); .ib-nav:hover{background:#F5F6F8} .ib-row:hover{background:#F5F6F8} @media (max-width: 1100px){ .ib-details{display:none !important} } @media (max-width: 900px){ .ib-ws{display:none !important} }`}</style>

      {/* workspace nav */}
      <aside className="ib-ws" style={{width:232,flexShrink:0,borderRight:`1px solid ${LINE}`,padding:'14px 10px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
        <div style={{fontSize:13,color:MUTED,padding:'0 6px 10px'}}>Workspace</div>
        <div style={{display:'flex',alignItems:'center',gap:8,height:34,border:`1px solid ${BORDER}`,borderRadius:4,padding:'0 8px',fontSize:13.5,marginBottom:10,whiteSpace:'nowrap'}}>
          <span style={{width:20,height:20,borderRadius:4,background:'#D0AE4C',color:'#624920',fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>S</span>Sangsters Inbox
        </div>
        {identity.isAdmin && <button onClick={()=>setShowNewConvo(true)} style={{height:32,borderRadius:4,border:'none',background:ACCENT,color:'#fff',fontSize:13.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>+ New team conversation</button>}
        <button className="ib-nav" onClick={()=>{setTab('Unread');setFilter('All')}} style={navBtn(tab==='Unread')}><span style={{flex:1}}>Unread</span>{unreadCount>0&&<span style={{background:'#DF2F4A',color:'#fff',fontSize:11,fontWeight:600,borderRadius:9,padding:'0 7px'}}>{unreadCount}</span>}</button>
        <button className="ib-nav" onClick={()=>{setTab('All');setFilter('All')}} style={navBtn(tab==='All'&&filter==='All')}><span style={{flex:1}}>All conversations</span><span style={{fontSize:11.5,color:MUTED}}>{conversations.length}</span></button>
        <div style={{fontSize:12,color:MUTED,padding:'14px 10px 4px'}}>Channels</div>
        {navChannels.map(ch=>{
          const n = conversations.filter(c=>c.channel===ch.key).length
          const u = conversations.filter(c=>c.channel===ch.key&&c.unread).length
          return (
            <button key={ch.key} className="ib-nav" onClick={()=>{setTab('All');setFilter(ch.key)}} style={navBtn(tab==='All'&&filter===ch.key)}>
              <span style={{width:10,height:10,borderRadius:3,background:CH_COLOR[ch.key]??'#C4C4C4'}}/>
              <span style={{flex:1}}>{ch.label}</span>
              {u>0?<span style={{background:'#DF2F4A',color:'#fff',fontSize:11,fontWeight:600,borderRadius:9,padding:'0 7px'}}>{u}</span>:<span style={{fontSize:11.5,color:MUTED}}>{n||''}</span>}
            </button>
          )
        })}
        {(filter==='whatsapp'||filter==='sms') && waConnections.length>1 && (
          <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontSize:12,color:MUTED}}>Number</div>
            {waConnections.map((c:any)=>{
              const active = filter==='whatsapp' ? activeWaConnection===c.id : activeSmsConnection===c.id
              return <button key={c.id} onClick={()=>{ if(filter==='whatsapp') setActiveWaConnection(c.id); else setActiveSmsConnection(c.id); setOpenConvo(null) }} style={{...navBtn(active),fontSize:12.5,padding:'5px 8px'}}>{c.label}</button>
            })}
          </div>
        )}
      </aside>

      {/* conversation list */}
      <div style={{width:360,flexShrink:0,borderRight:`1px solid ${LINE}`,display:'flex',flexDirection:'column',minHeight:0}}>
        <div style={{padding:'16px 18px 10px',borderBottom:`1px solid ${LINE}`}}>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <h1 style={{margin:0,fontSize:22,fontWeight:500}}>{current}</h1>
            <span style={{fontSize:12.5,color:MUTED}}>{sorted.length}</span>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕  Search conversations" style={{marginTop:10,width:'100%',height:32,border:`1px solid ${BORDER}`,borderRadius:4,padding:'0 10px',fontSize:13.5,fontFamily:'inherit',boxSizing:'border-box',outline:'none'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {sorted.length===0?(
            <div style={{textAlign:'center',padding:60,color:MUTED,fontSize:13.5}}>{tab==='Unread' ? 'All caught up.' : q ? 'Nothing matches that search.' : 'No conversations yet.'}</div>
          ):sorted.map((c:any)=>{
            const sel = openConvo?.recipientId===c.recipientId&&openConvo?.channel===c.channel
            return (
              <div key={c.channel+c.recipientId} className={sel?'':'ib-row'} onClick={()=>openThread(c)} style={{padding:'12px 16px',borderBottom:`1px solid ${LINE}`,cursor:'pointer',background:sel?CREAM:'#fff',boxShadow:sel?`inset 3px 0 0 ${ACCENT}`:'none',display:'flex',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:col(c),color:'#fff',fontSize:c.channel==='calls'?15:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{c.channel==='calls' ? '📞' : initials(c.recipientName)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13.5,fontWeight:c.unread?700:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.recipientName}</span>
                    <span style={{fontSize:11.5,color:MUTED,flexShrink:0}}>{relativeTime(c.lastAt)}</span>
                  </div>
                  <div style={{margin:'4px 0'}}><Pill c={c}/></div>
                  <div style={{fontSize:12.5,color:c.unread?INK:MUTED,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:c.unread?600:400}}>{c.lastMessage}</div>
                </div>
                {c.unread&&<div style={{width:8,height:8,borderRadius:'50%',background:'#DF2F4A',flexShrink:0,marginTop:5}}/>}
              </div>
            )
          })}
        </div>
      </div>

      {/* thread */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',background:'#F6F7FB'}}>
        {!openConvo?(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,color:MUTED,fontSize:14}}>
            <div style={{width:56,height:56,borderRadius:12,background:CREAM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>💬</div>
            Pick a conversation to read and reply
          </div>
        ):isOpenCalls?(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:col(openConvo),color:'#fff',fontSize:26,display:'flex',alignItems:'center',justifyContent:'center'}}>📞</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:500}}>{openConvo.recipientName}</div>
              <div style={{fontSize:13.5,color:MUTED,marginTop:4}}>{openConvo.callDirection==='outbound'?'Outgoing call':'Incoming call'} · {CALL_STATUS_LABEL[openConvo.callStatus] ?? openConvo.callStatus}</div>
              <div style={{fontSize:13.5,color:MUTED,marginTop:2}}>Duration: {fmtDuration(openConvo.callDuration)}</div>
              <div style={{fontSize:12.5,color:MUTED,marginTop:8}}>{new Date(openConvo.lastAt).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            {openConvo.callPhone && <CallButton phone={openConvo.callPhone} name={openConvo.recipientName} size={22}/>}
          </div>
        ):(
          <>
            <div style={{padding:'14px 24px',borderBottom:`1px solid ${LINE}`,background:'#fff',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:col(openConvo),color:'#fff',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(openConvo.recipientName)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:18,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{openConvo.recipientName}</div>
                <div style={{marginTop:2}}><Pill c={openConvo}/></div>
              </div>
              {(openConvo.channel==='whatsapp'||openConvo.channel==='sms') && <CallButton phone={openConvo.recipientId} name={openConvo.recipientName} size={18}/>}
              {canCallOpenTeam && (
                <button onClick={()=>window.dispatchEvent(new CustomEvent('opero:call', { detail: { teamMemberEmail: openConvo.teamMemberEmail, name: openConvo.teamMemberName } }))} title={`Call ${openConvo.teamMemberName}`}
                  style={{height:32,padding:'0 12px',border:`1px solid ${BORDER}`,borderRadius:4,background:'#fff',cursor:'pointer',fontSize:13.5,fontFamily:'inherit'}}>📞 Call</button>
              )}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:12}}>
              {thread.length===0 && <div style={{textAlign:'center',color:MUTED,fontSize:13.5,padding:30}}>No messages yet — say hello below.</div>}
              {thread.map((msg:any)=>{
                const isStaff = openConvo.channel==='team' ? msg.sender===identity.email : msg.sender !== NON_STAFF_SENDER[openConvo.channel]
                const label = openConvo.channel==='team' ? (isStaff?'You':msg.senderName) : (isStaff?'Staff':openConvo.recipientName)
                return (
                  <div key={msg.id} style={{alignSelf:isStaff?'flex-end':'flex-start',maxWidth:'70%'}}>
                    <div style={{background:isStaff?ACCENT:'#fff',color:isStaff?'#fff':INK,border:isStaff?'none':`1px solid ${LINE}`,borderRadius:8,padding:'10px 14px',fontSize:13.5,lineHeight:1.5,whiteSpace:'pre-wrap',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>{msg.message}{msg.attachment_url && <a href={msg.attachment_url} target="_blank" rel="noreferrer" style={{display:'block',marginTop:msg.message?6:0,color:isStaff?'#fff':ACCENT,textDecoration:'underline',fontSize:13}}>📎 {/\.(png|jpe?g|gif|webp)(\?|$)/i.test(msg.attachment_url)?'Photo':'Attachment'}</a>}{!msg.message && !msg.attachment_url && <span style={{opacity:0.7,fontStyle:'italic'}}>(empty message)</span>}</div>
                    <div style={{fontSize:11.5,color:MUTED,marginTop:4,textAlign:isStaff?'right':'left'}}>{label} · {new Date(msg.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )
              })}
            </div>
            <div style={{padding:16,background:'#fff',borderTop:`1px solid ${LINE}`}}>
              <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:10,display:'flex',gap:10,alignItems:'flex-end'}}>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendReply() } }} rows={2} placeholder={`Reply to ${openConvo.recipientName}…  (Enter to send, Shift+Enter for a new line)`} style={{flex:1,border:'none',outline:'none',resize:'none',fontSize:13.5,fontFamily:'inherit',color:INK}}/>
                <button onClick={sendReply} disabled={sending||!reply.trim()} style={{height:32,padding:'0 16px',borderRadius:4,border:'none',background:ACCENT,color:'#fff',fontSize:13.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',opacity:sending||!reply.trim()?0.6:1}}>{sending?'Sending…':'Send'}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {openConvo && !isOpenCalls && (
        <div className="ib-details" style={{width:260,flexShrink:0,borderLeft:`1px solid ${LINE}`,background:'#fff',overflowY:'auto'}}>
          <div style={{padding:'14px 18px',fontSize:15,fontWeight:500,borderBottom:`1px solid ${LINE}`}}>Details</div>
          <div style={{border:`1px solid ${LINE}`,borderRadius:6,margin:16,overflow:'hidden',fontSize:13.5}}>
            {[
              ['Name', openConvo.recipientName],
              ['Channel', <Pill key="p" c={openConvo}/>],
              ...((openConvo.channel==='whatsapp'||openConvo.channel==='sms') ? [['Phone', openConvo.recipientId]] : []),
              ['Last message', relativeTime(openConvo.lastAt)],
            ].map(([k,v]:any)=>(
              <div key={k} style={{display:'flex',borderBottom:`1px solid ${LINE}`,minHeight:36}}>
                <div style={{width:96,flexShrink:0,background:'#FAFAFB',color:MUTED,padding:'9px 10px',borderRight:`1px solid ${LINE}`}}>{k}</div>
                <div style={{padding:'9px 10px',minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}>{v}</div>
              </div>
            ))}
          </div>
          {openConvo.channel==='team' && (
            <div style={{padding:'0 16px 16px'}}>
              <div style={{fontSize:12.5,color:MUTED,marginBottom:6}}>Members ({openConvo.members?.length ?? 0})</div>
              {(openConvo.members ?? []).map((m:any)=>(
                <div key={m.member_email} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:'#D0AE4C',color:'#fff',fontSize:10.5,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(m.member_name)}</div>
                  <span style={{fontSize:13.5}}>{m.member_name}{m.member_email===identity.email?' (you)':''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNewConvo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(41,47,76,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={e=>e.target===e.currentTarget&&setShowNewConvo(false)}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 420, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 16 }}>New team conversation</div>
            <label style={{ fontSize: 13, color: MUTED, marginBottom: 4, display: 'block' }}>Name</label>
            <input value={newConvoName} onChange={(e) => setNewConvoName(e.target.value)} placeholder="e.g. Maintenance Team" style={{ width: '100%', height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14 }} />
            <label style={{ fontSize: 13, color: MUTED, marginBottom: 6, display: 'block' }}>Members</label>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${LINE}`, borderRadius: 6, padding: 6, marginBottom: 16 }}>
              {team.length === 0 ? <div style={{ fontSize: 13, color: MUTED, padding: 8 }}>No staff added in Team Management yet.</div> : team.map((m: any) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newConvoMembers.includes(m.id)} onChange={(e) => setNewConvoMembers((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))} />
                  {m.name} <span style={{ color: MUTED, fontSize: 12 }}>({m.role})</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewConvo(false)} style={{ height: 34, padding: '0 16px', borderRadius: 4, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={createConversation} disabled={creatingConvo || !newConvoName.trim() || newConvoMembers.length === 0} style={{ height: 34, padding: '0 16px', borderRadius: 4, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: creatingConvo || !newConvoName.trim() || newConvoMembers.length === 0 ? 0.6 : 1 }}>{creatingConvo ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
