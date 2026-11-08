// Runs daily at 09:00 UTC: reminds owners and tenants who were asked for documents and still owe some (every 3 days, up to 5 times).
import { schedule } from '@netlify/functions'
import { runDocReminders } from '../../lib/doc-hub'

export const handler = schedule('0 9 * * *', async () => {
  const r = await runDocReminders()
  console.log(`[doc-reminders] reminded ${r.reminded}`)
  return { statusCode: 200 }
})
