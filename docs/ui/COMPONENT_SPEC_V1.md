# BRAND-007 — Orbit Reusable UI Component Specification (v1.0)
**Status:** Design specification for review, NOT implemented.  
**Applies to:** Orbit CRM, Orbit LMS, ByteXL (desktop web only for this iteration).  
**Reference:** approved CRM Overview concept + soft, light left sidebar.  
**Product rules:** BRAND-005 logo and mascot; BRAND-006 typography (FROZEN); BRAND-003 soft pastels (proposed pending formal sign-off).  
**Engineering:** Next.js 16, React 19, TypeScript, CSS Modules or approved shared styles; no new UI dependency until reviewed.

## 0. What is approved and what is not
- **Approved design direction:** CRM Overview layout with light sidebar, topbar, KPI cards, lead funnel, source chart, recent leads table, upcoming follow-ups, team activity and small mascot help card.
- **Approved:** left sidebar visual treatment and arrangement, standard component reuse between applications, official Orbit logo and mascot, typography.
- **NOT yet approved for live implementation:** precise values of proposed pastel theme, all new routes, backend changes, new chart dependencies, rollout timing.
- **Strict rule:** This document is a contract, not a request to deploy or to replace live functionality. Do not change the live CRM/LMS until test findings are reviewed and a separate implementation batch is authorized.

## 1. The shared component architecture
Use *one design language* implemented as versioned components in each repository, not a shared authentication or database layer. CRM and LMS remain separate applications/databases.
```
OrbitAppShell
  ├── OrbitSidebar
  │    ├── OrbitBrandLockup
  │    ├── OrbitNavGroup / OrbitNavItem / OrbitNavBadge
  │    └── OrbitSidebarAccount (sign out)
  ├── OrbitTopbar (page title, search, notifications, identity)
  └── OrbitPageContainer
       ├── OrbitPageHeader / OrbitDateRangeFilter
       ├── OrbitKpiGrid / OrbitKpiCard
       ├── OrbitPanel / OrbitPanelHeader / OrbitEmptyState / OrbitErrorState
       ├── OrbitFunnelChart / OrbitSourceDonut
       ├── OrbitDataTable / OrbitStatusChip / OrbitAvatar
       ├── OrbitFollowUpList / OrbitActivityFeed
       └── OrbitMascotHelp
```
Shared primitive layer: `OrbitButton`, `OrbitIconButton`, `OrbitTextField`, `OrbitSelect`, `OrbitBadge`, `OrbitTabs`, `OrbitModal`, `OrbitToast`, `OrbitSkeleton`, `OrbitTooltip`. For CRM/LMS/ByteXL, the same component API and behavior is required; only role-scoped accent tokens and content slots change.

### 1.1 Proposed component source ownership (implementation phase)
- `components/orbit/ui/`: pure reusable primitives, no Supabase calls.
- `components/orbit/shell/`: topbar, sidebar, responsive content grid; consumes resolved role-safe nav config.
- `components/orbit/dashboard/`: reusable business visualization and data table compositions.
- `lib/orbit-ui/tokens.ts` / `styles/orbit-tokens.css`: semantic tokens; app-specific adapter can map colors.
- `features/crm/overview/`: data mapping, role-aware fetching, domain aggregations, page composition.
- Storybook (optional later) or documented isolated preview; no production dependency added until approved.
- React components must not contain direct database authorization logic; data hooks/adapters must use existing approved security checks, and privileged queries stay server-side.

## 2. Design tokens (from brand guide, exact approved typography)
| Token | Proposed default | Notes |
|---|---|---|
| `--orbit-bg` | `#F8FAFB` | light app canvas |
| `--orbit-surface` | `#FFFFFF` | main cards |
| `--orbit-surface-muted` | `#F0F4F5` | neutral secondary |
| `--orbit-border` | `#DCE5E8` | delicate divider |
| `--orbit-text` | `#263D46` | readable neutral |
| `--orbit-text-secondary` | `#52656F` | secondary |
| `--orbit-action` | `#286F7A` | primary action color |
| `--orbit-active-nav` | `#D9EBF1` | sidebar active background |
| `--orbit-pastel-cyan` | `#B6DEE5` | KPI/source |
| `--orbit-pastel-blush` | `#E8C4D9` | KPI/source |
| `--orbit-pastel-lavender` | `#DDD0E7` | KPI/source |
| `--orbit-pastel-mint` | `#CDE4D7` | KPI/source |
| `--orbit-pastel-butter` | `#F5E8B8` | gentle accent |
| `--orbit-heading-font` | `'Plus Jakarta Sans'` | mandatory on all 3 apps |
| `--orbit-body-font` | `'Inter'` | mandatory on all 3 apps |
| `--orbit-space-{1,2,3,4,6,8}` | `4,8,12,16,24,32px` | 4px base grid |
| `--orbit-radius-{sm,md,lg,xl}` | `8,12,16,20px` | consistency over decoration |
| `--orbit-shadow-card` | `0 4px 18px rgba(38,61,70,.045)` | understated |
| `--orbit-focus` | `2px solid #286F7A` | 2px offset, needs contrast check |

Semantic states need foreground/background/border tokens for: neutral, info, success, warning, danger. Final HEX pairs require accessible contrast validation on real components before production.

### 2.1 Typography — mandatory, no exceptions
- Plus Jakarta Sans: page title 28px/700; section 20px/600; card 16px/600; KPI 28-32px/700.
- Inter: sidebar 14px/500; body 14-15px/400; table 14px/400-500; buttons 14px/600; form labels 13-14px/500; auxiliary 13px/400.
- Font source: `next/font/google` or shared self-hosted font loading approved by legal/engineering; do not ship third-party typefaces intentionally.
- Respect reduced motion and numeric tabular figures; no typeface deviation for ByteXL, partner pages, charts, modal, PDF/email templates authored by product.

## 3. OrbitAppShell (UI-CMP-001)
**Purpose:** consistent visual frame for all authorized web areas.  
**Slots:** `sidebar`, `topbar`, `breadcrumbs?`, `children`, `alerts?`.  
**Desktop geometry:** 248px expanded sidebar; content min-width 0; page horizontal padding 24-32px; content grid max 1600px; sidebar at full viewport height with own scroll area; content scroll independent where supported. No viewport-wide horizontal overflow.  
**Background:** `--orbit-bg`; cards on `--orbit-surface`. Sidebar itself is **light / white**, not the old dark gradient.  
**Product logo:** approved Orbit logo in top-left, sufficient clearspace, 150-170px wide at expanded width; link to role's authorized home.  
**Behavior:** loading shell never flashes unauthorised menu items; identity changes and sign-out invalidate any cached role/nav state.  
**Responsive scope:** desktop 1280/1440/1680 tested; mobile navigation deferred, no accidental mobile promises.

## 4. OrbitSidebar and nav (UI-CMP-002)
**Approved visual:** light left panel; simple single-line icons + labels; selected item pale cyan/blue rounded pill; quiet hover; no thick outlines or deep shadows; white/divider footer; compact user avatar.
- Width 248px; horizontal padding 12-16px; header min height 84px; nav item 42-44px height, 10-12px horizontal padding, 12px radius, 10-12px gap, 18-20px icon.
- Include top-level **Overview**. Role-appropriate navigation is a *capability-filtered configuration*, not hardcoded for every user.
- Primary active state: `#D9EBF1` fill, dark readable text and a selected-state affordance beyond color (`aria-current="page"`).
- Icons use one coherent line-icon set; emoji/symbol glyphs in current sidebar are to be replaced.
- Child navigation: indented group, 38px row, disclosure chevron; `aria-expanded`; keyboard operation. Expanded preference may persist per user if safe.
- Badge only for actionable counts (e.g., pending access); cap visually `99+`; accessible label announces actual count.
- **Never render inactive/unauthorized modules as clickable.** Hide unauthorized items entirely; optionally show an intentional `Coming soon` item only when product-approved (no dead-end buttons).
- Header may show product section label `CRM` or `LMS`; role is sourced from verified session/permissions, not user editable profile metadata.
- Footer: initials/avatar, actual display name if available, role, `Sign out`; handle long email/name with truncation and tooltip.
- RTL/localization not in current desktop scope; keep semantic markup ready.

### 4.1 Proposed CRM menu mapping — reconcile before implementation
| Mockup item | Existing verified CRM route | Implementation condition |
|---|---|---|
| Overview | `/dashboard` | Keep and redesign |
| Leads | `/crm/leads` | Keep |
| Demo Schedule | `/crm/demos` | Keep; label may be "Demos" |
| Follow-ups | Existing follow-up functionality is currently inside Leads; `/crm/follow-ups` not present in audited GitHub main | New dedicated route requires separate functional sign-off |
| Students | `/students` | Retain only where currently permitted |
| Parents | **No verified separate sidebar route in audited CRM source** | Do not invent route |
| Trainers | `/trainers` | Role-gated |
| Marketing | **Not verified as independent route** | Proposed, cannot be clickable until built |
| Sales | **Not verified as independent route** | Proposed, cannot be clickable until built |
| Reports | `/reports` | Role-gated |
| Settings | **No verified `/settings`** | Do not invent |
| Access | `/access`, `/portal-access` | Show to authorized admins |
| Batches/Courses/Payments/LMS | Various existing paths currently referenced by the CRM sidebar | Retain existing access until split ownership / cross-app navigation confirmed; don't delete by visual redesign |

**Critical CRM/LMS separation:** Parent/student must never get CRM access. Do not turn the conceptual mockup's "Parents" or "LMS" menu into unauthorized CRM data access. Navigation visibility is never a substitute for RLS/API authorization.

### 4.2 Data contract (side bar)
```ts
type OrbitNavItem = {
  id: string; label: string; href?: string; icon: string;
  children?: OrbitNavItem[]; badge?: { count: number; ariaLabel: string };
  capability?: string; status?: "active" | "planned";
};
type OrbitSidebarProps = {
  product: "crm" | "lms"; items: OrbitNavItem[]; pathname: string;
  account: { displayName: string; roleLabel: string; email?: string };
  onSignOut: () => Promise<void>;
};
```
Sidebar handles visual composition only; server/session adapter supplies fully authorized `items`.

## 5. Reusable component registry
| ID | Component | Required props / slots | Required states | Notes |
|---|---|---|---|---|
| UI-CMP-001 | `OrbitAppShell` | sidebar, topbar, children, alerts | loading/ready/error | light shell |
| UI-CMP-002 | `OrbitSidebar` | items, pathname, account, onSignOut | active, hover, focus, disabled/planned | role-scoped |
| UI-CMP-003 | `OrbitTopbar` | title, subtitle?, search?, notifications?, user | default, search/empty/loading | don't claim search works unless wired |
| UI-CMP-004 | `OrbitPageHeader` | title, description, actions | default, busy | heading hierarchy |
| UI-CMP-005 | `OrbitKpiCard` | label, value?, icon, tone, delta?, href? | loading, normal, empty, error | no invented trends |
| UI-CMP-006 | `OrbitPanel` | title, helperText?, action?, children | loading, empty, error, data | header reuse |
| UI-CMP-007 | `OrbitFunnelChart` | steps, period, onSelect? | loading, empty, data, error | accessible table fallback |
| UI-CMP-008 | `OrbitSourceDonut` | sources, period, total | loading, empty, data, error | percentages add ~100 |
| UI-CMP-009 | `OrbitDataTable` | columns, rows, rowKey, actions, pagination | loading, empty, data, error | sortable/keyboard |
| UI-CMP-010 | `OrbitStatusChip` | semanticStatus, label | static | text + color, role scoped |
| UI-CMP-011 | `OrbitFollowUpList` | entries, onOpen, onViewAll | empty, due, overdue, error | timestamps/timezone |
| UI-CMP-012 | `OrbitActivityFeed` | events, onOpen? | empty, data, error | no fake actor attribution |
| UI-CMP-013 | `OrbitMascotHelp` | message, asset, primaryAction? | compact, hidden | only when action works |
| UI-CMP-014 | `OrbitDateRangeFilter` | from, to, timezone, onChange | valid, invalid, updating | no silent filter resets |
| UI-CMP-015 | `OrbitButton/Field/Modal/Toast` | variant/size/validation | hover, focus, disabled, loading, error | primitives |

## 6. Interaction and accessibility standards
1. WCAG AA target; validate actual normal text contrast >=4.5:1; large text and non-text UI >=3:1 where applicable.
2. Keyboard tab sequence follows reading order: sidebar -> topbar -> filters -> KPI -> content. Escape closes menus/dialogs; focus restored after modal.
3. All actionable elements are real buttons/links. Search, alerts, notification count, phone or mail icons cannot be decorative clickable controls.
4. Data states **loading/skeleton**, **empty**, **error with retry** and **success** are part of every data component's contract.
5. Use `aria-current="page"`, labelled icon-only buttons, chart textual alternatives, table `<th scope="col">`, and visible focus rings.
6. Truncate only presentation text; full values available on focus/hover or detail view. No data hidden solely by a tiny chart.
7. Status chip text remains visible. Colors consistent across roles, but semantic status not the same as role accent.
8. Dates are displayed with locale and organization timezone; storing/retrieving UTC, explicit daylight-saving handling.
9. When table data is sensitive, never embed hidden raw records into chart props or client bundles. Respect account permissions in query/data scope.
10. Use `loading`/disabled treatment for actions that mutate records; prevent duplicate submissions.

## 7. Implementation acceptance criteria
- UI-002: desktop Overview matches approved composition and is fully populated from permission-scoped CRM APIs.
- UI-003: all CRM sidebar destinations are valid, properly highlighted and strictly role gated.
- BRAND-006: computed font family proves Plus Jakarta Sans for all headings/KPIs and Inter for all other interface elements **including ByteXL**.
- BRAND-003: selected semantic token set used consistently, no hard-coded neon surfaces.
- NAV-01: only one active link, route reflects selected state, sign-out invalidates cached role.
- NAV-02: parents, students, unauthorized roles cannot fetch any CRM data by manually typing URL.
- DATA-01: filtered KPI/funnel/source counts reconcile with permitted lead records for a fixed date range.
- DATA-02: funnel and stage mapping is explicitly approved; no fabricated conversion rates or 0 used as a substitute for errors.
- DATA-03: recent lead row opens verified lead record; action icons work or are not shown.
- DATA-04: due follow-ups correctly distinguish overdue, today and upcoming according to timezone.
- A11Y-01: keyboard-only navigation, screen reader names and visible focus pass.
- TEST-01: visual review at 1280px, 1440px and 1680px; no horizontal overflow in the page shell.
- SAFE-01: no breaking DB changes or release before audit approval; screenshots contain synthetic data only.

## 8. Change-control integration
- `BRAND-007`: this component spec.
- `UI-002`: CRM Overview approved composition.
- `UI-003`: left sidebar approved visual direction.
- Separate engineering tickets for each missing route/data adapter.
- Create actual React components in a feature branch only after test backlog freeze. Review via PR -> `develop`; deploy only after 9PM IST under one-approved-release-per-app rule.

**Design reference:** pastel CRM dashboard mockup shared during Orbit CRM LMS 06 chat; visual intent only, mock numbers/people are not production records.

## BRAND-008 geometry and interaction freeze
The authoritative shared-size, spacing, radius, icon and state specification is [`COMPONENT_STANDARDS_BRAND_008.md`](COMPONENT_STANDARDS_BRAND_008.md) with exact values in [`component-tokens.json`](component-tokens.json). These rules are **FROZEN** across CRM, LMS and ByteXL. If this older component proposal differs (e.g. radius/control sizing), **BRAND-008 supersedes it**. Product-owner hold: KPI height and six-across layout remain unresolved; don't impose a new KPI height during makeover.
