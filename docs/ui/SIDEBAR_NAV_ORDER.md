# UI-003A — Sidebar ordering and admin section

**Decision date:** 2026-10-23  
**Status:** Approved ordering principle, for Orbit CRM, Orbit LMS and ByteXL.  
**Goal:** Everyday operational work first; administrative / Superadmin control tools at the bottom, immediately above the signed-in profile and Sign out. This is ordering only: **do not remove, rename arbitrarily, or change authorization for any existing working navigation item**.

## Universal design rules
- Section 1: primary work modules / frequent actions.
- Section 2: secondary operational/support modules / existing integration links.
- Section 3: `ADMINISTRATION` grouping with a subtle divider, visible **only** when the verified role is authorized for at least one contained item.
- Profile and Sign out stay in the footer below Administration.
- `super_admin`-only actions last within Administration; other admin-authorized items above those.
- Administrator-only items must never appear to Trainer/Parent/Student/Sales/Marketing unless the underlying module's existing permission expressly authorizes them. Role-based *visibility* must reflect server-side permissions; cannot grant authority.
- All normal functionality, routes, breadcrumbs, active selection, badges and nested menus must survive reordered navigation.
- Upcoming admin functions (User Management, Settings, Audit Logs) are not shown until implemented and authorized.
- Distinct apps remain independent: don't turn CRM nav into LMS internal pages and vice versa. Existing functional cross-product links are retained until approved navigation changes.
- The ByteXL programme uses this hierarchy but **the same frozen Plus Jakarta Sans and Inter fonts**, and its known partner theme where approved.

## Orbit CRM proposed display order
| Display sequence | Section | Exact item | Status |
|---|---|---|---|
| 1 | WORKSPACE | Overview | Existing `/dashboard` |
| 2 | WORKSPACE | CRM > Leads, Demo Schedule | Preserve nested menu and routes |
| 3 | WORKSPACE | Students | Retain for authorized roles |
| 4 | WORKSPACE | Batches | Retain |
| 5 | WORKSPACE | Trainers | Retain |
| 6 | WORKSPACE | Courses | Retain |
| 7 | WORKSPACE | Payments | Retain for permitted roles |
| 8 | WORKSPACE | Reports | Retain |
| 9 | WORKSPACE | LMS | Preserve existing access/link pending independent CRM/LMS cross-app audit |
| 10 | WORKSPACE | AQMATICS (Soon) | Preserve inert placeholder; no broken clickable route |
| 11 | ADMINISTRATION | Access | Retain existing verified admin authorization |
| 12 | ADMINISTRATION | Portal Access | Retain existing verified admin authorization |
| 13 | FOOTER | Account, Sign out | Always after authorized Administration links |

**Important:** Access and Portal Access are currently allowed to both `admin` and `super_admin` in GitHub main. Do not mislabel these as strictly Superadmin-only; position them at end as administrative tools. If true Superadmin-only audit controls are added later, place them after these two.

## Orbit LMS proposed display order
**Admin/Superadmin operations (based on current LMS `OrbitSidebar.tsx`):**
1. Overview
2. Students
3. Batches
4. Trainers
5. Courses
6. Curriculum & Resources (do not silently break/change existing route; future displayed copy must follow approved `Course Details` terminology where relevant)
7. Attendance
8. Homework
9. Any existing and authorized ByteXL/programme items **at their current accessible location**; do not create placeholder broken route

**ADMINISTRATION** divider immediately above account footer:
- Portal Access — currently `admin` and `super_admin`
- Access Requests — currently `super_admin` only
- Login Activity — currently `super_admin` **and** additional existing email allowlist; preserve both checks until reviewed

**Trainer LMS:** Overview, My Batches, My Classes, Attendance, Homework, Resources. No Administration group if role has no authorized administration links.

**Student/Parent and ByteXL learner portals:** normal assigned learning/programme links only, no administration grouping unless a legitimate authorized admin capability exists.

## Acceptance tests / release block
- [ ] Screenshots of existing sidebar for each role captured before the feature is merged.
- [ ] Every existing sidebar menu and submenu item accounted for; **zero missing authorized links**.
- [ ] Superadmin-only items appear after operational links, before profile/signout.
- [ ] Other authorized admin functions remain visible where current permissions allow them.
- [ ] Non-admin roles never see unauthorized administration controls; typing URL also cannot access privileged data.
- [ ] Active item and nested CRM menu retained after reorder; use `aria-current="page"` and `aria-expanded`.
- [ ] All existing links lead to their approved routes; placeholders are non-clickable and marked Coming Soon.
- [ ] Desktop sidebar can independently scroll when necessary; bottom admin section and footer remain reachable.
- [ ] Role changes/signout clear cached nav and do not flash stale privileges.
- [ ] BRAND-006 fonts strictly unchanged; verified across CRM/LMS/ByteXL.
- [ ] No production deploy until full sidebar parity/role UAT passes.

**Implementation status:** specification only as of this change; not yet deployed.
