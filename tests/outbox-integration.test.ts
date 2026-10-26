import { afterEach, describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && serviceRoleKey);
const suite = enabled ? describe : describe.skip;

suite('application notification outbox', () => {
  let admin: import('@supabase/supabase-js').SupabaseClient | null = null;
  const getAdmin = async () => {
    if (!admin) {
      const { createClient } = await import('@supabase/supabase-js');
      admin = createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return admin;
  };
  const dedupeKey = `outbox-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  afterEach(async () => {
    if (admin) {
      await admin.from('outbox_messages').delete().eq('dedupe_key', dedupeKey);
    }
  });

  it('uses the database unique key to prevent duplicate notifications', async () => {
    const client = await getAdmin();
    const first = await client
      .from('outbox_messages')
      .insert({
        channel: 'email',
        template: 'test',
        recipient: 'test@example.com',
        payload: { test: true },
        dedupe_key: dedupeKey,
      })
      .select('id')
      .single();
    expect(first.error).toBeNull();

    const duplicate = await client.from('outbox_messages').insert({
      channel: 'email',
      template: 'test',
      recipient: 'test@example.com',
      payload: { test: true },
      dedupe_key: dedupeKey,
    });
    expect(duplicate.error).toBeTruthy();
    const rows = await client.from('outbox_messages').select('id').eq('dedupe_key', dedupeKey);
    expect(rows.data).toHaveLength(1);
  });
});
