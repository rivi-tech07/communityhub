# CommunityHub

Phase 7 production-readiness foundation for a community app covering local groceries, shopping, jobs, and business growth.

## Structure

- `apps/mobile` — Expo React Native client with login, onboarding, and home shell.
- `apps/web` — Next.js TypeScript admin dashboard shell.
- `packages/shared` — shared Supabase client factory, database types, and design tokens.
- `supabase` — local configuration, profiles/privacy/RBAC migrations, and auth triggers.
- `tests` — auth policy and conditional Supabase integration coverage.

The clients intentionally show honest empty and development states where backend capabilities are unavailable or provider-gated; the table below is the authoritative feature summary.

## Feature status

| Surface                      | Status                  | Notes                                                                                                        |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Auth (email/password)        | Shipped                 | Supabase Auth flow with confirmation and recovery support.                                                   |
| Auth (SMS OTP)               | Blocked on provider     | UI and server flow exist; SMS provider configuration and delivery remain external prerequisites.             |
| Profiles + privacy           | Shipped                 | Profile editing and privacy-aware reads use RLS.                                                             |
| Communities (public)         | Shipped                 | Public browsing is available without sign-in.                                                                |
| Communities (private)        | Shipped                 | Membership approval and private-content RLS are implemented.                                                 |
| Social feed                  | Shipped                 | Posts, comments, replies, likes, bookmarks, and pagination are connected.                                    |
| Moderation/reports           | Shipped                 | Reports, blocks, moderation actions, and audit logging are implemented.                                      |
| Business directory           | Shipped                 | Public visibility requires verification and publication.                                                     |
| Business catalog             | Shipped                 | Owner-managed products, stock, categories, and delivery configuration exist.                                 |
| Business media upload        | Shipped                 | Private bucket and signed upload/read paths are implemented; storage setup is required.                      |
| Delivery config              | Shipped                 | Postcodes, charges, collection, hours, and ETA ranges are supported.                                         |
| Checkout (physical goods)    | Blocked on provider     | Server preparation exists, but provider approval/credentials are required; live mode stays disabled.         |
| Stock reservation            | Shipped                 | Server-side 15-minute holds, payment-state release/commit, expiry sweep, and reconciliation are implemented. |
| Split payouts                | Not started             | Explicitly not implemented.                                                                                  |
| Jobs                         | Shipped                 | Listings, search/filtering, saved jobs, employer management, and applications exist.                         |
| CV upload                    | Shipped                 | Private documents bucket, allowlisted types, size limits, and signed URLs are implemented.                   |
| Services                     | Shipped                 | Provider listings and authenticated enquiries exist.                                                         |
| Events                       | Shipped                 | Free registration, cancellation, ownership, and capacity enforcement exist.                                  |
| Paid promotions (web)        | Blocked on provider     | Entitlement and webhook foundations exist; provider approval and credentials are required.                   |
| Paid promotions (mobile IAP) | Blocked on store review | StoreKit/Play Billing is intentionally not wired.                                                            |
| Account deletion             | Shipped                 | Server-only deletion requires the service-role key.                                                          |

The detailed phase narrative is maintained in [`docs/roadmap.md`](docs/roadmap.md).

## Authentication and authorization

- Review the table-by-table RLS coverage and open policy questions in [`docs/security/rls-matrix.md`](docs/security/rls-matrix.md).

- Email/password registration and login use Supabase Auth and require email confirmation when enabled in the project.
- Phone login/registration uses Supabase Auth SMS OTP. The UI only says an OTP request was accepted after Supabase returns no error; it never claims a message was delivered without provider confirmation.
- OTP expiry is set to 5 minutes in shared policy and resend UI cooldown is 60 seconds. Supabase provider rate limits remain authoritative and errors are surfaced as actionable messages.
- Password recovery uses Supabase email recovery links and `/reset-password`.
- Sessions use Supabase refresh behavior; logout calls `signOut`. Account deletion is server-only and requires `SUPABASE_SERVICE_ROLE_KEY`.
- Retention maintenance is dry-run by default: see `docs/data/retention.md`; sample-data purge refuses production unless `--force-sample-purge` is explicit.
- Profiles include display name, biography, photo URL, country, city, preferred language, and privacy settings. RLS protects profile updates and hides profiles marked private.
- Roles are stored in `user_roles`. New accounts receive only `user`; role grants are administrator-only through the protected server route. Never grant roles from client code.

## External credentials

In the Supabase project dashboard, configure:

1. **Email:** SMTP host, port, username, password, sender email/name, Site URL, and redirect URLs for `/reset-password`. Use a transactional provider such as Resend, Postmark, SendGrid, or SES.
2. **SMS:** enable Phone Auth and configure a supported provider such as Twilio. Twilio requires Account SID, Auth Token, and a sender phone number or Messaging Service SID. Configure OTP expiry and provider rate limits in Supabase Auth settings.
3. **Server:** keep `SUPABASE_SERVICE_ROLE_KEY` server-side only for account deletion, administrator writes, payment webhooks, and refund workflows. It must never be bundled into Expo or Next public variables.
4. **Payments:** configure `PAYMENT_PROVIDER_GB`/`PAYMENT_PROVIDER_IN`, test secret keys, provider webhook secrets, and leave `PAYMENTS_LIVE_ENABLED=false` until approvals and compliance checks are complete. Stripe requires secret-key/API and webhook configuration; Razorpay requires test key ID/secret and webhook secret. Do not store these credentials in Supabase tables or client apps.

Provider credentials are intentionally absent from this repository. Copy `.env.example` and fill only local/dev values.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Expo CLI / Expo Go for mobile development
- Supabase CLI and Docker Desktop for the local database

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
cp .env.example apps/mobile/.env
```

Fill in only the `NEXT_PUBLIC_*` values in `apps/web/.env.local`, the `EXPO_PUBLIC_*` values in `apps/mobile/.env`, and keep `SUPABASE_SERVICE_ROLE_KEY` in the server process environment only. Never put a service-role key in a mobile or public client bundle. Use it only for the protected web account-delete/admin routes and a local, non-production seed process.

## Run

```bash
pnpm dev:web       # Next.js dashboard at http://localhost:3000
pnpm dev:mobile    # Expo developer server
pnpm db:start      # local Supabase services
pnpm db:reset      # apply migrations
pnpm db:seed       # sample communities/posts; requires explicit local owner id
pnpm test          # policy tests plus integration tests when Supabase test credentials exist
```

For sample data, create a disposable local auth user, set `SEED_OWNER_USER_ID`, then run `pnpm db:seed`. The seed refuses production and does nothing without the explicit owner id.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build:web
```

## Error handling

Clients fail closed when Supabase environment variables are absent: a local development web run may display `Development mode`, while non-development web builds render a neutral `Unavailable` page and mobile keeps sign-in disabled with an explanatory message. Feature-specific error boundaries and data hooks should be added as backend capabilities land in later phases.

## Phase 2 test coverage

`tests/auth-policy.test.ts` covers OTP expiry, resend cooldowns, and role escalation rules. `tests/auth-integration.test.ts` runs registration, duplicate identity, bad login, session login, RLS unauthorized reads, and deletion when `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` point at a disposable test project. `tests/social-integration.test.ts` covers public/private membership, private post access, posting permissions, reporting, moderation removal, and membership approval. `tests/business-integration.test.ts` covers owner-only registration/catalog writes, verification-gated public reads, and dormant order creation. `tests/phase5-integration.test.ts` covers employer ownership and event capacity. `tests/payment-policy.test.ts` covers provider signature verification, expiry, currencies, and webhook idempotency helpers. `tests/phase6-integration.test.ts` covers transaction privacy and database idempotency uniqueness. Full checkout/refund integration tests require a disposable Supabase project and provider test credentials.
