# Batch 2 status

Tasks 9–12 are code-complete per the current implementation, but database verification is still blocked by this environment.

## Verified here

- 11 pure tests pass: reservation policy, deletion retry policy, outbox deduplication/backoff, and retention policy.
- 4 Supabase integration tests are present with real assertions and skip only when credentials are unavailable.
- Production callers use the repair contracts `release_stock_reservation`, `expire_stock_reservations`, `claim_deletion_request`, and `claim_outbox_messages`.
- Legacy `release_stock_reservations` and `claim_outbox_message` functions are removed by the repair migration.
- The trigger release loops use a stable product/id lock order.

## Still unverified

- Applying the full migration chain cleanly.
- Final RLS, policy, grants, and function state in PostgreSQL.
- Supabase integration tests against a disposable database.

Docker is unavailable locally and DNS cannot resolve `registry.npmjs.org`, so local Supabase and offline PostgreSQL validation cannot run here. Before merge, run:

```bash
pnpm db:reset
pnpm db:seed
pnpm test
```

Use a disposable Supabase environment with Docker or a reachable PostgreSQL instance. Never edit an applied migration; fix discovered drift with a new additive migration and a regression test.

Task 13 remains blocked until the database verification above is complete.
