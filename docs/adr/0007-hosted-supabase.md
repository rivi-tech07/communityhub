# ADR-0007: Hosted Supabase

## Context

CommunityHub uses Supabase Auth, Postgres, Storage, and server-side APIs. The
project is deployed to a hosted Supabase environment, while local Supabase is
used for disposable development and integration testing.

## Decision

Use hosted Supabase as the application data and authentication platform. Schema
changes are versioned as migrations and applied through the documented Supabase
CLI workflow. Production, staging/preview, and local test projects remain
separate environments; previews must never point at production.

## Consequences

- Auth, database, storage, RLS, backups, and provider configuration have hosted
  operational dependencies.
- Local CI tests need Docker/Supabase CLI or an explicitly configured disposable
  project.
- Migration order and environment targeting must be verified before applying
  changes.

## Alternatives

- Operate Postgres/Auth/Storage independently: rejected because it would create
  a larger operational surface without a current product need.
- Share one Supabase project across preview and production: rejected because it
  risks data leakage and destructive test interactions.
