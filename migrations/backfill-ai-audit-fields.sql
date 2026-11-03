-- Fills reason and authorised_by on older AI records. Values are inferred from what was stored, and say so.
update ai_pending_actions set
  authority = case when decided_by_name = 'Novourq Cloud AI' then 'auto' when decided_by_name is not null then 'person' else authority end,
  authorised_by = case
    when decided_by_name = 'Novourq Cloud AI' then 'Account admin (automatic sending was on by default; recorded before authoriser tracking began)'
    when decided_by_name is not null then decided_by_name
    else authorised_by end,
  reason = coalesce(reason, nullif(context->>'summary',''), agent_key || ' proposed this: ' || coalesce(title,''))
where reason is null or authorised_by is null;

update ai_activity_log set
  reason = coalesce(reason, nullif(notes,''), 'Recorded before reasons were saved'),
  authorised_by = coalesce(authorised_by,
    case
      when action like 'Sent automatically:%' then 'Account admin (automatic sending was on by default; recorded before authoriser tracking began)'
      when action ~ ' approved: ' then split_part(action, ' approved: ', 1)
      when action like 'Created task:%' then 'Standing rule: the AI may create tasks'
      else 'Standing rule: the skill was switched on by the account admin'
    end)
where reason is null or authorised_by is null;
