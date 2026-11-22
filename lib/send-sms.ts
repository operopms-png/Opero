// Sends SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
// TWILIO_SMS_FROM (a Twilio phone number, e.g. +447700900123) in Netlify env
// vars. If they're not set, this logs and returns { skipped: true } without
// throwing — so the rest of the portal keeps working before texts are set up.
// Returns { success, sid } when Twilio accepts the message.
import { SITE_URL } from '@/lib/brand'

export function smsConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM } = process.env
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_SMS_FROM)
}

// creds: a company's own Twilio account (Settings -> Texts). Without it the platform's Netlify values are used.
export async function sendSms(to: string, body: string, from?: string, creds?: { sid: string; token: string }): Promise<{ success?: boolean; sid?: string; status?: string; skipped?: boolean; error?: string }> {
  const { TWILIO_SMS_FROM } = process.env
  const TWILIO_ACCOUNT_SID = creds?.sid || process.env.TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN = creds?.token || process.env.TWILIO_AUTH_TOKEN
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !(from || TWILIO_SMS_FROM)) {
    console.log('[sendSms] Twilio env vars not set — skipping SMS to', to)
    return { skipped: true }
  }
  const params = new URLSearchParams({ To: to, From: (from || TWILIO_SMS_FROM)!, Body: body })
  params.set('StatusCallback', `${SITE_URL}/api/sms/status`)
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: params,
    }
  )
  const text = await res.text()
  if (!res.ok) {
    console.error('[sendSms] Twilio error:', text)
    let msg = text
    try { const j = JSON.parse(text); msg = j.message || text } catch {}
    return { error: msg }
  }
  try { const j = JSON.parse(text); return { success: true, sid: j.sid, status: j.status } } catch { return { success: true } }
}
