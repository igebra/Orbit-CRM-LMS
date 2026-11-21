# Repository cleanup review — 2026-11-21

**Branch:** docs/handover-safe-cleanup-20261121

**Approach:** only indisputably obsolete tracked artifacts are removed; source files, feature branches, migrations, tests, assets and recovery history are preserved. This is a proposed pull request, not a production change.

## Exact removals (6)

- Orbit_Batch_Class_Days.zip
- Orbit_Batches_Classes_Per_Month_Fix (1).zip
- Orbit_Payment_Edit_Delete.zip
- Orbit_Payment_Edit_Delete_Current (1).zip
- Orbit_Payments_Error_UI_Fix (1).zip
- Orbit_Payments_Error_UI_Fix.zip

## Preserved, deferred and blockers

- **Removed in this proposed PR:** six root Orbit_*.zip patch packages. They are historical patch distributions, not web runtime files, referenced dependencies or canonical SQL migrations.
- **Retained intentionally:** application source and layouts, package/lockfile, migrations, QA tests, public assets, existing Git history, and one-off Python scripts pending owner classification.
- **Deferred:** historical scripts/apply_*.py and many old feature/preview branches need a usage and retention review before deletion. Do not rewrite history or discard rollback branches blindly.
- **P0:** repo publicly visible at audit. Review committed file/history disclosure and access; this PR does not silently alter visibility.
- **P0:** live CRM sync receiver migration/Edge Function is outside main code. Investigate the 2026-11-21 feature branch and reconcile before merging or deploying.

## Review gate

- Verify the diff contains no app/.tsx, app/.css, active scripts, SQL, test, lockfile or asset removals.
- Confirm Vercel preview and CI pass.
- Do not merge until an owner verifies the current live branch and deployment source parity.
- Do not delete Git history or branches as part of this PR.
