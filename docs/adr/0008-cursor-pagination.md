# ADR-0008: Cursor pagination

## Context

Feeds, directories, jobs, services, events, communities, products, and comment
lists can grow beyond a single response. Offset pagination becomes unstable
when new rows are inserted while a user is paging.

## Decision

Cursor-paginated APIs use an opaque timestamp cursor, fetch at most `limit + 1`
rows, return at most 50 rows, and expose `nextCursor` when another page exists.
The shared pagination helper rejects invalid or oversized limits with a clear
400 response. Supporting indexes are maintained and checked by query-plan SQL.

## Consequences

- Clients must treat cursors as opaque and stop when `nextCursor` is null.
- Results remain more stable during concurrent inserts than offset pages.
- Each endpoint must keep ordering and index usage aligned with its cursor.

## Alternatives

- Offset pagination: rejected for feed and directory consistency at scale.
- Unbounded result lists: rejected because they create latency, memory, and
  denial-of-service risk.
- Client-generated cursors: rejected because ordering and authorization belong
  to the server.
