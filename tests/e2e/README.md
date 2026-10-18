# End-to-end staging matrix

Run this matrix against a disposable staging deployment with seeded fixtures and provider sandbox credentials. The repository currently keeps E2E execution out of the default local suite because Playwright/device runners and provider sandbox accounts are external release dependencies.

1. Register/email verify, phone OTP, login, recovery, refresh, logout, and account deletion.
2. Exercise public/private community membership, post/comment/report/moderation access.
3. Register a business, verify ownership, create/edit catalog and delivery settings, and reject unauthorized writes.
4. Create employer/job/service/event records; verify sponsorship labels, CV privacy/signed URLs, service quote access, event capacity, and expiry.
5. Create a physical order, test checkout success/failure/cancellation, duplicate webhook, refund, and reconciliation.
6. Create and approve paid promotions; verify activation only after a verified payment event, duplicate-event idempotency, expiry, refund cancellation, and unauthorized access.
7. Verify mobile deep links, push permission denial, reviewer accounts, account deletion, privacy/terms links, and no payment flow is exposed before store billing approval.
