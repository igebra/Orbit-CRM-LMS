# CRM Batches — programme summary (12 November 2026)

## Purpose
Add a compact, read-only Math / AiEdge / Coding4AI summary to the existing
Orbit CRM Batches screen, preserving the current Total / Running / Weekday /
Weekend operational cards, actions, source records and access rules.

## Live CRM baseline before change
- Total: 44 batches, of which 44 are Active.
- Math: 33 active batches including Geometry and AP Pre-Calculus.
- AiEdge: 2 active batches.
- Coding4AI: 9 active batches.
- These sum to the 44 active CRM batches.

## Behaviour
- Count existing CRM `batches` rows by canonical `course_name`, only where
  `status='Active'`. Do not add second queries, models, or write operations.
- Cards visually match the CRM blue-and-pastel palette, not the LMS gold.
- Selecting one programme filters the existing batch table; selecting it again
  or clicking Show all restores the full list.
- Existing metrics always show the full CRM operational totals, regardless of
  table filter. Completed/paused batches remain in full table view.
- Unknown courses count under a separately indicated Other figure rather than
  silently classifying as Math.

## Data ownership
This feature reads the *existing* CRM batch read model. It does not create a
second CRM batch database, edit schedules, or implement real-time CRM/LMS batch
synchronization. The long-term architecture designates LMS as academic-delivery
source of truth. Differences between CRM and LMS must be handled separately
through a reviewed synchronization mechanism.

## Release checks
Run Node tests, TypeScript, Next production build. Verify Batches as an
authenticated CRM staff user, mouse/keyboard controls, mobile wrap, selection,
Show all reset, and original Add/Open/Delete. Confirm CRM Vercel target is
`orbit-crm-lms` and never deploy this change to `orbit-lms`. Rollback through
the preceding CRM Vercel deployment; no database rollback required.
