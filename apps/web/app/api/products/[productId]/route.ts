import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const { data, error } = await getPublicClient()
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  if (error) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  return NextResponse.json({ product: data });
}
export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { productId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = [
    'category_id',
    'name',
    'slug',
    'description',
    'price',
    'currency',
    'unit',
    'stock_quantity',
    'availability',
    'discount_percentage',
  ] as const;
  const update = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key as (typeof allowed)[number])),
  );
  if (!Object.keys(update).length)
    return NextResponse.json(
      { error: 'No editable product fields were provided.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('products')
    .update(update)
    .eq('id', productId)
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can update this product.' },
      { status: 403 },
    );
  return NextResponse.json({ product: data });
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { productId } = await context.params;
  const { error } = await result.client.from('products').delete().eq('id', productId);
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can remove this product.' },
      { status: 403 },
    );
  return new NextResponse(null, { status: 204 });
}
