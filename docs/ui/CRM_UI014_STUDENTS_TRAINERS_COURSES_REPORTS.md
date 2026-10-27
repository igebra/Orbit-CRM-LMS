# CRM UI-014 — Student Onboarding, Trainer Numbering, Course Mascot, Reports

Date: 26 October 2026  
Status: implemented on preview branch; production and authenticated user acceptance pending.

## Students / Add Student
- Preserve existing optional lead conversion, full name, grade, parents, email, phone and initial course.
- Add optional **Student Notes** textarea; persisted in `student_enrollments.notes`. Notes appear in existing student profile; if a course isn't selected, ask for an initial course rather than silently discard notes.
- Add optional **Add a Payment Plan** expander only to authorized admins/Sales.
- Plan setup requires an existing Active batch and matches its course. Explicitly enroll student in the course and batch; call existing `ensure_payment_plan_for_entry` with USD amount, monthly/quarterly/etc type, installment and plan start date.
- Existing RPC enforces role and batch membership; existing finance table/policy is used. Fee plan then appears in Student Profile and Payments, without automatically creating a payment transaction.
- Do not silently create duplicate students after a partial-save failure. Show a clear warning if student saved but later enrolment, batch, plan or lead conversion did not complete.
- Existing backend roles and production tables unchanged; no migration.

## Trainers
- Default list sorted alphabetically (case insensitive) by trainer name, then by stable UUID for ties. S.No 1…N uses filtered and sorted screen order, rather than an inconsistent raw database sequence.

## Courses
- Small original approved yellow Orbit mascot in header; preserve white navigation/sidebar, soft pastel cards and frozen fonts.

## Reports
- Trainer, Attendance, Batch Progress tabs.
- 40px controls, neutral white filter card, compact 3 summary tiles, light pastel top strokes, flat numbered S.No report tables, proper accessible focus.
- Preserve date filters, trainer/batch filter, existing reports RPCs and CSV download. No new report data fabricated.

## Pre-production checklist
- On authenticated development preview: Add Student manual; lead-linked; notes with course; fee plan attached to Active batch; student detail fee plan and notes; payment module; role checks.
- Trainer S.No sorted alphabetically after filtering; course mascot visible; Reports: run 3 categories and download CSV.
- Test with approved QA users in safe environment; never create dummy financial transactions in production.
- Existing one-per-day release control, after 21:00 IST only. Preview-ready alone is not production approval.
