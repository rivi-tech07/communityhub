# Production operations runbook

## Environments

- **Development:** local Supabase/Docker, test payment providers, sample records only, no real secrets.
- **Staging:** isolated Supabase project and storage bucket, EAS preview channel, provider sandbox credentials, disposable reviewer accounts, error reporting enabled.
- **Production:** separate Supabase project, storage, secrets, payment merchant accounts, webhook endpoints, monitoring, backups, and approved policies. Never promote a staging database or service-role key.

## Backups and migrations

Use scheduled Supabase database backups/PITR where the plan supports it, verify retention and restore access, and perform a quarterly restore drill. Apply migrations forward in staging first, record the migration hash, then production during a change window. Migrations must be additive and reversible where possible; destructive changes require a separately approved migration and backup.

## Monitoring and errors

Monitor API 5xx rate, authentication failures, RLS errors, webhook signature failures, payment failure/refund mismatch, storage errors, queue latency, registration capacity, and crash-free mobile sessions. Add the approved Sentry/observability DSN only through environment secrets; redact tokens, CVs, payment identifiers, and personal data from logs.

## Incident response

1. Declare an incident and assign an incident lead.
2. Protect users: disable affected endpoints, payment live mode, webhook processing, or storage access using feature flags/secrets.
3. Preserve audit logs and provider event IDs; do not edit ledger history.
4. Triage scope, notify the owner/support/legal contacts, and follow breach-notification obligations.
5. Recover from the last known-good build/database backup, verify RLS and payments in staging, then communicate resolution.
6. Write a post-incident review with timeline, impact, root cause, and prevention actions.

## Rollback

Stop rollout, disable the feature flag, revert to the previous immutable web image/EAS build, and apply only an approved forward database migration. Reconcile payment provider events before retrying webhooks. Never roll back by deleting transactions or weakening RLS.
