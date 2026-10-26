import { describe, expect, it } from 'vitest';
import {
  assertPurgeAllowed,
  DEFAULT_RETENTION_DAYS,
  isPastRetention,
} from '../packages/shared/src/retention';

describe('retention window', () => {
  const now = new Date('2026-06-01T00:00:00Z');

  it('treats the retention boundary as expired', () => {
    const boundary = new Date(now.getTime() - 90 * 86_400_000);
    expect(isPastRetention(boundary, 90, now)).toBe(true);
  });

  it('keeps records one second inside the retention window', () => {
    const recent = new Date(now.getTime() - 90 * 86_400_000 + 1000);
    expect(isPastRetention(recent, 90, now)).toBe(false);
  });

  it('accepts ISO timestamps and exposes documented defaults', () => {
    expect(isPastRetention('2025-01-01T00:00:00Z', 90, now)).toBe(true);
    expect(DEFAULT_RETENTION_DAYS).toEqual({ softDeleted: 90, auditLogs: 365 });
  });
});

describe('sample purge guard', () => {
  it('blocks production without the explicit force flag', () => {
    const result = assertPurgeAllowed({
      job: 'sample_purge',
      env: 'production',
      forceFlag: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/force-sample-purge/);
  });

  it('allows production sample purge only with explicit force', () => {
    expect(
      assertPurgeAllowed({ job: 'sample_purge', env: 'production', forceFlag: true }).allowed,
    ).toBe(true);
  });

  it('allows non-sample purge jobs without the force flag', () => {
    for (const job of ['soft_deleted_purge', 'audit_log_purge'] as const)
      expect(assertPurgeAllowed({ job, env: 'production', forceFlag: false }).allowed).toBe(true);
  });
});
