export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DOC_SETS, LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'

// What an owner or tenant sees in their portal: the files their property manager added to their checklist and left shown
// (Owners → Documents, Tenants → Documents), plus what is still needed. GET ?kind=landlord|tenant[&id=…].
// The portal user gets their own record; staff previewing a portal pass id and must belong to the same company.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind')
  if (kind !== 'landlord' && kind !== 'tenant') return bad('Unknown type.')
  const table = kind === 'landlord' ? 'pm_landlords' : 'pm_tenants'
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return bad('Not signed in', 401)
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await asUser.auth.getUser(token)
  if (!user) return bad('Not signed in', 401)

  let rec: any = null
  const { data: own } = await db.from(table).select('id, user_id').eq('portal_user_id', user.id).maybeSingle()
  if (own) rec = own
  else {
    const id = req.nextUrl.searchParams.get('id') || ''
    const c = await getCaller(req)
    if (c && id) { const { data } = await db.from(table).select('id, user_id').eq('id', id).eq('user_id', c.businessId).maybeSingle(); rec = data }
  }
  if (!rec) return bad('Not found.', 404)

  const { data } = await db.from('lease_documents').select('*').eq('subject', kind).eq('head_lease_id', rec.id).eq('user_id', rec.user_id).order('created_at', { ascending: false })
  const all = data ?? []
  const labels = Object.fromEntries(DOC_SETS[kind].map(t => [t.key, t.label]))
  const files = await Promise.all(all.filter((f: any) => f.visible_to_portal !== false).map(async (f: any) => {
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 300)
    return { id: f.id, category: labels[f.category] ?? 'Other documents', name: f.name, expires_on: f.expires_on, created_at: f.created_at, url: s?.signedUrl ?? null }
  }))
  const have = new Set(all.map((f: any) => f.category))
  const missing = DOC_SETS[kind].filter(t => t.key !== 'other' && !have.has(t.key)).map(t => ({ label: t.label, hint: t.hint }))
  return NextResponse.json({ files, missing })
}
