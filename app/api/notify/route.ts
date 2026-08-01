import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

const TYPE_TO_ROLE: Record<string, string> = {
  maintenance: 'Maintenance',
  cleaning: 'Cleaner',
  booking: 'Airbnb Agent',
  guest_message: 'Airbnb Agent',
}

export async function POST(req: NextRequest) {
  const { user_id, module, type, title, property_name, property_id, link } = await req.json()
  if (!user_id || !type || !title) {
    return NextResponse.json({ error: 'user_id, type, and title are required' }, { status: 400 })
  }

  const { error: insertError } = await serviceClient.from('notifications').insert({
    user_id, module: module || 'str', type, title, property_name: property_name || null, link: link || null,
  })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Find staff whose role matches this notification type, and who either
  // has no property restriction or is assigned to this specific property.
  const relevantRole = TYPE_TO_ROLE[type]
  let recipients: { email: string; name?: string }[] = []

  if (relevantRole) {
    const { data: staff } = await serviceClient
      .from('team_members')
      .select('email, name, property_ids')
      .eq('user_id', user_id)
      .eq('role', relevantRole)
      .eq('status', 'Active')

    recipients = (staff ?? []).filter((s: any) =>
      !s.property_ids?.length || !property_id || s.property_ids.includes(property_id)
    )
  }

  // Always also notify the account owner (admin) for visibility.
  const { data: ownerData } = await serviceClient.auth.admin.getUserById(user_id)
  if (ownerData?.user?.email) recipients.push({ email: ownerData.user.email })

  const subject = `Opero: ${title}`
  const html = `<p>${title}</p>${property_name ? `<p style="color:#667085">${property_name}</p>` : ''}<p><a href="https://helloopero.com${link || ''}">View in Opero</a></p>`

  await Promise.all(recipients.map(r => sendEmail(r.email, subject, html)))

  return NextResponse.json({ success: true, emailed: recipients.length })
}
