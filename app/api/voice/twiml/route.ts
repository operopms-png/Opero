import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { voiceIdentityFor } from '@/lib/voice-identity'

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const to = (form.get('To') as string | null) ?? ''
  const from = (form.get('From') as string | null) ?? ''
  const connectionId = (form.get('ConnectionId') as string | null) ?? null
  const teamMemberIdentity = (form.get('TeamMemberIdentity') as string | null) ?? null
  const callerName = (form.get('CallerName') as string | null) ?? null

  const origin = new URL(req.url).origin

  if (teamMemberIdentity) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Client>${xmlEscape(teamMemberIdentity)}${callerName ? `<Parameter name="CallerName" value="${xmlEscape(callerName)}"/>` : ''}</Client></Dial></Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  if (connectionId) {
    const { data: conn } = await serviceClient.from('whatsapp_connections').select('phone_number').eq('id', connectionId).maybeSingle()
    const callerId = conn?.phone_number ?? from
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xmlEscape(callerId)}"><Number>${xmlEscape(to)}</Number></Dial></Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const { data: conn } = await serviceClient.from('whatsapp_connections').select('id,connected_by_email,user_id').eq('phone_number', to).maybeSingle()
  if (!conn) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not set up to receive calls.</Say><Hangup/></Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  let staffAuthId = conn.user_id
  if (conn.connected_by_email) {
    const { data: authUser } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
    const match = authUser?.users?.find(u => u.email?.toLowerCase() === conn.connected_by_email?.toLowerCase())
    if (match) staffAuthId = match.id
  }
  const identity = voiceIdentityFor(staffAuthId)

  const statusCallback = `${origin}/api/voice/status?user_id=${conn.user_id}&connection_id=${conn.id}&contact_phone=${encodeURIComponent(from)}&staff_identity=${identity}`
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xmlEscape(from)}"><Client statusCallback="${xmlEscape(statusCallback)}" statusCallbackEvent="initiated ringing answered completed">${xmlEscape(identity)}</Client></Dial></Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
