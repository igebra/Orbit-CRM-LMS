-- Orbit CRM: reduce unneeded unauthenticated RPC access, 2026-10-18.
-- Preserve the three login/request-check endpoints intentionally callable without a session.
-- Leave trigger functions unchanged; revoke public EXECUTE from all other exposed
-- SECURITY DEFINER functions and explicitly retain signed-in invocation.
-- This does not replace RLS or internal function-level authorization checks.
begin;
do $rpc$
declare r record;
begin
  for r in
    select format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and pg_get_function_result(p.oid) <> 'trigger'
      and has_function_privilege('anon',p.oid,'EXECUTE')
      and p.proname not in (
        'submit_access_request', 'approved_access_exists', 'portal_access_grant_exists'
      )
  loop
    execute format('revoke execute on function %s from public, anon',r.signature);
    execute format('grant execute on function %s to authenticated',r.signature);
  end loop;
end;
$rpc$;
commit;
