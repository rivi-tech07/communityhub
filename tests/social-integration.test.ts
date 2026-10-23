import { afterEach, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integration = Boolean(url && anonKey && serviceRoleKey);
const describeIntegration = url && anonKey && serviceRoleKey ? describe : describe.skip;
const userIds: string[] = [];
const integrationTimeout = 15000;

describeIntegration('CommunityHub social access', () => {
  const admin = integration ? createClient(url!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  let owner: SupabaseClient; let member: SupabaseClient; let outsider: SupabaseClient; let moderator: SupabaseClient;
  const password = 'phase-three-test-password';

  async function createTestUser(label: string) {
    const email = `phase3-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error('Test user was not created.');
    userIds.push(data.user.id);
    const client = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    return { id: data.user.id, client };
  }

  afterEach(async () => { if (admin) await Promise.all(userIds.splice(0).map((id) => admin.auth.admin.deleteUser(id))); });

  it('enforces public/private membership, posting, moderation, and reporting', { timeout: integrationTimeout }, async () => {
    const ownerAccount = await createTestUser('owner'); const memberAccount = await createTestUser('member'); const outsiderAccount = await createTestUser('outsider'); const moderatorAccount = await createTestUser('moderator');
    owner = ownerAccount.client; member = memberAccount.client; outsider = outsiderAccount.client; moderator = moderatorAccount.client;
    await admin!.from('user_roles').insert({ user_id: moderatorAccount.id, role: 'moderator' });
    const publicCommunity = await owner.from('communities').insert({ name: 'Test Public', slug: `test-public-${Date.now()}`, description: 'test', community_type: 'interest', visibility: 'public', created_by: ownerAccount.id, is_sample: false }).select('id').single();
    const privateCommunity = await owner.from('communities').insert({ name: 'Test Private', slug: `test-private-${Date.now()}`, description: 'test', community_type: 'interest', visibility: 'private', created_by: ownerAccount.id, is_sample: false }).select('id').single();
    expect(publicCommunity.error).toBeNull(); expect(privateCommunity.error).toBeNull();
    const publicJoin = await member.from('community_memberships').insert({ community_id: publicCommunity.data!.id, user_id: memberAccount.id, role: 'member', status: 'active' });
    const privateJoin = await outsider.from('community_memberships').insert({ community_id: privateCommunity.data!.id, user_id: outsiderAccount.id, role: 'member', status: 'pending' });
    expect(publicJoin.error).toBeNull(); expect(privateJoin.error).toBeNull();
    const privatePost = await owner.from('posts').insert({ community_id: privateCommunity.data!.id, author_id: ownerAccount.id, body: 'private test post', is_sample: false }).select('id').single();
    expect(privatePost.error).toBeNull();
    const blockedRead = await outsider.from('posts').select('*').eq('id', privatePost.data!.id).single();
    expect(blockedRead.data).toBeNull();
    const unauthorizedPost = await outsider.from('posts').insert({ community_id: privateCommunity.data!.id, author_id: outsiderAccount.id, body: 'should fail' });
    expect(unauthorizedPost.error).toBeTruthy();
    const publicPost = await member.from('posts').insert({ community_id: publicCommunity.data!.id, author_id: memberAccount.id, body: 'public test #communityhub' }).select('id').single();
    expect(publicPost.error).toBeNull();
    const report = await outsider.from('reports').insert({ reporter_id: outsiderAccount.id, post_id: publicPost.data!.id, reason: 'spam', details: 'test report' }).select('id').single();
    expect(report.error).toBeNull();
    const modReports = await moderator.from('reports').select('id').eq('id', report.data!.id).single();
    expect(modReports.error).toBeNull();
    const removed = await moderator.from('posts').update({ removed_at: new Date().toISOString(), removed_by: moderatorAccount.id, removed_reason: 'test moderation' }).eq('id', publicPost.data!.id).select('id').single();
    expect(removed.error).toBeNull();
    const outsiderAfterRemoval = await outsider.from('posts').select('*').eq('id', publicPost.data!.id).single();
    expect(outsiderAfterRemoval.data).toBeNull();
    const approved = await owner.from('community_memberships').update({ status: 'active' }).eq('community_id', privateCommunity.data!.id).eq('user_id', outsiderAccount.id);
    expect(approved.error).toBeNull();
    const allowedRead = await outsider.from('posts').select('*').eq('id', privatePost.data!.id).single();
    expect(allowedRead.error).toBeNull();
  });
});
