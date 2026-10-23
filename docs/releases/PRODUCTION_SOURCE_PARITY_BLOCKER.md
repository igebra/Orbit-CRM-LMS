# CRM production-source parity blocker — 2026-10-23

**Status:** Must resolve before production promotion. Current CRM production should remain untouched until exact source and data flows are reconciled.

## Finding
- Production screenshot supplied by the product owner shows modules titled **Active enrolments by programme**, **Lead pipeline**, **Needs attention**, **Quick actions**, **Collections & delivery**, plus contextual greeting.
- GitHub `main` at commit `41ac6230e6a4e2c367bb0a371dbc13a2e4be788d` has a materially **different `app/dashboard/page.tsx`**: older `Orbit Overview` with metrics, Today's Focus, Quick Access.
- Vercel deployment metadata shows that same Git commit SHA, but actual deployed source contains additional course family/enrolment aggregation code **not found in GitHub main**. The deployment may have been made from local modified source with Git metadata set to the prior commit.
- Therefore **GitHub SHA metadata parity does NOT establish deployed source parity**. This was previously assumed; that assumption is corrected here.

## Required reconciliation
1. Locate the exact source used to deploy current CRM (likely local VS Code workspace / Vercel deployment source).
2. Diff `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`, `app/components/OrbitSidebar.tsx`, `app/lms.module.css`, `app/globals.css`, plus feature/support files against GitHub main and this PR.
3. Create a reviewed branch containing that exact source, preserving all existing operational metrics and deep links, and then reapply approved design elements to that baseline.
4. Complete logged-in role/UAT tests and only then merge/deploy after 9 PM IST.

**No auto-deploy or merge into main until parity is proven.** Existing production data and flows must not regress.
