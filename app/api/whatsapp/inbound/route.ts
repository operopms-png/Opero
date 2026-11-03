import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { normalizePhone, twilioSignatureOk } from '@/lib/sms'
import { transcribe, handleAssistantMessage } from '@/lib/phone-assistant'

// Twilio WhatsApp "When a message comes in" webhook:
//   https://app.thenovourq.com/api/whatsapp/inbound   (HTTP POST)
// Only phones an account admin has linked in Settings -> Phone Assistant get answers.
export const maxDuration = 60
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const reply = (text: string) => new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${text ? `<Message>${esc(text.slice(0, 1500))}</Message>` : ''}</Response>`, { headers: { 'Content-Type': 'text/xml' } })

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const p: Record<string, string> = {}
  form.forEach((v, k) => { p[k] = String(v) })
  if (!twilioSignatureOk(`${SITE_URL}/api/whatsapp/inbound`, p, req.headers.get('x-twilio-signature'))) return new NextResponse('Forbidden', { status: 403 })

  const from = normalizePhone((p.From || '').replace(/^whatsapp:/, ''))
  if (!from) return reply('')
  const body = (p.Body || '').trim()

  // Linking: the admin sends "LINK 123456" from the phone they entered in Settings.
  const link = body.match(/^link\s+(\d{6})$/i)
  if (link) {
    const { data: pending } = await db.from('assistant_phones').select('id').eq('phone', from).eq('code', link[1]).eq('verified', false).maybeSingle()
    if (!pending) return reply('That code did not match. Check the code in Settings, Phone Assistant, and the number you entered there.')
    await db.from('assistant_phones').delete().eq('phone', from).eq('verified', true)
    await db.from('assistant_phones').update({ verified: true, code: null }).eq('id', pending.id)
    return reply('Linked. You can now message me here or send a voice note. Try: "How is my portfolio doing?"')
  }

  const { data: row } = await db.from('assistant_phones').select('business_id,user_email,name,phone').eq('phone', from).eq('verified', true).maybeSingle()
  if (!row) return reply('This number is not linked to a Novourq account. An account admin can link it in Settings, Phone Assistant.')

  let text = body, via: 'text' | 'voice' = 'text'
  const ct = p.MediaContentType0 || ''
  if (Number(p.NumMedia || 0) > 0 && ct.startsWith('audio/')) {
    const t = await transcribe(p.MediaUrl0, ct)
    if (t.error === 'no-key') return reply('Voice notes are not switched on yet. Please type your message.')
    if (!t.text) return reply('I could not make out that voice note. Please try again or type it.')
    text = t.text; via = 'voice'
  } else if (!body) {
    return reply('I can read text and voice notes. Please send one of those.')
  }
  const answer = await handleAssistantMessage(row, text, via)
  return reply(via === 'voice' ? `I heard: "${text.slice(0, 300)}"\n\n${answer}` : answer)
}
