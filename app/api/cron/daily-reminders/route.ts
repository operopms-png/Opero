import { NextRequest, NextResponse } from 'next/server'
import { runDailyReminders } from '@/lib/daily-reminders-scan'

// Manual trigger for testing the daily reminders digest without waiting
// for the 07:00 UTC schedule. Requires CRON_SECRET to be set in Netlify
// env vars -- call as:
//   curl "https://helloopero.com/api/cron/daily-reminders?secret=YOUR_SECRET"
// Returns per-account results so you can see exactly what it found.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  }
  const provided = req.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  }

  const result = await runDailyReminders()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
