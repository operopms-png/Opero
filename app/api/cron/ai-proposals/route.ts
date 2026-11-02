import { NextRequest, NextResponse } from 'next/server'
import { runAiProposals } from '@/lib/ai-proposals'

// Manual trigger for the monthly AI proposals (owner reports) without waiting for
// the schedule. Needs CRON_SECRET in Netlify env vars:
//   curl "https://<site>/api/cron/ai-proposals?secret=YOUR_SECRET"
// Nothing is sent: it only adds drafts to the AI Approvals queue.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  const result = await runAiProposals()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
