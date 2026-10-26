# Dependency audit exceptions

`pnpm audit --audit-level high` is a release gate. A high or critical finding
blocks CI and release until it is upgraded, removed, or formally accepted.

## Active exceptions

There are currently no active exceptions.

If an exception is unavoidable, add one row with the package, advisory ID,
severity, affected version range, justification, compensating control, owner,
expiry date, and approving security reviewer. Exceptions must be time-limited;
do not hide findings with a global audit ignore or by lowering the gate.
