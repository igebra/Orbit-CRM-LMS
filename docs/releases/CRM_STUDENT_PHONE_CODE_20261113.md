# CRM Add Student: editable country code (13 November 2026)

The Add Student modal now shows an editable country-code input (default +91) alongside a separate local phone-number field. The country-code input offers suggestions based on the CRM Lead phone-country list, including +1, +971, +65, +66, +61, +64 and +45. Users can also type a different valid 1–4 digit international dial code, including deleting or replacing the +91 default.

When a CRM lead is selected, the country code and local number are prefilled separately from that lead. The complete phone number is assembled before insertion as a single string such as `+91 9876543210` in the existing `students.phone` field, preserving the current database schema, API contracts, LMS integration and historical student records. No lead contact data or existing student phone numbers are rewritten.

The phone number stays optional. When supplied, it must contain 4–15 digits exclusive of country code; invalid code/number combinations raise a form error before creating a student. The existing finance-plan and lead-conversion logic is unchanged.

Release checks: CI Node regression suite + TypeScript production build, CRM-only Vercel deploy, check authenticated Add Student with default +91, custom +971 and link-existing-lead prefill. Rollback previous CRM deployment. No database rollback required; no fake students are created in production for QA.
