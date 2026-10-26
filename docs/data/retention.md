# Data retention

Account deletion is accepted immediately and placed in a service-only queue. The worker disables sign-in first and targets completion within 24 hours; operational failures are retried and escalated after three failed attempts. The account remains blocked while queued or retrying.

## What deletion does

- **Anonymized and retained:** the profile row remains for referential integrity with display name `Deleted user`, a tombstone biography, and cleared photo, phone, date of birth, city, and country. The deletion audit entry retains only non-PII identifiers, the action, and timestamp.
- **Deleted:** the Auth identity and sessions, CV database records and private-document files, profile-media files, and business/product media owned by the account are removed after the request is claimed.
- **Retained:** financial transaction records, order records, moderation/security records, and other legally required audit records remain with direct account references removed or nulled where the schema permits. Payment and fraud records follow the applicable provider and legal retention period.

The worker is idempotent: completed requests are no-ops, and failed requests remain retryable. The service-role key is required only by the server route and worker; it is never exposed to clients.

The legal basis is fulfillment of the user’s erasure request under UK GDPR Article 17, subject to statutory exceptions for legal claims, fraud prevention, accounting, and regulatory obligations. Retained records are minimized and access-controlled. Contact the platform owner for a copy of the current retention schedule and any legally required hold.

## Retention schedule

| Data class                                           |                                                 Retention period | Mechanism                                                                                | Owner                  | Legal basis                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------: | ---------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------- |
| Soft-deleted posts, comments, and post-media rows    |                                            90 days after removal | `pnpm purge:soft-deleted -- --days 90` dry-runs; add `--apply` only with an approved run | Moderation owner       | Abuse review, legal claims, and UK GDPR data minimisation |
| Sample/demo content                                  |                               Until removed from the environment | `pnpm purge:samples` dry-runs; production requires `--force-sample-purge`                | Platform owner         | Data minimisation and environment hygiene                 |
| Moderation audit log                                 |                                                         365 days | `pnpm purge:audit-logs` dry-runs; add `--apply` only under the retention runbook         | Security owner         | Legitimate interest in safety and dispute investigation   |
| Payment events, payment webhooks, transactions       | Never purged by the audit script; subject to legal/provider hold | Explicit allowlist in `scripts/purge-audit-logs.mjs`                                     | Finance/security owner | Accounting, fraud prevention, and regulatory obligations  |
| Deleted-account profile                              |                              Tombstone retained while referenced | Account deletion worker                                                                  | Privacy owner          | Referential integrity and legal claims                    |
| CVs, private media, and auth identity after deletion |                               Deleted during deletion processing | Account deletion worker                                                                  | Privacy owner          | UK GDPR Article 17                                        |

The weekly GitHub Action runs all three commands in dry-run mode and writes counts to the job summary. It never applies deletion. Scheduled apply runs require a separately approved, server-side execution with the service-role key.

Each retention job also records its mode, status, counts, and error details in
the service-only `retention_runs` table. The retention policy helpers are
covered by `tests/retention-policy.test.ts`; database-backed run recording is
verified in the disposable Supabase integration environment.
