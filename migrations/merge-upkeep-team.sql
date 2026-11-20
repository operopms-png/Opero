-- Cleaning Team and Maintenance Team become one Upkeep Team (upkeep@thenovourq.com).
UPDATE team_members SET role = 'Upkeep Team'
  WHERE role IN ('Cleaning Team','Maintenance Team','Cleaner','Maintenance','cleaner','maintenance');
UPDATE team_members SET email = 'upkeep@thenovourq.com'
  WHERE lower(email) IN ('cleaningteam@sangstersgroup.com','maintanance@sangstersgroup.com');
UPDATE client_portals SET name = 'Upkeep Portal', url = '/staff-dashboard?team=upkeep'
  WHERE url LIKE '/staff-dashboard?team=cleaning%';
DELETE FROM client_portals WHERE url LIKE '/staff-dashboard?team=maintenance%';
