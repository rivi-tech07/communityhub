import { afterEach, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integration = Boolean(url && anonKey && serviceRoleKey);
const describeIntegration = integration ? describe : describe.skip;
const userIds: string[] = [];

describeIntegration('CommunityHub business ownership and catalog access', () => {
  const admin = integration
    ? createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  let owner: SupabaseClient;
  let other: SupabaseClient;
  async function createUser(label: string) {
    const email = `phase4-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: 'phase-four-test-password',
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('Test user was not created.');
    userIds.push(data.user.id);
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.signInWithPassword({
      email,
      password: 'phase-four-test-password',
    });
    if (login.error) throw login.error;
    return { id: data.user.id, client };
  }
  afterEach(async () => {
    if (admin) await Promise.all(userIds.splice(0).map((id) => admin.auth.admin.deleteUser(id)));
  });
  it('enforces business owner writes and keeps checkout dormant', async () => {
    const ownerAccount = await createUser('owner');
    const otherAccount = await createUser('other');
    owner = ownerAccount.client;
    other = otherAccount.client;
    const business = await owner
      .from('businesses')
      .insert({
        owner_id: ownerAccount.id,
        name: 'Test Catalog',
        slug: `test-catalog-${Date.now()}`,
        category: 'Groceries',
        description: 'Test',
        is_published: false,
        verification_status: 'pending',
      })
      .select('id')
      .single();
    expect(business.error).toBeNull();
    const unauthorizedBusiness = await other.from('businesses').insert({
      owner_id: ownerAccount.id,
      name: 'Impersonated',
      slug: `impersonated-${Date.now()}`,
      category: 'Groceries',
    });
    expect(unauthorizedBusiness.error).toBeTruthy();
    const product = await owner
      .from('products')
      .insert({
        business_id: business.data!.id,
        name: 'Test apples',
        slug: `test-apples-${Date.now()}`,
        price: 3.5,
        currency: 'GBP',
        unit: 'kg',
        stock_quantity: 10,
        availability: true,
      })
      .select('id')
      .single();
    expect(product.error).toBeNull();
    const unauthorizedProduct = await other
      .from('products')
      .update({ price: 0 })
      .eq('id', product.data!.id)
      .select('id')
      .single();
    expect(unauthorizedProduct.error).toBeTruthy();
    const unauthorizedOrder = await other.from('orders').insert({
      buyer_id: otherAccount.id,
      business_id: business.data!.id,
      total: 3.5,
      currency: 'GBP',
      status: 'draft',
    });
    expect(unauthorizedOrder.error).toBeTruthy();
    const publicBeforeVerification = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const hidden = await publicBeforeVerification
      .from('businesses')
      .select('id')
      .eq('id', business.data!.id)
      .maybeSingle();
    expect(hidden.data).toBeNull();
    const verification = await admin!
      .from('businesses')
      .update({ verification_status: 'verified', is_published: true })
      .eq('id', business.data!.id);
    expect(verification.error).toBeNull();
    const visible = await publicBeforeVerification
      .from('businesses')
      .select('id')
      .eq('id', business.data!.id)
      .single();
    expect(visible.error).toBeNull();
  });
});
