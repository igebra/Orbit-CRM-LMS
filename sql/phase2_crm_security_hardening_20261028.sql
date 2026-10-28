-- Orbit CRM Phase 2 security hardening — 2026-10-28
-- Database: CRM Supabase project only (NOT standalone Orbit LMS).
-- Applied to the live CRM database and verified on 2026-10-28.
-- Keep this script in source control so schema permissions are reproducible.
-- Database changes do not substitute for end-to-end authorization tests.

begin;

-- These eight SECURITY DEFINER functions return TRIGGER.
-- Postgres triggers execute these internally; they are not public RPC endpoints.
-- Prevent direct invocation by public, anonymous, and signed-in callers.
revoke execute on function public.enforce_batch_capacity() from public, anon, authenticated;
revoke execute on function public.handle_new_orbit_user() from public, anon, authenticated;
revoke execute on function public.link_profile_from_trainer() from public, anon, authenticated;
revoke execute on function public.link_trainer_from_profile() from public, anon, authenticated;
revoke execute on function public.orbit_audit_trigger() from public, anon, authenticated;
revoke execute on function public.sync_batch_trainer_history() from public, anon, authenticated;
revoke execute on function public.sync_batch_trainer_identity() from public, anon, authenticated;
revoke execute on function public.sync_demo_attendee_to_lead() from public, anon, authenticated;

-- Audit access must follow the user's current active super_admin role,
-- rather than a hard-coded email allowlist.
drop policy if exists "super admins can view login audit logs"
  on public.login_audit_logs;

create policy "super admins can view login audit logs"
  on public.login_audit_logs
  for select
  to authenticated
  using ((select public.is_super_admin()));

commit;

-- Not changed:
-- approved_access_exists, portal_access_grant_exists, submit_access_request
-- remain anonymously callable because the current onboarding UI uses them.
-- Follow-up: redesign/check rate limiting and avoid user enumeration.
-- RLS-no-policy tables are left unchanged pending confirmation that they
-- are intended to be service-role-only.
