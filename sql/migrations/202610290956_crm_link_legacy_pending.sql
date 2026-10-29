-- Compatible upgrade: link older pending CRM signup requests to first verified Auth account.
begin;

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
   -- A prior pending form may have been submitted before passwords were
   -- collected. Allow the first real Auth signup to securely claim it by
   -- verified matching email and persisted Auth user ID.
   if exists (
     select 1 from public.access_requests ar
     where ar.id=v_id and ar.auth_user_id is not null
       and ar.auth_user_id<>p_auth_user_id
   ) then
     raise exception 'A pending request is linked to another account. Contact your Superadmin.';
   end if;
   update public.access_requests set full_name=v_name,phone=v_phone,
     department=v_department,auth_user_id=p_auth_user_id
   where id=v_id and (auth_user_id is null or auth_user_id=p_auth_user_id);
   return v_id;
 end if;

 insert into public.access_requests
 (full_name,email,phone,department,requested_role,status,approved_role,auth_user_id)
 values (v_name,v_email,v_phone,v_department,'Team Member','Pending',null,p_auth_user_id)
 returning id into v_id;
 return v_id;
end;
$fn$;


commit;
