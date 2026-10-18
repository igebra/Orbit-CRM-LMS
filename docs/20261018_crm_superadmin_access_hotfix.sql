-- Orbit CRM production access management hotfix, 2026-10-18.
-- Approved policy: only an active database Superadmin can approve/manage staff.
-- Does not alter profiles, accounts, grants, payments or student records.
begin;
do $pre$
begin
 if not exists (select 1 from public.user_profiles where role='super_admin' and is_active=true)
 then raise exception 'No active Superadmin. Refusing privilege change'; end if;
end;
$pre$;
create or replace function public.can_manage_access()
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select coalesce(public.current_orbit_role()='super_admin',false);
$function$;
commit;
