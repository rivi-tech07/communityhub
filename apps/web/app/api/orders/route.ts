import { NextResponse } from 'next/server';
import { authenticate, getAdminClient } from '../../lib/server-auth';
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const server = getAdminClient();
  const body = (await request.json().catch(() => null)) as {
    businessId?: string;
    currency?: string;
    items?: Array<{ productId?: string; quantity?: number }>;
  } | null;
  if (!body?.businessId || !Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json(
      { error: 'Business and at least one product are required.' },
      { status: 400 },
    );
  const ids = body.items
    .map((item) => item.productId)
    .filter((id): id is string => typeof id === 'string');
  const { data: products, error: productError } = await server
    .from('products')
    .select('id,business_id,price,currency,stock_quantity,availability')
    .in('id', ids)
    .eq('business_id', body.businessId);
  if (
    productError ||
    !products ||
    products.length !== ids.length ||
    products.some((product) => !product.availability || product.stock_quantity <= 0)
  )
    return NextResponse.json({ error: 'One or more products are unavailable.' }, { status: 400 });
  const total = body.items.reduce(
    (sum, item) =>
      sum +
      (products.find((product) => product.id === item.productId)?.price ?? 0) *
        (item.quantity ?? 0),
    0,
  );
  if (!Number.isFinite(total) || total <= 0)
    return NextResponse.json({ error: 'Order quantities must be positive.' }, { status: 400 });
  const currency = body.currency?.toUpperCase() ?? products[0].currency;
  const { data: order, error } = await server
    .from('orders')
    .insert({
      buyer_id: result.user.id,
      business_id: body.businessId,
      total,
      currency,
      status: 'pending_payment',
    })
    .select('id,total,currency,status')
    .single();
  if (error || !order)
    return NextResponse.json({ error: 'Unable to create checkout order.' }, { status: 400 });
  const { error: itemError } = await server.from('order_items').insert(
    body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId!,
      quantity: item.quantity ?? 0,
      unit_price: products.find((product) => product.id === item.productId)!.price,
    })),
  );
  if (itemError)
    return NextResponse.json({ error: 'Unable to create checkout items.' }, { status: 400 });
  return NextResponse.json({ order }, { status: 201 });
}
