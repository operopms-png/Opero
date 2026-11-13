-- Allow Marketing and Partners groups on Portal Access
alter table client_portals drop constraint if exists client_portals_module_check;
alter table client_portals add constraint client_portals_module_check
  check (module = any (array['str','pm','ea','partners','dev','marketing','staff','other']));
