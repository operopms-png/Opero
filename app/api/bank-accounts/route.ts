export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// GET → { accounts, isAdmin }     staff see the list
// POST { id?, purpose, currency, label, bank_name, account_name, account_number, branch_or_sort_code, iban, swift, reference_note, active }  admins add or change one
// DELETE ?id=…                     admins remove one
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const S = (v: any, n = 200) => { const t = String(v ?? '').trim().slice(0, n); return t || null }
export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { data } = await db.from('company_bank_accounts').select('*').eq('business_id', c.businessId).order('purpose').order('sort_order').order('currency')
  return NextResponse.json({ accounts: data ?? [], isAdmin: c.isAdmin })
}
export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!c.isAdmin) return bad('Only an admin can change bank details.', 403)
  const b = await req.json().catch(() => ({}))
  const row = { purpose: b.purpose === 'deposit' ? 'deposit' : 'rent', currency: (S(b.currency, 6) || 'JMD').toUpperCase(), label: S(b.label), bank_name: S(b.bank_name), account_name: S(b.account_name), account_number: S(b.account_number, 60), branch_or_sort_code: S(b.branch_or_sort_code, 40), iban: S(b.iban, 60), swift: S(b.swift, 30), reference_note: S(b.reference_note), active: b.active !== false, updated_by: c.email, updated_at: new Date().toISOString() }
  if (!row.bank_name || !row.account_number) return bad('Enter the bank name and account number.')
  const q = b.id ? db.from('company_bank_accounts').update(row).eq('id', String(b.id)).eq('business_id', c.businessId) : db.from('company_bank_accounts').insert({ ...row, business_id: c.businessId })
  const { error } = await q; if (error) return bad('Could not save.', 500)
  return NextResponse.json({ ok: true })
}
export async function DELETE(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!c.isAdmin) return bad('Only an admin can change bank details.', 403)
  await db.from('company_bank_accounts').delete().eq('id', req.nextUrl.searchParams.get('id') || '').eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
