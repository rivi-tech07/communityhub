import { describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const suite = url && anonKey && serviceRoleKey ? describe : describe.skip;

suite('admin-write denial contracts', () => {
  it('rejects self-granting a role and refunding an owned order', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url!, serviceRoleKey!, { auth: { persistSession: false } });
    const email = `admin-denial-${Date.now()}@example.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: 'admin-denial-test-password',
      email_confirm: true,
    });
    if (created.error || !created.data.user) throw created.error ?? new Error('User not created.');
    const user = createClient(url!, anonKey!, { auth: { persistSession: false } });
    await user.auth.signInWithPassword({ email, password: 'admin-denial-test-password' });
    const roleAttempt = await user
      .from('user_roles')
      .insert({ user_id: created.data.user.id, role: 'administrator' });
    expect(roleAttempt.error?.code).toBe('42501');
    const business = await admin
      .from('businesses')
      .insert({
        owner_id: created.data.user.id,
        name: 'Admin denial test shop',
        slug: `admin-denial-${Date.now()}`,
        category: 'Groceries',
      })
      .select('id')
      .single();
    if (business.error || !business.data)
      throw business.error ?? new Error('Business not created.');
    const order = await admin
      .from('orders')
      .insert({
        buyer_id: created.data.user.id,
        business_id: business.data.id,
        total: 1,
        currency: 'GBP',
        status: 'pending_payment',
      })
      .select('id')
      .single();
    if (order.error || !order.data) throw order.error ?? new Error('Order not created.');
    const itemAttempt = await user.from('order_items').insert({
      order_id: order.data.id,
      product_id: '00000000-0000-0000-0000-000000000000',
      quantity: 1,
      unit_price: 1,
    });
    expect(itemAttempt.error?.code).toBe('42501');
    const orderAttempt = await user
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', order.data.id)
      .select('id');
    expect(orderAttempt.error?.code).toBe('42501');
    await admin.from('businesses').delete().eq('id', business.data.id);
    await admin.auth.admin.deleteUser(created.data.user.id);
  });
});
