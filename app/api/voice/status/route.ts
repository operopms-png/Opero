import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const userId = params.get('user_id')
  const connectionId = params.get('connection_id')
  const contactPhone = params.get('contact_phone')
  const staffIdentity = params.get('staff_identity')
  if (!userId || !contactPhone) return NextResponse.json({ received: true, matched: false })

  const form = await req.formData()
  const callSid = (form.get('CallSid') as string | null) ?? (form.get('ParentCallSid') as string | null)
  const callStatus = (form.get('CallStatus') as string | null) ?? 'in-progress'
  const duration = form.get('CallDuration') ? parseInt(form.get('CallDuration') as string, 10) : null

  const statusMap: Record<string, string> = {
    completed: 'completed', 'no-answer': 'no-answer', busy: 'missed', failed: 'failed', canceled: 'missed',
  }

  let contactName: string | null = null
  let contactId: string | null = null
  const { data: match } = await serviceClient.from('crm_contacts').select('id,name').eq('user_id', userId).eq('phone', contactPhone).maybeSingle()
  if (match) { contactId = match.id; contactName = match.name }

  const { error } = await serviceClient.from('call_logs').upsert({
    user_id: userId,
    connection_id: connectionId,
    direction: 'inbound',
    contact_phone: contactPhone,
    contact_name: contactName,
    contact_id: contactId,
    staff_identity: staffIdentity,
    status: statusMap[callStatus] ?? 'in-progress',
    duration_seconds: duration,
    twilio_call_sid: callSid,
  }, { onConflict: 'twilio_call_sid' })

  if (error) console.error('[voice/status] Upsert failed:', error.message)
  return NextResponse.json({ received: true })
}
