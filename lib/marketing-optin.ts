// Marketing opt-in helpers: the unsubscribe link every marketing email carries, and the List-Unsubscribe headers.
import { SITE_URL } from '@/lib/brand'

export const unsubUrl = (token: string) => `${SITE_URL}/api/public/unsubscribe?t=${encodeURIComponent(token)}`

export const unsubHeaders = (token: string) => ({
  'List-Unsubscribe': `<${unsubUrl(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

export const unsubFooterHtml = (token: string) =>
  `<p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7590;margin-top:24px;border-top:1px solid #e4e9f4;padding-top:12px">You are receiving this because you asked to hear from us by email. <a href="${unsubUrl(token)}" style="color:#1A2C5E">Unsubscribe</a> at any time.</p>`

export const unsubFooterText = (token: string) => `\n\nYou are receiving this because you asked to hear from us by email. Unsubscribe: ${unsubUrl(token)}`
