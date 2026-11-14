alter table public.subscriptions add column if not exists call_minutes_limit integer; -- null or 0 = group/video calls off for that company; owner company is unlimited
