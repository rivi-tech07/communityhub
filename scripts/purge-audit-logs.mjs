import { createClient } from '@supabase/supabase-js';
import { failRetentionRun, finishRetentionRun, startRetentionRun } from './retention-run.mjs';

export const DEFAULT_DAYS = 365;
export const NEVER_PURGE = [
  'payment_events',
  'payment_webhook_events',
  'transactions',
  'payment_transactions',
];
export const PURGEABLE = [{ table: 'moderation_audit_log', column: 'created_at' }];

function clientFromEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function purgeAuditLogs(admin, { days = DEFAULT_DAYS, apply = false } = {}) {
  if (!Number.isInteger(days) || days < 1) throw new Error('days must be a positive integer.');
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const counts = {};
  for (const entry of PURGEABLE) {
    const result = await admin.from(entry.table).select('id').lt(entry.column, cutoff);
    if (result.error) throw result.error;
    counts[entry.table] = (result.data ?? []).length;
    if (apply && counts[entry.table]) {
      const deletion = await admin.from(entry.table).delete().lt(entry.column, cutoff);
      if (deletion.error) throw deletion.error;
    }
  }
  return { dry_run: !apply, cutoff, counts, never_purge: NEVER_PURGE };
}

async function main() {
  const index = process.argv.indexOf('--days');
  const days = Number(
    index >= 0 ? process.argv[index + 1] : (process.env.AUDIT_RETENTION_DAYS ?? DEFAULT_DAYS),
  );
  const apply = process.argv.includes('--apply');
  const admin = clientFromEnv();
  const runId = await startRetentionRun(admin, 'audit_log_purge', apply ? 'apply' : 'dry_run');
  try {
    const result = await purgeAuditLogs(admin, { days, apply });
    await finishRetentionRun(admin, runId, result);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await failRetentionRun(admin, runId, error);
    throw error;
  }
}

if (process.argv[1]?.endsWith('purge-audit-logs.mjs'))
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
