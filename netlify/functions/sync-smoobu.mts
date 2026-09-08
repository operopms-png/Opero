// Runs every 30 minutes -- more frequent than sync-ical's 2 hours,
// since guest messages are time-sensitive in a way booking dates
// aren't. See lib/sync-smoobu.ts for the actual logic. Netlify blocks
// direct external invocation of scheduled functions, so for manual
// testing use app/api/sync-smoobu/route.ts instead.
import { schedule } from '@netlify/functions'
import { runSmoobuSync } from '../../lib/sync-smoobu'

export const handler = schedule('*/30 * * * *', async () => {
  const result = await runSmoobuSync()
  const errors = result.synced.filter((r: any) => r.error)
  if (errors.length) console.error('[sync-smoobu] errors:', errors)
  console.log(`[sync-smoobu] synced ${result.synced.length} account(s)`)
  return { statusCode: 200 }
})
