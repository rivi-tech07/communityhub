import { createClient } from '@supabase/supabase-js';
import { failRetentionRun, finishRetentionRun, startRetentionRun } from './retention-run.mjs';

const SAMPLE_TABLES = [
  'posts',
  'communities',
  'products',
  'businesses',
  'job_listings',
  'employer_profiles',
  'services',
  'events',
];
const DELETE_ORDER = [
  'posts',
  'products',
  'job_listings',
  'services',
  'events',
  'communities',
  'businesses',
  'employer_profiles',
];

function clientFromEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function productionGuard(force) {
  const production = [process.env.NODE_ENV, process.env.APP_ENV, process.env.VERCEL_ENV].some(
    (value) => value?.toLowerCase() === 'production',
  );
  if (production && !force)
    throw new Error('Sample purge refused in production. Pass --force-sample-purge explicitly.');
}

export async function purgeSampleData(admin, { apply = false, force = false } = {}) {
  productionGuard(force);
  const counts = {};
  for (const table of SAMPLE_TABLES) {
    const result = await admin.from(table).select('id').eq('is_sample', true);
    if (result.error) throw result.error;
    counts[table] = (result.data ?? []).length;
  }
  if (apply) {
    for (const table of DELETE_ORDER) {
      if (!counts[table]) continue;
      const result = await admin.from(table).delete().eq('is_sample', true);
      if (result.error) throw result.error;
    }
  }
  return { dry_run: !apply, counts };
}

async function main() {
  const force = process.argv.includes('--force-sample-purge');
  const apply = process.argv.includes('--apply');
  const admin = clientFromEnv();
  const runId = await startRetentionRun(admin, 'sample_purge', apply ? 'apply' : 'dry_run');
  try {
    const result = await purgeSampleData(admin, { apply, force });
    await finishRetentionRun(admin, runId, result);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await failRetentionRun(admin, runId, error);
    throw error;
  }
}

if (process.argv[1]?.endsWith('purge-sample-data.mjs'))
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
