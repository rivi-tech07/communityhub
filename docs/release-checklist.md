# CommunityHub Phase 7 release checklist

## Completed in repository

- [x] TypeScript monorepo and shared Supabase types.
- [x] Auth/profile/RBAC, communities/moderation, business/catalog, jobs/services/events, orders, payments, webhooks, refunds, and promotion state models.
- [x] Conditional Supabase integration tests plus payment signature/promotion unit tests.
- [x] EAS development, preview, and production profiles with iOS/Android identifiers, permissions, scheme, and notification plugin configuration.
- [x] Vercel web deployment configuration, CI workflow, release contract, security review, operations runbook, policy drafts, store copy, and reviewer-account template.

## Unresolved blockers

- [ ] Install/lock all dependencies and make full web/mobile typecheck, lint, and production builds pass.
- [ ] Add reviewed icon, adaptive icon, splash, and notification assets.
- [ ] Replace EAS/App Store placeholders and configure signing credentials.
- [ ] Deploy isolated development/staging/production Supabase projects, storage buckets, backups/PITR, monitoring, and error reporting.
- [ ] Run integration/E2E suites against staging with real provider sandbox webhooks, failure cases, refunds, order reconciliation, and promotion expiry.
- [ ] Complete Apple StoreKit and Google Play Billing design/implementation before exposing paid digital promotions in mobile.
- [ ] Complete legal approval for privacy, terms, moderation, refund, data retention, tax, sponsorship wording, and support contacts.

## Required approvals before submission

- [ ] UK/India payment merchant KYC, provider approval, webhook and refund runbook approval.
- [ ] App Store Connect account, bundle ID, privacy answers, reviewer credentials, screenshots, age rating, and account-deletion verification.
- [ ] Google Play Console account, package ID, Data Safety, account-deletion URL, content rating, testing track, reviewer credentials, and billing declarations.
- [ ] Security/privacy review, incident response owner, backup restore drill, and go/no-go sign-off.

**Do not submit:** The current app is not submission-ready until the blockers and approvals above are complete and the full login/core-feature/payment test journey passes.
