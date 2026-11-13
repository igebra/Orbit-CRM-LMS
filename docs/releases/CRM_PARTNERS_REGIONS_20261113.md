# Orbit CRM — Partners, international time zones, lead countries (13 November 2026)

## Requested changes
- Add Partners: Srini Vemula, Chiranjeevi M, Venkat M.
- Remove prior Partner dropdown entries: Hari Vangala, Vijay Devuluru.
  ("Vijay Stay" was not found in the existing dropdown; Vijay Devuluru is the
  existing Vijay entry and is therefore removed.) Other partners retained.
- Add schedule time zones for Thailand (Bangkok), New Zealand (Auckland),
  Australia (Sydney/Melbourne, Brisbane, Perth, Adelaide),
  Denmark (Copenhagen), and Dubai (UAE). Preserve all existing USA/India zones.
- Add the relevant Phone Country options to Add/Edit Lead: New Zealand (+64)
  and Denmark (+45); Thailand, Australia, and UAE (+971) already existed.
  Display the UAE entry as "UAE / Dubai" while retaining the historical
  stored country name "UAE".
- Add an optional IANA-based Preferred Time Zone dropdown to Add/Edit Lead,
  preserving historical nulls. The lead time zone does not automatically
  schedule a demo or change a class time.

## Data protection
The Partner list is an Add/Edit Lead UI choice, not a separate partner table.
No lead/partner rows are deleted or overwritten. Legacy partner values
remain visible if editing old records.

The existing `leads_with_duplicate_status` view did not expose
`partner_name`. The migration appends `partner_name` and
`preferred_timezone` to the existing security-invoker view without altering
the duplicate-detection expressions or existing column order.
This allows editing lead records while preserving the original partner value.

## Rollout
1. Run CRM build/test CI and review migration.
2. Apply `sql/migrations/20261113_crm_lead_preferred_timezone.sql` ONLY
   to CRM Supabase project `cgencwgfupijundbhpdv`; not LMS.
3. Verify original lead row count and existing lead view row count unchanged;
   verify view remains `security_invoker=true`.
4. Deploy reviewed CRM branch to production Vercel `orbit-crm-lms`.
5. Authenticated admin/sales smoke tests: Add Lead → Partners, new country
   codes, optional time zone; Edit Lead retains existing partner; Demo and
   Batch create/edit time zone choices; Trainer time zone list.
6. Date/time conversion uses IANA names, including NZ/Denmark/Australia DST
   changes. **Australia has multiple time zones**; use the city-specific
   choice rather than assuming one nationwide offset.

No automatic CRM→LMS batch sync or LMS deployment is included.
Rollback: redeploy previous CRM application; nullable database column and
appended view columns are backward-compatible, so no destructive rollback.
