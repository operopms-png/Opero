'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const ACCENT = '#3B4AFF'

export default function TeamChat() {
  const [loading, setLoading] = useState(true)
  const [identity, setIdentity] = useState<{ email: string; name: string; isAdmin: boolean; businessId: string } | null>(null)
  const [team, setTeam] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [newConvoName, setNewConvoName] = useState('')
  const [newConvoMembers, setNewConvoMembers] = useState<string[]>([])
  const [creatingConvo, setCreatingConvo] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      const { data: rows } = await supabase.from('team_members').select('*').eq('email', user.email).order('created_at', { ascending: false }).limit(1)
      const m = rows?.[0]

      let id: { email: string; name: string; isAdmin: boolean; businessId: string }
      if (m) {
        id = { email: user.email!, name: m.name, isAdmin: false, businessId: m.user_id }
      } else {
        id = { email: user.email!, name: user.email!.split('@')[0], isAdmin: true, businessId: user.id }
      }
      setIdentity(id)

      if (id.isAdmin) {
        const { data: teamRows } = await supabase.from('team_members').select('*').eq('user_id', id.businessId).order('name')
        setTeam(teamRows ?? [])
      }

      await loadConversations(id)
      setLoading(false)
    })
  }, [])

  async function loadConversations(id: { email: string; name: string; isAdmin: boolean; businessId: string }) {
    const { data: convos } = await supabase.from('staff_conversations').select('*').order('created_at', { ascending: false })
    setConversations(convos ?? [])
    if (convos && convos.length > 0) {
      const { data: allMembers } = await supabase.from('staff_conversation_members').select('*').in('conversation_id', convos.map((c: any) => c.id))
      const grouped: Record<string, any[]> = {}
      for (const mem of allMembers ?? []) { (grouped[mem.conversation_id] ??= []).push(mem) }
      setMembers(grouped)
      setActiveId((prev) => prev ?? convos[0].id)
    }
  }

  useEffect(() => {
    if (!activeId) return
    supabase.from('staff_messages').select('*').eq('conversation_id', activeId).order('created_at', { ascending: true }).then(({ data }) => setMessages(data ?? []))

    const channel = supabase
      .channel(`staff_messages:${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages', filter: `conversation_id=eq.${activeId}` }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!newMessage.trim() || !activeId || !identity) return
    setSending(true)
    const { error } = await supabase.from('staff_messages').insert({
      conversation_id: activeId,
      sender_email: identity.email,
      sender_name: identity.name,
      body: newMessage.trim(),
    })
    setSending(false)
    if (error) { alert(error.message); return }
    setNewMessage('')
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
    await loadConversations(identity)
    setActiveId(convo.id)
  }

  if (loading || !identity) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  const activeConvo = conversations.find((c) => c.id === activeId)
  const activeMembers = activeId ? members[activeId] ?? [] : []

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',sans-serif", background: '#F7F8FA' }}>
      <div style={{ width: 320, background: '#fff', borderRight: '1px solid #E4E7EC', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>Conversations</div>
            <a href={identity.isAdmin ? '/settings' : '/staff-dashboard'} style={{ fontSize: 12, color: '#667085', textDecoration: 'none' }}>&larr; Back</a>
          </div>
          {identity.isAdmin && (
            <button onClick={() => setShowNewConvo(true)} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Conversation</button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#98A2B3', fontSize: 13 }}>{identity.isAdmin ? 'Start a conversation with your team.' : "No conversations yet — your Admin hasn't added you to one."}</div>
          ) : conversations.map((c) => (
            <div key={c.id} onClick={() => setActiveId(c.id)} style={{ padding: '14px 18px', borderBottom: '1px solid #F2F4F7', cursor: 'pointer', background: c.id === activeId ? '#F5F6FF' : '#fff', borderLeft: c.id === activeId ? `3px solid ${ACCENT}` : '3px solid transparent' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{(members[c.id] ?? []).length} member{(members[c.id] ?? []).length === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Select a conversation</div>
        ) : (
          <>
            <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '16px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>{activeConvo.name}</div>
              <div style={{ fontSize: 12, color: '#98A2B3' }}>{activeMembers.map((m: any) => m.member_name).join(', ')}</div>
            </div>

            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#98A2B3', fontSize: 13, marginTop: 40 }}>No messages yet — say hello.</div>
              ) : messages.map((msg) => {
                const isMe = msg.sender_email === identity.email
                return (
                  <div key={msg.id} style={{ maxWidth: 420, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, textAlign: isMe ? 'right' : 'left' }}>{isMe ? 'You' : msg.sender_name}</div>
                    <div style={{ background: isMe ? ACCENT : '#fff', color: isMe ? '#fff' : '#101828', border: isMe ? 'none' : '1px solid #E4E7EC', borderRadius: 10, padding: '10px 14px', fontSize: 13, whiteSpace: 'pre-wrap' as const }}>{msg.body}</div>
                    <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ background: '#fff', borderTop: '1px solid #E4E7EC', padding: '14px 24px', display: 'flex', gap: 10 }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Start typing to reply…"
                style={{ flex: 1, padding: '10px 16px', border: '1px solid #E4E7EC', borderRadius: 20, fontSize: 13, fontFamily: 'inherit' }}
              />
              <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ background: ACCENT, color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontSize: 14, opacity: sending || !newMessage.trim() ? 0.6 : 1 }}>&#10148;</button>
            </div>
          </>
        )}
      </div>

      {showNewConvo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 16 }}>New Conversation</div>
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
