import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { serviceClient } from '@/lib/admin-auth'

// Public, token-based lease signing. The signer (tenant or landlord) never
// logs in — the sign_token in the URL is the only credential. Every read
// and write here goes through serviceClient (service role), never the
// anon client, since there is no public RLS policy for pm_leases /
// lease_signatures — this route is the sole gate.

async function loadLeaseByToken(token: string) {
  const { data: lease } = await serviceClient
    .from('pm_leases')
    .select('id,start_date,end_date,monthly_rent,deposit,tenant_signed_at,landlord_signed_at,document_url,pm_tenants(name,email),pm_properties(name),pm_units(unit_number)')
    .eq('sign_token', token)
    .single()
  return lease
}

// A stable hash of the lease terms as they exist right now. Recomputed
// identically at sign-time and stored on the signature row, so the exact
// version of the lease that was signed is provable later even if the
// lease record itself changes afterward.
function hashLeaseTerms(lease: any) {
  const basis = JSON.stringify({
    id: lease.id,
    start_date: lease.start_date,
    end_date: lease.end_date,
    monthly_rent: lease.monthly_rent,
    deposit: lease.deposit,
    document_url: lease.document_url,
  })
  return createHash('sha256').update(basis).digest('hex')
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const lease = await loadLeaseByToken(token)
  if (!lease) return NextResponse.json({ error: 'Signing link not found or expired' }, { status: 404 })

  return NextResponse.json({ lease })
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

  const lease = await loadLeaseByToken(token)
  if (!lease) return NextResponse.json({ error: 'Signing link not found or expired' }, { status: 404 })

  const alreadySigned = role === 'tenant' ? lease.tenant_signed_at : lease.landlord_signed_at
  if (alreadySigned) return NextResponse.json({ error: 'This lease has already been signed by the ' + role }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const documentHash = hashLeaseTerms(lease)
  const signedAt = new Date().toISOString()

  const { error: sigError } = await serviceClient.from('lease_signatures').insert({
    lease_id: lease.id,
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
  const { error: updateError } = await serviceClient.from('pm_leases').update(updateField).eq('id', lease.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, signed_at: signedAt, document_hash: documentHash })
}
