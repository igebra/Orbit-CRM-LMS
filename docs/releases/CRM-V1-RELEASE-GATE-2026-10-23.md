# Orbit CRM v1 — Release gate / 23 October 2026
**Owner:** Orbit product team | **Target:** desktop-only CRM stabilization and reviewed deployment after 9 PM IST.
**Status:** PLANNED; current production unchanged. This is an objective, not a claim of completion.

## Verified starting position
- GitHub: `igebra/Orbit-CRM-LMS` `main`; Vercel: `orbit-crm-lms.vercel.app`.
- Vercel last production SHA: `41ac6230e6a4e2c367bb0a371dbc13a2e4be788d`. GitHub comparison vs `main`: **identical** on 23 Oct 2026.
- Live unauthenticated route responses: `/`, `/dashboard`, `/crm/leads`, `/crm/demos` return HTTP 200. This is **not** an auth/RLS acceptance test.
- CRM Supabase project `cgencwgfupijundbhpdv`; current 30 tables with RLS enabled; RLS policy behavior is NOT yet verified.
- Existing 16 leads are present in production; do **not** bulk-clean or overwrite.
- UI reference approved: pastel CRM Overview and light sidebar. Font rule approved: headings/KPIs **Plus Jakarta Sans**; all other interface **Inter**.
- Documentation review only: PR #2 against `develop`. Do not merge unfinished design work to `main`.

## Freeze — required for CRM v1
1. Preserve all existing, authorized sidebar navigation (Overview; CRM Leads/Demo Schedule; Students; Batches; Trainers; Payments; Courses; LMS handoff; Reports; Access; Portal Access; AQMATICS placeholder). Sidebars shown by role, not all to everybody.
2. Apply BRAND-003 visual tokens, approved Orbit logo, frozen BRAND-006 typography; no deviations. If exact new pastel token sign-off is still pending, record it and request product-owner approval before implementing code.
3. Redesign `/dashboard` overview (4 truthful KPIs, current lead distribution, source breakdown, recent leads, follow-ups, permitted activity, small mascot helper). **Keep existing useful operational modules discoverable**.
4. Do not add clickable non-existent routes: e.g. `/crm/follow-ups`, separate Marketing/Sales pages, Parents page or Settings unless implemented and tested.
5. Fix P0/P1 bugs found by role testing. No new standalone marketing module, historical funnel tracking, additional payment features, full mobile redesign, LMS/ByteXL UI changes, or bulk database migration in this batch.

## Known mismatch decisions
- Existing `leads.lead_stage` set: Fresh Lead / Contacted / Demo Scheduled / Demo Completed / Interested / Enrolled / Lost. Do **not** silently replace with prior proposed "Need to Call" etc; distinguish lead stage vs next action.
- `leads.next_follow_up_date` is date-only; do not display fabricated 10:30 AM reminders.
- Mockup funnel depicts history not currently proven by stage-transition data. Use accurately labelled **Current Lead Distribution**, not a misleading conversion rate.
- KPI trend must be computed from comparable prior periods or omitted; no invented +12%.
- CRM public GitHub repository: privacy/secrets review before inviting broader team. Local screenshots/fixtures must be synthetic.

## Work packets — sequenced (not everything in one commit)
| Packet | Work | Gate before next |
|---|---|---|
| A | Audit `main`/production parity, snapshot DB, list real nav items/roles | baseline & verified backup |
| B | Shared fonts, tokens, Orbit logo, light sidebar; preserve all navigation | build + sidebar parity + keyboard/role checks |
| C | CRM Overview components and real data adapters | KPI/source reconciliation, no fake follow-up times |
| D | CRM leads, demo schedule, follow-up path regression; critical bug fixes only | end-to-end role UAT |
| E | Security and release: RLS/API direct URL tests, secrets scan, backup verification, smoke tests | product-owner go/no-go |
| F | Approved production deployment after 9 PM IST, smoke tests and rollback marker | monitor, log deployment |

## Must-pass role UAT
- [ ] Superadmin: login, dashboard, lead create/edit, demo schedule, conversion, access management and sign-out.
- [ ] Sales: login, view allowed leads, follow-up and stage changes; no admin screens.
- [ ] Marketing: login, source/report access only as authorized; no financial or superadmin escalation.
- [ ] Unauthorized Student/Parent: direct CRM URL and data API requests fail; no CRM records exposed.
- [ ] All existing sidebar links present for each authorized role, no broken dead routes.
- [ ] Page/data loading, empty, error and retry states.
- [ ] No P0 security defects, no P1 broken core workflow.
- [ ] All overview metrics and report periods reconcile with actual authorized rows.
- [ ] All charts, labels, tables and buttons accessible with keyboard and real data.
- [ ] Colors contrast checked; font audit shows only Plus Jakarta Sans and Inter as intentional UI fonts.
- [ ] Desktop 1280, 1440 and 1680 widths; no unintended horizontal page overflow.
- [ ] CRM database usable restore/recovery point identified, not just nonzero file.
- [ ] `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` pass against the selected source with proper env; add automation later.
- [ ] Production alias, git commit SHA, deployment ID, DB migration checks and rollback destination recorded.

## Stop-the-line rules
- **No launch** if permissions leak CRM data, database backup is unverified, core flows are broken, or sidebar removes authorized existing functions.
- Open production to real-data operations **only after** smoke test with approved roles and data handling procedures.
- If the new overview is not ready, retain the existing live CRM while continuing development; do not market an unfinished build as finalized.
- No deploy before 9 PM IST; do not exceed approved one release/day/app. Never deploy a docs branch.

## Owner's next action
Run a short UAT using existing Superadmin/Sales logins (do not share passwords in chat); label each failure by screenshot/module. Product owner signs off P0/P1 and pending color signoff. Implementation uses a dedicated feature branch against `develop` and PR code review before merging to `main`.
