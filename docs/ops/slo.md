# Service-level objectives

These are launch gates, not a claim that production monitoring already exists. SQL queries run with a read-only service account against Supabase. Log queries run against the structured-log sink described in [observability](observability.md); replace `logs` with the selected sink's view name before wiring a dashboard.

All windows use UTC and exclude local development. The numerator and denominator must be retained with the dashboard snapshot so a low-volume period cannot look healthy by accident.

## SLOs

| SLO                            |                                   Target | Window                                           | Measurement                                                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------: | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth success rate              |                                 >= 99.5% | Rolling 30 days, minimum 100 attempts            | Structured logs: `event = 'auth'`, `outcome IN ('success','failure')`; success divided by all attempts. See query A.                                                                                             |
| Webhook processing success     |                                 >= 99.9% | Rolling 30 days, minimum 100 events              | `payment_events`: processed or ignored divided by all received events; failed events are failures. See query B.                                                                                                  |
| Checkout success               |   >= 98% of provider-attempted checkouts | Rolling 7 days, minimum 50 attempts              | `payment_transactions`: succeeded divided by rows with `status IN ('pending','succeeded','failed','refunded','partially_refunded')` and `purpose` in the checkout purposes used by the application. See query C. |
| Feed API p95 latency           |                                <= 750 ms | Rolling 7 days, minimum 1,000 requests           | Structured logs for `/api/feed`, `outcome = 'success'`, percentile of numeric `duration` in milliseconds. See query D.                                                                                           |
| Directory API p95 latency      |                                <= 750 ms | Rolling 7 days, minimum 1,000 requests           | Structured logs for `/api/businesses`, `outcome = 'success'`, percentile of numeric `duration` in milliseconds. See query E.                                                                                     |
| Deletion completion within SLA |         >= 99% completed within 24 hours | Rolling 30 days, minimum 20 completed requests   | `deletion_requests`: completed rows with `completed_at - requested_at <= interval '24 hours'` divided by completed rows. See query F.                                                                            |
| Outbox dead-letter rate        | < 0.1% and zero unexplained dead letters | Rolling 24 hours, minimum 100 attempted messages | `outbox_messages`: `status = 'dead'` divided by rows with `attempts > 0`; investigate any dead letter even when the percentage target is met. See query G.                                                       |

## Measurement queries

### Query A — authentication

Authentication is handled by Supabase Auth, so there is no application table that records every attempt. Emit a structured event at the auth boundary with `event = 'auth'`, `outcome`, `route`, and `duration`; never include credentials or full contact details.

```sql
select
  100.0 * count(*) filter (where outcome = 'success') / nullif(count(*), 0) as success_rate,
  count(*) as attempts
from logs
where event = 'auth'
  and occurred_at >= now() - interval '30 days'
  and outcome in ('success', 'failure');
```

### Query B — payment webhooks

```sql
select
  100.0 * count(*) filter (where status in ('processed', 'ignored')) / nullif(count(*), 0) as success_rate,
  count(*) as received,
  count(*) filter (where status = 'failed') as failed
from public.payment_events
where received_at >= now() - interval '30 days';
```

### Query C — checkout

```sql
select
  100.0 * count(*) filter (where status = 'succeeded') / nullif(count(*), 0) as success_rate,
  count(*) as attempts,
  count(*) filter (where status = 'failed') as failed
from public.payment_transactions
where created_at >= now() - interval '7 days'
  and status in ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
```

The checkout SLO is not a statement that a payment was successful. The verified provider webhook and `payment_transactions` status remain the source of truth.

### Query D/E — API latency

Use the same query with `route = '/api/feed'` for Query D and `route = '/api/businesses'` for Query E:

```sql
select
  percentile_cont(0.95) within group (order by duration_ms) as p95_ms,
  count(*) as requests
from logs
where route = '/api/feed'
  and outcome = 'success'
  and occurred_at >= now() - interval '7 days';
```

### Query F — deletion completion

```sql
select
  100.0 * count(*) filter (
    where status = 'completed'
      and completed_at - requested_at <= interval '24 hours'
  ) / nullif(count(*) filter (where status = 'completed'), 0) as within_sla,
  count(*) filter (where status in ('queued', 'processing')) as still_open
from public.deletion_requests
where requested_at >= now() - interval '30 days';
```

### Query G — outbox dead letters

```sql
select
  100.0 * count(*) filter (where status = 'dead') / nullif(count(*) filter (where attempts > 0), 0) as dead_letter_rate,
  count(*) filter (where status = 'dead') as dead_letters,
  count(*) filter (where status in ('pending', 'failed')) as pending_or_retrying
from public.outbox_messages
where created_at >= now() - interval '24 hours';
```

## Dashboard panels

1. Auth success rate and attempt volume — Query A; break down by `route` and `outcome`.
2. Payment webhook success rate — Query B; show `received`, `failed`, and `status` by provider.
3. Checkout success and failure volume — Query C; group by provider, currency, and status.
4. Feed API p50/p95/p99 latency — Query D; group by route and HTTP outcome.
5. Business directory API p50/p95/p99 latency — Query E; group by route and HTTP outcome.
6. Deletion SLA and queue age — Query F plus `max(now() - requested_at)` for open rows.
7. Outbox retries and dead letters — Query G; group by channel and template, without displaying recipients.
8. RLS denials and application errors — structured logs with `outcome = 'denied'` or `level = 'error'`, grouped by route and request ID.

Record dashboard owner, query revision, and last review date in the release ticket. No monitoring vendor is required by this specification.
