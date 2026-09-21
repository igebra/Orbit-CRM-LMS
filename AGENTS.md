<img width="1587" height="833" alt="image" src="https://github.com/user-attachments/assets/693321df-ce43-40c8-8a53-18d2717f296f" /><!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Orbit Project Source of Truth

Before making any code, database, authentication, authorization, UI, architecture, or deployment change, read these documents in order:

1. `docs/01_PRODUCT_REQUIREMENTS.md`
2. `docs/02_SYSTEM_ARCHITECTURE.md`
3. `docs/03_DATABASE_SCHEMA.md`
4. `docs/04_USER_ROLES_AND_FLOWS.md`
5. `docs/05_DEVELOPMENT_RULES.md`

These documents are the source of truth for Orbit.

## Mandatory Rules

- Do not invent new tables, roles, architecture, or business flows without checking the documentation first.
- Do not disable or weaken Supabase RLS to fix an access problem.
- Do not expose secrets, service-role keys, database passwords, or private connection strings in client-side code or GitHub.
- Do not make destructive database changes without an approved migration and verified backup.
- Do not upload database backups to GitHub.
- Respect the planned separation between the internal CRM and the global LMS.
- New LMS features must not introduce unrestricted access to CRM data.
- Privileged cross-system operations must use controlled server-side integration.
- Reuse existing components and database structures where appropriate instead of creating duplicates.
- If a requested change conflicts with these documents, stop and flag the conflict before implementing it.
- If product behavior, architecture, schema ownership, roles, or security changes, update the relevant documentation as part of the same work.

## Current Product Direction

Orbit is being separated into:

- **Orbit CRM** — internal iGebra business tool.
- **Orbit LMS** — global learning platform planned for `lms.igebra.ai`.

Treat the current combined repository as the reference implementation during the split. Do not remove existing working functionality until its replacement has been migrated and tested.
