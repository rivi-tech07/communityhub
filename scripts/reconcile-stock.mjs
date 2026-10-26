import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: expiryError } = await client.rpc('expire_stock_reservations');
if (expiryError) {
  console.error(`Unable to expire stock reservations: ${expiryError.message}`);
  process.exit(1);
}

const [{ data: products, error: productsError }, { data: reservations, error: reservationsError }] =
  await Promise.all([
    client.from('products').select('id,name,stock_quantity'),
    client
      .from('stock_reservations')
      .select('product_id,quantity,status')
      .in('status', ['held', 'committed']),
  ]);
if (productsError || reservationsError) {
  console.error(
    productsError?.message ?? reservationsError?.message ?? 'Unable to read stock data.',
  );
  process.exit(1);
}

const reservedByProduct = new Map();
for (const reservation of reservations ?? []) {
  reservedByProduct.set(
    reservation.product_id,
    (reservedByProduct.get(reservation.product_id) ?? 0) + Number(reservation.quantity),
  );
}

const report = (products ?? []).map((product) => {
  const stock = Number(product.stock_quantity);
  const reserved = reservedByProduct.get(product.id) ?? 0;
  return {
    product_id: product.id,
    name: product.name,
    stock_quantity: stock,
    reserved_quantity: reserved,
    drift: stock - reserved,
  };
});
console.log(JSON.stringify({ checked_at: new Date().toISOString(), products: report }, null, 2));
