'use client'
import { supabase } from '@/lib/supabase'

// Tell the AI receptionist a tenant/landlord just sent a portal message.
// Resolves once it has replied (or decided not to), so the caller can
// reload the thread. Never throws — the message is already saved.
export async function pingReceptionist(kind: 'pm_tenant' | 'pm_landlord' | 'estate_tenant' | 'estate_landlord', personId: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/receptionist/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ kind, person_id: personId }) })
    const d = await res.json().catch(() => ({}))
    return !!d.replied
  } catch { return false }
}
