// Runs every 10 minutes: emails the owner when someone has not clocked in 15 minutes after their shift starts.
import { schedule } from '@netlify/functions'
import { runClockAlerts } from '../../lib/clock-alerts'

export const handler = schedule('*/10 * * * *', async () => {
  const r = await runClockAlerts()
  console.log(`[clock-alerts] checked ${r.checked}, alerted ${r.alerted}, emailed ${r.emailed}`)
  return { statusCode: 200 }
})
