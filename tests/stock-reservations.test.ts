import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integration = Boolean(url && serviceRoleKey);
const suite = integration ? describe : describe.skip;

suite('physical-goods stock reservations', () => {
  const admin = integration
    ? createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const ids = { user: '', business: '', product: '', orders: [] as string[] };

  async function createOrder(quantity: number) {
    const order = await admin!
      .from('orders')
      .insert({
        buyer_id: ids.user,
        business_id: ids.business,
        total: quantity,
        currency: 'GBP',
        status: 'pending_payment',
      })
      .select('id')
      .single();
    if (order.error || !order.data) throw order.error ?? new Error('Order was not created.');
    ids.orders.push(order.data.id);
    const item = await admin!.from('order_items').insert({
      order_id: order.data.id,
      product_id: ids.product,
      quantity,
      unit_price: 1,
    });
    if (item.error) throw item.error;
    return order.data.id;
  }

  beforeAll(async () => {
    const user = await admin!.auth.admin.createUser({
      email: `stock-${Date.now()}@example.com`,
      password: 'stock-reservation-test-password',
      email_confirm: true,
    });
    if (user.error || !user.data.user) throw user.error ?? new Error('User was not created.');
    ids.user = user.data.user.id;
    const business = await admin!
      .from('businesses')
      .insert({
        owner_id: ids.user,
        name: 'Stock Test Shop',
        slug: `stock-test-${Date.now()}`,
        category: 'Groceries',
      })
      .select('id')
      .single();
    if (business.error || !business.data)
      throw business.error ?? new Error('Business was not created.');
    ids.business = business.data.id;
    const product = await admin!
      .from('products')
      .insert({
        business_id: ids.business,
        name: 'Stock Test Milk',
        slug: `stock-test-milk-${Date.now()}`,
        price: 1,
        currency: 'GBP',
        unit: 'pack',
        stock_quantity: 1,
        availability: true,
      })
      .select('id')
      .single();
    if (product.error || !product.data)
      throw product.error ?? new Error('Product was not created.');
    ids.product = product.data.id;
  });

  afterAll(async () => {
    if (ids.business) await admin!.from('businesses').delete().eq('id', ids.business);
    if (ids.user) await admin!.auth.admin.deleteUser(ids.user);
  });

  afterEach(async () => {
    for (const order of ids.orders) {
      const reservations = await admin!
        .from('stock_reservations')
        .select('id')
        .eq('order_id', order)
        .eq('status', 'held');
      for (const reservation of reservations.data ?? []) {
        await admin!.rpc('release_stock_reservation', { p_reservation_id: reservation.id });
      }
    }
    await admin!
      .from('products')
      .update({ stock_quantity: 1, availability: true })
      .eq('id', ids.product);
  });

  it('allows exactly one concurrent checkout for the last unit', async () => {
    const first = await createOrder(1);
    const second = await createOrder(1);
    const results = await Promise.all([
      admin!.rpc('reserve_stock_for_order', { p_order_id: first, p_ttl_seconds: 900 }),
      admin!.rpc('reserve_stock_for_order', { p_order_id: second, p_ttl_seconds: 900 }),
    ]);
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(results.filter((result) => result.error)).toHaveLength(1);
  });

  it('expires a hold and restores stock', async () => {
    const order = await createOrder(1);
    const reserved = await admin!.rpc('reserve_stock_for_order', {
      p_order_id: order,
      p_ttl_seconds: 1,
    });
    expect(reserved.error).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const expired = await admin!.rpc('expire_stock_reservations');
    expect(expired.error).toBeNull();
    const product = await admin!
      .from('products')
      .select('stock_quantity')
      .eq('id', ids.product)
      .single();
    expect(Number(product.data?.stock_quantity)).toBe(1);
    const reservation = await admin!
      .from('stock_reservations')
      .select('status')
      .eq('order_id', order)
      .single();
    expect(reservation.data?.status).toBe('expired');
  });

  it('does not release a committed reservation twice', async () => {
    const order = await createOrder(1);
    const reserved = await admin!.rpc('reserve_stock_for_order', {
      p_order_id: order,
      p_ttl_seconds: 900,
    });
    expect(reserved.error).toBeNull();
    const committed = await admin!.rpc('commit_stock_reservations', { p_order_id: order });
    expect(committed.error).toBeNull();
    const heldReservation = await admin!
      .from('stock_reservations')
      .select('id')
      .eq('order_id', order)
      .single();
    const firstRelease = await admin!.rpc('release_stock_reservation', {
      p_reservation_id: heldReservation.data!.id,
    });
    expect(firstRelease.error).toBeNull();
    const product = await admin!
      .from('products')
      .select('stock_quantity')
      .eq('id', ids.product)
      .single();
    expect(Number(product.data?.stock_quantity)).toBe(0);
    const reservation = await admin!
      .from('stock_reservations')
      .select('status')
      .eq('order_id', order)
      .single();
    expect(reservation.data?.status).toBe('committed');
  });
});
