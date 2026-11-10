import { NextRequest } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'

// View only people can look at everything they were given but cannot change records.
// Messaging stays open so they can still send messages and replies.
// The database blocks their direct edits (restrictive policies, see migrations/add-view-only.sql);
// this covers the server routes, which use the service key and so skip those policies.
const SAFE = ['GET', 'HEAD', 'OPTIONS']
const MESSAGING = [
  '/api/mailboxes', '/api/crm-send', '/api/sms', '/api/whatsapp', '/api/guest-send', '/api/airbnb-inbox', '/api/website-chat',
  '/api/feedback-reply', '/api/feedback-thread', '/api/notify', '/api/announcements', '/api/meeting-request', '/api/push-subscribe',
]

// True when this request would change something and the signed-in person is view only.
export async function blockedForViewOnly(req: NextRequest, email: string | null | undefined): Promise<boolean> {
  if (!email || SAFE.includes(req.method)) return false
  const path = req.nextUrl.pathname
  if (MESSAGING.some(p => path === p || path.startsWith(p + '/'))) return false
  const { data } = await serviceClient.from('team_members').select('id').eq('email', email).eq('view_only', true).limit(1)
  return !!data?.length
}
