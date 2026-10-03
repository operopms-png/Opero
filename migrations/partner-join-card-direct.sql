-- Partner sign-up: card payments straight to the portal's own Stripe account (no Stripe Connect needed).
alter table public.partner_join_links add column if not exists card_direct boolean not null default false;
update public.partner_join_links set card_direct = true where slug = 'sangsters';
create or replace function public.public_join_link(p_slug text)
 returns json language sql stable security definer set search_path to 'public' as $function$
  select json_build_object(
    'slug', l.slug, 'headline', l.headline, 'blurb', l.blurb, 'fee_gbp', l.fee_gbp,
    'card_enabled', l.card_direct or coalesce((select s.stripe_connect_onboarded and s.stripe_connect_account_id is not null from subscriptions s where s.user_id = l.business_id limit 1), false),
    'bank_enabled', (l.bank_sort_code is not null and l.bank_account_number is not null)
  )
  from partner_join_links l where l.slug = lower(p_slug) and l.active limit 1
$function$;
