# BRAND-008 — Orbit Shared UI Component Standards (FROZEN v1.0)

**Approved:** 23 October 2026. **Applies without exception:** Orbit CRM, Orbit LMS, ByteXL — including Superadmin, Sales, Marketing, CX, Trainer, Parent, Student and ByteXL views. **Implementation scope:** desktop web; phone/tablet layouts are not approved in this phase.

**Source of truth:** this file defines the *dimensions, spacing, radii, icons, common UI state behavior and accessibility* for all new/refactored Orbit screens. BRAND-006 typography remains frozen: **Plus Jakarta Sans** for headings/KPIs; **Inter** for navigation, data, buttons, labels, inputs, helper text, diagrams, charts, status chips and all programme views.

### Decision boundary
- **Frozen in this standard:** buttons, fields, spacing scale, radii, border/shadow treatment, icon language and sizes, focus/hover/pressed/disabled/loading/error/success behaviors, navigation basics, table density, modal mechanics.
- **Separately approved:** light CRM sidebar, 248px width and admin controls last; original Orbit logo and mascot; CRM Overview *visual composition*.
- **Deliberately ON HOLD:** KPI card height and whether all six KPI cards form one row or two. Do **not** force 82px or a six-column layout through this standard until the product owner resumes that decision.
- **Palette:** use semantic neutrals from BRAND-003 for CRM, with previously approved role accents for LMS and the separately approved ByteXL partner accents. Palette-level BRAND-003 status remains subject to its separate freeze decision, without changing this geometry contract.
- **Migration:** existing functionality and RBAC are preserved during restyling. No blind global CSS overrides to rush styling, no permission-changing UI redesign and no production deployment without acceptance tests.

## 1. Component sizes (CSS pixels)
| Component | Small / Dense | Default (standard) | Large / Prominent | Exact rule |
|---|---:|---:|---:|---|
| Text button | 32px tall | **40px tall** | 44px tall | Default for all Add/Save/Submit/Import/Create/Schedule/Cancel; all roles |
| Icon-only button | 32 × 32px | **40 × 40px** | 44 × 44px | Tooltip + accessible name mandatory |
| Input, select, searchable dropdown | 36px tall | **40px tall** | 44px tall | Form rows align with buttons |
| Search field | — | **40px tall** | 44px tall | Can flex horizontally, never fixed width across screen |
| Textarea | min 88px | **min 112px** | auto | Resize vertical; associate label and error |
| Sidebar navigation row | 40px | **44px min-height** | — | Inter 14/500, 18px line icon |
| Sidebar nested navigation row | 36px | **38px min-height** | — | Inter 13/500 |
| Table row | 40px | **48px min-height** | 56px | Dense mode only when text/controls fit; never clip wrapped values |
| Table header | — | **40px min-height** | — | Inter 12/600, no serif |
| Status chip | 24px | **26px tall** | — | 11–12px Inter 600 |
| Tabs / segmented options | 32px | **36px tall** | 40px | Active and focus states distinct |
| Avatar | 32 × 32px | **36 × 36px** | 40 × 40px | Decorative unless interactive |
| Toast / banner | — | min 44px high | content height | No layout-breaking absolute positioning |
| Dialog close control | — | **40 × 40px** | — | Always button, labeled "Close" |
| KPI cards | — | **ON HOLD** | — | Do not conflate KPI card height with the above controls |

**Button text:** Inter 14px/600; compact button 13px/600. 16px inline icon, 8px icon-to-text gap; horizontal padding 16px default, 12px compact, 20px large. Buttons should be content-width except designated full-width form CTAs. Full-width buttons in narrow dialogs remain allowed.

## 2. Reusable spacing scale
Use a **4px base grid**, with named spacing tokens rather than ad-hoc paddings.
| Token | px | Primary use |
|---|---:|---|
| `space-0` | 0 | No gap |
| `space-1` | 4 | Tiny visual alignment |
| `space-2` | 8 | Icon gap, chip/list gaps |
| `space-3` | 12 | Small card internals, form-control gaps |
| `space-4` | **16** | Default panel padding and component gap |
| `space-5` | 20 | Dense toolbar / form groups |
| `space-6` | **24** | Page padding; section spacing |
| `space-8` | 32 | Larger section spacing, spacious pages |
| `space-10` | 40 | Dialog group separation |
| `space-12` | 48 | Rare hero/opening sections |

**Defaults:** main page horizontal padding 24px on desktop (32px acceptable for spacious view if grid stays coherent); grid gap 16px; card content padding 16px; form field spacing 12–16px; label-to-input gap 6–8px; panel-heading-to-content 12px; paragraph line-height ~1.5. Inline content uses 8px. Avoid blanket `margin: 30px` etc.

## 3. Corner radii, borders and shadows
| Token | px | Used for |
|---|---:|---|
| `radius-sm` | **8px** | Chips, inner menus, compact buttons |
| `radius-md` | **10px** | Buttons, inputs, selects, toolbars, table action buttons |
| `radius-lg` | **16px** | Panels, tables, cards |
| `radius-xl` | **20px** | Modals/dialogs, larger overview compositions |
| `radius-pill` | **9999px** | Pills, avatars or explicitly capsule-style components |

Standard border: 1px solid `#DCE5E8` for CRM neutral surfaces (theme-specific neutral border for other portals). White surface on neutral `#F8FAFB` page. Use a **subtle card shadow only**: `0 4px 18px rgba(38,61,70,0.045)`; do not use thick 3D borders/drop-shadows on form buttons. Dividers 1px neutral. Tables use light row dividers.

## 4. Icon standard — same library in all applications
**Approved design-system icon family: Lucide-style outline icons**, preferably the `lucide-react` package when engineers explicitly approve the dependency. An existing shared inline SVG icon wrapper is acceptable if shapes follow the same outline language; no emoji, icon fonts, Unicode symbols or mixed outline/filled families for standard navigation.

| Location | Render size | Stroke |
|---|---:|---|
| Inline with buttons / input adornment | **16px** | 1.75–2px |
| Sidebar nav / nested nav | **18px** | 1.75–2px |
| Default action/card icon | **20px** | 1.75–2px |
| Larger KPI/panel illustration icon | **24px** | 1.75–2px |
| Decorative mascot, illustrations | asset-specific | Do not treat mascot as nav icon |

Same concepts always map to the same approved glyph (Overview=LayoutDashboard or House; Leads=ListFilter; Students=GraduationCap/Users; Batches=CalendarDays; Trainers=UserRoundCheck; Courses=BookOpen; Payments=Wallet; Reports=ChartNoAxesCombined; Access=ShieldCheck; LMS=BookOpenCheck; Settings=Settings; Close=X; Delete=Trash2; Edit=Pencil). Pick **one** in each pair when implementing and keep that mapping shared, not page-by-page variation. Draw icons from named imports and central registry. Avoid rendering icons that imply inactive buttons.

## 5. Button variants & exact behavior
| Variant | Style | Examples |
|---|---|---|
| **Primary** | Solid muted teal `#286F7A`; white text | Add, Save, Schedule, Publish |
| **Secondary** | White with 1px neutral border, teal text | Cancel, Import, View all |
| **Tertiary/Ghost** | Transparent with dark/teal text; hover soft-neutral fill | Row actions, dropdown triggers |
| **Danger** | Neutral/white destructive outline, deep red text | Delete (after confirmation) |
| **Link** | Text/chevron only, underline on hover where useful | Open reports, View all |

- **Default state:** predictable placement and semantics; no mislabelled or inert clickable controls.
- **Hover:** soft tint or slightly stronger border; do not shift layout, resize button or cause heavy motion.
- **Pressed:** contrast-appropriate darker fill; no old extruded/3D `box-shadow: 0 5px 0` effect.
- **Keyboard focus:** visible 2px solid `#286F7A` outline plus 2px offset, or role-theme-accessible equivalent. Never remove focus indicator.
- **Disabled:** real `disabled` attribute when possible; reduced contrast but label still readable, cursor `not-allowed`; explain reason nearby when necessary. Not hoverable/clickable.
- **Loading:** busy indicator with retained button width, `aria-busy`, prevent repeated submit; button label remains comprehensible (e.g. “Saving…”).
- **Success:** show confirmation/toast, updated UI state and/or navigated record; do not flash success before server reports completion.
- **Error:** persistent actionable inline error with retry or correction; no generic silent failure.
- **Destructive:** confirmation step displaying what is being deleted; privileges revalidated by backend; disabled while pending.

## 6. Field/control states
- **Labels stay visible** above controls; placeholders supplement but do not replace labels.
- Normal: 1px neutral border; text Inter 14/400, label Inter 13–14/500; helper Inter 13/400.
- Hover: slightly emphasized border; focus: visible focus ring with accessible text color.
- Validation error: error border + short error text associated with `aria-describedby` and `aria-invalid=true`; never color alone.
- Read-only: readable with explicit affordance; disabled: disabled semantics and alternate explanation when needed.
- Select options / autocomplete: keyboard arrows/Enter/Escape; loading/empty/no matches message; menu should not be clipped by modal.
- Checkbox and radio: visible selected, unselected, hover, focus, disabled, indeterminate where applicable. Labels clickable.
- Date/date-time: timezone label where relevant, stored values never reformatted misleadingly; date-only follow-ups must **not** show fake times.

## 7. Panels, tables, modal mechanics
- Panels: `radius-lg`, 16px padding (can use 20px for premium overview sections); 1px border, optional subtle shadow. `h2` Plus Jakarta Sans 20/600, `h3` 16/600.
- Tables: header 40px and rows minimum 48px; sticky header for scrolling data-heavy lists; horizontal scrolling **inside table panel only**, no whole-page overflow; consistent 12px header and 13–14px body; status chips textual.
- Row action buttons generally **Small 32px**, consistent label hierarchy; never hide critical operations inside unannounced icons.
- Dialogs: `radius-xl`; max width 480/720/960px depending on content; max height 90vh with internal scroll; sticky header/footer for long scheduling forms; backdrop not too opaque; focus trap, Escape close, restore focus, close button 40px. Unsaved work dismissal requires confirmation when applicable.
- Drawer and dropdown: same radii/borders; layer/z-index tokens rather than arbitrarily large values; respect portal positioning.
- Toolbars: same 40px control height, wrap or scroll within toolbar without hiding filters; search input flexes.
- Empty states: explanatory copy and ONE clear next step (add/import or clear filters), decorative mascot only where approved.
- Alerts/toasts: neutral/info/success/warning/error pairings; message text mandatory, not color alone.
- Charts: accessible text/table fallback and real data; no invented percentages or synthetic records.

## 8. Standard states mandatory for every component
| State | Requirement |
|---|---|
| Default | Approved colors, fixed dimensions, meaningful label |
| Hover | Subtle feedback on actual interactive elements |
| Keyboard focus | Visible accessible ring, correct logical order |
| Pressed/selected | Distinct from hover; accessible state semantics |
| Active navigation | Tinted background + readable label + `aria-current="page"` |
| Disabled/read-only | Correct semantics, legible content, no accidental action |
| Loading | Skeleton or spinner, preserves layout and suppresses repeated writes |
| Empty | Descriptive message and relevant action |
| Success | Confirmed status and current data displayed |
| Error | Inline explanation and appropriate retry |
| Warning/destructive | Clear warning, confirmation and safe cancellation |
| Permission denied | No data leak, backend enforced, honest UI response |

**Accessibility gate:** aim for WCAG 2.2 AA, normal text >=4.5:1 contrast and large text/nontext boundaries >=3:1 where applicable; keyboard-only walkthrough and labelled icon controls. 32px compact controls are *visual dimensions for dense desktop data tables*, subject to 2.5.8 pointer-target spacing/exceptions; use 40px controls in regular forms, navigation and primary actions.

## 9. Acceptance checklist before UI implementation / merge
- [ ] Shared token JSON and this document agree exactly; no programme-specific dimension/font exceptions.
- [ ] The same default button appears 40px high in CRM, LMS and ByteXL; small=32 and large=44.
- [ ] Input/button alignment, 16px grid gap, 16px card padding, neutral background and radius rules verified.
- [ ] All icons use one outline language, render at 16/18/20/24px as specified.
- [ ] Active, hover, focus, loading, disabled, success and error states manually verified on primary flows.
- [ ] Cross-role UI does not expose unauthorized admin navigation.
- [ ] Existing working flows/routes remain preserved; admin tools remain at sidebar bottom.
- [ ] All screens remain legible with the two frozen fonts (Plus Jakarta Sans + Inter), never serif fallback by intentional design.
- [ ] Leave the separate **KPI card height/layout HOLD** untouched pending user decision.
- [ ] Migrate component-by-component through feature PRs; test and deploy under the approved post-9-PM IST release process. Documentation approval ≠ production rollout.

**Enforcement:** UI changes must import or implement these shared tokens; review any exception in a PR as an explicit product-owner change request, not an undocumented one-off.
