-- Compliance and documents are already mirrored by the older pe_sync_trg trigger
-- (pm_estate_links / pm_estate_sync_pairs). module-sync triggers for these four tables
-- were removed to avoid duplicate copies.
drop trigger if exists mirror_ins_pm on pm_compliance;
drop trigger if exists mirror_ins_ea on estate_compliance;
drop trigger if exists mirror_del_pm on pm_compliance;
drop trigger if exists mirror_del_ea on estate_compliance;
drop trigger if exists sync_pm on pm_compliance;
drop trigger if exists sync_ea on estate_compliance;
drop trigger if exists mirror_ins_pm on pm_documents;
drop trigger if exists mirror_ins_ea on estate_documents;
drop trigger if exists mirror_del_pm on pm_documents;
drop trigger if exists mirror_del_ea on estate_documents;
drop trigger if exists sync_pm on pm_documents;
drop trigger if exists sync_ea on estate_documents;
delete from module_links where kind in ('compliance','document');
