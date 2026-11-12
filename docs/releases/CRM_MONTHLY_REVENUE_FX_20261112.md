# Orbit CRM – Month-to-date revenue equivalents in USD and INR

## Product intent (2026-11-12)
Show a compact "This Month's Revenue" panel on the **CRM Payments** page
that displays *the same real recorded collections* as an indicative USD value
and indicative INR value. Preserve the native-currency receipt cards and
history/report totals for USD, INR, AED, SGD, THB, AUD and NZD.

## Verified FX source
[ExchangeRate-API Open Access](https://www.exchangerate-api.com/docs/free)
offers free keyless daily USD-base reference rates, allows commercial
conversion and caching, and **requires visible attribution** to
`https://www.exchangerate-api.com`. It does not provide bank settlement
rates or a guarantee of current transaction-level rates.

Server endpoint: `app/api/fx/latest/route.ts` fetches
`https://open.er-api.com/v6/latest/USD` through a 24-hour Next.js fetch
cache. It validates all seven currencies and USD base, checks the source
timestamp (rejects older than 4 days), returns only rates and update date.
No customer/payment information or API key is sent to the provider.
Client displays attribution and rate update date. On provider failure,
equivalents are not fabricated and the UI displays an unavailable message.

## Revenue semantics
The existing finance RPC `crm_received_payment_report_v2` supplies
recorded receipts with original currency. The new panel always requests
month start to **today**, independent of any table filters, using the same
per-role authorization. It excludes voided receipts.
For each amount in currency C and USD-base rate r[C]:
- USD equivalent = amount / r[C]
- INR equivalent = USD equivalent * r[INR].
All conversions use a **single daily reference snapshot** for an
indicative present-day valuation; no original receipt is changed and
no FX amount is persisted to Supabase.
A learner invoice/fee plan, balance, or expected revenue is never counted.
"Revenue" here means **cash collected / recorded receipts** and is
not revenue recognition, accounting settlement or taxable FX valuation.
For formal monthly close, use dated settlement/bank booked rates and
preserve the FX source/rate alongside each payment under a separate
reviewed finance feature.

## Verification and rollback
- Tests for seven currencies, missing rates, duplicate receipts, voiding,
  UI independence from filter date range, source attribution and caching.
- Run `node --test tests/*.test.mjs` and `npm run build`.
- Confirm currency-specific reporting and manual payment entry are unchanged.
- Vercel release ONLY to CRM project `orbit-crm-lms`. No LMS deployment
  or Supabase schema change.
- After launch, check the panel with a finance role, displayed FX date and
  month-to-date numbers, and confirm reporting period filters do not alter it.
- On error revert CRM deployment; no database migration or rollback required.
