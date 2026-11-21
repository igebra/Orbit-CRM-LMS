# CRM → LMS automated batch sync (2026-11-21)

## Ownership

- **CRM source:** batch creation; batch title, course, scheduled start and timezone, batch default class weekdays, frequencies, planned sessions, duration, end date, recurring Zoom link, status, capacity, notes; student roster membership on shared batches.
- **LMS source:** primary/assistant trainer assignments (mirrored back to CRM), individual lessons and reschedules, attendance, homework, recordings and academic history.
- New CRM batches may select an **initial trainer**. On creation LMS resolves it by active trainer email. All changes *after creation* to the trainer must happen in LMS.
- CRM batch deletion is **not** propagated as destructive deletion to LMS, to preserve attendance and homework. Deletion/archiving policy requires a separate safe archive workflow.

## Delivery

Reuse CRM `orbit_integration.crm_sync_outbox`, pg_net dispatcher and pg_cron retry to the existing authenticated LMS endpoint. Backfill `enqueue_existing_crm_batches()` only after the LMS endpoint and columns are deployed. Retry on missing student/batch dependency. No credentials in source.

Batch names are NOT used to merge records. Shared UUIDs are authoritative. Existing LMS-only batches stay untouched.

A change to default batch scheduling in CRM does NOT modify LMS individual class sessions already created. For class rescheduling use LMS class tools.

## QA

- Validate 43 preexisting shared batches and 48 memberships; preserve two LMS-only batches.
- Confirm initial new CRM batch appears in LMS once, with correct Zoom and timezone.
- Change the CRM Zoom URL; verify only batch-level Zoom changes in LMS.
- Mark CRM student assignment and ensure the new roster entry appears in LMS (and safe removal).
- Confirm LMS trainer assignment still flows back to CRM and isn't overwritten by administrative updates.
- Check both outboxes and any 409 records; never silently discard a failed event.
