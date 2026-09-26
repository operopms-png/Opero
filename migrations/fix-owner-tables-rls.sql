-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- SECURITY FIX: owner_* tables (investors) were open to ANY logged-in user.
-- Every policy was just "auth.uid() IS NOT NULL", so an investor, tenant,
-- landlord or another Opero customer could read and edit every investor's
-- profile, statements, finance records, messages and banking details.
--
-- After this:
--   Investors  — see only their own profile, statements, finance, messages
--                and banking; can edit only their own contact details and
--                banking, and send messages as themselves.
--   Staff      — the business owner and their team (not 'Partner' rows) see
--                and manage only their own business's investors.
--   Everyone else (tenants, landlords, other businesses) — nothing.
-- Server routes use the service role and are unaffected.

-- 1. Tie each investor to the business that manages them
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS custom_modules TEXT[];
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS partner_paid_at TIMESTAMPTZ;
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS partner_payment_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_owner_profiles_business_id ON owner_profiles(business_id);

UPDATE owner_profiles o
SET business_id = (SELECT p.user_id FROM properties p WHERE p.id = ANY(o.property_ids) LIMIT 1)
WHERE o.business_id IS NULL AND COALESCE(array_length(o.property_ids, 1), 0) > 0;

CREATE OR REPLACE FUNCTION owner_profiles_fill_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.business_id IS NULL AND COALESCE(array_length(NEW.property_ids, 1), 0) > 0 THEN
    SELECT p.user_id INTO NEW.business_id FROM properties p WHERE p.id = ANY(NEW.property_ids) LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_profiles_fill_business_id ON owner_profiles;
CREATE TRIGGER trg_owner_profiles_fill_business_id
  BEFORE INSERT OR UPDATE OF property_ids ON owner_profiles
  FOR EACH ROW EXECUTE FUNCTION owner_profiles_fill_business_id();

-- 2. Helpers
-- Real staff of a business: the business owner, or a team member who isn't a Partner
CREATE OR REPLACE FUNCTION is_owner_staff(biz UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT biz IS NOT NULL AND (
    auth.uid() = biz
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = biz AND tm.email = (auth.jwt() ->> 'email') AND COALESCE(tm.role, '') <> 'Partner'
    )
  )
$$;

-- Is this owner_id the signed-in investor themself?
CREATE OR REPLACE FUNCTION is_own_owner(oid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM owner_profiles o WHERE o.id = oid AND o.user_id = auth.uid())
$$;

-- Is the signed-in user staff of the business this owner_id belongs to?
CREATE OR REPLACE FUNCTION is_owner_business_staff(oid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM owner_profiles o WHERE o.id = oid AND is_owner_staff(o.business_id))
$$;

-- 3. Investors may only change their own contact details, never
--    amounts, properties, access, business or membership status
CREATE OR REPLACE FUNCTION owner_profiles_guard_self_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id AND NOT is_owner_staff(OLD.business_id) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.business_id IS DISTINCT FROM OLD.business_id
      OR NEW.invested IS DISTINCT FROM OLD.invested
      OR NEW.property_ids IS DISTINCT FROM OLD.property_ids
      OR NEW.split_percentage IS DISTINCT FROM OLD.split_percentage
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.custom_modules IS DISTINCT FROM OLD.custom_modules
      OR NEW.partner_paid_at IS DISTINCT FROM OLD.partner_paid_at
      OR NEW.partner_payment_ref IS DISTINCT FROM OLD.partner_payment_ref THEN
      RAISE EXCEPTION 'You can only update your own contact details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_profiles_guard_self_edit ON owner_profiles;
CREATE TRIGGER trg_owner_profiles_guard_self_edit
  BEFORE UPDATE ON owner_profiles
  FOR EACH ROW EXECUTE FUNCTION owner_profiles_guard_self_edit();

-- 4. Replace the open policies
ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_contact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_profiles_policy ON owner_profiles;
DROP POLICY IF EXISTS "Owners see own profile" ON owner_profiles;
DROP POLICY IF EXISTS owner_profiles_select ON owner_profiles;
DROP POLICY IF EXISTS owner_profiles_update ON owner_profiles;
DROP POLICY IF EXISTS owner_profiles_insert ON owner_profiles;
DROP POLICY IF EXISTS owner_profiles_delete ON owner_profiles;
CREATE POLICY owner_profiles_select ON owner_profiles FOR SELECT
  USING (user_id = auth.uid() OR is_owner_staff(business_id));
CREATE POLICY owner_profiles_update ON owner_profiles FOR UPDATE
  USING (user_id = auth.uid() OR is_owner_staff(business_id))
  WITH CHECK (user_id = auth.uid() OR is_owner_staff(business_id));
CREATE POLICY owner_profiles_insert ON owner_profiles FOR INSERT
  WITH CHECK (is_owner_staff(business_id));
CREATE POLICY owner_profiles_delete ON owner_profiles FOR DELETE
  USING (is_owner_staff(business_id));

DROP POLICY IF EXISTS owner_statements_policy ON owner_statements;
DROP POLICY IF EXISTS "Owners see own statements" ON owner_statements;
DROP POLICY IF EXISTS owner_statements_select ON owner_statements;
DROP POLICY IF EXISTS owner_statements_staff ON owner_statements;
CREATE POLICY owner_statements_select ON owner_statements FOR SELECT
  USING (is_own_owner(owner_id) OR is_owner_business_staff(owner_id));
CREATE POLICY owner_statements_staff ON owner_statements FOR ALL
  USING (is_owner_business_staff(owner_id))
  WITH CHECK (is_owner_business_staff(owner_id));

DROP POLICY IF EXISTS owner_finance_policy ON owner_finance;
DROP POLICY IF EXISTS owner_finance_select ON owner_finance;
DROP POLICY IF EXISTS owner_finance_staff ON owner_finance;
CREATE POLICY owner_finance_select ON owner_finance FOR SELECT
  USING (is_own_owner(owner_id) OR is_owner_business_staff(owner_id));
CREATE POLICY owner_finance_staff ON owner_finance FOR ALL
  USING (is_owner_business_staff(owner_id))
  WITH CHECK (is_owner_business_staff(owner_id));

DROP POLICY IF EXISTS owner_messages_policy ON owner_messages;
DROP POLICY IF EXISTS owner_messages_select ON owner_messages;
DROP POLICY IF EXISTS owner_messages_owner_send ON owner_messages;
DROP POLICY IF EXISTS owner_messages_staff ON owner_messages;
CREATE POLICY owner_messages_select ON owner_messages FOR SELECT
  USING (is_own_owner(owner_id) OR is_owner_business_staff(owner_id));
CREATE POLICY owner_messages_owner_send ON owner_messages FOR INSERT
  WITH CHECK (is_own_owner(owner_id) AND sender = 'owner');
CREATE POLICY owner_messages_staff ON owner_messages FOR ALL
  USING (is_owner_business_staff(owner_id))
  WITH CHECK (is_owner_business_staff(owner_id));

DROP POLICY IF EXISTS owner_contact_policy ON owner_contact;
DROP POLICY IF EXISTS owner_contact_own ON owner_contact;
DROP POLICY IF EXISTS owner_contact_staff ON owner_contact;
CREATE POLICY owner_contact_own ON owner_contact FOR ALL
  USING (is_own_owner(owner_id))
  WITH CHECK (is_own_owner(owner_id));
CREATE POLICY owner_contact_staff ON owner_contact FOR ALL
  USING (is_owner_business_staff(owner_id))
  WITH CHECK (is_owner_business_staff(owner_id));

NOTIFY pgrst, 'reload schema';
