import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { sendPush } from '@/lib/push'

// Saves or removes this phone's push subscription, and sends a test notification to it.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const MISSING = 'Run migrations/add-ai-push.sql in Supabase first.'

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))

  if (b.action === 'test') {
    const r = await sendPush(c.businessId, { title: 'Notifications are on', body: 'You will be told here when the AI needs you.', url: '/staff-centre/ai-command-centre/alerts' }, c.uid)
    if (r.skipped) return NextResponse.json({ error: r.skipped }, { status: 500 })
    return r.sent ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'No phone is subscribed yet.' }, { status: 404 })
  }
  if (b.action === 'unsubscribe') {
    await db.from('ai_push_subscriptions').delete().eq('endpoint', String(b.endpoint ?? '')).eq('user_id', c.businessId)
    return NextResponse.json({ success: true })
  }
  const s = b.subscription
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  const { error } = await db.from('ai_push_subscriptions').upsert(
    { user_id: c.businessId, member_id: c.uid, endpoint: String(s.endpoint).slice(0, 1000), p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) }, { onConflict: 'endpoint' })
  if (error) return NextResponse.json({ error: error.message.includes('ai_push_subscriptions') ? MISSING : error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
