import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

export const maxDuration = 60
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Download everything stored under this business account as one JSON file. Account admins only.
// Passwords, tokens and keys are left out.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can export the company data.' }, { status: 403 })
  const { data, error } = await db.rpc('export_business_data', { p_biz: c.businessId })
  if (error) return NextResponse.json({ error: 'Could not prepare the export. Please try again.' }, { status: 500 })
  await db.from('data_requests').insert({ business_id: c.businessId, requested_by: c.uid, requester_email: c.email, kind: 'export', status: 'completed', completed_at: new Date().toISOString() })
  const body = JSON.stringify({ exported_at: new Date().toISOString(), business_id: c.businessId, account_email: c.email, note: 'Passwords, tokens and keys are not included.', data }, null, 2)
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="novourq-data-export-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' } })
}
