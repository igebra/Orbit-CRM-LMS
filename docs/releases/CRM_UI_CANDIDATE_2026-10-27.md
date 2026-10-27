# Orbit CRM — desktop UI release-candidate checklist
Date: 27 October 2026
Status: Development preview candidate, NOT production approved.

## Frozen brand standards
- Parent brand: igebra.ai. Orbit CRM wordmark/logo and approved yellow Orbit mascot only in places already approved.
- Off-white main background #F8FAFB, white sidebar, muted teal #286F7A CTA, heading slate #263D46.
- Original-brand-related soft pastels for operational summaries (powder blue, apricot, dusty cyan, lavender, sage, blush).
- Typography: **Plus Jakarta Sans + Inter**, everywhere in CRM. Frozen 40px controls, radius 10px inputs/buttons, 14–16px cards, clear hover/focus/disabled states.
- Admin navigation actions remain at bottom of sidebar, original role-gated sidebar options preserved.

## UI review inventory
- [x] Overview — accepted compact operations layout / cards; existing dashboard widgets preserved.
- [x] Leads — accessible flat directory, no boxed actions, numbered rows, functional stage/follow-up filters.
- [x] Demo Schedule — small stats, flat table, S.No, original time-zone and student import workflows preserved.
- [x] Students — three active programme cards, numbered directory, mascot, notes and optional batch-linked USD fee-plan enrollment in Add Student.
- [x] Batches — total/running/weekday/weekend management cards, numbered rows, flat schedule list.
- [x] Trainers — stable alphabetic sorting and S.No, expandable actions.
- [x] Payments — approved V1 management overview, programme collections, full-width ledger with payment action and separate fee-plan setup; no duplicate sidebar payment form.
- [x] Courses — website-aligned US Math, Accelerated Math, Coding4AI, AiEdge and regional Math++; original mascot, soft pastel programme colours.
- [x] Reports — Trainer, Attendance and Batch Progress reports, CSV and compact numbered tables.
- [x] Access Management — final standard typography, tabbed requests/users, consistent actions and status labels.
- [x] Portal Access — standard parent/student grant screens and content visibility, tabbed layouts and numbered directories.
- [x] Sidebar — original navigation maintained, administration options last; prevent role-item flicker on navigation; clear cache on account switch.

## Required release gate — still open
1. Preview build must be Vercel READY for the exact Git commit and all routes return HTTP 200.
2. Logged-in product-owner visual QA at desktop viewport (navigation, table scroll, 40px controls, original mascot and logo).
3. End-to-end RBAC QA as Superadmin, Sales, Marketing, CX, Finance, Trainer, Parent/Student where applicable; verify database RLS.
4. Full functional QA with safe test records: Lead to Demo, Student creation and notes, fee plan assignment and payment, trainer/batch management, reports CSV, approval flows. Avoid creating synthetic transactions in production.
5. Financial USD-only data must not be presented as INR, and total agreed fees must not be labeled monthly expected collections.
6. Course rate conflicts between current website and stored overrides require owner approval.
7. Git branch is ~100 commits ahead of main, so inspect regression scope and compare deployed prod commit before merge.
8. Post-9 PM IST production-only policy; max one controlled release per day. No automatic production merge/deploy on mere preview success.

## Preview launch note
Vercel project's controlled ignore-build rule allows intentional previews only for Git commit messages containing `[preview]`. This checklist commit triggers one bundled preview of the entire UI; subsequent ordinary commits do not automatically consume deployment storage.
