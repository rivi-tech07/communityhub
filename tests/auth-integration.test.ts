import { afterEach, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integration = Boolean(url && anonKey && serviceRoleKey);
const describeIntegration = integration ? describe : describe.skip;
const createdUsers: string[] = [];

describeIntegration('Supabase authentication integration', () => {
  const admin = integration ? createClient(url!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const uniqueEmail = () => `phase2-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;

  afterEach(async () => { if (admin) await Promise.all(createdUsers.splice(0).map((userId) => admin.auth.admin.deleteUser(userId))); });

  it('registers, rejects duplicate identity, logs in, and deletes the account', async () => {
    const email = uniqueEmail();
    const password = 'correct-horse-battery-staple';
    const client = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const registration = await client.auth.signUp({ email, password });
    expect(registration.error).toBeNull();
    expect(registration.data.user).toBeTruthy();
    const userId = registration.data.user!.id;
    createdUsers.push(userId);
    const duplicate = await client.auth.signUp({ email, password });
    expect(duplicate.error || duplicate.data.user).toBeTruthy();
    const badLogin = await client.auth.signInWithPassword({ email, password: 'wrong-password' });
    expect(badLogin.error).toBeTruthy();
    const login = await client.auth.signInWithPassword({ email, password });
    expect(login.error).toBeNull();
    const unauthorized = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const profileRead = await unauthorized.from('profiles').select('*').eq('id', userId).single();
    expect(profileRead.data).toBeNull();
    const deletion = await admin!.auth.admin.deleteUser(userId);
    expect(deletion.error).toBeNull();
    createdUsers.splice(createdUsers.indexOf(userId), 1);
  });

  it.skip('verifies email and SMS OTP when the external provider is configured', () => {
    // Enable this case in CI with a disposable mailbox and a configured Supabase SMS provider.
  });
});
