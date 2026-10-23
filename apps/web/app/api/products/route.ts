import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';

export async function GET(request: Request) {
  const { limit, cursor, query } = pageParams(request.url);
  const params = new URL(request.url).searchParams;
  const client = getPublicClient();
  let builder = client
    .from('products')
    .select('*, businesses(id, name, city, country), delivery_configs(estimated_min_minutes, estimated_max_minutes)')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (params.get('businessId')) builder = builder.eq('business_id', params.get('businessId')!);
  if (params.get('categoryId')) builder = builder.eq('category_id', params.get('categoryId')!);
  if (query) builder = builder.ilike('name', `%${query.replace(/[%_]/g, '')}%`);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load products.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    products: rows.slice(0, limit),
    nextCursor: rows.length > limit ? (rows[limit - 1]?.created_at ?? null) : null,
  });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (
    typeof body.businessId !== 'string' ||
    typeof body.name !== 'string' ||
    typeof body.slug !== 'string' ||
    typeof body.price !== 'number' ||
    typeof body.currency !== 'string' ||
    typeof body.unit !== 'string'
  )
    return NextResponse.json(
      { error: 'Business, name, slug, price, currency, and unit are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('products')
    .insert({
      business_id: body.businessId,
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      description: typeof body.description === 'string' ? body.description : null,
      category_id: typeof body.categoryId === 'string' ? body.categoryId : null,
      price: body.price,
      currency: body.currency.toUpperCase(),
      unit: body.unit,
      stock_quantity: typeof body.stockQuantity === 'number' ? body.stockQuantity : 0,
      availability: body.availability !== false,
      discount_percentage:
        typeof body.discountPercentage === 'number' ? body.discountPercentage : 0,
      is_sample: false,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can add products, and product values must be valid.' },
      { status: 403 },
    );
  return NextResponse.json({ product: data }, { status: 201 });
}
