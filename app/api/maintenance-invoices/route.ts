export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Invoices on a repair (Property Management or Estate Agency). Staff only. Partners linked to the home see the ones ticked Show to partners.
//   GET ?source=pm|estate&id=…            list
//   POST {source,id,file_url,file_name,amount,currency,note,show_partner}
//   PATCH {id, show_partner}
//   DELETE ?id=…
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TABLE: Record<string, string> = { pm: 'pm_maintenance', estate: 'estate_maintenance' }

async function owns(source: string, id: string, businessId: string) {
  if (!TABLE[source] || !id) return false
  const { data } = await db.from(TABLE[source]).select('id').eq('id', id).eq('user_id', businessId).maybeSingle()
  return !!data
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const source = req.nextUrl.searchParams.get('source') || '', id = req.nextUrl.searchParams.get('id') || ''
  if (!(await owns(source, id, c.businessId))) return bad('Not found', 404)
  const { data } = await db.from('maintenance_invoices').select('*').eq('business_id', c.businessId).eq('source', source).eq('maintenance_id', id).order('created_at')
  return NextResponse.json({ invoices: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => null); if (!b) return bad('Missing details')
  if (!(await owns(String(b.source), String(b.id), c.businessId))) return bad('Not found', 404)
  const url = String(b.file_url || ''); if (!/^https:\/\//.test(url)) return bad('Upload the invoice first')
  const amount = b.amount === '' || b.amount == null ? null : Number(b.amount)
  if (amount != null && !(amount >= 0)) return bad('Enter the amount as a number')
  const { data, error } = await db.from('maintenance_invoices').insert({
    business_id: c.businessId, source: b.source, maintenance_id: b.id, file_url: url, file_name: String(b.file_name || '').slice(0, 200) || null,
    amount, currency: String(b.currency || '').slice(0, 6) || null, note: String(b.note || '').slice(0, 500) || null,
    show_partner: b.show_partner !== false, uploaded_by: c.name || c.email,
  }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ invoice: data })
}

export async function PATCH(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => null); if (!b?.id || typeof b.show_partner !== 'boolean') return bad('Missing details')
  const { error } = await db.from('maintenance_invoices').update({ show_partner: b.show_partner }).eq('id', b.id).eq('business_id', c.businessId)
  return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { error } = await db.from('maintenance_invoices').delete().eq('id', req.nextUrl.searchParams.get('id') || '').eq('business_id', c.businessId)
  return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
}
