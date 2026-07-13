import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

// Ensures a property belongs to at most one owner: strips the property_id
// out of every owner's property_ids, then adds it back to the chosen owner
// (if any). Passing owner_id: null just unassigns it from everyone.
export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, owner_id } = await req.json()
  if (!property_id) return NextResponse.json({ error: 'property_id is required' }, { status: 400 })

  const { data: owners, error: fetchError } = await serviceClient
    .from('owner_profiles')
    .select('id, property_ids')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  for (const owner of owners ?? []) {
    const current: string[] = owner.property_ids ?? []
    const hasIt = current.includes(property_id)
    const shouldHaveIt = owner.id === owner_id
    if (hasIt && !shouldHaveIt) {
      await serviceClient.from('owner_profiles').update({ property_ids: current.filter(id => id !== property_id) }).eq('id', owner.id)
    } else if (!hasIt && shouldHaveIt) {
      await serviceClient.from('owner_profiles').update({ property_ids: [...current, property_id] }).eq('id', owner.id)
    }
  }

  return NextResponse.json({ success: true })
}
