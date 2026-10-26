import { NextResponse } from 'next/server';
import { authenticate, getPublicClient, getUserClient } from '../../lib/server-auth';
import { pageParams, paginationError } from '../../lib/pagination';

export async function GET(request: Request) {
  const pagination = pageParams(request.url);
  if ('error' in pagination) return paginationError(pagination);
  const { limit, cursor, query } = pagination;
  const params = new URL(request.url).searchParams;
  let client = getPublicClient();
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (token) {
    try {
      const userClient = getUserClient(token);
      const { data: userData } = await userClient.auth.getUser(token);
      if (userData.user) client = userClient;
    } catch {
      // Invalid optional credentials fall back to the public policy.
    }
  }
  let builder = client
    .from('products')
    .select(
      '*, businesses(id, name, city, country), delivery_configs(estimated_min_minutes, estimated_max_minutes), product_images(storage_path, sort_order)',
    )
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (params.get('businessId')) builder = builder.eq('business_id', params.get('businessId')!);
  if (params.get('categoryId')) builder = builder.eq('category_id', params.get('categoryId')!);
  if (query) builder = builder.ilike('name', `%${query.replace(/[%_]/g, '')}%`);
  if (cursor) builder = builder.lt('created_at', cursor);
  let { data, error } = await builder;
  if (error) {
    let fallback = client
      .from('products')
      .select('*, businesses(id, name, city, country)')
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    if (params.get('businessId')) fallback = fallback.eq('business_id', params.get('businessId')!);
    if (params.get('categoryId')) fallback = fallback.eq('category_id', params.get('categoryId')!);
    if (query) fallback = fallback.ilike('name', `%${query.replace(/[%_]/g, '')}%`);
    if (cursor) fallback = fallback.lt('created_at', cursor);
    const fallbackResult = await fallback;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error) return NextResponse.json({ error: 'Unable to load products.' }, { status: 503 });
  const rows = data ?? [];
  const products = await Promise.all(
    rows.slice(0, limit).map(async (product) => {
      const images =
        (
          product as typeof product & {
            product_images?: Array<{ storage_path: string; sort_order: number }>;
          }
        ).product_images ?? [];
      const firstImage = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
      if (!firstImage) return product;
      const { data: signed } = await client.storage
        .from('business-media')
        .createSignedUrl(firstImage.storage_path, 3600);
      return { ...product, image_url: signed?.signedUrl ?? null };
    }),
  );
  return NextResponse.json({
    products,
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
      catalog_product_id: typeof body.catalogProductId === 'string' ? body.catalogProductId : null,
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
