export async function startRetentionRun(admin, job, mode) {
  const result = await admin
    .from('retention_runs')
    .insert({ job, mode, status: 'running' })
    .select('id')
    .single();
  if (result.error || !result.data)
    throw result.error ?? new Error('Unable to start retention run.');
  return result.data.id;
}

export async function finishRetentionRun(admin, id, result) {
  const update = await admin
    .from('retention_runs')
    .update({
      status: 'succeeded',
      finished_at: new Date().toISOString(),
      rows_affected: Object.values(result.counts ?? {}).reduce(
        (sum, value) => sum + Number(value),
        0,
      ),
      details: result,
    })
    .eq('id', id);
  if (update.error) throw update.error;
}

export async function failRetentionRun(admin, id, error) {
  const update = await admin
    .from('retention_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      last_error: String(error?.message ?? error),
    })
    .eq('id', id);
  if (update.error) throw update.error;
}
