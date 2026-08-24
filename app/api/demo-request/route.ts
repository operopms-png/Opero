import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

// Public route -- no auth required, this is the landing page's lead
// capture form (public/landing.html). Anyone can hit this, so it only
// ever inserts a row; it never reads back other people's submissions.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { first_name, last_name, company_name, email, phone, portfolio_type } = body

  if (!first_name || !last_name || !company_name || !email) {
    return NextResponse.json({ error: 'First name, last name, company name, and email are required.' }, { status: 400 })
  }

  const { error } = await serviceClient.from('demo_requests').insert({
    first_name, last_name, company_name, email,
    phone: phone || null,
    portfolio_type: portfolio_type || null,
  })

  if (error) {
    console.error('[demo-request]', error)
    return NextResponse.json({ error: 'Could not submit right now. Please try again.' }, { status: 500 })
  }

  // Best-effort notification -- if email sending isn't configured or
  // fails, the lead is still safely saved in demo_requests either way.
  try {
    await sendEmail(
      'admin@sangstersgroup.com',
      `New demo request: ${company_name}`,
      `<p><strong>${first_name} ${last_name}</strong> from <strong>${company_name}</strong> requested a demo.</p>
       <p>Email: ${email}<br/>Phone: ${phone || '—'}<br/>Portfolio: ${portfolio_type || '—'}</p>`
    )
  } catch (e) {
    console.error('[demo-request] notification email failed', e)
  }

  return NextResponse.json({ success: true })
}
