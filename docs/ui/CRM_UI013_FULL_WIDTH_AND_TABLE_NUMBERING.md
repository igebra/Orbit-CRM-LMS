# UI-013 — Full-width Payments and sequential S.No tables
**Date:** 26 October 2026
**Scope:** CRM desktop preview only; no backend changes.

## Approved change
- Payments workspace must use the available main content width; after removal of duplicate quick-payment form, do not retain a permanently reserved right gutter.
- Payments Quick Stats and Recent Payments sit **below** main content as two equally sized panels (single column at narrow widths).
- Student payment ledger, transaction history, and deleted-payments audit have a leading **S.No** column.
- Every CRM table (directories, reports, access management, portal access, student/batch detail tables, dashboard tables, demo import preview) uses a leading **S.No**, **except Leads** which already has S.No following the selection checkbox.
- Indices reflect the user-visible order of filtered records: 1, 2, 3, ...; paginated ledger uses `pageIndex * pageSize + index + 1`.
- Number columns are visually narrow, align centrally, and do not occupy a large portion of the table.
- Existing columns, role checks, row actions, amounts and CRUD behavior are preserved.
- Original typography and BRAND-008 component sizes remain unchanged.
- S.No is a visual row number, **not** a persistent record ID. Sort/filter changes recalculate numbering.

## Preview QA gate
- Verify no empty reserved right column on Payments overview / ledgers / reports.
- Inspect all visible tables and confirm S.No appears in each, without counting section headers/empty rows.
- Verify table headings, colSpans, fixed-grid column widths and action buttons work at supported desktop width.
- Verify role-based restrictions and actual finance CRUD using controlled test data.
- Compare current main/production source to release candidate before release.
- Do not deploy to production before **21:00 Asia/Kolkata**, and observe **one production release per day**.

