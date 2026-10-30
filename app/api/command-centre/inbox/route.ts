import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Inbox channels (Conversations, Email, Airbnb, Website Chats, AI Assistant).
// Counts come from the account's own records only.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const [convos, boxes, airbnb, chats, log] = await Promise.all([
    db.from('staff_conversations').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('mailboxes').select('id,ai_mode').eq('user_id', biz),
    db.from('airbnb_threads').select('status').eq('business_id', biz),
    db.from('website_chats').select('staff_read').eq('business_id', biz).gt('message_count', 0),
    db.from('ai_receptionist_log').select('id', { count: 'exact', head: true }).eq('business_id', biz).neq('action', 'processing').gte('created_at', since),
  ])
  const mb = (boxes.data ?? []) as any[]
  const ids = mb.map(m => m.id)
  const unseen = ids.length
    ? await db.from('mailbox_messages').select('id', { count: 'exact', head: true }).in('mailbox_id', ids).eq('seen', false)
    : { count: 0 }
  const ab = (airbnb.data ?? []) as any[]
  const wc = (chats.data ?? []) as any[]
  return NextResponse.json({
    conversations: { total: convos.count ?? 0 },
    email: { mailboxes: mb.length, unseen: unseen.count ?? 0, aiMode: mb.filter(m => m.ai_mode).length },
    airbnb: { open: ab.filter(t => String(t.status || '').toLowerCase() !== 'done').length, total: ab.length },
    websiteChats: { unread: wc.filter(w => !w.staff_read).length, total: wc.length },
    aiAssistant: { handled7d: log.count ?? 0 },
  })
}
