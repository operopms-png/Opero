import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, title, description, category, priority, attachment_url } = await req.json()
  if (!property_id || !title) return NextResponse.json({ error: 'property_id and title are required' }, { status: 400 })

  const { error } = await serviceClient.from('maintenance_tickets').insert({
    property_id,
    title,
    description: description || null,
    category: category || null,
    priority: priority || 'medium',
    attachment_url: attachment_url || null,
    status: 'open',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
