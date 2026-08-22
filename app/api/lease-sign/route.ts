import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { serviceClient } from '@/lib/admin-auth'

// Public, token-based signing for both PM leases and Estate Agency
// tenancies. The signer never logs in -- the sign_token in the URL is
// the only credential. Every read/write goes through serviceClient
// (service role), never the anon client, since there is no public RLS
// policy for pm_leases / estate_tenancies / their signature tables --
// this route is the sole gate.
//
// pm_leases and estate_tenancies are separate data models (see
// migrations/add-lease-esignature.sql and
// migrations/add-estate-tenancy-esignature.sql), so this route checks
// both tables by sign_token and works out which "kind" it is, rather
// than the caller needing to know in advance.

type Kind = 'pm_lease' | 'estate_tenancy'

async function findByToken(token: string): Promise<{ kind: Kind; record: any } | null> {
  const { data: lease } = await serviceClient
    .from('pm_leases')
    .select('id,start_date,end_date,monthly_rent,deposit,tenant_signed_at,landlord_signed_at,document_url,pm_tenants(name,email),pm_properties(name),pm_units(unit_number)')
    .eq('sign_token', token)
    .maybeSingle()
  if (lease) return { kind: 'pm_lease', record: lease }

  const { data: tenancy } = await serviceClient
    .from('estate_tenancies')
    .select('id,start_date,end_date,rent,deposit,tenant_signed_at,landlord_signed_at,document_url,estate_tenants(name,email),estate_properties(name)')
    .eq('sign_token', token)
    .maybeSingle()
  if (tenancy) return { kind: 'estate_tenancy', record: tenancy }

  return null
}

// A stable hash of the terms as they exist right now, recomputed
// identically at sign-time and stored on the signature row -- proves the
// exact version of the document that was signed even if the underlying
// record changes afterward. Field names differ slightly between kinds
// (monthly_rent vs rent) so each is normalised into the same shape first.
function hashTerms(kind: Kind, record: any) {
  const basis = JSON.stringify({
    kind,
    id: record.id,
    start_date: record.start_date,
    end_date: record.end_date,
    rent: kind === 'pm_lease' ? record.monthly_rent : record.rent,
    deposit: record.deposit,
    document_url: record.document_url,
  })
  return createHash('sha256').update(basis).digest('hex')
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const found = await findByToken(token)
  if (!found) return NextResponse.json({ error: 'Signing link not found or expired' }, { status: 404 })

  return NextResponse.json({ kind: found.kind, lease: found.record })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, role, method, signature_data, signer_name } = body

  if (!token || !role || !method || !signature_data || !signer_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['tenant', 'landlord'].includes(role)) {
    return NextResponse.json({ error: 'Invalid signer role' }, { status: 400 })
  }
  if (!['typed', 'drawn'].includes(method)) {
    return NextResponse.json({ error: 'Invalid signature method' }, { status: 400 })
  }

  const found = await findByToken(token)
  if (!found) return NextResponse.json({ error: 'Signing link not found or expired' }, { status: 404 })
  const { kind, record } = found

  const alreadySigned = role === 'tenant' ? record.tenant_signed_at : record.landlord_signed_at
  if (alreadySigned) return NextResponse.json({ error: 'This document has already been signed by the ' + role }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const documentHash = hashTerms(kind, record)
  const signedAt = new Date().toISOString()

  const signaturesTable = kind === 'pm_lease' ? 'lease_signatures' : 'estate_tenancy_signatures'
  const foreignKeyField = kind === 'pm_lease' ? 'lease_id' : 'tenancy_id'
  const parentTable = kind === 'pm_lease' ? 'pm_leases' : 'estate_tenancies'

  const { error: sigError } = await serviceClient.from(signaturesTable).insert({
    [foreignKeyField]: record.id,
    signer_role: role,
    signer_name,
    method,
    signature_data,
    ip_address: ip,
    user_agent: userAgent,
    document_hash: documentHash,
    signed_at: signedAt,
  })
  if (sigError) return NextResponse.json({ error: sigError.message }, { status: 500 })

  const updateField = role === 'tenant' ? { tenant_signed_at: signedAt } : { landlord_signed_at: signedAt }
  const { error: updateError } = await serviceClient.from(parentTable).update(updateField).eq('id', record.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, signed_at: signedAt, document_hash: documentHash })
}
