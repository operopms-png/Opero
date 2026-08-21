// Sends WhatsApp messages via Twilio. Requires TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM (a Twilio-approved WhatsApp
// sender, e.g. whatsapp:+14155238886) in Netlify env vars. If they're not
// set, this logs and returns without throwing.
//
// Note: outside a 24-hour window since the customer last messaged you,
// WhatsApp requires a pre-approved message template rather than free text.
// `body` should be plain text for in-window replies; for template sends,
// pass the approved template's rendered text here once templates are set
// up in the Twilio console.
export async function sendWhatsapp(to: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log('[sendWhatsapp] Twilio env vars not set — skipping WhatsApp to', to)
    return { skipped: true }
  }
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const params = new URLSearchParams({ To: toAddr, From: TWILIO_WHATSAPP_FROM, Body: body })
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
    console.error('[sendWhatsapp] Twilio error:', err)
    return { error: err }
  }
  return { success: true }
}
