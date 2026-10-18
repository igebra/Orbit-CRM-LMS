-- CRM authorization boundary, 2026-10-18.
-- No trainer, parent or student role may gain internal CRM authorization.
-- Existing active CRM users use staff roles; this leaves them unchanged.
begin;
create or replace function public.current_orbit_role()
returns text language sql stable security definer set search_path = ''
as $role$
 select up.role from public.user_profiles up
 where up.id=(select auth.uid()) and up.is_active=true
 and up.role in ('super_admin','admin','sales','sales_marketing',
                 'marketing','accounts_finance','viewer_management')
 limit 1;
$role$;
commit;