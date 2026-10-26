# Observability

## What is captured

Web uses Sentry when `NEXT_PUBLIC_SENTRY_DSN` or server-only `SENTRY_DSN` is configured. Mobile uses `EXPO_PUBLIC_SENTRY_DSN`. Releases are tagged with `NEXT_PUBLIC_GIT_SHA`/`VERCEL_GIT_COMMIT_SHA`, `EXPO_PUBLIC_GIT_SHA`/`EAS_BUILD_GIT_COMMIT_HASH`, or server `GIT_SHA`; CI/EAS source-map upload uses `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.

The web middleware creates an `x-request-id` for each request and returns it in the response. Mobile creates one per app session and sends it as `x-session-id` to Supabase and the account API. Webhook and worker logs include `provider`, `provider_event_id`, `event_type`, and `outcome`.

Structured logs use `level`, `message`, `requestId`, optional hashed `userId`, `route`, and `duration`. The shared logger redacts tokens, keys, authorization headers, cookies, DSNs, passwords, full email addresses, and phone numbers before output.

## PII policy and retention

- `sendDefaultPii` is disabled in Sentry for web and mobile.
- Do not log request bodies, access tokens, API keys, full email addresses, phone numbers, payment credentials, or delivery-photo contents.
- User IDs are hashed before structured logging; the hash is for correlation, not identity disclosure.
- Keep Sentry and log retention aligned with [data retention](../data/retention.md) and the configured Sentry project policy. Delete or shorten retention when the incident window closes.
- Configure Sentry data scrubbing to remove authorization headers, cookies, query-string secrets, request bodies, email/phone fields, and user IP addresses. Review both server and mobile projects before enabling production capture.

## Looking up a request ID

1. Copy the `x-request-id` response header from the browser/network panel or server response.
2. Search the web log sink for the exact `requestId` JSON field.
3. Search Sentry for the same request ID in event tags or breadcrumbs when the integration has attached it.
4. For payment incidents, also search `provider_event_id` and `event_type`; the payment event row and webhook logs are the source of truth for replay status.
5. For worker incidents, use the worker execution `requestId` and provider/message identifiers together.

## Operational boundaries

DSNs are configuration values only and must never be hardcoded. Sentry auth tokens are server/CI/EAS secrets and must never use `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`. Observability must not weaken RLS or expose service-role credentials.
