// Every hour: send automatic documents (Documents → Automatic) and signature
// reminders. The work happens in app/api/cron/documents/route.ts; this just
// calls it on a schedule with the CRON_SECRET.
import { schedule } from '@netlify/functions'

export const handler = schedule('17 * * * *', async () => {
  const site = (process.env.URL || 'https://app.sangstersgroup.com').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET
  if (!secret) { console.error('[doc-automation] CRON_SECRET not set'); return { statusCode: 500 } }
  const res = await fetch(`${site}/api/cron/documents?secret=${encodeURIComponent(secret)}`)
  console.log('[doc-automation]', res.status, (await res.text()).slice(0, 500))
  return { statusCode: res.ok ? 200 : 500 }
})
