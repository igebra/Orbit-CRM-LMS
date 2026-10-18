# Orbit CRM — Production Security Remediation Evidence
Date: 2026-10-18.

## Verified production baseline
- Supabase Orbit CRM: `cgencwgfupijundbhpdv`, healthy.
- Vercel: `igebra1/orbit-crm-lms`.
- Current production commit: `41ac6230e6a4e2c367bb0a371dbc13a2e4be788d` (READY).
- Security and UI fixes: draft PR #1, **not merged**.

## Database migrations APPLIED
| ID | Migration | Evidence |
|---|---|---|
| SEC-CRM-01 | `crm_restrict_anonymous_privileged_rpcs_20261018` | Anonymous SECURITY DEFINER warnings reduced from 91 to 11; approved public request/check functions and triggers left available. |
| SEC-CRM-02 | `crm_superadmin_only_access_management_20261018` | `can_manage_access()` now checks active `super_admin` only; verified one active Superadmin remains. |
| SEC-CRM-03 | `crm_pin_function_search_paths_20261018` | Mutable function search_path warnings cleared for `normalize_access_role` and `set_updated_at`. |
| SEC-CRM-04 | `crm_staff_only_current_role_boundary_20261018` | `current_orbit_role()` returns only active CRM staff roles, excludes parent/student/trainer; three active staff profiles remain. |

No student, payment or user data rows were intentionally modified by these migrations.

## Outstanding
- Current production UI is based on old `main`; newer staff-only login and root role guard are still in review.
- E2E denial tests across CRM modules and raw Supabase REST/RPC.
- Complete staff-module per-user grant review; old role visibility is not proof of per-user authorization.
- First-time user email invite/recovery tests.
- CRM/LMS sync integration review.
- Backup restore drill and protected staging test environment.
- Security advisor still lists signed-in SECURITY DEFINER callables; each must have documented role checks or reduced execution grants.
- Vercel preview is not yet certified as isolated from the production database.

## Release decision
BLOCKED until staged negative tests, management security review, and sign-off.
