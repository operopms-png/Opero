import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { VIDEO_BUCKET, MAX_VIDEO_BYTES, VIDEO_MIMES, PLATFORMS, STATUSES } from '@/lib/marketing-videos'

// Marketing → Video library. Every company sees only its own files (business_id), kept in a private bucket.
//   GET                      -> { videos (with short-lived view and download links), me, isAdmin }
//   POST {action:'sign'}     -> { path, token }  a one-off upload link, so large videos go straight to storage
//   POST {action:'save'}     -> add (after the upload) or edit a video's details
//   POST {action:'posted'}   -> note which platforms it has been posted to
//   POST {action:'delete'}   -> admins or whoever added it
// Posting itself is done by hand for now: the team downloads the file and copies the caption.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const str = (v: any, max: number) => String(v ?? '').slice(0, max)
const pick = (list: any, allowed: readonly string[]) => [...new Set((Array.isArray(list) ? list : []).map(String).filter(p => allowed.includes(p)))]
const LINK_SECONDS = 3600

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const { data, error } = await db.from('marketing_videos').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(500)
  if (error) return bad(error.message, 500)
  const rows = data ?? []
  const paths = rows.map(r => r.file_path)
  const signed = paths.length ? (await db.storage.from(VIDEO_BUCKET).createSignedUrls(paths, LINK_SECONDS)).data ?? [] : []
  const urlOf = new Map(signed.map(s => [s.path, s.signedUrl]))
  const videos = rows.map(r => {
    const url = urlOf.get(r.file_path) ?? null
    return { ...r, url, download_url: url ? `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(r.file_name || r.title)}` : null }
  })
  return NextResponse.json({ videos, me: c.name, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'sign') {
    const mime = str(b.mime, 100).toLowerCase(), size = Number(b.size) || 0
    if (!VIDEO_MIMES.includes(mime)) return bad('Use an MP4, MOV or WebM video, or a JPG, PNG or WebP picture')
    if (size > MAX_VIDEO_BYTES) return bad('That file is over 500 MB. Compress it and try again.')
    const safe = str(b.name, 120).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+/, '') || 'video'
    const path = `${c.businessId}/${randomUUID()}-${safe}`
    const { data, error } = await db.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path)
    if (error || !data) return bad(error?.message || 'Could not start the upload', 500)
    return NextResponse.json({ ok: true, path, token: data.token })
  }

  if (b.action === 'save') {
    const v = b.video ?? {}
    const status = STATUSES.includes(v.status) ? v.status : 'Draft'
    const when = v.scheduled_for ? new Date(v.scheduled_for) : null
    const row: Record<string, any> = {
      title: str(v.title, 200).trim(), caption: str(v.caption, 5000).trim() || null, hashtags: str(v.hashtags, 1000).trim() || null,
      platforms: pick(v.platforms, PLATFORMS), status, scheduled_for: when && !isNaN(+when) ? when.toISOString() : null,
      notes: str(v.notes, 2000).trim() || null, updated_by: c.name, updated_at: new Date().toISOString(),
    }
    if (!row.title) return bad('Give the video a title')
    if (b.id) {
      const { data, error } = await db.from('marketing_videos').update(row).eq('id', b.id).eq('business_id', c.businessId).select('*').maybeSingle()
      if (error || !data) return bad(error?.message || 'Video not found', 404)
      return NextResponse.json({ ok: true, video: data })
    }
    const path = str(b.path, 400)
    if (!path.startsWith(c.businessId + '/')) return bad('Upload the file first')
    const { data, error } = await db.from('marketing_videos').insert({
      ...row, business_id: c.businessId, created_by: c.name, file_path: path,
      file_name: str(v.file_name, 200) || null, mime: VIDEO_MIMES.includes(String(v.mime)) ? v.mime : null, size_bytes: Number(v.size_bytes) || null,
    }).select('*').single()
    if (error) return bad(error.message)
    return NextResponse.json({ ok: true, video: data })
  }

  if (b.action === 'posted') {
    const { data: v } = await db.from('marketing_videos').select('id,platforms').eq('id', b.id).eq('business_id', c.businessId).maybeSingle()
    if (!v) return bad('Video not found', 404)
    const done = pick(b.platforms, PLATFORMS)
    const planned: string[] = v.platforms ?? []
    const all = done.length > 0 && planned.every(p => done.includes(p))
    const { data, error } = await db.from('marketing_videos').update({
      posted_platforms: done, posted_at: done.length ? new Date().toISOString() : null,
      status: all ? 'Posted' : done.length ? 'Scheduled' : 'Ready', updated_by: c.name, updated_at: new Date().toISOString(),
    }).eq('id', v.id).select('*').single()
    if (error) return bad(error.message)
    return NextResponse.json({ ok: true, video: data })
  }

  if (b.action === 'delete') {
    const { data: v } = await db.from('marketing_videos').select('id,file_path,created_by').eq('id', b.id).eq('business_id', c.businessId).maybeSingle()
    if (!v) return bad('Video not found', 404)
    if (!c.isAdmin && v.created_by !== c.name) return bad('Only an admin or the person who added it can delete this', 403)
    await db.storage.from(VIDEO_BUCKET).remove([v.file_path]).catch(() => null)
    await db.from('marketing_videos').delete().eq('id', v.id)
    return NextResponse.json({ ok: true })
  }

  return bad('Unknown action')
}
