import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { name, email, role, owner_id } = await req.json()

  const { error: dbError } = await supabase.from('team_members').upsert({
    owner_id,
    name,
    email,
    role,
    status: 'Pending'
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Opero <noreply@helloopero.com>',
      to: email,
      subject: "You have been invited to Opero",
      html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px"><h2 style="font-size:22px;font-weight:700;color:#101828;margin:0 0 8px">You have been invited to Opero</h2><p style="color:#667085;font-size:15px;margin:0 0 24px">Hi ${name}, you have been invited to join Opero as a <strong>${role}</strong>.</p><a href="https://helloopero.com/signup?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}" style="display:inline-block;background:#3B4AFF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Accept invitation</a><p style="color:#98A2B3;font-size:13px;margin:24px 0 0">If you were not expecting this, you can ignore this email.</p></div>`
    })
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
