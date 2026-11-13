// Single source for the portal's name, logo and addresses.
// SITE_URL: set NEXT_PUBLIC_SITE_URL in Netlify to override.
// EMAIL_DOMAIN: the domain transactional/marketing email is sent from and
// replies are routed to. Stays on the currently verified Resend domain until
// sangstersgroup.com is verified in Resend, then set EMAIL_DOMAIN in Netlify.
export const BRAND_NAME = 'NOVOURQ'
export const BRAND_LOGO = '/logo-512.png'
// The old Opero address (helloopero.com) may still be set in Netlify; never use it.
const ENV_SITE = process.env.NEXT_PUBLIC_SITE_URL || ''
export const SITE_URL = (ENV_SITE && !/helloopero/i.test(ENV_SITE) ? ENV_SITE : 'https://app.thenovourq.com').replace(/\/$/, '')
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '')
export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'helloopero.com'
export const EMAIL_FROM = `${BRAND_NAME} <notifications@${EMAIL_DOMAIN}>`
// NOVOURQ's own marketing emails come from here. No reply address: we contact people on their preferred email.
export const MARKETING_FROM = `${BRAND_NAME} <noreply@thenovourq.com>`
export const CONTACT_EMAIL = 'admin@thenovourq.com'
