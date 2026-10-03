-- sidebar_counts(): adds approvals, compliance, arrears and announcements, and
-- counts unread texts in the Inbox badge.
CREATE OR REPLACE FUNCTION public.sidebar_counts()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  biz uuid := public.current_business_id();
  em text := lower(auth.jwt() ->> 'email');
  closed text[] := array['resolved','completed','complete','closed','done','cancelled','canceled','fixed'];
  since timestamptz := now() - interval '24 hours';
  res json;
begin
  if biz is null then
    if auth.uid() is not null and exists (select 1 from owner_profiles op where op.user_id = auth.uid()) then
      return json_build_object('partners',
        (select count(*) from notifications n where n.user_id = auth.uid() and not coalesce(n.read, false) and n.type in ('broadcast','opportunity')));
    end if;
    return '{}'::json;
  end if;
  select json_build_object(
    'str',
        (select count(*) from bookings b join properties p on p.id = b.property_id
          where p.user_id = biz and b.created_at > since and coalesce(lower(b.status),'') <> 'cancelled' and b.check_out >= current_date)
      + (select count(*) from str_guest_messages m where m.user_id = biz and m.created_at > since and lower(coalesce(m.sender,'')) = 'guest')
      + (select count(*) from guest_messages m where m.user_id = biz and m.created_at > since and lower(coalesce(m.sender,'')) = 'guest')
      + (select count(*) from cleaning_tasks c join properties p on p.id = c.property_id
          where p.user_id = biz and c.scheduled_date <= current_date and not (lower(coalesce(c.status,'')) = any(closed))),
    'pm',
        (select count(*) from pm_rent_payments r where r.user_id = biz and lower(coalesce(r.status,'')) <> 'paid' and r.due_date < current_date)
      + (select count(*) from pm_maintenance m where m.user_id = biz and not (lower(coalesce(m.status,'')) = any(closed)))
      + (select count(*) from pm_landlord_messages m join pm_landlords l on l.id = m.landlord_id
          where l.user_id = biz and m.created_at > since and lower(coalesce(m.sender,'')) = 'landlord'),
    'estate',
        (select count(*) from estate_rent_schedules r where r.user_id = biz and lower(coalesce(r.status,'')) = 'overdue')
      + (select count(*) from estate_maintenance m where m.user_id = biz and not (lower(coalesce(m.status,'')) = any(closed)))
      + (select count(*) from estate_viewings v where v.user_id = biz and v.scheduled_at::date = current_date and not (lower(coalesce(v.status,'')) = any(closed)))
      + (select count(*) from estate_tenant_messages m join estate_tenants t on t.id = m.tenant_id
          where t.user_id = biz and m.created_at > since and lower(coalesce(m.sender,'')) = 'tenant')
      + (select count(*) from estate_landlord_messages m join estate_landlords l on l.id = m.landlord_id
          where l.user_id = biz and m.created_at > since and lower(coalesce(m.sender,'')) = 'landlord'),
    'dev',
        (select count(*) from dev_milestones d where d.user_id = biz and d.due_date < current_date and not (lower(coalesce(d.status,'')) = any(closed))),
    'partners',
        (select count(*) from partner_signups s where s.business_id = biz and s.status = 'pending' and s.payment_method = 'bank' and s.marked_sent_at is not null),
    'meetings',
        (select count(*) from meetings m where m.user_id = biz and m.scheduled_at::date = current_date and not (lower(coalesce(m.status,'')) = any(closed)))
      + (select count(*) from meetings m where m.user_id = biz and m.status = 'requested'),
    'listings',
        (select count(*) from estate_viewings v where v.user_id = biz and v.status = 'Requested'),
    'inbox',
        (select count(*) from staff_messages sm
           join staff_conversation_members cm on cm.conversation_id = sm.conversation_id and lower(cm.member_email) = em
          where lower(coalesce(sm.sender_email,'')) <> em and sm.created_at > coalesce(cm.last_read_at, cm.created_at))
      + (select count(distinct s.contact_phone) from sms_messages s where s.business_id = biz and s.sender = 'contact' and s.read_at is null),
    'maintenance',
        (select count(*) from maintenance_tickets t join properties p on p.id = t.property_id
          where p.user_id = biz and not (lower(coalesce(t.status,'')) = any(closed)))
      + (select count(*) from pm_maintenance m where m.user_id = biz and not (lower(coalesce(m.status,'')) = any(closed)))
      + (select count(*) from estate_maintenance m where m.user_id = biz and not (lower(coalesce(m.status,'')) = any(closed))),
    'crm',
        (select count(*) from crm_followups f where f.user_id = biz and f.due_date <= current_date and not (lower(coalesce(f.status,'')) = any(closed))),
    'sales',
        (select count(*) from sales_leads l where l.user_id = biz and lower(coalesce(l.status,'')) = 'new'),
    'applications',
        (select count(*) from job_applications j where j.user_id = biz and lower(coalesce(j.stage,'')) in ('new','applied')),
    'hr',
        (select count(*) from hr_requests h where h.user_id = biz and lower(coalesce(h.status,'')) = 'pending'),
    'webchat',
        (select count(*) from website_chats w where w.business_id = biz and not coalesce(w.staff_read, false) and coalesce(w.message_count,0) > 0),
    'tasks',
        (select count(*) from staff_tasks t where t.user_id = biz and t.due_date <= current_date and not (lower(coalesce(t.status,'')) = any(closed))),
    'approvals',
        (select count(*) from approvals a where a.business_id = biz and a.status = 'pending'),
    'arrears',
        (select count(*) from pm_rent_payments r where r.user_id = biz and lower(coalesce(r.status,'')) <> 'paid' and r.due_date < current_date)
      + (select count(*) from estate_rent_schedules r where r.user_id = biz and lower(coalesce(r.status,'')) = 'overdue'),
    'compliance',
        (select count(*) from str_compliance c where c.user_id = biz and c.expiry_date <= current_date + 30)
      + (select count(*) from pm_compliance c where c.user_id = biz and c.expiry_date <= current_date + 30)
      + (select count(*) from estate_compliance c where c.user_id = biz and c.expiry_date <= current_date + 30)
      + (select count(*) from dev_compliance c where c.user_id = biz and c.expiry_date <= current_date + 30),
    'announcements',
        (select count(*) from announcements a where a.business_id = biz and a.pinned and (a.expires_on is null or a.expires_on >= current_date)
           and not exists (select 1 from announcement_reads r where r.announcement_id = a.id and r.user_email = em))
  ) into res;
  return res;
end $function$;
