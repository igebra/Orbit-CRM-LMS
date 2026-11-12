# CRM Payments: original currency support for 7 countries (12 Nov 2026)

## Requested
Add five countries and their ISO 4217 currencies to the current USD and INR payment entry:
- United Arab Emirates (Dubai): AED (د.إ), UAE Dirham
- Singapore: SGD (S$), Singapore Dollar
- Thailand: THB (฿), Thai Baht
- Australia: AUD (A$), Australian Dollar
- New Zealand: NZD (NZ$), New Zealand Dollar

The Currency dropdown shows code, symbol, currency name and country, and the Amount label updates with the selected symbol. This does **not** create or infer a student's nationality/country; it only records the currency actually received.

## Accounting semantics
- Persist the exact received amount and ISO currency in `crm_manual_payments.amount_received` and `currency`.
- For USD only, `amount_usd = amount_received`. For all other currencies, `amount_usd IS NULL`. No assumed exchange rates and no mixing currencies in sums.
- Payment history, correction/edit, method/course breakdown and CSV preserve currency. Display totals in separate currency cards (USD/INR always visible, others when recorded) and show unique foreign-dollar currency codes in reports.
- Legacy historical `payment_transactions` remain USD-only and unchanged. Manual payments continue existing audited edit/void flows and same role security.
- No new tables, data deletion, RLS relaxation, payment creation, or source-of-truth change.

## Coordinated rollout
1. Run CRM PR tests, Next.js build, and inspect diff.
2. Apply `sql/migrations/20261112_crm_payment_seven_currencies.sql` to **CRM** Supabase `cgencwgfupijundbhpdv` ONLY. No LMS schema changes.
3. Read back native check constraint and trigger/edit RPC. Confirm currently saved payments remain unchanged.
4. Merge reviewed branch and confirm Vercel production target `orbit-crm-lms`.
5. Test entry/edit as authorised Finance/Admin with non-production synthetic data in staging; check AED/SGD/THB/AUD/NZD payment history, reports, CSV, audit; confirm USD legacy corrections.
6. After deployment, verify production page and runtime errors. Do not create fake production payments to test.
7. Rollback: revert CRM Vercel deployment. Leave widened DB constraint compatible with existing USD/INR-only UI; do not delete newer foreign-currency receipts or reapply restrictive check while they exist.

## CRM access
Existing permission checks, trigger-created_by, RLS and audit trigger remain in place. User-selected currency never determines authorization.
