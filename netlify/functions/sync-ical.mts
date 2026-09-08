// Runs every 2 hours. See lib/sync-ical-scan.ts for the actual logic --
// this file just wires it to Netlify's scheduler. Netlify blocks
// direct external invocation of scheduled functions (they return 403
// to curl/browser requests), so for manual testing use
// app/api/sync-ical/route.ts instead, which runs the same scan.
import { schedule } from '@netlify/functions'
import { runIcalSync } from '../../lib/sync-ical-scan'

export const handler = schedule('0 */2 * * *', async () => {
  const result = await runIcalSync()
  const errors = result.synced.filter((r: any) => r.error)
  if (errors.length) console.error('[sync-ical] errors:', errors)
  console.log(`[sync-ical] synced ${result.synced.length} property/source pairs`)
  return { statusCode: 200 }
})
