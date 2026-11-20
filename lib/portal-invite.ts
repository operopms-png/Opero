// Emails a new landlord or tenant a link to set their own password for their portal.
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import { docSettings } from '@/lib/documents'

export async function sendPortalInvite(opts: { email: string; name?: string | null; businessId?: string | null; who: 'landlord' | 'tenant' }): Promise<boolean> {
  try {
    const co = await docSettings(opts.businessId || '')
    const link = await serviceClient.auth.admin.generateLink({ type: 'recovery', email: opts.email, options: { redirectTo: `${SITE_URL}/reset-password` } })
    const url = link.data?.properties?.action_link
    if (!url) return false
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const what = opts.who === 'landlord' ? 'See your properties, payments, receipts and documents in one place.' : 'Pay and track your rent, report maintenance and find your documents in one place.'
    await sendEmail(opts.email, `Your ${co.company_name} ${opts.who} portal: set your password`, `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1D2433"><h2 style="margin:0 0 12px;color:#182D5E">Welcome to ${esc(co.company_name)}</h2><p>Hello ${esc(opts.name || '')},</p><p>Your ${opts.who} portal is ready. ${what} Set your password to sign in.</p><p style="margin:20px 0"><a href="${url}" style="background:#182D5E;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">Set my password</a></p><p style="color:#667085;font-size:13px">After that, sign in any time at ${SITE_URL.replace(/^https?:\/\//, '')}/login. If you did not expect this email, you can ignore it.</p></div>`, co.reply_to || undefined)
    return true
  } catch { return false }
}
