-- Contacts (leads) get "Lead status" (New/Contacted/Qualified/Won/Lost) and "Deal value".
-- A lead set to Won logs a Deal Closed win in Staff Performance for each Agent on it,
-- with the deal value and today's date; editing the value on the win updates the lead.
-- Applied live as migration "crm_leads_won_to_performance" (extends crm_sync_deal_win,
-- crm_deal_to_performance and perf_win_value_to_deal to the Contacts board).

do $$ declare b record; pos int; begin
  for b in select id, user_id from crm_boards where kind = 'contacts' loop
    if not exists (select 1 from crm_board_columns where board_id = b.id and key = 'lead_status') then
      select coalesce((select position from crm_board_columns where board_id = b.id and key = 'contact_type'), 3) into pos;
      update crm_board_columns set position = position + 2 where board_id = b.id and position > pos;
      insert into crm_board_columns (board_id, user_id, key, title, type, settings, position, width) values
        (b.id, b.user_id, 'lead_status', 'Lead status', 'status', '{"labels":[{"id":"s1","color":"#C4C4C4","label":"New"},{"id":"s2","color":"#579BFC","label":"Contacted"},{"id":"s3","color":"#FDAB3D","label":"Qualified"},{"id":"s4","color":"#00C875","label":"Won"},{"id":"s5","color":"#DF2F4A","label":"Lost"}]}', pos + 1, 140),
        (b.id, b.user_id, 'deal_value', 'Deal value', 'number', '{"sum": true, "currency": "£"}', pos + 2, 130);
    end if;
  end loop;
end $$;
-- Function bodies: see editable-win-value-syncs-to-deal.sql, with crm_sync_deal_win
-- choosing (status, price) for Transactions and (lead_status, deal_value) for Contacts,
-- crm_deal_to_performance firing for both boards, and perf_win_value_to_deal writing
-- to deal_value for Contacts.
