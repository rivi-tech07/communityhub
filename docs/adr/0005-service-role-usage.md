# ADR-0005: Service-role usage policy

## Context

Some workflows need privileged, asynchronous access: payment webhooks,
account-deletion workers, outbox workers, feature-flag administration, and
other server-only operations. The Supabase service role bypasses RLS.

## Decision

The service-role key may exist only in server processes, protected workers, and
CI jobs that explicitly require it. It must never be placed in `NEXT_PUBLIC_*`,
`EXPO_PUBLIC_*`, browser code, mobile bundles, committed env files, logs, or
client requests. Server routes must authenticate and authorize the caller
before invoking a privileged operation; workers must scope operations to their
job and remain auditable.

## Consequences

- Client builds fail closed when public Supabase configuration is missing.
- Secret scanning and bundle scanning are release controls.
- Privileged workers require operational secret rotation and least-privilege
  deployment environments.

## Alternatives

- Put the service role in clients for simpler CRUD: rejected because it bypasses
  RLS for every user.
- Create broad authenticated policies instead: rejected because server-only
  tables and sensitive workflows need a separate trust boundary.
