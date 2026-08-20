// Runs daily at 07:00 UTC. See lib/daily-reminders-scan.ts for the actual
// logic -- this file just wires it to Netlify's scheduler. Netlify blocks
// direct external invocation of scheduled functions (they return 403 to
// curl/browser requests), so for manual testing use
// app/api/cron/daily-reminders/route.ts instead, which runs the same scan.
import { schedule } from '@netlify/functions'
import { runDailyReminders } from '../../lib/daily-reminders-scan'

export const handler = schedule('0 7 * * *', async () => {
  const result = await runDailyReminders()
  if (!result.ok) {
    console.error('[daily-reminders] failed:', result.error)
    return { statusCode: 500 }
  }
  console.log(`[daily-reminders] scanned ${result.accountsScanned} accounts, sent ${result.digestsSent} digests`)
  return { statusCode: 200 }
})
