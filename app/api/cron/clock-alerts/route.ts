import { NextRequest, NextResponse } from 'next/server'
import { runClockAlerts } from '@/lib/clock-alerts'

// Manual trigger for the missed clock-in check (same as netlify/functions/clock-alerts.mts).
// Needs CRON_SECRET in Netlify env vars:  /api/cron/clock-alerts?secret=YOUR_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  return NextResponse.json(await runClockAlerts())
}
