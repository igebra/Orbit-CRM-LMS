# Orbit CRM UI-015 — table readability, legacy names and brand alignment
Date: 27 October 2026
Status: preview candidate (no production merge).

## Changes delivered
- Access Management: all five existing access requests have blank names. Resolve saved names from user_profiles by matching emails if available, otherwise display email username with explicit "Name not provided" label. Never invent identities or change permissions.
- Access: better email column width, centered S.No, destructive actions with accessible red bin icon.
- Trainers: stable alphabetical ordering, fixed nine-column spacing, no broken S.No or Actions; small approved yellow mascot.
- Demo Schedule: reduce twelve crowded columns to nine with course+duration, students, local+IST time, attendance, trainer/team, status, Zoom and actions; space rows and align controls; approved yellow mascot.
- Shared OrbitDeleteButton/OrbitNavIcon trash symbol across Leads, Students, Batches, batch roster, Demos, Payments, Access and Portal Access. Existing confirm dialogs and permissions unchanged.
- Keep white sidebar, #F8FAFB workspace, Plus Jakarta Sans + Inter, muted teal #286F7A and soft pastel accents. Small mascot only.

## QA still required
- Authenticated UI QA on 1366px and 1600px desktops for trainer columns, demo dates and Access emails.
- Verify delete confirmations and RBAC on all affected modules.
- Verify saved names vs the email-based provisional label.
- Leads stay full width with no horizontal page scroll. Demo must not compress data at narrower desktop widths.
- No production data writes in UAT; production release only after 21:00 IST, one per day.
