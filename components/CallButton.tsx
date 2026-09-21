'use client'

// Drop-in click-to-call button. Fires the global 'opero:call' event that
// components/Softphone.tsx (mounted once in app/layout.tsx) listens for
// -- keeps every contact/tenant/landlord list from needing its own
// Twilio Device wiring, just this one small trigger.
export default function CallButton({ phone, name, contactId, size = 14 }: { phone?: string | null; name?: string; contactId?: string; size?: number }) {
  if (!phone) return null
  return (
    <button
      onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('opero:call', { detail: { phone, name, contactId } })) }}
      title={`Call ${name || phone}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B4AFF', fontSize: size, padding: 2, lineHeight: 1 }}
    >📞</button>
  )
}
