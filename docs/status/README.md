# Verification status

The machine-readable record in `batch2.verify.json` prevents an unverified database batch from being released accidentally.

Only a human who has run the database checks against a disposable Supabase environment may set `verified` to `true`. The record becomes stale after 30 days. CI must never update it.

Required verification sequence:

```bash
pnpm db:reset && pnpm db:seed && pnpm test
```

After those commands pass, record the result locally with:

```bash
node scripts/set-batch-verified.mjs \
  --batch=batch2 \
  --by=<name> \
  --commands="pnpm db:reset && pnpm db:seed && pnpm test" \
  --confirm-db-passed
```

The helper refuses to run in CI or without explicit confirmation. Production release checks also require `docs/status/batch2.md` to contain no `- Unverified:` list items.

## Current production blockers

The current production check is intentionally red for four independent reasons:

1. Batch 2 has not been verified against a disposable database.
2. The mobile app still needs its final EAS project ID.
3. `docs/release-checklist.md` contains unchecked items.
4. The RLS matrix previously contained 10 unresolved administrator-write cells; those are now classified as `Service-only` or `N/A` from the current code paths. It also records a separate `order_items` finding: the current authenticated insert path conflicts with the documented server-created checkout model.

The RLS matrix file exists; its `VERIFY` count is a real documentation blocker, not a missing-file false positive.

In restricted sandboxes, `pnpm release:check` may fail because `tsx` cannot create its IPC socket. This is an environment limitation. The equivalent direct verification is:

```bash
node --experimental-strip-types scripts/release-check.ts --production
```
