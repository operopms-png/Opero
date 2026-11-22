import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// AI alerts inbox: the AI-related notifications for the caller's business.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TYPES = ['ai_alert', 'ai_receptionist']

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('notifications').select('id, title, message, link, type, read, created_at')
    .eq('user_id', c.businessId).in('type', TYPES).order('created_at', { ascending: false }).limit(150)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (b.action === 'create') {
    const title = String(b.title ?? '').trim().slice(0, 140)
    if (!title) return NextResponse.json({ error: 'Add a title for the alert' }, { status: 400 })
    const message = String(b.message ?? '').trim().slice(0, 500)
    const link = typeof b.link === 'string' && b.link.startsWith('/') ? b.link.slice(0, 300) : null
    const { error: e } = await db.from('notifications').insert({ user_id: c.businessId, title, message: message || null, type: 'ai_alert', module: 'staffcentre', link, read: false })
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  let q = db.from('notifications').update({ read: true }).eq('user_id', c.businessId).in('type', TYPES)
  if (b.action === 'read' && b.id) q = q.eq('id', b.id)
  else if (b.action !== 'read_all') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
