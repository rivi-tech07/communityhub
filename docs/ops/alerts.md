# Alert rules

Alerts are provider-neutral specifications. Route them through the existing on-call process; do not add a monitoring SDK or vendor dependency in this change. Every alert should include the dashboard panel, UTC window, observed value, sample count, and a request ID or database row ID when available.

| Alert                            | Severity | Threshold                                                                                                         | Routing                                                        | Runbook                                                                                          |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Auth success SLO breach          | SEV-2    | Auth success < 99.5% over 30 days with >= 100 attempts, or < 95% over 15 minutes with >= 20 attempts              | On-call; security if failures indicate abuse                   | [Incident response](../runbooks/incident-response.md)                                            |
| Webhook processing SLO breach    | SEV-1    | `payment_events` success < 99.9% over 30 days, or any provider has >= 5 failed events in 15 minutes               | Payments on-call immediately                                   | [Webhook replay](../runbooks/webhook-replay.md), [Reconciliation](../runbooks/reconciliation.md) |
| Checkout SLO breach              | SEV-1    | Checkout success < 98% over 7 days with >= 50 attempts, or >= 5 failed payment attempts in 15 minutes             | Payments on-call; pause fulfilment if money state is uncertain | [Reconciliation](../runbooks/reconciliation.md), [Refund](../runbooks/refund.md)                 |
| Feed API latency SLO breach      | SEV-2    | `/api/feed` p95 > 750 ms for 15 minutes with >= 100 requests                                                      | Web on-call                                                    | [Incident response](../runbooks/incident-response.md)                                            |
| Directory API latency SLO breach | SEV-2    | `/api/businesses` p95 > 750 ms for 15 minutes with >= 100 requests                                                | Web on-call                                                    | [Incident response](../runbooks/incident-response.md)                                            |
| Deletion SLA breach              | SEV-2    | < 99% within 24 hours over 30 days, or any queued/processing request older than 24 hours                          | Privacy owner and on-call                                      | [Failed deletion](../runbooks/failed-deletion.md)                                                |
| Outbox dead-letter rate breach   | SEV-2    | Any unexplained `outbox_messages.status = 'dead'` for 15 minutes, or dead-letter rate >= 0.1% over 24 hours       | On-call; application owner                                     | [Incident response](../runbooks/incident-response.md)                                            |
| Payment failure spike            | SEV-1    | >= 5 `payment_transactions.status = 'failed'` for one provider in 15 minutes, or 3 consecutive provider failures  | Payments on-call                                               | [Reconciliation](../runbooks/reconciliation.md)                                                  |
| RLS denial spike                 | SEV-2    | >= 20 `outcome = 'denied'`/RLS errors for one route in 15 minutes, or any confirmed cross-user read               | Security and web on-call                                       | [Incident response](../runbooks/incident-response.md)                                            |
| Stuck deletion requests          | SEV-2    | Any `deletion_requests` row in `queued` or `processing` older than 24 hours, or 3 worker failures for one request | Privacy owner and on-call                                      | [Failed deletion](../runbooks/failed-deletion.md)                                                |

## Alert queries

### Payment and webhook failures

```sql
select provider, count(*) as failures
from public.payment_events
where status = 'failed'
  and received_at >= now() - interval '15 minutes'
group by provider;

select provider, count(*) as failures
from public.payment_transactions
where status = 'failed'
  and updated_at >= now() - interval '15 minutes'
group by provider;
```

### Dead letters and stuck deletion requests

```sql
select id, channel, attempts, created_at, last_error
from public.outbox_messages
where status = 'dead'
  and created_at <= now() - interval '15 minutes';

select id, user_id, status, attempts, requested_at, last_error
from public.deletion_requests
where status in ('queued', 'processing')
  and requested_at <= now() - interval '24 hours';
```

### RLS denial spike

RLS denials are application/log events rather than a queryable application table. Alert on structured logs containing `outcome = 'denied'`, PostgreSQL SQLSTATE `42501`, or the application's authorization-denied event. Group by `route`, `requestId`, and deployment SHA; never include the request body or token.

```sql
select route, count(*) as denials
from logs
where occurred_at >= now() - interval '15 minutes'
  and (outcome = 'denied' or sqlstate = '42501')
group by route
having count(*) >= 20;
```

### Latency and SLO alerts

Use the measurement queries in [SLOs](slo.md), adding `having` clauses for the thresholds in this document. For example:

```sql
select percentile_cont(0.95) within group (order by duration_ms) as p95_ms
from logs
where route = '/api/feed'
  and occurred_at >= now() - interval '15 minutes'
having percentile_cont(0.95) within group (order by duration_ms) > 750;
```

## Alert hygiene

- Deduplicate by alert name, provider, route, and deployment SHA.
- Include a link to the relevant runbook and dashboard panel in the notification.
- Resolve only after the threshold is healthy for two consecutive evaluation windows.
- Payment and deletion alerts require an explicit incident note even when the underlying provider recovers automatically.
