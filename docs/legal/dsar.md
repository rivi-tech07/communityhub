# Data Subject Access Request process — DRAFT

**DRAFT — operational process requires privacy-owner approval.**

## Process

1. Receive the request at **[PLACEHOLDER: privacy contact/email]** and record receipt date and requested rights.
2. Assign the privacy owner: **[PLACEHOLDER: approved privacy owner]**. Verify identity proportionately before releasing data.
3. Search the account using the authenticated user ID. Do not search by email alone where identity is uncertain.
4. Generate the export with the service-only script: `SUPABASE_URL="$SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" pnpm export:user-data -- "$USER_ID" > /tmp/communityhub-user-export.json`.
5. Review the bundle for third-party data, legal holds, security-sensitive material, and accidental secrets. The script is export-only and does not delete data.
6. Approve release by the privacy owner and deliver through an approved secure channel. Do not email raw exports without an approved protection method.
7. Record the request, decision, date, scope, and delivery confirmation without putting the export or unnecessary PII into `moderation_audit_log`.

## SLA

Target acknowledgement: 2 business days. Target completion: **[PLACEHOLDER: legally approved statutory SLA]**. Extensions, exemptions, identity failure, and third-party redactions require privacy-owner approval. This SLA is **NOT YET IMPLEMENTED — blocks submission** until jurisdiction and legal deadlines are confirmed.

## Response template

```text
Subject: CommunityHub data request — [PLACEHOLDER: request reference]

Hello [name],

We received your data request on [date]. After verifying your identity, we [attach/provide a secure link to] the data export covering [scope].

The export contains account profile data, community activity, applications, orders, and an upload manifest. It does not include another person’s data or raw provider secrets. Some records may be retained or anonymised where a legal, security, fraud, accounting, or dispute obligation applies; see the retention schedule.

If you believe anything is missing, contact [PLACEHOLDER: privacy contact].

Regards,
[PLACEHOLDER: approved privacy team]
```
