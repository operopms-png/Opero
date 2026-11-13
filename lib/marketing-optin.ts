// Marketing opt-in helpers: the unsubscribe link every marketing email carries, and the List-Unsubscribe headers.
import { SITE_URL, BRAND_LOGO, BRAND_NAME } from '@/lib/brand'

export const unsubUrl = (token: string) => `${SITE_URL}/api/public/unsubscribe?t=${encodeURIComponent(token)}`

export const unsubHeaders = (token: string) => ({
  'List-Unsubscribe': `<${unsubUrl(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

export const unsubFooterHtml = (token: string) =>
  `<p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7590;margin-top:24px;border-top:1px solid #e4e9f4;padding-top:12px">You are receiving this because you asked to hear from us by email. <a href="${unsubUrl(token)}" style="color:#1A2C5E">Unsubscribe</a> at any time.</p>`

export const unsubFooterText = (token: string) => `\n\nYou are receiving this because you asked to hear from us by email. Unsubscribe: ${unsubUrl(token)}`

// The logo and name at the top of NOVOURQ's own marketing emails (email-safe table layout).
export const logoHeaderHtml = () =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:collapse"><tr><td style="padding:0 12px 0 0;vertical-align:middle"><img src="${SITE_URL}${BRAND_LOGO}" alt="${BRAND_NAME}" width="52" height="52" style="display:block;border:0;border-radius:8px"></td><td style="vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:.06em;color:#1A2C5E">${BRAND_NAME}</td></tr></table>`
