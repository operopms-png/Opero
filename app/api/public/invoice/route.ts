import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { invoicePdf } from '@/lib/invoice-pdf'

// Public invoice for the client, by the private link in their email.
//   GET ?t=<token>          -> { invoice, settings }  (records the first view)
//   GET ?t=<token>&pdf=1    -> the PDF
// Drafts and voided invoices are never shown.
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || ''
  if (!/^[0-9a-f]{20,64}$/.test(t)) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  const { data: inv } = await db.from('invoices').select('*').eq('token', t).maybeSingle()
  if (!inv || ['draft', 'void'].includes(inv.status)) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  const { data: s } = await db.from('invoice_settings').select('*').eq('business_id', inv.business_id).maybeSingle()
  if (req.nextUrl.searchParams.get('pdf')) {
    const bytes = await invoicePdf(inv, s, SITE_URL)
    return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${inv.number}.pdf"` } })
  }
  if (!inv.viewed_at) await db.from('invoices').update({ viewed_at: new Date().toISOString() }).eq('id', inv.id)
  const { business_id, token, created_by, person_id, person_kind, paid_by, sent_to, ...pub } = inv
  return NextResponse.json({ invoice: pub, settings: s })
}
