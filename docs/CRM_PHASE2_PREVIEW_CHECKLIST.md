# Orbit CRM Phase 2 — Preview release verification

Branch: `security/phase2-crm-guards-20261028`
Baseline: approved `feature/crm-v1-overview-sidebar`

## Verified locally
- Final approved white CRM sidebar and Orbit wordmark retained.
- LMS and Portal Access links removed from CRM sidebar (underlying routes are retained).
- Superadmin login succeeded.
- CRM Leads import and Demo Excel parsing/column mapping worked with the updated spreadsheet package.
- Production build completed successfully with Next.js 16.4.3.
- `npm audit --omit=dev` reported 0 known vulnerabilities.
- Password-reset email redirect opened the local `/reset-password` form.
- Database RLS and trigger execution privileges were audited; see SQL record in `sql/`.

## Unverified / launch blockers
- Sales (and other staff roles) sign-in and module-level access; user plans to test with actual staff member.
- Direct URL authorization on every internal CRM route; hiding the sidebar is not a security boundary.
- Password reset update/save and subsequent login; current test deferred due email rate limit.
- Student/Parent signup handoff requires an actual `NEXT_PUBLIC_ORBIT_LMS_URL` environment setting plus an LMS `/request-access` route.
- Older CRM `/lms` and `/portal-access` URLs remain routable and need explicit route hardening/migration.
- Production smoke test is pending; no full team rollout approved.

## Deployment plan
- Deploy **Preview** from this branch first. The Vercel Ignored Build Step requires a latest commit message containing `[preview]` to build preview branches.
- Test preview UI and auth with authorized staff only.
- Do not promote/merge to production until blockers above are closed.
