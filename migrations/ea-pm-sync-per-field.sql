-- Linked Estate Agency <-> Property Management properties: when one side
-- changes, copy only the fields that actually changed (name, address,
-- bedrooms, bathrooms, photos) — so adding photos no longer overwrites the
-- other side's name. Applied to production on 30 Sep 2026.
create or replace function public.sync_estate_property() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if pg_trigger_depth() > 1 then return coalesce(NEW, OLD); end if;
  if TG_OP = 'INSERT' then
    if NEW.pm_property_id is null then
      insert into pm_properties (user_id, name, address, bedrooms, bathrooms, image_urls, status, estate_property_id)
      values (NEW.user_id, NEW.name, NEW.address, NEW.bedrooms, NEW.bathrooms, NEW.image_urls, 'active', NEW.id)
      returning id into NEW.pm_property_id;
    end if;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if NEW.pm_property_id is not null and (NEW.name, NEW.address, NEW.bedrooms, NEW.bathrooms, NEW.image_urls) is distinct from (OLD.name, OLD.address, OLD.bedrooms, OLD.bathrooms, OLD.image_urls) then
      update pm_properties set
        name = case when NEW.name is distinct from OLD.name then NEW.name else name end,
        address = case when NEW.address is distinct from OLD.address then NEW.address else address end,
        bedrooms = case when NEW.bedrooms is distinct from OLD.bedrooms then NEW.bedrooms else bedrooms end,
        bathrooms = case when NEW.bathrooms is distinct from OLD.bathrooms then NEW.bathrooms else bathrooms end,
        image_urls = case when NEW.image_urls is distinct from OLD.image_urls then NEW.image_urls else image_urls end
      where id = NEW.pm_property_id;
    end if;
    return NEW;
  else
    update pm_properties set estate_property_id = null where estate_property_id = OLD.id;
    return OLD;
  end if;
end $function$;

create or replace function public.sync_pm_property() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if pg_trigger_depth() > 1 then return coalesce(NEW, OLD); end if;
  if TG_OP = 'INSERT' then
    if NEW.estate_property_id is null then
      insert into estate_properties (user_id, name, address, bedrooms, bathrooms, image_urls, status, pm_property_id)
      values (NEW.user_id, NEW.name, NEW.address, NEW.bedrooms, NEW.bathrooms, NEW.image_urls, 'Available', NEW.id)
      returning id into NEW.estate_property_id;
    end if;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if NEW.estate_property_id is not null and (NEW.name, NEW.address, NEW.bedrooms, NEW.bathrooms, NEW.image_urls) is distinct from (OLD.name, OLD.address, OLD.bedrooms, OLD.bathrooms, OLD.image_urls) then
      update estate_properties set
        name = case when NEW.name is distinct from OLD.name then NEW.name else name end,
        address = case when NEW.address is distinct from OLD.address then NEW.address else address end,
        bedrooms = case when NEW.bedrooms is distinct from OLD.bedrooms then NEW.bedrooms else bedrooms end,
        bathrooms = case when NEW.bathrooms is distinct from OLD.bathrooms then NEW.bathrooms else bathrooms end,
        image_urls = case when NEW.image_urls is distinct from OLD.image_urls then NEW.image_urls else image_urls end
      where id = NEW.estate_property_id;
    end if;
    return NEW;
  else
    update estate_properties set pm_property_id = null where pm_property_id = OLD.id;
    return OLD;
  end if;
end $function$;
