// Runs daily at 08:00 UTC: emails check-in links to guests arriving within 3 days, reminds anyone still
// incomplete, and deletes ID photos 30 days after check-out. Logic lives in lib/guest-checkin.ts.
import { schedule } from '@netlify/functions'
import { runGuestCheckinScan } from '../../lib/guest-checkin'

export const handler = schedule('0 8 * * *', async () => {
  const r = await runGuestCheckinScan()
  console.log(`[guest-checkins] sent ${r.sent}, reminded ${r.reminded}, ID photos deleted ${r.idsDeleted}`)
  return { statusCode: 200 }
})
