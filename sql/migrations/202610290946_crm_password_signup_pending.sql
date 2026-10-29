-- CRM: password-at-signup request, pending until Superadmin approval.
-- Apply to CRM Supabase only (not the separate Orbit LMS database).
begin;

alter table public.access_requests add column if not exists auth_user_id uuid;

-- This function never receives or stores passwords. Supabase Auth creates
-- credentials separately; we verify that the returned Auth ID is real and
-- belongs to the same email before opening a Pending CRM access request.
create or replace function public.submit_crm_password_signup_request(
 p_full_name text, p_email text, p_phone text, p_department text,
 p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
 v_name text := trim(coalesce(p_full_name,''));
 v_email text := lower(trim(coalesce(p_email,'')));
 v_phone text := trim(coalesce(p_phone,''));
 v_department text := trim(coalesce(p_department,''));
 v_id uuid;
begin
 if length(v_name) not between 2 and 120 then
   raise exception 'Enter your full name (2–120 characters).';
 end if;
 if length(v_email)>320 or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
   raise exception 'Enter a valid email.';
 end if;
 if v_phone !~ '^\+?[0-9 ()-]{7,24}$' or
    length(regexp_replace(v_phone,'[^0-9]','','g')) not between 7 and 15 then
   raise exception 'Enter a phone number with country code.';
 end if;
 if v_department not in ('Marketing','Sales','CX','Admin','Management','Finance') then
   raise exception 'Choose a department.';
 end if;
 if p_auth_user_id is null or not exists (
    select 1 from auth.users au
    where au.id=p_auth_user_id and lower(trim(au.email))=v_email
      and au.is_anonymous=false
 ) then
   raise exception 'Auth account could not be verified for the submitted email.';
 end if;

 -- Preserve previously approved (Superadmin-invited) accounts; the Auth
 -- signup trigger can make the verified user's existing approval active.
 select id into v_id from public.access_requests ar
 where lower(trim(ar.email))=v_email and ar.status='Approved'
 order by ar.reviewed_at desc nulls last,ar.created_at desc limit 1;
 if v_id is not null then
   return v_id;
 end if;

 if exists (
   select 1 from public.user_profiles up
   where up.id=p_auth_user_id and up.is_active=true
 ) then
   raise exception 'This account is already active. Sign in instead.';
 end if;

 select id into v_id from public.access_requests ar
 where lower(trim(ar.email))=v_email and ar.status='Pending'
 order by created_at desc limit 1;
 if v_id is not null then
   -- Allow safe retry of the *same* newly created Auth account.
   if not exists (
     select 1 from public.access_requests ar
     where ar.id=v_id and ar.auth_user_id=p_auth_user_id
   ) then
     raise exception 'A pending request exists already. Contact your Superadmin.';
   end if;
   update public.access_requests set full_name=v_name,phone=v_phone,department=v_department
   where id=v_id;
   return v_id;
 end if;

 insert into public.access_requests
 (full_name,email,phone,department,requested_role,status,approved_role,auth_user_id)
 values (v_name,v_email,v_phone,v_department,'Team Member','Pending',null,p_auth_user_id)
 returning id into v_id;
 return v_id;
end;
$fn$;

-- Approval is the authorisation boundary. A public Team Member request cannot
-- grant itself a CRM role or activate an unrelated pre-existing account.
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

revoke all on function public.submit_crm_password_signup_request(text,text,text,text,uuid)
 from public, anon, authenticated;
grant execute on function public.submit_crm_password_signup_request(text,text,text,text,uuid)
 to anon, authenticated;

commit;
