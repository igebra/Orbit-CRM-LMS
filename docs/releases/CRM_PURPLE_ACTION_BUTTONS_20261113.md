# CRM purple action buttons — 13 November 2026

## Approved source
The customer-supplied screenshot of the "Import Leads" / "+ Add Lead"
controls has the filled button colour **#765BA3** (RGB 118,91,163).
Use that as the shared CRM action colour. Recommended hover: **#624888**;
soft hover **#F5F0FA**; outline **#DED7E9**.

## Scope
Apply the purple action colour to the blue filled buttons, secondary
outlined button text, non-destructive inline text actions, tab/selected
controls and keyboard focus indicators in:
- CRM Leads, Demos and Smart Lead Import
- CRM Students, Batches and Trainers
- CRM Payments (receipts and operational workspace)
- CRM Courses, Reports and Access administration
- CRM dashboard navigational actions
- Shared internal OrbitButton and internal CRM action classes

This changes CSS only, no JSX semantics, database, API, authentication,
role grants, workflows or LMS records. Keep informational badges,
programme-color charts, sidebar surfaces and *all destructive/red*
actions unchanged. Public login/student and academic LMS pages are out
of scope (shared root tokens are inert unless referenced).

## Rollout verification
Run full CRM Node regression suite and Next production build, review
CSS modules for specificity and destructive exclusion, deploy ONLY to
the Orbit CRM Vercel project `orbit-crm-lms`, and verify the live
routes. An authenticated visual sweep across modules should be done
after release (interactive staff UI is not accessible to anonymous
endpoint checks). Rollback by redeploying prior CRM build; no schema
migration or records to revert.
