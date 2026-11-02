import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { loadPortfolio } from '@/lib/ai-portfolio'
import { startBackgroundRun } from '@/lib/ai-run'

// Portfolio page data. POST {action:'refresh'} starts the web-search value estimates in the background.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await loadPortfolio(c.businessId))
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'refresh') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const r = await startBackgroundRun({ force: true, businessId: c.businessId, task: 'portfolio' })
  if (!r.ok) return NextResponse.json({ error: r.error || 'Could not start' }, { status: 500 })
  return NextResponse.json({ success: true, started: true })
}
