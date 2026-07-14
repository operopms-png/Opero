import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, stage } = await req.json()
  if (!property_id || typeof stage !== 'number') {
    return NextResponse.json({ error: 'property_id and a numeric stage are required' }, { status: 400 })
  }

  const { error } = await serviceClient.from('properties').update({ staging_stage: stage }).eq('id', property_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
