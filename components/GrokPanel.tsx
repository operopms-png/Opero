'use client'
// "Novourq Cloud AI" panel on the Staff Centre dashboard. Read only: it sends the question
// to /api/grok and shows the reply. It cannot change records or send messages.
import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import AiMark from './ai/AiMark'
import { speak as speakShared } from '../lib/speak'

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
  // One assistant: Novourq Cloud AI. No separate named staff to pick from.
  const role = 'general'
  const agent: Agent | undefined = undefined

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

  // Uses the voice chosen in Settings -> Voice (woman or man).
  function speak(text: string) {
    if (!text) return
    setSpeaking(true)
    speakShared(text, () => setSpeaking(false))
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: C.brown }}><AiMark size={44} ring="#EAF3FC" />Novourq Cloud AI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.brown, cursor: 'pointer' }}>
            <input type="checkbox" checked={speakReplies} onChange={e => { setSpeakReplies(e.target.checked); if (!e.target.checked) stopSpeaking() }} /> Speak replies
          </label>
          {speaking && <button type="button" onClick={stopSpeaking} style={{ fontSize: 12, fontWeight: 600, color: C.brown, background: '#fff', border: '1px solid #C9DEF3', borderRadius: 8, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>Stop</button>}
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#fff', color: C.brown, border: '1px solid #C9DEF3' }}>Acts for you. Money and contracts need your approval</span>
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
