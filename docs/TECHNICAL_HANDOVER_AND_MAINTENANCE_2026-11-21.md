# Orbit LMS + CRM — Technical Handover and Maintenance Runbook
**As-built audit date:** 21 November 2026
**Audience:** Incoming engineering lead, full-stack developers, DevOps, database administrator, QA and product owner
**Status:** Working production systems with unresolved source parity, integration and release-control items. This document is a handover baseline, not a claim of complete production acceptance.

## 1. Purpose and critical operating rule
Orbit is a pair of separately deployed Next.js applications created iteratively using AI-assisted/vibe-coded development. Treat the source as a normal production codebase: understand dependencies, add tests, verify authorization, review diffs and deploy via controlled pull requests. Do not refactor the entire system in one release.
- CRM: internal igebra.ai operations, sales, leads, demo pipeline, onboarding, payments, trainers and delivery planning.
- LMS: academic delivery, student/parent/trainer portals, course and resource libraries, attendance, homework and AQMATiCS/ByteXL foundations.
- Existing students, learning records, payments, authentication, storage objects and rollback history are protected assets. No direct main-branch cleanup, destructive SQL, production reset or forced deployment.
- Both Supabase projects are separate. Cross-system writes must use authenticated/secret-validated server-to-server integrations and stable record identifiers.
- The older docs/01–05 documents describe some original design/split intentions rather than the live current state. Read this document and the LIVE_SUPABASE_INVENTORY snapshot alongside them; update canonical docs after reconciliation.

## 2. Production asset registry
| Item | Orbit LMS | Orbit CRM |
|---|---|---|
| GitHub | igebra/Orbit-LMS | igebra/Orbit-CRM-LMS |
| Default branch | main | main |
| Repo visibility at audit | Private | PUBLIC — security/privacy review required |
| Vercel project | orbit-lms | orbit-crm-lms |
| Vercel project ID | prj_yjrNAAGt9aprSzpXqE0U5RHYHIEm | prj_DUtRyN0VxeSxrvadyCIGxdYoDctC |
| Supabase project | Orbit LMS | Orbit |
| Supabase project ref | wchemxmgjatgxymxjswo | cgencwgfupijundbhpdv |
| Supabase region | ap-northeast-2 | ap-southeast-2 |
| GitHub main SHA, inspected | 35c1c78c9385e1679a9a47e5d5efb1b2d247e9b9 | 1cabdfabd125088bba3205aaaad42e5dcec321b0 |
| Frontend | Next.js 16.3.4 / React 19.2.8 | Next.js 16.4.3 / React 19.2.8 |
| Deployment platform/runtime | Vercel / Node 24.x | Vercel / Node 24.x |
| DB engine | Supabase PostgreSQL 17 | Supabase PostgreSQL 17 |

Production deployments on audit were READY and linked to the above main commits. The intended user-facing domain for LMS is lms.igebra.ai; verify DNS, domain-to-project binding and SSL in the Vercel dashboard. The available Vercel API project domain inventory returned default *.vercel.app domains, so custom-domain mappings were not independently verified in this audit.

## 3. Architecture and data ownership
    CRM browser -> CRM Next.js pages / service API -> CRM Supabase (Auth, Postgres, private Storage)
                    |
                    | CRM student and enrollment INSERT/UPDATE
                    v
    CRM orbit_integration.crm_sync_outbox -> pg_net + pg_cron retry
                    |
                    | secret-validated POST
                    v
    LMS Next.js /api/sync/student -> LMS Supabase students, student_enrollments
                    |
                    v
    LMS learning data: batches, sessions, resources, approvals, attendance, homework, parent grants

    LMS primary-trainer changes -> LMS private outbox (database migration applied)
                    |
                    v
    CRM Supabase Edge Function sync-lms-batch-trainer -> CRM restricted RPCs
                    |
                    v
    CRM matching batch operational read model (rollout/reconciliation incomplete)

Source of truth:
- CRM owns leads, prospects, demos, finance, manual receipts, CRM-origin student master data and enrollment status.
- LMS owns curriculum/resources, content approval/release, batch academic scheduling and trainer assignment, attendance, homework, submissions, student and parent learning visibility.
- Trainer IDs are different across databases. Match a shared batch by UUID and a trainer by unique active email; never assume trainer UUIDs or display names match across systems.
- CRM may store a derived, read-only copy of operational batch/trainer fields. Prevent conflicting edits and document how to reconcile historical or LMS-only rows.
- DELETE from CRM must not delete academic records in LMS.
- The class-count/20-class framework is for Coding4AI and AiEdge, NOT year-long school Math.

## 4. Repository map and code orientation
### LMS (igebra/Orbit-LMS)
- app/page.tsx + app/components/FinalLoginPanel.tsx: sign-in/signup interface.
- app/lib/supabaseClient.ts: shared browser Supabase client and auth-session handling.
- app/components/RoleRouteGuard.tsx and app/lib/roleAccess.mjs: route access UX; database RLS and authenticated RPCs remain the security boundary.
- app/components/OrbitSidebar.tsx: role-aware navigation.
- app/dashboard, app/students, app/trainers, app/batches, app/courses: admin/operations interfaces.
- app/content/upload, app/content/review, app/content-visibility: library, approval and released content controls.
- app/sessions/[id], app/trainer/workspace, app/trainer/class/[id], app/trainer/homework: schedule, approved teaching material, attendance, homework, recording and review.
- app/student, app/parent, app/portal: learner and parent views; parent uses approved linkage, never unverified claimed relationship.
- app/homework and app/homework/workspace/[id]: assignments, workspace, submission and feedback.
- app/access-requests, app/portal-access, app/login-activity: account approval and audit.
- app/data-cloud-eng: AQMATiCS entry. Do not confuse a live sidebar/route with an accepted complete Databricks lab implementation. Validate lab scope and the separate feature branch.
- app/api/sync/student: secret-protected CRM -> LMS receiver.
- app/api/admin/delete-user, app/api/admin/delete-student: server-side privileged workflows.
- app/api/audit: authenticated session activity logging / restricted audit retrieval.
- app/lib: shared helper modules; app/components: shared UI; tests: Node test suite.
- supabase/migrations and docs/migrations: SQL sources; compare both paths to live registry before adopting one canonical migration directory.

### CRM (igebra/Orbit-CRM-LMS)
- app/page.tsx and app/components/FinalLoginPanel.tsx: login and team signup.
- app/dashboard, app/crm/leads, app/crm/demos: operational overview, lead lifecycle and demonstrations.
- app/students, app/trainers, app/batches, app/sessions/[id], app/courses: learner and class operations/read models.
- app/payments, app/reports: received payment reporting and business metrics.
- app/access, app/portal-access: access administration and grants.
- app/api/fx/latest: conversion-rate lookup, not the authority for original receipt currency.
- app/lib: CRM-specific calculation and option modules.
- sql/migrations, docs/migrations and supabase/migrations on a not-yet-merged sync branch: migration sources that MUST be reconciled with live Supabase.
- scripts/apply_*.py: historical one-off patch scripts; inventory and archive before removal, never execute them against production blindly.
- Root Orbit_*.zip files are legacy patch-package artifacts; they are not Next.js runtime assets.

## 5. User roles and sign-up/authorization
- New LMS signups supply name, email, telephone, role-specific fields and a password, then require Superadmin approval and role assignment. Trainer matching/provisioning is governed by a restricted LMS RPC. Parents and students must link to verified student identities.
- The CRM team-member signup is pending approval. A Superadmin assigns operational permissions. Do not grant roles from browser-selected text or user-editable metadata.
- LMS application roles include super_admin, admin, trainer, content_team, student and parent; QA should verify any other specific roles in live profiles and permissions.
- CRM staff may include super_admin, admin, sales, sales_marketing and other role-specific users. Confirm the live role-authorization matrix before giving access.
- Browser route guards offer navigation UX, not permission enforcement. Require user-specific RLS policies and/or restricted SQL RPCs for EVERY read/write.
- Review Supabase Auth signup/confirmation policies, role assignment RPC EXECUTE grants, service keys, audit logging and identity mismatch handling.
- Never hardcode personal email allowlists as the only security boundary; special audit access requires a documented owner/permission policy.

## 6. LMS operating flows
### Content team -> approval -> trainer -> student/parent
1. Admin/content team defines a course and its curriculum/chapter/session resources.
2. Content team uploads PPT/PDF/homework to the private LMS library; the associated lms_resource_versions row references Storage.
3. Admin approves content and decides student-facing visibility. Do not publish unapproved material.
4. Trainer opens My Classes, selects an assigned class, accesses approved PPT and selects approved homework.
5. Homework release uses restricted release_session_homework_material (or the approved publishing flow); student and associated parent see only authorized released material.
6. Student opens resource viewer/assignments, creates a submission or private workspace entry; trainer reviews feedback/resubmission.
7. Content release and learner identity/batch/course boundaries must all be valid. Never bypass them to resolve a missing file.

### Different course sequencing rules
- Math: year-long school Math. Trainer may choose any approved chapter PPT/homework within the same Math course independently of class number. Releasing one assignment does NOT release an entire chapter. The 2026-11-21 live migration includes is_math_course_name, math_homework_assignment_available and revised portal/release RPCs.
- AiEdge / Coding4AI: preserve the existing 20-session level flow and lesson gates unless explicitly changed, separately tested and approved.
- Do not infer that lms_curriculum_sessions.session_number equals current class_sessions.session_number for Math.

### Scheduling, attendance, recordings
- Batches and batch_students connect learners to academic cohorts. batch_trainer_assignments records trainer history; class_sessions captures scheduled sessions.
- Trainer attendance flows through save_session_attendance and/or record_trainer_attendance, with Present/Absent/Cancelled paths and reasons.
- A completed session may have a Zoom recording URL. A changed recording is not automatically student-visible; Admin/Superadmin must explicitly approve recording_released after class completion.
- Keep trainer notes, schedule updates and session cancellation separate from homework approval, student submission, and attendance writes.
- Parent learning access inherits from the linked child's released resources, not from an independent content-release schedule.

### AQMATiCS / ByteXL
- LMS has multiple bytexl_* tables for cohorts, mandatory student profiles, assignments, questions/keys, submissions, grades, forms, handouts and optional Drive outbox.
- At audit, all bytexl_* table row counts in the live database were zero. Treat workflow as provisioned foundation, not evidence of a validated running cohort.
- Google Forms receipt is not evidence of verified submission until the authoritative receipt is recorded. Do not treat a form iframe open as completion.
- Never mix CRM finance/leads with the isolated AQMATiCS academic experience.

## 7. CRM operating flows
1. Capture and update leads, follow-up stages and activities; add demo schedules and attendee records.
2. Convert admitted leads to student/enrollment master records in CRM.
3. CRM creates student and enrollment sync events; LMS receives idempotent profile/enrollment upserts.
4. CRM batches and trainer allocation are operational views; academic delivery trainer assignment is authoritative in LMS going forward.
5. Record native manual receipts in crm_manual_payments; corrections/voids preserve the audit record.
6. Payment dashboards and reports aggregate receipts, not planned payment amounts. Preserve original currency and conversion logic; any FX figure is indicative, not an alternative source of cash receipts.
7. CRM batch search, trainer workload, regional time zones and partner fields are separate view/reporting concerns, not independent academic scheduling authority.

## 8. Database model: where to find the exact tables
See docs/LIVE_SUPABASE_INVENTORY_2026-11-21.md in EACH repository. The inventory captures live columns, estimated row counts, 72 LMS foreign keys, 27 CRM foreign keys, RPC signatures, bucket limits and migration registry.
Main LMS groups:
- Identity/access: user_profiles, orbit_signup_requests, portal_access_grants, staff_module_permissions, trainer_course_access, login_audit_logs.
- Academic roster: courses, students, student_enrollments, trainers, batches, batch_students, batch_trainer_assignments, class_sessions.
- Content: lms_curriculum_sessions, lms_resources, lms_resource_versions, student_content_access, batch_content_access, course_catalog_overrides.
- Progress: session_attendance, session_homework, session_files, homework_assignments, homework_submissions, homework_workspaces, homework_workspace_events.
- AQMATiCS/ByteXL: bytexl_cohorts, bytexl_student_profiles, bytexl_assignments, bytexl_questions, bytexl_question_keys, bytexl_submissions, bytexl_answers, bytexl_grades, bytexl_handouts and other bytexl_* tables.
Main CRM groups:
- Access: user_profiles, access_requests, portal_access_grants, orbit_audit_log, login_audit_logs.
- Commercial: leads, lead_activities, demo_sessions, demo_attendees, batch_student_finance, payment_transactions, crm_manual_payments, crm_manual_payment_audit, payment/correction logs.
- Academic read model: students, student_enrollments, trainers, batches, batch_students, batch_trainer_assignments, class_sessions and legacy LMS resource tables.
- Private integration: orbit_integration.crm_sync_outbox, plus LMS orbit_integration.lms_trainer_sync_outbox (not in public-table inventory).
Never equate table presence with active use. Identify live code references and real records before removal. Review all SECURITY DEFINER functions and execute privileges.

## 9. Integration contracts and actual status
### CRM -> LMS student and enrollment
- CRM trigger: orbit_crm_students_outbox and orbit_crm_enrollments_outbox.
- CRM private queue: orbit_integration.crm_sync_outbox.
- Dispatch: pg_net HTTP POST; pg_cron job orbit-crm-lms-retry runs every minute.
- Receiver: LMS Next.js POST /api/sync/student; requires x-orbit-sync-secret compared against ORBIT_CRM_SYNC_SECRET.
- Receiver checks event schema/table/type, validates payload, compares source updated_at, rejects conflicts, and maintains crm_managed/crm_updated_at and crm_enrollment_id.
- Uses server-side SUPABASE_SERVICE_ROLE_KEY. CRM deletion is deliberately not propagated.
- At audit, the CRM queue showed delivered events with no pending entries in its grouped status summary. This confirms queue state, not every downstream user interface.

### LMS -> CRM primary trainer
- CRM live migration registry contains lms_trainer_receiver_20261121. CRM Edge Function sync-lms-batch-trainer is ACTIVE, version 1, with JWT verification disabled because it performs its own dedicated shared-secret validation.
- CRM live RPCs verify_orbit_lms_batch_token and apply_orbit_lms_trainer_change exist; CRM batches carry lms_trainer_sync_version.
- LMS live migration registry contains lms_trainer_to_crm_outbox_20261121; the private LMS outbox and minute retry job exist.
- BUT key corresponding source files currently remain in the unmerged CRM branch feat/lms-to-crm-batch-trainer-sync-20261121, while the 2026-11-21 LMS outbox migration is not present in the inspected LMS main tree.
- Therefore GitHub main cannot yet reproduce this integration. Reconcile both migrations, function source, Vault configuration, cron, retry outcomes, identity mappings and logged-in UAT before declaring completion.
- LMS 45 batch rows vs CRM 43 at audit: 43 shared UUIDs and two LMS-only batches. A same-UUID trainer-name comparison found one displayed-name difference (CAN-M-G5-03: longer vs shorter Nusaiba display text). The databases have different trainer IDs; comparing IDs directly overstates differences.
- Never auto-create a CRM batch by matching only its name. Never edit LMS batch assignments by direct SQL merely to make dashboards agree.

## 10. Supabase Storage and file uploads
LMS private buckets at audit:
| Bucket | Per-object size limit |
|---|---:|
| lms-files | 50 MiB |
| lms-library | 50 MiB |
| homework-submissions | 25 MiB |
| bytexl-assignment-files | 5 MiB |
| bytexl-handouts | 10 MiB |
CRM private buckets include lms-files (25 MiB), lms-library (25 MiB) and orbit-backups (1 GiB).
- The LMS resumable-upload helper lives at app/lib/lmsResumableUpload.mjs. Validate authentication, upload session, file policies, storage paths, MIME and revision lineage for >25 MiB materials.
- Do not use public Storage buckets or public URLs to work around RLS. For large slide decks retain private access, signed/authorized retrieval and content approval.
- Do not remove or overwrite a storage object because a database record looks unused until all foreign-key, version history and academic-history references are reviewed.

## 11. Environment and secret handling
Common frontend variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; these are browser-visible by design.
LMS service/API variables: SUPABASE_SERVICE_ROLE_KEY, ORBIT_CRM_SYNC_SECRET (server-side only).
CRM Edge Function uses CRM project-provided SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. CRM and LMS cross-system delivery secrets are kept in each appropriate Supabase Vault, not in GitHub.
- Engineering lead must inventory key NAMES, scopes (Development/Preview/Production), owners and rotation process in Vercel/Supabase dashboards. Never paste actual secret values in docs, issues, commits, chat, screenshots or PR logs.
- Add a redacted .env.example if absent. No .env.local, backup, JWT, service role, plaintext client secrets or data export in source control.
- Each application must point only at its matching Supabase project. Avoid cross-project frontend keys.

## 12. Local development and quality gates
Prerequisites: repository access, Node runtime matching target, npm, access to a non-production Supabase test project, approved read-only live access when needed.
    git clone https://github.com/igebra/Orbit-LMS.git
    cd Orbit-LMS
    npm ci
    npm run dev
    npm run lint
    npx tsc --noEmit
    npm test
    npm run build

    git clone https://github.com/igebra/Orbit-CRM-LMS.git
    cd Orbit-CRM-LMS
    npm ci
    npm run dev
    node --test tests/*.test.mjs
    npm run build

- LMS package provides test, test:security, lint and build scripts. CRM package does not define npm test; its workflow runs node --test tests/*.test.mjs.
- The LMS GitHub quality-gate workflow uses Node 22 while Vercel projects are configured for Node 24.x; align CI/runtime after verifying dependency compatibility.
- CRM GitHub verify-build workflow uses Node 24; it runs Node tests and npm run build. Add explicit lint, type-check and security/static analysis gates after baseline is green.
- Tests should cover actual behavior with seeded, permission-isolated users and signed-in browser UAT, not only source-string checks.
- Avoid direct edits to main. Use feature/fix branches; test PR previews against non-production data, review migrations and merge with release authorization.

## 13. Release and rollback SOP
1. Record ticket, scope, affected application, ownership, tables, RPCs, API routes, permission changes and rollback plan.
2. Verify remote main against production Vercel commit and—where needed—actual deployed file content. Source/production parity was previously documented as an issue in CRM.
3. Create a focused PR, link affected tests and screenshot flows. Check for credential exposure, hidden destructive scripts, and generated files.
4. Test preview (safe Supabase test environment). Run npm ci, lint/type checks, Node tests, build and role-by-role manual tests.
5. For database DDL: record actual live migration history, secure approved backups, dry-run on isolated database, include forward migration and verified rollback. Never DELETE/RESET production tables during cleanup.
6. Follow the project rule: production deployments after 9 PM IST only with release approval; use only the approved main/prod targets and keep the once-daily release discipline unless owners formally change it.
7. Confirm Vercel READY for the intended SHA, verify custom domain, run signed-in smoke flows and observe errors/logs and integration queue states.
8. Record changelog, migration version, dashboard/log links, backout trigger and acceptance signoff.
9. Roll back the app by promoting a known-good Vercel production deployment after review. Database rollback is a SEPARATE operation and requires a tested backward-compatible plan. Never assume Vercel rollback reverses SQL or Storage data.
10. If a sync event fails, prefer investigate/retry and correlation tracking; do not make divergent manual writes to both DBs as a shortcut.

## 14. Routine maintenance
Daily: check Vercel production errors, Supabase health/connection errors, auth failures, stuck CRM/LMS sync queue entries, file-upload failures and support tickets.
Weekly: inspect student/enrollment reconciliation, trainer-name/UUID mapping, pending content approvals, attendance and homework flows, backup job success, patch vulnerabilities and branch PRs.
Monthly: test restore from backups, inspect RLS policy changes and privileged RPC grants, dependency upgrades, storage consumption/cost, schema diff and stale environment variables, audit admin accounts.
Quarterly: dependency/security hardening, remove verified dead code by bounded PRs, consolidate duplicated components and large page files, exercise disaster recovery, review user/maintainer access.

## 15. Troubleshooting guide
| Symptom | First checks |
|---|---|
| Student/parent has empty portal | Verify active user profile, correct Supabase project, portal_access_grants mapping, student UUID, enrollments, batch_students, resource approval, student_content_access / batch_content_access, and protected portal RPC results. |
| Trainer cannot see a class | Check active trainer profile, linked_user_id, batch_trainer_assignments, trainer_can_access_batch, class status and current route. |
| Homework/PPT unavailable | Check approved resource version, source course match, Math vs 20-session sequencing rule, explicit homework release and private Storage policy. |
| CRM trainer differs from LMS | Compare shared batch UUID; map trainer by unique email, inspect LMS outbox state/error, CRM Edge Function logs and lms_trainer_sync_version; check whether main contains live migration sources. |
| CRM student not in LMS | Check CRM outbox state, cron, pg_net HTTP response, LMS POST route, x-orbit-sync-secret configuration, crm_updated_at and enrollment dependency. |
| Payment dashboard shows zero | Compare crm_manual_payments to report RPC/filters, date/timezone and currency conversion; do not treat payment plans as paid transactions. |
| Content upload fails above 25 MB | Check exact bucket limit (50 MiB for LMS files/library), resumable upload path, auth token, object policies, timeout and file size. |
| Vercel build fails | Check project/root directory, Node version, package-lock parity, exact commit, TypeScript, lint, PR workflow and env variable names; use logs without printing credentials. |
| DB migration conflict | Compare live Supabase migration registry and repo SQL; resolve order/definitions in test DB. Never reapply a function blindly. |
| Unexpected permission access | Reproduce with least-privilege user; inspect RLS, authenticated RPC EXECUTE, SECURITY DEFINER and service-key usage. Do not disable RLS. |

## 16. Open risk register and handover blockers
**P0 — Repository privacy:** CRM repository is PUBLIC. Review committed files and history for business-sensitive material or secrets; change visibility using an approved organizational security decision. Rotating secrets is mandatory if evidence of disclosure is found.

**P0 — Live DB/source drift:** CRM live lms_trainer_receiver_20261121 and LMS live lms_trainer_to_crm_outbox_20261121 migrations need reproducible committed sources. Edge Function and recent SQL exist in live systems even though the CRM integration branch is unmerged. Audit before production rollout.

**P0 — Integration UAT:** Validate a real trainer change (including Gargi -> Nusaiba scenario), zero data-loss history, mapping by email, idempotent retries and source-to-CRM UI refresh. Confirm queue statuses and route failures.

**P1 — Data reconciliation:** 45 LMS vs 43 CRM batches, 51 vs 49 student rows, 52 vs 50 enrollment rows, and 9 vs 15 trainer rows. These are different data ownership populations and do not prove faulty sync by count alone; reconcile stable IDs, statuses and exceptions.

**P1 — CRM deployed-source parity:** docs/releases/PRODUCTION_SOURCE_PARITY_BLOCKER.md describes an earlier mismatch between GitHub main metadata and actual deployed CRM source. Verify current production content again before depending on main as a complete recovery snapshot.

**P1 — Stale and duplicated docs:** Original LMS README still says the LMS Supabase project has not been created. Some role docs duplicate content. Update/retire incorrect guidance only after verifying behavior.

**P1 — QA and migration governance:** Align CI Node versions, pin action SHAs and dependency ranges with a deliberate patch policy, canonicalize migration paths and verify tests represent real role/RLS behavior.

**P2 — Repository hygiene:** Legacy root patch ZIPs and .bak snapshots can be removed in an isolated PR. Hundreds of old branches and one-off scripts require an explicit retention/archive classification, not mass deletion. Preserve production branches and known-good rollback commits.

**P2 — AQMATiCS maturity:** Provisioned bytexl_* tables were empty at audit; validate planned Databricks lab integration, free-account licensing/commercial use and enrollment/assignment workflows before representing as a production-tested course.

## 17. Handover acceptance checklist
- [ ] Engineering team has owner/maintainer rights to BOTH repositories, Vercel team and two Supabase projects (no credential sharing).
- [ ] CRM visibility/secret-history review complete.
- [ ] Current deployed app source SHA, environment/project mapping, DNS and restore points recorded.
- [ ] All LIVE migration registry entries matched with version-controlled SQL and function sources.
- [ ] LMS -> CRM trainer event path verified end to end with the newly changed trainer; queues drain.
- [ ] CRM -> LMS student and enrollment replication tested with idempotent updates and deletes ignored.
- [ ] Student, parent, trainer, content team, admin and superadmin flows signed off.
- [ ] Math independent chapter/homework and AiEdge/Coding4AI gated sequencing tested separately.
- [ ] Recording approval, attendance, uploads and payment ledger/reporting accepted by module owners.
- [ ] Least-privilege storage, RLS, RPC privileges, service-role placement and audit logging reviewed.
- [ ] Documented local setup, CI, preview, after-9-PM IST release, rollback and incident escalation demonstrated.
- [ ] Cleanup PR reviewed/merged without changing production behavior.
- [ ] Product owner and engineering lead sign the final as-built inventory and unresolved backlog.

## 18. Reference documents
- This repository's docs/LIVE_SUPABASE_INVENTORY_2026-11-21.md — metadata snapshot, NOT migration SQL.
- LMS docs/ops/LMS_SIMPLIFIED_TRAINER_PORTAL_20261120.md.
- LMS docs/integrations/CRM_LMS_REALTIME_SYNC.md and app/api/sync/student/route.ts.
- LMS supabase/migrations/20261121_math_chapter_independent_homework.sql.
- CRM docs/migrations/20261030_crm_lms_realtime_outbox.sql.
- CRM feature branch feat/lms-to-crm-batch-trainer-sync-20261121, including docs/integrations/LMS_CRM_TRAINER_SYNC.md, the Edge Function and proposed SQL.
- CRM docs/releases/PRODUCTION_SOURCE_PARITY_BLOCKER.md.
- Repo-specific AGENTS.md and .github/workflows.

**Ownership:** App changes -> respective Next.js repo; live schema changes -> respective Supabase project; releases -> respective Vercel project; user/product acceptance -> named owner. The team should update this runbook with validated evidence whenever a flow or architecture changes.
