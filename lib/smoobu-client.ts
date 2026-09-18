// Low-level Smoobu API client -- shared by lib/sync-smoobu.ts (the
// sync job) and lib/ai-guest-receptionist.ts (auto-reply), so neither
// has to import from the other and create a circular dependency.
const SMOOBU_BASE = 'https://login.smoobu.com/api'

export async function smoobuFetch(apiKey: string, path: string) {
  const res = await fetch(`${SMOOBU_BASE}${path}`, {
    headers: { 'Api-Key': apiKey, 'Cache-Control': 'no-cache' },
  })
  if (!res.ok) throw new Error(`Smoobu ${path} returned ${res.status}`)
  return res.json()
}

export async function sendSmoobuGuestMessage(apiKey: string, smoobuReservationId: string, subject: string | undefined, body: string) {
  const res = await fetch(`${SMOOBU_BASE}/reservations/${smoobuReservationId}/messages/send-message-to-guest`, {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: subject || undefined, messageBody: body }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `Smoobu send failed with ${res.status}`)
  }
  return true
}
