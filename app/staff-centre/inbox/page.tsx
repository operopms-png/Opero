'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import CallButton from '@/components/CallButton'

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
const WHATSAPP_BG = '#E7F9F0'
const WHATSAPP_FG = '#1DA851'
const SMS_BG = '#FFF4E5'
const SMS_FG = '#B45309'
const TEAM_BG = '#F5F3FF'
const TEAM_FG = '#7C3AED'
const NON_STAFF_SENDER: Record<string,string> = { str_owner:'owner', pm_landlord:'landlord', pm_tenant:'tenant', estate_tenant:'tenant', estate_landlord:'landlord', whatsapp:'contact', sms:'contact' }

const TABS = ['Unread', 'All'] as const
const CHANNEL_PILLS = [{ key:'team', label:'Team Chat', bg:TEAM_BG, fg:TEAM_FG }, ...CHANNELS]

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

    await Promise.all([loadExternal(id), loadTeamConversations(id), loadWaConnections()])
    setLoading(false)
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
      const recipientQuery = ch.key === 'str_owner'
        ? supabase.from(ch.recipientTable).select('id,name')
        : supabase.from(ch.recipientTable).select('id,name').eq('user_id', id.businessId)
      const { data: recipients } = await recipientQuery
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

  if (loading || !identity) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3'}}>Loading...</div>

  const tabFiltered = tab==='Unread' ? conversations.filter(c=>c.unread) : conversations
  const filtered = filter==='All' ? tabFiltered : tabFiltered.filter(c=>c.channel===filter)
  const sorted = [...filtered].sort((a,b)=>new Date(b.lastAt).getTime()-new Date(a.lastAt).getTime())
  const unreadCount = conversations.filter(c=>c.unread).length
  const isOpenTeam = openConvo?.channel === 'team'
  const canCallOpenTeam = isOpenTeam && !!openConvo?.teamMemberEmail

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #E4E7EC',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#98A2B3',textTransform:'uppercase',letterSpacing:'0.06em'}}>STAFF CENTRE</div>
          <div style={{fontSize:15,fontWeight:700,color:'#101828'}}>Inbox {unreadCount>0&&<span style={{marginLeft:8,background:'#DC2626',color:'#fff',fontSize:11,fontWeight:700,borderRadius:10,padding:'2px 8px'}}>{unreadCount} unread</span>}</div>
        </div>
        {identity.isAdmin && (
          <button onClick={()=>setShowNewConvo(true)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ New Team Conversation</button>
        )}
      </div>

      <div style={{display:'flex',height:'calc(100vh - 56px)'}}>
        <div style={{width:340,borderRight:'1px solid #E4E7EC',background:'#fff',overflowY:'auto' as const,display:'flex',flexDirection:'column' as const}}>
          <div style={{display:'flex',borderBottom:'1px solid #F2F4F7'}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'12px 0',border:'none',borderBottom:tab===t?`2px solid ${ACCENT}`:'2px solid transparent',background:'#fff',color:tab===t?ACCENT:'#667085',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t}{t==='Unread'&&unreadCount>0?` (${unreadCount})`:''}</button>
            ))}
          </div>

          <div style={{display:'flex',gap:6,padding:14,flexWrap:'wrap' as const,borderBottom:'1px solid #F2F4F7'}}>
            <button onClick={()=>setFilter('All')} style={{padding:'5px 12px',borderRadius:16,border:filter==='All'?'1px solid '+ACCENT:'1px solid #E4E7EC',background:filter==='All'?ACCENT+'12':'#fff',color:filter==='All'?ACCENT:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>All</button>
            {CHANNEL_PILLS.map(ch=>(
              <button key={ch.key} onClick={()=>setFilter(ch.key)} style={{padding:'5px 12px',borderRadius:16,border:filter===ch.key?'1px solid '+ch.fg:'1px solid #E4E7EC',background:filter===ch.key?ch.bg:'#fff',color:filter===ch.key?ch.fg:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ch.label}</button>
            ))}
            {waConnections.length>0 && (
              <button onClick={()=>setFilter('whatsapp')} style={{padding:'5px 12px',borderRadius:16,border:filter==='whatsapp'?'1px solid '+WHATSAPP_FG:'1px solid #E4E7EC',background:filter==='whatsapp'?WHATSAPP_BG:'#fff',color:filter==='whatsapp'?WHATSAPP_FG:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>WhatsApp</button>
            )}
            {waConnections.length>0 && (
              <button onClick={()=>setFilter('sms')} style={{padding:'5px 12px',borderRadius:16,border:filter==='sms'?'1px solid '+SMS_FG:'1px solid #E4E7EC',background:filter==='sms'?SMS_BG:'#fff',color:filter==='sms'?SMS_FG:'#667085',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>SMS</button>
            )}
          </div>
          {filter==='whatsapp' && waConnections.length>1 && (
            <div style={{display:'flex',gap:6,padding:'0 14px 14px',flexWrap:'wrap' as const}}>
              {waConnections.map((c:any)=>(
                <button key={c.id} onClick={()=>{setActiveWaConnection(c.id);setOpenConvo(null)}} style={{padding:'4px 10px',borderRadius:14,border:activeWaConnection===c.id?'1px solid '+WHATSAPP_FG:'1px solid #E4E7EC',background:activeWaConnection===c.id?WHATSAPP_FG:'#fff',color:activeWaConnection===c.id?'#fff':'#667085',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{c.label}</button>
              ))}
            </div>
          )}
          {filter==='sms' && waConnections.length>1 && (
            <div style={{display:'flex',gap:6,padding:'0 14px 14px',flexWrap:'wrap' as const}}>
              {waConnections.map((c:any)=>(
                <button key={c.id} onClick={()=>{setActiveSmsConnection(c.id);setOpenConvo(null)}} style={{padding:'4px 10px',borderRadius:14,border:activeSmsConnection===c.id?'1px solid '+SMS_FG:'1px solid #E4E7EC',background:activeSmsConnection===c.id?SMS_FG:'#fff',color:activeSmsConnection===c.id?'#fff':'#667085',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{c.label}</button>
              ))}
            </div>
          )}

          <div style={{flex:1,overflowY:'auto' as const}}>
            {sorted.length===0?(
              <div style={{textAlign:'center' as const,padding:60,color:'#98A2B3',fontSize:13}}>{tab==='Unread' ? 'All caught up.' : 'No conversations yet.'}</div>
            ):sorted.map((c:any)=>(
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
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column' as const}}>
          {!openConvo?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#98A2B3',fontSize:13}}>Select a conversation</div>
          ):(
            <>
              <div style={{padding:'16px 24px',borderBottom:'1px solid #E4E7EC',background:'#fff',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:openConvo.channelBg,color:openConvo.channelFg,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(openConvo.recipientName)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#101828'}}>{openConvo.recipientName}</div>
                  <div style={{fontSize:11,color:openConvo.channelFg,fontWeight:600}}>{openConvo.channelLabel}</div>
                </div>
                {(openConvo.channel==='whatsapp'||openConvo.channel==='sms') && <CallButton phone={openConvo.recipientId} name={openConvo.recipientName} size={18}/>}
                {canCallOpenTeam && (
                  <button
                    onClick={()=>window.dispatchEvent(new CustomEvent('opero:call', { detail: { teamMemberEmail: openConvo.teamMemberEmail, name: openConvo.teamMemberName } }))}
                    title={`Call ${openConvo.teamMemberName}`}
                    style={{background:'none',border:'none',cursor:'pointer',color:TEAM_FG,fontSize:18,padding:2,lineHeight:1}}
                  >📞</button>
                )}
              </div>
              <div style={{flex:1,overflowY:'auto' as const,padding:24,display:'flex',flexDirection:'column' as const,gap:10}}>
                {thread.map((msg:any)=>{
                  const isStaff = openConvo.channel==='team' ? msg.sender===identity.email : msg.sender !== NON_STAFF_SENDER[openConvo.channel]
                  const label = openConvo.channel==='team' ? (isStaff?'You':msg.senderName) : (isStaff?'Staff':openConvo.recipientName)
                  return (
                    <div key={msg.id} style={{alignSelf:isStaff?'flex-end':'flex-start',maxWidth:'65%'}}>
                      <div style={{background:isStaff?ACCENT:'#F2F4F7',color:isStaff?'#fff':'#101828',borderRadius:12,padding:'10px 14px',fontSize:13}}>{msg.message}</div>
                      <div style={{fontSize:10,color:'#98A2B3',marginTop:3,textAlign:isStaff?'right' as const:'left' as const}}>{label} · {new Date(msg.created_at).toLocaleString()}</div>
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

        {openConvo && (
          <div style={{width:280,borderLeft:'1px solid #E4E7EC',background:'#fff',padding:24,overflowY:'auto' as const}}>
            <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase' as const,letterSpacing:'0.06em',marginBottom:16}}>Details</div>
            <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',marginBottom:20}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:openConvo.channelBg,color:openConvo.channelFg,fontSize:20,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>{initials(openConvo.recipientName)}</div>
              <div style={{fontSize:15,fontWeight:700,color:'#101828',textAlign:'center' as const}}>{openConvo.recipientName}</div>
              <div style={{fontSize:11,fontWeight:600,color:openConvo.channelFg,marginTop:2}}>{openConvo.channelLabel}</div>
            </div>
            {openConvo.channel==='team' ? (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase' as const,marginBottom:8}}>Members ({openConvo.members?.length ?? 0})</div>
                {(openConvo.members ?? []).map((m:any)=>(
                  <div key={m.member_email} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:'#F2F4F7',color:'#667085',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(m.member_name)}</div>
                    <span style={{fontSize:12,color:'#344054'}}>{m.member_name}{m.member_email===identity.email?' (you)':''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase' as const,marginBottom:6}}>Channel</div>
                <div style={{fontSize:13,color:'#344054',marginBottom:16}}>{openConvo.channelLabel}</div>
                {(openConvo.channel==='whatsapp'||openConvo.channel==='sms') && (
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:'#98A2B3',textTransform:'uppercase' as const,marginBottom:6}}>Phone</div>
                    <div style={{fontSize:13,color:'#344054'}}>{openConvo.recipientId}</div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showNewConvo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e=>e.target===e.currentTarget&&setShowNewConvo(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 16 }}>New Team Conversation</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Name</label>
            <input value={newConvoName} onChange={(e) => setNewConvoName(e.target.value)} placeholder="e.g. Maintenance Team" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 14 }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6, display: 'block' }}>Members</label>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E4E7EC', borderRadius: 8, padding: 8, marginBottom: 16 }}>
              {team.length === 0 ? <div style={{ fontSize: 12, color: '#98A2B3', padding: 8 }}>No staff added in Team Management yet.</div> : team.map((m: any) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newConvoMembers.includes(m.id)} onChange={(e) => setNewConvoMembers((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))} />
                  {m.name} <span style={{ color: '#98A2B3', fontSize: 11 }}>({m.role})</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewConvo(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={createConversation} disabled={creatingConvo || !newConvoName.trim() || newConvoMembers.length === 0} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: creatingConvo || !newConvoName.trim() || newConvoMembers.length === 0 ? 0.6 : 1 }}>{creatingConvo ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
