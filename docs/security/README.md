# Client secret-leak check

CommunityHub keeps `SUPABASE_SERVICE_ROLE_KEY` server-only. It must never be placed in `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, client `.env` files, or browser/mobile build output.

## How the canary works

`pnpm check:leaks` runs `scripts/check-service-role-leak.mjs` without third-party dependencies. The scanner:

- Checks the exact `SUPABASE_SERVICE_ROLE_KEY` value when that environment variable is available.
- Detects Supabase `sb_secret_` credentials and JWTs whose decoded payload has the `service_role` role.
- Recursively scans JavaScript and source-map files under `apps/web/.next`, `apps/web/out`, `apps/mobile/dist`, and `apps/mobile/.expo` when those directories exist.
- Checks `apps/web/.env.local` and `apps/mobile/.env` because those files are reserved for client-safe variables.
- Fails with the repository-relative file path and line number for every finding.

The scanner does not print credential values. A clean scan exits with status zero; any finding exits with status one.

## Run locally

From the repository root:

```bash
pnpm check:leaks
```

To test the failure path without using a real credential:

```bash
mkdir -p apps/web/.next/static
printf '%s\n' 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.fake' > apps/web/.next/static/test.js
pnpm check:leaks
rm apps/web/.next/static/test.js
```

Do not commit real credentials or test them in a client file. Keep server-only values in the protected server environment and use placeholder values in `.env.example`.

## Payment webhook replay safety

Verified Stripe and Razorpay events are recorded in the server-only `payment_events` ledger. The webhook route rejects invalid signatures before obtaining an admin database client, and Stripe timestamps outside the five-minute tolerance are rejected by the signature verifier. The database function claims, processes, and finalizes the ledger row together with the existing payment transaction status change. A processed `(provider, provider_event_id)` is therefore a no-op on replay; failed attempts retain an error and are returned as a server error so the provider can retry.

The ledger has RLS enabled and deliberately has no `anon` or `authenticated` policies. Only the server-side Supabase service role can invoke the processing function. Do not query it from browser or mobile code.
