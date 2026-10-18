import { afterEach, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceRoleKey);
const suite = enabled ? describe : describe.skip;

suite('CommunityHub Phase 5 access control', () => {
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
    const email = `phase5-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: 'phase-five-test-password',
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('User creation failed');
    created.push(data.user.id);
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.signInWithPassword({
      email,
      password: 'phase-five-test-password',
    });
    if (login.error) throw login.error;
    return { id: data.user.id, client };
  }
  it('prevents unauthorized employer writes and enforces event capacity', async () => {
    const owner = await account('owner');
    const other = await account('other');
    const employer = await owner.client
      .from('employer_profiles')
      .insert({ owner_id: owner.id, name: `Phase 5 Employer ${Date.now()}` })
      .select('id')
      .single();
    expect(employer.error).toBeNull();
    const forbidden = await other.client.from('job_listings').insert({
      employer_id: employer.data!.id,
      title: 'Nope',
      description: 'This listing should not be writable by another account.',
      job_type: 'full_time',
    });
    expect(forbidden.error).toBeTruthy();
    const event = await owner.client
      .from('events')
      .insert({
        organizer_id: owner.id,
        title: `Small Event ${Date.now()}`,
        description: 'A capacity test event for Phase 5.',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 90000000).toISOString(),
        online_url: 'https://example.test/event',
        capacity: 1,
        status: 'published',
        is_free: true,
      })
      .select('id')
      .single();
    expect(event.error).toBeNull();
    expect(
      (
        await owner.client
          .from('event_registrations')
          .insert({ event_id: event.data!.id, user_id: owner.id })
      ).error,
    ).toBeNull();
    expect(
      (
        await other.client
          .from('event_registrations')
          .insert({ event_id: event.data!.id, user_id: other.id })
      ).error,
    ).toBeTruthy();
  });
});
