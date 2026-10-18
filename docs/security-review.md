# Phase 7 security review

## Required checks

- RLS is enabled for profiles, communities, businesses, jobs, CV documents, services, events, orders, transactions, and promotions; policies are tested with owner, member, anonymous, moderator, and administrator identities.
- Server routes authenticate bearer tokens, validate input, derive prices from database records, use provider signature verification, and keep service-role/payment keys server-only.
- Private media and CVs use private buckets, MIME/size allowlists, owner/provider authorization, and short-lived signed URLs.
- Rate limits remain provider/database responsibilities where configured; production must add edge/API rate limits for login, OTP, uploads, reports, checkout, and webhooks with alerting.
- Audit logs cover moderation and payment state changes. Payment ledgers are append-oriented and reconciled by provider event ID.
- Account deletion must remove or anonymize personal records and user-generated content while retaining only legally required financial/audit records.

## Unresolved external review

Penetration testing, dependency scanning, secret scanning in CI, DDoS/WAF configuration, data-retention sign-off, UK/India legal review, payment-provider KYC/merchant approval, and a production restore drill are still required.
