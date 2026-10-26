# Orbit CRM — Payments V1 Design Freeze

**Approved by product owner:** 26 October 2026.  
**Status:** UI FROZEN for the first release candidate; functional acceptance testing remains pending.  
**Implementation:** `app/payments/page.tsx` + `app/payments/payments-workspace.module.css`.  
**Visual reference:** User-approved Payments layout showing management KPI cards, programme collections, student fee ledger and right-rail payment entry.

## Frozen V1 composition
1. White sidebar (operational navigation first; access/admin options last).
2. Neutral `#F8FAFB` page, Plus Jakarta Sans headings and Inter all other UI.
3. Finance header with date range and prominent "Record Payment" action.
4. Tabs: Overview; Monthly Ledger; Payment History; Fee Plans & Renewals; Outstanding; Reports.
5. Four summary cards (expected/agreed fee plans, collected in period, current pending, overdue).
6. Math / AiEdge / Coding4AI collection cards built exclusively from Supabase transactions and authorised fee plans.
7. Flat, searchable student fee ledger with paid, pending, due date, status and permitted action.
8. Right-hand payment-entry form, quick statistics and recent transactions.
9. Approved yellow Orbit mascot as a small, decorative quick-stats element.
10. Retain edit/delete transaction, delete fee plan, CSV export and superadmin audit functions.

## Mandatory accounting & safety constraints
- No generated/fictional student payments or conversion rates.
- Backend finance RPC columns are in **USD**; do not label them INR or mix currency types.
- `Expected` is **full agreed plan value**, NOT monthly expected collections; schedule-based monthly expected and dual-currency ledger require separate backend work and approval.
- Collected is a selected-period payment total; pending and overdue show current plan balances. Time basis must remain clear.
- Marketing sees current-month collected information only, with payment entry and outstanding access restricted.
- DB writes, RLS policy changes and production deployment require separate review.

## Gate before releasing
- Screenshot-level desktop visual review of logged-in view against approved mockup.
- Cross-role auth QA (Superadmin / Sales / Finance / Management / Marketing / CX as provisioned).
- Real payment-entry, edit/delete, audit log and CSV export QA using safe test data; no test write to production.
- Reconcile GitHub CRM source with live production source; approved one-release/day after 9 PM IST.
- Changes to the frozen layout only through a product-owner approved change request.

## Related work
Course catalogue updates are a separate CRM module and **do not unfreeze Payments**.
