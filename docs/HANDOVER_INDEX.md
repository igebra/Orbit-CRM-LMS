# Orbit — Technical Handover Index

**Audience:** Incoming engineering and operations team. **Last audited:** 2026-11-21.

## Start here

1. **[Technical handover and maintenance runbook](TECHNICAL_HANDOVER_AND_MAINTENANCE_2026-11-21.md)** — system architecture, functional flow, code map, Supabase, Vercel, GitHub, access, integrations and support.
2. **[Live CRM database inventory](LIVE_SUPABASE_INVENTORY_2026-11-21.md)** — tables, columns, foreign keys, database functions, storage buckets and migration registry from CRM. This is not a data backup or migration file.
3. **[Repository cleanup review](REPOSITORY_CLEANUP_REVIEW_2026-11-21.md)** — exact historical patch files removed by the draft PR.
4. **[CRM student sync outbox](migrations/20261030_crm_lms_realtime_outbox.sql)** — current repository SQL source; compare with live migration history.
5. **[Historic production-source parity blocker](releases/PRODUCTION_SOURCE_PARITY_BLOCKER.md)** — verify whether current deployed source matches Git `main`.
6. **[Project safety and development rules](../AGENTS.md)**.

## How to maintain this documentation

- Markdown in `docs/` is the **version-controlled engineering source of truth**. Update it with the same reviewed PR as the affected architecture, tables, API, permissions or release procedure.
- Treat the Word handover as a **generated presentation/export copy**, not a separately maintained specification. Avoid adding duplicate .docx files to both repositories.
- Related LMS repository: https://github.com/igebra/Orbit-LMS (private).
- **Security:** CRM was public at audit. Evaluate intended repository visibility and historical content before publishing further sensitive documentation or granting external collaborator access.
- Sync receiver migration and Edge Function are live but related code remains on `feat/lms-to-crm-batch-trainer-sync-20261121`; reconcile and approve them before production promotion.
- Protected branches, CI, reviewer, preview/UAT, backup and a separate approved release are required.

**Current handover risk:** do not mistake database/source parity or incomplete trainer-sync UAT for an accepted production handover.
