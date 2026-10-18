# Orbit CRM — QA Evidence and Release Decision
Audit date: 2026-10-18. This is an evidence register, not production sign-off.

## Deployment identity
| Field | Verified value |
|---|---|
| Repository | `igebra/Orbit-CRM-LMS` |
| Production commit | `41ac6230e6a4e2c367bb0a371dbc13a2e4be788d` |
| Production Vercel deployment | `dpl_55MS4rXYj2ZnTD64hqZbea3neEwe` (READY) |
| Draft PR | `https://github.com/igebra/Orbit-CRM-LMS/pull/1` |
| Candidate commit | `d1c4fa5f3b4ab34f08babdff56f8c17f6160b78b` |
| Candidate Vercel preview | `https://orbit-crm-bmhjlty90-igebra1.vercel.app` (READY) |
| Candidate CI run | `https://github.com/igebra/Orbit-CRM-LMS/actions/runs/39109552076` (SUCCESS) |
| Production Supabase project | `cgencwgfupijundbhpdv` |
| Staging Supabase project | NOT CREATED |
| Preview environment isolation | BLOCKED: preview and production share Supabase environment variable targets |

## What is verified
- Lint, TypeScript, Node test suite and build passed at candidate commit. Vercel candidate deployment is READY.
- Live public CRM tables have RLS enabled, but row-level policy quality is not proven by RLS-on alone.
- Security migrations applied to restrict anonymous privileged RPCs, make `can_manage_access` Superadmin-only, scope `current_orbit_role` to staff and fix mutable search paths.
- Current Supabase advisor: 11 anonymous SECURITY DEFINER warnings (includes deliberately public RPCs and trigger functions), 91 authenticated SECURITY DEFINER warnings, three INFO RLS-without-policy entries, and leaked password check warning.
- Live production commit is older than draft branch; draft changes are NOT serving real CRM users.

## Acceptance tests — currently unverified
| ID | Scenario | Result |
|---|---|---|
| AUTH-01 | Staff access request → approval → verified invitation | BLOCKED: no staging project or test email |
| AUTH-02 | Only Superadmin can grant/revoke roles and modules | BLOCKED: raw Supabase API negative tests |
| AUTH-03 | Student/Parent/Trainer roles cannot log into CRM | BLOCKED: synthetic users and browser tests |
| DATA-01 | Sales/marketing roles cannot see financial transactions | BLOCKED: RLS negative identity tests |
| DATA-02 | Finance role cannot alter LMS course/batch content | BLOCKED: scope and RLS tests |
| DATA-03 | Least privilege per-person module rights | BLOCKED: live/staging policy comparison |
| DATA-04 | Users cannot access unauthorized leads or student data | BLOCKED: RLS negative identity tests |
| API-01 | CRM→LMS synchronization is scoped, authenticated and idempotent | BLOCKED: staging integration |
| OPS-01 | DB backup, recovery, rollback drill | BLOCKED: restore proof |
| UX-01 | Desktop/mobile sign-in, forms, dashboards, error handling | BLOCKED: browser QA |
| QA-01 | lint/typecheck/Node tests/build | PASSED: CI |
| DEPLOY-01 | Vercel preview ready | PASSED: build/deploy state only |

## Decision
**DO NOT MERGE OR PROMOTE** before isolated staging, real negative-role tests, backup/restore proof, and QA sign-off.
A preview deployment is NOT safe for write testing while its Supabase settings match production.
