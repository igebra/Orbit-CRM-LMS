# Orbit CRM — Critical Access Isolation Checklist
Status: review-branch fix only. No production database authorization claims.

## Source review observations
- Current CRM repo retains old LMS routes (`/student`, `/parent`, `/lms`, `/portal-access`) and allowed those portals to open via login. This conflicts with the approved split.
- This PR denies student, parent and trainer roles at CRM route entry; blocks legacy portal routes from the CRM interface; does not alter data.
- New staff CRM roles are still selected and assigned under Supabase access-management RPCs, not browser choice. Verify live triggers, pending request approval and admin role assignment.
- Existing sidebar uses broad role-based module access; true Superadmin-configured *per-user* permission grants and DB RLS are not yet verified.
- Never reuse CRM credentials or service-role secrets in LMS; CRM access to LMS schedules must be a controlled read-only server integration.

## Required before sign-off
1. Verify live CRM Supabase schema, RLS on leads, payments, user_profiles, students, demo and grants; audit SECURITY DEFINER functions and privileges.
2. Validate restricted accounts cannot query private CRM tables through REST, RPC, views or storage (not merely UI).
3. Confirm portal identities still have access to **LMS** via its independent Supabase Auth and no implicit CRM access.
4. Complete CRM staff Request Access, Superadmin role/module assignment and invitation delivery as a distinct CRM flow. The current CRM login still contains legacy student/parent request UX and must be reconciled before public release.
5. Backup/restore drill, synthetic-data staging and automated role E2E test evidence.
6. Record owner, reviewer, Vercel deployment SHA, DB migration IDs, rollback plan.

## Decision
NOT READY for security/management sign-off until runtime database verification and first-time staff onboarding are complete.
