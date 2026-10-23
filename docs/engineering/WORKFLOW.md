# Orbit Engineering Workflow - Proposed v1
**Repositories:** `igebra/Orbit-CRM-LMS` (CRM) and `igebra/Orbit-LMS` (LMS). Two separate Supabase projects and Vercel projects.
**Status:** Branches established; governance checks not yet enforced.

## Branch model
| Branch | Purpose | Lifetime |
|---|---|---|
| `main` | Protected production-approved source | Permanent |
| `develop` | Next tested integration baseline | Permanent |
| `feature/<ticket>-<short-slug>` | One independently reviewable feature | Short-lived |
| `fix/<ticket>-<short-slug>` | Normal bug fixes | Short-lived |
| `hotfix/<ticket>-<short-slug>` | Urgent production issue, branched from `main` | Short-lived |
| `release/<yyyy-mm-dd>` | Optional release stabilization / regression | Short-lived |
| `docs/<topic>` | Documentation and brand reviews | Short-lived |

No standing "sales" or "marketing" code branches. Roles belong in access-control logic, not branch names.

## Flow
1. Confirm the ticket (CRM-xxx / LMS-xxx / BXL-xxx / UI-xxx / BRAND-xxx).
2. Branch from up-to-date `develop` (or `main` for emergency hotfix).
3. Small commits; use `feat:`, `fix:`, `docs:`, `test:`, `chore:` prefixes.
4. PR into `develop`, with screenshots, test proof, risks, migration needs, rollback.
5. Require owner review; CI build/lint/typecheck and tests before merge once configured.
6. For release, create `release/*` if needed; regression test and approve, merge into `main` after **9 PM IST** release window. Back-merge hotfixes into `develop`.
7. Tag production releases `crm-vX.Y.Z` / `lms-vX.Y.Z`; keep Vercel deployment URL and database migration log.
8. Never deploy branch builds to production automatically until commit-to-deployment parity is proven.

## Critical baselining warnings
- The latest LMS production deployment was performed via **local Vercel CLI**; changes were uncommitted/untracked at the time. GitHub `main` is **not verified equal** to deployed source.
- Before CI/CD or changing Vercel Git triggers, snapshot the local working tree; audit `git status`, commit exact release source to a reviewed branch, test diff and reconcile with live deployment.
- CRM repository is currently **public**. Review exposure, secrets and appropriate visibility before adding wider staff.
- Never commit `.env.local`, database dumps, service-role keys, user credentials, client/student data, screenshots with secrets or backup archives.

## Repo professionalism checklist (planned, NOT yet enforced)
- Rewrite project README (purpose, architecture, setup, role map, env names only, build commands, safe release process).
- Add CONTRIBUTING.md, SECURITY.md, .github/CODEOWNERS (real owner IDs only), issue / PR templates.
- Add GitHub Actions checks after testing scripts are trusted: install (lockfile), lint, TypeScript, build, unit tests, security tests (staging only).
- Configure `main`/ `develop` rulesets: PR reviews, successful checks, no force pushes, no deletions, conversation resolution, restricted deployment secrets.
- GitHub Free ruleset protection availability differs: public CRM may support; private LMS may require a paid plan. Verify repo plan before committing a policy.
- Set Vercel production branch = `main` **only after** source parity audit; previews for PRs when safe.
- Use staging/test Supabase and synthetic accounts for repeatable end-to-end tests, with explicit approval before provisioning.
- All UI code must conform to `docs/brand/BRAND_GUIDE.md`; no font substitutions in any CRM/LMS/ByteXL screen.

## Current operating rule
During functional/visual UAT, collect changes in register. Do not merge docs or code into production main until product-owner approval.