export const DEFAULT_RETENTION_DAYS = {
  softDeleted: 90,
  auditLogs: 365,
} as const;

const DAY_MS = 86_400_000;

export function isPastRetention(
  recordTimestamp: Date | string,
  retentionDays: number,
  now: Date = new Date(),
): boolean {
  if (!Number.isInteger(retentionDays) || retentionDays < 1)
    throw new Error('retentionDays must be a positive integer.');
  const timestamp = recordTimestamp instanceof Date ? recordTimestamp : new Date(recordTimestamp);
  if (Number.isNaN(timestamp.getTime())) throw new Error('recordTimestamp must be a valid date.');
  return timestamp.getTime() <= now.getTime() - retentionDays * DAY_MS;
}

export function assertPurgeAllowed(opts: {
  job: 'soft_deleted_purge' | 'sample_purge' | 'audit_log_purge';
  env: string | undefined;
  forceFlag: boolean;
}): { allowed: boolean; reason?: string } {
  const isProduction = opts.env?.toLowerCase() === 'production';
  if (opts.job === 'sample_purge' && isProduction && !opts.forceFlag)
    return {
      allowed: false,
      reason: 'Sample purge is blocked in production without --force-sample-purge.',
    };
  return { allowed: true };
}
