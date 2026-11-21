# Orbit CRM

Internal igebra.ai Customer Relationship Management and delivery operations application, built with Next.js 16, React 19, Supabase Auth/PostgreSQL/Storage, and Vercel.

CRM modules include leads and demo management, customer/student admissions, enrollments, trainers, batches, scheduling views, manual receipts, financial reports, role approvals and audit.

## Start here for a new developer

1. [As-built developer handover and maintenance](docs/TECHNICAL_HANDOVER_AND_MAINTENANCE_2026-11-21.md)
2. [Live CRM Supabase schema inventory, read-only snapshot](docs/LIVE_SUPABASE_INVENTORY_2026-11-21.md)
3. [Project and security rules](AGENTS.md)
4. [Historical production source parity blocker](docs/releases/PRODUCTION_SOURCE_PARITY_BLOCKER.md)
5. [CRM student sync outbox SQL source](docs/migrations/20261030_crm_lms_realtime_outbox.sql)
6. [Safe cleanup audit](docs/REPOSITORY_CLEANUP_REVIEW_2026-11-21.md)

## Local development

Use Node 24.x, an isolated/non-production Supabase project and a local environment file containing only appropriate non-production project keys.

    npm ci
    npm run dev
    node --test tests/*.test.mjs
    npm run build

## Deployment and data integrity

- GitHub: igebra/Orbit-CRM-LMS; production branch: main.
- Vercel: orbit-crm-lms. Supabase: Orbit (cgencwgfupijundbhpdv).
- The LMS is separate: igebra/Orbit-LMS; CRM-origin students/enrollments replicate to the LMS via protected outbox delivery.
- Do not modify learner attendance/homework or edit academic trainer assignments independently from LMS.
- Use reviewed PRs and approved after-9-PM IST releases; never commit credentials or personal data.

**Immediate security review:** this repo was PUBLIC at the handover audit. Review source/history exposure and apply an owner-approved visibility policy.

**Known handover gap:** the new LMS->CRM trainer receiver RPC and Edge Function are deployed to live CRM Supabase, but corresponding version-controlled code remains in the unmerged feat/lms-to-crm-batch-trainer-sync-20261121 branch. Reconcile source, schema and release before signoff..
