# Incident response runbook

| Field                           | Procedure                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Symptom                         | A security, payment, data-loss, availability, or privacy incident is suspected.                                                                                                                                                                                                                                                      |
| Impact                          | User safety, funds, personal data, service availability, or regulatory obligations may be affected.                                                                                                                                                                                                                                  |
| Detection                       | Monitoring, support report, provider console, user report, audit log, or reconciliation drift.                                                                                                                                                                                                                                       |
| Immediate mitigation            | Name an incident lead, open an incident channel, preserve logs and provider IDs, disable the smallest affected feature, and keep `PAYMENTS_LIVE_ENABLED=false` unless explicitly approved.                                                                                                                                           |
| Root cause investigation        | Build a UTC timeline from deploys, `payment_events`, `payment_transactions`, `deletion_requests`, audit logs, provider dashboards, and access logs. Redact secrets and unnecessary PII.                                                                                                                                              |
| Recovery steps (exact commands) | `git log -1 --oneline`; `pnpm release:check`; `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm reconcile:stock`; `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm process:deletions`; and use the targeted runbook for payment replay/refund or backup restore. Any provider dashboard action **requires provider console**. |
| Post-incident actions           | Complete the template below, notify affected users/regulators where required, rotate credentials if exposed, add tests/alerts, and track actions to closure.                                                                                                                                                                         |
| Owner                           | Incident lead assigns Platform, Payments, Privacy, Support, and Legal owners.                                                                                                                                                                                                                                                        |

## Severity

- **SEV-1:** active security/privacy exposure, unauthorized money movement, or broad outage. Page immediately; executive/legal involvement.
- **SEV-2:** material payment/data correctness issue or major feature outage with workaround. Page the service owner and support.
- **SEV-3:** limited user impact, delayed queue, or isolated operational defect. Triage during the on-call shift.

## Communications template

```text
Incident: [short name]
Severity: [SEV-1/2/3]
Started (UTC): [time]
Current impact: [users, payments, data]
Mitigation: [what is disabled or contained]
Next update: [time]
Owner/contact: [name/channel]
```

## Postmortem template

```text
Summary:
Impact and duration:
Detection:
Timeline (UTC):
Root cause:
Contributing factors:
What went well:
What went poorly:
Customer/regulatory communications:
Corrective actions (owner and due date):
Evidence links and provider case IDs:
```
