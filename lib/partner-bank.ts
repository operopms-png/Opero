import { serviceClient } from '@/lib/admin-auth'

// Bank transfer payments for partner memberships.
// Each sign-up gets a short unique reference the partner puts on their
// transfer, so staff can match the payment in their bank app and click
// Confirm in Partners → Investors.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

export function newReference() {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `PTNR-${s}`
}

// Where "payment sent" alerts go: the link's alert email, else the
// business owner's login email.
export async function alertEmailFor(link: { alert_email?: string | null; business_id: string }) {
  if (link.alert_email) return link.alert_email
  const { data } = await serviceClient.auth.admin.getUserById(link.business_id)
  return data?.user?.email ?? null
}

export const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
