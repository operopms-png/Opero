import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { stageImport } from '@/lib/ai-import'

// POST {csv}: the AI maps the spreadsheet and queues one import for approval. Nothing is written yet.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const r = await stageImport(c.businessId, String(b.csv ?? ''))
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json(r)
}
