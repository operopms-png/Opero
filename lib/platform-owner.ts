// The platform owner: the Novourq team's own login. Tabs marked ownerOnly in
// lib/staffHubs.ts show only to these emails. Client companies' admins (and
// everyone on their teams) never see them, and cannot be granted them in Team
// Management. An email address is not a secret, so it lives here in code.
// No 'use client' and no imports, so server routes can use it too.

export const PLATFORM_OWNER_EMAILS = ['admin@thenovourq.com']

export function isPlatformOwnerEmail(email?: string | null) {
  return !!email && PLATFORM_OWNER_EMAILS.includes(email.trim().toLowerCase())
}
