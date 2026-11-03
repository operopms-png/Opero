import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { dictionaryFor, whisper, tidy, runCommand, stripWake, underLimit } from '@/lib/voice'

// Voice layer.
//   POST multipart: audio (optional), text (browser transcript, used if there is no audio or no speech key),
//        mode = dictate | command, hint = what field the text is going into
//     -> { text } for dictate, { text, reply, tasks } for command
//   GET  -> { entries, words, speechKey }
//   PUT  { term, replacement? }  add a dictionary entry     DELETE ?id=  remove one

export const maxDuration = 60
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [e, u] = await Promise.all([
    db.from('voice_dictionary').select('id,term,replacement').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(300),
    db.from('voice_usage').select('words').eq('user_email', c.email).gte('created_at', since).limit(5000),
  ])
  const words = (u.data ?? []).reduce((n, r) => n + (r.words || 0), 0)
  return NextResponse.json({ entries: e.data ?? [], words, speechKey: !!process.env.OPENAI_API_KEY })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(await underLimit(c.email))) return bad('You have used a lot of voice in the last hour. Try again a little later.', 429)
  const f = await req.formData().catch(() => null)
  if (!f) return bad('No audio or text')
  const audio = f.get('audio')
  let raw = String(f.get('text') || '').slice(0, 8000)
  const dict = await dictionaryFor(c.businessId)
  let engine: 'speech' | 'browser' = 'browser'
  if (audio instanceof Blob && audio.size > 800) {
    const w = await whisper(audio, dict.terms)
    if (w.text) { raw = w.text; engine = 'speech' }
  }
  if (!raw.trim()) return bad('I could not hear anything. Try again, a little closer to the mic.')

  const call = f.get('call') === '1'
  let history: { role: 'user' | 'assistant'; content: string }[] = []
  try {
    const h = JSON.parse(String(f.get('history') || '[]'))
    if (Array.isArray(h)) history = h.slice(-8).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 1200) }))
  } catch { /* no history */ }
  const wake = f.get('mode') === 'command' ? raw.trim() : stripWake(raw)
  let kind = 'dictate'
  let out: Record<string, unknown>
  if (wake !== null) {
    kind = 'command'
    if (!wake) return bad('I heard the name but no instruction. Try "Novourq, what is overdue?"')
    const text = call ? wake : await tidy(wake, dict, 'an instruction to a property management assistant')
    const r = await runCommand(c, text, history, call)
    out = { mode: 'command', text, reply: r.reply, tasks: r.tasks }
  } else {
    const text = await tidy(raw, dict, String(f.get('hint') || ''))
    out = { mode: 'dictate', text }
  }
  const words = String(out.text || '').split(/\s+/).filter(Boolean).length
  await db.from('voice_usage').insert({ business_id: c.businessId, user_email: c.email, kind, words }).then(() => {}, () => {})
  return NextResponse.json({ ...out, engine })
}

export async function PUT(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const term = String(b.term || '').trim().slice(0, 80)
  const replacement = String(b.replacement || '').trim().slice(0, 600) || null
  if (!term) return bad('Type the word or phrase first')
  const { error } = await db.from('voice_dictionary').insert({ business_id: c.businessId, term, replacement, created_by: c.email })
  if (error) return bad(error.code === '23505' ? 'That is already in the dictionary' : error.message)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return bad('Missing id')
  await db.from('voice_dictionary').delete().eq('id', id).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
