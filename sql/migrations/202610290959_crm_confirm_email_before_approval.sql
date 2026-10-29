-- Confirmation is required before activating a CRM signup, even if Auth email confirmations are disabled globally.
begin;
create or replace function public.approve_access_request(p_request_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $fn$
declare
 v_actor_role text;
 v_role text;
 v_request public.access_requests%rowtype;
 v_existing_role text;
begin
 if not public.can_manage_access() then
   raise exception 'You do not have permission to approve access.';
 end if;
 v_actor_role:=public.current_orbit_role();
 v_role:=public.normalize_access_role(p_role);
 if v_role is null then raise exception 'Invalid role.'; end if;
 if v_actor_role<>'super_admin' and v_role='super_admin' then
   raise exception 'Only a Super Admin can assign the Super Admin role.';
 end if;

 select * into v_request from public.access_requests
 where id=p_request_id for update;
 if not found then raise exception 'Access request not found.'; end if;

 if v_request.requested_role='Team Member' then
   if v_request.status<>'Pending' then
     raise exception 'This request has already been reviewed.';
   end if;
   if v_role='super_admin' then
     raise exception 'Use the separate Superadmin invitation process for elevated access.';
   end if;
   if v_request.auth_user_id is null or not exists(
     select 1 from auth.users au where au.id=v_request.auth_user_id
       and lower(trim(au.email))=lower(trim(v_request.email))
   ) then
     raise exception 'The applicant must create a verified password account before approval.';
   end if;
   if not exists(
     select 1 from public.user_profiles up
     where up.id=v_request.auth_user_id and up.is_active=false
       and lower(trim(up.email))=lower(trim(v_request.email))
   ) then
     raise exception 'The applicant profile is missing or is not pending.';
   end if;
   if not exists (
     select 1 from auth.users au where au.id=v_request.auth_user_id
       and au.email_confirmed_at is not null
   ) then
     raise exception 'Applicant must confirm their email before Superadmin approval.';
   end if;

   update public.access_requests set status='Approved',approved_role=v_role,
     reviewed_by=auth.uid(),reviewed_at=now()
     where id=p_request_id;

   update public.user_profiles set role=v_role,is_active=true,
     full_name=coalesce(nullif(trim(full_name),''),nullif(trim(v_request.full_name),'')),
     updated_at=now()
     where id=v_request.auth_user_id;
   return;
 end if;

 select up.role into v_existing_role from public.user_profiles up
 where lower(trim(coalesce(up.email,'')))=lower(trim(v_request.email)) limit 1;
 if v_actor_role<>'super_admin' and v_existing_role='super_admin' then
   raise exception 'Only a Super Admin can manage another Super Admin.';
 end if;

 update public.access_requests set status='Approved',approved_role=v_role,
   reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_request_id;
 update public.user_profiles set role=v_role,is_active=true,
   full_name=coalesce(nullif(trim(full_name),''),nullif(trim(v_request.full_name),'')),
   updated_at=now()
 where lower(trim(coalesce(email,'')))=lower(trim(v_request.email));
end;
$fn$;
commit;
