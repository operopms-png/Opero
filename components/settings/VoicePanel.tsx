'use client'
// Settings -> Voice: how to use voice anywhere in the portal, plus the business dictionary
// (spellings and shortcuts the AI applies when you dictate).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGender, setGender, speak, unlockSpeech, type Gender } from '@/lib/speak'

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
  const [gender, setG] = useState<Gender>('female')
  useEffect(() => { setG(getGender()) }, [])
  function chooseVoice(g: Gender) {
    setG(g); setGender(g)
    supabase.auth.updateUser({ data: { voice_gender: g } }).catch(() => {})
    unlockSpeech(); speak(g === 'male' ? 'Hi, Novourq here. This is the male voice.' : 'Hi, Novourq here. This is the female voice.')
  }
  const [calls, setCalls] = useState<{ id: string; started_at: string; seconds: number; tasks: number; turns: { role: string; text: string }[] }[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const load = () => call('GET').then(d => { setEntries(d.entries); setWords(d.words); setSpeechKey(d.speechKey) }).catch(() => {})
  const loadCalls = () => call('GET', '/api/voice?calls=1').then(d => setCalls(d.calls)).catch(() => {})
  useEffect(() => { load(); loadCalls() }, [])
  async function delCall(id: string) { await call('DELETE', '/api/voice?call=' + id).catch(() => {}); loadCalls() }
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
        <b>What it can do on a call:</b> add a task, log a maintenance request at a property, add a contact to the CRM, write an email for your approval, search for investment deals and read out the best, record that you like or pass on a deal, open any main page on your screen, and answer questions from your portfolio. It cannot pay, refund, sign, or change a lease. A person does those.<br />
        <b>On your phone:</b> open app.thenovourq.com in Chrome or Safari and tap Novourq Voice. The call fills the bottom of the screen and keeps the screen awake. To open it like an app, use your browser's Add to Home Screen.<br />
        <b>Say "new line", "full stop" or "question mark"</b> and it types the symbol. Correct yourself mid-sentence ("Thursday, no, Friday") and only Friday is typed.<br />
        <span style={{ color: '#667085' }}>Your last 30 days: {words.toLocaleString('en-GB')} words by voice. Audio is not stored.</span>
      </div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Novourq's voice</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>Choose the voice you hear on calls and spoken replies. Tap one to hear it. The exact sound depends on the voices installed on your device.</div>
        <div role="radiogroup" aria-label="Novourq's voice" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['female', 'male'] as Gender[]).map(g => (
            <button key={g} role="radio" aria-checked={gender === g} onClick={() => chooseVoice(g)}
              style={{ flex: '1 1 140px', padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: `2px solid ${gender === g ? '#2F6DB5' : '#D0D5DD'}`, background: gender === g ? '#EAF3FC' : '#fff', color: gender === g ? '#1D4E89' : '#344054' }}>
              {g === 'female' ? 'Woman' : 'Man'}
            </button>
          ))}
        </div>
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
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 4 }}>Call history</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 8 }}>Your calls with Novourq Cloud AI and what was said. Only you can see these. Delete any call you no longer need.</div>
        {calls.length === 0 && <div style={{ fontSize: 13, color: '#667085', paddingTop: 6 }}>No calls yet. Tap Novourq Voice to make one.</div>}
        {calls.map(k => {
          const mins = Math.floor(k.seconds / 60), secs = k.seconds % 60
          return (
            <div key={k.id} style={{ borderTop: '1px solid #E4E7EC', padding: '10px 0', fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setOpen(open === k.id ? null : k.id)} aria-expanded={open === k.id} style={{ background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 600, color: '#1D4E89', cursor: 'pointer', textAlign: 'left' }}>
                  {new Date(k.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </button>
                <span style={{ color: '#667085', fontSize: 13 }}>{mins}m {secs}s · {Math.ceil(k.turns.length / 2)} exchanges{k.tasks ? ` · ${k.tasks} task${k.tasks === 1 ? '' : 's'} added` : ''}</span>
                <button onClick={() => delCall(k.id)} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#B42318', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Delete</button>
              </div>
              {open === k.id && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.5 }}>
                  {k.turns.map((t, i) => <div key={i}><b style={{ color: t.role === 'user' ? '#323338' : '#2F6DB5' }}>{t.role === 'user' ? 'You' : 'Novourq'}:</b> {t.text}</div>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
