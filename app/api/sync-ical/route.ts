export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runIcalSync } from '@/lib/sync-ical-scan'

export async function GET() {
  try {
    const result = await runIcalSync()
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
