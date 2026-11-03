'use client'
// Voice anywhere in the portal. Hold Ctrl+Shift+Space (or tap the mic) and talk: the words are
// tidied by the AI (no ums, corrections resolved, punctuation added, your dictionary applied)
// and typed into whichever box you were in. Start with "Novourq, ..." to give an instruction
// instead. Never types into password boxes.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement
const TEXT_TYPES = ['text', 'search', 'email', 'url', 'tel', '']

function isEditable(el: Element | null): el is Editable {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled
  if (el instanceof HTMLInputElement) return TEXT_TYPES.includes(el.type) && !el.readOnly && !el.disabled
  return (el as HTMLElement).isContentEditable
}

function insertInto(el: Editable, text: string) {
  el.focus()
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const before = el.value.slice(0, start)
    const sep = before && !/\s$/.test(before) ? ' ' : ''
    const next = before + sep + text + el.value.slice(end)
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next) // so React sees the change
    const caret = (before + sep + text).length
    el.setSelectionRange?.(caret, caret)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    document.execCommand('insertText', false, text)
  }
}

const label = (el: Editable | null) => el ? [el.getAttribute('aria-label'), (el as HTMLInputElement).placeholder, el.getAttribute('name'), el.id].filter(Boolean).join(' / ') : ''

export default function VoiceDictation() {
  const [state, setState] = useState<'idle' | 'listening' | 'working'>('idle')
  const [live, setLive] = useState('')
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const [supported, setSupported] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const lastField = useRef<Editable | null>(null)
  const field = useRef<Editable | null>(null)
  const media = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const rec = useRef<any>(null)
  const heard = useRef('')
  const noteTimer = useRef<any>(null)

  const say = useCallback((text: string, tone: 'ok' | 'err' = 'ok', ms = 6000) => {
    setNote({ text, tone })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), ms)
  }, [])

  useEffect(() => {
    const w = window as any
    setSupported(!!(navigator.mediaDevices && w.MediaRecorder) || !!(w.SpeechRecognition || w.webkitSpeechRecognition))
    const onFocus = (e: FocusEvent) => { if (isEditable(e.target as Element)) lastField.current = e.target as Editable }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  async function send(blob: Blob | null, text: string) {
    setState('working')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      if (blob && blob.size > 800) fd.append('audio', blob, 'voice.webm')
      fd.append('text', text)
      fd.append('hint', label(field.current) + ' ' + location.pathname)
      const res = await fetch('/api/voice', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { say(d.error || 'Voice did not work. Try again.', 'err'); return }
      if (d.mode === 'command') {
        say(d.reply + (d.tasks ? `  (${d.tasks} task${d.tasks === 1 ? '' : 's'} added to your Task board)` : ''), 'ok', 14000)
        try { const u = new SpeechSynthesisUtterance(String(d.reply).slice(0, 600)); u.lang = 'en-GB'; window.speechSynthesis?.speak(u) } catch {}
      } else if (field.current && document.contains(field.current)) {
        insertInto(field.current, d.text)
      } else {
        await navigator.clipboard?.writeText(d.text).catch(() => {})
        say('No box was selected, so it is copied: ' + d.text, 'ok', 9000)
      }
    } catch {
      say('Could not reach Novourq. Check your connection and try again.', 'err')
    } finally {
      setState('idle'); setLive('')
    }
  }

  async function start() {
    if (stateRef.current !== 'idle') return
    const w = window as any
    const active = document.activeElement
    field.current = isEditable(active) ? active : (lastField.current && document.contains(lastField.current) ? lastField.current : null)
    heard.current = ''; chunks.current = []; setLive('')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream.current)
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      mr.onstop = () => {
        stream.current?.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
        send(blob, heard.current)
      }
      media.current = mr
      mr.start()
    } catch {
      say('Allow the microphone in your browser to use voice.', 'err'); return
    }
    // Live words on screen while talking, and the fallback text if no speech key is set up.
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (SR) {
      try {
        const r = new SR(); r.lang = 'en-GB'; r.interimResults = true; r.continuous = true
        r.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; heard.current = t; setLive(t) }
        r.onerror = () => {}
        rec.current = r; r.start()
      } catch {}
    }
    setState('listening')
  }

  function stop() {
    if (stateRef.current !== 'listening') return
    try { rec.current?.stop() } catch {}
    try { media.current?.state === 'recording' && media.current.stop() } catch {}
  }

  useEffect(() => {
    // Hold Ctrl+Shift+Space to talk, let go to finish.
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && e.ctrlKey && e.shiftKey && !e.repeat) { e.preventDefault(); start() } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space' && stateRef.current === 'listening') { e.preventDefault(); stop() } }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  })

  if (!supported) return null
  const listening = state === 'listening'
  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, maxWidth: 'min(380px, calc(100vw - 36px))', fontFamily: 'inherit' }}>
      {(listening || state === 'working' || note) && (
        <div role="status" style={{ background: '#fff', border: `1px solid ${note?.tone === 'err' && !listening ? '#F4B7B0' : '#C9DEF3'}`, borderRadius: 12, padding: '10px 13px', fontSize: 13, lineHeight: 1.5, color: note?.tone === 'err' && !listening ? '#B42318' : '#1D4E89', boxShadow: '0 6px 24px rgba(16,24,40,.14)', whiteSpace: 'pre-wrap' }}>
          {listening ? (live || 'Listening… let go to finish') : state === 'working' ? 'Tidying…' : note?.text}
          {note && !listening && state === 'idle' && <button onClick={() => setNote(null)} aria-label="Close" style={{ marginLeft: 8, background: 'none', border: 0, color: '#667085', cursor: 'pointer', fontSize: 14 }}>×</button>}
        </div>
      )}
      <style>{`@media (prefers-reduced-motion:no-preference){.nvq-rec .nvq-bar{transform-origin:center;animation:nvqw .9s ease-in-out infinite}.nvq-rec .nvq-bar:nth-child(2){animation-delay:.15s}.nvq-rec .nvq-bar:nth-child(3){animation-delay:.3s}.nvq-rec .nvq-bar:nth-child(4){animation-delay:.45s}.nvq-rec .nvq-bar:nth-child(5){animation-delay:.6s}}@keyframes nvqw{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}`}</style>
      <button type="button"
        className={listening ? 'nvq-rec' : ''}
        onMouseDown={e => e.preventDefault()}
        onClick={() => (listening ? stop() : start())}
        disabled={state === 'working'}
        aria-label={listening ? 'Stop Novourq Voice' : 'Novourq Voice'}
        title={listening ? 'Tap to finish' : 'Tap, or hold Ctrl+Shift+Space. Say "Novourq, …" to give an instruction'}
        style={{ height: 46, borderRadius: 23, border: 0, cursor: 'pointer', color: '#fff', background: '#0B1B45', padding: '0 18px 0 8px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, boxShadow: listening ? '0 0 0 5px rgba(229,72,77,.25), 0 6px 18px rgba(11,27,69,.35)' : '0 6px 18px rgba(11,27,69,.35)', opacity: state === 'working' ? 0.6 : 1 }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: listening ? '#E5484D' : 'linear-gradient(135deg,#7fe4ff,#3a8bff)' }}>
          {listening ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path className="nvq-bar" d="M4 10v4" /><path className="nvq-bar" d="M8 6v12" /><path className="nvq-bar" d="M12 3v18" /><path className="nvq-bar" d="M16 7v10" /><path className="nvq-bar" d="M20 10v4" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          )}
        </span>
        {listening ? 'Listening' : state === 'working' ? 'Working' : 'Novourq Voice'}
      </button>
    </div>
  )
}
