'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const ACCENT = '#3B4AFF'

// Global browser softphone -- mounted once in app/layout.tsx so it's
// available on every authenticated page as a floating widget. Other
// pages trigger an outbound call without importing this component
// directly, by dispatching:
//   window.dispatchEvent(new CustomEvent('opero:call', { detail: { phone, name, contactId } }))
// Kept as a DOM event rather than a React context/provider because
// this codebase has no existing global state pattern to hook into, and
// call-trigger buttons live scattered across many different pages
// (CRM, tenants, landlords, the Inbox) that don't otherwise share a
// common ancestor below the root layout.
export default function Softphone() {
  const [ready, setReady] = useState(false)
  const [connections, setConnections] = useState<any[]>([])
  const [fromConnectionId, setFromConnectionId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [dialNumber, setDialNumber] = useState('')
  const [status, setStatus] = useState<'idle'|'calling'|'ringing-in'|'in-call'>('idle')
  const [callInfo, setCallInfo] = useState<{ phone: string; name?: string } | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myName, setMyName] = useState<string>('')

  const deviceRef = useRef<any>(null)
  const activeCallRef = useRef<any>(null)
  const callLogIdRef = useRef<string | null>(null)
  const timerRef = useRef<any>(null)

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberRows } = await supabase.from('team_members').select('name').eq('email', user.email).order('created_at', { ascending: false }).limit(1)
      if (!cancelled) setMyName(memberRows?.[0]?.name ?? user.email?.split('@')[0] ?? 'Someone')

      const connRes = await fetch('/api/whatsapp/connections', { headers: await authHeaders() })
      if (connRes.ok) {
        const r = await connRes.json()
        if (!cancelled) {
          setConnections(r.connections ?? [])
          if (r.connections?.length) setFromConnectionId(r.connections[0].id)
        }
      }

      const tokenRes = await fetch('/api/voice/token', { headers: await authHeaders() })
      if (!tokenRes.ok) {
        // Not configured yet (missing Twilio API key/TwiML app env vars) --
        // fail quietly, same as lib/send-whatsapp.ts does when unconfigured.
        // The dial pad still opens but calling will show the server's error.
        return
      }
      const { token } = await tokenRes.json()

      const { Device } = await import('@twilio/voice-sdk')
      const device = new Device(token, { logLevel: 'error' })
      deviceRef.current = device

      device.on('incoming', (call: any) => {
        activeCallRef.current = call
        // A team call's caller name rides along as a custom parameter
        // (see the <Parameter> tag the TwiML route adds); an external
        // inbound call just has a raw From number.
        const callerName = call.customParameters?.get?.('CallerName')
        setCallInfo({ phone: call.parameters?.From ?? 'Unknown', name: callerName || undefined })
        setStatus('ringing-in')
        setOpen(true)
        call.on('accept', () => startTimer('in-call'))
        call.on('disconnect', endCall)
        call.on('cancel', endCall)
      })

      await device.register()
      if (!cancelled) setReady(true)
    }
    init()

    function onExternalCall(e: any) {
      if (e.detail?.teamMemberEmail) placeTeamCall(e.detail.teamMemberEmail, e.detail.name)
      else placeCall(e.detail?.phone, e.detail?.name, e.detail?.contactId)
    }
    window.addEventListener('opero:call', onExternalCall)

    return () => {
      cancelled = true
      window.removeEventListener('opero:call', onExternalCall)
      deviceRef.current?.destroy?.()
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startTimer(newStatus: 'in-call') {
    setStatus(newStatus)
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  async function endCall() {
    if (timerRef.current) clearInterval(timerRef.current)
    const finalSeconds = seconds
    if (callLogIdRef.current) {
      await fetch('/api/voice/log', {
        method: 'PATCH', headers: await authHeaders(),
        body: JSON.stringify({ id: callLogIdRef.current, status: 'completed', duration_seconds: finalSeconds }),
      })
    }
    callLogIdRef.current = null
    activeCallRef.current = null
    setStatus('idle')
    setCallInfo(null)
    setSeconds(0)
    setMuted(false)
  }

  async function placeCall(phone?: string, name?: string, contactId?: string) {
    if (!phone) return
    setError(null)
    if (!deviceRef.current) { setError('Voice calling is not set up yet.'); setOpen(true); return }
    if (!fromConnectionId) { setError('No connected number to call from -- connect one in Settings > WhatsApp Numbers first.'); setOpen(true); return }

    setOpen(true)
    setCallInfo({ phone, name })
    setStatus('calling')

    const logRes = await fetch('/api/voice/log', {
      method: 'POST', headers: await authHeaders(),
      body: JSON.stringify({ connection_id: fromConnectionId, to: phone, contact_id: contactId ?? null, contact_name: name ?? null }),
    })
    if (logRes.ok) { const r = await logRes.json(); callLogIdRef.current = r.id }

    const call = await deviceRef.current.connect({ params: { To: phone, ConnectionId: fromConnectionId } })
    activeCallRef.current = call
    call.on('accept', () => startTimer('in-call'))
    call.on('disconnect', endCall)
    call.on('cancel', endCall)
    call.on('reject', endCall)
    call.on('error', (e: any) => { setError(e?.message ?? 'Call failed'); endCall() })
  }

  // Team-to-team calling: rings a colleague's browser Client directly
  // (Client-to-Client, no phone number involved), triggered from Team
  // Chat's Call button via the same 'opero:call' event as an external
  // call, distinguished by carrying teamMemberEmail instead of phone.
  async function placeTeamCall(email?: string, name?: string) {
    if (!email) return
    setError(null)
    if (!deviceRef.current) { setError('Voice calling is not set up yet.'); setOpen(true); return }

    setOpen(true)
    setCallInfo({ phone: email, name })
    setStatus('calling')

    const idRes = await fetch(`/api/voice/team-identity?email=${encodeURIComponent(email)}`, { headers: await authHeaders() })
    if (!idRes.ok) {
      const r = await idRes.json().catch(() => ({}))
      setError(r.error ?? 'Could not reach that teammate.')
      setStatus('idle')
      return
    }
    const { identity: targetIdentity } = await idRes.json()

    const logRes = await fetch('/api/voice/log', {
      method: 'POST', headers: await authHeaders(),
      body: JSON.stringify({ to: email, contact_name: name ?? null }),
    })
    if (logRes.ok) { const r = await logRes.json(); callLogIdRef.current = r.id }

    const call = await deviceRef.current.connect({ params: { TeamMemberIdentity: targetIdentity, CallerName: myName } })
    activeCallRef.current = call
    call.on('accept', () => startTimer('in-call'))
    call.on('disconnect', endCall)
    call.on('cancel', endCall)
    call.on('reject', endCall)
    call.on('error', (e: any) => { setError(e?.message ?? 'Call failed'); endCall() })
  }

  function acceptIncoming() { activeCallRef.current?.accept() }
  function rejectIncoming() { activeCallRef.current?.reject(); endCall() }
  function hangUp() { activeCallRef.current?.disconnect() }
  function toggleMute() {
    const next = !muted
    activeCallRef.current?.mute(next)
    setMuted(next)
  }

  const fmtTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  return (
    <>
      <button
        onClick={()=>setOpen(o=>!o)}
        title="Calls"
        style={{position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',border:'none',background:status==='in-call'?'#10B981':ACCENT,color:'#fff',cursor:'pointer',boxShadow:'0 4px 14px rgba(0,0,0,0.2)',zIndex:200,fontSize:20,display:'flex',alignItems:'center',justifyContent:'center'}}
      >📞</button>

      {open && (
        <div style={{position:'fixed',bottom:88,right:24,width:300,background:'#fff',borderRadius:14,boxShadow:'0 8px 30px rgba(0,0,0,0.18)',border:'1px solid #E4E7EC',zIndex:200,overflow:'hidden',fontFamily:"'Inter',sans-serif"}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #F2F4F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#101828'}}>Calls</div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'#98A2B3',cursor:'pointer',fontSize:16}}>×</button>
          </div>

          {status==='ringing-in' && (
            <div style={{padding:20,textAlign:'center' as const}}>
              <div style={{fontSize:13,color:'#667085',marginBottom:4}}>Incoming call</div>
              <div style={{fontSize:16,fontWeight:700,color:'#101828',marginBottom:16}}>{callInfo?.name || callInfo?.phone}</div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button onClick={acceptIncoming} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#10B981',color:'#fff',fontWeight:600,cursor:'pointer'}}>Accept</button>
                <button onClick={rejectIncoming} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#DC2626',color:'#fff',fontWeight:600,cursor:'pointer'}}>Decline</button>
              </div>
            </div>
          )}

          {(status==='calling'||status==='in-call') && (
            <div style={{padding:20,textAlign:'center' as const}}>
              <div style={{fontSize:13,color:'#667085',marginBottom:4}}>{status==='calling'?'Calling…':'In call'}</div>
              <div style={{fontSize:16,fontWeight:700,color:'#101828'}}>{callInfo?.name || callInfo?.phone}</div>
              {status==='in-call' && <div style={{fontSize:12,color:'#98A2B3',marginTop:2}}>{fmtTime(seconds)}</div>}
              <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:16}}>
                {status==='in-call' && <button onClick={toggleMute} style={{padding:'10px 16px',borderRadius:8,border:'1px solid #D0D5DD',background:muted?'#F2F4F7':'#fff',color:'#344054',cursor:'pointer'}}>{muted?'Unmute':'Mute'}</button>}
                <button onClick={hangUp} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#DC2626',color:'#fff',fontWeight:600,cursor:'pointer'}}>Hang up</button>
              </div>
            </div>
          )}

          {status==='idle' && (
            <div style={{padding:16}}>
              {connections.length>1 && (
                <select value={fromConnectionId??''} onChange={e=>setFromConnectionId(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:12,marginBottom:10,fontFamily:'inherit'}}>
                  {connections.map((c:any)=>(<option key={c.id} value={c.id}>{c.label} ({c.phone_number})</option>))}
                </select>
              )}
              <input value={dialNumber} onChange={e=>setDialNumber(e.target.value)} placeholder="+1 555 000 0000" style={{width:'100%',padding:'10px 12px',border:'1px solid #D0D5DD',borderRadius:8,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:10}}/>
              <button onClick={()=>placeCall(dialNumber)} disabled={!dialNumber.trim()} style={{width:'100%',padding:'10px',borderRadius:8,border:'none',background:ACCENT,color:'#fff',fontWeight:600,cursor:'pointer'}}>Call</button>
              {!ready && <div style={{fontSize:11,color:'#98A2B3',marginTop:10}}>Connecting…</div>}
              {error && <div style={{fontSize:11,color:'#DC2626',marginTop:10}}>{error}</div>}
            </div>
          )}
        </div>
      )}
    </>
  )
}
