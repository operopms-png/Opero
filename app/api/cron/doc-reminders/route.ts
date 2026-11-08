import { NextRequest, NextResponse } from 'next/server'
import { runDocReminders } from '@/lib/doc-hub'

// Manual trigger for the daily document reminders. Needs CRON_SECRET: /api/cron/doc-reminders?secret=YOUR_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  return NextResponse.json(await runDocReminders())
}
