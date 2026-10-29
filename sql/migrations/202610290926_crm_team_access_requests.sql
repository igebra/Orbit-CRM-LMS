-- CRM-only onboarding for Team Members.
-- Additive migration; never run against Orbit LMS Supabase.
-- Public signup creates a Pending request only; role/module permission remains Superadmin-controlled.
begin;

alter table public.access_requests
  add column if not exists phone text,
  add column if not exists department text;

create or replace function public.submit_crm_team_access_request(
  p_full_name text, p_email text, p_phone text, p_department text
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
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Enter your full name (2–120 characters).';
  end if;
  if char_length(v_email) > 320 or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;
  if v_phone !~ '^\+?[0-9 ()-]{7,24}$' or
     length(regexp_replace(v_phone,'[^0-9]','','g')) not between 7 and 15 then
    raise exception 'Enter a phone number with country code.';
  end if;
  if v_department not in ('Marketing','Sales','CX','Admin','Management','Finance') then
    raise exception 'Choose a valid work department.';
  end if;

  -- Prevent accidental duplicates; do not use the requester's department as authorization.
  if exists (
    select 1 from public.access_requests ar
    where lower(trim(ar.email)) = v_email and ar.status = 'Pending'
      and ar.created_at >= now() - interval '24 hours'
  ) then
    raise exception 'A pending request already exists for this email.';
  end if;

  insert into public.access_requests
    (full_name,email,phone,department,requested_role,status,approved_role)
  values (v_name,v_email,v_phone,v_department,'Team Member','Pending',null)
  returning id into v_id;
  return v_id;
end;
$fn$;

-- Superadmin-only request metadata; existing access_management_requests() API is untouched.
create or replace function public.crm_team_request_details()
returns table (request_id uuid, phone text, department text)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if not public.can_manage_access() then
    raise exception 'You do not have permission to view CRM team requests.';
  end if;

  return query
  select ar.id, ar.phone, ar.department
  from public.access_requests ar
  where ar.requested_role = 'Team Member';
end;
$fn$;

revoke all on function public.submit_crm_team_access_request(text,text,text,text) from PUBLIC, anon, authenticated;
grant execute on function public.submit_crm_team_access_request(text,text,text,text) to anon, authenticated;
revoke all on function public.crm_team_request_details() from PUBLIC, anon, authenticated;
grant execute on function public.crm_team_request_details() to authenticated;

commit;
