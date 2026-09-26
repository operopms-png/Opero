-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).

-- Security-rule helpers: signed-in users only (rules need them); not callable logged-out
REVOKE EXECUTE ON FUNCTION public.is_own_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_business_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_partner_broadcast_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_partner_broadcast_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_conversation_member(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_staff_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_business_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_broadcast_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_broadcast_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_conversation_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_staff_conversation(uuid, uuid) TO authenticated;

-- Existing investors: membership waived (they joined before the £75 fee existed)
UPDATE owner_profiles
SET partner_paid_at = now(), partner_payment_ref = 'Waived — existing investor before membership fee'
WHERE partner_paid_at IS NULL;
