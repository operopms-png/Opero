import { serviceClient } from '@/lib/admin-auth'

// Switches a partner on once their one-time membership fee is paid:
//  - lifts the ban placed on logins created at /join/<slug>
//  - creates their owner_profiles row (or updates it) marked paid
//  - marks the partner_signups row paid
//  - records who confirmed it and when (audit trail): a staff member for bank
//    transfers, or 'Stripe (card payment)' for card payments
// Called by the Stripe webhook, /api/partner-join/status (which asks Stripe
// directly, in case the webhook is slow) and staff Confirm. Safe to call
// repeatedly: only the call that moves the row out of 'pending' does the work.
export async function activatePartnerSignup(signupId: string, paymentRef: string, confirmedBy: string) {
  const now = new Date().toISOString()
  const { data: claimed } = await serviceClient
    .from('partner_signups')
    .update({ status: 'paid', paid_at: now, confirmed_by: confirmedBy, confirmed_at: now })
    .eq('id', signupId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()
  if (!claimed) return false

  try {
    if (claimed.user_id) {
      await serviceClient.auth.admin.updateUserById(claimed.user_id, { ban_duration: 'none' })
    }
    const paidFields = { partner_paid_at: now, partner_payment_ref: paymentRef, partner_confirmed_by: confirmedBy, partner_confirmed_at: now }

    let profileId: string | null = claimed.owner_profile_id ?? null
    if (!profileId && claimed.user_id) {
      const { data: existing } = await serviceClient.from('owner_profiles').select('id').eq('user_id', claimed.user_id).maybeSingle()
      profileId = existing?.id ?? null
    }
    if (profileId) {
      const { error } = await serviceClient.from('owner_profiles').update(paidFields).eq('id', profileId)
      if (error) throw error
    } else {
      const { data: created, error } = await serviceClient.from('owner_profiles').insert({
        user_id: claimed.user_id,
        business_id: claimed.business_id,
        name: claimed.name,
        email: claimed.email,
        phone: claimed.phone,
        property_ids: [],
        split_percentage: 60,
        ...paidFields,
      }).select('id').single()
      if (error) throw error
      profileId = created?.id ?? null
    }
    await serviceClient.from('partner_signups').update({ owner_profile_id: profileId }).eq('id', signupId)
    return true
  } catch (err) {
    // Put it back so the next webhook retry / status check can try again
    console.error('[partner-activation]', err)
    await serviceClient.from('partner_signups').update({ status: 'pending', paid_at: null, confirmed_by: null, confirmed_at: null }).eq('id', signupId)
    throw err
  }
}

// "Name (email)" for the staff member doing an action, for audit trails.
export async function staffLabel(userId: string, email: string | null) {
  if (email) {
    const { data: tm } = await serviceClient.from('team_members').select('name').ilike('email', email).limit(1).maybeSingle()
    if (tm?.name) return `${tm.name} (${email})`
  }
  const { data } = await serviceClient.auth.admin.getUserById(userId)
  const meta: any = data?.user?.user_metadata ?? {}
  const name = meta.name || [meta.first_name, meta.last_name].filter(Boolean).join(' ')
  const mail = email ?? data?.user?.email ?? null
  return name ? `${name}${mail ? ` (${mail})` : ''}` : (mail ?? 'Staff')
}
