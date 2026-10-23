# UI-002 / UI-003 — Acceptance Test Checklist
**Scope:** desktop 1280, 1440, 1680 pixels; role-tested with synthetic user accounts only.
**Severity scale:** P0 security/data leak; P1 broken flow; P2 visual/accessibility; P3 polish.
**Gate:** Every must-pass test logged in master CRM + LMS change register; NO merge/deploy until signed off.

- [ ] UI-002 visual layout matches approved pastel CRM Overview
- [ ] UI-003 light sidebar has Orbit logo; nav icons consistent; no dark-gradient remnants
- [ ] Login/role render never flashes unauthorized navigation
- [ ] Parent/student have zero CRM route/API access, including direct URL
- [ ] Superadmin/Sales/Marketing/Management have only approved menu items and data
- [ ] Every nav destination is valid; coming-soon is visibly inert
- [ ] Existing Leads and Demos routes still work; no regressions to payments, courses or operations
- [ ] Period filter uses explicit organization timezone and consistent date boundaries
- [ ] Dashboard KPI count reconciles with authorized CRM data; no sample data in production
- [ ] True historical funnel not shown unless stage-event history is verified; otherwise labeled distribution
- [ ] Source counts/percentages reconcile; null sources included
- [ ] Due follow-ups distinguish date-only storage; no fabricated times
- [ ] All action buttons have real destinations/actions; help card cannot invoke placeholder
- [ ] Empty/loading/error/retry states for each card
- [ ] Keyboard navigation, focus visibility, alt/labels, status-not-color-only
- [ ] Plus Jakarta Sans on all headings/KPIs; Inter for all other UI including CRM, LMS, ByteXL
- [ ] Desktop page has no horizontal overflow; table scroll contained
- [ ] No private contacts displayed to unauthorized role
- [ ] No unapproved database migrations, source changes or deployments
