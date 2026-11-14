import { serviceClient } from '@/lib/admin-auth'
import { callClaude } from '@/lib/claude'

// AI opinion on a CV for one role. Advice only: a person decides (see app/api/applications/screen).
const SYSTEM = `You help a hiring team read CVs. Judge ONLY job-related skills, experience, qualifications and availability against the role's responsibilities and requirements.
Ignore and never mention age, gender, race, ethnicity, nationality, religion, disability, health, marital or family status, pregnancy, photos, names or where someone was born. Do not guess these.
You only advise. A person makes every hiring decision. Be fair, specific and brief. Do not invent facts that are not in the CV.
Reply with JSON only, no other text, in exactly this shape:
{"score": 0-100, "verdict": "Strong fit" | "Possible" | "Not a fit", "reasons": ["short reason", ...up to 4], "concerns": ["short thing to check at interview", ...up to 3]}
Strong fit = 75 and above. Possible = 45 to 74. Not a fit = below 45.`

export function cvPathFromUrl(url: string): string | null {
  try { return new URL(url).searchParams.get('p') } catch { return null }
}

export async function cvText(path: string): Promise<string> {
  const { data, error } = await serviceClient.storage.from('job-cvs').download(path)
  if (error || !data) throw new Error('Could not open the CV file')
  const buf = Buffer.from(await data.arrayBuffer())
  if (/\.pdf$/i.test(path)) {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const r: any = await extractText(pdf, { mergePages: true })
    return String(r.text ?? '').trim()
  }
  if (/\.docx$/i.test(path)) {
    const mammoth: any = await import('mammoth')
    const r = await (mammoth.default || mammoth).extractRawText({ buffer: buf })
    return String(r.value ?? '').trim()
  }
  throw new Error('This CV is an older Word file (.doc), which the AI cannot read. Open it from the CV link.')
}

export async function screenCv(app: any, role: { title: string; description: string } | null) {
  const path = cvPathFromUrl(app.resume_url || '')
  if (!path) throw new Error('No CV attached')
  const text = (await cvText(path)).slice(0, 12000)
  if (text.length < 40) throw new Error('The CV has no readable text (it may be a scanned image)')
  const roleText = role ? `Role: ${role.title}\n${role.description}` : `Role: ${app.role_applied}`
  const msg = `${roleText}\n\nCV text:\n${text}`
  const r = await callClaude(SYSTEM, msg, 700)
  if (r.error || !r.text) throw new Error(r.error || 'The AI did not answer')
  const m = r.text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('The AI answer could not be read')
  const j = JSON.parse(m[0])
  const score = Math.max(0, Math.min(100, Math.round(Number(j.score) || 0)))
  const verdict = score >= 75 ? 'Strong fit' : score >= 45 ? 'Possible' : 'Not a fit'
  const list = (a: any) => (Array.isArray(a) ? a : []).map((x: any) => String(x).slice(0, 220)).filter(Boolean)
  return { ai_score: score, ai_verdict: verdict, ai_reasons: list(j.reasons).slice(0, 4).join('\n'), ai_concerns: list(j.concerns).slice(0, 3).join('\n'), ai_reviewed_at: new Date().toISOString() }
}
