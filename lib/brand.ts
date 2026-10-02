// Single source for the portal's name, logo and addresses.
// SITE_URL: set NEXT_PUBLIC_SITE_URL in Netlify to override.
// EMAIL_DOMAIN: the domain transactional/marketing email is sent from and
// replies are routed to. Stays on the currently verified Resend domain until
// sangstersgroup.com is verified in Resend, then set EMAIL_DOMAIN in Netlify.
export const BRAND_NAME = 'Sangsters'
export const BRAND_LOGO = '/logo.PNG'
// The old Opero address (helloopero.com) may still be set in Netlify; never use it.
const ENV_SITE = process.env.NEXT_PUBLIC_SITE_URL || ''
export const SITE_URL = (ENV_SITE && !/helloopero/i.test(ENV_SITE) ? ENV_SITE : 'https://app.sangstersgroup.com').replace(/\/$/, '')
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '')
export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'helloopero.com'
export const EMAIL_FROM = `${BRAND_NAME} <notifications@${EMAIL_DOMAIN}>`
export const CONTACT_EMAIL = 'contact.us@sangstersgroup.com'
