# ADR-0004: RLS is the authorization boundary

## Context

Web and mobile clients access Supabase-backed data. Authorization must remain
correct even when a client is modified or a request bypasses UI checks.

## Decision

Every application table is protected by PostgreSQL Row Level Security. RLS
policies enforce public visibility, membership, ownership, and moderator/admin
access. Server routes may add validation and workflow checks, but they do not
replace RLS. Service-only tables have RLS enabled and no anon/authenticated
policies.

## Consequences

- Unauthorized reads and writes fail at the database boundary.
- Policy changes require a migration and allow/deny tests.
- Public browsing must be represented by explicit, narrow public policies.
- Policy debugging requires checking both route authorization and database
  identity (`auth.uid()`/role).

## Alternatives

- Authorize only in the web/mobile API: rejected because direct database access
  or a future client could bypass it.
- Use a single broad authenticated policy: rejected because it would overexpose
  private communities, user data, and financial records.
