# ADR-0003: Soft-delete with audit history

## Context

Community content can be reported or moderated, and account deletion must
preserve referential integrity and an auditable record. The application uses
soft-delete fields for content and retains moderation history; retention jobs
later purge eligible rows.

## Decision

Moderation removes content by marking it deleted and records the action in the
appropriate audit/moderation log. Account erasure anonymizes retained content,
removes private uploads, and processes deletion asynchronously. Hard purge is
performed only by the documented retention jobs after the retention period.

## Consequences

- Moderators can investigate reports without exposing removed content publicly.
- Deletion is retryable and does not depend on a long synchronous request.
- Retention and purge jobs must be monitored and must not remove required audit
  records.

## Alternatives

- Delete content immediately: rejected because it breaks auditability and can
  violate referential-integrity requirements.
- Keep all personal data indefinitely: rejected because it conflicts with
  erasure and retention duties.
