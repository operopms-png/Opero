// Browser read-aloud shared by the voice layer: best British female voice on the device.
export function unlockSpeech() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); synth.getVoices() } catch {}
}
function pickVoice(all: SpeechSynthesisVoice[]) {
  const male = /daniel|arthur|oliver|rishi|male(?!.*female)|james|gordon|fred|alex\b/i
  const female = /serena|kate|stephanie|martha|hazel|libby|sonia|female|samantha|moira|karen|tessa|susan|fiona|victoria|zira|jenny|emma|amy/i
  const rich = /premium|enhanced|natural|neural|online|siri/i
  const en = all.filter(v => /^en/i.test(v.lang) && !male.test(v.name))
  const score = (v: SpeechSynthesisVoice) => (/en-GB/i.test(v.lang) ? 4 : /^en-(AU|IE|ZA)/i.test(v.lang) ? 2 : 0) + (female.test(v.name) ? 3 : 0) + (rich.test(v.name) ? 5 : 0)
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
    u.lang = 'en-GB'; u.rate = 0.98; u.pitch = 1.04
    const v = pickVoice(synth.getVoices())
    if (v) u.voice = v
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    synth.speak(u)
  }
  if (!synth.getVoices().length) { synth.onvoiceschanged = () => { synth.onvoiceschanged = null; go() }; setTimeout(() => { if (!synth.speaking) go() }, 400) } else go()
}
