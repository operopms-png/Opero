import { NextRequest, NextResponse } from 'next/server'
import { runOnboardingReminders } from '@/lib/onboarding-reminders'

// Manual trigger for the daily onboarding reminders. Needs CRON_SECRET: /api/cron/onboarding-reminders?secret=YOUR_SECRET
export const maxDuration = 60
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  return NextResponse.json(await runOnboardingReminders())
}
