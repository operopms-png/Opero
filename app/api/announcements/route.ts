import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Team → Announcements: a notice board for staff. Admins post; everyone reads.
// Pinned, unread, unexpired announcements show as a strip on the dashboard
// until each person marks them read.
//   GET            -> { announcements: [...with read flag], unread: [...pinned unread], isAdmin }
//   POST {action:'create', title, body?, pinned?, expires_on?}   (admins)
//   POST {action:'read', id}  |  {action:'delete', id} (admins)

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const { data, error } = await db.from('announcements').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(100)
  if (error) return bad(error.message, 500)
  const ids = (data ?? []).map((a: any) => a.id)
  const { data: reads } = ids.length ? await db.from('announcement_reads').select('announcement_id').eq('user_email', c.email).in('announcement_id', ids) : { data: [] as any[] }
  const readSet = new Set((reads ?? []).map((r: any) => r.announcement_id))
  const today = new Date().toISOString().slice(0, 10)
  const list = (data ?? []).map((a: any) => ({ ...a, read: readSet.has(a.id), expired: !!a.expires_on && a.expires_on < today }))
  return NextResponse.json({ announcements: list, unread: list.filter((a: any) => a.pinned && !a.read && !a.expired), isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  if (b.action === 'read') {
    await db.from('announcement_reads').upsert({ announcement_id: String(b.id || ''), user_email: c.email }, { onConflict: 'announcement_id,user_email' })
    return NextResponse.json({ ok: true })
  }
  if (!c.isAdmin) return bad('Only admins can post announcements.', 403)
  if (b.action === 'create') {
    const title = String(b.title || '').trim().slice(0, 200)
    if (!title) return bad('Add a headline.')
    const { data, error } = await db.from('announcements').insert({
      business_id: c.businessId, title, body: String(b.body || '').slice(0, 4000) || null, pinned: b.pinned !== false,
      author: c.name || c.email, expires_on: /^\d{4}-\d{2}-\d{2}$/.test(b.expires_on || '') ? b.expires_on : null,
    }).select('*').single()
    if (error) return bad(error.message, 500)
    await db.from('announcement_reads').upsert({ announcement_id: data.id, user_email: c.email }, { onConflict: 'announcement_id,user_email' })
    return NextResponse.json({ announcement: data })
  }
  if (b.action === 'delete') {
    await db.from('announcements').delete().eq('id', String(b.id || '')).eq('business_id', c.businessId)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
