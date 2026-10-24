'use client'
// "Ask Grok" panel on the Staff Centre dashboard. Read only: it sends the question
// to /api/grok and shows the reply. It cannot change records or send messages.
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = { blue: '#2F6DB5', brown: '#1D4E89', soft: '#EAF3FC', line: '#E4E7EC', muted: '#667085', text: '#323338', bg: '#F9FAFB' }

const CHIPS = [
  'What is overdue this week?',
  'Which certificates expire next month?',
  'Summarise open maintenance',
  'Which check-ins are coming up?',
]

type Msg = { role: 'me' | 'bot'; text: string }

export default function GrokPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)

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
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = res.ok ? (data.reply || 'No answer came back.') : (data.error || 'The assistant could not answer.')
      setMessages(m => [...m, { role: 'bot', text: reply }])
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'The assistant could not be reached. Try again.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ margin: '0 30px 30px', background: '#fff', border: `2px solid ${C.blue}`, borderRadius: 12, overflow: 'hidden', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 18px', background: C.soft, borderBottom: '1px solid #C9DEF3' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.brown }}>Ask Grok</div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#fff', color: C.brown, border: '1px solid #C9DEF3' }}>Read only. Drafts need approval</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F2F4F7' }}>
        {CHIPS.map(c => (
          <button key={c} onClick={() => send(c)} disabled={busy} style={{ fontSize: 12, color: C.brown, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 20, padding: '5px 11px', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}>{c}</button>
        ))}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 120, fontSize: 13, lineHeight: 1.6 }}>
        {messages.length === 0 && <div style={{ color: C.muted }}>Ask a question about arrears, compliance, maintenance or bookings.</div>}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'me'
            ? { alignSelf: 'flex-end', background: C.blue, color: '#fff', padding: '9px 13px', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', whiteSpace: 'pre-wrap' }
            : { alignSelf: 'flex-start', background: C.bg, border: `1px solid ${C.line}`, color: C.text, padding: '10px 13px', borderRadius: '12px 12px 12px 2px', maxWidth: '90%', whiteSpace: 'pre-wrap' }}>
            {m.text}
          </div>
        ))}
        {busy && <div style={{ color: C.muted, fontSize: 12 }}>Working on it…</div>}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input) }} style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: `1px solid ${C.line}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about arrears, compliance, maintenance or bookings" maxLength={4000}
          style={{ flex: 1, fontSize: 13, border: `1px solid #D0D5DD`, borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', color: C.text, minWidth: 0 }} />
        <button type="submit" disabled={busy || !input.trim()} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: C.blue, border: 'none', borderRadius: 8, padding: '10px 18px', cursor: busy || !input.trim() ? 'default' : 'pointer', opacity: busy || !input.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>Send</button>
      </form>
    </div>
  )
}
