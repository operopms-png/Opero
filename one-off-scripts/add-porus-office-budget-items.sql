-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
-- Creates the "Porus Office" project if it doesn't already exist, then
-- adds all the listed items as budget items. Paid items use the price
-- paid as both Budgeted and Actual; pending items are Budgeted only.
-- The billboard (8,000 JMD) is converted at today's rate (~212.7 JMD/£1) to £37.61.

DO $$
DECLARE
  v_user_id UUID := 'bd780fdd-15e3-4306-8c87-788b23647ee5';
  v_project_id UUID;
BEGIN
  SELECT id INTO v_project_id FROM dev_projects WHERE name = 'Porus Office' AND user_id = v_user_id LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO dev_projects (user_id, name, status)
    VALUES (v_user_id, 'Porus Office', 'active')
    RETURNING id INTO v_project_id;
  END IF;

  INSERT INTO dev_budget_items (user_id, project_id, name, category, budgeted, actual, status) VALUES
    (v_user_id, v_project_id, 'Custom company umbrella', 'marketing', 17.50, 17.50, 'paid'),
    (v_user_id, v_project_id, 'Desktop mic x2 & mic foam', 'other', 53.20, 53.20, 'paid'),
    (v_user_id, v_project_id, 'Professional microphone stand', 'other', 28.46, 28.46, 'paid'),
    (v_user_id, v_project_id, 'Clocking in machine', 'other', 25.18, 25.18, 'paid'),
    (v_user_id, v_project_id, 'Conference room sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'Store room sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'Toilet sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'Manager sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'Director door sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'Staff only sign', 'other', 9.99, 9.99, 'paid'),
    (v_user_id, v_project_id, 'RFID cards', 'other', 7.99, 7.99, 'paid'),
    (v_user_id, v_project_id, 'Meeting display', 'other', 13.15, 13.15, 'paid'),
    (v_user_id, v_project_id, 'Wireless microphone', 'other', 8.99, 8.99, 'paid'),
    (v_user_id, v_project_id, 'Wireless microphone', 'other', 27.64, 27.64, 'paid'),
    (v_user_id, v_project_id, 'Company t-shirt x2', 'marketing', 22.00, 22.00, 'paid'),
    (v_user_id, v_project_id, 'Sangsters stickers', 'marketing', 10.24, 10.24, 'paid'),
    (v_user_id, v_project_id, 'Prize wheel with stand', 'marketing', 25.99, 25.99, 'paid'),
    (v_user_id, v_project_id, 'Sangsters table standing name sign', 'marketing', 20.99, 20.99, 'paid'),
    (v_user_id, v_project_id, 'Doorbell camera', 'other', 26.89, 26.89, 'paid'),
    (v_user_id, v_project_id, 'Office sign billboard (8,000 JMD)', 'marketing', 37.61, 37.61, 'paid'),
    (v_user_id, v_project_id, 'Mini fridge', 'other', 124, 0, 'pending'),
    (v_user_id, v_project_id, 'TV bracket x2', 'other', 124, 0, 'pending'),
    (v_user_id, v_project_id, 'TV for board room 50"', 'other', 229, 0, 'pending');
END $$;
