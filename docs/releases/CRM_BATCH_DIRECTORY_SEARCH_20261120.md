# CRM Batches searchable directory — 20 November 2026

## Request
Add the same simple search experience already available on CRM Trainers
to the CRM Batches page, retaining the existing programme filter,
four operational summary KPIs, batches-by-programme cards, Add Batch,
Open and Delete actions.

## Behaviour
- Search input above the directory table, in the existing CRM mauve style.
- Search-as-you-type, case-insensitive: batch name, course, trainer, status
  and enrolled learner names; whitespace-separated terms can match across
  different fields (for example, 'Math Gargi 06').
- Search and programme selection operate together.
- 'Clear filters' resets the search and programme selection together.
- Shows 'Showing X of Y batches' with the selected programme and a
  descriptive empty state for unmatched searches.
- Total/Running/Weekday/Weekend KPIs and programme cards always use the
  full batch dataset so typing a search cannot change global totals.
- Search is read-only, changes no batch records, assignments, or LMS files;
  no schema or permission changes.

## Validation
Regression tests cover matching/search combinations, empty query,
no-match state, consistency of summary totals, and unchanged Add/Delete
actions. Run existing CRM regression suite and production build; merge
through PR and deploy CRM production only. The final authenticated
browser interaction check remains necessary after deployment.
