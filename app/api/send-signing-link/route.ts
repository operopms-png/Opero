import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

// Sends the real e-signature link (the same one 'Copy Link' copies)
// directly to the tenant's email, instead of requiring staff to
// paste it into their own email client manually.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenancy_id, from_email, from_name } = await req.json()
  if (!tenancy_id) return NextResponse.json({ error: 'tenancy_id is required' }, { status: 400 })

  const { data: tenancy, error } = await serviceClient
    .from('estate_tenancies')
    .select('*, estate_properties(name), estate_tenants(name,email)')
    .eq('id', tenancy_id)
    .eq('user_id', userId)
    .single()

  if (error || !tenancy) return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 })
  if (!tenancy.sign_token) return NextResponse.json({ error: 'This tenancy has no signing link set up yet.' }, { status: 400 })

  const tenantEmail = tenancy.estate_tenants?.email
  const tenantName = tenancy.estate_tenants?.name || 'there'
  const propertyName = tenancy.estate_properties?.name || 'your property'

  if (!tenantEmail) return NextResponse.json({ error: "This tenant doesn't have an email address on file." }, { status: 400 })

  const signUrl = `${req.nextUrl.origin}/sign/${tenancy.sign_token}`
  const from = from_email ? `${from_name || 'Sangsters Group'} <${from_email}>` : undefined

  const result = await sendEmail(
    tenantEmail,
    `Your tenancy agreement for ${propertyName}`,
    `<p>Hi ${tenantName},</p>
     <p>Please review and sign your tenancy agreement for <strong>${propertyName}</strong> using the secure link below:</p>
     <p><a href="${signUrl}" style="display:inline-block;background:#101828;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Review & Sign Agreement</a></p>
     <p>Or copy this link into your browser: ${signUrl}</p>`,
    undefined,
    from
  )

  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  if (result.skipped) return NextResponse.json({ skipped: true, message: 'Email sending is not configured yet — nothing was actually sent.' })

  return NextResponse.json({ success: true })
}
