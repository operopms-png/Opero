import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { callClaude, callClaudeWithDocument } from '@/lib/claude'
import { VIDEO_BUCKET } from '@/lib/marketing-videos'

// Novourq Cloud AI → Add pictures. After a picture has been uploaded to the Marketing Video library,
// the AI looks at it and writes a title, caption and hashtags for the team to check.
//   POST { path, name, brief } -> { ok, title, caption, hashtags }
// Each company can only use files inside its own folder of the private bucket.

export const maxDuration = 60

const LOOK_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOOK_BYTES = 4 * 1024 * 1024
const str = (v: any, max: number) => String(v ?? '').slice(0, max)

const SYSTEM = `You write social media posts for a property company that offers furnished homes, flexible stays of a month or longer, and property management.
Reply with only a JSON object: {"title": "...", "caption": "...", "hashtags": "..."}.
title: 3 to 8 words. caption: 1 to 3 plain sentences in a professional, warm tone. hashtags: 5 to 8, separated by spaces, each starting with #.
Describe only what can really be seen or what the team told you. Never invent a price, address, availability, discount or claim. No emojis.`

function fromName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 100) || 'Picture'
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const path = str(b.path, 400)
  const name = str(b.name, 200)
  const brief = str(b.brief, 500).trim()
  if (!path.startsWith(c.businessId + '/')) return NextResponse.json({ error: 'Upload the picture first' }, { status: 400 })

  const ask = `File name: ${name || 'picture'}.${brief ? ` What the team said about it: ${brief}.` : ''} Write the title, caption and hashtags.`
  let out: { text?: string; error?: string } = {}
  try {
    const { data: blob } = await db.storage.from(VIDEO_BUCKET).download(path)
    const mime = blob?.type ?? ''
    if (blob && LOOK_MIMES.includes(mime) && blob.size <= MAX_LOOK_BYTES) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
      out = await callClaudeWithDocument(SYSTEM, ask, { base64, mediaType: mime }, 500)
    }
  } catch { /* fall back to the text-only version below */ }
  if (!out.text) out = await callClaude(SYSTEM, ask, 400)

  let title = fromName(name), caption = '', hashtags = ''
  const m = (out.text ?? '').match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const j = JSON.parse(m[0])
      title = str(j.title, 200).trim() || title
      caption = str(j.caption, 5000).trim()
      hashtags = str(j.hashtags, 1000).trim()
    } catch { /* keep the file name as the title and leave the caption blank */ }
  }
  return NextResponse.json({ ok: true, title, caption, hashtags })
}
