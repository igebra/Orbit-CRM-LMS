# CRM Leads — Pastel palette refresh and +1 default (13 November 2026)

The CRM Leads screen uses the Orbit CRM softer pastel tones, shared with the
updated Students and Batches screens. Scope: Leads page CSS only. The new
presentation uses lavender, blue-gray, apricot, rose and warm cream accents;
old teal backgrounds and heavy legacy purple buttons have been replaced.
Primary actions are now a restrained mauve, with neutral inputs and a pastel
table header. All five lead metrics, follow-up actions, duplicate detection,
imports, role constraints and lead management logic are preserved.

## Phone default
The Add Lead form **already stored** United States as its default country and
`+1` as the default dial code, but the presentation was easy to overlook.
The country selection now has the explicit label "Phone Country / Dial Code",
and the Phone Number input shows the selected code in a distinct pale-lavender
prefix. Users may select a different country (UAE +971, Thailand +66, etc.),
which updates the dial code from the approved CRM country list.
Editing an existing lead continues to use its original country and dial code.
CSV import templates and existing data are not modified by this UI patch.

## Release
Run CRM regression tests and Next build. Deploy only CRM Vercel project
`orbit-crm-lms`; no Supabase migration, LMS changes or historical lead edits.
Verify live Leads route and an authenticated Add Lead preview. Use previous
CRM deployment as application rollback.
