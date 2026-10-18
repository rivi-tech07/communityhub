# CommunityHub

Phase 7 production-readiness foundation for a community app covering local groceries, shopping, jobs, and business growth.

## Structure

- `apps/mobile` — Expo React Native client with login, onboarding, and home shell.
- `apps/web` — Next.js TypeScript admin dashboard shell.
- `packages/shared` — shared Supabase client factory, database types, and design tokens.
- `supabase` — local configuration, profiles/privacy/RBAC migrations, and auth triggers.
- `tests` — auth policy and conditional Supabase integration coverage.

The clients intentionally show honest empty and development states. No marketplace, jobs, or business actions claim to be connected before those backend features exist.

## Authentication and authorization

- Email/password registration and login use Supabase Auth and require email confirmation when enabled in the project.
- Phone login/registration uses Supabase Auth SMS OTP. The UI only says an OTP request was accepted after Supabase returns no error; it never claims a message was delivered without provider confirmation.
- OTP expiry is set to 5 minutes in shared policy and resend UI cooldown is 60 seconds. Supabase provider rate limits remain authoritative and errors are surfaced as actionable messages.
- Password recovery uses Supabase email recovery links and `/reset-password`.
- Sessions use Supabase refresh behavior; logout calls `signOut`. Account deletion is server-only and requires `SUPABASE_SERVICE_ROLE_KEY`.
- Profiles include display name, biography, photo URL, country, city, preferred language, and privacy settings. RLS protects profile updates and hides profiles marked private.
- Roles are stored in `user_roles`. New accounts receive only `user`; role grants are administrator-only through the protected server route. Never grant roles from client code.

## Communities and social feed

- Communities support language, culture, location, interest, and profession categories plus public/private visibility.
- Private community profiles are discoverable, but membership requests remain `pending` until an owner/admin approves them. Private posts, comments, and media are protected by RLS and signed URLs.
- Active members can publish, comment, reply, like, save, and use hashtags. Community admins can publish announcements and manage memberships.
- Reports, blocks, content removal, and moderation audit logs are available to community admins and platform moderators. Removed content is soft-deleted for an audit trail.
- Feed and community search APIs use bounded cursor pagination. The migration adds indexes for community search, feed ordering, comments, hashtags, reports, and moderation logs.
- Sample seed records include Gujarati Community UK, Bengali Community London, and Indian Students in London. Every fixture is marked `is_sample=true`.

## Business directory and catalog

- Authenticated users can register businesses. Owners can edit descriptions, categories, locations, contact preferences, opening hours, publication state, product categories, products, stock, discounts, currencies, units, and delivery configuration.
- Public directory and business pages only expose businesses marked both `verified` and `published`. Platform moderators or administrators control verification; owners cannot self-verify.
- Business and product images use the private `business-media` bucket, signed upload/read URLs, MIME checks, 10 MB database and bucket limits, and owner-only write policies.
- Delivery configuration supports supported postcodes, charges, minimum order values, time slots, opening hours, collection, and estimated delivery ranges.
- `orders` and `order_items` were prepared in Phase 4; Phase 6 adds server-created checkout without stock reservation or split payouts.

### Phase 5: jobs, services, and events

- Jobs support employer-owned profiles, salary ranges, job types, locations, deadlines, sponsorship statuses (`employer_declared`, `independently_checked`, `not_offered`, and `unknown`), evidence source/date fields, CV documents, applications, and status tracking.
- Public listings are limited to published, non-expired records. Sponsorship labels are declarations or evidence fields only; the platform does not imply verification without moderator-backed evidence.
- Services support provider-owned listings, categories, descriptions, pricing, service areas, availability, and authenticated enquiries. Events support venue/online details, free registration, organizer ownership, and capacity enforcement.
- CVs use the private `private-documents` bucket, allowlisted document types, a 10 MB limit, RLS, and five-minute signed URLs. Paid checkout and event payments are not active.

### Phase 6: payments and paid promotions

- Physical goods checkout is server-created from an existing pending order; amounts are loaded from server-side records, not trusted from the client. Services use a separate purpose field and do not share seller settlement logic with goods.
- Stripe and Razorpay adapters are selected by merchant country (`GB`/`IN`) and environment configuration. Merchant payment accounts must be approved and enabled before physical checkout is available. No split seller payouts are implemented.
- Transactions use provider IDs, unique idempotency keys, status transitions, failure details, refunds, webhook signature verification, and duplicate-safe updates. Missing credentials fail closed; no successful payment is simulated.
- Promotion packages support featured businesses, promoted products, sponsored posts, and featured jobs with price, currency, dates, approval, payment reference, and entitlement state. Paid entitlements activate only after a verified provider event and required approval, then expire by timestamp.
- Live mode remains disabled by default. Required checks before enabling it include provider merchant approval, webhook secrets, refund/reconciliation runbooks, tax/consumer compliance, and local legal review.

Mobile paid promotions are intentionally not wired to Stripe/Razorpay. Apple treats digital in-app promotions/boosts as in-app purchases under App Review Guideline 3.1.1, while physical goods/services use external payment methods; Google Play generally requires Play Billing for digital in-app features and excludes physical goods/services. A future mobile release must implement StoreKit and Google Play Billing, product review, receipt verification, restore/refund handling, and regional policy review before exposing in-app promotion purchase.

### Phase 7: release readiness

Release configuration is in `apps/mobile/eas.json`, `apps/mobile/app.json`, and `apps/web/vercel.json`. Operational, security, environment, policy, store, reviewer, and release materials are in `docs/`. `pnpm release:check` validates the local release contract; `pnpm release:check -- --production` requires production placeholders and live-payment approval to be resolved. The app must not be submitted until `docs/release-checklist.md` is complete.

Start with `docs/setup-checklist.md`; external provider, store, payment, and deployment accounts are intentionally activated only when needed.

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

Clients fail closed when Supabase environment variables are absent: the web dashboard displays `Development mode`, and mobile keeps sign-in disabled with an explanatory message. Feature-specific error boundaries and data hooks should be added as backend capabilities land in later phases.

## Phase 2 test coverage

`tests/auth-policy.test.ts` covers OTP expiry, resend cooldowns, and role escalation rules. `tests/auth-integration.test.ts` runs registration, duplicate identity, bad login, session login, RLS unauthorized reads, and deletion when `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` point at a disposable test project. `tests/social-integration.test.ts` covers public/private membership, private post access, posting permissions, reporting, moderation removal, and membership approval. `tests/business-integration.test.ts` covers owner-only registration/catalog writes, verification-gated public reads, and dormant order creation. `tests/phase5-integration.test.ts` covers employer ownership and event capacity. `tests/payment-policy.test.ts` covers provider signature verification, expiry, currencies, and webhook idempotency helpers. `tests/phase6-integration.test.ts` covers transaction privacy and database idempotency uniqueness. Full checkout/refund integration tests require a disposable Supabase project and provider test credentials.

# communityhub
