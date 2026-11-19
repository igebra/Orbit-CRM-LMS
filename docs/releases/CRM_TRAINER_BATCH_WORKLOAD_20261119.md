# Orbit CRM Trainers — Active Batch Workload Overview (19 November 2026)

## Why
CRM Trainer directory previously showed Total, Active and Orbit Access, but
not the batch workload. Staff wanted to see which trainers handle how many
batches and filter quickly without navigating to each batch.

## Design and behavior
- Keep all existing Trainer directory, search, Actions (Edit, Report,
  Active/Inactive) and current mauve-purple action palette (#765BA3).
- Six lightweight KPIs: Total Trainers, Active Trainers, Orbit Access,
  Trainers Handling Batches, Trainers With No Batches, and Active Batches.
  The last displays how many are assigned.
- Table adds an **Active Batches** column containing a clickable count.
  Clicking it expands the specific trainer's **batch names and courses**.
- Simple filters: All, No batches (0), 1, 2–3, 4+; sorting by Name (A–Z),
  Most batches and Fewest batches. Search still works alongside the filters.
- Counts refer to **distinct active CRM batches, per trainer ID**.
  Existing `batches.trainer_id` and current, active
  `batch_trainer_assignments` are read together. A primary assignment
  also in the assignments table counts only once; multiple distinct trainers
  may each correctly be counted on the same batch.
  Stale/inactive or future-dated assignments are ignored.
- If the additional assignment history query is denied, primary assignments
  are still shown with a clear warning; if the Batches query itself fails,
  counts show **—** rather than misleading zeros.
- No schema changes, no CRM batch/trainer writes, no automatic LMS sync,
  and no changes to auth, permissions or Orbit LMS.

## Database validation at development
The CRM currently has 15 trainer records, 44 active batches, all 44 with
a primary Trainer ID and 14 distinct primary trainers. 44 active assignment
history rows overlap the primary Trainer assignments, so deduplication
is essential. One trainer has no active batch.

## Acceptance and deployment
CI: regression tests for distinct counting, assistant assignment,
date-bounded/inactive exclusion, linked user IDs, filtering/sorting; full
CRM tests + Next build. Review and merge to existing CRM repo/main; verify
Vercel production READY and Trainers page HTTP response. A final
authenticated UI check should verify filter and expanded names against
the CRM Batches page. The UI does not change assignments, data or LMS.

Rollback: revert CRM deployment; no migration required.
