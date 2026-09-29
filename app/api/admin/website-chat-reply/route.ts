export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { staffLabel } from '@/lib/partner-activation'

// Staff reply to a website chat visitor by email (from Staff Centre -> Website Chats).
// The reply is saved in the chat so the assistant knows about it if the visitor returns.
export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chat_id, message } = await req.json()
  const text = String(message ?? '').trim().slice(0, 5000)
  if (!chat_id || !text) return NextResponse.json({ error: 'Write a message first' }, { status: 400 })

  const { data: chat } = await serviceClient.from('website_chats').select('id, business_id, name, email').eq('id', chat_id).maybeSingle()
  if (!chat || chat.business_id !== staff.businessId) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  if (!chat.email) return NextResponse.json({ error: 'This visitor didn’t leave an email address' }, { status: 400 })

  const { data: settings } = await serviceClient.from('website_chat_settings').select('company_name, alert_email').eq('business_id', staff.businessId).maybeSingle()
  const company = settings?.company_name || 'our team'
  const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  const from = await staffLabel(staff.staffId, staff.email)

  const result: any = await sendEmail(
    chat.email,
    `Your enquiry with ${company}`,
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#323338;line-height:1.6">
      <p>Hi ${esc(chat.name?.split(' ')[0] ?? 'there')},</p>
      ${esc(text).split('\n').map(l => `<p style="margin:0 0 8px">${l || '&nbsp;'}</p>`).join('')}
      <p style="margin-top:16px">${esc(from.replace(/\s*\(.*\)$/, ''))}<br>${esc(company)}</p>
    </div>`,
    settings?.alert_email || staff.email || undefined,
  )
  if (result?.error) return NextResponse.json({ error: 'The email could not be sent. Please try again.' }, { status: 500 })

  await serviceClient.from('website_chat_messages').insert({ chat_id: chat.id, role: 'staff', content: text, meta: { by: from, via: 'email' } })
  await serviceClient.from('website_chats').update({ last_message_at: new Date().toISOString(), staff_read: true }).eq('id', chat.id)
  return NextResponse.json({ ok: true })
}
