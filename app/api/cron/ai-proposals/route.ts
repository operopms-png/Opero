import { NextRequest, NextResponse } from 'next/server'
import { runAiProposals } from '@/lib/ai-proposals'
import { runEscalations } from '@/lib/ai-escalation'
import { startBackgroundRun } from '@/lib/ai-run'

// Manual trigger for the AI proposals without waiting for the schedule. Needs CRON_SECRET
// in Netlify env vars:
//   curl "https://<site>/api/cron/ai-proposals?secret=YOUR_SECRET"          (what today's run would do)
//   curl "https://<site>/api/cron/ai-proposals?secret=YOUR_SECRET&all=1"    (run every kind now)
// Nothing is sent or changed: it only adds drafts to the AI Approvals queue.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set in Netlify env vars' }, { status: 500 })
  if (req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 })
  if (req.nextUrl.searchParams.get('escalate') === '1') return NextResponse.json(await runEscalations())
  // The run can take minutes (web searches, many drafts), so it starts in the background.
  const started = await startBackgroundRun({ force: req.nextUrl.searchParams.get('all') === '1' })
  if (started.ok) return NextResponse.json({ ok: true, started: true, note: 'Running in the background. New drafts appear in AI Approvals within a few minutes. Results are logged in Workflows.' })
  const result = await runAiProposals(req.nextUrl.searchParams.get('all') === '1')
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
