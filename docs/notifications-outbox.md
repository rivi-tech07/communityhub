# Application notification outbox

Application notifications use `outbox_messages`. A triggering database action, such as approving a community membership, writes its notification row in the same transaction. The sender worker (`pnpm process:outbox`) sends due rows, retries at 1 minute, 5 minutes, 15 minutes, 1 hour, and 6 hours, then marks the fifth failure `dead` and emits a structured alert. A unique `dedupe_key` prevents duplicate messages.

Provider URLs and tokens are server-only (`OUTBOX_EMAIL_WEBHOOK_URL`, `OUTBOX_SMS_WEBHOOK_URL`, and optional `OUTBOX_PROVIDER_TOKEN`). Missing providers fail closed and leave the row retryable; request handlers never call a provider synchronously.

## Supabase Auth boundary

Supabase Auth remains responsible for confirmation emails, password-recovery emails, and SMS OTP delivery. Those Auth flows are intentionally not copied into this application outbox, and this worker does not claim delivery for them. The outbox covers application notifications only, such as a community membership approval.
