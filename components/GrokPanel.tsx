'use client'
// "Novourq Cloud AI" panel on the Staff Centre dashboard. Read only: it sends the question
// to /api/grok and shows the reply. It cannot change records or send messages.
import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { grokRoleForJob } from '../lib/grok-agent-roles'

const C = { blue: '#2F6DB5', brown: '#1D4E89', soft: '#EAF3FC', line: '#E4E7EC', muted: '#667085', text: '#323338', bg: '#F9FAFB' }

const CHIPS = [
  'What is overdue this week?',
  'Which certificates expire next month?',
  'Summarise open maintenance',
  'Which check-ins are coming up?',
]

type Msg = { role: 'me' | 'bot'; text: string }
type Agent = { id: string; name: string; job_role: string }

export default function GrokPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState('')
  const agent = agents.find(a => a.id === agentId)
  const role = agent ? grokRoleForJob(agent.job_role) : 'general'

  // Voice: speak a question with the mic, and have the reply read aloud. Uses the browser's own
  // speech tools, so it needs no extra keys. Mic works in Chrome, Edge and Safari.
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [micOk, setMicOk] = useState(false)
  const recRef = useRef<any>(null)
  const speakRef = useRef(true)
  speakRef.current = speakReplies
  useEffect(() => {
    const w = window as any
    setMicOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => { try { recRef.current?.abort() } catch {} ; window.speechSynthesis?.cancel() }
  }, [])

  // Best female British voice on this device: natural/enhanced voices first, never a male one.
  function pickVoice(all: SpeechSynthesisVoice[]) {
    const male = /daniel|arthur|oliver|rishi|male(?!.*female)|james|gordon|fred|alex\b/i
    const female = /serena|kate|stephanie|martha|hazel|libby|sonia|female|samantha|moira|karen|tessa|susan|fiona|victoria|zira|jenny|emma|amy/i
    const rich = /premium|enhanced|natural|neural|online|siri/i
    const en = all.filter(v => /^en/i.test(v.lang) && !male.test(v.name))
    const score = (v: SpeechSynthesisVoice) => (/en-GB/i.test(v.lang) ? 4 : /^en-(AU|IE|ZA)/i.test(v.lang) ? 2 : 0) + (female.test(v.name) ? 3 : 0) + (rich.test(v.name) ? 5 : 0)
    return en.sort((x, y) => score(y) - score(x))[0]
  }
  function speak(text: string) {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth || !text) return
    synth.cancel()
    if (!synth.getVoices().length) { synth.onvoiceschanged = () => speak(text); return }
    const clean = text.replace(/[*_#`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 3000)
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'en-GB'
    const v = pickVoice(synth.getVoices())
    u.rate = 0.97
    u.pitch = 1.04
    if (v) u.voice = v
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.speak(u)
  }
  // iPhones only allow speech that starts from a tap, so each tap primes the speaker first.
  function unlockSpeech() {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) return
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); synth.getVoices() } catch {}
  }
  function stopSpeaking() { window.speechSynthesis?.cancel(); setSpeaking(false) }

  function toggleMic() {
    if (listening) { try { recRef.current?.stop() } catch {} ; return }
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    stopSpeaking()
    unlockSpeech()
    const rec = new SR()
    rec.lang = 'en-GB'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      finalText = t
      setInput(t)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText) }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  // Each AI staff member is listed by name. Falls back to the general assistant if none load.
  useEffect(() => {
    supabase.from('ai_staff').select('id,name,job_role,status').order('created_at', { ascending: true }).then(({ data }) => {
      const rows = ((data ?? []) as any[]).filter(a => a.status !== 'paused')
      // A bot named after its own job (e.g. "Receptionist") is hidden when a named person holds that job.
      const list = rows.filter(a => !(a.name === a.job_role && rows.some(b => b !== a && b.job_role === a.job_role)))
      setAgents(list)
      if (list.length) setAgentId(list.find(a => /sharleen/i.test(a.name))?.id ?? list[0].id)
    })
  }, [])

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setMessages(m => [...m, { role: 'me', text: message }])
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ message, role, agent_id: agent?.id }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = res.ok ? (data.reply || 'No answer came back.') : (data.error || 'The assistant could not answer.')
      const shown = res.ok ? reply.replace(/\*\*/g, '').replace(/^#+\s*/gm, '') : reply
      setMessages(m => [...m, { role: 'bot', text: shown }])
      if (res.ok && speakRef.current) speak(reply)
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'The assistant could not be reached. Try again.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ margin: '0 30px 30px', background: '#fff', border: `2px solid ${C.blue}`, borderRadius: 12, overflow: 'hidden', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 18px', background: C.soft, borderBottom: '1px solid #C9DEF3' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.brown }}>Novourq Cloud AI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} aria-label="Who to ask" style={{ fontSize: 12, fontWeight: 600, color: C.brown, background: '#fff', border: '1px solid #C9DEF3', borderRadius: 8, padding: '5px 8px', fontFamily: 'inherit' }}>
            {agents.length === 0 && <option value="">Assistant</option>}
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.brown, cursor: 'pointer' }}>
            <input type="checkbox" checked={speakReplies} onChange={e => { setSpeakReplies(e.target.checked); if (!e.target.checked) stopSpeaking() }} /> Speak replies
          </label>
          {speaking && <button type="button" onClick={stopSpeaking} style={{ fontSize: 12, fontWeight: 600, color: C.brown, background: '#fff', border: '1px solid #C9DEF3', borderRadius: 8, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>Stop</button>}
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#fff', color: C.brown, border: '1px solid #C9DEF3' }}>Read only. Drafts need approval</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F2F4F7' }}>
        {CHIPS.map(c => (
          <button key={c} onClick={() => { unlockSpeech(); send(c) }} disabled={busy} style={{ fontSize: 12, color: C.brown, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 20, padding: '5px 11px', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}>{c}</button>
        ))}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 120, fontSize: 13, lineHeight: 1.6 }}>
        {messages.length === 0 && <div style={{ color: C.muted }}>Ask a question about arrears, compliance, maintenance or bookings.</div>}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'me'
            ? { alignSelf: 'flex-end', background: C.blue, color: '#fff', padding: '9px 13px', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', whiteSpace: 'pre-wrap' }
            : { alignSelf: 'flex-start', background: C.bg, border: `1px solid ${C.line}`, color: C.text, padding: '10px 13px', borderRadius: '12px 12px 12px 2px', maxWidth: '90%', whiteSpace: 'pre-wrap' }}>
            {m.text}
            {m.role === 'bot' && (
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={() => speak(m.text)} style={{ fontSize: 12, fontWeight: 600, color: C.brown, background: '#fff', border: '1px solid #C9DEF3', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Play reply</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ color: C.muted, fontSize: 12 }}>Working on it…</div>}
      </div>

      <form onSubmit={e => { e.preventDefault(); unlockSpeech(); send(input) }} style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: `1px solid ${C.line}` }}>
        {micOk && (
          <button type="button" onClick={toggleMic} disabled={busy} aria-label={listening ? 'Stop listening' : 'Speak your question'} title={listening ? 'Listening. Tap to stop' : 'Speak your question'}
            style={{ width: 42, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: listening ? '#B42318' : C.soft, color: listening ? '#fff' : C.brown, border: `1px solid ${listening ? '#B42318' : '#C9DEF3'}`, borderRadius: 8, cursor: busy ? 'default' : 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask about arrears, compliance, maintenance or bookings'} maxLength={4000}
          style={{ flex: 1, fontSize: 13, border: `1px solid #D0D5DD`, borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', color: C.text, minWidth: 0 }} />
        <button type="submit" disabled={busy || !input.trim()} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: C.blue, border: 'none', borderRadius: 8, padding: '10px 18px', cursor: busy || !input.trim() ? 'default' : 'pointer', opacity: busy || !input.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>Send</button>
      </form>
    </div>
  )
}
