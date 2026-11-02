// Web push to the phones and browsers that turned notifications on (AI Command Centre -> Alerts).
// Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Netlify env vars. Without them this
// does nothing and the rest of the portal carries on.
import webpush from 'web-push'
import { svc } from './ai-proposal-utils'
import { SITE_URL } from './brand'

let ready = false
function init() {
  if (ready) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || SITE_URL, pub, priv)
  ready = true
  return true
}

export async function sendPush(businessId: string, msg: { title: string; body: string; url: string }, memberId?: string) {
  if (!init()) return { sent: 0, skipped: 'Push is not set up: the VAPID keys are missing.' }
  const db = svc()
  let q = db.from('ai_push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', businessId)
  if (memberId) q = q.eq('member_id', memberId)
  const { data } = await q
  let sent = 0
  for (const s of data ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 })
      sent++
    } catch (e: any) {
      // The phone unsubscribed or the browser data was cleared: forget it.
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('ai_push_subscriptions').delete().eq('id', s.id)
    }
  }
  return { sent }
}
