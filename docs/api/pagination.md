# Pagination contract

All cursor-paginated web APIs use the same query parameters and response shape.

## Request

- `limit` is optional and defaults to `20`.
- `limit` must be an integer from `1` through `50` inclusive. Requests above
  `50`, below `1`, fractional values, and non-numeric values are rejected with
  HTTP `400` and this shape:

  ```json
  {
    "error": "limit must be an integer between 1 and 50.",
    "code": "PAGINATION_LIMIT_EXCEEDED"
  }
  ```

- `cursor` is an opaque timestamp cursor returned by the previous response. Do
  not manufacture or reorder cursors on the client.
- Search endpoints may also accept `q` and endpoint-specific filters.

## Response

List responses contain the resource collection and a nullable `nextCursor`:

```json
{
  "items": [],
  "nextCursor": "2026-10-26T10:30:00.000Z"
}
```

The server fetches at most `limit + 1` rows to determine whether another page
exists, then returns at most `limit` rows. When no page remains,
`nextCursor` is `null`. Clients should stop requesting pages when it is null.

The contract is implemented by `apps/web/lib/pagination.ts` and currently
covers feed, communities, businesses, products, jobs, services, events, and
post comments. Moderation report listing uses the same maximum even though it
does not yet expose a cursor.

## Query-plan checks

The intended indexes for feed, community search, directory search, and comment
listing are asserted in `supabase/tests/query-plans.sql`. Run it against the
local disposable database after `pnpm db:reset`:

```sh
supabase status -o env
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/query-plans.sql
```

The CI integration job runs this SQL against its disposable Supabase instance.
It fails if an assertion sees a sequential scan or the expected index is not in
the plan. The check intentionally disables sequential scans so small seed data
cannot hide a missing index.
