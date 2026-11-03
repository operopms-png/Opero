// Browser read-aloud shared by the voice layer: best British female voice on the device.
export function unlockSpeech() {
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
export function stopSpeech() { try { window.speechSynthesis?.cancel() } catch {} }
export function speak(text: string, onEnd?: () => void) {
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
