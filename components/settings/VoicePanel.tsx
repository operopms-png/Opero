'use client'
// Settings -> Voice: how to use voice anywhere in the portal, plus the business dictionary
// (spellings and shortcuts the AI applies when you dictate).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type E = { id: string; term: string; replacement: string | null }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 18 }
const input: React.CSSProperties = { flex: '1 1 200px', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }
const btn: React.CSSProperties = { background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

async function call(method: string, path = '/api/voice', body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Something went wrong')
  return d
}

export default function VoicePanel() {
  const [entries, setEntries] = useState<E[]>([])
  const [words, setWords] = useState(0)
  const [speechKey, setSpeechKey] = useState(true)
  const [term, setTerm] = useState('')
  const [replacement, setReplacement] = useState('')
  const [err, setErr] = useState('')
  const load = () => call('GET').then(d => { setEntries(d.entries); setWords(d.words); setSpeechKey(d.speechKey) }).catch(() => {})
  useEffect(() => { load() }, [])
  async function add() {
    setErr('')
    try { await call('PUT', '/api/voice', { term, replacement }); setTerm(''); setReplacement(''); load() } catch (e: any) { setErr(e.message) }
  }
  async function remove(id: string) { await call('DELETE', '/api/voice?id=' + id).catch(() => {}); load() }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Voice</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Talk instead of typing, in any box in the portal. The AI removes the ums, fixes corrections, adds punctuation and spells your names right.</div>
      {!speechKey && <div style={{ ...card, color: '#9A6700', fontSize: 14 }}>High-accuracy speech is not switched on for the platform yet, so voice is using your browser's built-in speech for now. It still works, with less accurate names.</div>}
      <div style={{ ...card, fontSize: 13.5, color: '#344054', lineHeight: 1.7 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 6 }}>How to use it</div>
        <b>Dictate:</b> click in any box, then hold <b>Ctrl+Shift+Space</b> and talk, or tap the pencil button. Let go and the text appears.<br />
        <b>Call:</b> tap <b>Novourq Voice</b> and it answers like a phone call. Talk naturally, it replies out loud, remembers what you said earlier in the call, adds jobs to your Task board, and keeps listening. Say "goodbye" or tap the red button to hang up. Money and contracts still need a person.<br />
        <b>Say "new line", "full stop" or "question mark"</b> and it types the symbol. Correct yourself mid-sentence ("Thursday, no, Friday") and only Friday is typed.<br />
        <span style={{ color: '#667085' }}>Your last 30 days: {words.toLocaleString('en-GB')} words by voice. Audio is not stored.</span>
      </div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Dictionary and shortcuts</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>Your property names are already included. Add other names the AI should spell correctly, or a shortcut: say the short phrase and the full text is typed.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input id="voice-term" value={term} onChange={e => setTerm(e.target.value)} placeholder="Word or phrase you say" style={input} />
          <input id="voice-replacement" value={replacement} onChange={e => setReplacement(e.target.value)} placeholder="Full text to type (optional)" style={input} />
          <button onClick={add} disabled={!term.trim()} style={{ ...btn, opacity: term.trim() ? 1 : .6 }}>Add</button>
        </div>
        {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginTop: 10 }}>{err}</div>}
        {entries.map(e => (
          <div key={e.id} style={{ borderTop: '1px solid #E4E7EC', marginTop: 12, paddingTop: 10, fontSize: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1, minWidth: 0 }}><b>{e.term}</b>{e.replacement ? <span style={{ color: '#667085' }}> → {e.replacement}</span> : <span style={{ color: '#667085' }}> (spelling)</span>}</span>
            <button onClick={() => remove(e.id)} style={{ background: 'none', border: 0, color: '#B42318', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
