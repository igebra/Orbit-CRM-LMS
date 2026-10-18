-- REVIEW ONLY: PROPOSED CRM migration, NOT EXECUTED.
-- Do not apply to LMS. Confirm current function bodies and backup before using.
-- Objective: only active Superadmin may approve access, and CRM cannot mint portal roles.
begin;
create or replace function public.can_manage_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_orbit_role() = 'super_admin',false);
$$;
create or replace function public.normalize_access_role(p_role text)
returns text language sql immutable set search_path = ''
as $$
  select case pg_catalog.lower(pg_catalog.btrim(coalesce(p_role,'')))
    when 'super admin' then 'super_admin'
    when 'super_admin' then 'super_admin'
    when 'admin' then 'admin'
    when 'sales' then 'sales'
    when 'sales admin' then 'sales'
    when 'sales / marketing' then 'sales'
    when 'sales_marketing' then 'sales'
    when 'marketing' then 'marketing'
    when 'accounts / finance' then 'accounts_finance'
    when 'accounts_finance' then 'accounts_finance'
    when 'finance admin' then 'accounts_finance'
    when 'viewer / management' then 'viewer_management'
    when 'viewer_management' then 'viewer_management'
    when 'management' then 'viewer_management'
    else null
  end;
$$;
commit;
-- PRE-APPLICATION: inventory active trainer/student/parent CRM profiles, auth users,
-- grants, RLS policies and RPC callers. Confirm no active LMS workflows depend on them.
-- POST-APPLICATION: test anonymous/staff/admin cannot call privileged RPC; superadmin
-- can approve standard CRM roles; no portal/trainer roles can be granted. Revoke any
-- function EXECUTE privileges found to be over-broad on the live database.
