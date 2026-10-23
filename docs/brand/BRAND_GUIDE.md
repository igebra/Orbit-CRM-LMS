# Orbit Brand & Visual Design Guide
**Version:** 1.0 • **Date:** 2026-10-23 • **Applies to:** Orbit CRM, Orbit LMS, ByteXL
**Source-of-truth status:** Typography = FROZEN; approved Orbit logo/mascot = FROZEN; BRAND-003 application palette = PROPOSED pending final design sign-off.

> **Mandatory no-font-deviation rule:** Every screen, form, card, chart, table, navigation element, message, modal, login page, email/PDF template authored for Orbit, and ByteXL interface uses **Plus Jakarta Sans** and **Inter** only. No programme, role or partner exception. Browser fallback fonts are permissible only during load failure or for unsupported glyphs, never as intentional design substitutions.

## 1. Brand architecture
- **igebra.ai:** corporate parent identity; bright original colors reserved for parent-brand marks, approved logo assets and selected marketing.
- **Orbit:** shared application identity for CRM + LMS, using an approved Orbit orbital-O logo with the blue mascot replacing the letter "i".
- **ByteXL:** a programme inside Orbit LMS; it may keep its approved partner/role accent colors, **not separate fonts or a separate component language**.
- Never modify or redraw the approved logo casually. Preserve aspect ratio, whitespace and transparent versions.
- Desktop web is the current implementation scope. Mobile redesign is deferred, not silently assumed complete.

## 2. Original igebra.ai palette (parent brand)
| Token | Color | Hex | Status / usage |
|---|---|---|---|
| `brand.cyan` | Bright cyan | `#00AEEF` | Verified flat color in supplied logo |
| `brand.magenta` | Magenta | `#EC008C` | Verified flat color in supplied logo |
| `brand.yellow` | Yellow | `#FFCA07` | Sampled from logo icon |
| `brand.red` | Red | `#EC1D29` | Approximate visual match; verify against vector source |
| `brand.purple` | Purple | `#A24886` | Approximate visual match; verify against vector source |
| `brand.grey` | Charcoal grey | `#5A595C` | Verified logo body text |
| `brand.greyLight` | Light grey | `#D3D3D3` | Verified logo brackets |
| `brand.white` | White | `#FFFFFF` | Verified image surface |

*Original corporate colors are not the default colors for large app surfaces, data tables or CTA buttons.*

## 3. BRAND-003 soft pastel application palette (PROPOSED)
| Token | Hex | Intended application |
|---|---|---|
| `primary.dustyCyan` | `#B6DEE5` | Brand tint, navigation selection, decorative surfaces |
| `primary.mutedTeal` | `#286F7A` | Primary interactive buttons, links, focus accent |
| `primary.deepSlate` | `#263D46` | Headings, dark text, strong contrast |
| `pastel.blush` | `#E8C4D9` | Marketing, supporting KPI |
| `pastel.lavender` | `#DDD0E7` | CX / Operations, related learning panels |
| `pastel.butter` | `#F5E8B8` | Warnings/rewards backgrounds, mascot companion |
| `pastel.powderBlue` | `#D9EBF1` | Informational surfaces |
| `pastel.sage` | `#CDE4D7` | Success/supporting surfaces |
| `pastel.apricot` | `#F3D7C5` | Warm accents |
| `neutral.page` | `#F8FAFB` | Default canvas |
| `neutral.card` | `#FFFFFF` | Cards, tables, forms |
| `neutral.section` | `#F0F4F5` | Soft section background |
| `neutral.border` | `#DCE5E8` | Borders/dividers |
| `neutral.secondaryText` | `#52656F` | Secondary text |
| `neutral.primaryText` | `#263D46` | Main text |

**Application composition target:** roughly 70% neutral, 20% pastel, 10% high-contrast functional accents; use color semantically, not decoratively. All form text and table content must remain readable without color alone.

## 4. Role accents
| Role | Accent | Status |
|---|---|---|
| Superadmin | `#D8E2E7` | Proposed mist grey |
| Sales | `#B6DEE5` | Proposed dusty cyan |
| Marketing | `#E8C4D9` | Proposed blush |
| CX / Operations | `#DDD0E7` | Proposed lavender |
| Trainer | `#CDE4D7` | Proposed sage |
| Student | `#B49AB2` | **Previously approved** dusty mauve |
| Student text | `#493A50` | **Previously approved** |
| Student supporting | `#DCB7C9`, `#B8D5DD`, `#E8D9AF` | **Previously approved** |
| Parent | `#E5BA98` | **Previously approved** apricot |
| Parent text | `#294E50` | **Previously approved** |
| Parent supporting | `#DCE9E5`, `#FBF6F0` | **Previously approved** |
| ByteXL | Approved programme purple/pastel palette | **Carry forward existing exact tokens**. Confirm hex codes from original approved ByteXL source before inserting; **do not guess or overwrite**. |

Accent colors are not authorization indicators: access is controlled in backend permissions, not through theme.

## 5. BRAND-006 typography (FROZEN - applies to CRM, LMS and ByteXL)
| Element | Font | Desktop size | Weight |
|---|---|---:|---:|
| Page title | Plus Jakarta Sans | 28px | 700 |
| Section heading | Plus Jakarta Sans | 20px | 600 |
| Card heading | Plus Jakarta Sans | 16px | 600 |
| KPI number | Plus Jakarta Sans | 28-32px | 700 |
| Sidebar | Inter | 14px | 500 |
| Body | Inter | 14-15px | 400 |
| Table cells | Inter | 14px | 400-500 |
| Buttons | Inter | 14px | 600 |
| Form labels | Inter | 13-14px | 500 |
| Secondary information | Inter | 13px | 400 |

- Preferred loading: Next.js `next/font/google` imports for Plus Jakarta Sans and Inter; use shared CSS variables and tokens across applications.
- Numerical KPI data should use tabular numerals. For disabled state, reduce decoration, never make essential text unreadable.
- No Poppins, Roboto, Geist, Arial, DM Sans, Manrope or other intentionally selected UI font.
- A source or implementation change to fonts requires explicit product-owner approval and an update to this guide; typography is presently frozen.
- Do **not** commit downloaded font binaries to these repositories; use approved font-loading integration and observe the OFL license.

## 6. Logo and mascot usage
- **BRAND-005 logo (approved):** Orbit orbital "O" + wordmark; blue "i" mascot; original corporate palette.
- Master deliverables: transparent PNG, white-background PNG, true vector-path editable SVG. Keep master asset in versioned brand asset storage; commit approved SVG/PNG to `public/brand` when engineering integration is approved.
- **Mascot:** approved yellow 3D character for welcome, onboarding, help, success and empty states. Appropriate in LMS more frequently; CRM only as a compact contextual helper.
- Never stretch, recolor, crop facial features, substitute the wrong mascot variant or put an animated mascot inside a dense data table.
- Keep generous exclusion space around marks. Supply alternate monochrome/negative variants before use on dark surfaces.

## 7. Desktop component system
- Persistent left sidebar: compact brand lockup, icon + label, clear active highlight, role-aware menus. Never use theme alone as an access boundary.
- Topbar: current page heading, global search when implemented, notifications, user menu.
- Dashboard: KPI cards, funnel/source analytics, upcoming follow-ups, leads preview, optional team activity and compact helper.
- Default page background `#F8FAFB`; white cards, light borders `#DCE5E8`, consistent 8px spacing scale.
- Desktop table: clear header, horizontal-scroll containment only when needed, sticky header on data-heavy lists, meaningful empty/loading/error states.
- Buttons: primary muted teal with accessible white text; secondary outlined/neutral; destructive red only for destructive actions.
- Forms: clear persistent labels, visible focus, validation text, success/error feedback and disabled states.
- Illustrative CRM mockup values are **fictional**; implementation must connect charts to real permission-scoped data.

## 8. Visual accessibility and quality gates
- WCAG AA targets: >=4.5:1 contrast for normal text, >=3:1 for large text/non-text UI where applicable. Validate actual pairings before release.
- Do not communicate status by color alone; label "Enrolled", "Need to call", etc.
- Keyboard focus, logical tab sequence, pointer targets, accessible labels and nonessential reduced motion.
- All screens need loading, empty, error, success and permission-denied states.
- Test at desktop widths (for example 1280px and 1440px); mobile work remains deferred.
- Audit copy consistency: say "student" not "child"; avoid stale "Curriculum" label where "Course Details" is approved.

## 9. Change control and release status
- Branding decisions and visual discrepancies logged as `BRAND-xxx` / `UI-xxx` in the change register.
- **During current testing: no production UI changes.** Proposed colors and role accents are not frozen until approved.
- Start implementation after test register review; use feature branches and PR reviews, not direct pushes to `main`.
- Build/verify locally, then at most one approved remote release per application per day after **9 PM IST**.
- Production deployment and GitHub `main` may currently differ. Reconcile exact deployed source with GitHub before turning on commit-triggered deployments.

## 10. Open branding decisions
- Exact ByteXL approved hex tokens and partner co-brand lockup.
- Sidebar states (expanded/collapsed), card radius, shadows, icon library, chart colors and semantic status palette.
- Final logo minimum sizes, clearspace, monochrome/dark-background versions, favicon.
- Mascot naming, character usage sheet, expression library, approved animation/motion.
- Component interaction specification; accessibility audit; desktop breakpoints.
- Content tone, illustration/photography rules, empty-state microcopy, application favicon/email/report branding.
- Engineering/design governance: shared tokens, versioning, owner, review and release criteria.

**Change request:** propose revisions via a PR against `develop`; typography changes require explicit product-owner exception.