# CommunityHub Roadmap

This roadmap describes implemented foundations and remaining release work. The status table in [`README.md`](../README.md#feature-status) is the source of truth for the current state.

## Phase 2: communities and social feed

- Communities support language, culture, location, interest, and profession categories plus public/private visibility.
- Private community profiles are discoverable, but membership requests remain `pending` until an owner/admin approves them. Private posts, comments, and media are protected by RLS and signed URLs.
- Active members can publish, comment, reply, like, save, and use hashtags. Community admins can publish announcements and manage memberships.
- Reports, blocks, content removal, and moderation audit logs are available to community admins and platform moderators. Removed content is soft-deleted for an audit trail.
- Feed and community search APIs use bounded cursor pagination. The migration adds indexes for community search, feed ordering, comments, hashtags, reports, and moderation logs.
- Sample seed records include Gujarati Community UK, Bengali Community London, and Indian Students in London. Every fixture is marked `is_sample=true`.

## Phase 4: business directory and catalog

- Authenticated users can register businesses. Owners can edit descriptions, categories, locations, contact preferences, opening hours, publication state, product categories, products, stock, discounts, currencies, units, and delivery configuration.
- Public directory and business pages only expose businesses marked both `verified` and `published`. Platform moderators or administrators control verification; owners cannot self-verify.
- Business and product images use the private `business-media` bucket, signed upload/read URLs, MIME checks, 10 MB database and bucket limits, and owner-only write policies.
- Delivery configuration supports supported postcodes, charges, minimum order values, time slots, opening hours, collection, and estimated delivery ranges.
- `orders` and `order_items` were prepared in Phase 4; Phase 6 adds server-created checkout without stock reservation or split payouts.

## Phase 5: jobs, services, and events

- Jobs support employer-owned profiles, salary ranges, job types, locations, deadlines, sponsorship statuses (`employer_declared`, `independently_checked`, `not_offered`, and `unknown`), evidence source/date fields, CV documents, applications, and status tracking.
- Public listings are limited to published, non-expired records. Sponsorship labels are declarations or evidence fields only; the platform does not imply verification without moderator-backed evidence.
- Services support provider-owned listings, categories, descriptions, pricing, service areas, availability, and authenticated enquiries. Events support venue/online details, free registration, organizer ownership, and capacity enforcement.
- CVs use the private `private-documents` bucket, allowlisted document types, a 10 MB limit, RLS, and five-minute signed URLs. Paid checkout and event payments are not active.

## Phase 6: payments and paid promotions

- Physical goods checkout is server-created from an existing pending order; amounts are loaded from server-side records, not trusted from the client. Services use a separate purpose field and do not share seller settlement logic with goods.
- Stripe and Razorpay adapters are selected by merchant country (`GB`/`IN`) and environment configuration. Merchant payment accounts must be approved and enabled before physical checkout is available. No split seller payouts are implemented.
- Transactions use provider IDs, unique idempotency keys, status transitions, failure details, refunds, webhook signature verification, and duplicate-safe updates. Missing credentials fail closed; no successful payment is simulated.
- Promotion packages support featured businesses, promoted products, sponsored posts, and featured jobs with price, currency, dates, approval, payment reference, and entitlement state. Paid entitlements activate only after a verified provider event and required approval, then expire by timestamp.
- Live mode remains disabled by default. Required checks before enabling it include provider merchant approval, webhook secrets, refund/reconciliation runbooks, tax/consumer compliance, and local legal review.

Mobile paid promotions are intentionally not wired to Stripe/Razorpay. Apple treats digital in-app promotions/boosts as in-app purchases under App Review Guideline 3.1.1, while physical goods/services use external payment methods; Google Play generally requires Play Billing for digital in-app features and excludes physical goods/services. A future mobile release must implement StoreKit and Google Play Billing, product review, receipt verification, restore/refund handling, and regional policy review before exposing in-app promotion purchase.

## Phase 7: release readiness

Release configuration is in `apps/mobile/eas.json`, `apps/mobile/app.json`, and `apps/web/vercel.json`. Operational, security, environment, policy, store, reviewer, and release materials are in `docs/`. `pnpm release:check` validates the local release contract; `pnpm release:check -- --production` requires production placeholders and live-payment approval to be resolved. The app must not be submitted until `docs/release-checklist.md` is complete.

Start with [`docs/setup-checklist.md`](setup-checklist.md); external provider, store, payment, and deployment accounts are intentionally activated only when needed.
