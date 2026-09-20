import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

const VALID_OVERRIDES = ['APPROVED', 'DUE_DILIGENCE', 'REJECTED'] as const

// Records a human decision on top of an already-computed deal_analyses row.
// This never touches status/rule_results/etc -- those are the deterministic
// engine's output and stay immutable as the audit trail of what the engine
// actually decided. override_status is a separate, human-authored field
// layered on top, so "the engine said REVIEW, a person approved it anyway"
// is always reconstructable later.
export async function POST(req: NextRequest) {
  const user_id = await requireUser(req)
  if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { analysisId, overrideStatus, overrideReason } = await req.json()
  if (!analysisId) return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
  if (!VALID_OVERRIDES.includes(overrideStatus)) {
    return NextResponse.json({ error: `overrideStatus must be one of: ${VALID_OVERRIDES.join(', ')}` }, { status: 400 })
  }

  const { data: existing } = await serviceClient
    .from('deal_analyses')
    .select('id')
    .eq('id', analysisId)
    .eq('user_id', user_id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })

  const { data: updated, error } = await serviceClient
    .from('deal_analyses')
    .update({
      override_status: overrideStatus,
      override_reason: overrideReason || null,
      override_by: user_id,
      override_at: new Date().toISOString(),
    })
    .eq('id', analysisId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(updated)
}
