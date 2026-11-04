import { supabase } from '@/lib/supabase'
// Browser read-aloud shared by the voice layer: best British female voice on the device.
let audio: HTMLAudioElement | null = null
let token = 0
let aiBlockedUntil = 0
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
export function unlockSpeech() {
  try { if (!audio) audio = new Audio(); audio.src = SILENT; audio.play().catch(() => {}) } catch {}
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); synth.getVoices() } catch {}
}
export type Gender = 'female' | 'male'
export function getGender(): Gender {
  try { return localStorage.getItem('nvq-voice-gender') === 'male' ? 'male' : 'female' } catch { return 'female' }
}
export function setGender(g: Gender) { try { localStorage.setItem('nvq-voice-gender', g) } catch {} }

const MALE = /daniel|arthur|oliver|rishi|male(?!.*female)|james|gordon|fred|alex\b|thomas|ryan|aaron|george|guy|mark|david|ralph|lee|rocko|reed|eddy|evan|nathan/i
const FEMALE = /serena|kate|stephanie|martha|hazel|libby|sonia|female|samantha|moira|karen|tessa|susan|fiona|victoria|zira|jenny|emma|amy|aria|catherine|flo|grandma|shelley|sandy|nicky|allison|ava|joanna|kendra|kimberly|salli|ivy/i
const RICH = /premium|enhanced|natural|neural|online|siri/i
function pickVoice(all: SpeechSynthesisVoice[], gender: Gender) {
  const want = gender === 'male' ? MALE : FEMALE
  const avoid = gender === 'male' ? FEMALE : MALE
  const en = all.filter(v => /^en/i.test(v.lang) && !avoid.test(v.name))
  const score = (v: SpeechSynthesisVoice) => (/en-GB/i.test(v.lang) ? 4 : /^en-(AU|IE|ZA)/i.test(v.lang) ? 2 : 0) + (want.test(v.name) ? 3 : 0) + (RICH.test(v.name) ? 5 : 0)
  return en.sort((x, y) => score(y) - score(x))[0]
}
export function canSpeak() { return typeof window !== 'undefined' && !!window.speechSynthesis }
function browserSpeak(text: string, onEnd?: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  const clean = text.replace(/[*_#`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 800)
  if (!synth || !clean) { onEnd?.(); return }
  synth.cancel()
  const go = () => {
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'en-GB'; u.rate = 0.98; u.pitch = getGender() === 'male' ? 0.95 : 1.04
    const v = pickVoice(synth.getVoices(), getGender())
    if (v) u.voice = v
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    synth.speak(u)
  }
  if (!synth.getVoices().length) { synth.onvoiceschanged = () => { synth.onvoiceschanged = null; go() }; setTimeout(() => { if (!synth.speaking) go() }, 400) } else go()
}

export function stopSpeech() {
  token++
  try { audio?.pause() } catch {}
  try { window.speechSynthesis?.cancel() } catch {}
}

// Short chunks so the first sentence starts playing while the rest is still being made.
function chunks(text: string): string[] {
  const parts = text.replace(/[*_#`>|]/g, '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) ?? []
  const out: string[] = []
  for (const p of parts) {
    const last = out[out.length - 1]
    if (last && last.length + p.length < 180 && out.length >= 1 && last.length < 60) out[out.length - 1] = last + p
    else out.push(p.trim())
  }
  // never more than 4 requests: join the tail
  return out.length > 4 ? [...out.slice(0, 3), out.slice(3).join(' ')] : out
}

async function fetchClip(text: string, auth: string): Promise<Blob> {
  const res = await fetch('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify({ text, gender: getGender() }) })
  if (!res.ok) throw new Error('voice ' + res.status)
  return res.blob()
}

// Realistic voice first. Any failure drops to the device voice, so the call never goes silent.
export async function speak(text: string, onEnd?: () => void) {
  const clean = text.replace(/[*_#`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 800)
  if (!clean) { onEnd?.(); return }
  if (Date.now() < aiBlockedUntil || typeof window === 'undefined' || !audio) { browserSpeak(clean, onEnd); return }
  const mine = ++token
  let started = false
  try { window.speechSynthesis?.cancel() } catch {}
  let clips: Promise<Blob>[]
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const auth = `Bearer ${session?.access_token ?? ''}`
    clips = chunks(clean).map(t => fetchClip(t, auth))
    // Wait for the first clip before deciding whether the realistic voice works.
    const first = await clips[0]
    if (mine !== token) return
    for (let i = 0; i < clips.length; i++) {
      const blob = i === 0 ? first : await clips[i]
      if (mine !== token) return
      const url = URL.createObjectURL(blob)
      started = true
      await new Promise<void>((resolve, reject) => {
        const a = audio!
        a.onended = () => resolve()
        a.onerror = () => reject(new Error('play'))
        a.src = url
        a.play().catch(reject)
      }).finally(() => URL.revokeObjectURL(url))
      if (mine !== token) return
    }
    onEnd?.()
  } catch (e: any) {
    if (mine !== token) return
    // Not set up, over the limit or blocked by the browser: use the device voice for a few minutes.
    aiBlockedUntil = Date.now() + 5 * 60 * 1000
    if (started) onEnd?.(); else browserSpeak(clean, onEnd)
  }
}
