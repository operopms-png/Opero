-- Run in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke). Run each block separately,
-- confirm "Success. No rows returned" after each.
--
-- Result of the Nov 2026 tenant-isolation audit. Verified before writing this:
--   * no policy anywhere uses USING (true) except the intentional system_messages broadcast
--   * no public view bypasses RLS (all use security_invoker or are not exposed)
--   * no RLS policy or view depends on any function revoked below
-- The 48 tables with RLS on and zero policies are deny-all for browser sessions and are only
-- reachable through the API routes (service role) -- safe, left as-is.

-- 1) CRITICAL: partner_payouts had RLS switched OFF, so anyone holding the public anon key
--    could read or edit every client's payout rows. The app only touches it through
--    /api/finance (service role), so owner-only policy changes nothing for users.
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_payouts_owner_read" ON partner_payouts;
CREATE POLICY "partner_payouts_owner_read" ON partner_payouts FOR SELECT USING (auth.uid() = user_id);

-- 2) Internal sync/CRM helper functions were callable by anonymous visitors through
--    /rest/v1/rpc/<name>. pe_create_twin / pe_update_twin / crm_add_sales_boards write data
--    for any user id they are handed. Triggers keep working: Postgres checks EXECUTE only
--    when a trigger is created, not when it fires.
REVOKE EXECUTE ON FUNCTION public.pe_backfill(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_create_twin(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_register(text, text, text, jsonb, text[], jsonb, jsonb, text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_update_twin(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_twin(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_translate(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_add_sales_boards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_sync_deal_win(public.crm_board_items) FROM PUBLIC, anon, authenticated;

-- 3) Trigger functions should never be exposed as RPC endpoints at all.
REVOKE EXECUTE ON FUNCTION public.pe_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pe_sync_core_extra() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_board_items_to_contacts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_contacts_to_board() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deal_to_performance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deals_to_board() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perf_win_value_to_deal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pm_audit_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_estate_property() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_estate_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pm_property() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pm_tenant() FROM PUBLIC, anon, authenticated;

-- 4) Signed-in-only functions: no reason for anonymous visitors to call them.
REVOKE EXECUTE ON FUNCTION public.mark_landlord_statement_viewed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_admin_business_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_landlord_statement_viewed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_business_ids() TO authenticated;

-- 5) Pin search_path on the remaining CRM helper functions (Supabase linter warning).
ALTER FUNCTION public.crm_num SET search_path = public;
ALTER FUNCTION public.crm_first_url SET search_path = public;
ALTER FUNCTION public.crm_board_label_id SET search_path = public;
ALTER FUNCTION public.crm_board_label_text SET search_path = public;
ALTER FUNCTION public.crm_board_col SET search_path = public;
ALTER FUNCTION public.crm_deal_status_label SET search_path = public;
ALTER FUNCTION public.crm_deal_stage_from_label SET search_path = public;
ALTER FUNCTION public.crm_contact_values SET search_path = public;
ALTER FUNCTION public.crm_add_col SET search_path = public;
ALTER FUNCTION public.crm_labels SET search_path = public;
ALTER FUNCTION public.crm_seed_default_boards SET search_path = public;
ALTER FUNCTION public.crm_item_set_value SET search_path = public;

NOTIFY pgrst, 'reload schema';

-- NOT changed (needs your call): the anon INSERT policy "public_career_applications_insert" on
-- crm_contacts only checks source = 'sangstersgroup-careers', so an anonymous caller can insert
-- a contact against ANY user_id. Tighten it to your own user id once the careers form is
-- confirmed to send it.
-- Also switch on "Leaked password protection" in Supabase -> Authentication -> Providers -> Email.
