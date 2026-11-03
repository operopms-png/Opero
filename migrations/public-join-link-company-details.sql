-- Partner sign-up page shows the client's own company name and contact lines instead of fixed Sangsters text.
CREATE OR REPLACE FUNCTION public.public_join_link(p_slug text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object(
    'slug', l.slug, 'headline', l.headline, 'blurb', l.blurb, 'fee_gbp', l.fee_gbp,
    'card_enabled', l.card_direct or coalesce((select s.stripe_connect_onboarded and s.stripe_connect_account_id is not null from subscriptions s where s.user_id = l.business_id limit 1), false),
    'bank_enabled', (l.bank_sort_code is not null and l.bank_account_number is not null),
    'company', nullif(trim((select i.company_name from invoice_settings i where i.business_id = l.business_id)), ''),
    'contact_lines', nullif(trim((select i.contact_lines from invoice_settings i where i.business_id = l.business_id)), '')
  )
  from partner_join_links l where l.slug = lower(p_slug) and l.active limit 1
$function$;
