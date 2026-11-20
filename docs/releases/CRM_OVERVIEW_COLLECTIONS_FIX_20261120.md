# CRM Overview – Monthly Collections source correction (20 November 2026)

## Bug
Overview showed $0.00 although Payments showed received November 2026 receipts.
Overview used the legacy `payment_report_transactions` RPC only. Manual
Record Payment entries are stored in `crm_manual_payments`, and the Payments
page uses `crm_received_payment_report_v2` which includes both legacy and
manual records.

## Fix
- CRM Overview uses the **same RPC** as Payments, with current month's
  first day through today (matching the Payments page date filter).
- Excludes voided records and converts all supported payment currencies
  to **indicative USD** using the same `monthlyRevenueEquivalent` helper
  and existing `/api/fx/latest` ExchangeRate-API endpoint.
- Does not add USD and INR amounts directly; conversion uses a single
  dated reference rate snapshot, with the same limits and safety rules as
  the Payments page.
- No receipts after a successful RPC = real $0.00.
- Report failure or missing FX for nonempty receipts = **—** with an
  explanatory note, not a misleading $0.00.
- Counts and payment records remain untouched; no CRM schema or RLS changes.
- The Upcoming Classes card and Orbit LMS are outside this focused fix.

## Live pre-fix reference
For 1–20 Nov 2026 (CRM project `cgencwgfupijundbhpdv`):
9 USD receipts totaling $1,176; one INR receipt totaling ₹5,500;
legacy payment transaction rows = 0; no voided receipts in that period.
The FX endpoint responded with a 20 Nov reference rate of
1 USD = 93.372746 INR. This rate is a dated indicative reference and not
a settlement or tax exchange rate. Live values will change as payments or
the reference rate change.

## Validation
Run the CRM regression tests and Next.js build in CI.
Check Overview Collections against Payments' monthly USD equivalent using
the same date, receipts and FX snapshot. Confirm no invented $0 when
RPC / FX fail. Deploy CRM only to `orbit-crm-lms`, verify pages respond
and no new runtime errors. Authenticated final visual QA remains pending.
