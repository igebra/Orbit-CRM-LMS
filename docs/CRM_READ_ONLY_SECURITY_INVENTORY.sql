-- Read-only inventory for *CRM* Supabase, not LMS. Contains NO student row data.
select n.nspname as schema_name,c.relname as table_name,
 c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select n.nspname as schema_name,p.proname as function_name,
 pg_get_function_identity_arguments(p.oid) as arguments,
 p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname;
select grantee,table_schema,table_name,privilege_type
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;
select role,is_active,count(*) as user_count
from public.user_profiles group by role,is_active order by role,is_active;
