export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { PERSON_KINDS, resolveLink } from '@/lib/client-link'
import { WHO } from '@/lib/doc-hub'

// What a client sees when they open their secure link (/d/[token]).
//   GET ?t=<token> → { person, company, subject, expires_at, signs:[…], invoices:[…] }
// Contracts and invoices are those addressed to this person. Drafts and voided items are never shown.
export async function GET(req: NextRequest) {
  const r = await resolveLink(req.nextUrl.searchParams.get('t') || '', true)
  if (!r) return NextResponse.json({ error: 'This link has expired or is not valid. Please ask us to send you a new one.' }, { status: 404 })
  const { link, rec, subject } = r
  const kinds = PERSON_KINDS[subject]
  const [{ data: s }, { data: docs }, { data: invs }] = await Promise.all([
    db.from('invoice_settings').select('company_name, logo_url').eq('business_id', link.business_id).maybeSingle(),
    db.from('doc_sends').select('title, token, status, needs_signature, signed_at, sent_at').eq('business_id', link.business_id).in('person_kind', kinds).eq('person_id', rec.id).in('status', ['sent', 'opened', 'signed']).order('sent_at', { ascending: false }).limit(30),
    db.from('invoices').select('id, number, status, total, currency, due_date, issue_date, paid_at, token, note').eq('business_id', link.business_id).in('person_kind', kinds).eq('person_id', rec.id).in('status', ['sent', 'paid', 'overdue']).order('issue_date', { ascending: false }).limit(30),
  ])
  return NextResponse.json({
    person: { name: rec.name, who: WHO[subject] }, company: s?.company_name || 'NOVOURQ', subject, expires_at: link.expires_at,
    signs: (docs ?? []).filter((d: any) => d.needs_signature || d.status === 'signed').map((d: any) => ({ title: d.title, token: d.token, signed: d.status === 'signed', signed_at: d.signed_at })),
    invoices: invs ?? [],
  })
}
