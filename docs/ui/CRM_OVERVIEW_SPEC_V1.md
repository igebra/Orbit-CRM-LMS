# CRM Overview Page — Implementation Specification v1
**Change IDs:** UI-002, UI-003, BRAND-007  
**Existing route:** `/dashboard` (keep URL; no redirect break).  
**Reference:** approved pastel overview mockup, **not a literal feature-complete app**.  
**Status:** UX/design spec only; no production code changes.

## 1. Desktop composition
```
┌────────────────┬───────────────────────────────────────────────────────────────┐
│ Orbit logo     │ CRM Overview    Search [planned]          Alerts / Account   │
│                ├───────────────────────────────────────────────────────────────┤
│ [Overview]     │  Total Leads │ Demos Scheduled │ Enrolled │ Follow-ups Due   │
│ Leads          ├───────────────────────────────┬────────────────┬──────────────┤
│ Follow-ups*    │ Lead Funnel                   │ Lead Sources   │ Helper/Mascot│
│ Demo Schedule  ├───────────────────────────────┴────────────────┼──────────────┤
│ Students       │ Recent Leads table                            │ Follow-ups   │
│ Trainers       │                                               ├──────────────┤
│ Reports        │                                               │ Team Activity│
│ Access         │                                               │              │
│ [User/signout] │                                               │              │
└────────────────┴───────────────────────────────────────────────┴──────────────┘
* Dedicated Follow-ups route remains proposed; existing functionality currently sits in Leads.
```
- Sidebar: 248px, light surface, selected overview pill in pale cyan.
- Main padding 24px or 32px; header 28px Plus Jakarta Sans, secondary label 13-14px Inter.
- KPI row: 4 equal columns with min card 215px if content permits; gap 16px.
- Data upper row: lead funnel ~48%, lead sources ~30%, mascot card ~22%. At 1280px, may show 2 columns and flow the helper card to subsequent row **without mobile-specific design**.
- Lower: recent leads ~65-70%, right widgets ~30-35%; 16px gaps. Avoid chart/table clipping.
- Card white `#FFFFFF`, 1px `#DCE5E8` border, 16-20px radius, subtle shadow. Topbar height ~84px.
- Use approved Orbit wordmark in sidebar, avatar/name in topbar. Mascot card at most one per dashboard; no animated distraction.
- Buttons and menu cannot visually promise unimplemented actions; disabled/planned controls need clear non-clickable treatment.

## 2. KPI definitions and reconciliation
**Dates:** choose current month as a visible default; all period-based metrics recompute on change; default organization reporting timezone must be confirmed. Use **consistent denominator** across funnel cards and chart. Do not apply month filter to some cards and lifetime to others without labeling.
| KPI | Proposed definition | Existing source | Risk or decision |
|---|---|---|---|
| Total leads | Visible, authorized leads created within selected period | `public.leads.created_at` | RLS scope |
| Demos scheduled | Leads with `demo_scheduled_at` within period, optionally excluding cancelled (not yet modeled) | `leads.demo_scheduled_at` | May differ from stage = "Demo Scheduled" |
| Enrolled | Leads with `converted_at` within period and/or `lead_stage='Enrolled'` | `leads.converted_at`, `lead_stage` | Confirm canonical conversion metric; do **not** double count |
| Follow-ups due | Non-closed leads with `next_follow_up_date <= local today` regardless of creation date | `leads.next_follow_up_date` | Distinguish due vs overdue; exclude Enrolled/Lost under current schema |
| Δ vs previous | ((current - prior) / prior) ×100 when prior >0 | Derived | If prior=0, label "No prior comparison", never +∞% |

Existing stages visible in audited `app/crm/leads/page.tsx` are **Fresh Lead, Contacted, Demo Scheduled, Demo Completed, Interested, Enrolled, Lost**. Previously requested "Need to call", "Awaiting response", "Email Sent" etc may represent **next action** rather than conversion stages. This is a product-model decision, not a cosmetic rename.

## 3. Funnel semantics — blocking decision for implementation
- Funnel in mockup shows `New Leads → Need to Call → Demo Scheduled → Enrolled`. These are **not presently a verified mutually exclusive or sequential stage model**.
- We must define cohort-based transitions or a stage-mapping table before drawing a mathematical funnel. Current `leads.lead_stage` stores a single current stage, so a true historical conversion funnel needs event history / stage transitions, not merely today's stage counts.
- **Safe v1 fallback:** "Current Lead Distribution" segmented bars by existing `lead_stage`, with accurate status counts, no implied conversion progression.
- Adopt a real historical conversion funnel only after state transitions and time boundaries are tracked and tested.

## 4. Source donut / lead sources
- Group `public.leads.lead_source` by permitted records for the chosen period.
- Show actual taxonomy; do not hardcode Website / Social Media if source values differ. Map raw values to normalized labels only with approved deterministic lookup and an "Other" group.
- Include `Unspecified` for null/empty source.
- Render accessible summary table/list with counts and percentages; total matches selected lead denominator; rounding may differ 1%.

## 5. Recent leads table
**Overview preview only (not replacement for full leads table).** Proposed fields:
`Student`, `Parent`, `Contact`, `Course`, `Stage`, `Follow-up`, `Open`; at max 5-7 latest permitted leads.
- Source currently uses `child_name` in DB; **display "Student"** in UI without database rename until migration planned.
- Row link opens existing Leads detail route/dialog; implementation verifies actual destination, cannot link to missing `/crm/leads/[id]` route.
- On narrow desktop, horizontally scroll table **inside** its panel, never the whole page.
- Respect privacy policy: mask contact/phone for roles lacking explicit permission and in screenshots.
- Approved full Leads table schema from prior review: `S.No, Course, Student, Parent, Contact, Stage, Follow-up`; Overview preview may be slimmer but never add unauthorized fields.

## 6. Follow-up list
- Source: `leads.next_follow_up_date` joined to authorized lead info; future follow-up actions in `lead_activities` are activity history, not standalone reminders until modeled.
- Visual 4-6 rows, overdue first (if explicitly enabled), then today/upcoming.
- `next_follow_up_date` is a **date**, not a timestamp; do **not** invent clock hours as shown in mockup! Show `Today`, `Tomorrow` or locale date until time scheduling is stored.
- Clicking follow-up opens lead/follow-up action using the working existing flow; no fake phone/SMS shortcuts.

## 7. Team activity
- `lead_activities` has `created_by`, `action_type`, `notes`, `created_at`. Join against approved staff directory using roles/RLS.
- Render permitted summaries only; never render untrusted notes as HTML.
- Do not claim a lead **changed stage** unless an auditable event records it. If nothing available, friendly empty state.

## 8. Mascot help panel
- Approved yellow 3D mascot; ~120-160px visual size; soft blush/mist surface.
- Compact helpful copy; primary action may open functional filtered Leads list with due follow-ups.
- Hide decorative help buttons until matching functional routes exist; link must be tested.
- Alt text only if informative; if helper copy communicates same content, decorative image alt can be blank.

## 9. Role-aware dashboard behavior
- Superadmin: permitted operational KPIs, leads, follow-ups, activity. Additional admin widgets can remain where required.
- Sales: own/assigned leads as determined by actual RLS (not an unverified `assigned_to` string filter); follow-ups / assigned pipeline.
- Marketing: only approved marketing/attribution metrics and authorized lead fields, no broad payment or sensitive records unless approved.
- Management viewer: read-only permitted summary; no edit/delete.
- Parent/student/trainer: cannot access CRM Overview, even via URL; LMS has separate shell/context.
- Cross-db CRM→LMS aggregate card must use approved integration contract, not cross-database joins from client.

## 10. Component props (TypeScript contract)
```ts
type DataState<T> =
 | { status:"loading" }
 | { status:"error"; message:string; retry?:()=>void }
 | { status:"empty"; message:string }
 | { status:"ready"; data:T };
type Kpi = { id:string; label:string; value:number|null; unit?:"count"|"currency"|"percent";
  trend?: { deltaPct:number|null; comparisonLabel:string }; icon:string; href?:string };
type FunnelStep = { key:string; label:string; count:number; pctOfBase:number|null };
type SourceBreakdown = { source:string; count:number; fraction:number };
type FollowUpItem = { leadId:string; studentLabel:string; dueDate:string; state:"overdue"|"today"|"upcoming"; summary?:string };
type LeadPreview = { id:string; student:string; parent:string; course?:string; stage:string; nextFollowUp?:string|null };
type ActivityEvent = { id:string; actorLabel?:string; actionLabel:string; createdAt:string; leadId?:string };
type OverviewModel = {
  period:{ from:string; to:string; timezone:string };
  kpis: DataState<Kpi[]>;
  leadChart: DataState<FunnelStep[]>;
  sources: DataState<SourceBreakdown[]>;
  recentLeads: DataState<LeadPreview[]>;
  followUps: DataState<FollowUpItem[]>;
  activity: DataState<ActivityEvent[]>;
};
```

## 11. Acceptance test matrix
| ID | Case | Expected |
|---|---|---|
| CRM-OV-01 | Authorized role visits `/dashboard` | Light sidebar + full overview; no unrelated CRM sections for restricted users |
| CRM-OV-02 | Change date range | KPI/chart/source use consistent period |
| CRM-OV-03 | Compare dashboard with filtered `leads` | Exact totals; no invented data |
| CRM-OV-04 | Prior comparison denominator zero | No fake trend percentage |
| CRM-OV-05 | Source null/malformed | "Unspecified" bucket; sum matches denominator |
| CRM-OV-06 | No activity/followups | Clear empty state; no sample placeholder |
| CRM-OV-07 | Network failure on one card | Scoped error and retry, other cards remain usable |
| CRM-OV-08 | User clicks recent lead | Opens permitted existing lead record |
| CRM-OV-09 | Logged-out/student/parent URL visit | No CRM data; redirect/403 with server-side protection |
| CRM-OV-10 | Sidebar keyboard/active/hover/collapse | WCAG/keyboard and accurate aria-current |
| CRM-OV-11 | 1280/1440/1680 desktop | No clipped chart, horizontal page overflow or unreadable table |
| CRM-OV-12 | Verify actual fonts | Plus Jakarta Sans headings; Inter all other UI; ByteXL no deviations |
| CRM-OV-13 | Fake mockup values absent | Actual data or empty states, never sample people |
| CRM-OV-14 | Follow-up only has date | Shows date not a fabricated 10:30 AM time |

## 12. Gaps relative to current CRM source
- Sidebar currently `app/components/OrbitSidebar.tsx` uses dark treatment and symbol glyph icons. New light shell is a deliberate replacement when approved, not a change during audit.
- Dashboard currently `app/dashboard/page.tsx` shows broad operational metrics, not the approved CRM-first layout; preserve required metrics and determine which migrate to a secondary Operations page instead of deleting them.
- Existing `app/crm/leads/page.tsx` contains leads/follow-up workflows; the mockup's distinct Follow-ups tab is a pending feature, not a verified route.
- Existing CRM login/sidebar styling and lead stage taxonomy differ from new brand and status proposals; mapping needed before implementation.
- GitHub main/source may differ from deployed application: baseline actual deployed source and local workspace before any production roll-out.

**This file is specification only. Do not merge it as a functional change and do not deploy from the documentation branch.**
