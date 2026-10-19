import { NextRequest, NextResponse } from 'next/server'
import { runDocAutomation } from '@/lib/documents'

// Automatic documents + signature reminders. Called every hour by
// netlify/functions/doc-automation.mts, or by hand:
//   curl "https://<site>/api/cron/documents?secret=CRON_SECRET"
export const maxDuration = 60
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  return NextResponse.json({ report: await runDocAutomation() })
}
