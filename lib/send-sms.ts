// Sends SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
// TWILIO_SMS_FROM (a Twilio phone number, e.g. +18005550123) in Netlify env
// vars. If they're not set, this logs and returns without throwing — so the
// rest of the CRM keeps working even before SMS is wired up.
export async function sendSms(to: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_SMS_FROM) {
    console.log('[sendSms] Twilio env vars not set — skipping SMS to', to)
    return { skipped: true }
  }
  const params = new URLSearchParams({ To: to, From: TWILIO_SMS_FROM, Body: body })
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
  if (!res.ok) {
    const err = await res.text()
    console.error('[sendSms] Twilio error:', err)
    return { error: err }
  }
  return { success: true }
}
