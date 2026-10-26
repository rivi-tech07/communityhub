import { createClient } from '@supabase/supabase-js';
import { failRetentionRun, finishRetentionRun, startRetentionRun } from './retention-run.mjs';

export const DEFAULT_DAYS = 90;

function clientFromEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function purgeSoftDeleted(admin, { days = DEFAULT_DAYS, apply = false } = {}) {
  if (!Number.isInteger(days) || days < 1) throw new Error('days must be a positive integer.');
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const [postsResult, commentsResult] = await Promise.all([
    admin.from('posts').select('id').lt('removed_at', cutoff),
    admin.from('comments').select('id,post_id').lt('removed_at', cutoff),
  ]);
  if (postsResult.error) throw postsResult.error;
  if (commentsResult.error) throw commentsResult.error;
  const postIds = (postsResult.data ?? []).map((row) => row.id);
  const commentIds = (commentsResult.data ?? []).map((row) => row.id);
  const mediaResult = postIds.length
    ? await admin.from('post_media').select('id').in('post_id', postIds)
    : { data: [], error: null };
  if (mediaResult.error) throw mediaResult.error;
  const counts = {
    posts: postIds.length,
    comments: commentIds.length,
    media: (mediaResult.data ?? []).length,
  };
  if (!apply) return { dry_run: true, cutoff, counts };

  // Replace text before deletion so a partial failure cannot leave the old body behind.
  if (postIds.length) {
    const result = await admin
      .from('posts')
      .update({ body: '[deleted]', removed_reason: 'retention purge' })
      .in('id', postIds);
    if (result.error) throw result.error;
  }
  if (commentIds.length) {
    const result = await admin
      .from('comments')
      .update({ body: '[deleted]', removed_reason: 'retention purge' })
      .in('id', commentIds);
    if (result.error) throw result.error;
  }
  if (postIds.length) {
    const result = await admin.from('post_media').delete().in('post_id', postIds);
    if (result.error) throw result.error;
  }
  if (commentIds.length) {
    const result = await admin.from('comments').delete().in('id', commentIds);
    if (result.error) throw result.error;
  }
  if (postIds.length) {
    const result = await admin.from('posts').delete().in('id', postIds);
    if (result.error) throw result.error;
  }
  return { dry_run: false, cutoff, counts };
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const days = Number(option('--days', process.env.SOFT_DELETE_RETENTION_DAYS ?? DEFAULT_DAYS));
  const apply = process.argv.includes('--apply');
  const admin = clientFromEnv();
  const runId = await startRetentionRun(admin, 'soft_deleted_purge', apply ? 'apply' : 'dry_run');
  try {
    const result = await purgeSoftDeleted(admin, { days, apply });
    await finishRetentionRun(admin, runId, result);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await failRetentionRun(admin, runId, error);
    throw error;
  }
}

if (process.argv[1]?.endsWith('purge-soft-deleted.mjs'))
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
