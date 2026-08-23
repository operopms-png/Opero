// Sends transactional email via Resend. Requires RESEND_API_KEY in
// Netlify env vars. If it's not set, this logs and returns without
// throwing — so notifications still work in-app even before email
// is wired up.
export async function sendEmail(to: string, subject: string, html: string, replyTo?: string, from?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[sendEmail] RESEND_API_KEY not set — skipping email to', to)
    return { skipped: true }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: from || 'Opero <notifications@helloopero.com>',
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[sendEmail] Resend error:', err)
    return { error: err }
  }
  const data = await res.json()
  return { success: true, id: data.id as string | undefined }
}

