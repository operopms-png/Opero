-- Already applied to project mzjsxrlgnthelwwtfkke (kept for the record).
ALTER FUNCTION public.owner_profiles_fill_business_id() SET search_path = public;
-- Trigger-only function: nobody needs to call it directly
REVOKE EXECUTE ON FUNCTION public.owner_profiles_guard_self_edit() FROM PUBLIC, anon, authenticated;
