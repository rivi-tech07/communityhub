import { afterEach, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceRoleKey);
const suite = enabled ? describe : describe.skip;

suite('CommunityHub Phase 6 transaction access', () => {
  const admin = enabled
    ? createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const created: string[] = [];
  afterEach(async () => {
    if (admin) await Promise.all(created.splice(0).map((id) => admin.auth.admin.deleteUser(id)));
  });
  async function account(label: string) {
    const email = `phase6-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: 'phase-six-test-password',
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('User creation failed');
    created.push(data.user.id);
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.signInWithPassword({
      email,
      password: 'phase-six-test-password',
    });
    if (login.error) throw login.error;
    return { id: data.user.id, client };
  }
  it('enforces transaction privacy and idempotency uniqueness', async () => {
    const payer = await account('payer');
    const other = await account('other');
    const idempotencyKey = `phase6-${Date.now()}`;
    const transaction = await admin!
      .from('payment_transactions')
      .insert({
        payer_id: payer.id,
        provider: 'stripe',
        purpose: 'promotion',
        reference_id: crypto.randomUUID(),
        amount_minor: 700,
        currency: 'GBP',
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();
    expect(transaction.error).toBeNull();
    const hidden = await other.client
      .from('payment_transactions')
      .select('id')
      .eq('id', transaction.data!.id)
      .maybeSingle();
    expect(hidden.data).toBeNull();
    const duplicate = await admin!.from('payment_transactions').insert({
      payer_id: payer.id,
      provider: 'stripe',
      purpose: 'promotion',
      reference_id: crypto.randomUUID(),
      amount_minor: 700,
      currency: 'GBP',
      idempotency_key: idempotencyKey,
    });
    expect(duplicate.error).toBeTruthy();
  });
});
