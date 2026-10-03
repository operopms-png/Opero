-- Deal Analyser AI verdict: break-even can't be worked out for every deal (e.g. one that loses money), so allow it to be empty.
alter table public.deal_analyses alter column break_even drop not null;
