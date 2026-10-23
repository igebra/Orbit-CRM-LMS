# BRAND-008 — Canonical Orbit Icon Registry (FROZEN)

**Common visual source:** Lucide outline icon family, same names for CRM, LMS and ByteXL. Prefer `lucide-react` when dependency is approved. Existing hand-authored shared SVG components may represent these glyphs during migration, but must not change the semantics/icon style.

| Intent / UI label | Lucide icon name | Standard size |
|---|---|---|
| Overview / Dashboard | `layout-dashboard` | 18px nav |
| CRM group | `contact-round` | 18px nav |
| Leads | `list-filter` | 18px nav |
| Demo Schedule | `calendar-clock` | 18px nav |
| Students | `graduation-cap` | 18px nav |
| Batches | `calendar-days` | 18px nav |
| Trainers | `user-round-check` | 18px nav |
| Courses / Curriculum | `book-open` | 18px nav |
| Payments | `wallet` | 18px nav |
| Reports / Analytics | `chart-no-axes-combined` | 18px nav |
| LMS module | `book-open-check` | 18px nav |
| Access / Permissions | `shield-check` | 18px nav |
| Portal Access / Authentication | `key-round` | 18px nav |
| AQMATICS (Soon) | `sparkles` | 18px nav |
| ByteXL coding module | `code-2` | 18px nav |
| Assignments / Homework | `clipboard-list` | 18px nav |
| Attendance | `clipboard-check` | 18px nav |
| Access Requests | `user-round-plus` | 18px nav |
| Login Activity / Audit | `history` | 18px nav |
| Add / Create | `plus` | 16px inline |
| Search | `search` | 16px inline |
| Edit | `pencil` | 16px inline |
| Delete | `trash-2` | 16px inline |
| Save | `save` | 16px inline |
| Import | `upload` | 16px inline |
| Download | `download` | 16px inline |
| Refresh | `refresh-cw` | 16px inline |
| Expand / Next | `chevron-right` | 16px inline |
| Collapse / Previous | `chevron-left` | 16px inline |
| Close | `x` | 16px inline inside 40px control |
| Notification | `bell` | 18px inline |
| Settings | `settings` | 18px nav |
| Sign out | `log-out` | 16px inline |

Rules: Default stroke width 1.75px (2px allowed where rendering fidelity requires). Do not mix filled icons, emojis, illustration mascots and text glyphs in a navigation set. Keep SVGs decorative (`aria-hidden=true`) when adjacent to readable labels. Icon-only buttons must have explicit labels and tooltips. Do not show nonexistent or unauthorized menu actions. Treat this registry as canonical when updating any feature route, not a request to add new routes.

**Visual consistency:** The mascot is **a separate approved brand asset**, not a replacement for utility icons.
