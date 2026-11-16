// Runs daily at 10:00 UTC: reminds clients who have not finished their onboarding link, and alerts staff to clients who have gone quiet.
import { schedule } from '@netlify/functions'
import { runOnboardingReminders } from '../../lib/onboarding-reminders'

export const handler = schedule('0 10 * * *', async () => {
  const r = await runOnboardingReminders()
  console.log(`[onboarding-reminders] reminded ${r.reminded}, alerted ${r.alerted}`)
  return { statusCode: 200 }
})
